# UX1 — исполнимый план редактора исходника Windows 1.0

Дата: **11 ноября 2026**
База разработки: принятый `main` `0a5dd9a81bd240ffe924630fadd8dfc53f9a36f9`.
Статус: **PR #167 IMPLEMENTATION_IN_PROGRESS; UX1 NOT_ACCEPTED**.

Этот план фиксирует минимальную реализационную вертикаль, независимое ревью и условия UX1-приёмки. Он подчинён [owner override Windows 1.0](../roadmap/WINDOWS_1_0_UIX_OWNER_OVERRIDE_20261110_RU.md) и [общему roadmap](../docs/ROADMAP.md). План не является утверждением, что код или gates завершены.

Выполненный код, 431-test workspace, независимое ревью, оригинальные Linux native PNG/source и measured performance limitations зафиксированы в [отчёте реализации](../insights/2026-11-11_UX1_IMPLEMENTATION_RU.md). Полный UX1 остаётся NOT_ACCEPTED до G3 и Windows-приёмки.

## 1. Результат UX1

Пользователь работает с обычным `.tex` в настоящем редактируемом source editor. Он может быстро прочитать TeX/TikZ, найти или заменить текст, перейти к физической строке и сохранить привычные редакторные действия. Подсветка — presentation layer поверх того же mutable source buffer; она никогда не переписывает документ ради формата, токенизации, wrap, поиска или навигации.

В состав UX1 входят:

- Детерминированные токены TeX/TikZ и четыре визуальные палитры: Light, Dark, Midnight, Paper.
- Реальная подсветка внутри mutable `TextEdit`, включая comments/metadata styling, TeX commands, группировку, options, числа/units и распознаваемые поддержанные TikZ части. Неизвестный макрос остаётся валидным пользовательским текстом.
- Номера исходных физических строк в gutter, подсветка текущей строки, Find/Replace/Replace All, Go to line, выбор найденного диапазона и сохранение позиции/фокуса при навигации.
- Управление шрифтом 12–24 pt и visual soft wrap. Перенос и темы меняют galley/layout, не байты TeX и не физические номера строк.
- Native keyboard editing, IME composition и обычный text Undo/Redo; согласование с source revision и существующим visual `Session` Undo.

## 2. Ownership и границы реализации

| Роль | Действие | Изменяемая зона / граница |
| --- | --- | --- |
| **Sol — lexer** | Проверяет минимальный лексический контракт, token classes, Unicode-safe byte spans и presentation-only rendering | `crates/tikzarium-app/src/source_highlight.rs` только. Не меняет source, не создаёт TeX parser и не добавляет GUI control |
| **Sol — editor** | Интегрирует gutter, Find/Replace/GoToLine и editor navigation | `crates/tikzarium-app/src/main.rs`, `source_editor.rs` и `source_navigation.rs`; не меняет другие UI панели и доменные adapters |
| **Luna — read-only review + docs** | Независимо просматривает тестовые риски, требования, edge cases и этот execution/roadmap текст | Только review-комментарии и разрешённые документы; не конкурирует за source editor files |
| **Astra — integration** | Сводит API/ownership между mutable TextEdit, lexer, navigation state и `Session` revision/Undo; проверяет coherent final diff | Разрешённая кодовая интеграция и координация; не ослабляет release/safety gate |

Роли обозначают ответственность и не дают права менять чужие области. Если контракт не согласован, интеграция останавливается на конфликтующем фрагменте и возвращает точный вопрос/вариант, а не вводит второй независимый буфер редактора.

## 3. Исходные архитектурные инварианты

- `show_source_text_edit` показывает один `egui::TextEdit::multiline` над `Document.source`. Gutter, Find и line navigation должны продолжать обращаться к этому буферу.
- `fence_source_editor_undo_on_revision_change` и `reset_source_editor_undo_history` не допускают, чтобы egui native Undo восстановил старый снимок поверх подтверждённой visual/source транзакции. После external source mutation fence очищает native undoer на следующем редакторном кадре; навигация без mutation не должна выставлять fence.
- `Session::source_revision()` связывает source caret/selection и ревизионно-чувствительные операции с текущим текстом. `Session::sync` при фактической source mutation повышает revision и отзывает visual patch Undo/selection. `Session::reset` переинициализирует session для нового документа; одна числовая revision недостаточна как глобальная идентичность двух разных файлов.
- `load_path` заменяет `Document`, вызывает `authoring.reset`, очищает `source_caret`/`jump_to_line` и выставляет native Undo fence. Любое UX1 cached match, byte range, caret или query result должен быть очищен или проверен на document identity, revision и snapshot source.
- Поиск/подсветка использует Unicode-safe ranges. Перед применением замены диапазон подтверждается границами UTF-8 и актуальной source revision. Rendering не превращает metadata styling в ownership на правку.
- Go to line — только навигация. Не менять байты, dirty state, source revision, visual Undo и native Undo. Номер строки 1-based, считается по `\n`; `\r` в CRLF не становится содержимым редактируемой строки.

## 4. Минимальная последовательность реализации

