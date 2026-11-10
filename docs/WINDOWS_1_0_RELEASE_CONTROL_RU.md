# Windows 1.0 — релизный контроль TikZarium (GO / NO-GO)

**Релизная подготовка по настоящему Windows x64 portable-кандидату:** [единый план и проверенные SHA](RELEASE_PREP_WINDOWS_1_0_20261110_RU.md), [черновик release notes](RELEASE_NOTES_WINDOWS_1_0_DRAFT_RU.md), [машинный manifest кандидата](../release/candidates/windows10-x64-main-488a9687.json). Наличие этих материалов **не меняет** W2b/W3/W4 GO/NO-GO до независимой физической приёмки.


## Актуализация W3 после принятого исправления Build (10.11.2026)

**Текущий проверенный код:** `main` 57cb62e4b70f896eb48978da4252ec1fede6c26a, [PR #152](https://github.com/i-shutov/tikzarium/pull/152) принят, post-merge CI Windows/macOS/Linux и реальные hosted X11 GUI-тесты I61/N5 — PASS. На *новом, ещё не сохранённом* документе `▶ Build` теперь предлагает **встроенный в TikZarium** диалог «Сохранение перед сборкой»: можно отменить `Escape` без записи либо указать новый абсолютный путь `.tex`, нажать «Сохранить и собрать PDF» и проверить настоящий GUI→XeLaTeX PDF. Отсутствующий XeLaTeX или незавершённая проверка TeX теперь объясняются рядом с верхней панелью. Историческая рекомендация «сначала Ctrl+S и системный Save As» ниже относится к старой версии приложения и **не является проверкой исправленного Build**.

**Для следующего испытания Dot/Computer Use:** сначала проверить SHA исходников и исполняемого файла; старый `tikzarium-app.exe` из сборки до 57cb62e4 **не содержит** этот фикс. При необходимости в существующем профиле собрать именно доверенный `main` командой `cargo build --locked -j 1 -p tikzarium-app` без переустановки Rust/MiKTeX и без `Machine/CurrentUser`. Затем в активном окне Windows 10 нажать `▶` на новом документе, проверить появление встроенной модалки, `Escape` и отсутствие нового файла, потом создать уникальный `.tex` через кнопку модалки и проверить GUI→PDF, F1, шесть реальных жестов, Undo/Save/Open, Unicode IME, DPI, оригинальные PNG и SHA. **Admin CLI→PDF PASS не означает GUI W3 PASS.** На текущую дату физический Admin W3 не принят, Server W2b не принят, stable W4 — NO-GO. Никаких изменений RDP/UAC, драйверов, сервера, FlowBridge либо самодельных «скриншотов рабочего стола».


## 2026-11-10 — Admin: CLI PDF / кириллица / Arial **PASS**, следующий этап — GUI W3

**Фактический результат владельца на Windows 10 Pro в профиле `Admin`:** после сборки `tikzarium-app` (`Finished dev profile` за 1m59s) `tikzarium-cli.exe` успешно сгенерировал `windows-cyrillic.pdf` (**16 449 байт**, 93 зависимости, 10.8436788 с). Независимый от установки **повторный аудит уже созданного PDF** завершился `PDF_CYRILLIC_POSTFLIGHT_PASS via standard` без Cargo, MiKTeX и пересборки.

Проверки `pdftotext` во всех трёх режимах дали **UTF8=True; Точка=True; Кириллица=True**: `standard=PASS`, `raw=PASS`, `layout=PASS`. Итоговый PASS аудитора дополнительно требует встроенного Arial/ToUnicode. PDF SHA256: `5F6E894F58F546AED7A5CC7E53A615471EFC09B763663C1294BFEF2A463F9807`.

Оригинальный PDF: `C:\Users\Admin\Documents\TikZarium-QA\evidence\20261110-041404\windows-cyrillic.pdf`. Диагностический отчёт: `C:\Users\Admin\Documents\TikZarium-QA\evidence\20261110-041404\pdf-recheck-20261110-045600-4b1d438c\pdf-recheck.json`. Это **подтверждение по терминальному логу владельца**; байты PDF/JSON не загружены в GitHub и независимо здесь не перепроверены.

**Вердикт:** `Admin User environment + native Rust build = PASS`, `Admin CLI→XeLaTeX→PDF + postflight Cyrillic/Arial = PASS`. Первый вызов `Setup.ps1 -Phase CurrentUser` всё же завершился с ошибкой из-за ложного отказа старого кириллического сравнения в PS5.1. Подтверждённый дефект исходного кода — **UTF-8 без BOM при наличии кириллических литералов** — исправлен в PR #150, дополнен BOM/Unicode регрессионным тестом. Это не означает повторного запуска всего `CurrentUser`; **пользовательские приложения и PDF уже готовы**.

**Следующий gate:** `Admin GUI START = NOT_RUN`, `Admin W3 F1/6 gestures/Save/Open/IME/DPI/GUI→PDF = NOT_ACCEPTED`, `W4 stable = NO-GO`. Продолжать в **том же разблокированном сеансе `Admin`**, где локальный ChatGPT Computer Use уже умеет перечислять окна. Запустить изолированный [Mesa W3 launcher](../scripts/workstation/windows10/Invoke-TikZarium-W3-Mesa.ps1) в medium-token Admin, затем поручить локальному агенту реальное взаимодействие. Старые PASS GUI в профиле `tikzarium-qa` остаются самостоятельными, не переносятся на Admin автоматически.


## 2026-11-10 — WS11: Admin Cargo/XeLaTeX PASS, аудитор кириллицы не принял PDF

Оригинальный вывод владельца из `C:\Users\Admin` на той же Win10 Pro 22H2: `tikzarium-app` нативно собран за 1m59s, CLI создал `windows-cyrillic.pdf` размером **16 449 байт**, 93 зависимости, время **10.8436788 с**; MiKTeX warning «So far, you have not checked for MiKTeX updates» не был фатальным. Только после успешной сборки `-Phase CurrentUser` остановилась в сравнении результата `pdftotext` со строками `Точка` и `Кириллица`. Оригинальные файл и `pdf-extracted.txt` остались в `Documents\TikZarium-QA\evidence\20261110-041404`.

**Обнаруженная причинная уязвимость**: GitHub `TikZarium-Win10-Setup.ps1` содержал кириллические литералы проверки в **UTF‑8 без BOM**. Windows PowerShell 5.1 на Windows с ANSI codepage может неверно декодировать сам `.ps1` при `-File`, в отличие от UTF‑8 PDF-данных. Под `tikzarium-qa` локальные патчи сохранялись через PowerShell `Set-Content -Encoding UTF8` (с BOM), что согласуется с предыдущим PASS. Это подтверждённый дефект исходной кодировки; до повторного независимого анализа *оригинального PDF Admin* нельзя однозначно заявлять, что он был единственной причиной отказа.

**Исправление в [PR #150](https://github.com/i-shutov/tikzarium/pull/150):** `Setup.ps1` сохраняется с UTF‑8 BOM; GitHub-hosted PS5.1 CI теперь проверяет реальный BOM у всех скриптов с русскими литералами. Добавлен самостоятельный [Audit-TikZarium-WindowsPdf.ps1](../scripts/workstation/windows10/Audit-TikZarium-WindowsPdf.ps1): только читает готовый PDF, запускает уже установленный `pdffonts` и `pdftotext` в режимах standard/raw/layout с **строгим UTF‑8 и NFC**, фиксирует наличие обеих строк, Arial/ToUnicode, SHA256, первые кодовые точки и исходные текстовые файлы. Нет установки, Cargo, XeLaTeX, изменения исходников или PDF. Положительный результат нельзя объявлять из одного созданного PDF.

**Следующее действие:** под `Admin` один раз выполнить независимый postflight-аудит имеющегося PDF. При PASS — принять `CurrentUser` как готовую CLI/PDF среду и продолжить W3 GUI через isolated Mesa/Computer Use; при FAIL — изучить сохранённые UTF‑8 text/JSON, не менять шрифты и требования проверки вслепую. Полный W3 GUI и W4 stable остаются NO-GO.


## 2026-11-10 — existing Admin profile on Windows 10: CurrentUser bootstrap candidate

Владелец подтвердил, что ChatGPT установлен в профиле `VM-910136\admin` на Windows 10 Pro 22H2 x64 build `19045.4412`. Локальные команды `hostname` и `whoami` выполнились, но `Get-CimInstance Win32_OperatingSystem` в изолированном Codex процессе вернул `Access denied` (medium integrity, Administrator SID `deny-only`). Computer Use смог перечислить окна (пока только ChatGPT), а `tikzarium-app.exe` в текущем профиле не найден. Это **не** отказ системы и не основание менять WMI/UAC.

В [PR #150](https://github.com/i-shutov/tikzarium/pull/150) добавлен явный `-Phase CurrentUser`: те же проверенные Rustup/MiKTeX/Poppler/CLI+PDF шаги, но в текущем непривилегированном процессе под существующим Admin. Старый `-Phase User` для `tikzarium-qa` сохранён, `-Phase Machine` повторять нельзя. Для ОС/версии есть read-only fallback реестра, без WMI ACL. Mesa launcher также поддерживает medium token Admin и read-only registry check. Отдельный hosted PS5.1 статический тест проверяет маршрут и отсутствие требуемого `tikzarium-qa` для `CurrentUser`.

**Статус:** схема успешно испытана под `tikzarium-qa` на физическом Windows10 до GUI start; аналогичный путь под `Admin` — **CANDIDATE / NOT_RUN** до реального запуска. Старое подтверждение W3 GUI START под QA-профилем не переносить автоматически. Для работы Computer Use требуется открыть TikZarium именно в текущем интерактивном профиле Admin, затем воспроизвести Build, F1, мышь, Save/Open и GUI→PDF. Всё выполнять только с разрешением владельца и без прямого изменения `main`.


## 2026-11-09 — W3 физическая Windows 10: нативное GUI-окно появилось через изолированную Mesa

**Новое оригинальное визуальное свидетельство от владельца в RDP-сеансе `tikzarium-qa`:** после SHA-проверенной Mesa 26.2.6 и распаковки через 7zr виден работающий процесс `TikZarium` с настоящим окном. На скриншоте одновременно присутствуют верхнее меню/панель инструментов, вкладки `Эскиз`/`PDF`, редактируемый текст обычного `.tex` в левой колонке (quickstart), сетка холста в центре, правая панель `Свойства`/`Библиотеки`/`Справка`, русские подписи и состояние `Изменено`. Прежний `OpenGL(PainterError("egui_glow requires opengl 2.0+. "))` перестал блокировать создание окна при изолированном пользовательском запуске. **Никаких подтверждений F1, редакторской операции мышью, Save/Open, GUI→PDF или DPI200 из одного скриншота нет.**

**Вердикт:** `W3-GUI-START = PASS (визуальное подтверждение, screenshot from owner conversation)`; `W3-INTERACTION = NOT_RUN`, `W3-GUI→XeLaTeX = NOT_RUN`, `W3-OVERALL = IN_PROGRESS / NOT_ACCEPTED`, `W4 = NO-GO`. Изолированная software GL — **QA runtime workaround**, не свойство распространяемого installer/portable ZIP. На снимке видна панель задач поверх нижней границы GUI, поэтому полный клиентский прямоугольник/панель статуса и покрытие разных DPI ещё не подтверждены.

**Доказательства:** первичная Win10 CLI-генерация PDF находится локально в `Documents\TikZarium-QA\evidence\20261109-090708`; исходное GUI screenshot предоставлено владельцем в чате, **не выгружено в публичный GitHub** (возможные детали RDP/рабочего стола). Для окончательного W3 требуется отдельный оригинальный набор: физическое F1 before/after, 6 жестов, .tex до/после, Undo/Save/Open, кириллица/IME, GUI→PDF, независимый SHA/fonts и снимки полного окна. Следующий тест — [W3 runbook](WINDOWS_10_W3_PHYSICAL_QA_20261109_RU.md).


## 2026-11-09 — WS09: штатный Windows 10 tar.exe не поддерживает LZMA из Mesa .7z

Фактический RDP лог: Mesa 26.2.6 скачана правильно, SHA256 проверен (`da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388`), но распаковка встроенным `tar.exe` завершилась `LZMA codec is unsupported` (exit 1). Архив не поврежден. Ошибка вызвана неверным предположением о возможностях штатного архиватора Win10.

Исправлено в кандидатном [PR #150](https://github.com/i-shutov/tikzarium/pull/150): W3 launcher использует портативный `7zr.exe` из официального выпуска `ip7z/7zip` 26.05 с закрепленным SHA256 `9bf582b894dfa665f852d7e9112b02290a1c303c2d95a21fcdc41ffcb03143b7`. Дополнительная CRC-проверка 7z предшествует распаковке. Уже проверенная загрузка Mesa (~56 МБ) переиспользуется, временные неполные результаты `tar.exe` очищаются только внутри `Documents/TikZarium-QA/W3-Mesa-26.2.6/unpacked` и не касаются исходного EXE, System32 или реестра. Изолированное программное OpenGL по-прежнему кандидат до физического GUI испытания.

В hosted Windows добавлена проверка реальной распаковки pinned Mesa через pinned 7zr с подтверждением `x64/opengl32.dll` и `libgallium_wgl.dll`. **Пока CI или локальный GUI не подтвердят результат, W3 BLOCKED/NOT_ACCEPTED, а не PASS**. Локальный обход: отдельно скачать 7zr.exe, проверить SHA256, `7zr t` и `7zr x` для уже скачанного Mesa и повторить `-Action PrepareAndRun`.


## 2026-11-09 — W3 GUI OpenGL 2.0 blocker under RDP (new WS08)

**Actual owner trace after fully successful User/CLI PDF:** launching `target\debug\tikzarium-app.exe` under non-admin `tikzarium-qa` exited `Error: OpenGL(PainterError("egui_glow requires opengl 2.0+. "))`. Root of practical limitation: `eframe 0.33.3` is built with the `glow` renderer and the active RDP OpenGL context cannot meet minimum 2.0; the physical W3 interface was **NOT RUN**.

**Canonical QA workaround (candidate, not yet physically verified):** [isolated software OpenGL launcher](../scripts/workstation/windows10/Invoke-TikZarium-W3-Mesa.ps1). It downloads SHA256-pinned Mesa3D 26.2.6 x64 MinGW artifact (GitHub upstream pal1000), verifies digest, uses SHA256-pinned standalone `7zr.exe` for `.7z`, and stages a **copy** of native `tikzarium-app.exe` plus x64 Mesa DLLs only under `Documents\TikZarium-QA\W3-Mesa-26.2.6\runtime`. The launcher scopes `GALLIUM_DRIVER=llvmpipe`, `LIBGL_ALWAYS_SOFTWARE=1` and `PATH` to the child, does not replace system or `target\debug` OpenGL DLLs, drivers, registry or UAC. Two initial valid outcomes: software GL GUI really opens (then proceed with six gestures/F1/Save/Open/GUI→PDF); or launcher shows actual new error (record and diagnose, **do not** infer GUI PASS).

Independent source: official [Mesa llvmpipe Windows DLL-local usage](https://docs.mesa3d.org/drivers/llvmpipe.html) and [Windows tar 7z support](https://learn.microsoft.com/en-us/windows/tar/). The upstream package has a fixed SHA256 already validated in TikZarium QA transport. **No runtime W3 evidence from this launcher yet**.
## 2026-11-09 — Win10 physical workstation: **Machine PASS / User PASS / CLI PDF PASS**, GUI W3 NOT_RUN

Новое **подтверждение по выводу пользователя из RDP**: `tikzarium-qa` на Windows 10 Pro 22H2 x64 build 19045, 3.96 GiB RAM. В ходе `-Phase User` успешно выполнена нативная сборка `tikzarium-core`, `tikzarium-extensions`, `tikzarium-app` (`cargo build --locked -j 1`, `Finished dev profile ... 2m14s`) и настоящий `tikzarium-cli.exe build` для `examples/windows-cyrillic.tex`. Внешний MiKTeX XeLaTeX создал `windows-cyrillic.pdf` **16 448 bytes**, 93 dependencies, 11.5004974s; скрипт прошёл `pdffonts`/`pdftotext` проверки и завершился строками `Physical PDF generated and audited` и `Environment report`. Оригиналы: локальный `Documents\TikZarium-QA\evidence\20261109-090708\{windows-cyrillic.pdf,environment.json}`. Исходный Git SHA/двоичные файлы/оригинальный PDF независимо ещё не скачаны — независимая QA в ожидании.

MiKTeX напечатал `major issue: So far, you have not checked for MiKTeX updates` в stderr; компиляция имела успешный результат, не классифицировать предупреждение как ошибку XeLaTeX. Не менять пакеты и конфигурацию TeX скрыто. Bootstrap-инциденты WS01–WS07 документированы; WS07 (повторная установка уже установленного `pgf`) снят при локальной явной проверке пакетов и `-SkipTexProvision`, и канонически исправлен в [PR #150](https://github.com/i-shutov/tikzarium/pull/150).

**W3 GUI остаётся NOT_RUN / NOT_ACCEPTED**: владелец ещё не представил оригинальные экранные снимки и подтверждения шести реальных pointer gestures, F1, Undo, Save/Open, native dialogs, IME/DPI, GUI→XeLaTeX. Следующий точный сценарий: [Windows10 W3 physical QA](WINDOWS_10_W3_PHYSICAL_QA_20261109_RU.md). Серверный W2b независимо NOT_RUN, стабильный W4 NO-GO.


## WS07 — MiKTeX пакеты уже установлены, 2026-11-09

**Фактический пользовательский лог:** `xelatex --version` успешно отработал, MiKTeX Package Manager 4.10; затем `-Phase User` завершилась на `pgf: package is already installed` / `MiKTeX explicit package install failed with exit code 1`. Это ошибка повторного пакетного provisioning в первоначальном установщике, а не неисправность XeLaTeX.

**Исправлено в [PR #150](https://github.com/i-shutov/tikzarium/pull/150):** перед установкой каждого из пяти пакетов (`pgf`, `standalone`, `fontspec`, `xcolor`, `unicode-math`) вызывается `miktex --disable-installer packages info --template '{isInstalled}' <package>`. Устанавливаются только отсутствующие; после операции выполняется повторная верификация. `update-package-database` выполняется только если выявлены отсутствующие пакеты. Статус, отличный от `true` или `false`, запрещает продолжение. Добавлена отдельная hosted PowerShell 5.1 регрессия на состояния `true`, `false` и ошибочные значения без установки стороннего ПО.

**Обход для уже запущенной RDP-сессии QA:** явно проверить каждый из пяти пакетов через `packages info`, установить только отсутствующие, затем выполнить локальный исправленный `TikZarium-Win10-Setup-fixed.ps1 -Phase User -SkipTexProvision`. Данный флаг пропускает лишь повторное provision пакетов; Cargo, XeLaTeX PDF, встроенные шрифты и кириллица по-прежнему должны проверяться. Не скачивать ZIP заново под `tikzarium-qa`, не менять пользователя/права/UAC, не переустанавливать MiKTeX.

**Статус:** Windows 10 `Machine PASS`; `User IN_PROGRESS` с подтверждённым MiKTeX CLI, но без итоговых `environment.json`/PDF; физический W3 `NOT_ACCEPTED`; W4 `NO-GO`.

## 2026-11-09 — W3: физическая Windows 10 Pro x64, первый успешный системный этап

На **отдельной** Win10 Pro 22H2 build 19045 (3.96 GiB RAM), QA-учётная запись `tikzarium-qa` (не администратор, активное подключение RDP) зарегистрированы **Machine PASS** и начатая, но **ещё не принятая User-фаза**. Реальные сведения из терминала владельца: Git 2.56.0 verified SHA256; Visual Studio 2022 Build Tools; MSVC/Windows SDK x64 detected; VC++ Runtime present. Это **не** подтверждение UI либо PDF и не переносит W2b с Server на Win10.

Bootstrap v1–v3 показал дефекты: запрет Win10, интерполяция `$build:`, обязательный `winget`; preflight v4 — ранняя оценка `$PSScriptRoot`; v4 User — неправильный эталонный SHA256 Rustup 1.29.3 и неверное имя `rustup-init.exe` (`unknown proxy name`). Канонические исправленные скрипты и hosted PS5.1 parse-only workflow — [PR #150](https://github.com/i-shutov/tikzarium/pull/150); исходный [runbook](../scripts/workstation/windows10/README_RU.md), дополнительный [журнал ошибок](TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md). После локального исправления пути Rustup пользователь сообщил, что дальнейшая установка пошла, **не прислав итоговые логи**.

**Gate W3 = IN_PROGRESS / NOT_ACCEPTED.** До W3 PASS нужны оригинальные `-Phase User` итог и `environment.json`/PDF/font+Unicode, а затем native interactive GUI: шесть жестов, исходный .tex, F1, Undo/Save/Open, IME, 100/125/200% DPI, GUI→XeLaTeX→PDF. W2b и W4 остаются самостоятельными воротами (W2b NOT_RUN, W4 NO-GO). Ни новой учётной записи на Server, ни нового runner, ни изменений RDP/UAC/FlowBridge не выполнялось.

> **LATEST ORIGINAL SERVER — 2026-11-08, main \`4ec94747\`, run [#42490214199](https://github.com/i-shutov/tikzarium/actions/runs/42490214199).** Early original artifact #13621431232 (SHA256 \`48f3b3f70ab6e7290442ae67e4059c1b8bfb162b2ebf491e7a73aca6762aeb94\`): WTS=4, Session2 disconnected, independent native JSON W2 stage is BLOCKED before GL, HWND, input, F1, Save/Open or GUI→PDF. Final artifact #13621878747 (SHA256 \`5c8e9434f8d9c2f4075000c94101419333c8647a8af031e1138e4b2109a64631\`) confirms genuine native Rust+MiKTeX PDF SHA \`abbc6a18ed3a10acddc2fc29e39abab083c1d4e3744a887406cea2dab1b242b7\`, page 1, Arial embedded and Cyrillic verified; W1 PASS. **W2b NOT_RUN; physical Windows10 W3 NOT_RUN; stable W4 NO-GO.** Read-only WTS watcher is a draft until independently approved; does not change session state.
>

> **НОВЫЙ ДОСТОВЕРНЫЙ СРЕЗ — 2026-11-08 13:53 UTC.**
> Trusted `main` `ccb4ecb7f31981bd433f8bbe3f331ec59cc512d3`, hosted
> [CI #42484403986](https://github.com/i-shutov/tikzarium/actions/runs/42484403986) SUCCESS,
> личный [Server #42484861464](https://github.com/i-shutov/tikzarium/actions/runs/42484861464) SUCCESS.
> Оригинальный ранний artifact **#13619042829**, ZIP SHA256
> `aea4751731af1e8f23a9d98909d3c67505b69017fb5cebee0f7a7495241dce0e`:
> два Win32 JSON подтверждают **WTSDisconnected=4**, Session2, без GL,
> HWND и OS input. **W2b NOT_RUN**, это не GUI PASS.
> Оригинальный итоговый artifact **#13620370186**, ZIP SHA256
> `029418b45169b10c1bae5dbd016687f281ea1863b10e8383e9401157e04e7b25`:
> нативные PE64 app/CLI subsystems 2/3, реальный внешний MiKTeX 26.5
> XeLaTeX, PDF SHA256
> `42c9209e6d6987212afd3ab38de542d4ca4f3269226fa3a5a85e396e4dfe6e6c`,
> ArialMT embedded/ToUnicode, проверенная кириллица, одинаковый инвентарь
> MiKTeX до/после — **W1 PASS на ccb4ecb7**. W2a PASS только исторически
> на `ef95c1c9`; отдельной Win10 W3 нет; stable W4 **NO-GO**.
> Кандидат независимого read-only WTS-аудита в отдельной ветке, ещё не
> допущен к персональному runner. Подробный checkpoint: [RESUME.md](RESUME.md).
>

## 2026-11-08 — new physical W2b blocker: actual WTSDisconnected; no input attempted

Trusted `main` a5e2335825af4391d380792406ee0d9e529a5a17, exact-main hosted CI SUCCESS:
[CI #42479515561](https://github.com/i-shutov/tikzarium/actions/runs/42479515561),
[D QA #42479515684](https://github.com/i-shutov/tikzarium/actions/runs/42479515684),
[Windows Administrator #42479515669](https://github.com/i-shutov/tikzarium/actions/runs/42479515669).
Personal [Windows Server run #42480008310](https://github.com/i-shutov/tikzarium/actions/runs/42480008310)
completed SUCCESS with **original early artifact #13616951919**
(outer ZIP SHA256 `f98bf0da4906ac6d81994ab0aa88b7197bf21cfb9f1f294787ed721cc4b7bf2e`)
and **original final artifact #13617707472**
(outer ZIP SHA256 `0830406a4b2265caed160444d1ee90e00ab90d93f3cd19b557c395cafe5a3e6e`).
The original GL provenance proves successful QA-only transfer from exact-main CI escrow:
`PAL1000_MINGW_26_2_6`, archive SHA256
`da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388`,
19 original DLL digests, no system installation or product distribution.
**The previous 7-Zip/CDN blocker is cleared on this run; the remaining blocker is different.**

Original `windows-server-w2-interactive.json`: **`BLOCKED_DISCONNECTED_OR_UNKNOWN_SESSION_STATE`**,
at 2026-11-08 12:24 UTC, RDP Session 2, WinSta0/Default,
**WTSConnectState=4 (WTSDisconnected), `input_desktop=UNAVAILABLE`**.
No GUI process/HWND, source gestures, F1 PNG, native dialogs, IME or GUI-origin PDF was tested.
Historical W2a full-window/F1 PASS at ef95c1c9 is preserved but **not transferred** to a5e23358.
Do not change RDP/UAC/accounts/runner services or infer physical W2b PASS.

Independently checked actual uploaded **W1** `owner-admin-proof/product.pdf`:
PDF SHA256 `f3a914670c959b54b321d9cf62b5ebb213c6381e1e6619545b89a640ffb7c1c5`,
one page, MiKTeX-dvipdfmx/XeTeX producer, embedded/subset ArialMT CID TrueType, ToUnicode yes,
extractable `Точка` and `Тест XeLaTeX: Кириллица.`. Original native Rust 1.91.0
GUI PE subsystem 2 / CLI 3, no dynamic VCRUNTIME, actual MiKTeX 26.5 CLI build exit 0,
packages unchanged, disabled shell escape, existing HIGH Administrator trusted-document warning.
This is **W1 PASS** at a5e23358, **not** W2b GUI→PDF.

Follow-up candidate in independent branch `fix/w2b-rdp-session-gate-20261108`:
read-only WTS native query before Mesa staging; exact trusted-main/self-hosted run and
SHA guards; seven fail-closed Windows PowerShell 5.1 tests; original
`w2-session-readiness.json` and a W2 `NOT_RUN` result when disconnected.
Save GL transfer/network work until WTS is Active, but WTSActive is **only a candidate**:
the existing owned HWND/input desktop/focus/PMv2 runtime gates remain mandatory.
W1 native Rust/MiKTeX continues even when W2 is blocked.

**Release verdict:** W1 PASS current server; W2a PASS historical original; W2b NOT_RUN
(disconnected RDP), W3 physical Windows10 NOT_RUN, stable W4 NO-GO.

> **LATEST ENGINEERING CHECKPOINT, 2026-11-08 (PR #138 DRAFT; not merged).** Trusted `main` at this checkpoint: `597dc894070202975fdf58c434f599deac42fe7d` after reviewed PR #136. [Personal Windows Server run #42473309431](https://github.com/i-shutov/tikzarium/actions/runs/42473309431) original early artifact **#13613977992**, original ZIP SHA256 `06cdd5733eefd519da3875939baa974223c99aa85b85bea4efb439c4a5482c85`: GUI stage **BLOCKED** `PINNED_MESA_TRANSPORT_EXHAUSTED_4_ATTEMPTS: CURL_RELEASE_EXIT_22`. No W2b source gesture, native Save As, GUI→XeLaTeX or Windows10 input was executed. Exact-original hosted binary/ZIP validation was successful. Historical W2a full 125% screenshot/F1 stays **PASS only at SHA `ef95c1c9`**, full W2b **NOT_RUN**, W3 **NOT_RUN**, stable W4 **NO-GO**. Final [personal run #42473309431](https://github.com/i-shutov/tikzarium/actions/runs/42473309431) completed SUCCESS; independently audited original final artifact **#13614209996**, ZIP SHA256 `a16ff580f364787bce70142fe3f8ed47cb9b580381e499cf88f98933288f640c`: native Rust and PE GUI/CLI imports PASS, external actual MiKTeX XeLaTeX product CLI PDF SHA256 `825a1bc5eb08bb5876f2d263a48ac84335169f3bf79ef30ac165763f64aa81c5`, one page, subset/embedded ArialMT CID TrueType, ToUnicode, real Cyrillic text and visual render, identical package inventory except elapsed timing. **W1 PASS at exact `597dc894`**, but independent original early artifact still says W2b native GUI **BLOCKED_NO_GL**. No GUI→XeLaTeX was tested. Candidate PR #138 adds official separately SHA-pinned MSYS2 QA transport without system install, but is **not accepted** on personal Server until exact-head hosted CI, review, expected-head merge after current run completion, and original physical QA. No change to runner or main during this run.


> **CURRENT — 2026-11-08, main `ef95c1c9ef1ac2b311a654c1daac53c97c8d7ef9`: W2a PHYSICAL PASS.** [Original Server run](https://github.com/i-shutov/tikzarium/actions/runs/42460198175), early artifact 13609526883, full 1475×850 real 125%-DPI client PNGs, same own HWND/PID, foreground525ms, restored PMv2 context and actual Russian F1 Help, right/bottom panels visible. Independent original PNG/JSON and human visual audit passed. **W2b still NOT_RUN, physical Win10 W3 NOT_RUN, stable W4 NO-GO.** Historical excerpt below describes the already corrected 1180×680 crop.

> **Актуальный физический результат 2026-11-08, main `9c721242`, PR #132:**
> personal run #42450616810 / original early artifact13606185205 подтвердил
> **отзывчивое собственное HWND и реальный F1**: PID1652, HWND4128904,
> Server2025/26100, существующий HIGH Administrator, WTSActive/Default,
> stable own foreground с первой попытки за705мс, без AttachThreadInput.
> Но оригинальные PNG1180×680 при125% визуально обрезали правую и нижнюю части.
> Поэтому **W2a ещё не принят целиком**: нужна полноразмерная физическая client PNG.
> Исправление QA использует scoped PMv2 для геометрии+PrintWindow с обязательным
> восстановлением DPI-контекста вызывающего потока; масштаб/системные настройки
> не меняются. [Доказательства и критерии](../plans/2026-11-08_W2_PHYSICAL_PIXEL_CAPTURE.md).
> W2b full GUI и физический Windows10 W3 остаются NOT_RUN, W4 NO-GO.
> **W1 exact-current-main PASS:** [original personal run #42460198175](https://github.com/i-shutov/tikzarium/actions/runs/42460198175), final artifact #13609998582 ZIP sha256 `e7a39d60a263968ea6b2640507727f52204e92bb45db1b669eab9a6b4d47e13a`, independently audited real native Rust/MiKTeX product-CLI PDF with embedded Arial and UTF-8 Cyrillic, PDF sha256 `b288cc80cb756deab46ba30c99f347c46ef52e8a46f46f8756c257b8383b72b7`. Current W2a PASS is separate; W2b full GUI→PDF still NOT_RUN.


**Дата: 2026-11-07. Цель владельца: физическая Windows 10 x64, MiKTeX устанавливает и обслуживает пользователь. Функции заморожены.**

Это **главный текущий релизный документ**, он имеет приоритет над историческими Linux-first планами и отменённым blanket-запретом HIGH Administrator. Полный [журнал 79 технических инцидентов и способов решения](TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md) отвечает на вопрос, почему работа ранее блокировалась и что реально помогло.

## 1. Выпускаемый продукт и пределы

Нативный Rust/egui с шестью TikZ primitives (line, arrow, rectangle, circle, cubic Bézier, node); всегда редактируемый обычный .tex рядом с canvas и PDF; русская F1, Inspector/Libraries, пять независимых статусов installed/project-loaded/engine-compatible/implemented/help, revision-checked minimal SourcePatch/Undo, безопасные Save/Open/Close и **реальный внешний XeLaTeX PDF**. Не разрабатывать новый TeX parser/CAD/CAS/solver; не добавлять N4. Поддерживать Linux/macOS архитектурно и в CI.

Существующий Administrator, включая HIGH/elevated, **поддерживается по решению владельца 2026-11-06**. Отображать честное предупреждение «только доверенные документы, НЕ sandbox». Сохранять `-no-shell-escape`, `--disable-installer` на проверенной MiKTeX, bounded processes, исходные stderr/exit. Нельзя менять UAC, системный MiKTeX, учётные записи, FlowBridge или автоматически ставить TeX/пакеты/шрифты.

## 2. Ворота W0–W4 — только проверяемые факты

| Gate | Фактический статус (см. точные SHA в свидетельствах) | Доказательство / остаток |
| --- | --- | --- |
| **W0 Windows PE/portable** | **PASS hosted** | [Main CI #42382400325](https://github.com/i-shutov/tikzarium/actions/runs/42382400325): PE GUI subsystem2, CLI subsystem3, нет VCRUNTIME/MSVCP import, native/portable SHA, manifest, extracted CLI. Это **не Windows10 физическая**. |
| **W1 personal Windows Server Rust + MiKTeX** | **PASS (current exact main)** | [Personal #42460198175](https://github.com/i-shutov/tikzarium/actions/runs/42460198175), final artifact #13609998582; native Rust/PE/CLI, actual external MiKTeX PDF, glyph/text/font audit of original bytes PASS, HIGH existing Administrator trusted-only. Not GUI-origin W2b. |
| **W2 physical Server desktop** | **W2a PASS / W2b NOT_RUN** | [Main #42460198175](https://github.com/i-shutov/tikzarium/actions/runs/42460198175), original artifact 13609526883: responsive same-owned HWND, first-attempt foreground525ms, F1, physical 1475×850 @125% fully visible, restored PMv2, independently audited original PNG. Six gestures/Save/Open/IME/GUI→PDF and DPI200 still **NOT_RUN**; not full W2. |
| **W3 physical Windows10 x64** | **NOT_RUN** | Нужны отдельные реальные OS/GPU/MiKTeX/GUI/IME/DPI/native dialogs + full source→PDF испытания на Windows10; Server2025/hosted2022 не заменяют. |
| **W4 Installer/stable 1.0** | **BLOCKED** | Никакого релизного тега/установщика до W2+W3, исходных SHA, окончательных инструкций, теста clean install/uninstall. |

Исторический W2 JSON и ZIP SHA256: `2ed2dd579fb3fbcaa0b2f4ff0fedc331cb75d7e6fde3a8274aeca88c7c8b1f01`. Новый [run #42397730682](https://github.com/i-shutov/tikzarium/actions/runs/42397730682), original artifact `13585625182`, подтвердил блокер `NO_FOREGROUND_WINDOW`; исходный JSON надо читать независимо. W2 step имеет continue-on-error; SUCCESS Actions — **не** GUI PASS.

## 3. Очередность работ до выпуска — без расширения функций

### W2a. Отзывчивое собственное окно и полный физический client screenshot

**PASS, original artifact 13609526883 at main `ef95c1c9`.** Full original right Help/Properties and bottom status, exact native 1475×850 client after scoped PMv2, same HWND and restored DPI context, real F1. The following derivation is historical, not another blocker.

PR #132 устранил синхронное TeX-discovery на GUI-потоке и ожидание произвольных задержек/AttachThreadInput. На настоящем personal Server main `9c721242` окно сразу владеет foreground; WM_NULL ready/processed и stable HWND подтверждены, F1 изменяет оригинальные PNG. Старые `BLOCKED_FOREGROUND_NOT_OWNED`, `NO_FOREGROUND_WINDOW` и `OWNED_QUEUE_DID_NOT_GAIN_FOREGROUND` относятся к предшествующим коммитам.

Следующая узкая проблема — DPI-virtualized capture: PowerShell видел логические1180×680, PrintWindow отрисовывал125%-содержимое в слишком маленький bitmap. Не увеличивать картинку после снимка и не считать её полной. Измерить HWND/client/monitor в одном native PER_MONITOR_AWARE_V2 thread scope, снять оригинальный PrintWindow(PW_CLIENTONLY|PW_RENDERFULLCONTENT) тех же физических размеров, затем восстановить предыдущий контекст в finally и проверить восстановление. Обязательны повторные PID/foreground/unlocked проверки и unchanged geometry до/после отрисовки. Никаких desktop pixels, изменения DPI процесса/системы, RDP settings, UAC либо новых пользователей.

Новый schema3 JSON сохраняет контекст и физическую геометрию каждого снимка. Auditor отвергает старый non-100%-DPI отчёт без такого доказательства, смешанные logical/physical bounds, утечку DPI-контекста, обрезанный client, чужой HWND и PNG с неверным CRC/SHA. Native PowerShell5.1 тест проверяет восстановление контекста при успешном вызове и ошибке, включая исходные unaware/system/PMv2 состояния. Сначала exact-head hosted Windows GUI и тесты; затем expected-head merge после окончания предыдущего Server run, exact-main CI и реальный personal125% rerun. Для W2a необходимы **полностью видимые Properties/Help и нижний status** в оригинальных PNG, а не только изменившийся хеш.

### W2b. Вся вертикаль GUI, а не только окно и F1

Подтвердить на настоящем Windows Server: 6 pointer gestures → C-owned editable TikZ source → Properties/Libraries/F1 → изменение Node/Bézier параметров и минимальная source patch → visual Undo и TextEdit Undo → сохранение/открытие/reopen/dirty-close/native file dialogs → реальный XeLaTeX PDF через GUI, Unicode и embedded fonts → экспорт. Отдельно проверить IME, исходник с чужими макросами и CRLF, синхронизацию last-good/stale PDF, масштаб экрана и расположение кнопок. Минимум DPI100/125/200; 125% уже зафиксирован на Server, не заменяет другие случаи.

**Оригинальные доказательства для каждой стадии:** exact source+exe SHA, Windows build, token/session/WTS, PID/HWND/title/foreground, client PNG до/после F1 с CRC/SHA, исходный .tex до/после, PDF, native stderr/XeLaTeX log, pdftotext, pdffonts, pdfinfo. Client PNG снимается только Win32 PrintWindow(PW_CLIENTONLY|PW_RENDERFULLCONTENT) после повторной проверки PID/foreground — никогда GetWindowRect+CopyFromScreen с чужого рабочего стола. Blank GPU frame → BLOCKED.

Временная Mesa llvmpipe MinGW x64 с pinned SHA `da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388` — **только QA-обход RDP OpenGL2**, 19 DLL в private RUNNER_TEMP, обязательная очистка. Не включать в portable release.

### W3. Отдельная физическая Windows 10 x64

Для release-кандидата взять **оригинальный portable ZIP** успешного exact-main Windows CI, не копировать EXE из непроверенной PR, и выполнить на Windows10 Pro/Enterprise 22H2:

1. Зафиксировать OS build, реальное разрешение, масштаб 100/125/200%, x64/GPU/OpenGL, существующую учётную запись Administrator, текущий medium/high token и версию MiKTeX.
2. Распаковать ZIP в каталог с русскими буквами и пробелами; проверить PROVENANCE.json, MANIFEST.sha256 и SHA всех файлов, PE app2/CLI3. Не переносить Mesa из серверного QA.
3. Проверить реальные `xelatex --version`, `pdfinfo`, `pdffonts`, `pdftotext` и `tikzarium-cli.exe doctor`; TeX/Poppler устанавливаются пользователем отдельно, не программой.
4. Запустить оригинальный `tikzarium-app.exe` на штатном GPU **без QA-Mesa**; записать настоящий HWND, DPI, скриншоты. Если Win10 GPU не поддерживает OpenGL2, это отдельный release BLOCKER, а не разрешение системно устанавливать Mesa.
5. Провести шесть жестов с видимым кодом, source/CRLF/opaque macros, Undo/Save/Open/native file dialogs/dirty close, русскую IME, свойства, библиотеки, F1 и UI themes без изменения TeX.
6. Скомпилировать GUI→внешний MiKTeX XeLaTeX PDF с текстом/математикой внутри TikZ узлов; сверить Cyrillic+Greek, Missing character, embedded fonts, page geometry, SHA, негативную ошибку, cancel, stale last-good.
7. Провести тест на 1366×768 и 1920×1080, при 100%, 125%, 200% DPI, проверив доступность всех критических кнопок и нормальный курсор.
8. Сохранить оригинальные PNG, TeX, PDF, logs, json со статусом каждого шага (PASS/FAIL/BLOCKED/NOT_RUN). Ни hosted Windows ни Server не считаются физическим W3.

**Читающий PowerShell пример проверки manifest внутри распакованного ZIP (без установки чего-либо):**

```powershell
$ErrorActionPreference = 'Stop'
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber
Get-Command xelatex.exe,pdfinfo.exe,pdffonts.exe,pdftotext.exe -ErrorAction SilentlyContinue |
  Select-Object Name,Source
Get-Content -LiteralPath .\MANIFEST.sha256 | ForEach-Object {
  $parts = $_.Trim() -split '\s+', 2
  if ($parts.Count -ne 2) { throw 'Malformed SHA256 manifest row' }
  $name = $parts[1].TrimStart(' ', '*')
  $actual = (Get-FileHash -LiteralPath $name -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $parts[0].ToLowerInvariant()) { throw "Hash mismatch: $name" }
}
.\tikzarium-cli.exe doctor
```

### W4. Release packaging / installer / tag

**Только после полноценного W2 и физического W3:** зафиксировать SHA исходника и Cargo.lock, собрать/повторно проверить app/cli/manifest/CRC/portable ZIP, сделать чистую установку/запуск/удаление на Windows10; подготовить русские системные требования, установку самостоятельного MiKTeX, KNOWN_ISSUES, release notes, сведения о code signing. Отсутствующую подпись не обозначать как имеющуюся. Только тогда **v1.0.0** Windows release tag. Linux RC остается RC до своей физической R4; macOS hosted ≠ физический M1/M4.

## 4. UX issue #125 / PR #128 и заморозка функций

[PR #128](https://github.com/i-shutov/tikzarium/pull/128) — компактные служебные маркеры и Inspector — имеет **10/10 exact-head hosted SUCCESS**, но остаётся **draft, не в main** на этом срезе. UI-приёмка всё равно требует оригинальных screenshots, особенно 1366×768. Не менять main в середине точного Server W2. После W2 review либо включить PR #128 как одну доказательную эргономическую корректировку перед W3 (с новыми source-tree leases и CI), либо перенести необязательную косметику после релиза. Никакой бесконечной серии UX микропатчей.

## 5. Жёсткий GO / NO-GO

**GO** возможен, только если одновременно:

- [ ] W0 оригинальная GUI/CLI/ZIP/manifest/PE/imports и exact SHA подтверждены.
- [x] W1 native trusted-main personal Server Rust/PE/CLI and external MiKTeX PDF/UTF-8 glyphs/embedded fonts independent original audit PASS (run #42460198175, artifact #13609998582).
- [x] W2a real owned HWND/F1 and two original full physical 125%-DPI client PNG PASS on exact `ef95c1c9` (artifact 13609526883); no foreign desktop pixels.
- [ ] W2b шесть операций + Undo/Save/Open/документы/F1/native dialogs/IME/DPI/GUI→PDF на персональном Server подтверждены.
- [ ] W3 отдельно **физическая Windows10 x64**, положительные и негативные end-to-end испытания, original screenshots/log/source/PDF/SHA.
- [ ] W4 clean install/uninstall, exact provenance, KNOWN_ISSUES, release notes, законная подпись или честное указание отсутствия.
- [ ] Exact-head и postmerge Windows/macOS/Linux CI + D QA PASS, нет severity-1 источниковых потерь/безопасности.

**NO-GO**, если любое обязательное доказательство отсутствует. Разрешён только `preview / QA candidate`, а не stable release. Нельзя объявлять W2/W3 успешными из-за зелёного workflow с continue-on-error.

## 6. Источники и порядок чтения

1. Этот файл — актуальный статус и порядок W0–W4.
2. [79 technical incidents](TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md) — причины, решения, доказательства, отклонённые обходы.
3. [PRODUCT_SPEC](PRODUCT_SPEC.md), [AGENTS](../AGENTS.md) — контракт и решение владельца о HIGH Administrator.
4. [Issue #108](https://github.com/i-shutov/tikzarium/issues/108), [issue #103](https://github.com/i-shutov/tikzarium/issues/103), [#125](https://github.com/i-shutov/tikzarium/issues/125), [#126](https://github.com/i-shutov/tikzarium/issues/126).
5. [Физический Win10/Mac QA](QA_WIN10_MACOS_ARM.md), [CI matrix](CI_MATRIX.md), [CHANGELOG](../CHANGELOG.md) — оригинальные артефакты и история. Старые формулировки PENDING и прежний запрет HIGH не определяют текущий релиз.
