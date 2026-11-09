# TikZarium — Windows 10 x64: физическая приёмка W3 (рабочая инструкция)

## 2026-11-09 — W3 GUI Build `▶` реагирует без видимого результата

Владелец подтвердил реальный запуск TikZarium под Windows 10 через изолированную Mesa, затем сообщил: **нажатие верхней кнопки `▶` визуально ничего не меняет**. В `crates/tikzarium-app/src/main.rs` icon Build вызывает `self.build()`; до компиляции выполняются проверки TeX discovery, уже работающего worker, найденного XeLaTeX и обязательный `save()`. На скриншоте исходник новый, без сохранённого пути, поэтому **возможная причина — нативный Save As dialog** (в том числе без фокуса/за окном) либо отсутствие видимой диагностики. Это пока не установленный root cause. CLI→PDF PASS не переносится на GUI→PDF.

Следующий проверяемый опыт: `Ctrl+S` → сохранить в новую QA-папку → повторить `▶`/`Ctrl+Enter` → `Вид → Диагностика` и вкладка PDF → сохранить лог и original source/PDF hashes. При доступном локальном GUI control поручить эту последовательность Dot по [готовому заданию](DOT_WINDOWS10_W3_GUI_HANDOFF_RU.md). **W3 GUI START PASS**, `W3 GUI→PDF = NOT_RUN/не подтверждён`, `W4 NO-GO`.


## 2026-11-09 — W3 физическая Windows 10: нативное GUI-окно появилось через изолированную Mesa

**Новое оригинальное визуальное свидетельство от владельца в RDP-сеансе `tikzarium-qa`:** после SHA-проверенной Mesa 26.2.6 и распаковки через 7zr виден работающий процесс `TikZarium` с настоящим окном. На скриншоте одновременно присутствуют верхнее меню/панель инструментов, вкладки `Эскиз`/`PDF`, редактируемый текст обычного `.tex` в левой колонке (quickstart), сетка холста в центре, правая панель `Свойства`/`Библиотеки`/`Справка`, русские подписи и состояние `Изменено`. Прежний `OpenGL(PainterError("egui_glow requires opengl 2.0+. "))` перестал блокировать создание окна при изолированном пользовательском запуске. **Никаких подтверждений F1, редакторской операции мышью, Save/Open, GUI→PDF или DPI200 из одного скриншота нет.**

**Вердикт:** `W3-GUI-START = PASS (визуальное подтверждение, screenshot from owner conversation)`; `W3-INTERACTION = NOT_RUN`, `W3-GUI→XeLaTeX = NOT_RUN`, `W3-OVERALL = IN_PROGRESS / NOT_ACCEPTED`, `W4 = NO-GO`. Изолированная software GL — **QA runtime workaround**, не свойство распространяемого installer/portable ZIP. На снимке видна панель задач поверх нижней границы GUI, поэтому полный клиентский прямоугольник/панель статуса и покрытие разных DPI ещё не подтверждены.

**Доказательства:** первичная Win10 CLI-генерация PDF находится локально в `Documents\TikZarium-QA\evidence\20261109-090708`; исходное GUI screenshot предоставлено владельцем в чате, **не выгружено в публичный GitHub** (возможные детали RDP/рабочего стола). Для окончательного W3 требуется отдельный оригинальный набор: физическое F1 before/after, 6 жестов, .tex до/после, Undo/Save/Open, кириллица/IME, GUI→PDF, независимый SHA/fonts и снимки полного окна. Следующий тест — [W3 runbook](WINDOWS_10_W3_PHYSICAL_QA_20261109_RU.md).


## 2026-11-09 — WS09: штатный Windows 10 tar.exe не поддерживает LZMA из Mesa .7z

Фактический RDP лог: Mesa 26.2.6 скачана правильно, SHA256 проверен (`da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388`), но распаковка встроенным `tar.exe` завершилась `LZMA codec is unsupported` (exit 1). Архив не поврежден. Ошибка вызвана неверным предположением о возможностях штатного архиватора Win10.

