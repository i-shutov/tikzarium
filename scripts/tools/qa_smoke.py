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
import unicodedata
from datetime import datetime, timezone


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_snapshot(project: Path) -> dict[str, str]:
    """Hash all original project inputs; never compare generated TeX aux files."""
    extensions = {".tex", ".tikz", ".sty", ".cls", ".bib", ".csv", ".pdf",
                  ".png", ".jpg", ".jpeg", ".svg"}
    return {file.relative_to(project).as_posix(): sha256(file)
            for file in sorted(project.rglob("*"))
            if file.is_file() and file.suffix.lower() in extensions}


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
        for key in ("source", "project_dir"):
            if not isinstance(case.get(key), str):
                raise ValueError(f"Missing or non-string {key} for {fixture_id}")
        if case.get("expect") not in ("pdf", "tex-error"):
            raise ValueError(f"Unexpected expectation for {fixture_id}")
        project = checked_child(root, case["project_dir"])
        if not project.is_dir():
            raise ValueError(f"Missing fixture project: {project}")
        source = checked_child(project, case["source"])
        if not source.is_file():
            raise ValueError(f"Missing fixture source: {source}")
        if case.get("pages") is not None and (type(case["pages"]) is not int or case["pages"] < 1):
            raise ValueError(f"Invalid expected page count: {fixture_id}")
        for key in ("text_expect", "font_expect"):
            if key not in case:
                continue
            value = case[key]
            entries = [value] if key == "text_expect" and isinstance(value, str) else value
            if (not isinstance(entries, list) or not entries
                    or any(not isinstance(v, str) or not v.strip() for v in entries)):
                raise ValueError(f"Invalid {key} for {fixture_id}")
        if "check_no_missing_glyphs" in case and type(case["check_no_missing_glyphs"]) is not bool:
            raise ValueError(f"Invalid check_no_missing_glyphs for {fixture_id}")
        # A negative fixture must identify the *specific* intended error.
        # A broken TeX invocation (notably Windows '.\\main.tex') can also
        # exit 3 without publishing a PDF, and must never pass G08.
        if case["expect"] == "tex-error":
            marker = case.get("error_expect")
            if (not isinstance(marker, str) or not re.fullmatch(r"\\[A-Za-z@]+", marker)
                    or len(marker) > 128):
                raise ValueError(f"Missing or invalid error_expect for {fixture_id}")
            if marker not in source.read_text(encoding="utf-8"):
                raise ValueError(f"error_expect not present in source for {fixture_id}")
        elif "error_expect" in case:
            raise ValueError(f"error_expect is only allowed for tex-error: {fixture_id}")
        if "known_limitation" in case:
            reason = case["known_limitation"]
            if (fixture_id != "g00-legacy-cyrillic-pdf-only"
                    or not isinstance(reason, str) or not reason.strip()):
                raise ValueError(f"Unapproved known_limitation for {fixture_id}")
    return cases


