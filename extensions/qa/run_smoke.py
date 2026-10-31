#!/usr/bin/env python3
"""Fail-closed, cross-platform XeLaTeX fixture evidence recorder.

Only five original, fixed repository fixtures may be executed. Successful PDF
output is a render smoke, not GUI acceptance or proof of visual editability.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import time

SOURCES = {
    "core": "org.tikzarium.core",
    "pgfplots": "org.tikzarium.pgfplots",
    "circuitikz": "org.tikzarium.circuitikz",
    "tikz-cd": "org.tikzarium.tikz-cd",
    "graphdrawing-lua": "org.tikzarium.graphdrawing-lua",
}
NEGATIVE = "graphdrawing-lua"
FLAGS = (
    "-interaction=nonstopmode", "-halt-on-error", "-file-line-error",
    "-recorder", "-no-shell-escape",
)
# TeX wraps the engine-error message across lines in narrow log output.
LUA_REQUIRED = re.compile(
    r"need to run LuaTeX to use the graph\s+drawing library", re.I,
)
MISSING_GLYPH = re.compile(r"Missing character:", re.I)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def valid_pdf(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size < 20:
        return False
    with path.open("rb") as stream:
        signature = stream.read(5)
        stream.seek(max(0, path.stat().st_size - 2048))
        trailer = stream.read()
    return signature == b"%PDF-" and b"%%EOF" in trailer


def read_pages(pdfinfo: str, pdf: Path) -> int | None:
    try:
        run = subprocess.run(
            [pdfinfo, str(pdf)], capture_output=True, text=True, check=False,
            timeout=15, errors="replace",
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if run.returncode:
        return None
    match = re.search(r"^Pages:\s*(\d+)\s*$", run.stdout, re.M)
    return int(match.group(1)) if match else None


def verdict(*, negative: bool, exit_code: int, pdf_valid: bool,
            page_count: int | None, log_text: str,
            source_preserved: bool) -> str:
    if not source_preserved:
        return "failed"
    if negative:
        if exit_code != 0 and not pdf_valid and LUA_REQUIRED.search(log_text):
            return "expected_engine_error"
        return "failed"
    if (exit_code == 0 and pdf_valid and page_count == 1
            and not MISSING_GLYPH.search(log_text)):
        return "rendered_pdf"
    return "failed"


def write_record(path: Path, values: dict[str, object]) -> None:
    lines = ["# Environment-specific, unattested observation. Not package-wide PASS."]
    for key, value in values.items():
        if value is None:
            continue
        if isinstance(value, str):
            out = json.dumps(value, ensure_ascii=False)
        elif isinstance(value, bool):
            out = "true" if value else "false"
        elif isinstance(value, int):
            out = str(value)
        else:
            raise ValueError(f"Unsupported TOML type: {key}")
        lines.append(f"{key} = {out}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def execute_fixture(name: str, fixtures: Path, root: Path,
                    tex: str, pdfinfo: str, version: str,
                    timeout: float) -> dict[str, object]:
    source = fixtures / f"{name}.tex"
    source_hash = sha256_file(source)
    destination = root / name
    # Do not follow output symlinks or reuse logs/PDFs from previous runs.
    destination.mkdir(parents=False, exist_ok=False)
    console = destination / "console.log"
    tex_log = destination / f"{name}.log"
    pdf = destination / f"{name}.pdf"
    command = [
        tex, *FLAGS, f"-output-directory={destination}", f"{name}.tex",
    ]
    started = time.monotonic()
    try:
        run = subprocess.run(
            command, cwd=fixtures, capture_output=True, check=False,
            timeout=timeout,
        )
        exit_code = run.returncode
        console.write_bytes(run.stdout + b"\n" + run.stderr)
    except subprocess.TimeoutExpired as exc:
        exit_code = 124
        console.write_bytes(
            (exc.stdout or b"") + b"\n" + (exc.stderr or b"") + b"\nTIMEOUT\n",
        )
    except OSError as exc:
        exit_code = 127
        console.write_text(f"OS_ERROR: {exc}\n", encoding="utf-8")
    elapsed_ms = int((time.monotonic() - started) * 1000)
    log_text = console.read_text(encoding="utf-8", errors="replace")
    if tex_log.is_file():
        log_text += "\n" + tex_log.read_text(encoding="utf-8", errors="replace")
    pdf_valid = valid_pdf(pdf)
    pages = read_pages(pdfinfo, pdf) if pdf_valid else None
    preserved = sha256_file(source) == source_hash
    outcome = verdict(
        negative=name == NEGATIVE, exit_code=exit_code, pdf_valid=pdf_valid,
        page_count=pages, log_text=log_text, source_preserved=preserved,
    )
    if outcome != "failed" and not tex_log.is_file():
        outcome = "failed"  # No complete TeX log, no successful observation.
    record: dict[str, object] = {
        "schema_version": 1,
        "fixture_id": name,
        "manifest_id": SOURCES[name],
        "tested_engine": "xelatex",
        "host_os": platform.system(),
        "host_arch": platform.machine(),
        "host_release": platform.release(),
        "runner_kind": (
            "hosted_ci" if os.getenv("GITHUB_ACTIONS") == "true"
            else "local_unattested"
        ),
        "tex_version": version,
        "source_sha256": source_hash,
        "log_sha256": sha256_file(console),
        "tex_log_sha256": (
            sha256_file(tex_log) if tex_log.is_file() else None
        ),
        "exit_code": exit_code,
        "verdict": outcome,
        "source_preserved": preserved,
        "elapsed_ms": elapsed_ms,
        "pdf_sha256": sha256_file(pdf) if pdf_valid else None,
        "pages": pages,
    }
    write_record(destination / "observation.toml", record)
    return record


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--fixture", choices=list(SOURCES), action="append")
    parser.add_argument("--timeout", type=float, default=120.0)
    args = parser.parse_args(argv)
    if not 0 < args.timeout <= 600:
        parser.error("timeout must be between 0 and 600 seconds")
    fixtures = (Path(__file__).resolve().parent.parent / "fixtures").resolve()
    output = args.output.resolve()
    extensions = fixtures.parent
    if output == extensions or extensions in output.parents:
        parser.error("output may not be inside the source extensions tree")
    tex = shutil.which("xelatex")
    pdfinfo = shutil.which("pdfinfo")
    if not tex or not pdfinfo:
        parser.error("xelatex and pdfinfo are required (no engine fallback)")
    version_lines = subprocess.run(
        [tex, "--version"], capture_output=True, text=True,
        check=True, timeout=15, errors="replace",
    ).stdout.splitlines()
    if not version_lines:
        parser.error("xelatex --version returned no identifying version")
    version = version_lines[0]
    output.mkdir(parents=True, exist_ok=True)
    names = list(dict.fromkeys(args.fixture or SOURCES))
    records = []
    for name in names:
        result = execute_fixture(name, fixtures, output, tex, pdfinfo, version, args.timeout)
        records.append(result)
        print(f"{name}: {result['verdict']} (exit {result['exit_code']})")
    success = all(
        r["verdict"] in ("rendered_pdf", "expected_engine_error")
        for r in records
    )
    summary = {
        "schema_version": 1,
        "compiler": tex,
        "compiler_version": version,
        "fixture_results": [
            {"fixture_id": r["fixture_id"], "verdict": r["verdict"]}
            for r in records
        ],
        "accepted": success,
        "note": "Only compiler fixture evidence; GUI/visual-edit NOT_TESTED",
    }
    (output / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