1. **Закрепить editor API.** Один source buffer, стабильный widget identity и явное state ownership для Find query, найденных диапазонов, selected match, current line и document/revision identity.
2. **Завершить lexer.** Ограниченная однопроходная токенизация с безопасным fallback, bounded work на длинной/неполной TeX строке и spans только по существующим source bytes. Подсветка не синтезирует source patch.
3. **Добавить навигационные действия.** Gutter и GoToLine используют line/cursor mapping без изменения source; Find обновляет selection и scroll/caret без потери клавиатурного фокуса редактора при явной команде.
4. **Подключить замену.** Replace/Replace All проверяют ревизию и диапазоны до mutation. Replace All меняет source одним неделимым application transaction и определённо взаимодействует с Ctrl+Z/Redo, native TextEdit history и visual Undo.
5. **Подключить revision fence.** Source-changing Find/Replace операции проходят единый предусмотренный source-change path; no-op и чистая навигация не повышают revision. Смена документа invalidates cached state независимо от совпадения числового revision.
6. **Провести targeted tests и review.** Проверить byte equality, editing ownership, empty/no-match cases, history order, IME/focus и большие документы. Никакой зеленый unit/event test не выдаётся за physical native acceptance.
7. **Провести Windows native acceptance.** На точном source SHA и точном EXE проверить реальную Win10 физическую машину, редакторные gestures, IME и DPI. До появления канала прямого Computer Use VM-910136 этот пункт остаётся BLOCKED.

## 5. Обязательные регрессионные сценарии

Сценарии должны проверять окончательную строку и её UTF-8 bytes, dirty state, source revision, byte ranges/selection, native/visual Undo availability и состояние фокуса там, где оно относится. Минимальные входы используют `% русский комментарий`, opaque macro, emoji, `\r\n`, пустые строки и trailing newline.

| ID | Действия | Условие успеха |
| --- | --- | --- |
| **U1-SRC-01** | Find и GoToLine на документе с Cyrillic, emoji, opaque macro, CRLF и trailing CRLF; сохранить копию исходных bytes до действий | Source bytes, dirty flag и revision не меняются; Find/GoToLine выбирают целый Unicode диапазон/верную physical line; прежний native Ctrl+Z остаётся рабочим |
| **U1-SRC-02** | Replace All нескольких совпадений рядом с CRLF и комментарием, затем Ctrl+Z один раз и Redo | Одна атомарная операция; Undo возвращает byte-identical исходник, Redo — byte-identical результат; нет потери комментариев, CRLF или соседнего opaque кода |
| **U1-SRC-03** | Найти и заменить multi-byte Cyrillic/emoji строку при курсоре до/после UTF-8 символа | Selection и replacement boundaries всегда являются char boundaries; результат не содержит повреждённого UTF-8 и не сдвигает неподходящий текст |
| **U1-SRC-04** | Replace All с пустым query, no matches, empty replacement и совпадением внутри CRLF boundary | Empty query запрещён/объяснён; no-op не меняет source/revision/dirty/Undo; пустая replacement корректно удаляет только точные подтверждённые совпадения |
| **U1-SRC-05** | В документе A получить match; открыть документ B с совпадающим содержимым или совпавшим числовым revision; нажать Replace/GoToLine из старого результата | A-result инвалидируется при смене document identity; никакое старое byte range не применяется к B; B остаётся byte-identical |
| **U1-SRC-06** | Создать визуальный primitive patch; затем Replace All; смешанно нажать native Ctrl+Z и visual Undo в утверждённом порядке | Старый egui snapshot не воскресает поверх текста; каждая Undo отменяет именно верхнюю source transaction один раз; визуальная история отзывается/сохраняется согласно явно заданному контракту без молчаливой потери пользовательского текста |
| **U1-SRC-07** | Сделать Replace All; затем применить visual patch; выполнить оба Undo и соответствующие Redo | Source проходит обратную последовательность без потери replacement, визуального изменения или правки пользователя; порядок стабилен для сочетаний клавиш и кнопки Undo |
| **U1-SRC-08** | Получить results, затем вручную изменить текст, paste/IME commit, undo, reopen или вызвать другой external mutation; применить Replace | Stale result обнаруживается по document/revision/source snapshot; ranges пересчитываются или операция отказывается с безопасным сообщением; unrelated bytes не меняются |
| **U1-SRC-09** | GoToLine по первой/последней строке, пустой строке, trailing newline, перед/после multibyte text, при soft wrap включённом и выключенном | Физический 1-based номер и caret соответствуют одному и тому же исходному месту; только galley geometry/scroll отличается; байты/revision/history неизменны |
| **U1-SRC-10** | Ввести незавершённую IME composition, открыть Find/Replace/GoToLine, отменить поиск, затем commit текста | Composition не теряется/не заменяется prematurely; source содержит ровно введённый committed text; фокус и selection возвращаются предсказуемо |
| **U1-SRC-11** | Перевести фокус source editor → query field → source; Ctrl+Z нажать в обоих контекстах | Query Undo меняет только query; source Undo меняет только source; без фокуса source команда Replace/Replace All не применяется случайно |
| **U1-SRC-12** | Обновить query и выполнить Replace/Enter в одной frame последовательности, во время long scan либо после document reopen | Замена использует только подтверждённый query/revision пары; никакой предыдущий result snapshot не применяется к свежему тексту |

