#!/usr/bin/env python3
"""Audit C02 XeLaTeX smoke artifacts without granting runtime capabilities.

This checks consistency with the *current checkout's* fixed fixture sources.
SHA-256 proves local byte equality, not the identity of the machine or compiler.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tomllib

from run_smoke import LUA_REQUIRED, MISSING_GLYPH, NEGATIVE, SOURCES, valid_pdf

HASH = re.compile(r"[0-9a-f]{64}\Z")
MAX_RECORD = 16 * 1024
MAX_SUMMARY = 64 * 1024
MAX_LOG = 8 * 1024 * 1024
MAX_PDF = 64 * 1024 * 1024
REQUIRED_KEYS = {
    "schema_version", "fixture_id", "manifest_id", "tested_engine", "host_os",
    "host_arch", "host_release", "runner_kind", "tex_version", "source_sha256",
    "log_sha256", "tex_log_sha256", "exit_code", "verdict", "source_preserved",
    "elapsed_ms",
}
OPTIONAL_KEYS = {"pdf_sha256", "pages"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def checked_file(path: Path, limit: int) -> bytes:
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"missing, non-regular or symlinked artifact: {path}")
    if path.stat().st_size > limit:
        raise ValueError(f"oversized artifact: {path}")
    return path.read_bytes()


def assert_hash(record: dict, field: str, path: Path, limit: int) -> None:
    expected = record.get(field)
    if not isinstance(expected, str) or not HASH.fullmatch(expected):
        raise ValueError(f"invalid {field}")
    checked_file(path, limit)
    if sha256(path) != expected:
        raise ValueError(f"{field} does not match {path.name}")


def verify_one(name: str, root: Path, fixtures: Path, pdfinfo: str) -> dict:
    directory = root / name
    if directory.is_symlink() or not directory.is_dir():
        raise ValueError(f"missing or symlinked fixture directory: {name}")
    data = checked_file(directory / "observation.toml", MAX_RECORD)
    try:
        record = tomllib.loads(data.decode("utf-8"))
    except (UnicodeError, tomllib.TOMLDecodeError) as exc:
        raise ValueError(f"invalid observation TOML: {name}: {exc}") from exc
    if set(record) - OPTIONAL_KEYS != REQUIRED_KEYS:
        raise ValueError(f"unexpected/missing observation fields: {name}")
    if record["schema_version"] != 1 or type(record["schema_version"]) is not int:
        raise ValueError("unsupported observation schema")
    if record["fixture_id"] != name or record["manifest_id"] != SOURCES[name]:
        raise ValueError(f"fixture/manifest mismatch: {name}")
    if record["tested_engine"] != "xelatex":
        raise ValueError("not a XeLaTeX observation")
    if record["host_os"] not in ("Windows", "Darwin", "Linux"):
        raise ValueError("invalid host OS")
    for key, limit in (("host_arch", 64), ("host_release", 192), ("tex_version", 256)):
        value = record[key]
        if not isinstance(value, str) or not value or len(value) > limit or any(c in value for c in "\r\n\0"):
            raise ValueError(f"invalid {key}")
    if record["runner_kind"] not in ("hosted_ci", "local_unattested"):
        raise ValueError("invalid runner_kind")
    if type(record["source_preserved"]) is not bool or not record["source_preserved"]:
        raise ValueError("source changed or preservation not established")
    if type(record["elapsed_ms"]) is not int or not 0 <= record["elapsed_ms"] <= 3_600_000:
        raise ValueError("invalid elapsed_ms")
    if type(record["exit_code"]) is not int:
        raise ValueError("invalid exit code")

    assert_hash(record, "source_sha256", fixtures / f"{name}.tex", MAX_LOG)
    console = directory / "console.log"
    tex_log = directory / f"{name}.log"
    pdf = directory / f"{name}.pdf"
    assert_hash(record, "log_sha256", console, MAX_LOG)
    assert_hash(record, "tex_log_sha256", tex_log, MAX_LOG)
    log = (console.read_text(encoding="utf-8", errors="replace") + "\n"
           + tex_log.read_text(encoding="utf-8", errors="replace"))

    if name == NEGATIVE:
        if (record["verdict"] != "expected_engine_error"
                or record["exit_code"] in (0, 124, 127)
                or "pages" in record or "pdf_sha256" in record
                or pdf.exists() or pdf.is_symlink()
                or not LUA_REQUIRED.search(log)):
            raise ValueError("Lua-only negative does not prove the expected engine error")
    else:
        if (record["verdict"] != "rendered_pdf" or record["exit_code"] != 0
                or record.get("pages") != 1 or type(record.get("pages")) is not int
                or MISSING_GLYPH.search(log)):
            raise ValueError("positive fixture has a failed/contradictory observation")
        assert_hash(record, "pdf_sha256", pdf, MAX_PDF)
        if not valid_pdf(pdf):
            raise ValueError("invalid PDF signature or trailer")
        try:
            proc = subprocess.run([pdfinfo, str(pdf)], capture_output=True, text=True,
                                  timeout=15, check=False, errors="replace")
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise ValueError(f"pdfinfo failed: {exc}") from exc
        pages = re.search(r"^Pages:\s*(\d+)\s*$", proc.stdout, re.M)
        if proc.returncode or not pages or int(pages.group(1)) != 1:
            raise ValueError("pdfinfo did not confirm exactly one page")
    return record


def audit(root: Path, fixtures: Path, pdfinfo: str, allow_partial: bool = False) -> dict:
    failures: list[str] = []
    if root.is_symlink() or not root.is_dir():
        return {"accepted": False, "complete_suite": False,
                "errors": ["output directory missing or symlinked"]}
    try:
        summary = json.loads(checked_file(root / "summary.json", MAX_SUMMARY))
        if not isinstance(summary, dict) or summary.get("schema_version") != 1:
            raise ValueError("summary schema mismatch")
        entries = summary["fixture_results"]
        if not isinstance(entries, list) or not entries:
            raise ValueError("empty or invalid fixture_results")
        names = [e["fixture_id"] for e in entries]
        if (any(n not in SOURCES for n in names) or len(set(names)) != len(names)
                or len(names) > len(SOURCES)):
            raise ValueError("duplicate or unknown fixture in summary")
        if summary.get("accepted") is not True:
            raise ValueError("runner summary did not accept selected fixtures")
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        return {"accepted": False, "complete_suite": False,
                "errors": [f"invalid summary: {exc}"]}

    expected = set(SOURCES)
    complete = set(names) == expected
    if not complete and not allow_partial:
        failures.append("incomplete five-fixture set; use --allow-partial for scoped audit")
    records = []
    for name in names:
        try:
            record = verify_one(name, root, fixtures, pdfinfo)
            result = next(e for e in entries if e["fixture_id"] == name)
            if result != {"fixture_id": name, "verdict": record["verdict"]}:
                raise ValueError("summary observation verdict mismatch")
            if summary.get("compiler_version") != record["tex_version"]:
                raise ValueError("compiler version differs from summary")
            records.append(record)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            failures.append(f"{name}: {exc}")
    if records:
        environment = ("host_os", "host_arch", "host_release", "runner_kind", "tex_version")
        for item in records[1:]:
            if any(item[key] != records[0][key] for key in environment):
                failures.append("mixed host/compiler metadata across fixture observations")
                break
    return {"accepted": not failures, "complete_suite": complete,
            "verified_fixtures": len(records), "errors": failures,
            "scope": "full_five" if complete else "selected_only",
            "note": "artifact consistency only; not machine identity, visual editing or native host acceptance"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--allow-partial", action="store_true")
    parser.add_argument("--report", type=Path, help="optional machine-readable audit JSON")
    args = parser.parse_args(argv)
    pdfinfo = shutil.which("pdfinfo")
    if not pdfinfo:
        parser.error("pdfinfo is required to confirm pages; no optimistic fallback")
    fixtures = Path(__file__).resolve().parent.parent / "fixtures"
    result = audit(args.output, fixtures, pdfinfo, args.allow_partial)
    print(json.dumps(result, indent=2))
    if args.report:
        args.report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return 0 if result["accepted"] else 1


if __name__ == "__main__":
    sys.exit(main())
