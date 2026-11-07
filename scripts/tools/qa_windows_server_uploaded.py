"""Independently verify original Windows Server product PDF; never a Win10 GUI claim."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def run(*args: str) -> str:
    return subprocess.run(args, check=True, capture_output=True, text=True,
                          encoding="utf-8", timeout=60).stdout


def audit(root: Path, expected_sha: str, fixture: Path) -> dict:
    if not re.fullmatch(r"[a-f0-9]{40}", expected_sha):
        raise ValueError("Invalid source commit SHA")
    native = read_json(root / "windows-server-rust.json")
    proof = read_json(root / "windows-server-qa.json")
    if native.get("source_sha") != expected_sha or proof.get("sha") != expected_sha:
        raise ValueError("Original reports are not bound to the expected commit")
    for key in ("rust_tests", "release_build"):
        if native.get(key) != "PASS_WINDOWS_SERVER_NOT_WIN10":
            raise ValueError(f"Required genuine Windows {key} not passed")
    if native.get("crt_imports") != "PASS_NO_DYNAMIC_VCRUNTIME":
        raise ValueError("Native PE import audit not passed")
    if proof.get("status") != "PASS_ACTUAL_PRODUCT_CLI_PDF_PENDING_INDEPENDENT_FONT_TEXT_AUDIT":
        raise ValueError("Actual product compilation did not pass")
    if proof.get("cli_exit") != 0 or proof.get("compiler_timed_out") is not False:
        raise ValueError("Actual native process failed or timed out")
    if proof.get("packages_unchanged") is not True:
        raise ValueError("Installed package inventory changed or was not checked")
    for binary, key in (("tikzarium-app.exe", "app_sha256"), ("tikzarium-cli.exe", "cli_sha256")):
        if digest(root / "native-release" / binary) != native.get(key):
            raise ValueError(f"Original {binary} hash mismatch")
    if proof.get("cli_sha256") != native.get("cli_sha256"):
        raise ValueError("Compiler CLI is not the verified native build")
    source = root / "owner-admin-proof/source.tex"
    pdf = root / "owner-admin-proof/product.pdf"
    if digest(source) != proof.get("source_sha256") or digest(source) != digest(fixture):
        raise ValueError("Original TeX differs from exact checked-in fixture")
    if digest(pdf) != proof.get("pdf_sha256"):
        raise ValueError("Original PDF hash mismatch")
    before = (root / "packages-before.txt").read_bytes()
    after = (root / "packages-after.txt").read_bytes()
    if before != after:
        raise ValueError("Original before/after package inventories differ")
    info = run("pdfinfo", str(pdf))
    fonts = run("pdffonts", str(pdf))
    text = run("pdftotext", "-enc", "UTF-8", str(pdf), "-")
    if not re.search(r"^Pages:\s+1\s*$", info, re.M):
        raise ValueError("Expected exactly one PDF page")
    rows = [line for line in fonts.splitlines()[2:] if line.strip()]
    if not rows:
        raise ValueError("PDF has no fonts")
    for row in rows:
        flags = re.search(r"\s+(yes|no)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$", row, re.I)
        if flags is None or flags[1].lower() != "yes" or flags[3].lower() != "yes":
            raise ValueError(f"Missing embedded font/Unicode mapping: {row}")
    if "Arial" not in fonts:
        raise ValueError("Requested installed Arial font absent from PDF")
    for expected in ("Точка", "Тест XeLaTeX", "Кириллица"):
        if expected not in text:
            raise ValueError(f"Cyrillic extraction missing {expected!r}")
    for name, value in (("pdfinfo.txt", info), ("pdffonts.txt", fonts), ("pdftotext.txt", text)):
        (root / name).write_text(value, encoding="utf-8")
    run("pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-png", "-r", "120",
        str(pdf), str(root / "product-pdf-preview"))
    return {"status": "PASS_ORIGINAL_WINDOWS_NATIVE_CLI_MIKTEX_PDF_FONTS_UNICODE",
            "source_sha": expected_sha, "pdf_sha256": digest(pdf), "font_count": len(rows),
            "actual_token": proof.get("security"), "execution_policy": proof.get("execution_policy"),
            "interactive_gui": "NOT_RUN", "physical_windows10": "NOT_RUN"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--fixture", type=Path, required=True)
    args = parser.parse_args()
    args.root.mkdir(parents=True, exist_ok=True)
    try:
        result = audit(args.root, args.source_sha, args.fixture)
        code = 0
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as exc:
        result = {"status": "FAIL", "error": str(exc), "source_sha": args.source_sha}
        code = 1
    (args.root / "independent-pdf-audit.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))
    return code


if __name__ == "__main__":
    sys.exit(main())
