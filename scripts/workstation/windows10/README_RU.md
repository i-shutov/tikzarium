# TikZarium: Windows 10 Pro 22H2 x64 — проверенный Machine / канонический bootstrap без winget

> **Текущий чекпойнт: 2026-11-09.** `Machine PASS` на Windows 10 Pro x64 build 19045 (3.96 GiB RAM), физическая `User` фаза выполняется после локального исправления Rustup; полного `User PASS` и `W3 PASS` пока **нет**. В GitHub PR #150 зафиксированы исправления SHA256 и имени `rustup-init.exe`; создание пользователя/переключение под QA не требуют скачивания или распаковки ZIP в его профиле.

Дата: 9 ноября 2026. Цель: чистая испытательная Windows 10 Pro 22H2 (19045), 4 ГиБ RAM; отдельная QA-сессия по RDP. Windows Server, FlowBridge, действующие GitHub runners и политики Windows не трогаем.

## 0. Что уже выполнено и что делать НЕ надо

По журналам v3/v4 пользователь `DESKTOP-TD0FUEJ\tikzarium-qa` **уже создан**, ему задан пароль и предоставлено членство в локальной группе `Remote Desktop Users`. Не удаляйте пользователя и не меняйте пароль. В предыдущей попытке v3 установка остановилась на отсутствии `winget`. Последующий запуск **v4 `-Phase Machine` завершён успешно**: Windows 10 Pro build 19045, 3.96 GiB RAM, Git 2.56.0 (SHA256 VERIFIED), VS 2022 Build Tools, MSVC и Windows SDK x64, существующий VC++ Runtime. `-Phase User` **началась** в существующей RDP-сессии `tikzarium-qa`; ранее блокировавшие Rustup SHA и имя бинарника скорректированы в пользовательской копии; владелец сообщил, что выполнение пошло. Результат полного `User`/PDF/GUI пока не предоставлен. `PREFLIGHT v5` отдельно локально не подтверждён.

`winget` для канонического скрипта **не требуется**. Не устанавливайте Microsoft Store, Chocolatey, Python, Node.js, VS Code и другие необязательные компоненты ради первого теста.

## 1. Для свежей машины (на текущей уже НЕ выполнять)