def inspect_pdf(
    path: Path,
    expected_pages: int | None,
    text_expect: str | list[str] | None = None,
    font_expect: list[str] | None = None,
) -> tuple[bool, dict]:
    """Check an actual PDF. Required Unicode evidence must fail closed."""
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
            proc = subprocess.run(
                [pdfinfo, str(path)], capture_output=True,
                text=True, encoding="utf-8", errors="replace", timeout=30,
            )
            match = re.search(r"(?m)^Pages:\s*(\d+)\s*$", proc.stdout)
            info["pages_checked"] = True
            info["pages_actual"] = int(match.group(1)) if proc.returncode == 0 and match else None
            info["pages_expected"] = expected_pages
            valid = valid and info["pages_actual"] == expected_pages
        else:
            info["pages_note"] = "NOT_CHECKED: pdfinfo unavailable; required page-count assertion FAILED"
            valid = False

    expected = [text_expect] if isinstance(text_expect, str) else (text_expect or [])
    if expected:
        pdftotext = shutil.which("pdftotext")
        info["text_expected"] = expected
        info["text_extraction_checked"] = pdftotext is not None
        info["text_encoding"] = "UTF-8 (explicit, independent of Windows console codepage)"
        if pdftotext:
            # Poppler writes UTF-8 bytes. subprocess text=True uses the current
            # Windows ANSI codepage unless an encoding is given, corrupting Cyrillic.
            proc = subprocess.run(
                [pdftotext, "-enc", "UTF-8", str(path), "-"],
                capture_output=True, timeout=30,
            )
            try:
                extracted = proc.stdout.decode("utf-8", errors="strict")
            except UnicodeDecodeError as exc:
                extracted = ""
                info["text_decode_error"] = str(exc)
            normalized = unicodedata.normalize("NFC", " ".join(extracted.split()))
            info["text_extraction_preview"] = normalized[:280]
            info["text_matches"] = {
                item: unicodedata.normalize("NFC", " ".join(item.split())) in normalized
                for item in expected
            }
            info["text_found"] = proc.returncode == 0 and all(info["text_matches"].values())
            valid = valid and info["text_found"]
        else:
            info["text_found"] = False
            info["text_extraction_note"] = (
                "FAIL: pdftotext unavailable; required Unicode text cannot be proved"
            )
            valid = False

    if font_expect:
        info["font_expected"] = font_expect
        tool = shutil.which("pdffonts")
        info["embedded_fonts_checked"] = tool is not None
        if tool:
            proc = subprocess.run([tool, str(path)], capture_output=True, timeout=30)
            # Use column 0 (PDF font name) and column -5 (emb), never a
            # substring match against the entire row: a similarly-named
            # non-embedded font must not satisfy a required embedded family.
            table = proc.stdout.decode("utf-8", errors="replace").splitlines()[2:]
            records = []
            for line in table:
                fields = line.split()
                if len(fields) < 7 or fields[-5].lower() not in ("yes", "no"):
                    continue
                records.append({"name": fields[0], "embedded": fields[-5].lower() == "yes"})
            info["font_records_count"] = len(records)
            info["font_records"] = records[:50]
            checks = {}
            for family in font_expect:
                # Typical subset prefix: ABCDEF+DejaVuSerif-Bold. A font
                # merely containing 'DejaVuSerif' in its name is not proof.
                family_pattern = re.compile(
                    r"^(?:[A-Z]{6}\+)?" + re.escape(family) + r"(?:[-+,]|$)",
                    re.IGNORECASE,
                )
                checks[family] = any(
                    record["embedded"] and family_pattern.search(record["name"])
                    for record in records
                )
            info["font_embedded"] = checks
            valid = valid and proc.returncode == 0 and bool(records) and all(checks.values())
        else:
            info["font_embedding_note"] = (
                "NOT_CHECKED: pdffonts unavailable; required embedded-font assertion FAILED"
            )
            valid = False
    return valid, info

def command(args: list[str], timeout: int = 180, cwd: Path | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, errors="replace", timeout=timeout)


def check_missing_glyphs(source: Path, output: Path, fixture_id: str) -> tuple[bool, dict]:
    """Independent XeLaTeX audit: a successful PDF can still omit glyphs."""
    engine = os.environ.get("TIKZARIUM_XELATEX") or shutil.which("xelatex")
    if not engine:
        return False, {"glyph_audit": "FAIL", "glyph_error": "XeLaTeX executable not found"}
    with tempfile.TemporaryDirectory(prefix="xelatex-font-audit-", dir=output) as temp:
        target = Path(temp)
        args = [str(engine), "-interaction=nonstopmode", "-halt-on-error",
                "-file-line-error", "-no-shell-escape",
                f"-output-directory={target}", source.name]
        proc = command(args, cwd=source.parent)
        log_file = target / f"{source.stem}.log"
        audit_log = log_file.read_text(encoding="utf-8", errors="replace") if log_file.exists() else proc.stdout
        (output / f"{fixture_id}.font-audit.log").write_text(audit_log, encoding="utf-8")
        warnings = re.findall(r"(?m)^Missing character:.*$", audit_log)
        passed = proc.returncode == 0 and log_file.exists() and (target / f"{source.stem}.pdf").is_file() and not warnings
        return passed, {"glyph_audit": "PASS" if passed else "FAIL",
                        "glyph_audit_exit_code": proc.returncode,
                        "missing_glyphs": len(warnings),
                        "missing_glyph_examples": warnings[:4]}


