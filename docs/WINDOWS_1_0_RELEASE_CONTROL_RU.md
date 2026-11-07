# Windows 1.0 — релизный контроль TikZarium (GO / NO-GO)

**Дата: 2026-11-07. Цель владельца: физическая Windows 10 x64, MiKTeX устанавливает и обслуживает пользователь. Функции заморожены.**

Это **главный текущий релизный документ**, он имеет приоритет над историческими Linux-first планами и отменённым blanket-запретом HIGH Administrator. Полный [журнал 79 технических инцидентов и способов решения](TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md) отвечает на вопрос, почему работа ранее блокировалась и что реально помогло.

## 1. Выпускаемый продукт и пределы

Нативный Rust/egui с шестью TikZ primitives (line, arrow, rectangle, circle, cubic Bézier, node); всегда редактируемый обычный .tex рядом с canvas и PDF; русская F1, Inspector/Libraries, пять независимых статусов installed/project-loaded/engine-compatible/implemented/help, revision-checked minimal SourcePatch/Undo, безопасные Save/Open/Close и **реальный внешний XeLaTeX PDF**. Не разрабатывать новый TeX parser/CAD/CAS/solver; не добавлять N4. Поддерживать Linux/macOS архитектурно и в CI.

Существующий Administrator, включая HIGH/elevated, **поддерживается по решению владельца 2026-11-06**. Отображать честное предупреждение «только доверенные документы, НЕ sandbox». Сохранять `-no-shell-escape`, `--disable-installer` на проверенной MiKTeX, bounded processes, исходные stderr/exit. Нельзя менять UAC, системный MiKTeX, учётные записи, FlowBridge или автоматически ставить TeX/пакеты/шрифты.

## 2. Ворота W0–W4 — только проверяемые факты

| Gate | Фактический статус на основном коммите b761a37f1872d13dd5d866ff2d68ac8b8aa60989 | Доказательство / остаток |
| --- | --- | --- |
| **W0 Windows PE/portable** | **PASS hosted** | [Main CI #42382400325](https://github.com/i-shutov/tikzarium/actions/runs/42382400325): PE GUI subsystem2, CLI subsystem3, нет VCRUNTIME/MSVCP import, native/portable SHA, manifest, extracted CLI. Это **не Windows10 физическая**. |
| **W1 personal Windows Server Rust + MiKTeX** | **PASS** | [Original Server #42382753629](https://github.com/i-shutov/tikzarium/actions/runs/42382753629) и [artifact #13579401001](https://github.com/i-shutov/tikzarium/actions/runs/42382753629/artifacts/13579401001): HIGH Administrator, native Rust/PE/CLI, original external XeLaTeX PDF. |
| **W2 physical Server desktop** | **PARTIAL / BLOCKED_FOREGROUND_NOT_OWNED** | До PR #130 — RDP Session2 WTSActive=0, WinSta0/Default, Mesa и реальный GUI PID4060/HWND 1194×718/DPI120, но чужой foreground. На точном `main` `b761a37f` [run #42397730682](https://github.com/i-shutov/tikzarium/actions/runs/42397730682) — **`NO_FOREGROUND_WINDOW`** после 10 попыток. Оригинальные F1/client PNG и полный W2 **NOT_RUN**. SUCCESS Actions не является W2 PASS. |
| **W3 physical Windows10 x64** | **NOT_RUN** | Нужны отдельные реальные OS/GPU/MiKTeX/GUI/IME/DPI/native dialogs + full source→PDF испытания на Windows10; Server2025/hosted2022 не заменяют. |
| **W4 Installer/stable 1.0** | **BLOCKED** | Никакого релизного тега/установщика до W2+W3, исходных SHA, окончательных инструкций, теста clean install/uninstall. |

Исторический W2 JSON и ZIP SHA256: `2ed2dd579fb3fbcaa0b2f4ff0fedc331cb75d7e6fde3a8274aeca88c7c8b1f01`. Новый [run #42397730682](https://github.com/i-shutov/tikzarium/actions/runs/42397730682), original artifact `13585625182`, подтвердил блокер `NO_FOREGROUND_WINDOW`; исходный JSON надо читать независимо. W2 step имеет continue-on-error; SUCCESS Actions — **не** GUI PASS.

## 3. Очередность работ до выпуска — без расширения функций

### W2a. Предоставить владение foreground собственному HWND

Состояние RDP, OpenGL и GUI уже подтверждены, возвращаться к «нет Cargo/MiKTeX/RDP» нельзя. Текущий код `SetForegroundWindow` не получил foreground из фонового Windows runner. Принятый PR #130 добавил ограниченную активацию **только принадлежащего TikZarium HWND**: проверить PID, WTSActive, unlocked Default; сначала обычный SetForegroundWindow; при необходимости временно связать input threads **только внутри той же session**, вызвать BringWindowToTop для своего окна, гарантированно detach в finally. После попытки повторно удостовериться, что GetForegroundWindow равен **тому же** HWND. Любой чужой PID, другой session, недоступный desktop или timeout → BLOCKED; никаких чужих PNG и SendKeys.

PR #130 **уже объединён**, его exact-main CI прошёл, но последующий personal run #42397730682 дал `NO_FOREGROUND_WINDOW`; W2 **не принят**. Следующая узкая QA-поправка проверяет нулевой foreground, используя только собственный GUI-поток того же сеанса/Default, временный `AttachThreadInput`, гарантированный detach и обязательное повторное сравнение HWND. Никакого вмешательства в чужое окно/рабочий стол, изменения UAC либо ложно-зелёного W2. Сначала Windows/macOS/Linux exact-head CI и PowerShell5.1 selftests, затем review/expected-head merge и **только trusted-main** персональный Windows runner. Владелец сохраняет свой RDP-сеанс активным/разблокированным и при необходимости вручную нажимает на **окно TikZarium**, если Windows foreground lock не разрешит автоматическую активацию. Не менять UAC.

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
- [ ] W1 реальный личный Server current-user MiKTeX PDF/Unicode/fonts/negative QA подтверждён.
- [ ] W2a реальная сессия/свой HWND/F1 и две проверенные client PNG подтверждены, без чужого desktop.
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