Порядок блокирующего ревью: **01–05, 06–08, 10–12, 09**. Любой провал source bytes, старой ревизии/документа, Undo восстановления или незавершённой IME composition блокирует acceptance.

## 6. Acceptance gates

### G1 — Source integrity и Undo

- Темы, font size, wrap, gutter, search highlighting, Find, GoToLine, scroll и help не меняют `.tex` bytes.
- Все source replacements применяются только к свежим ranges на валидных UTF-8 boundaries с сопоставленными document identity/revision/source snapshot.
- UTF-8, CRLF/LF, комментарии, пробелы, незнакомые макросы, `\verb`, verbatim-like areas и escaped `%` сохраняются без ненамеренного переписывания. Lexer uncertainty влияет на цвет, не на содержимое и редактируемость.
- Find/ReplaceAll имеет определённое no-op поведение и явную обратимость. Mixed native/visual history не resurrect-ит утраченную старую строку. Open/Reopen документально отделяет native undo history двух source buffers.
- Save/Open round trip побайтово сохраняет source. Dirty marker отражает реальные source изменения; navigation-only команда dirty flag не меняет.

### G2 — настоящий редактор и взаимодействие

- Полная синтаксическая подсветка видна в самом редактируемом source editor, а не в отдельном read-only preview.
- Реальные native действия: insert/select/delete, Find/Replace, GoToLine, keyboard Undo/Redo, tool selection/source focus, F1, Save/Open и Run-level IME composition.
- Проверить Light/Dark/Midnight/Paper, font min/max, wrap/no-wrap, длинный коммент и переход source↔inspector без потери caret или незавершённого edit.
- Physical GUI evidence принадлежит только окну TikZarium, с проверенным exact SHA/EXE и без снимка постороннего desktop.

### G3 — производительность

- Benchmark должен назвать машину, Windows build, resolution/DPI, backend/renderer, EXE SHA, corpus, количество строк/байтов и метод измерения.
- На 10 000 строк / около 1 MiB: p95 event-to-frame ≤50 ms и first editable frame ≤2 s. Отдельно записать p95 и максимум lexer/highlight, Find navigation и ReplaceAll transaction.
- На 100 000 строк / около 10 MiB: не терять события/символы; редактор остаётся usable, тяжёлые результаты ограничены/отложены либо имеют явный безопасный статус.
- Вводить incremental lexing только если измерение подтверждает необходимость; любая кэшированная токенизация/Find index связана с document identity + revision, bounded и безопасно инвалидируется.

## 7. Результаты и порядок статусов

Для UX1 принять один coherent diff и сохранить provenance: source SHA, cargo/toolchain, rust checks, targeted test output, source fixtures/hash, performance evidence, точный EXE SHA и GUI evidence. Code review не заменяется self-review автора реализации.

Статусы не сворачивать:

1. `IMPLEMENTATION_IN_PROGRESS` — изменения в работе; это текущая метка #167.
2. `IMPLEMENTED_NOT_VERIFIED` — код завершён, evidence ещё нет.
3. `UNIT_EVENT_PASS` — конкретные source contracts/events прошли автоматические проверки.
4. `HOSTED_GUI_PASS` — exact-head hosted environment прошёл заявленный GUI сценарий; это не физическая Win10 приёмка.
5. `BLOCKED_DIRECT_CHANNEL` — необходимый локальный GUI/environment channel отсутствует. Текущий Computer Use показывает управляемый Linux desktop, не VM-910136.
6. `PHYSICAL_PASS` — независимое физическое доказательство на текущей Win10 target/EXE/SHA; конкретный G2 статус.
7. `ACCEPTED` — owner/release criteria закрыты и результат включён в общий release ledger.

Нельзя назвать UX1 full PASS до G1 + G2 + G3 и независимого review. **Прямой Windows канал сейчас `BLOCKED_DIRECT_CHANNEL`;** никакой срок его восстановления не обещан. Разработка и проверяемые unit/event/performance части могут продолжаться, но physical acceptance остаётся `NOT_RUN/BLOCKED` до фактического доступа.

## 8. Явные исключения и ссылки

- Данный этап не вводит новый TeX interpreter, семантический парсер всех macro, новых domain package adapters, auto-install, shell escape или изменение пользовательского TeX без явного действия.
- Версии package, source/license provenance и 103 Scientific requirements остаются в нормативных исходных приложениях; UX1 их не переопределяет.
- Для всех UX-F и релизных блокировок см. [UIX owner override](../roadmap/WINDOWS_1_0_UIX_OWNER_OVERRIDE_20261110_RU.md); для прежних подробных UX задач и T0–T8 см. [UX release plan](../roadmap/UX_2026-11-10_RELEASE_PLAN_RU.md); текущий консолидированный порядок см. [docs/ROADMAP.md](../docs/ROADMAP.md).