**Для текущей машины `DESKTOP-TD0FUEJ` этот раздел пропустить:** системный этап прошёл, пользователь `tikzarium-qa` создан, под ним архив не скачивать. Команды ниже — только для чистого развёртывания в будущем. Канонический источник — `scripts/workstation/windows10/` в [PR #150](https://github.com/i-shutov/tikzarium/pull/150), после принятия PR — в `main`.

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

## 4. Пользовательская установка — tikzarium-qa (на текущей машине уже запущена)

Выйдите из RDP-сессии Admin и войдите под локальным пользователем `.\tikzarium-qa` (именно с установленным ранее паролем). Откройте обычный Windows PowerShell **без** «Запуск от имени администратора»:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1' -Phase User
# ВАЖНО: на уже подготовленной машине этот файл ещё v4 с неверным Rustup-хешем/именем.
# Если исправленная копия существует, используйте её вместо исходного файла:
# powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Documents\TikZarium-Win10-Setup-fixed.ps1" -Phase User
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

Подтверждено по пользовательскому журналу: `Machine` прошла успешно на Windows 10 Pro build 19045. Локальная копия `-Phase User` прошла `PATCH AND SYNTAX PASS`, скачанный Rustup получил `SHA256 VERIFIED`, после исправления имени бинарника владелец сообщил «так пошло». Это **не** итоговый `User PASS`; без финального лога нельзя утверждать установку Rust/MiKTeX/Poppler, PDF или W3.

## 8. Канонический набор в GitHub

Исходные файлы хранятся в `scripts/workstation/windows10/`: `TikZarium-Win10-Setup.ps1` (Machine-часть v4 фактически PASS; User-часть содержит исправленные SHA256 Rustup и имя `rustup-init.exe`), `TikZarium-Win10-PREFLIGHT.ps1` (исправление `$PSScriptRoot`), `TikZarium-Win10-Runner-OPTIONAL.ps1` (не запускать без решения владельца). Не использовать более ранние ZIP v1–v3. Рабочий `C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1` уже соответствует v4.

Новая CI-проверка запускается **только на GitHub-hosted Windows** и выполняет `Parser.ParseFile` для трёх `.ps1`, не исполняя содержимое, не меняя Windows и не обращаясь к личному runner. Это лишь синтаксическая проверка, не W3.

## WS07 — MiKTeX пакеты уже установлены, 2026-11-09

**Фактический пользовательский лог:** `xelatex --version` успешно отработал, MiKTeX Package Manager 4.10; затем `-Phase User` завершилась на `pgf: package is already installed` / `MiKTeX explicit package install failed with exit code 1`. Это ошибка повторного пакетного provisioning в первоначальном установщике, а не неисправность XeLaTeX.

**Исправлено в [PR #150](https://github.com/i-shutov/tikzarium/pull/150):** перед установкой каждого из пяти пакетов (`pgf`, `standalone`, `fontspec`, `xcolor`, `unicode-math`) вызывается `miktex --disable-installer packages info --template '{isInstalled}' <package>`. Устанавливаются только отсутствующие; после операции выполняется повторная верификация. `update-package-database` выполняется только если выявлены отсутствующие пакеты. Статус, отличный от `true` или `false`, запрещает продолжение. Добавлена отдельная hosted PowerShell 5.1 регрессия на состояния `true`, `false` и ошибочные значения без установки стороннего ПО.

**Обход для уже запущенной RDP-сессии QA:** явно проверить каждый из пяти пакетов через `packages info`, установить только отсутствующие, затем выполнить локальный исправленный `TikZarium-Win10-Setup-fixed.ps1 -Phase User -SkipTexProvision`. Данный флаг пропускает лишь повторное provision пакетов; Cargo, XeLaTeX PDF, встроенные шрифты и кириллица по-прежнему должны проверяться. Не скачивать ZIP заново под `tikzarium-qa`, не менять пользователя/права/UAC, не переустанавливать MiKTeX.

**Статус:** Windows 10 `Machine PASS`; `User IN_PROGRESS` с подтверждённым MiKTeX CLI, но без итоговых `environment.json`/PDF; физический W3 `NOT_ACCEPTED`; W4 `NO-GO`.

## Коррекция bootstrap Rustup и состояние User (2026-11-09)

Запуск `Machine` на Windows 10 Pro 22H2 x64, build 19045, 3.96 GiB RAM прошёл успешно. Под QA-пользователем первоначальный запуск `User` выявил две ошибки в установщике:

1. В эталонном SHA256 `rustup-init.exe` была опечатка: правильная контрольная сумма для x64 Rustup 1.29.3 — `38027d51d69a5d05493627a0634dbea52d6cd793c8f072d2373d3f4163eec7db` (см. официальный [winget-pkgs манифест](https://github.com/microsoft/winget-pkgs/blob/master/manifests/r/Rustlang/Rustup/1.29.3/Rustlang.Rustup.installer.yaml)). Фактическая загрузка соответствовала именно этой сумме. Проверка SHA256 **оставлена включённой**.
2. Файл `rustup-init.exe` был ошибочно записан как `tikzarium-bootstrap-rustup-1.29.3.exe`. `rustup-init` определяет режим по базовому имени `exe` и отказался запускаться с `unknown proxy name`. Новый путь в скрипте — `tikzarium-rustup-1.29.3\rustup-init.exe` (изолированная временная папка, исходное имя бинарника).

На машине уже лежит исходная копия v4 в `C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1`. Под `tikzarium-qa` не требуется скачивать и распаковывать архив; для продолжения можно скопировать этот файл в личный `Documents`, исправить указанные два значения, проверить парсером PowerShell 5.1 и повторить фазу `User`. Корректный канонический исходник после этого PR находится в репозитории, но не автоматически обновляет локальный `C:\ProgramData`.

На момент последнего сообщения пользователя «так пошло» после исправления Rustup, **Rust toolchain, MiKTeX, Poppler, сборка, PDF и физический W3 GUI ещё не подтверждены оригинальными итоговыми логами**. `PATCH AND SYNTAX PASS` и `SHA256 VERIFIED` — только промежуточные проверки. Для признания `User PASS` нужны полный вывод `-Phase User`, `environment.json` и PDF/font/Unicode audit. Для `W3` сверх того нужны физические действия с GUI.
