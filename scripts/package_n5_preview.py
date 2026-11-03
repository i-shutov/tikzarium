#!/usr/bin/env python3
"""Offline provenance-locked N5 portable preview packaging (NOT an installer).

Only packages two already-built native binaries. Never downloads/installs TeX,
executes input binaries, signs an application, or asserts physical GUI acceptance.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import plistlib
import re
import stat
import struct
import tarfile
import zipfile
from pathlib import Path

WIN = "windows10-x64"
MAC = "macos-arm64"
SOURCE_RE = re.compile(r"[0-9a-f]{40}\Z")
HASH_RE = re.compile(r"[0-9a-f]{64}\Z")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check_binary(data: bytes, platform: str) -> None:
    if platform == WIN:
        if len(data) < 0x40 or data[:2] != b"MZ":
            raise ValueError("Windows x64 PE: missing DOS header")
        offset = struct.unpack_from("<I", data, 0x3C)[0]
        if offset > len(data) - 26 or data[offset:offset + 4] != b"PE\0\0":
            raise ValueError("Windows x64 PE: missing NT header")
        if struct.unpack_from("<H", data, offset + 4)[0] != 0x8664:
            raise ValueError("Windows binary is not AMD64")
        if struct.unpack_from("<H", data, offset + 24)[0] != 0x20B:
            raise ValueError("Windows binary is not PE32+ executable")
    elif platform == MAC:
        if len(data) < 32 or data[:4] != b"\xcf\xfa\xed\xfe":
            raise ValueError("Mac binary is not little-endian 64-bit Mach-O")
        if struct.unpack_from("<I", data, 4)[0] != 0x0100000C:
            raise ValueError("Mac binary is not ARM64")
        if struct.unpack_from("<I", data, 12)[0] != 2:
            raise ValueError("Mac binary is not an executable Mach-O")
    else:
        raise ValueError("Unsupported target")


def fixture() -> bytes:
    # Intentionally CRLF, opaque macro must be left unmodified by the GUI.
    lines = [
        r"\documentclass{standalone}",
        r"\usepackage{fontspec}",
        r"\usepackage{tikz}",
        r"\setmainfont{DejaVu Serif}",
        r"\newcommand{\OpaqueNfive}{Фигура}",
        r"\begin{document}",
        r"\begin{tikzpicture}",
        r"\draw (0cm,0cm) -- (2cm,1cm);",
        r"\node at (1cm,0cm) {\OpaqueNfive};",
        r"\end{tikzpicture}",
        r"\end{document}",
    ]
    return ("\r\n".join(lines) + "\r\n").encode("utf-8")


def readme(platform: str, sha: str, ci_url: str) -> bytes:
    command = "./tikzarium-cli.exe doctor" if platform == WIN else "./tikzarium-cli doctor"
    launch = "./tikzarium-app.exe" if platform == WIN else "open ./TikZarium.app"
    return f"""# TikZarium — N5 native portable PREVIEW (не релиз)

Git main: {sha}. Оригинальные release-бинарники: {ci_url}.
Комплект **не является подписанным установщиком**, и статус Windows 10/M1/M4 GUI — **NOT_RUN**.

## Требования

- Windows 10 x64: установленный самим пользователем MiKTeX/XeLaTeX.
- macOS Apple Silicon M1/M4: установленный самим пользователем внешний XeLaTeX.
- Poppler (pdftoppm, pdffonts, pdftotext) нужен для соответствующих функций/проверок.
- Файл .tex требует доступный DejaVu Serif. Пользовательские шрифты и TeX в архив НЕ включены.
- Нет автоматической установки пакетов, фоновой загрузки, переключения TeX-дистрибуций.

## Как проверить

1. Проверьте SHA-256 всех вложений по MANIFEST.sha256 ДО запуска.
2. Настройте путь к СВОЕМУ XeLaTeX; не заменяйте MiKTeX на TeX Live ради зелёного результата.
3. Выполните {command}. Затем запустите GUI: {launch}.
4. Проведите шесть настоящих мышиных операций, оставив редактируемый .tex рядом с рисунком.
5. Проверьте Inspector/F1, шесть библиотек и пять независимых статусов, Connect/Undo/Disconnect, File Open/Save, XeLaTeX PDF, кириллицу и встроенный шрифт.
6. Сохраните реальные PNG/.tex/PDF/log с SHA-256 и отметьте физическую платформу.

macOS .app здесь **unsigned/unnotarized**: Finder/Gatekeeper может ограничить запуск. Не отключайте системную безопасность глобально. Запуск в Finder, кодовая подпись, установка, масштаб Retina, IME и Unicode остаются NOT_RUN до реального Mac. Windows .zip — **portable preview**, не MSI/EXE-инсталлятор. doctor/наличие exe сами по себе не доказывают GUI или сборку PDF.

