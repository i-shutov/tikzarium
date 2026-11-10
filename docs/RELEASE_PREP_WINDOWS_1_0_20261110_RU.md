# TikZarium 1.0 Windows — подготовка выпуска (10.11.2026)

> **Режим:** RELEASE PREPARATION / QA CANDIDATE. Не stable GO и не разрешение публиковать `v1.0.0`. Владелец сообщил, что технические блокеры сняты. В публичной базе доказательств при проверке отсутствовала завершённая физическая приёмка W2b/W3. Это две разные констатации: можно готовить пакет сейчас, но нельзя выдумывать результаты физического тестирования.

## 1. Источник и уже проверенная сборка

- На момент начала этой подготовки канонический `main`: `488a9687c404f9714eecbcb8ccb4edbf97a54d89` (PR #150, #152, #153 уже включены).
- [Исходный hosted CI #42801981799](https://github.com/i-shutov/tikzarium/actions/runs/42801981799) — **SUCCESS**: Windows x64 native PE/CLI/ZIP, macOS ARM64 native, Linux XeLaTeX fixtures. [D QA #42801982082](https://github.com/i-shutov/tikzarium/actions/runs/42801982082) — **SUCCESS**, Windows/macOS/Linux; [Admin regression #42801981806](https://github.com/i-shutov/tikzarium/actions/runs/42801981806) — **SUCCESS**; [Windows 10 scripts syntax #42801981821](https://github.com/i-shutov/tikzarium/actions/runs/42801981821) — **SUCCESS**.
- Переносимый Windows x64 candidate: Actions artifact **13755873935**, имя `tikzarium-windows-x64-portable-candidate` в run #42801981799. Внешний ZIP SHA256 `68a2085ea045c1c72cf426e267c20c973edd377d8e1ca9fdf2be7b42f5b715b4`; вложенный файл `Tikzarium-Windows-x64-portable-candidate.zip` размер 3 779 362 байта и SHA256 `17f30f6b6d9d7a2c6bae24dc81ab17b010564ae2882ad37014265903e6c4b595`.
- **Независимая проверка вложенного кандидата завершена:** ZIP CRC/распаковка — PASS; все пять файлов совпадают с `MANIFEST.sha256`; `PROVENANCE.json` содержит точный исходный SHA и `physical_windows10=NOT_RUN`. Приложение SHA256 `f8f534d36d5fd26fcef5f8c47094871bc81882c3cfbb25411ad46975da3915a5`; CLI SHA256 `aae564e8198c5adeabda4b32aadf1a3f435b9e01ff5cacd8892f5acf5b36b50c`. Формальная карточка: [release candidate manifest](../release/candidates/windows10-x64-main-488a9687.json).
- **Граница:** standalone hosted ZIP не содержит уже настроенного MiKTeX/XeLaTeX, не является MSI/EXE-инсталлятором, не имеет подтверждённой подписи. Isolated Mesa llvmpipe использовалась **только для QA под RDP**, не входит в пользовательский пакет.

## 2026-11-10 — первый реальный W3 GUI subset PASS (по отчёту Codex, до независимой приёмки)

На Win10 Pro 22H2 `VM-910136` под Admin после перехода на активный `WinSta0\Default` из **одного интерактивного контекста** реально запущен TikZarium и выполнены `PrintWindow` owned-client capture и ввод. Codex сообщает PASS для F1, scratch Build и Escape без сохранения, Save & Build, GUI PDF export, шести TikZ-примитивов, Undo и Save/Open. После второго Undo TEX побайтно соответствовал сохранённому состоянию шести фигур. **Это результат физического локального теста, но оригинальные PNG/TEX/PDF/log/SHA ещё не были независимо изучены здесь.**

С ограничением шрифта выявлена причина: [quickstart.tex](../examples/quickstart.tex) использует `every node/.style={font=\sffamily}` без `\setsansfont`. Latin Modern Sans в текущем TeX-окружении не содержит требуемой кириллицы; XeLaTeX сообщил `Missing character` для «Точка». После явного `\setsansfont{Arial}` GUI собрал PDF, `pdftotext` восстановил «Точка», `pdffonts` подтвердил Arial и ToUnicode. Не изменять чужие исходники и не отключать проверки glyph; оформить ограничение в [issue #159](https://github.com/i-shutov/tikzarium/issues/159). Вставка кириллицы через clipboard **не равна проверке IME**.

**Оставшиеся NOT_RUN:** Windows IME, DPI 125/200%, независимый оригинальный аудит с ручным визуальным подтверждением, испытание на финальном source/EXE SHA. Оригиналы: `C:\Users\Admin\Documents\TikZarium-QA\evidence\w3-native-20261110-061007\RESULTS.md` и соседние PNG/TEX/PDF/log/SHA. Сейчас исходная сборка имеет SHA `57cb62e4`, newer main `488a9687`: линейная история `57cb62e4` → `449857c5` → `488a9687`, подтверждено GitHub compare (`ahead_by=2, behind_by=0`), не конфликт веток. Сама GUI-функция Save&Build уже есть в 57cb; два более поздних коммита добавляют W3-аудитор и Windows bootstrap.

**Блокер рабочего стола [#154](https://github.com/i-shutov/tikzarium/issues/154) закрыт** только в части исполнения: `CodexSandboxDesktop` больше не блокирует этот тест. Формальный W3 остаётся **NOT_ACCEPTED** до independent QA; W2b и W4 самостоятельные NO-GO. Детали: [W3 native checkpoint](W3_WIN10_20261110_NATIVE_GUI_CHECKPOINT_RU.md).
## 2026-11-10 — повторный контроль: оригинальный W3 архив собран, формальная приёмка не пройдена

**Факты из локального отчёта Codex, а не из независимо открытых здесь файлов:** собран архив `C:\Users\Admin\Documents\TikZarium-QA\evidence\w3-independent-review-20261110.zip`. SHA256 `7516DB3C57C140D314A44725C0BF2F9E89DF4CD27AA44AF210E11895AF3E7716`. **63 оригинальных файла** совпали с копиями в архиве, ZIP CRC проверен локально. Эта локальная проверка не подтверждает семантическую полноту W3 и не делает файл доступным из другого компьютера: ссылка `C:/Users/Admin/...` не является публичной или подключённой к GitHub. Архив не должен публиковаться в открытом репозитории без приватного просмотра исходных окон/путей/секретов.

**Проверено дополнительно:** физические клавиши при русской раскладке ввели «тест» и сохранили его в `.tex` (без clipboard, без Unicode injection). Это `NATIVE_RUSSIAN_LAYOUT_KEYBOARD_PASS` **по отчёту Codex**. **Composition/preedit IME всё ещё `NOT_RUN`**, но это *отдельный* тест IME для языков со составным вводом (японский/китайский/корейский), а не свойство обычной русской раскладки. Не объявлять `IME PASS` и не объявлять `RUSSIAN_KEYBOARD NOT_RUN`. Ссылки: [Microsoft IME overview](https://learn.microsoft.com/en-us/windows/apps/develop/input/input-method-editors) и [русская раскладка ≠ IME composition](https://support.microsoft.com/en-us/windows/hardware/input-devices/advanced-input-methods-for-east-asian-languages).

**DPI 125%/200% = `NOT_RUN`**: текущий GUI прогон шёл при 96 DPI (100%). Прежний запрет на изменение системных/RDP настроек сохранён. Для физической DPI приёмки нужна заранее согласованная **временная QA-конфигурация масштаба** (с возвратом исходного значения) либо другая заранее настроенная интерактивная сессия/VM, допускающая 120/192 DPI. Нельзя объявить физическую DPI приёмку путём resize PNG, DPI virtualization, смены `SetThreadDpiAwarenessContext` только у тестового helper без фактического UI масштабирования.

**Аудитор v1 `qa_w3_physical_evidence.py` исходного main `488a9687` вернул `FAIL_ORIGINAL_W3_EVIDENCE`**, первая ошибка — отсутствие `w3-original.json`. Дополнительно по независимому локальному обзору отсутствуют снимки отдельных состояний исходника и reopen, полный structured event trace, доказательство связи исполнявшегося EXE с *финальным* release SHA. Отдельный ручной обзор подтвердил последовательное появление шести фигур, но в PDF с Arial `Точка` визуально **пересекает исходный узел TikZarium** из-за выбранных координат тестовой вставки; отдельно зафиксировать это как **проблему QA fixture layout**, не автоматически как дефект geometry engine. **Не перерисовывать оригинальные доказательства**; при повторном тесте выбрать непересекающееся размещение и честно объяснить изменение условий.

**Точное состояние:** source `488a9687` собран локально offline, новый debug EXE SHA256 сообщён как `D1585C62…977D0A776`, а EXE первого реального GUI прогона — `2AD442EE…5BC67522`; эти усечённые хеши не позволяют произвести SHA256-приёмку. Полный GUI-проход новой сборки **`NOT_RUN`**. Сохранить полные SHA256 в релизной ledger перед формальным W3 PASS и проверить именно нужный candidate EXE.

**Решение:** `W3 = NOT_ACCEPTED`; independent original evidence & review `NOT_RUN` в этом чате до получения байтов архива; DPI120/192 `NOT_RUN`; native keyboard RU = PASS by report; IME composition = `NOT_RUN`. Не создавать искусственный `w3-original.json` с неподтверждёнными событиями. `W4 stable = NO-GO`. Недостатки evidence-package — не доказательство дефекта TikZarium. Релизная подготовка продолжается без изменения `main`.
## 2. Приёмочные ворота (status по GitHub, не только словам)

| Gate | Известно сейчас | Условие закрытия |
| --- | --- | --- |
| W0 — PE, Cargo.lock, Windows portable ZIP, источники, CI | **PASS hosted** для исходного SHA выше | Перед релизом повторить на неизменённом release SHA; записать SHA ZIP и EXE |
| W1 — реальный внешний XeLaTeX, PDF, Arial/ToUnicode | **PASS по предыдущим оригинальным материалам**; также Admin Windows10 CLI→PDF 16 449 bytes и 3/3 UTF-8 извлечения | Повторная связка с точным release SHA и сохранённым оригинальным PDF |
| W2a — Windows Server owned HWND, полный client PNG, F1 | **PASS** на исторически проверенной версии Server | Подтвердить отсутствие регрессии на финальном SHA |
| W2b — вся вертикаль Server GUI | **NOT_ACCEPTED по доступным доказательствам** | Оригинальные шесть жестов, Undo/Save/Open/IME/DPI, GUI→XeLaTeX PDF, PNG и SHA, независимая приёмка |
| W3 — отдельная физическая Windows 10 x64 | **NOT_ACCEPTED по доступным доказательствам**, несмотря на сообщение владельца о снятии блокеров | Настоящий активный Default desktop; проверка точного EXE из portable ZIP, Save&Build, F1, шесть жестов, Undo/Save/Open, 100/125/200% DPI, GUI-origin PDF; оригинальные evidence + ревью |
| W4 — чистая установка, удаление, подпись, документация | **NOT_RUN** | Чистая Windows10 VM, честно указанный статус подписи, описание зависимостей, пробный откат; повторяемый package + source-bounded manifest |
| Stable `v1.0.0` | **NO-GO до закрытия обязательных gate** | Обновление канонического [W0–W4 release control](WINDOWS_1_0_RELEASE_CONTROL_RU.md) с источниками PASS, approve release, финальный GitHub Release |

Не отождествлять успешный `cargo build` / hosted GitHub Actions / самопроверку PDF / GUI START со всей физической W3. [Принятый аудитор PR #153](../scripts/tools/qa_w3_physical_evidence.py) проверяет **структуру** оригинальных материалов и даже при успехе не превращает synthetic evidence в W3 PASS.

## 3. Приоритеты и порядок реальной подготовки

1. **Заморозить скоуп 1.0**: только Windows10 x64 и существующая TikZ-native вертикаль (обычный `.tex` рядом с canvas, справка, 6 примитивов, свойства, Undo/Save/Open, внешний XeLaTeX PDF, Unicode). Не тащить SC2/SC3, N4, CAD или новую функциональность из draft PR в релиз.
2. **Разобрать открытые релизные PR:** [#155](https://github.com/i-shutov/tikzarium/pull/155) — строгая provenance/защита stale EXE и Mesa; [#156](https://github.com/i-shutov/tikzarium/pull/156) — Win10 Default-desktop QA probe; [#157](https://github.com/i-shutov/tikzarium/pull/157) — документация Codex. Включать только после ревью, CI и проверки отсутствия регрессии; каждый merge меняет релизный SHA. Не объявлять текущий candidate финальным после новых коммитов.
3. **Завершить/принять реальные W2b и W3** без повторной установки: использовать существующий Admin, активный RDP Default, CLI/MiKTeX инструменты; сохранить исходные Windows10 GUI PNG, `.tex`, PDF, log, версию GPU/DPI, hash manifest. При подтверждении закрыть [#154](https://github.com/i-shutov/tikzarium/issues/154) с ссылкой на оригинальный результат, а не просто текстом «blocker removed».
4. **W4 clean-machine qualification:** взять точный Windows portable ZIP из release SHA, проверить CRC/manifest в папке с пробелами/кириллицей, отсутствие системных DLL подмен и MSI-фальшивой установки; проверить запуск, удаление только новой папки, отсутствие изменения MiKTeX/шрифтов/registry, сценарий запуска на нормальном GPU и отдельно RDP без GL2. Сохранить репорт.
5. **Завершить релизные материалы:** [черновик release notes](RELEASE_NOTES_WINDOWS_1_0_DRAFT_RU.md), системные требования, external MiKTeX, Known Issues, ограничения RDP/OpenGL, проверяемая подпись/её отсутствие, SHA256, восстановление/откат.
6. **Только после W2b/W3/W4 GO:** пересобрать и зафиксировать exact `main`/release commit, повторить native CI и независимый QA, опубликовать `v1.0.0` с доступными assets и проверенным manifest. Linux RC1 и macOS ARM64 не переименовывать в физически принятые stable Windows.

## 4. Правила выпуска и отката

- Любой физический gate без оригинальных доказательств = **NOT_ACCEPTED**, не PASS. При блокере остановить публикацию stable, не отменять ранее проверенную сборку.
- Если код меняется после формирования portable ZIP: старый ZIP остаётся исследовательским кандидатом, новая сборка получает новый источник SHA и полный W0/W4 аудит.
- Не подписывать неизвестным сертификатом, не заявлять наличие EV/OV подписи, не отключать SmartScreen/UAC или системный антивирус; подписывание отдельно согласовывается с владельцем.
- Release не должен требовать Mesa, собственных системных драйверов, GitHub Runner, Codex, Dot, доступа к сервисам либо изменения политики RDP. MiKTeX ставится пользователем отдельно; standalone archive не содержит TeX и файлы шрифтов.
- Сохранять user-data integrity contract: не перезаписывать чужие `.tex`, не регенерировать неизвестные макросы из CAD-модели, не терять кириллический Unicode.

## 5. Что готово к немедленной передаче на QA

Оригинальный **неподписанный/неаттестованный на подпись переносимый ZIP-кандидат** из run #42801981799, SHA `17f30f6b6d9d7a2c6bae24dc81ab17b010564ae2882ad37014265903e6c4b595`, все файлы сверены. Имеет статус `QA_CANDIDATE_ONLY`; стабильный релиз не опубликован, stable release tag не создан.

Этот документ не исправляет за прошлое физические недостатки, а даёт замкнутый маршрут от текущего рабочого кандидата до честной Windows 1.0 stable.
