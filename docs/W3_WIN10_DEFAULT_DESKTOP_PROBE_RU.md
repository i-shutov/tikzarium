# TikZarium W3: отделение CodexSandboxDesktop от интерактивного Default

## Проверенный физический блокер

На `VM-910136` (Windows 10 Pro 22H2, x64) локальный Codex нашёл настоящий TikZarium (PID `7088`, HWND `525244`, клиент 1180×680 при 96 DPI), но *вызывающий процесс Codex* исполнялся на **`CodexSandboxDesktop`**, а поток найденного окна не был подтверждён на активном `Default`. Активный `input desktop` назывался **`Default`**. Пользовательский foreground-helper правильно заблокировал операции через границу двух desktop, а capture-helper вернул `BLOCKED_CLIENT_CAPTURE_FOREIGN_FOREGROUND` **до** `PrintWindow`.

Из этого НЕ следует, что `PrintWindow` или TikZarium неисправны. Подтверждённый результат на VM — `W3 NOT_RUN`. Ветка `main` при расследовании содержала уже принятые PR #152 (scratch Build modal) и #153 (fail-closed оригинальные W3 evidence). Старый локальный checkout `57cb62e4` не включает #153; источник и EXE необходимо аттестовать отдельно.

## Безопасное разделение процессов

- **Codex внутри sandbox:** анализ кода, статические тесты и отчёты. Не пытаться переключить desktop, обходить политики песочницы, использовать Task Scheduler как канал перехода из sandbox на `Default` или автоматически повышать доступ.
- **Пользовательская интерактивная RDP-сессия `Admin`:** владелец **явно запускает** только диагностический скрипт из *обычного, неповышенного PowerShell* внутри `Default`. Запуск из консоли Codex, терминала sandbox, службы или отключённого RDP даст корректный `BLOCKED`.
- **Родной Win32 capture:** используется уже существующий `scripts/tools/qa_windows_owned_client_capture.ps1`. Он проверяет PID, session, foreground, DPI, активный input desktop и реальные клиентские пиксели; захват не содержит чтения всего рабочего стола. При сбое OpenGL/PrintWindow вернуть `BLOCKED`, не подставлять кадры и не объявлять W3 PASS.

## Важная поправка: GUI должен запускаться из реального Default

Процесс TikZarium, **порождённый командой из CodexSandboxDesktop**, может унаследовать этот изолированный desktop и не появиться в пользовательском `Default`. Скрипт имеет явно выбранное владельцем действие **`LaunchAndProbe`**: при отсутствии TikZarium на текущем Default он запускает **уже проверенный** `W3-Mesa-26.2.6\runtime\tikzarium-app.exe` с процессным llvmpipe окружением, затем ограниченно ожидает собственный HWND и проверяет геометрию. Повторной загрузки Mesa, установки TeX, изменения глобального PATH, драйверов или реестра нет. Если настоящая Default GUI-сессия не подтверждена, запуск даже не начинается. Не запускать эту команду из Codex Sandbox: это не средство перехода через границу desktop.

Уже существующий на `CodexSandboxDesktop` процесс PID 7088 не является доказательством рабочего интерактивного GUI в `Default`; он может продолжать существовать отдельно и не должен использоваться для W3. Для владельца достаточно одного обычного PowerShell, открытого непосредственно в RDP-сессии Admin.
## Этап A — read-only Default-desktop probe

**Только если уже открыт обычный, не elevated PowerShell в интерактивной RDP-сессии Admin:** убедиться, что checkout `C:\Users\Admin\source\tikzarium` обновлён из доверенного `main`, в нём есть `scripts\tools\qa_windows_owned_client_capture.ps1`, а TikZarium запущен через прежний Mesa launcher.

Запуск из доверенного локального checkout, после checkout именно этого reviewed PR или после принятия изменения в main:

```powershell
$script = "$env:USERPROFILE\source\tikzarium\scripts\workstation\windows10\Invoke-TikZarium-W3-DefaultDesktop-Probe.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -Action LaunchAndProbe
```

Для чтения ONLY диагностического скрипта (до интеграции в main) можно использовать GitHub raw URL закреплённого SHA. **Проверять ссылку и SHA перед запуском**. Режим `Probe` не запускает окна и не делает скриншоты. `LaunchAndProbe` открывает только подготовленный локальный EXE (если его нет на Default), но не меняет системные настройки, не переключает desktop, не нажимает кнопки и не захватывает изображение. Он создаёт новый каталог доказательств с JSON (десктоп, WTS, PID/HWND, geometry, SHA256 EXE), никогда не перезаписывает прежние отчёты.

- `PHYSICAL_DEFAULT_DESKTOP_GEOMETRY_PASS_NOT_W3` подтверждает только доступность настоящей клиентской геометрии из `Default`.
- `BLOCKED` означает отсутствие подходящего desktop/session/window или неверный EXE. Открыть JSON и исследовать причину. **Не менять UAC, RDP и sandbox ради этого.**

## Этап B — guarded native capture, только по положительной геометрии

Из того же обычного PowerShell при **разблокированной** сессии:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -Action Capture -ForegroundWaitSeconds 15
```

После запуска скрипта во время короткого ожидания вручную выбрать окно TikZarium через Taskbar/Alt+Tab. Если это невозможно, захват отказывается с `BLOCKED_FOREGROUND_NOT_TIKZARIUM`. Если `PrintWindow` не возвращает полные пиксели, native helper отвечает `BLOCKED_CLIENT_CAPTURE_PRINTWINDOW_FAILED` или `BLOCKED_CLIENT_CAPTURE_BLANK_OR_INCOMPLETE_PRINTWINDOW`. Никаких фальшивых PNG.

**Даже `OWNED_CLIENT_CAPTURE_PASS_NOT_W3` — это только доказательство захвата.** Для физического W3 остаются шестёрка реальных жестов, Save/Open, F1, встроенный Save & Build из PR #152, XeLaTeX PDF, Unicode/IME/DPI и исходные файлы. Финальная структура проверяется `scripts/tools/qa_w3_physical_evidence.py` из принятого PR #153; он никогда автоматически не присваивает W3 PASS.

## CI и сохранение правил безопасности

Hosted PowerShell 5.1 CI проверяет синтаксис и только *чистую* модель допуска desktop/session (нельзя принимать CodexSandboxDesktop, disconnected WTS или Session 0). Hosted runner не имеет доказательств физического `Admin`/RDP и не запускает TikZarium. Не изменять принятые `main` / системные настройки / драйверы / сеть / логины. До реального физического UI W3=NOT_RUN, W4=NO-GO. Связанный инцидент: [#154](https://github.com/i-shutov/tikzarium/issues/154).
