# TikZarium — Windows 10 x64: физическая приёмка W3 (рабочая инструкция)

> 9 ноября 2026. Основание: пользовательский журнал успешного `-Phase User` на Windows 10 Pro 22H2 (build 19045), под локальным неадминистративным `tikzarium-qa`, RDP. **Сборка Rust + CLI → XeLaTeX PDF подтверждена; W3 GUI ещё не принят.** Этот документ — инструкция дальнейшего ручного испытания, а не отчёт об уже выполненном GUI.

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
