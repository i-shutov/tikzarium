# TikZarium — ЕДИНАЯ инструкция подготовки Windows 10, QA и подключения Dot

> **Актуально 09.11.2026.** Канонические скрипты лежат **рядом с этой инструкцией**. Устаревшие архивы Win11, v1–v5, локальные одноразовые правки и предыдущие хронологические инструкции не использовать. Журнал их причин и исправлений — в [технических инцидентах](../../../docs/TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md), WS01–WS09.

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
