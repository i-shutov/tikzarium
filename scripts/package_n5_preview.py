#!/usr/bin/env python3
"""Offline provenance-locked N5 portable preview packaging (NOT an installer).

Only packages two already-built native binaries. Never downloads/installs TeX,
executes input binaries, signs an application, or asserts physical GUI acceptance.
"""
from __future__ import annotations

import argparse
import hashlib
import gzip
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
LINUX = "linux-x86_64"
SOURCE_RE = re.compile(r"[0-9a-f]{40}\Z")
HASH_RE = re.compile(r"[0-9a-f]{64}\Z")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check_binary(data: bytes, platform: str, role: str | None = None) -> None:
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
        if role is not None:
            if role not in ("app", "cli"):
                raise ValueError("Unknown Windows binary role")
            optional_size = struct.unpack_from("<H", data, offset + 20)[0]
            if optional_size < 70 or offset + 24 + optional_size > len(data):
                raise ValueError("Windows PE optional header is truncated")
            subsystem = struct.unpack_from("<H", data, offset + 24 + 68)[0]
            expected = 2 if role == "app" else 3
            if subsystem != expected:
                raise ValueError(f"Windows {role} PE subsystem {subsystem}; expected {expected}")
    elif platform == LINUX:
        # Header validation is deliberately narrower than execution:
        # shared-library compatibility and an actual GUI still need real
        # target-machine checks. Reject 32-bit, big-endian, non-x86_64 and
        # relocatable/shared-library input masquerading as an executable.
        if (len(data) < 64 or data[:4] != b"\x7fELF" or
                data[4] != 2 or data[5] != 1 or data[6] != 1):
            raise ValueError("Linux x86_64 ELF: invalid ELF64 little-endian header")
        elf_type, machine, version = struct.unpack_from("<HHI", data, 16)
        if machine != 62 or version != 1 or elf_type not in (2, 3):
            raise ValueError("Linux binary must be an x86_64 ELF executable or PIE")
        # ET_DYN can also describe a shared library. An actual launchable
        # executable needs a non-zero entry point and valid program headers.
        entry, phoff = struct.unpack_from("<QQ", data, 24)
        ehsize, phentsize, phnum = struct.unpack_from("<HHH", data, 52)
        if (not entry or phoff < 64 or ehsize != 64 or phentsize < 56 or
                not phnum or phoff + phentsize * phnum > len(data)):
            raise ValueError("Linux ELF has no valid executable entry/program headers")
        if not any(struct.unpack_from("<I", data, phoff + i * phentsize)[0] == 1
                   for i in range(phnum)):
            raise ValueError("Linux ELF lacks loadable segments")
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
    if platform == WIN:
        # Windows 1.0 release pipeline: distinct end-user guidance, not the
        # shared historical Linux N5 / macOS preview README. This is still
        # an unsigned CI candidate, not the W4-accepted stable publication.
        return f"""# TikZarium — Windows 10 x64 · portable QA candidate (НЕ stable 1.0)

Источник (полный Git SHA): {sha}
Оригинальный CI-комплект: {ci_url}
Статус: неподписанный ZIP-кандидат. Физическая приёмка именно этого архива
на Windows 10 и W4 clean deploy/rollback НЕ выполнены (NOT_RUN).
Финальный GitHub release v1.0.0 не создаётся только по успешному hosted CI.

## Среда и ограничения

- Целевая проверенная конфигурация интерфейса: Windows 10 Pro x64 22H2
  (build 19045+) при масштабе 100% / 96 DPI; проверенные оригиналы
  W3-96 относились к предыдущему конкретному SHA, не к этому ZIP.
- Масштабы 125% (120 DPI) и 200% (192 DPI) перенесены после 1.0;
  их работоспособность здесь НЕ подтверждена. Composition/preedit
  IME (восточноазиатские языки) не квалифицирован.
- Для GUI требуется совместимый OpenGL 2.0+. Mesa llvmpipe
  использовался ТОЛЬКО в изолированном QA-обходе RDP и не вложен
  в этот ZIP. Если штатный OpenGL отсутствует, фиксируйте BLOCKED.
- Для PDF необходим самостоятельно установленный MiKTeX/XeLaTeX.
  TeX-пакеты, системные шрифты, Poppler и драйверы не поставляются
  и не устанавливаются скрыто. Используйте доверенные TeX-документы:
  XeLaTeX не является песочницей; shell escape не включать.
- Для соответствующего PDF preview/аудита могут потребоваться
  pdftoppm, pdfinfo, pdffonts и pdftotext из отдельно установленного Poppler.
  Русские буквы требуют шрифта с кириллическими глифами; для примера
  на проверенной Windows применялся явный fontspec Arial.
- ZIP portable — НЕ MSI/Setup.exe и НЕ подписанный установщик.
  Подпись исполняемых файлов не заявлена до проверки
  Get-AuthenticodeSignature.

## Проверка кандидата на своей Windows 10

1. До запуска проверьте целостность всего ZIP и пять вложенных файлов
   по MANIFEST.sha256, сопоставьте PROVENANCE.json с SHA выше.
2. Распакуйте архив в отдельный обычный пользовательский каталог;
   не заменяйте установленный MiKTeX и не изменяйте UAC, RDP,
   реестр, драйверы, службы или системный PATH.
3. В PowerShell из каталога Tikzarium-preview выполните:
      .\tikzarium-cli.exe doctor
   Затем запустите .\tikzarium-app.exe из реальной активной
   пользовательской сессии WinSta0/Default.
4. Проверьте F1, холст рядом с редактируемым .tex, линию,
   стрелку, прямоугольник, окружность, текстовый узел, кривую
   Безье, Undo, Save/Open и сохранность исходного .tex.
5. Для нового документа испытайте Build / Escape Cancel,
   затем Save & Build, GUI → XeLaTeX → PDF с кириллицей и формулами.
   Сверьте XeLaTeX log, отсутствие Missing character, pdfinfo,
   pdffonts (embedded/ToUnicode), pdftotext и сам PDF.
6. Для W4 отдельно проверьте чистую распаковку, GUI, повторный
   запуск, отказные пути и rollback (удалять лишь QA-каталог).
   Сохраните исходные PNG/.tex/PDF/log, манифест и хеши в
   закрытой папке; НЕ загружайте личный рабочий стол публично.

Дополнительные текущие ограничения:
https://github.com/i-shutov/tikzarium/blob/main/docs/KNOWN_ISSUES_WINDOWS_1_0_RU.md
W4 и критерии выпуска: https://github.com/i-shutov/tikzarium/issues/162

PROVENANCE.json честно описывает происхождение и непроведённые
платформенные испытания. CLI doctor/проверка PE/хешей не заменяют
физическую GUI→PDF-приёмку.
""".encode("utf-8")
    command = "./tikzarium-cli.exe doctor" if platform == WIN else "./tikzarium-cli doctor"
    launch = ("./tikzarium-app.exe" if platform == WIN
              else "./launch.sh" if platform == LINUX
              else "open ./TikZarium.app")
    linux_note = ("Linux x86_64: комплект переносимый, не AppImage/.deb и не"
                  " автономный контейнер библиотек; требуются совместимые"
                  " системные X11/Wayland/OpenGL/GLIBC и установленный"
                  " пользователем внешний XeLaTeX. launch.sh сохраняет"
                  " рабочий каталог проекта: запускайте /путь/к/Tikzarium-preview/launch.sh"
                  " из нужной папки документов, не из каталога программы.\n"
                  if platform == LINUX else "")
    return f"""# TikZarium — N5 native portable PREVIEW (не релиз)

Исходный Git commit SHA: {sha}. Оригинальные release-бинарники: {ci_url}.
Комплект **не является подписанным установщиком**, и статус Linux packaged desktop/Windows 10/M1/M4 GUI — **NOT_RUN**.

## Требования

- Linux x86_64: внешний XeLaTeX (TeX Live), системные графические библиотеки; бинарник не содержит TeX.
- Windows 10 x64: установленный самим пользователем MiKTeX/XeLaTeX.
- Windows portable: релизная проверка PE import table запрещает зависимость от внешнего VCRUNTIME/MSVCP; это не подтверждение физического запуска.
- macOS Apple Silicon M1/M4: установленный самим пользователем внешний XeLaTeX.
- Poppler (pdftoppm, pdffonts, pdftotext) нужен для соответствующих функций/проверок.
- Файл .tex требует доступный DejaVu Serif. Пользовательские шрифты и TeX в архив НЕ включены.
- Нет автоматической установки пакетов, фоновой загрузки, переключения TeX-дистрибуций.
- Linux bundle — обычный переносимый каталог, **не** .deb/AppImage и без гарантии работы на другом дистрибутиве.

## Как проверить

1. Проверьте SHA-256 всех вложений по MANIFEST.sha256 ДО запуска.
2. Настройте путь к СВОЕМУ XeLaTeX; не заменяйте MiKTeX на TeX Live ради зелёного результата.
3. Выполните {command}. Затем запустите GUI: {launch}.
4. Проведите шесть настоящих мышиных операций, оставив редактируемый .tex рядом с рисунком.
5. Проверьте Inspector/F1, шесть библиотек и пять независимых статусов, Connect/Undo/Disconnect, File Open/Save, XeLaTeX PDF, кириллицу и встроенный шрифт.
6. Сохраните реальные PNG/.tex/PDF/log с SHA-256 и отметьте физическую платформу.

{linux_note}
macOS .app здесь **unsigned/unnotarized**: Finder/Gatekeeper может ограничить запуск. Не отключайте системную безопасность глобально. Запуск в Finder, кодовая подпись, установка, масштаб Retina, IME и Unicode остаются NOT_RUN до реального Mac. Windows .zip — **portable preview**, не MSI/EXE-инсталлятор. doctor/наличие exe сами по себе не доказывают GUI или сборку PDF.

Файл PROVENANCE.json сообщает происхождение, архитектуру, хеши и только фактически выполненные проверки упаковки. Источник примера с CRLF не является доказательством компиляции.
""".encode("utf-8")


