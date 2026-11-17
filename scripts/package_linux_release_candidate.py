#!/usr/bin/env python3
"""Build a deterministic Linux 1.0 *candidate* from original exact-head ELF files.

Never build binaries, download TeX/fonts or claim physical desktop acceptance.
The historical RC label is retained for packaging compatibility. Full Scientific
Studio acceptance and owner GO are required; Linux R4/R5 alone are insufficient.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import package_n5_preview as n5

RC_RE = re.compile(r"1\.0\.0-rc\.[1-9][0-9]*\Z")


def guide(version: str, source: str, ci_url: str) -> bytes:
    return f"""# TikZarium {version}: Linux x86_64/X11

ЭТО RELEASE CANDIDATE, НЕ ФИНАЛЬНЫЙ РЕЛИЗ 1.0.
Историческое имя RC сохранено для совместимости упаковки; оно не означает
приёмку Scientific Studio, новую версию или разрешение публикации stable.
Исходный SHA: {source}
Exact-head CI: {ci_url}
Физический Ubuntu 24.04/X11 с настоящим монитором: R4 NOT_RUN.

## Необходимые внешние компоненты

Пользователь самостоятельно устанавливает XeLaTeX/TeX Live, PGF/TikZ,
Poppler (pdftoppm, pdfinfo; для проверки pdffonts, pdftotext), необходимые
шрифты (например, DejaVu Serif) и совместимые системные X11/OpenGL/GLIBC
библиотеки. Для нативных диалогов нужен XDG/GTK file portal.
TikZarium не содержит TeX, Poppler, частные шрифты или установщик.
Нет скрытой установки пакетов, shell escape по умолчанию выключен.
Приложение не предоставляет изолированную среду выполнения.

## Первый запуск и контроль подлинности

1. Сверить SHA256 самого архива с опубликованным rc-archive.sha256.
2. Распаковать архив и войти в папку Tikzarium-{version}.
3. Выполнить sha256sum -c MANIFEST.sha256: каждая строка должна пройти.
4. Проверить xelatex --version, pdftoppm -v и fc-match 'DejaVu Serif'.
5. Выполнить ./tikzarium-cli doctor для диагностики внешнего XeLaTeX.
6. В отдельной записываемой папке проекта запустить полный путь к
   Tikzarium-{version}/launch.sh; он сохраняет текущий каталог пользователя.

## Проверка редактора

Шесть жестов line/arrow/rectangle/circle/node/Bezier изменяют обычный
редактируемый .tex рядом с canvas; Inspector/Libraries/F1 дают русскую
помощь, Connect/Disconnect и Undo меняют исходник явно и обратимо.
Open/Save As/Export используют native XDG file picker при установленном
портале, иначе доступен ручной ввод пути. Сохраняйте файл с новым именем,
проверяйте Unicode-путь, CRLF и безопасность отказа перезаписи.
Build использует ТОЛЬКО внешний XeLaTeX: точен PDF, не overlay canvas.
Для PDF проверьте кириллицу через pdftotext и embedded fonts через pdffonts.
Закрывая изменённый файл, проверьте Save/Discard/Cancel.

## Ограничения