def run_case(root: Path, output: Path, case: dict, executable: Path) -> dict:
    fixture_id = case["id"]
    result: dict = {"id": fixture_id, "expect": case["expect"], "status": "FAIL"}
    # The multi-file case deliberately exercises Unicode+spaces in the project path.
    with tempfile.TemporaryDirectory(prefix="tikzarium-qa-", dir=output) as temp:
        project = Path(temp) / ("project with spaces é" if case.get("unicode_path") else "project")
        source_dir = checked_child(root, case["project_dir"])
        shutil.copytree(source_dir, project)
        source = checked_child(project, case["source"])
        source_before = source_snapshot(project)
        result["source_sha256"] = source_before
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
                # A generic XeLaTeX exit=3 is not evidence that the *source*
                # triggered its intended failure. On Windows, a broken '.\\main'
                # command line previously made this negative test falsely PASS.
                marker = case["error_expect"]
                checks = {
                    "expected_command": marker in proc.stderr,
                    "undefined_control_sequence": "Undefined control sequence" in proc.stderr,
                    "tex_failure": "XeLaTeX exited" in proc.stderr and proc.returncode == 3,
                    "no_pdf": not pdf.exists(),
                }
                result["error_expect"] = marker
                result["error_checks"] = checks
                result["status"] = "PASS" if all(checks.values()) else "FAIL"
                result["assertion"] = "Expected source-specific TeX error plus no exported PDF"
            elif proc.returncode == 0 and pdf.is_file():
                valid, details = inspect_pdf(pdf, case.get("pages"), case.get("text_expect"), case.get("font_expect"))
                result.update(details)
                if case.get("check_no_missing_glyphs"):
                    glyph_ok, glyph_details = check_missing_glyphs(source, output, fixture_id)
                    result.update(glyph_details)
                    valid = valid and glyph_ok
                result["status"] = "PASS" if valid else "FAIL"
                result["assertion"] = "PDF integrity; required Unicode text; embedded fonts if tool available; pages if tool available"
            else:
                result["error"] = "CLI returned nonzero or did not create a PDF"
        except (OSError, subprocess.TimeoutExpired, ValueError) as exc:
            result["error"] = f"{type(exc).__name__}: {exc}"
        finally:
            source_after = source_snapshot(project)
            result["source_unchanged"] = source_after == source_before
            if not result["source_unchanged"]:
                result["status"] = "FAIL"
                result["source_mutation"] = {
                    "before": source_before,
                    "after": source_after,
                }
                result["error"] = "Source/project inputs modified by CLI or XeLaTeX"
    # Narrowly quarantined W01 example: OS font name lookup is a known
    # upstream prerequisite, not a proof that Cyrillic is rendered.
    # Never quarantine source changes, unrelated errors or invalid PDF output.
    if case.get("known_limitation") and result.get("source_unchanged"):
        expected_missing_font = (
            result.get("exit_code") == 3
            and 'The font "DejaVu Serif" cannot be found' in result.get("stderr_tail", "")
        )
        if result["status"] == "PASS" or expected_missing_font:
            result["observed_status"] = result["status"]
            result["status"] = "KNOWN_LIMITATION"
            result["known_limitation"] = case["known_limitation"]
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
        "source_head_sha": os.getenv("TIKZARIUM_SOURCE_SHA", "unrecorded-local"),
        "platform": platform.platform(),
        "ci_runner": {
            "os": os.getenv("RUNNER_OS"),
            "arch": os.getenv("RUNNER_ARCH"),
            "image_os": os.getenv("ImageOS"),
        },
        "machine": platform.machine(),
        "system": platform.system(),
        "python": platform.python_version(),
        "cli": str(executable),
        "xelatex": shutil.which("xelatex"),
        "pdf_tools": {name: shutil.which(name) for name in ("pdfinfo", "pdftotext", "pdffonts")},
        "manifest_sha256": sha256(manifest) if manifest.is_file() else None,
        "cases": [],
        "summary": {"PASS": 0, "FAIL": 0, "SKIP": 0, "KNOWN_LIMITATION": 0},
    }
    try:
        if not executable.is_file():
            raise FileNotFoundError(f"CLI binary missing: {executable}")
        report["cli_sha256"] = sha256(executable)
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
    except (OSError, ValueError, RuntimeError, TypeError, KeyError, subprocess.TimeoutExpired,
            json.JSONDecodeError) as exc:
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
