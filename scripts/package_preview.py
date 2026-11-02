#!/usr/bin/env python3
"""Wrap audited native Rust binaries as unsigned portable previews, never installers."""
from __future__ import annotations

import argparse
import hashlib
import json
import plistlib
import re
import stat
import struct
import zipfile
from pathlib import Path

PLIST = {
    "CFBundleDevelopmentRegion": "ru",
    "CFBundleExecutable": "tikzarium-app",
    "CFBundleIdentifier": "io.github.i-shutov.tikzarium",
    "CFBundleInfoDictionaryVersion": "6.0",
    "CFBundleName": "TikZarium",
    "CFBundlePackageType": "APPL",
    "CFBundleShortVersionString": "0.1.0",
    "CFBundleVersion": "1",
    "NSHighResolutionCapable": True,
}
README = """# TikZarium — portable preview, НЕ installer и НЕ релиз

Native Rust release binaries from GitHub Actions at the source SHA in PROVENANCE.json.
Windows x64: extract and run TikZarium/tikzarium-app.exe; separate CLI included.
macOS ARM64: TikZarium.app is UNSIGNED and UNNOTARIZED; separate CLI included.
Do not bypass OS security protections to launch an unsigned preview.

XeLaTeX must be installed separately by the user (MiKTeX on Windows, external
XeLaTeX on Mac ARM). No TeX distribution, packages, fonts, or installer are
bundled or silently installed.

Physical Win10/MiKTeX, M1/M4/XeLaTeX GUI, OS dialogs, fonts, Retina/DPI,
code signing/notarization and installer are NOT_RUN/NOT_PROVIDED.
These previews exist solely to enable supervised physical acceptance.
"""

def digest(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()

def native_binary(path: Path, target: str) -> bytes:
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"Not an ordinary native binary: {path}")
    blob = path.read_bytes()
    if target == "windows-x64":
        if len(blob) < 128 or blob[:2] != b"MZ":
            raise ValueError("Missing Windows PE DOS header")
        offset = struct.unpack_from("<I", blob, 0x3c)[0]
        if offset > len(blob) - 6 or blob[offset:offset+4] != b"PE\0\0":
            raise ValueError("Missing Windows PE header")
        if struct.unpack_from("<H", blob, offset + 4)[0] != 0x8664:
            raise ValueError("Windows binary is not native x64")
    elif target == "macos-arm64":
        if len(blob) < 32 or blob[:4] != b"\xcf\xfa\xed\xfe" or struct.unpack_from("<I", blob, 4)[0] != 0x0100000C:
            raise ValueError("Not an arm64 Mach-O executable")
    else:
        raise ValueError("Unsupported preview target")
    return blob

def package(platform: str, app: Path, cli: Path, lock_file: Path, head: str, output: Path) -> dict:
    if not re.fullmatch(r"[0-9a-f]{40}", head):
        raise ValueError("Full exact Git SHA required")
    if platform not in ("windows-x64", "macos-arm64"):
        raise ValueError("Unsupported preview platform")
    if lock_file.is_symlink() or not lock_file.is_file():
        raise ValueError("Missing native lock-provenance file")
    lock = json.loads(lock_file.read_text(encoding="utf-8"))
    if lock.get("checkout_sha") != head:
        raise ValueError("Checkout differs from binary lock provenance")
    host, arch = str(lock.get("host", "")).lower(), str(lock.get("architecture", "")).lower()
    if platform == "windows-x64" and ("windows" not in host or arch not in ("x86_64", "amd64")):
        raise ValueError("Not a native Windows x64 build")
    if platform == "macos-arm64" and ("macos" not in host or arch not in ("arm64", "aarch64")):
        raise ValueError("Not a native macOS ARM64 build")
    if lock.get("physical_windows10_miktex") != "NOT_RUN" or lock.get("physical_mac_m1_m4_xelatex") != "NOT_RUN":
        raise ValueError("Host metadata cannot imply physical desktop acceptance")
    app_bytes, cli_bytes = native_binary(app, platform), native_binary(cli, platform)
    if platform == "windows-x64":
        files = [("TikZarium/tikzarium-app.exe", app_bytes, True),
                 ("TikZarium/tikzarium-cli.exe", cli_bytes, True)]
    else:
        files = [("TikZarium.app/Contents/Info.plist", plistlib.dumps(PLIST), False),
                 ("TikZarium.app/Contents/MacOS/tikzarium-app", app_bytes, True),
                 ("tikzarium-cli", cli_bytes, True)]
    provenance = {
        "schema": "tikzarium.portable-preview.v1",
        "source_repository": "https://github.com/i-shutov/tikzarium",
        "source_sha": head, "target": platform, "native_lock_report": lock,
        "app_sha256": digest(app_bytes), "cli_sha256": digest(cli_bytes),
        "installer": "NOT_PROVIDED", "code_signing": "NOT_RUN",
        "physical_windows10_miktex": "NOT_RUN", "physical_mac_m1_m4_xelatex": "NOT_RUN",
        "external_xelatex": "USER_PREREQUISITE_NOT_BUNDLED",
    }
    files += [("README_RU.md", README.encode("utf-8"), False),
              ("PROVENANCE.json", (json.dumps(provenance, sort_keys=True, ensure_ascii=False, indent=2)+"\n").encode(), False)]
    checks = "".join(f"{digest(data)}  {name}\n" for name, data, _ in files)
    files.append(("SHA256SUMS.txt", checks.encode(), False))
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=8) as archive:
        for name, data, executable in files:
            item = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            item.create_system = 3
            item.external_attr = ((stat.S_IFREG | (0o755 if executable else 0o644)) << 16)
            item.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(item, data)
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() or archive.namelist() != [name for name, _, _ in files]:
            raise ValueError("ZIP integrity failure")
        if any(archive.read(name) != data for name, data, _ in files):
            raise ValueError("ZIP byte integrity failure")
    return {"source_sha": head, "target": platform, "archive_sha256": digest(output.read_bytes()), "files": len(files)}

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--platform", choices=("windows-x64", "macos-arm64"), required=True)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--cli", type=Path, required=True)
    parser.add_argument("--lock", type=Path, required=True)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(package(args.platform, args.app, args.cli, args.lock, args.source_sha, args.output), sort_keys=True))

if __name__ == "__main__":
    main()
