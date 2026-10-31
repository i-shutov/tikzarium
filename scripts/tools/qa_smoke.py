#!/usr/bin/env python3
"""Run platform-independent TikZarium CLI XeLaTeX fixture smoke tests.

Requires only Python stdlib, a built tikzarium-cli and a local XeLaTeX.
Emits machine-readable QA evidence even when an individual fixture fails.
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
import tempfile
from datetime import datetime, timezone


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_child(root: Path, child: str) -> Path:
    """Resolve a manifest path without allowing traversal outside the root."""
    relative = Path(child)
    if relative.is_absolute() or ".." in relative.parts or not relative.parts:
        raise ValueError(f"Unsafe fixture path: {child!r}")
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError(f"Fixture escaped repository: {child!r}")
    return path


def load_manifest(root: Path, manifest: Path) -> list[dict]:
    data = json.loads(manifest.read_text(encoding="utf-8"))
    if data.get("schema_version") != 1 or not isinstance(data.get("cases"), list):
        raise ValueError("Expected fixture manifest schema_version=1 and a cases list")
    cases = data["cases"]
    ids = set()
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError("Case must be an object")
        fixture_id = case.get("id")
        if not isinstance(fixture_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", fixture_id):
            raise ValueError(f"Unsafe fixture id: {fixture_id!r}")
        if fixture_id in ids:
            raise ValueError(f"Duplicate fixture id: {fixture_id}")
        ids.add(fixture_id)
        if case.get("expect") not in ("pdf", "tex-error"):
            raise ValueError(f"Unexpected expectation for {fixture_id}")
        project = checked_child(root, case["project_dir"])
        if not project.is_dir():
            raise ValueError(f"Missing fixture project: {project}")
        source = checked_child(project, case["source"])
        if not source.is_file():
            raise ValueError(f"Missing fixture source: {source}")
        if case.get("pages") is not None and (not isinstance(case["pages"], int) or case["pages"] < 1):
            raise ValueError(f"Invalid expected page count: {fixture_id}")
    return cases


def inspect_pdf(path: Path, expected_pages: int | None) -> tuple[bool, dict]:
    info: dict = {"bytes": path.stat().st_size, "sha256": sha256(path)}
    with path.open("rb") as stream:
        head = stream.read(8)
        stream.seek(max(0, path.stat().st_size - 1024))
        tail = stream.read()
    info["pdf_header_ok"] = head.startswith(b"%PDF-")
    info["pdf_eof_ok"] = b"%%EOF" in tail
    valid = info["pdf_header_ok"] and info["pdf_eof_ok"] and info["bytes"] > 100
    info["pages_checked"] = False
    if expected_pages is not None:
        pdfinfo = shutil.which("pdfinfo")
        if pdfinfo:
            proc = subprocess.run([pdfinfo, str(path)], capture_output=True, text=True, errors="replace", timeout=30)
            match = re.search(r"(?m)^Pages:\s*(\d+)\s*$", proc.stdout)
            info["pages_checked"] = True
            info["pages_actual"] = int(match.group(1)) if proc.returncode == 0 and match else None
            info["pages_expected"] = expected_pages
            valid = valid and info["pages_actual"] == expected_pages
        else:
            info["pages_note"] = "NOT_CHECKED: pdfinfo unavailable; PDF byte integrity only"
    return valid, info


def command(args: list[str], timeout: int = 180) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True, errors="replace", timeout=timeout)


def run_case(root: Path, output: Path, case: dict, executable: Path) -> dict:
    fixture_id = case["id"]
    result: dict = {"id": fixture_id, "expect": case["expect"], "status": "FAIL"}
    # The multi-file case deliberately exercises Unicode+spaces in the project path.
    with tempfile.TemporaryDirectory(prefix="tikzarium-qa-", dir=output) as temp:
        project = Path(temp) / ("project with spaces é" if case.get("unicode_path") else "project")
        source_dir = checked_child(root, case["project_dir"])
        shutil.copytree(source_dir, project)
        source = checked_child(project, case["source"])
        pdf = output / f"{fixture_id}.pdf"
        pdf.unlink(missing_ok=True)
        try:
            proc = command([str(executable), "build", str(source), str(pdf)])
            result["exit_code"] = proc.returncode
            result["stdout_tail"] = proc.stdout[-3000:]
            result["stderr_tail"] = proc.stderr[-4000:]
            (output / f"{fixture_id}.stdout.log").write_text(proc.stdout, encoding="utf-8")
            (output / f"{fixture_id}.stderr.log").write_text(proc.stderr, encoding="utf-8")
            if case["expect"] == "tex-error":
                # Demand the actual TeX failure signature, not a generic nonzero exit.
                passed = proc.returncode == 3 and not pdf.exists() and "XeLaTeX exited" in proc.stderr
                result["status"] = "PASS" if passed else "FAIL"
                result["assertion"] = "TeXFailure / no exported PDF"
            elif proc.returncode == 0 and pdf.is_file():
                valid, details = inspect_pdf(pdf, case.get("pages"))
                result.update(details)
                result["status"] = "PASS" if valid else "FAIL"
                result["assertion"] = "PDF magic, EOF, size; page count when pdfinfo installed"
            else:
                result["error"] = "CLI returned nonzero or did not create a PDF"
        except (OSError, subprocess.TimeoutExpired, ValueError) as exc:
            result["error"] = f"{type(exc).__name__}: {exc}"
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cli", required=True, type=Path, help="Path to compiled tikzarium-cli")
    parser.add_argument("--output", required=True, type=Path, help="QA artifact directory")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--manifest", type=Path, default=Path("fixtures/qa/manifest.json"))
    args = parser.parse_args()
    root = args.root.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    executable = args.cli.resolve()
    manifest = args.manifest if args.manifest.is_absolute() else root / args.manifest
    report: dict = {
        "schema_version": 1,
        "utc": datetime.now(timezone.utc).isoformat(),
        "commit_sha": os.getenv("GITHUB_SHA", "unrecorded-local"),
        "platform": platform.platform(),
        "machine": platform.machine(),
        "system": platform.system(),
        "python": platform.python_version(),
        "cli": str(executable),
        "xelatex": shutil.which("xelatex"),
        "manifest_sha256": sha256(manifest) if manifest.is_file() else None,
        "cases": [],
        "summary": {"PASS": 0, "FAIL": 0, "SKIP": 0},
    }
    try:
        if not executable.is_file():
            raise FileNotFoundError(f"CLI binary missing: {executable}")
        cases = load_manifest(root, manifest)
        doctor = command([str(executable), "doctor"], timeout=30)
        report["doctor"] = {"exit_code": doctor.returncode, "stdout": doctor.stdout[-3000:], "stderr": doctor.stderr[-1000:]}
        if doctor.returncode != 0:
            raise RuntimeError("XeLaTeX doctor failed; cannot mark fixture checks as passes")
        if report["xelatex"]:
            version = command([report["xelatex"], "--version"], timeout=30)
            report["xelatex_version"] = (version.stdout or version.stderr).splitlines()[:2]
        for case in cases:
            outcome = run_case(root, output, case, executable)
            report["cases"].append(outcome)
            report["summary"][outcome["status"]] += 1
            print(f"{outcome['status']} {outcome['id']} ({outcome.get('exit_code', 'no process')})", flush=True)
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired, json.JSONDecodeError) as exc:
        report["fatal"] = f"{type(exc).__name__}: {exc}"
        report["summary"]["FAIL"] += 1
        print(f"FAIL preflight: {report['fatal']}", file=sys.stderr, flush=True)
    finally:
        report_path = output / "qa-report.json"
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Evidence: {report_path}", flush=True)
    return 1 if report["summary"]["FAIL"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
