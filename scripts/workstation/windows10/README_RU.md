# TikZarium — ЕДИНАЯ инструкция подготовки Windows 10, QA и подключения Dot

## 10.11.2026 — актуальная физическая W3: проверка SHA исходников, EXE и Mesa перед GUI

**Интегрированные исходники:** `main` `488a9687c404f9714eecbcb8ccb4edbf97a54d89` (PR #150, #152 и #153 включены). Если Win10 Admin локально содержит более старую копию `target\\debug\\tikzarium-app.exe`, её запуск не проверяет новую версию кнопки `▶ Build`. Проверенный изолированный launcher [Invoke-TikZarium-W3-Mesa.ps1](../scripts/workstation/windows10/Invoke-TikZarium-W3-Mesa.ps1) теперь использует соседний [W3-Source-Guard.ps1](../scripts/workstation/windows10/W3-Source-Guard.ps1): до изменения QA runtime проверяет доверенную локальную main, чистое дерево, включённый PR #152 и свежесть EXE; при запуске сверяет SHA256 подготовленного EXE и всех Mesa DLL. Вновь скачивать Rust/MiKTeX/Poppler, запускать `Machine` или `CurrentUser` **не требуется**.

Команды для локального Computer Use / Dot в активном обычном medium-token `Admin` (исполняются самим локальным агентом только при доступном ему GUI/PowerShell, а не данным GitHub-чатом):

```powershell
$repo = Join-Path $env:USERPROFILE 'source\\tikzarium'
$expected = '488a9687c404f9714eecbcb8ccb4edbf97a54d89'
& 'C:\\Program Files\\Git\\cmd\\git.exe' -C $repo rev-parse HEAD
$launcher = Join-Path $repo 'scripts\\workstation\\windows10\\Invoke-TikZarium-W3-Mesa.ps1'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -Action SelfTest
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -Action PrepareAndRun -ExpectedSourceSha $expected
```

Если HEAD иной — **не делать reset/force checkout**; сначала проверить версию и согласовать ожидаемый принятый SHA. Если EXE устарел, восстановление только из доверенной локальной `main`: `cargo build --locked -j 1 -p tikzarium-app`, без системной установки. Лог `W3_RUNTIME_SOURCE_AND_DLL_SHA256_VERIFIED` подтверждает **лишь целостность QA runtime, не физический W3**. Затем на реальном GUI: `▶` на новом исходнике → модальное «Сохранение перед сборкой» → `Escape` и отсутствие файла → Save & Build в новый .tex → шесть жестов, F1, Undo/Save/Open, GUI→XeLaTeX PDF, кириллица/IME/DPI. Оригиналы проверять независимо по [W3 source/PDF/PNG contract](../plans/2026-11-10_W3_ORIGINAL_EVIDENCE_GATE.md). Полный W3, W2b и stable W4 всё ещё **NO-GO** до физической приёмки.


## Актуализация W3 после принятого исправления Build (10.11.2026)

**Текущий проверенный код:** `main` 57cb62e4b70f896eb48978da4252ec1fede6c26a, [PR #152](https://github.com/i-shutov/tikzarium/pull/152) принят, post-merge CI Windows/macOS/Linux и реальные hosted X11 GUI-тесты I61/N5 — PASS. На *новом, ещё не сохранённом* документе `▶ Build` теперь предлагает **встроенный в TikZarium** диалог «Сохранение перед сборкой»: можно отменить `Escape` без записи либо указать новый абсолютный путь `.tex`, нажать «Сохранить и собрать PDF» и проверить настоящий GUI→XeLaTeX PDF. Отсутствующий XeLaTeX или незавершённая проверка TeX теперь объясняются рядом с верхней панелью. Историческая рекомендация «сначала Ctrl+S и системный Save As» ниже относится к старой версии приложения и **не является проверкой исправленного Build**.

**Для следующего испытания Dot/Computer Use:** сначала проверить SHA исходников и исполняемого файла; старый `tikzarium-app.exe` из сборки до 57cb62e4 **не содержит** этот фикс. При необходимости в существующем профиле собрать именно доверенный `main` командой `cargo build --locked -j 1 -p tikzarium-app` без переустановки Rust/MiKTeX и без `Machine/CurrentUser`. Затем в активном окне Windows 10 нажать `▶` на новом документе, проверить появление встроенной модалки, `Escape` и отсутствие нового файла, потом создать уникальный `.tex` через кнопку модалки и проверить GUI→PDF, F1, шесть реальных жестов, Undo/Save/Open, Unicode IME, DPI, оригинальные PNG и SHA. **Admin CLI→PDF PASS не означает GUI W3 PASS.** На текущую дату физический Admin W3 не принят, Server W2b не принят, stable W4 — NO-GO. Никаких изменений RDP/UAC, драйверов, сервера, FlowBridge либо самодельных «скриншотов рабочего стола».


## 2026-11-10 — Admin: CLI PDF / кириллица / Arial **PASS**, следующий этап — GUI W3

**Фактический результат владельца на Windows 10 Pro в профиле `Admin`:** после сборки `tikzarium-app` (`Finished dev profile` за 1m59s) `tikzarium-cli.exe` успешно сгенерировал `windows-cyrillic.pdf` (**16 449 байт**, 93 зависимости, 10.8436788 с). Независимый от установки **повторный аудит уже созданного PDF** завершился `PDF_CYRILLIC_POSTFLIGHT_PASS via standard` без Cargo, MiKTeX и пересборки.

Проверки `pdftotext` во всех трёх режимах дали **UTF8=True; Точка=True; Кириллица=True**: `standard=PASS`, `raw=PASS`, `layout=PASS`. Итоговый PASS аудитора дополнительно требует встроенного Arial/ToUnicode. PDF SHA256: `5F6E894F58F546AED7A5CC7E53A615471EFC09B763663C1294BFEF2A463F9807`.

Оригинальный PDF: `C:\Users\Admin\Documents\TikZarium-QA\evidence\20261110-041404\windows-cyrillic.pdf`. Диагностический отчёт: `C:\Users\Admin\Documents\TikZarium-QA\evidence\20261110-041404\pdf-recheck-20261110-045600-4b1d438c\pdf-recheck.json`. Это **подтверждение по терминальному логу владельца**; байты PDF/JSON не загружены в GitHub и независимо здесь не перепроверены.

**Вердикт:** `Admin User environment + native Rust build = PASS`, `Admin CLI→XeLaTeX→PDF + postflight Cyrillic/Arial = PASS`. Первый вызов `Setup.ps1 -Phase CurrentUser` всё же завершился с ошибкой из-за ложного отказа старого кириллического сравнения в PS5.1. Подтверждённый дефект исходного кода — **UTF-8 без BOM при наличии кириллических литералов** — исправлен в PR #150, дополнен BOM/Unicode регрессионным тестом. Это не означает повторного запуска всего `CurrentUser`; **пользовательские приложения и PDF уже готовы**.

**Следующий gate:** `Admin GUI START = NOT_RUN`, `Admin W3 F1/6 gestures/Save/Open/IME/DPI/GUI→PDF = NOT_ACCEPTED`, `W4 stable = NO-GO`. Продолжать в **том же разблокированном сеансе `Admin`**, где локальный ChatGPT Computer Use уже умеет перечислять окна. Запустить изолированный [Mesa W3 launcher](Invoke-TikZarium-W3-Mesa.ps1) в medium-token Admin, затем поручить локальному агенту реальное взаимодействие. Старые PASS GUI в профиле `tikzarium-qa` остаются самостоятельными, не переносятся на Admin автоматически.


## 2026-11-10 — WS11: Admin Cargo/XeLaTeX PASS, аудитор кириллицы не принял PDF

### Проверка уже созданного PDF под Admin — без повторной установки и компиляции

Ни `-Phase CurrentUser`, ни Cargo, ни MiKTeX заново не запускать. Скрипт не меняет исходный PDF и сохраняет отдельный JSON с диагностикой.

```powershell
$ErrorActionPreference = 'Stop'
$source = 'https://raw.githubusercontent.com/i-shutov/tikzarium/1987a132de0e7c89043cd1dbb7c465b19f0b0faf/scripts/workstation/windows10/Audit-TikZarium-WindowsPdf.ps1'
$audit = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA\setup\Audit-TikZarium-WindowsPdf.ps1'
$pdf = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA\evidence\20261110-041404\windows-cyrillic.pdf'
Invoke-WebRequest -Uri $source -OutFile $audit -UseBasicParsing
$bytes = [IO.File]::ReadAllBytes($audit)
if ($bytes.Length -lt 3 -or $bytes[0] -ne 0xEF -or $bytes[1] -ne 0xBB -or $bytes[2] -ne 0xBF) { throw 'Auditor UTF8 BOM missing' }
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $audit -SelfTest
if ($LASTEXITCODE -ne 0) { throw 'Auditor self-test failed' }
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $audit -PdfPath $pdf
if ($LASTEXITCODE -ne 0) { throw 'PDF requires inspection of the saved pdf-recheck.json/text files' }
```

Hosted Windows PowerShell 5.1 [#42792382319](https://github.com/i-shutov/tikzarium/actions/runs/42792382319) подтвердил синтаксис/BOM и self-test, **но это ещё не проверка оригинального PDF Admin**. При неуспехе сохранить файлы из `pdf-recheck-*` и рассмотреть их; не отключать проверку кириллицы ради зелёного статуса.


Оригинальный вывод владельца из `C:\Users\Admin` на той же Win10 Pro 22H2: `tikzarium-app` нативно собран за 1m59s, CLI создал `windows-cyrillic.pdf` размером **16 449 байт**, 93 зависимости, время **10.8436788 с**; MiKTeX warning «So far, you have not checked for MiKTeX updates» не был фатальным. Только после успешной сборки `-Phase CurrentUser` остановилась в сравнении результата `pdftotext` со строками `Точка` и `Кириллица`. Оригинальные файл и `pdf-extracted.txt` остались в `Documents\TikZarium-QA\evidence\20261110-041404`.

**Обнаруженная причинная уязвимость**: GitHub `TikZarium-Win10-Setup.ps1` содержал кириллические литералы проверки в **UTF‑8 без BOM**. Windows PowerShell 5.1 на Windows с ANSI codepage может неверно декодировать сам `.ps1` при `-File`, в отличие от UTF‑8 PDF-данных. Под `tikzarium-qa` локальные патчи сохранялись через PowerShell `Set-Content -Encoding UTF8` (с BOM), что согласуется с предыдущим PASS. Это подтверждённый дефект исходной кодировки; до повторного независимого анализа *оригинального PDF Admin* нельзя однозначно заявлять, что он был единственной причиной отказа.

**Исправление в [PR #150](https://github.com/i-shutov/tikzarium/pull/150):** `Setup.ps1` сохраняется с UTF‑8 BOM; GitHub-hosted PS5.1 CI теперь проверяет реальный BOM у всех скриптов с русскими литералами. Добавлен самостоятельный [Audit-TikZarium-WindowsPdf.ps1](Audit-TikZarium-WindowsPdf.ps1): только читает готовый PDF, запускает уже установленный `pdffonts` и `pdftotext` в режимах standard/raw/layout с **строгим UTF‑8 и NFC**, фиксирует наличие обеих строк, Arial/ToUnicode, SHA256, первые кодовые точки и исходные текстовые файлы. Нет установки, Cargo, XeLaTeX, изменения исходников или PDF. Положительный результат нельзя объявлять из одного созданного PDF.

**Следующее действие:** под `Admin` один раз выполнить независимый postflight-аудит имеющегося PDF. При PASS — принять `CurrentUser` как готовую CLI/PDF среду и продолжить W3 GUI через isolated Mesa/Computer Use; при FAIL — изучить сохранённые UTF‑8 text/JSON, не менять шрифты и требования проверки вслепую. Полный W3 GUI и W4 stable остаются NO-GO.


> **Актуально 09.11.2026.** Канонические скрипты лежат **рядом с этой инструкцией**. Устаревшие архивы Win11, v1–v5, локальные одноразовые правки и предыдущие хронологические инструкции не использовать. Журнал их причин и исправлений — в [технических инцидентах](../../../docs/TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md), WS01–WS11.

## 0. Текущий результат — уже подготовленная VM

| Этап | Статус по реальным RDP-логам и скриншоту владельца |
| --- | --- |
| Windows 10 Pro 22H2 x64 build 19045; 3.96 GiB RAM | PASS |
| Непривилегированный локальный `tikzarium-qa` и RDP | PASS |
| `Machine`: Git 2.56.0, VS2022 Build Tools, MSVC, Windows SDK x64 | PASS |
| `User`: Rust 1.91.0, MiKTeX, Poppler, сборка `tikzarium-app.exe`/CLI | PASS |
| CLI → XeLaTeX → PDF с кириллицей и проверкой шрифтов | PASS по выводу установщика; независимая проверка оригинального PDF ожидает файл |
| Изолированная Mesa 26.2.6/llvmpipe и графическое окно под RDP | **GUI START PASS** по настоящему скриншоту |
| Кнопка сборки `▶` в GUI | **BLOCKED / требует диагностики**, пользователь нажал, видимого результата нет |
| Полная W3 (6 жестов, F1, Save/Open, GUI→PDF, DPI/IME) | **NOT_ACCEPTED** |
| W2b на Server, W4 stable release | Отдельные незавершённые ворота; W4 NO-GO |

**На уже работающей VM:** не повторять `Machine`, не создавать пользователя заново, не менять пароль, не переустанавливать Rust/MiKTeX, не скачивать прошлые ZIP. Перейти сразу к разделам 4–7.

## 1. Единственный поддерживаемый комплект

| Файл | Назначение и когда применять |
| --- | --- |
| [`TikZarium-Win10-PREFLIGHT.ps1`](TikZarium-Win10-PREFLIGHT.ps1) | Проверка синтаксиса PowerShell 5.1 и ОС перед чистой установкой; не устанавливает ПО. |
| [`TikZarium-Win10-Setup.ps1`](TikZarium-Win10-Setup.ps1) | `-Phase Machine` под админом; `-Phase User` под `tikzarium-qa`; `-Phase Check` для проверки. |
| [`Invoke-TikZarium-W3-Mesa.ps1`](Invoke-TikZarium-W3-Mesa.ps1) | Только QA: изолированный software OpenGL через проверенные 7zr/Mesa DLL без подмены System32 и оригинального EXE. |
| [`TikZarium-Win10-Runner-OPTIONAL.ps1`](TikZarium-Win10-Runner-OPTIONAL.ps1) | Не запускать по умолчанию: отдельная явная регистрация runner только по самостоятельному решению владельца. |
| [`tests/`](tests/) | Hosted PowerShell и негативные проверки; **не заменяют** физический W3. |

Проект: [TikZarium](https://github.com/i-shutov/tikzarium). До ревью/слияния PR #150 этот комплект находится в [черновом PR #150](https://github.com/i-shutov/tikzarium/pull/150), ветка `chore/windows10-workstation-bootstrap-20261109`. После принятия PR использовать эти же относительные пути из `main`. Не запускать произвольный код других веток на существующем серверном runner.

## 2. Чистая Windows 10: подготовка под Administrator — только если ещё не сделано

Требуется Windows 10 Pro 22H2 x64 build 19045 или совместимая Windows 11, Windows PowerShell 5.1, подключение к интернету, права локального администратора. Windows Server исключён целевым скриптом. **Windows 11 не обязательна, 4 ГиБ RAM достаточно для данной проверки (Cargo `-j 1`).**

Скачать **проверенные исходники конкретного PR** в одну папку (содержимое перед исполнением доступно для чтения в GitHub):

```powershell
$directory = Join-Path $env:USERPROFILE 'Downloads\TikZarium-Win10-Bootstrap'
New-Item -ItemType Directory -Force -Path $directory | Out-Null
$base = 'https://raw.githubusercontent.com/i-shutov/tikzarium/chore/windows10-workstation-bootstrap-20261109/scripts/workstation/windows10'
foreach ($name in @('TikZarium-Win10-PREFLIGHT.ps1','TikZarium-Win10-Setup.ps1')) {
  Invoke-WebRequest -Uri "$base/$name" -OutFile (Join-Path $directory $name) -UseBasicParsing
}
$preflight = Join-Path $directory 'TikZarium-Win10-PREFLIGHT.ps1'
$setup = Join-Path $directory 'TikZarium-Win10-Setup.ps1'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $preflight
if ($LASTEXITCODE -ne 0) { throw 'PREFLIGHT FAIL' }
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setup -Phase Machine
if ($LASTEXITCODE -ne 0) { throw 'MACHINE FAIL' }
```

Ожидается `Machine phase complete`; Git/VS/SDK устанавливаются из подписанных или SHA256-проверенных официальных источников, без `winget`. Скрипт сам копирует себя в `C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1` с ограниченными ACL, создаёт `tikzarium-qa` с введённым владельцем паролем (если его нет), включает в Remote Desktop Users без изменения политики RDP. Никогда не включать системное отключение UAC или глобальный обход безопасности.

## 3. Чистая Windows: пользовательский этап под `tikzarium-qa`

Подключиться по RDP как `.\tikzarium-qa`, открыть **обычный** PowerShell без повышения прав. **Ничего дополнительно не распаковывать в профиле QA** — скрипт уже находится в `C:\ProgramData`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1' -Phase User
if ($LASTEXITCODE -ne 0) { throw 'USER FAIL: review transcript and error' }
```

Выполняются: SHA256-проверенный `rustup-init.exe` 1.29.3 (имя бинарника **не менять**), Rust **1.91.0-x86_64-pc-windows-msvc**, пользовательский MiKTeX 25.12, обязательные пакеты `pgf`, `standalone`, `fontspec`, `xcolor`, `unicode-math` **только если отсутствуют**; Poppler 25.07.0-0; `git clone/fetch` чистого `main`; `cargo check --locked --workspace --all-targets -j 1`, CLI `doctor`, сборка app и CLI→XeLaTeX→PDF с аудитом Arial/ToUnicode/кириллицы. Скрытая докачка TeX-пакетов во время PDF-сборки не допускается.

Проверенные контрольные суммы, уже встроенные в скрипты: Rustup 1.29.3 x64 `38027d51d69a5d05493627a0634dbea52d6cd793c8f072d2373d3f4163eec7db`; Mesa 26.2.6 mingw x64 archive `da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388`; официальный standalone 7zr 26.05 `9bf582b894dfa665f852d7e9112b02290a1c303c2d95a21fcdc41ffcb03143b7`. Не отключать SHA256 validation при ошибке загрузки.


## Existing Admin on Windows 10: supported `-Phase CurrentUser`

Machine phase had already passed on the QA workstation. When ChatGPT/Codex is installed and running in the existing `Admin` profile, use the **new separate phase** (normal, non-elevated PowerShell):

```powershell
$setup = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA\setup\TikZarium-Win10-Setup.ps1'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setup -Phase CurrentUser
```

This reuses the previous `User` pipeline (Rustup 1.29.3, pinned Rust 1.91.0, per-user MiKTeX and Poppler, clean source clone/build, CLI→PDF and font+Unicode audit) but **does not require the `tikzarium-qa` account** and does not touch Machine or existing accounts. It refuses an *elevated* token, including when signed in as Admin. The observed Codex token is medium integrity, Administrator SID deny-only, so it is eligible. Existing `-Phase User` remains restricted to `tikzarium-qa` for backward compatibility.

Some Codex sandbox contexts report WMI `Get-CimInstance: Access denied` even though `cmd /c ver` and read-only CurrentVersion registry work. `Get-OsInfo` and the Mesa launcher now use a fail-closed **read-only registry fallback** for edition/build; they do not modify WMI permissions. The physical `CurrentUser` install and GUI have **not yet been run** on this Admin profile. The previous `tikzarium-qa` User/PDF PASS is not automatically transferred.

Once the build finishes, use `Invoke-TikZarium-W3-Mesa.ps1 -Action PrepareAndRun` from the same Admin profile in a normal PowerShell. The launcher accepts the medium-token Admin profile and preserves its elevated-token refusal, pinned SHA256 and private software GL.

### Готовая команда для уже существующего Admin на Windows 10 — 10.11.2026

### 2026-11-10 — WS10: повреждённый preflight в предыдущем SHA

**Подтверждённая ошибка:** скрипт `TikZarium-Win10-PREFLIGHT.ps1` из прежнего SHA `824335f5c575cb5aed79ae669aac744b4efb2bc8` имел разорванное регулярное выражение проверки `CurrentBuildNumber` и ошибочно продублированный хвост `catch`/`exit`, поэтому PowerShell 5.1 выдавал `UnexpectedToken` ещё до запуска. Ничего в системе от этого запуска не изменилось. **Нельзя больше использовать этот SHA.**

**Исправление:** восстановить preflight из уже проверенной v5 (`d995488...`), добавить только read-only fallback для WMI через реестр и проверить весь файл. Исправление в коммите `e5eb979ed8c12ffd3cd40ab5a95634cf661327a8`, расширенная hosted PS5.1 проверка (положительная имитация Win10 с `Get-CimInstance Access denied` плюс отказ Windows Server) в `c37aeb9f8962bde482e470d4378bb13f75a5429b`. До завершения соответствующей CI запрещено объявлять скрипт верифицированным.

**На существующем профиле Admin ничего переустанавливать ради WS10 не нужно:** повторно скачать **только исправленный `PREFLIGHT.ps1`** по закреплённому SHA в `Documents\TikZarium-QA\setup`, выполнить независимый `Parser.ParseFile` и только затем `PREFLIGHT`/`-Phase CurrentUser`. Основной `Setup.ps1` и optional runner из прежней загрузки сохраняются. `Machine` не запускать, существующий QA-профиль не трогать.

**Граница User:** системные Git/MSVC/Windows SDK уже установлены предыдущим `Machine`. Но пользовательские Rust/MiKTeX/Poppler из `tikzarium-qa` не обязаны быть доступны `Admin`; `CurrentUser` выполнит их проверку и при необходимости подготовит в профиле Admin. GUI и PDF под Admin пока не имеют физического PASS.


**Только обычный неповышенный PowerShell** в профиле `Admin`, не в `Run as administrator`. `Machine` не повторять. Это тот же установленный и испытанный под QA-пользователем `User` pipeline, адаптированный к существующему среднепривилегированному токену Admin; реальный итог `CurrentUser` под Admin пока не подтверждён.

```powershell
$ErrorActionPreference = 'Stop'
$version = 'c37aeb9f8962bde482e470d4378bb13f75a5429b' # verified GitHub commit, not moving branch
$base = "https://raw.githubusercontent.com/i-shutov/tikzarium/$version/scripts/workstation/windows10"
$folder = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA\setup'
New-Item -ItemType Directory -Force -Path $folder | Out-Null
foreach ($file in @('TikZarium-Win10-Setup.ps1', 'TikZarium-Win10-PREFLIGHT.ps1', 'TikZarium-Win10-Runner-OPTIONAL.ps1')) {
    Invoke-WebRequest -Uri "$base/$file" -OutFile (Join-Path $folder $file) -UseBasicParsing
}
$preflight = Join-Path $folder 'TikZarium-Win10-PREFLIGHT.ps1'
$setup = Join-Path $folder 'TikZarium-Win10-Setup.ps1'
# First check that the preflight file itself parses (previous WS10 failure).
$tokens = $null; $parseErrors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile(
    $preflight, [ref]$tokens, [ref]$parseErrors
)
if (@($parseErrors).Count -gt 0) {
    throw ('PREFLIGHT SCRIPT SYNTAX FAIL: ' + ($parseErrors | Out-String))
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; no install attempted' }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setup -Phase CurrentUser
if ($LASTEXITCODE -ne 0) { throw 'CurrentUser setup failed; inspect the generated evidence transcript' }
```

Файл `Runner-OPTIONAL.ps1` только скачивается ради проверки синтаксиса `PREFLIGHT`; он **не исполняется и не регистрирует runner**. В самом setup у источников Git, Rustup, MiKTeX и Poppler уже закреплены официальные SHA256/подписи. При сетевых ошибках проверку не отключать. `CurrentUser` ничего не копирует в ProgramData и не меняет существующие пользовательские учётные записи.

После `Physical PDF generated and audited` и `Environment report` — из того же профиля `Admin`:

```powershell
$mesa = Join-Path $folder 'Invoke-TikZarium-W3-Mesa.ps1'
Invoke-WebRequest -Uri "$base/Invoke-TikZarium-W3-Mesa.ps1" -OutFile $mesa -UseBasicParsing
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $mesa -Action PrepareAndRun
if ($LASTEXITCODE -ne 0) { throw 'Mesa GUI launch failed; inspect exact error' }
```

**Граница доказательств:** ранее GUI/CLI работали под `tikzarium-qa`; под `Admin` пока новый тест. Если агент Codex сообщает `Get-CimInstance: Access denied`, текущий скрипт использует read-only реестр `Windows NT\CurrentVersion`, не меняя права WMI. Локальное приложение ChatGPT/Codex Computer Use запускается отдельно в той же интерактивной сессии, после подтверждения разрешений владельцем.

## 4. Проверка готового окружения (на текущей VM начинать здесь)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1' -Phase Check
$repo = Join-Path $env:USERPROFILE 'source\tikzarium'
$evidence = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA\evidence\20261109-090708'
& 'C:\Program Files\Git\cmd\git.exe' -C $repo rev-parse HEAD
Get-FileHash (Join-Path $repo 'target\debug\tikzarium-app.exe') -Algorithm SHA256
Get-FileHash (Join-Path $evidence 'windows-cyrillic.pdf') -Algorithm SHA256
Get-Content (Join-Path $evidence 'environment.json') -Raw
```

**Реальное свидетельство этой VM:** `cargo build` завершился с `Finished dev profile` за 2m14s; `tikzarium-cli.exe build ... windows-cyrillic.tex` выдал PDF 16 448 байт, 93 dependencies, 11.5004974 s. Установщик напечатал `Physical PDF generated and audited`. MiKTeX warning `So far, you have not checked for MiKTeX updates` был в **успешном** stderr — не ошибка сборки, не повод менять TeX в ходе QA.

## 5. Запуск GUI под RDP: исключительно изолированная Mesa

Штатный `tikzarium-app.exe` в данном RDP окружении выдаёт `egui_glow requires opengl 2.0+`. Это окружение `eframe/glow`, а не повод переустанавливать Windows/драйверы. **Подготовить только отдельную QA-копию**, не переписывая `System32\opengl32.dll` и оригинальный бинарник:

```powershell
$url = 'https://raw.githubusercontent.com/i-shutov/tikzarium/chore/windows10-workstation-bootstrap-20261109/scripts/workstation/windows10/Invoke-TikZarium-W3-Mesa.ps1'
$script = Join-Path $env:USERPROFILE 'Documents\Invoke-TikZarium-W3-Mesa.ps1'
Invoke-WebRequest -Uri $url -OutFile $script -UseBasicParsing
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -Action PrepareAndRun
if ($LASTEXITCODE -ne 0) { throw 'MESA QA launcher failed' }
```

Скрипт берёт SHA256-проверенную Mesa 26.2.6 (~56 MB), распаковывает через SHA256-проверенный **портативный `7zr.exe`**, создаёт в `Documents\TikZarium-QA\W3-Mesa-26.2.6\runtime` копию EXE и x64 DLL, запускает с `GALLIUM_DRIVER=llvmpipe` и `LIBGL_ALWAYS_SOFTWARE=1`. После первого успеха можно повторять `-Action RunPrepared`. На текущей VM реально получено окно с русской панелью, сеткой холста, редактором .tex, вкладками и инспектором: **GUI START PASS**. Это QA workaround, не установка/обязательная зависимость конечного пользователя.

## 6. W3 GUI: кнопка ▶, Save/Open, PDF, F1 и мышь

**Текущий блокер — `▶` нажимается, но пользователь не видит эффекта.** В исходниках `crates/tikzarium-app/src/main.rs` команда Build вызывает `self.build()`: сначала завершает `tex_discovery_rx`, проверяет `xelatex`, затем **обязательно вызывает `self.save()`**. Для нового `figure.tex · новый документ` без пути `save()` открывает **родной Save As dialog** через `rfd`. Поэтому вероятны ожидание Save As, потеря фокуса/окно за RDP, TeX discovery/status или ошибка сохранения; **это гипотезы, не установленные причины**. Не чинить вслепую без воспроизведения.

**Первый минимальный ручной/агентный тест:** (1) `Ctrl+S`; (2) проследить окно «Сохранить как» (включая за основным окном), выбрать **новый** путь `Documents\TikZarium-QA\W3-physical\figure.tex`; (3) убедиться, что `Изменено` исчезло и файл существует; (4) снова `▶` или `Ctrl+Enter`; (5) открыть `Вид → Диагностика` (или значок терминала) и вкладку `PDF`; (6) сохранить статус, stderr, снимки **собственного окна**; (7) не менять исходный `.tex`, если он нужен как оригинальное свидетельство. Если никакого эффекта, фиксировать точный код состояния после клика.

После этого — шесть реальных инструментов (линия, стрелка, прямоугольник, окружность, текстовый/математический узел, Bézier), Undo, Save/Open, native dialogs, русская IME/Unicode, PDF именно **из GUI**, DPI 100/125/200% насколько доступно. Каждый пункт отдельно PASS/FAIL/NOT_RUN, оригинальный source и PDF плюс SHA256. Полный план: [W3 физический QA](../../../docs/WINDOWS_10_W3_PHYSICAL_QA_20261109_RU.md).

## 7. Dot: подключение и автономная локальная задача

1. **На самой VM** под `tikzarium-qa` установить и открыть приложение ChatGPT для Windows (подходит Windows 10 build 19045), войти в аккаунт владельца.
2. Открыть профиль Dot → **Computers → Your computer → Allow access** и подтвердить разрешение ещё раз. Оставить машину онлайн и ChatGPT открытым. Это требует **личного действия владельца**, не выполняется скриптом.
3. Дать Dot [задание с границами и критериями](../../../docs/DOT_WINDOWS10_W3_GUI_HANDOFF_RU.md). Попросить запустить **локальную Work-задачу** именно на этой VM. Если инструменты локального GUI недоступны, Dot обязан явно сообщить об этом, а не считать тест выполненным; ему разрешено провести локальный кодовый/логовый анализ и предложить одобренный способ автоматизации.
4. Не передавать Dot пароль, RDP-реквизиты, токены. Не менять RDP/UAC/системный OpenGL/драйверы; не запускать системные команды под админом, не создавать новый runner, не трогать Windows Server, FlowBridge и `main` без reviewed PR.

## 8. Что отдавать на приёмку

Оригинальные результаты хранить **локально** в `%USERPROFILE%\Documents\TikZarium-QA\`. В отчёте: Windows build, user/session, исходный SHA, SHA256 app/CLI/Mesa архивов, логи/версия XeLaTeX, исходный .tex/PDF, скриншоты окна до/после F1, после рисования, после PDF. Не переносить скриншоты RDP и секреты в публичный репозиторий без отдельной проверки. Состояние `W3 GUI START PASS` не означает успешный W3; `W4` остаётся NO-GO.

## 9. История устранённых блокеров (не повторять обходы)

В полном [журнале WS01–WS09](../../../docs/TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md): Win11-only gate при реальной Win10; синтаксис `${build}:`; отсутствие winget; `$PSScriptRoot` в параметрах; правильный Rustup SHA и имя `rustup-init.exe`; MiKTeX `pgf already installed` (исправлено пропуском установленных пакетов); OpenGL 2.0 в RDP; неподдерживаемый LZMA в tar.exe (решено verified `7zr.exe`). **Не использовать старые ZIP/скрипты и не переустанавливать Windows/TeX по этим ошибкам.**
