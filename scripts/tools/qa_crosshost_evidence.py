#!/usr/bin/env python3
"""Independently gate downloaded D QA artifacts from the same workflow run.

D lane only. This consumes *downloaded artifacts*, not the producing process's
self-reported success. It cannot attest physical Win10/M1/M4 GUI behavior.
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
import tempfile
import tomllib

HOSTS = {
    "linux-x64": ("Linux", {"x86_64"}, "qa-ui-unit-contract-ubuntu-24.04"),
    "windows-server-x64": ("Windows", {"AMD64"}, "qa-ui-unit-contract-windows-2022"),
    "macos-arm64": ("Darwin", {"arm64"}, "qa-ui-unit-contract-macos-15"),
}
FIXTURES = {
    "core": "org.tikzarium.core",
    "pgfplots": "org.tikzarium.pgfplots",
    "circuitikz": "org.tikzarium.circuitikz",
    "tikz-cd": "org.tikzarium.tikz-cd",
    "graphdrawing-lua": "org.tikzarium.graphdrawing-lua",
}
CASES = {
    "g00-quickstart", "g00-legacy-cyrillic-pdf-only",
    "g00-cyrillic-glyph-audit", "g01-multifile-unicode-path",
    "g02-tikz-fonts", "g08-intentional-tex-error",
}
SHA = re.compile(r"[a-f0-9]{64}\Z")
GIT_SHA = re.compile(r"[a-f0-9]{40}\Z")
LUA = re.compile(r"\b" + r"\s*".join(map(re.escape, "You need to run LuaTeX to use the graph drawing library")) + r"\b", re.I)
FONT_NAME = re.compile(r"^(?:[A-Z]{6}\+)?(?P<name>\S+)$")


class AuditError(ValueError):
    """Any inconsistency is a hard QA failure, not a skipped check."""


def required_file(path: Path, limit: int = 8 * 1024 * 1024) -> bytes:
    if path.is_symlink() or not path.is_file() or path.stat().st_size > limit:
        raise AuditError(f"missing, linked or oversized file: {path}")
    return path.read_bytes()


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def checked_hash(expected: object, data: bytes, context: str) -> None:
    if not isinstance(expected, str) or not SHA.fullmatch(expected) or expected != digest(data):
        raise AuditError(f"SHA-256 mismatch or absent for {context}")


def checked_checkout_hash(expected: object, source: bytes, os_name: str, context: str) -> None:
    """Windows checkout may convert LF to CRLF; allow only this exact transform."""
    lf = source.replace(b"\r\n", b"\n")
    allowed = {digest(source)}
    if os_name == "Windows":
        allowed.add(digest(lf.replace(b"\n", b"\r\n")))
    if not isinstance(expected, str) or not SHA.fullmatch(expected) or expected not in allowed:
        raise AuditError(f"source hash differs beyond allowed Git checkout EOL: {context}")


def read_json(path: Path) -> dict:
    try:
        obj = json.loads(required_file(path, 128 * 1024))
    except (ValueError, UnicodeError) as exc:
        raise AuditError(f"bad JSON {path}: {exc}") from exc
    if not isinstance(obj, dict):
        raise AuditError(f"not a JSON object: {path}")
    return obj


def run_pdf(tool: str, pdf: bytes, args: list[str]) -> str:
    with tempfile.TemporaryDirectory(prefix="tikzarium-d05-") as temp:
        path = Path(temp) / "proof.pdf"
        path.write_bytes(pdf)
        try:
            proc = subprocess.run(
                [tool, *args, str(path), *(["-"] if tool == "pdftotext" else [])],
                capture_output=True, timeout=20, check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise AuditError(f"{tool} unavailable or timed out: {exc}") from exc
        if proc.returncode:
            raise AuditError(f"{tool} failed with {proc.returncode}")
        return proc.stdout.decode("utf-8", errors="replace")


def check_pdf(pdf: bytes, context: str, *, text: bool = False) -> None:
    if not pdf.startswith(b"%PDF-") or b"%%EOF" not in pdf[-2048:]:
        raise AuditError(f"invalid PDF header/trailer: {context}")
    info = run_pdf("pdfinfo", pdf, [])
    if not re.search(r"^Pages:\s*1\s*$", info, re.M):
        raise AuditError(f"pdfinfo not exactly one page: {context}")
    if text:
        extracted = run_pdf("pdftotext", pdf, ["-enc", "UTF-8", "-layout"])
        for phrase in ("Оптика и квантовая яма", "Греческие символы αβγ"):
            if phrase not in extracted:
                raise AuditError(f"missing Unicode text {phrase!r}: {context}")
        fonts = run_pdf("pdffonts", pdf, [])
        embedded = set()
        for line in fonts.splitlines()[2:]:
            parts = line.split()
            if len(parts) < 8 or parts[-5] != "yes":
                continue
            match = FONT_NAME.fullmatch(parts[0])
            if match:
                embedded.add(match.group("name"))
        if "DejaVuSerif" not in embedded:
            raise AuditError(f"DejaVuSerif is not independently embedded: {context}")
        if not any(name.startswith("LatinModernMath-") for name in embedded):
            raise AuditError(f"LatinModernMath is not independently embedded: {context}")


def assert_dir(path: Path) -> None:
    if path.is_symlink() or not path.is_dir():
        raise AuditError(f"missing or symlinked evidence folder {path}")


def check_host(root: Path, sources: Path, slug: str, expected_sha: str,
               manifest_bytes: bytes, negative_source: bytes) -> dict:
    os_name, arches, ui_dir = HOSTS[slug]
    folder = root / f"qa-evidence-{slug}"
    assert_dir(folder)
    ext = folder / "extensions"
    assert_dir(ext)
    qa = read_json(folder / "qa-report.json")
    if (qa.get("schema_version") != 1 or qa.get("source_head_sha") != expected_sha
            or qa.get("system") != os_name or qa.get("machine") not in arches):
        raise AuditError(f"QA report source SHA / host mismatch: {slug}")
    checked_checkout_hash(qa.get("manifest_sha256"), manifest_bytes, os_name, f"{slug}/manifest")
    if qa.get("summary") != {"PASS": 5, "FAIL": 0, "SKIP": 0, "KNOWN_LIMITATION": 1}:
        raise AuditError(f"unexpected six-case QA summary: {slug}")
    cases = qa.get("cases")
    if not isinstance(cases, list) or len(cases) != len(CASES):
        raise AuditError(f"missing six original QA cases: {slug}")
    by_id = {c.get("id"): c for c in cases if isinstance(c, dict)}
    if set(by_id) != CASES:
        raise AuditError(f"unknown/duplicated QA cases: {slug}")
    for name, case in by_id.items():
        status = "KNOWN_LIMITATION" if name == "g00-legacy-cyrillic-pdf-only" else "PASS"
        if case.get("status") != status or case.get("source_unchanged") is not True:
            raise AuditError(f"fixture failed or source mutated: {slug}/{name}")

    # Do not count a generic Windows argv/TeX error as the intentional G08 error.
    g08 = by_id["g08-intentional-tex-error"]
    macro = b"\\TikzariumIntentionallyUndefinedCommand"
    if macro not in negative_source:
        raise AuditError("intentional TeX macro absent from canonical G08 source")
    checked_checkout_hash(g08.get("source_sha256", {}).get("main.tex"),
                          negative_source, os_name, f"{slug}/g08/source")
    error_log = required_file(folder / "g08-intentional-tex-error.stderr.log")
    negative_pdf = folder / "g08-intentional-tex-error.pdf"
    if (g08.get("exit_code") != 3 or b"Undefined control sequence" not in error_log
            or macro not in error_log or negative_pdf.exists() or negative_pdf.is_symlink()):
        raise AuditError(f"G08 negative is not the original source error: {slug}")

    g02 = by_id["g02-tikz-fonts"]
    if (g02.get("glyph_audit") != "PASS" or g02.get("missing_glyphs") != 0
            or g02.get("text_extraction_checked") is not True
            or g02.get("embedded_fonts_checked") is not True):
        raise AuditError(f"false-positive font/glyph QA: {slug}")
    g02_pdf = required_file(folder / "g02-tikz-fonts.pdf", 64 * 1024 * 1024)
    checked_hash(g02.get("sha256"), g02_pdf, f"{slug}/g02")
    check_pdf(g02_pdf, f"{slug}/g02", text=True)

    audit = read_json(ext / "audit.json")
    if (audit.get("accepted") is not True or audit.get("complete_suite") is not True
            or type(audit.get("verified_fixtures")) is not int
            or audit["verified_fixtures"] != 5 or audit.get("errors") != []
            or audit.get("scope") != "full_five"):
        raise AuditError(f"C03 audit is incomplete or rejected: {slug}")
    summary = read_json(ext / "summary.json")
    if summary.get("accepted") is not True or summary.get("schema_version") != 1:
        raise AuditError(f"C02 summary rejected: {slug}")
    listed = summary.get("fixture_results")
    if not isinstance(listed, list) or len(listed) != 5:
        raise AuditError(f"C02 incomplete fixture summary: {slug}")
    listed_by_id = {r.get("fixture_id"): r.get("verdict") for r in listed if isinstance(r, dict)}
    if set(listed_by_id) != set(FIXTURES):
        raise AuditError(f"C02 fixture IDs missing, duplicated or foreign: {slug}")
    source_digests = {}
    for fixture, manifest in FIXTURES.items():
        item = ext / fixture
        assert_dir(item)
        try:
            rec = tomllib.loads(required_file(item / "observation.toml", 16384).decode("utf-8"))
        except (ValueError, UnicodeError) as exc:
            raise AuditError(f"invalid TOML {slug}/{fixture}: {exc}") from exc
        negative = fixture == "graphdrawing-lua"
        verdict = "expected_engine_error" if negative else "rendered_pdf"
        if (rec.get("schema_version") != 1 or rec.get("fixture_id") != fixture
                or rec.get("manifest_id") != manifest or rec.get("tested_engine") != "xelatex"
                or rec.get("host_os") != os_name or rec.get("host_arch") not in arches
                or rec.get("runner_kind") != "hosted_ci" or rec.get("source_preserved") is not True
                or rec.get("verdict") != verdict or listed_by_id[fixture] != verdict
                or rec.get("tex_version") != summary.get("compiler_version")):
            raise AuditError(f"incorrect observation schema/host/verdict: {slug}/{fixture}")
        source = required_file(sources / f"{fixture}.tex")
        checked_checkout_hash(rec.get("source_sha256"), source, os_name, f"{slug}/{fixture}/source")
        source_digests[fixture] = digest(source)
        console = required_file(item / "console.log")
        texlog = required_file(item / f"{fixture}.log")
        checked_hash(rec.get("log_sha256"), console, f"{slug}/{fixture}/console")
        checked_hash(rec.get("tex_log_sha256"), texlog, f"{slug}/{fixture}/texlog")
        log = (console + b"\n" + texlog).decode("utf-8", errors="replace")
        pdf_path = item / f"{fixture}.pdf"
        if negative:
            if (rec.get("exit_code") in (0, 124, 127) or "pdf_sha256" in rec
                    or "pages" in rec or pdf_path.exists() or pdf_path.is_symlink()
                    or not LUA.search(log)):
                raise AuditError(f"Lua-only negative not proven or PDF exists: {slug}")
        else:
            if (rec.get("exit_code") != 0 or type(rec.get("pages")) is not int
                    or rec["pages"] != 1 or re.search(r"Missing character:", log, re.I)):
                raise AuditError(f"positive fixture has TeX/glyph error: {slug}/{fixture}")
            pdf = required_file(pdf_path, 64 * 1024 * 1024)
            checked_hash(rec.get("pdf_sha256"), pdf, f"{slug}/{fixture}/pdf")
            check_pdf(pdf, f"{slug}/{fixture}")

    assert_dir(root / ui_dir)
    unit = read_json(root / ui_dir / "ui-unit-contract.json")
    if (unit.get("source_head_sha") != expected_sha or unit.get("machine") not in arches
            or unit.get("status") != "PASS_UNIT" or unit.get("scope") != "UNIT_TEST_ONLY"
            or any(unit.get(k) != "NOT_RUN" for k in
                   ("physical_win10_smoke", "physical_m1_m4_smoke",
                    "gui_restart_persistence", "gui_visual_theme_invariance"))):
        raise AuditError(f"GUI unit-contract status or acceptance boundary invalid: {slug}")
    groups = unit.get("groups", {})
    for name, count in (("ui_theme::tests", 3), ("font_proof::tests", 2)):
        group = groups.get(name, {})
        if (group.get("status") != "PASS_UNIT" or group.get("missing") != []
                or type(group.get("passed_count")) is not int
                or group["passed_count"] < count):
            raise AuditError(f"GUI font/theme Rust unit evidence missing: {slug}/{name}")
    return {"host": slug, "source_head_sha": expected_sha, "checkout_sha": qa.get("commit_sha"),
            "fixtures": len(by_id), "extensions": len(source_digests), "unicode_pdf": "rechecked",
            "gui_status": "PASS_UNIT", "physical_gui": "NOT_RUN"}


def audit(root: Path, sources: Path, manifest: Path, head: str) -> dict:
    if not GIT_SHA.fullmatch(head):
        raise AuditError("expected exact 40-hex Git source SHA")
    assert_dir(root)
    assert_dir(sources)
    manifest_bytes = required_file(manifest, 128 * 1024)
    negative_source = required_file(manifest.parent / "g08-error" / "main.tex")
    for tool in ("pdfinfo", "pdftotext", "pdffonts"):
        if not shutil.which(tool):
            raise AuditError(f"missing required independent PDF tool: {tool}")
    hosts = [check_host(root, sources, slug, head, manifest_bytes, negative_source)
             for slug in HOSTS]
    checkouts = {item["checkout_sha"] for item in hosts}
    if len(checkouts) != 1:
        raise AuditError("CI artifacts are from different checkout SHAs")
    return {"schema_version": 1, "accepted": True, "source_head_sha": head,
            "checkout_sha": hosts[0]["checkout_sha"], "hosts": hosts,
            "evidence_scope": "HOSTED_CI_ONLY",
            "physical_win10_smoke": "NOT_RUN", "physical_m1_m4_smoke": "NOT_RUN",
            "gui_restart_persistence": "NOT_RUN", "r4_import": "NOT_PERFORMED"}


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", required=True, type=Path)
    p.add_argument("--sources", required=True, type=Path)
    p.add_argument("--manifest", required=True, type=Path)
    p.add_argument("--source-head", required=True)
    p.add_argument("--report", required=True, type=Path)
    args = p.parse_args(argv)
    try:
        result = audit(args.root, args.sources, args.manifest, args.source_head)
    except (AuditError, OSError, TypeError, KeyError, subprocess.SubprocessError) as exc:
        result = {"schema_version": 1, "accepted": False, "source_head_sha": args.source_head,
                  "error": str(exc), "evidence_scope": "HOSTED_CI_ONLY"}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["accepted"] else 1


if __name__ == "__main__":
    sys.exit(main())