def make_bundle(platform: str, source: str, ci_url: str, app: bytes, cli: bytes) -> dict[str, tuple[bytes, int]]:
    root = "Tikzarium-preview/"
    entries: dict[str, tuple[bytes, int]] = {}
    if platform == WIN:
        check_binary(app, WIN, role="app")
        check_binary(cli, WIN, role="cli")
        entries[root + "tikzarium-app.exe"] = app, 0o644
        entries[root + "tikzarium-cli.exe"] = cli, 0o644
    elif platform == LINUX:
        entries[root + "tikzarium-app"] = app, 0o755
        entries[root + "tikzarium-cli"] = cli, 0o755
        # Resolve the bundled ELF while preserving the caller's project CWD.
        # Old cd into this (possibly read-only) bundle redirected GUI Save/PDF.
        entries[root + "launch.sh"] = (
            b'#!/bin/sh\nset -eu\n'
            b'case "$0" in\n'
            b'  /*|*/*) launcher="$0" ;;\n'
            b'  *) launcher="$(command -v "$0")" ;;\n'
            b'esac\n'
            b'bundle_dir="$(CDPATH= cd -- "$(dirname -- "$launcher")" && pwd -P)"\n'
            b'exec "$bundle_dir/tikzarium-app" "$@"\n'
        ), 0o755
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
        "physical_mac_m4": "NOT_RUN", "linux_packaged_desktop": "NOT_RUN",
        "linux_wayland": "NOT_RUN", "signed_installer": "NOT_RUN",
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
            raise ValueError("Mac/Linux preview must be .tar.gz")
        # tarfile "w:gz" embeds wall time + output filename in the gzip header.
        # Stable gzip mtime/name and tar metadata make same inputs byte-identical.
        with output.open("wb") as raw:
            with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
                with tarfile.open(fileobj=compressed, mode="w|", format=tarfile.PAX_FORMAT) as t:
                    for name, (data, mode) in sorted(files.items()):
                        info = tarfile.TarInfo(name)
                        info.size, info.mode, info.mtime = len(data), mode, 0
                        info.uid = info.gid = 0
                        info.uname = info.gname = ""
                        t.addfile(info, io.BytesIO(data))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--platform", required=True, choices=(WIN, MAC, LINUX))
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
        check_binary(data, a.platform, role=title)
    a.output.parent.mkdir(parents=True, exist_ok=True)
    write_archive(a.platform, a.output, make_bundle(a.platform, a.source_sha, a.ci_run_url, app, cli))
    print(f"{sha256(a.output.read_bytes())}  {a.output}")
    print("PACKAGED ONLY. Physical desktop launch, installer and bundle-specific GUI/PDF remain NOT_RUN.")


if __name__ == "__main__":
    main()
