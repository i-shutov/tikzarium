#!/usr/bin/env bash
# TikZarium Linux 1.0 — offline X11 workstation preflight.
# This does not certify a physical desktop; manual original GUI/TeX/PDF review
# on a real monitor remains mandatory. No network, install, sudo or TeX execution.
set -euo pipefail

if (( $# != 1 )); then
  printf 'Usage: %s /path/to/NEW-evidence-directory\n' "$0" >&2
  exit 64
fi
if [[ -e "$1" ]]; then
  printf 'Refusing an existing evidence path: %s\n' "$1" >&2
  exit 73
fi
mkdir -m 700 -- "$1"
out="$(cd -- "$1" && pwd -P)"
bundle="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
if [[ ! -f "$bundle/MANIFEST.sha256" || ! -x "$bundle/launch.sh" ]]; then
  printf 'Run from the extracted Tikzarium-preview/qa folder.\n' >&2
  exit 65
fi
(
  cd -- "$bundle"
  sha256sum -c MANIFEST.sha256
) >"$out/manifest-verification.txt" 2>&1 || {
  printf 'Bundle SHA verification failed: %s\n' "$out/manifest-verification.txt" >&2
  exit 66
}
{
  printf 'R4_STATUS=MANUAL_DESKTOP_ACCEPTANCE_PENDING\n'
  printf 'PHYSICAL_HOST_ATTESTATION=NOT_AUTOMATICALLY_VERIFIED\n'
  printf 'SESSION_TYPE=%s\n' "${XDG_SESSION_TYPE:-UNSET}"
  printf 'DISPLAY=%s\n' "${DISPLAY:-UNSET}"
  printf 'DESKTOP=%s\n' "${XDG_CURRENT_DESKTOP:-UNSET}"
  printf 'WAYLAND_DISPLAY_PRESENT=%s\n' "$( [[ -n "${WAYLAND_DISPLAY:-}" ]] && echo yes || echo no )"
  printf 'SCALE_OVERRIDE=%s\n' "${WINIT_X11_SCALE_FACTOR:-UNSET}"
  printf 'ARCH=%s\n' "$(uname -m)"
  if [[ -r /etc/os-release ]]; then
    . /etc/os-release
    printf 'OS=%s\n' "${PRETTY_NAME:-UNKNOWN}"
  fi
  printf 'APP_SHA256=%s\n' "$(sha256sum "$bundle/tikzarium-app" | cut -d' ' -f1)"
  printf 'CLI_SHA256=%s\n' "$(sha256sum "$bundle/tikzarium-cli" | cut -d' ' -f1)"
} >"$out/system.txt"
cp -- "$bundle/PROVENANCE.json" "$out/package-provenance.json"
{
  for command_name in xelatex kpsewhich pdftoppm pdffonts pdftotext pdfinfo fc-match xrandr xdpyinfo; do
    if command -v "$command_name" >/dev/null 2>&1; then
      printf '%s=%s\n' "$command_name" "$(command -v "$command_name")"
    else
      printf '%s=MISSING\n' "$command_name"
    fi
  done
  if command -v xelatex >/dev/null 2>&1; then xelatex --version | head -n 2 || true; fi
  if command -v pdftoppm >/dev/null 2>&1; then pdftoppm -v 2>&1 | head -n 1 || true; fi
  if command -v fc-match >/dev/null 2>&1; then fc-match 'DejaVu Serif' | head -n 1 || true; fi
  if command -v xrandr >/dev/null 2>&1; then xrandr --current 2>&1 || true; fi
} >"$out/prerequisites-and-display.txt"

cat >"$out/R4_MANUAL_ACCEPTANCE.md" <<'CHECKLIST'
# TikZarium 1.0 — физическая Linux/X11 приёмка

Статус: **NOT_RUN до независимого ручного подтверждения**. Скрипт проверяет
контрольные суммы и записывает свойства окружения. Он НЕ подтверждает физический
монитор/GUI, нативные XDG-диалоги или PDF. Xvfb/CI не считаются R4.

- [ ] Ubuntu 24.04, физический x86_64 компьютер/монитор, нативный X11,
      фактическое разрешение и DPI подтверждены без принудительного override.
- [ ] Архив взят из exact-SHA GitHub Actions; SHA256 архива и MANIFEST совпадают.
- [ ] launch.sh стартует из доступного для записи каталога проекта без sudo.
- [ ] GTK/XDG Open, Cancel, Save As, PDF Export; Unicode-путь и защита перезаписи.
- [ ] Шесть реальных жестов, холст + редактируемый .tex, свойства, библиотеки,
      русская F1 и пять независимых статусов/UNKNOWN.
- [ ] Undo/Save/Open, dirty-close Save/Discard/Cancel; CRLF/comments/macros
      сохранены; побайтовые сравнения приложены.
- [ ] Только внешний user-installed XeLaTeX без shell escape; PDF/preview,
      pdffonts показывает встроенные шрифты, pdftotext извлекает кириллицу.
- [ ] Основные controls/status не обрезаны на реальном дисплее/масштабе.
- [ ] Оригинальные PNG/.tex/PDF/log/версии/команды/SHA256 сохранены.
- [ ] Независимая ручная проверка UX и известных ограничений выполнена.

Только независимое ручное подтверждение оригинальных материалов физической
машины позволяет назначить статус R4 PASS.
CHECKLIST
if [[ "${XDG_SESSION_TYPE:-}" != x11 || -z "${DISPLAY:-}" || "$(uname -m)" != x86_64 ]]; then
  printf 'Preflight recorded, but native X11/x86_64 not detected: %s\n' "$out" >&2
  exit 78
fi
printf 'Preflight saved to %s. R4 remains MANUAL_PENDING.\n' "$out"
