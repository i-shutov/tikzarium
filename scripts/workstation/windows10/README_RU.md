# TikZarium: Windows 10 Pro 22H2 x64 — установка v5 БЕЗ winget

> **Исправление v5 (9 ноября 2026).** В v4 preflight аварийно завершался при вычислении `$PSScriptRoot` в параметрах. В v5 пути к соседним скриптам вычисляются после связывания параметров. Состав установки `Machine` и `User` не менялся относительно v4. Прежде чем запускать `Machine`, проверьте `PREFLIGHT PASS`.

Дата: 9 ноября 2026. Цель: чистая испытательная Windows 10 Pro 22H2 (19045), 4 ГиБ RAM; отдельная QA-сессия по RDP. Windows Server, FlowBridge, действующие GitHub runners и политики Windows не трогаем.

## 0. Что уже выполнено и что делать НЕ надо

По журналам v3/v4 пользователь `DESKTOP-TD0FUEJ\tikzarium-qa` **уже создан**, ему задан пароль и предоставлено членство в локальной группе `Remote Desktop Users`. Не удаляйте пользователя и не меняйте пароль. В предыдущей попытке v3 установка остановилась на отсутствии `winget`. Последующий запуск **v4 `-Phase Machine` завершён успешно**: Windows 10 Pro build 19045, 3.96 GiB RAM, Git 2.56.0 (SHA256 VERIFIED), VS 2022 Build Tools, MSVC и Windows SDK x64, существующий VC++ Runtime. По состоянию на этот чекпойнт **v5 `PREFLIGHT`, `-Phase User` и W3 GUI ещё не подтверждены фактическим исполнением**.

`winget` для v4 **не требуется**. Не устанавливайте Microsoft Store, Chocolatey, Python, Node.js, VS Code и другие необязательные компоненты ради первого теста.

## 1. Получить и развернуть исправленный архив

Скачайте `TikZarium-Win10-Bootstrap-v5.zip` в `C:\Users\Admin\Downloads` на новой Windows 10.

В текущем повышенном Windows PowerShell 5.1:

```powershell
$zip = Join-Path $env:USERPROFILE 'Downloads\TikZarium-Win10-Bootstrap-v5.zip'
$folder = Join-Path $env:USERPROFILE 'Downloads\TikZarium-Win10-Bootstrap-v5'
Expand-Archive -LiteralPath $zip -DestinationPath $folder -Force
$setup = Join-Path $folder 'TikZarium-Win10-Setup.ps1'
$preflight = Join-Path $folder 'TikZarium-Win10-PREFLIGHT.ps1'
Test-Path -LiteralPath $setup
```

Последняя команда должна вывести `True`.

## 2. ОБЯЗАТЕЛЬНО: парсер PowerShell до установки

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $preflight
```

Ожидается `SYNTAX PASS` для всех `.ps1`, `OS PASS ... build 19045` и `PREFLIGHT PASS`. Сообщение `winget not found: OK` является штатным.

Preflight **ничего не устанавливает**. Это проверка синтаксиса настоящим PowerShell 5.1 на вашей машине. Если есть `PARSE ERROR`, прекращайте установку и пришлите лог.

## 3. Машинная установка — Administrator

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setup -Phase Machine
```

V4 проверит существующего `tikzarium-qa` без смены пароля; при отсутствии программ установит:

- Git for Windows 2.56.0 — официальный выпуск, фиксированный SHA256.
- Visual Studio 2022 Build Tools: `Desktop development with C++` (MSVC x64) и Windows SDK — официальный подписанный Microsoft установщик.
- Microsoft VC++ x64 Redistributable, только если ещё нет.

Повторный запуск безопасен для существующего QA-пользователя и не обнуляет профиль. Git не переустанавливается, если уже есть; VS/MSVC проверяются и дополняются при необходимости. Не включены установка/регистрация GitHub Actions runner, драйверов, OpenGL/Mesa, RDP-автоматизации и изменение UAC.

Скрипт сохраняет себя для второго этапа в `C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1` и пишет лог `C:\ProgramData\TikZariumSetup\machine-YYYYMMDD-HHMMSS.log`.

Если установщик запросил перезагрузку, перезагрузитесь и снова запустите `-Phase Machine`, убедившись, что он завершается успешно. Не переподключайте runner.

## 4. Пользовательская установка — tikzarium-qa