Исправлено в кандидатном [PR #150](https://github.com/i-shutov/tikzarium/pull/150): W3 launcher использует портативный `7zr.exe` из официального выпуска `ip7z/7zip` 26.05 с закрепленным SHA256 `9bf582b894dfa665f852d7e9112b02290a1c303c2d95a21fcdc41ffcb03143b7`. Дополнительная CRC-проверка 7z предшествует распаковке. Уже проверенная загрузка Mesa (~56 МБ) переиспользуется, временные неполные результаты `tar.exe` очищаются только внутри `Documents/TikZarium-QA/W3-Mesa-26.2.6/unpacked` и не касаются исходного EXE, System32 или реестра. Изолированное программное OpenGL по-прежнему кандидат до физического GUI испытания.

В hosted Windows добавлена проверка реальной распаковки pinned Mesa через pinned 7zr с подтверждением `x64/opengl32.dll` и `libgallium_wgl.dll`. **Пока CI или локальный GUI не подтвердят результат, W3 BLOCKED/NOT_ACCEPTED, а не PASS**. Локальный обход: отдельно скачать 7zr.exe, проверить SHA256, `7zr t` и `7zr x` для уже скачанного Mesa и повторить `-Action PrepareAndRun`.


> 9 ноября 2026. Основание: пользовательский журнал успешного `-Phase User` на Windows 10 Pro 22H2 (build 19045), под локальным неадминистративным `tikzarium-qa`, RDP. **Сборка Rust + CLI → XeLaTeX PDF подтверждена; W3 GUI ещё не принят.** Этот документ — инструкция дальнейшего ручного испытания, а не отчёт об уже выполненном GUI.

## 2026-11-09 — W3 GUI OpenGL 2.0 blocker under RDP (new WS08)

**Actual owner trace after fully successful User/CLI PDF:** launching `target\debug\tikzarium-app.exe` under non-admin `tikzarium-qa` exited `Error: OpenGL(PainterError("egui_glow requires opengl 2.0+. "))`. Root of practical limitation: `eframe 0.33.3` is built with the `glow` renderer and the active RDP OpenGL context cannot meet minimum 2.0; the physical W3 interface was **NOT RUN**.

**Canonical QA workaround (candidate, not yet physically verified):** [isolated software OpenGL launcher](../scripts/workstation/windows10/Invoke-TikZarium-W3-Mesa.ps1). It downloads SHA256-pinned Mesa3D 26.2.6 x64 MinGW artifact (GitHub upstream pal1000), verifies digest, uses SHA256-pinned standalone `7zr.exe` for `.7z`, and stages a **copy** of native `tikzarium-app.exe` plus x64 Mesa DLLs only under `Documents\TikZarium-QA\W3-Mesa-26.2.6\runtime`. The launcher scopes `GALLIUM_DRIVER=llvmpipe`, `LIBGL_ALWAYS_SOFTWARE=1` and `PATH` to the child, does not replace system or `target\debug` OpenGL DLLs, drivers, registry or UAC. Two initial valid outcomes: software GL GUI really opens (then proceed with six gestures/F1/Save/Open/GUI→PDF); or launcher shows actual new error (record and diagnose, **do not** infer GUI PASS).

Independent source: official [Mesa llvmpipe Windows DLL-local usage](https://docs.mesa3d.org/drivers/llvmpipe.html) and [Windows tar 7z support](https://learn.microsoft.com/en-us/windows/tar/). The upstream package has a fixed SHA256 already validated in TikZarium QA transport. **No runtime W3 evidence from this launcher yet**.

## 1. Зафиксированный исходный результат

- `Machine PASS`: Git 2.56.0, MSVC 2022 Build Tools, Windows SDK x64, VC++ x64 runtime.
- `User PASS` по терминальному журналу: проектные `tikzarium-core`, `tikzarium-extensions`, `tikzarium-app` скомпилированы; `cargo build --locked -j 1 -p tikzarium-app` завершился `Finished dev profile` за 2m14s; CLI `build` выполнил внешний MiKTeX XeLaTeX.
- `examples/windows-cyrillic.tex` → `windows-cyrillic.pdf` (16 448 bytes; 93 dependencies; CLI reported 11.5004974s); установочный скрипт завершил проверки PDF/встроенного Arial/ToUnicode/извлечения кириллицы, так как выполнил `Physical PDF generated and audited`, затем записал `environment.json`. Независимый байтовый аудит PDF **ещё не проведён**.
- MiKTeX вывел `major issue: So far, you have not checked for MiKTeX updates` в stderr **при успешном exit**. Не ошибочно считать это failure. Для финальной QA надо сохранить оригинальный stderr и inventory/versions; не выполнять скрытое обновление пакетов в ходе испытаний.
- Исходник и EXE SHA, оригинальные PDF/font/text отчёты нужно получить из локального evidence; один терминальный лог не доказывает геометрию или внешнее поведение GUI.

## 2. Где находятся программа и доказательства

В существующей RDP-сессии `tikzarium-qa` ничего больше не устанавливать:

```powershell
$repo = Join-Path $env:USERPROFILE 'source\tikzarium'
$app = Join-Path $repo 'target\debug\tikzarium-app.exe'
$cli = Join-Path $repo 'target\debug\tikzarium-cli.exe'
$evidence = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA\evidence\20261109-090708'
$git = 'C:\Program Files\Git\cmd\git.exe'
foreach ($path in @($app, $cli, (Join-Path $evidence 'windows-cyrillic.pdf'), (Join-Path $evidence 'environment.json'))) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Expected QA artifact missing: $path" }
}
$sha = (& $git -C $repo rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Git source SHA could not be read' }
Write-Host "SOURCE SHA: $sha"
Get-FileHash -LiteralPath $app, $cli, (Join-Path $evidence 'windows-cyrillic.pdf') -Algorithm SHA256 |
    Format-Table Path, Hash -AutoSize
Get-Content -LiteralPath (Join-Path $evidence 'environment.json') -Raw
```

Не публиковать пароль, RDP-реквизиты, пользовательские токены, системные профили или посторонние окна.

## 3. Ручной W3 в активном RDP

1. Оставаться в активной, разблокированной сессии `tikzarium-qa`. Из каталога проекта запустить `& $app`. Убедиться, что появился **реальный собственный UI**, а не консоль или статическая картинка; создать полноразмерный снимок окна, включая правую и нижнюю панели.
2. Открыть F1 — русская справка должна действительно меняться в ответ на нажатие; сохранить второй полноразмерный снимок того же окна.
3. С реальными действиями мышью построить последовательно **line, arrow, rectangle, circle, text/math node и cubic Bézier**. После каждого действия проверить соответствующий **редактируемый обычный TikZ/TeX** рядом с canvas; ни один элемент не должен быть только визуальным суррогатом.
4. Для двух объектов проверить Undo/Redo, редактуру исходного кода и корректное сохранение несвязанных комментариев/макросов; проверить, что отмена в source не повреждает документ.
5. Сохранить созданный `.tex` в новую папку `Documents\TikZarium-QA\W3`, закрыть и снова открыть через нативный file picker; проверить содержимое побайтно/визуально и отсутствие посторонних правок. Проверить штатное поведение при dirty-close (без потери данных).
6. Через GUI инициировать сборку **этого же** `.tex` внешним XeLaTeX: результат PDF должен отражать исходник, иметь корректную кириллицу, шрифты и нулевой exit компилятора; сохранить оригинальные `.tex`, `.pdf`, логи и SHA256. `CLI → PDF` из уже выполненного User-этапа **не заменяет** GUI→PDF.
7. Проверить кириллицу (ввод, F1, путь с пробелами/Unicode), native Open/Save dialogs, состояние preview/last-good при заведомо неверном TeX. При наличии нескольких масштабов 100/125/200% выполнить снимки в каждом; если масштаб не проверяли, указать NOT_RUN, а не PASS.

Запуск GUI:

```powershell
& (Join-Path $env:USERPROFILE 'source\tikzarium\target\debug\tikzarium-app.exe')
```

Не запускать QA с повышенными правами или под `SYSTEM` только ради обхода ошибки; текущая неадминистративная сессия уже работает. Не устанавливать драйверы/Mesa/TeX/пакеты и не менять UAC, RDP, WinServer, runner или FlowBridge.

## 4. Протокол W3

Хранить рядом с оригиналами отдельный Markdown/JSON со значениями `PASS`, `FAIL`, `NOT_RUN` для каждого шага. Записать OS/build, CPU/GPU/RDP session, рабочее DPI/разрешение, source SHA, SHA256 EXE/CLI, пути и SHA исходных `.tex`/`.pdf`, версии Rust/MiKTeX/Poppler, исходные stderr. Снимки делать **собственного окна TikZarium**, не чужого рабочего стола. Отсутствующие пункты остаются `NOT_RUN`.

Порог W3: подлинные оригинальные source/PDF/fonts/screenshots плюс успешная интерактивная последовательность. W2b на Windows Server и W4 stable release остаются отдельными gate.
