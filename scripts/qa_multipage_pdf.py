#!/usr/bin/env python3
"""B03 end-to-end XeLaTeX/Poppler two-page proof, without a GUI claim.

Only uses an isolated COPY of the checked-in TeX source. This verifies
CLI-produced PDF pagination and distinct per-page raster images, not egui
interaction or physical Windows 10 / M1 / M4 desktop acceptance.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import shutil
import subprocess
import sys
from pathlib import Path

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class EvidenceError(RuntimeError):
    """A required provenance or PDF observation failed."""


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def run_command(args: list[str], timeout: int = 120) -> str:
    try:
        done = subprocess.run(
            args, capture_output=True, check=False, timeout=timeout
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise EvidenceError(f"{args[0]} invocation failed: {exc}") from exc
    if done.returncode != 0:
        stderr = done.stderr.decode("utf-8", errors="replace")
        stdout = done.stdout.decode("utf-8", errors="replace")
        raise EvidenceError(
            f"{args[0]} exit={done.returncode}: {(stderr or stdout)[-1200:]}"
        )
    return done.stdout.decode("utf-8", errors="replace")


def parse_page_count(pdfinfo_stdout: str) -> int:
    values = [
        line.partition(":")[2].strip()
        for line in pdfinfo_stdout.splitlines()
        if line.partition(":")[0].strip() == "Pages" and ":" in line
    ]
    if len(values) != 1 or not values[0].isdigit() or int(values[0]) <= 0:
        raise EvidenceError("pdfinfo did not report one positive Pages field")
    return int(values[0])


def verify_page_text(first: str, second: str, expected_first: str, expected_second: str) -> None:
    if not expected_first or not expected_second or expected_first == expected_second:
        raise EvidenceError("Expected page markers must be distinct and nonempty")
    if expected_first not in first or expected_second not in second:
        raise EvidenceError("Required Unicode text missing from an expected PDF page")
    if expected_second in first or expected_first in second:
        raise EvidenceError("Page text markers overlap: page targeting is not proven")


def require_distinct_png(first: Path, second: Path) -> tuple[str, str]:
    for path in (first, second):
        if not path.is_file() or path.stat().st_size <= len(PNG_SIGNATURE):
            raise EvidenceError(f"Missing or empty page image: {path}")
        if path.open("rb").read(len(PNG_SIGNATURE)) != PNG_SIGNATURE:
            raise EvidenceError(f"Not a PNG image: {path}")
    one, two = sha256_file(first), sha256_file(second)
    if one == two:
        raise EvidenceError("Two requested pages yielded byte-identical PNGs")
    return one, two


def source_unchanged(path: Path, initial_sha256: str) -> None:
    if sha256_file(path) != initial_sha256:
        raise EvidenceError(f"TeX source changed during preview check: {path}")


def validate_output_dir(path: Path, source: Path) -> None:
    resolved = path.resolve()
    if resolved == source.resolve().parent or resolved == source.resolve():
        raise EvidenceError("Output directory must not be the source directory")
    if source.resolve().is_relative_to(resolved):
        raise EvidenceError("Output directory may not contain the source fixture")
    path.mkdir(parents=True, exist_ok=True)


def prove(cli: Path, source: Path, out: Path, first_marker: str, second_marker: str) -> dict:
    if not cli.is_file() or not source.is_file():
        raise EvidenceError("CLI executable and source fixture must both exist")
    validate_output_dir(out, source)
    src_sha = sha256_file(source)
    # The tested CLI never receives the repository's original source path.
    copied_source = out / "tikzarium-two-pages-input.tex"
    shutil.copyfile(source, copied_source)
    copied_sha = sha256_file(copied_source)
    if copied_sha != src_sha:
        raise EvidenceError("TeX source copy differs from the repository original")

    pdf = out / "two_pages.pdf"
    try:
        run_command([str(cli.resolve()), "build", str(copied_source), str(pdf)], 180)
        if not pdf.is_file() or pdf.open("rb").read(5) != b"%PDF-":
            raise EvidenceError("CLI did not produce a recognizable PDF")
        pages = parse_page_count(run_command(["pdfinfo", str(pdf)], 45))
        if pages != 2:
            raise EvidenceError(f"Expected exactly 2 PDF pages, got {pages}")

        texts = []
        png_paths = []
        for page in (1, 2):
            texts.append(
                run_command(
                    ["pdftotext", "-f", str(page), "-l", str(page),
                     "-enc", "UTF-8", str(pdf), "-"], 45
                )
            )
            prefix = out / f"page-{page}"
            run_command(
                ["pdftoppm", "-f", str(page), "-l", str(page),
                 "-singlefile", "-png", "-r", "120", str(pdf), str(prefix)], 90
            )
            png_paths.append(prefix.with_suffix(".png"))
        verify_page_text(texts[0], texts[1], first_marker, second_marker)
        page1_hash, page2_hash = require_distinct_png(*png_paths)
        return {
            "status": "PASS_CLI_POPPLER_ONLY",
            "source_sha256": src_sha,
            "copied_source_sha256": copied_sha,
            "cli_sha256": sha256_file(cli),
            "pdf_sha256": sha256_file(pdf),
            "pdf_page_count": pages,
            "page_png_sha256": [page1_hash, page2_hash],
            "page_unicode_markers": [first_marker, second_marker],
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "egui_clickthrough": "NOT_RUN",
            "physical_windows10_x64": "NOT_RUN",
            "physical_mac_m1": "NOT_RUN",
            "physical_mac_m4": "NOT_RUN",
            "scope": "CI Linux CLI to real XeLaTeX to PDF to Poppler, two exact pages",
        }
    finally:
        # Verify both the original and the disposable source after all subprocesses,
        # even if a check failed or a tool timed out.
        source_unchanged(source, src_sha)
        source_unchanged(copied_source, copied_sha)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cli", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--expect-first", required=True)
    parser.add_argument("--expect-second", required=True)
    args = parser.parse_args()
    report_path = args.output_dir / "multipage-evidence.json"
    try:
        evidence = prove(
            args.cli, args.source, args.output_dir,
            args.expect_first, args.expect_second
        )
        print(json.dumps(evidence, ensure_ascii=False, indent=2))
        report_path.write_text(
            json.dumps(evidence, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        return 0
    except (EvidenceError, OSError) as exc:
        fail = {"status": "FAIL", "reason": str(exc), "scope": "CLI_POPPLER_ONLY"}
        print(json.dumps(fail, ensure_ascii=False), file=sys.stderr)
        if args.output_dir.is_dir():
            report_path.write_text(
                json.dumps(fail, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