Это portable tar.gz, НЕ .deb/AppImage, не гарантия ABI совместимости с
другими дистрибутивами. Нативный Wayland, Windows и macOS физически
не квалифицированы. Макро-зависимые неизвестные состояния отображаются
как UNKNOWN. Никакого общего интерпретатора TeX/CAS/solver/CAD.
Физический Linux/X11 R4 остаётся отдельной проверкой. Одного R4 недостаточно
для Scientific Studio v1.0: обязательны SCI142/103, научные AI88, PGFPlots
SC3/AT4, принятые операции Asymptote и Typst/CeTZ, UX-F01–F14/G3,
source fidelity, Windows W0–W4, настоящий IME и 96/120/192 DPI.
Все результаты привязаны к точному исходнику, операции и платформе.
Полный научный scope НЕ ПРИНЯТ, release/merge/stable GO НЕ ВЫДАН.
Нормативный scope: docs/RELEASE_SCOPE_SCIENTIFIC_STUDIO_1_0_RU.md.
Исторический Linux-реестр: https://github.com/i-shutov/tikzarium/issues/103
Инструкция R4: docs/LINUX_1_0_PHYSICAL_QA_RU.md в исходном репозитории.
""".encode("utf-8")


def make_rc(version: str, source: str, ci_url: str, app: bytes, cli: bytes):
    if not RC_RE.fullmatch(version):
        raise ValueError("Only historical 1.0.0-rc.N candidate labels allowed; scientific release GO is absent")
    if not n5.SOURCE_RE.fullmatch(source):
        raise ValueError("Exact 40-character source SHA required")
    n5.check_binary(app, n5.LINUX)
    n5.check_binary(cli, n5.LINUX)
    old = n5.make_bundle(n5.LINUX, source, ci_url, app, cli)
    prefix = "Tikzarium-preview/"
    target = f"Tikzarium-{version}/"
    entries = {target + name.removeprefix(prefix): item
               for name, item in old.items() if name.startswith(prefix)}
    entries[target + "README_RU.md"] = guide(version, source, ci_url), 0o644
    provenance = json.loads(entries[target + "PROVENANCE.json"][0])
    provenance.update({
        "schema_version": 2,
        "product": "TikZarium",
        "version": version,
        "release_stage": "CANDIDATE_NOT_FINAL",
        "release_go": False,
        "scientific_studio_scope": "NOT_ACCEPTED",
        "release_scope_document": "docs/RELEASE_SCOPE_SCIENTIFIC_STUDIO_1_0_RU.md",
        "historical_rc_label": True,
        "physical_linux_x86_64_x11": "NOT_RUN",
        "gtk_xdg_picker_physical": "NOT_RUN",
        "qualified_platform": "Ubuntu 24.04 x86_64/X11 (TARGET_NOT_YET_ACCEPTED)",
    })
    entries[target + "PROVENANCE.json"] = (
        json.dumps(provenance, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    ).encode("utf-8"), 0o644
    entries.pop(target + "MANIFEST.sha256")
    lines = [f"{n5.sha256(data)}  {name.removeprefix(target)}"
             for name, (data, _mode) in sorted(entries.items())]
    entries[target + "MANIFEST.sha256"] = ("\n".join(lines) + "\n").encode(), 0o644
    return entries


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--version", default="1.0.0-rc.1")
    p.add_argument("--app", type=Path, required=True)
    p.add_argument("--cli", type=Path, required=True)
    p.add_argument("--app-sha256", required=True)
    p.add_argument("--cli-sha256", required=True)
    p.add_argument("--source-sha", required=True)
    p.add_argument("--ci-run-url", required=True)
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    if not RC_RE.fullmatch(a.version):
        p.error("Only historical candidates 1.0.0-rc.N accepted; no stable label without full scientific acceptance and owner GO")
    if not n5.SOURCE_RE.fullmatch(a.source_sha):
        p.error("Source SHA must be exact lowercase 40-hex")
    if (not a.ci_run_url.startswith("https://github.com/i-shutov/tikzarium/actions/runs/")
            or not a.ci_run_url.rsplit("/", 1)[-1].isdigit()):
        p.error("Original GitHub Actions run URL required")
    app, cli = a.app.read_bytes(), a.cli.read_bytes()
    for name, data, expected in (("app", app, a.app_sha256), ("cli", cli, a.cli_sha256)):
        if not n5.HASH_RE.fullmatch(expected) or n5.sha256(data) != expected:
            p.error(f"{name} upstream SHA256 mismatch")
    a.output.parent.mkdir(parents=True, exist_ok=True)
    n5.write_archive(n5.LINUX, a.output, make_rc(a.version, a.source_sha, a.ci_run_url, app, cli))
    print(f"{n5.sha256(a.output.read_bytes())}  {a.output}")
    print("HISTORICAL CANDIDATE ONLY. Full Scientific Studio NOT_ACCEPTED; release GO absent; physical Linux/X11 R4 NOT_RUN.")


if __name__ == "__main__":
    main()
