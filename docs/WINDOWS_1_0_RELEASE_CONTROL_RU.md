# Windows 1.0 — релизный контроль TikZarium (GO / NO-GO)

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
