#!/usr/bin/env python3
"""Fail CI if a XeLaTeX PDF silently drops expected Unicode text."""

from __future__ import annotations

import argparse
from pathlib import Path
import subprocess
import sys
import unicodedata


def normalize_text(value: str) -> str:
    """Accept PDF word wrapping and canonically equivalent Unicode."""
    return " ".join(unicodedata.normalize("NFC", value).split())


def missing_fragments(text: str, expected: list[str]) -> list[str]:
    normalized = normalize_text(text)
    return [part for part in expected if normalize_text(part) not in normalized]


def extract_text(pdf: Path) -> str:
    if not pdf.is_file():
        raise ValueError(f"PDF does not exist: {pdf}")
    with pdf.open("rb") as stream:
        if stream.read(5) != b"%PDF-":
            raise ValueError(f"Invalid PDF signature: {pdf}")
    result = subprocess.run(
        ["pdftotext", "-enc", "UTF-8", str(pdf), "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
        check=False,
    )
    if result.returncode:
        raise ValueError(f"pdftotext exit={result.returncode}: {result.stderr.strip()}")
    return result.stdout


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--expect", action="append", required=True)
    parser.add_argument("--extracted-out", type=Path)
    args = parser.parse_args(argv)
    try:
        extracted = extract_text(args.pdf)
        if args.extracted_out is not None:
            args.extracted_out.parent.mkdir(parents=True, exist_ok=True)
            args.extracted_out.write_text(extracted, encoding="utf-8")
        missing = missing_fragments(extracted, args.expect)
        if missing:
            raise ValueError(f"Expected Unicode not found in extracted text: {missing!r}")
    except (ValueError, OSError) as error:
        print(f"FAIL Unicode PDF audit: {error}", file=sys.stderr)
        return 1
    print(f"PASS Unicode PDF audit: {args.pdf} ({len(args.expect)} checks)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