Файл PROVENANCE.json сообщает происхождение, архитектуру, хеши и только фактически выполненные проверки упаковки. Источник примера с CRLF не является доказательством компиляции.
""".encode("utf-8")


def make_bundle(platform: str, source: str, ci_url: str, app: bytes, cli: bytes) -> dict[str, tuple[bytes, int]]:
    root = "Tikzarium-preview/"
    entries: dict[str, tuple[bytes, int]] = {}
    if platform == WIN:
        entries[root + "tikzarium-app.exe"] = app, 0o644
        entries[root + "tikzarium-cli.exe"] = cli, 0o644
    else:
        plist = plistlib.dumps({
            "CFBundleDevelopmentRegion": "ru",
            "CFBundleDisplayName": "TikZarium Preview",
            "CFBundleExecutable": "tikzarium-app",
            "CFBundleIdentifier": "ru.tikzarium.preview",
            "CFBundleInfoDictionaryVersion": "6.0",
            "CFBundleName": "TikZarium",
            "CFBundlePackageType": "APPL",
            "CFBundleShortVersionString": "0.0.0",
            "CFBundleVersion": "1",
            "LSMinimumSystemVersion": "11.0",
            "NSHighResolutionCapable": True,
        })
        entries[root + "TikZarium.app/Contents/Info.plist"] = plist, 0o644
        entries[root + "TikZarium.app/Contents/MacOS/tikzarium-app"] = app, 0o755
        entries[root + "tikzarium-cli"] = cli, 0o755
    entries[root + "qa/figure-crlf.tex"] = fixture(), 0o644
    entries[root + "README_RU.md"] = readme(platform, source, ci_url), 0o644
    provenance = {
        "schema_version": 1, "source_sha": source, "original_ci_run": ci_url,
        "platform": platform, "app_sha256": sha256(app), "cli_sha256": sha256(cli),
        "packaging": "local_offline_header_and_hash_verified",
        "physical_windows10": "NOT_RUN", "physical_mac_m1": "NOT_RUN",
        "physical_mac_m4": "NOT_RUN", "signed_installer": "NOT_RUN",
        "external_xelatex_gui_pdf": "NOT_RUN", "notarization": "NOT_RUN",
        "tex_or_fonts_bundled": False,
    }
    entries[root + "PROVENANCE.json"] = (json.dumps(provenance, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode(), 0o644
    lines = [f"{sha256(data)}  {name.removeprefix(root)}" for name, (data, _) in sorted(entries.items())]
    entries[root + "MANIFEST.sha256"] = ("\n".join(lines) + "\n").encode(), 0o644
    return entries


def write_archive(platform: str, output: Path, files: dict[str, tuple[bytes, int]]) -> None:
    if platform == WIN:
        if output.suffix.lower() != ".zip":
            raise ValueError("Windows preview must be .zip")
        with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=8) as z:
            for name, (data, mode) in sorted(files.items()):
                info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | mode) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=8)
    else:
        if not str(output).endswith(".tar.gz"):
            raise ValueError("Mac preview must be .tar.gz")
        with tarfile.open(output, "w:gz", format=tarfile.PAX_FORMAT) as t:
            for name, (data, mode) in sorted(files.items()):
                info = tarfile.TarInfo(name)
                info.size, info.mode, info.mtime = len(data), mode, 0
                info.uid = info.gid = 0
                info.uname = info.gname = ""
                t.addfile(info, io.BytesIO(data))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--platform", required=True, choices=(WIN, MAC))
    p.add_argument("--app", type=Path, required=True)
    p.add_argument("--cli", type=Path, required=True)
    p.add_argument("--app-sha256", required=True, help="SHA from original CI artifact, NOT computed by this script")
    p.add_argument("--cli-sha256", required=True, help="SHA from original CI artifact, NOT computed by this script")
    p.add_argument("--source-sha", required=True, help="40-char exact source commit SHA")
    p.add_argument("--ci-run-url", required=True)
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    if not SOURCE_RE.fullmatch(a.source_sha):
        p.error("source SHA must be exact 40 lowercase hex")
    if not a.ci_run_url.startswith("https://github.com/i-shutov/tikzarium/actions/runs/") or not a.ci_run_url.rsplit("/", 1)[-1].isdigit():
        p.error("original CI run URL required")
    app, cli = a.app.read_bytes(), a.cli.read_bytes()
    for title, data, expected in (("app", app, a.app_sha256), ("cli", cli, a.cli_sha256)):
        if not HASH_RE.fullmatch(expected) or sha256(data) != expected:
            p.error(f"{title} exact upstream SHA-256 mismatch")
        check_binary(data, a.platform)
    a.output.parent.mkdir(parents=True, exist_ok=True)
    write_archive(a.platform, a.output, make_bundle(a.platform, a.source_sha, a.ci_run_url, app, cli))
    print(f"{sha256(a.output.read_bytes())}  {a.output}")
    print("PACKAGED ONLY. Native physical GUI, installer, TeX PDF remain NOT_RUN.")


if __name__ == "__main__":
    main()