Выйдите из RDP-сессии Admin и войдите под локальным пользователем `.\tikzarium-qa` (именно с установленным ранее паролем). Откройте обычный Windows PowerShell **без** «Запуск от имени администратора»:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1' -Phase User
```

Устанавливает под данным пользователем:

- официальный `rustup` 1.29.3 (фиксированный SHA256) и закреплённый **Rust 1.91.0 x86_64-pc-windows-msvc**;
- приватный MiKTeX 25.12 (фиксированный SHA256) и необходимые TeX-пакеты — **явно при настройке**, не во время test build;
- Poppler 25.07.0-0 (фиксированный SHA256), `pdffonts`, `pdftotext`;
- репозиторий `i-shutov/tikzarium` из `main` с записью исходного SHA;
- `cargo check --locked`, `tikzarium-cli doctor`, сборку настоящего `tikzarium-app.exe` с одной параллельной задачей (4 GiB RAM);
- настоящий PDF из `examples/windows-cyrillic.tex`, анализ Arial/ToUnicode и кириллицы.

Исходники: `%USERPROFILE%\source\tikzarium`. Отчёт и PDF: `%USERPROFILE%\Documents\TikZarium-QA\evidence\<дата-время>`. Существующие несохранённые изменения в репозитории скрипт не стирает и не перезаписывает.

## 5. Быстрая проверка после установки

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1' -Phase Check
```

В текущей открытой RDP-сессии запускаем настоящий GUI:

```powershell
& "$env:USERPROFILE\source\tikzarium\target\debug\tikzarium-app.exe"
```

Проверяем: настоящее окно / масштаб 100, 125 и 200% (без изменения системного DPI скриптом), шесть мышиных примитивов (line, arrow, rectangle, circle, node, cubic Bézier), F1/помощь, Undo, Save/Open, кириллицу/IME, GUI → XeLaTeX → PDF.

Запуск `cargo` и генерация PDF в `User` **не являются физической GUI-приёмкой W3**. Для W3 нужны реальные действия в сеансе RDP и сохранение оригинальных артефактов.

## 6. Если появится ошибка

- Скрипт останавливается на первом нарушении, сообщает команду и код возврата, сохраняет логи.
- `FAILED: ... SHA256` — загрузка отличается от официального закреплённого выпуска. Не отключайте проверку. Пришлите лог.
- Ошибка `Visual Studio installer` — проверьте интернет/место на диске, перешлите строку и `C:\ProgramData\TikZariumSetup\machine-*.log`.
- Отсутствует `xelatex` — пришлите точную строку; не запускайте TeX как SYSTEM, не меняйте UAC.
- `cargo` не хватает памяти на 4 ГиБ — сначала проверьте лог, сборка уже работает с `-j 1`; увеличение RAM не является обязательным первым действием.
- `winget not found` не должен встречаться в v5. Если встречается, вы запустили старый скрипт из старого ZIP — проверьте путь в команде.

Нельзя передавать пароли, токены, RDP credentials или содержимое профилей целиком. Достаточно лога без секретов и `environment.json` из каталога evidence.

## 7. Проверка источников и безопасности

Для Git, Rustup, MiKTeX и Poppler файл скачивается по HTTPS и перед запуском/распаковкой сравнивается с зафиксированным SHA256; VS Build Tools и VC Runtime скачиваются по официальным URL Microsoft и проверяются через Authenticode. Пакеты MiKTeX ставятся отдельным, видимым действием, а во время рабочего PDF-теста должны оставаться запрещёнными скрытые загрузки и shell-escape. `winget`, Store, Chocolatey и сторонние менеджеры пакетов не нужны.

Подтверждено по пользовательскому журналу: основная фаза `Machine` из комплекта v4/v5 прошла успешно на Windows 10 Pro build 19045. `PREFLIGHT` из v5 и фаза `User` ещё не подтверждены исполнением; до этих испытаний нельзя объявлять W3 PASS.

## 8. Канонический набор в GitHub

Исходные файлы хранятся в `scripts/workstation/windows10/`: `TikZarium-Win10-Setup.ps1` (v4, фактический Machine PASS), `TikZarium-Win10-PREFLIGHT.ps1` (v5, исправление `$PSScriptRoot`), `TikZarium-Win10-Runner-OPTIONAL.ps1` (не запускать без решения владельца). Не использовать более ранние ZIP v1–v3. Рабочий `C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1` уже соответствует v4.

Новая CI-проверка запускается **только на GitHub-hosted Windows** и выполняет `Parser.ParseFile` для трёх `.ps1`, не исполняя содержимое, не меняя Windows и не обращаясь к личному runner. Это лишь синтаксическая проверка, не W3.
