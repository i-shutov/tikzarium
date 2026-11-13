#!/usr/bin/env python3
"""Explicit hosted capture of canonical AT4 PDFs; EXTERNAL_REFERENCE_ONLY.

No engine installation, fallback, source transformation or GUI interaction.
No-shell-escape is an engine option, not an OS sandbox. Invoke only deliberately
in disposable hosted CI; independent visual comparison remains REQUIRED.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys

import qa_pgfplots_vertical_evidence as evidence
import qa_at4_scientific_invariants as scientific
from qa_i61_b42_studio_x11 import audit_embedded_fonts
from qa_n2_studio_x11 import validate_xelatex_log
from qa_pgfplots_vertical_x11 import recorder_inputs

FIXTURES = ("AT4-09", "AT4-48", "AT4-49", "AT4-50", "AT4-55", "AT4-56", "AT4-58", "AT4-61")


def capture(argv: list[str], directory: Path, filename: str, timeout: float) -> bytes:
    """Direct bounded argv; retain partial output and stop the process group."""
    path = directory / filename
    with path.open("wb") as console:
        process = subprocess.Popen(argv, cwd=directory, stdout=console,
                                   stderr=subprocess.STDOUT, start_new_session=True)
        try:
            code = process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=5)
            raise
    if code:
        raise RuntimeError(f"{argv[0]} exited {code}; original output: {path}")
    return path.read_bytes()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--timeout", type=float, default=180)
    args = parser.parse_args()
    if not 1 <= args.timeout <= 600:
        parser.error("--timeout must be bounded to 1..600 seconds")
    out = args.out.resolve()
    try:
        out.mkdir(parents=True, exist_ok=False)
    except FileExistsError:
        print("Reference output must be new/nonexisting: " + str(out), file=sys.stderr)
        return 1
    report = {"schema_version": 1, "scope": "EXTERNAL_REFERENCE_ONLY", "status": "FAIL",
              "native_gui_acceptance": "NOT_RUN", "visual_review": "REQUIRED",
              "fixtures": list(FIXTURES), "cases": {fixture: {
                  "status": "NOT_RUN", "native_gui_acceptance": "NOT_RUN", "visual_review": "REQUIRED",
                  "expected_source_sha256": evidence.AT4_CASES.get(fixture, {}).get("sha256")}
                  for fixture in FIXTURES}, "created_utc": evidence.now()}
    try:
        report["source_commit"] = capture(["git", "-C", str(evidence.SOURCE_ROOT), "rev-parse", "HEAD"],
            out, "source-commit.original.txt", 10).decode("utf-8", "strict").strip()
        if evidence.fixtures_for_suite("at4") != FIXTURES:
            raise RuntimeError("Reference fixture inventory differs from exact eight originals")
        intake = evidence.read_json(evidence.SOURCE_ROOT / "roadmap/AI_TIKZ_SKILLS_2026-11-10/AT4_SOURCE_INTAKE.json")
        catalogue = evidence.SOURCE_ROOT / "roadmap/AI_TIKZ_SKILLS_2026-11-10/catalogue.original.json"
        if evidence.sha(catalogue) != intake["catalogue"]["sha256"]:
            raise RuntimeError("Original catalogue checksum differs from source intake")
        report["catalogue_sha256"] = evidence.sha(catalogue)
        for fixture in FIXTURES:
            directory = out / fixture
            directory.mkdir()
            original = evidence.fixture_bytes(fixture)
            source = directory / "original.tex"
            source.write_bytes(original)
            report["cases"][fixture].update({"source_sha256": evidence.digest(original),
                "canonical_path": str(evidence.fixture_path(fixture)), "source_file": str(source.relative_to(out)),
                "source_semantics": scientific.validate_case(fixture[4:], original,
                    scientific.load_catalogue_record(catalogue, fixture[4:]))})
        programs = {name: shutil.which(name) for name in ("xelatex", "pdfinfo", "pdffonts", "pdftotext", "pdftoppm")}
        if not all(programs.values()):
            raise RuntimeError("Missing existing reference prerequisite: " + str(programs))
        report["programs"] = programs
        report["engine_path"] = programs["xelatex"]  # Preserve xelatex invocation name/format selection.
        report["engine_realpath"] = str(Path(programs["xelatex"]).resolve(strict=True))
        report["engine_sha256"] = evidence.sha(Path(programs["xelatex"]))
        report["engine_version"] = capture([programs["xelatex"], "--version"], out,
            "engine-version.original.txt", 10).decode("utf-8", "strict").strip()
        for fixture in FIXTURES:
            directory, case = out / fixture, report["cases"][fixture]
            source = directory / "original.tex"
            try:
                if evidence.sha(source) != case["source_sha256"]:
                    raise RuntimeError("Original copied source changed before compilation")
                argv = [programs["xelatex"], "-interaction=nonstopmode", "-halt-on-error",
                        "-file-line-error", "-no-shell-escape", "-recorder", source.name]
                case["engine_argv"] = argv
                console = capture(argv, directory, "engine-console.original.txt", args.timeout)
                validate_xelatex_log(console)
                if b"nullfont" in console.lower():
                    raise RuntimeError("Reference engine reports nullfont")
                validate_xelatex_log((directory / "original.log").read_bytes())
                if source.resolve() not in recorder_inputs((directory / "original.fls").read_bytes(), directory):
                    raise RuntimeError("Actual engine recorder does not contain canonical copied source")
                pdf = directory / "original.pdf"
                info = capture([programs["pdfinfo"], str(pdf)], directory, "pdfinfo.original.txt", 15)
                if not re.search(rb"(?m)^Pages:\s+1$", info):
                    raise RuntimeError("Reference PDF must have exactly one page")
                fonts = capture([programs["pdffonts"], str(pdf)], directory, "pdffonts.original.txt", 15)
                case["embedded_font_rows"] = audit_embedded_fonts(fonts.decode("utf-8", "strict"))
                capture([programs["pdftotext"], "-enc", "UTF-8", str(pdf), "-"], directory, "pdftotext.original.txt", 15).decode("utf-8", "strict")
                capture([programs["pdftoppm"], "-f", "1", "-l", "1", "-singlefile", "-png", "-r", "120",
                         str(pdf), str(directory / "original-120dpi")], directory, "raster-console.original.txt", 30)
                if not (directory / "original-120dpi.png").read_bytes().startswith(b"\x89PNG\r\n\x1a\n"):
                    raise RuntimeError("Missing actual 120dpi reference PNG")
                case.update(status="PASS_EXTERNAL_REFERENCE_ONLY", pdf_sha256=evidence.sha(pdf))
            except Exception as error:
                case.update(status="FAIL", error=f"{type(error).__name__}: {error}")
            finally:
                case["source_after_sha256"] = evidence.sha(source)
                case["canonical_after_sha256"] = evidence.sha(evidence.fixture_path(fixture))
                if any(case[key] != case["source_sha256"] for key in ("source_after_sha256", "canonical_after_sha256")):
                    case.update(status="FAIL", source_error="Copied/canonical source changed; reference invalid")
        if all(case["status"] == "PASS_EXTERNAL_REFERENCE_ONLY" for case in report["cases"].values()):
            report["status"] = "PASS_EXTERNAL_REFERENCE_ONLY"
    except Exception as error:
        report["error"] = f"{type(error).__name__}: {error}"
    finally:
        report["files"] = {str(path.relative_to(out)): evidence.sha(path)
                           for path in sorted(out.rglob("*")) if path.is_file() and path.name != "report.json"}
        evidence.write_json(out / "report.json", report)
    print(str(out / "report.json"))
    return 0 if report["status"] == "PASS_EXTERNAL_REFERENCE_ONLY" else 1


if __name__ == "__main__":
    raise SystemExit(main())
