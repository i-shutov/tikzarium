# Tikzarium — единый план поставок и приёмки

Дата актуализации: **11 ноября 2026**. Документ задаёт приоритеты и зависимости; он не заявляет, что запланированные функции уже реализованы или приняты.

## Текущий приоритет: UX в Windows 1.0

Владелец включил **все UX-F01…F14** из критического аудита в Windows 1.0. UX-работа является ограниченным исключением из feature freeze; массовые предметные GUI-адаптеры, новый TeX-интерпретатор, небезопасное выполнение, изменение UAC/учётных записей/MiKTeX/FlowBridge и обход source-safety в это исключение не входят. Стабильный тег и релиз остаются запрещены до фактического общего GO.

Авторитетные критерии по каждому UX-F, задачам T0–T8 и gates G1–G6 приведены в [owner override UX/1.0](../roadmap/WINDOWS_1_0_UIX_OWNER_OVERRIDE_20261110_RU.md), [исходном UIX-аудите](../insights/2026-11-10_CRITICAL_UX_AUDIT_RU.md) и [подробном UX-плане](../roadmap/UX_2026-11-10_RELEASE_PLAN_RU.md). Этот roadmap сводит их порядок с дальнейшими Scientific/AT поставками и не дублирует приложения.

### Порядок до Windows 1.0

| Очерёдность | Результат | Минимальная граница приёмки | Статус на срезе main `0a5dd9a8` |
| --- | --- | --- | --- |
| **UX1 — исходный код** | Полноценная TeX/TikZ подсветка в редактируемом TextEdit, физические номера строк, Find/Replace, Go to line, текущая строка, шрифт и visual wrap | G1: точные UTF-8/CRLF байты и безопасные диапазоны; native edit/Undo; G3 perf: 10k строк/1 MiB p95 ≤50 ms, первый editable frame ≤2 s, стресс 100k строк без потери ввода | **#167 IMPLEMENTATION_IN_PROGRESS; NOT full PASS** |
| **UX2 — рабочая область** | Шесть основных инструментов за один выбор, ясный sketch/PDF, компактный Inspector, единый Apply, доступная F1 и клавиатурный фокус | Нативные сценарии T3/T4, отсутствие перекрытия на согласованных размерах окна, все P1/P2 явно закрыты или отдельно решены владельцем | NOT_ACCEPTED |
| **UX3 — Save/Build/PDF** | Нативный Save & Build, объяснение недоступности, локализованная диагностика, состояния PDF absent/current/stale/error и отмена | T0/T5/T6/T7: точный `.tex`, внешний XeLaTeX, оригинальные source/PDF/log, отмена и возврат к last-good | NOT_ACCEPTED |
| **UX4 — масштаб и доступность** | Физическая проверка масштаба, keyboard/focus и крупных документов | Реальные Windows 10 проверки **100/125/200% = 96/120/192 DPI**, multi-monitor, IME отдельно от раскладки; доступность и performance | NOT_ACCEPTED |
| **W2b → W3 → W4** | Независимое завершение Windows release gates на точной версии продукта | Read-only readiness не считается GUI; нужны реальные W2b действия, физический Win10 W3 и exact-source portable/recovery W4 | W2b NOT_ACCEPTED; W3/IME/W4 NOT_RUN |
| **Stable 1.0** | Только после всех UX и Windows gates | Exact-head hosted evidence + независимые исходные физические доказательства + сводный owner GO | **NO-GO** |

**Обязательная последовательность:** UX1 → UX2 и UX3 → UX4 → W2b/W3/W4 → stable. UX2 и UX3 допускают параллельную реализацию после UX1-контрактов, но общий UX4/релизный GO зависит от обеих. Оценка календарных сроков пока не дана.

### Трассировка 14 UIX-находок

| ID | Основной результат | Веха |
| --- | --- | --- |
| **UX-F01** | Читаемая цветовая токенизация TeX/TikZ в editable source | UX1 |
| **UX-F02** | Ownership metadata различимо, комментарии пользователя сохраняются; перенос управляемый | UX1 |
| **UX-F03** | Gutter, текущая строка, Find/Replace и Go to line | UX1 |
| **UX-F04** | Различать эскиз новых объектов и PDF исходника; объяснить первое действие | UX2 |
| **UX-F05** | Удобный native Save & Build picker и явная отмена | UX3 |
| **UX-F06** | Шесть основных инструментов доступны за один выбор | UX2 |
| **UX-F07** | Компактный Inspector, единый Apply и короткие понятные подписи | UX2 |
| **UX-F08** | Убрать дублирование F1/context help, сохранив доступные подробности | UX2 |
| **UX-F09** | Реальные disabled states и объяснение недоступности действия | UX3 |
| **UX-F10** | Согласованный русский язык интерфейса и пользовательских статусов | UX3 |
| **UX-F11** | Раздельные состояния документа, сборки, ошибки и current/stale PDF | UX3 |
| **UX-F12** | Размер кода и адаптация интерфейса; физическая проверка масштаба | UX1 + UX4 |
| **UX-F13** | Семантические имена, видимый focus и keyboard/accessibility тесты | UX2 + UX4 |
| **UX-F14** | UX-приёмка предшествует массовым предметным GUI-адаптерам | Порядок всего плана |

Таблица служит краткой навигацией к первичному аудиту и owner override; acceptance detail, severity и evidence остаются в этих нормативных документах. Завершение вехи не устанавливается только по соответствию строки таблицы.

### Текущий срез и доказательства

- Базовый main для начала UX1: [`0a5dd9a81bd240ffe924630fadd8dfc53f9a36f9`](https://github.com/i-shutov/tikzarium/commit/0a5dd9a81bd240ffe924630fadd8dfc53f9a36f9). На этом срезе W0 hosted native/ZIP — **PASS**.
- W1 personal Server и W2a historical — **PASS** согласно [Windows release control](WINDOWS_1_0_RELEASE_CONTROL_RU.md). Исторический PASS не заменяет повторную проверку изменённой UX-версии.
- W2b — **NOT_ACCEPTED**. Чтение WTS состояния не доказывает настоящие pointer gestures, Undo/Save/Open, IME или GUI→XeLaTeX.
- W3 исторически имеет только ограниченный **96-DPI subset** на SHA `488a9687…`; он не проверяет новый UI. W3 на текущей UX-версии — **NOT_RUN**.
- Физический IME на новой версии и W4 — **NOT_RUN**. Server/Windows10 channel в этой сессии **BLOCKED_DIRECT_CHANNEL**; отсутствие живого доступа не переводит ни один gate в PASS.
- PR #167 находится в реализации; отдельные куски и green checks не являются полной UX1-приёмкой.
- Подробные исторические записи старого roadmap доступны в [GitHub blob на базовом main](https://github.com/i-shutov/tikzarium/blob/0a5dd9a81bd240ffe924630fadd8dfc53f9a36f9/docs/ROADMAP.md). Ссылки на первичные приложения ниже сохраняют provenance; отдельная копия старого файла не создаётся.

| Release gate | Смысл доказательства | Что не заменяет его |
| --- | --- | --- |
| **W0** | Exact-source hosted native/ZIP baseline, binary/archive provenance | Старый hosted run после изменения source |
| **W1** | Существующий personal Server MiKTeX/XeLaTeX workflow с PDF/font evidence | Успех компиляции на чужом TeX окружении |
| **W2a** | Исторический Server native GUI smoke/focus subset | Read-only RDP readiness или только HWND enumeration |
| **W2b** | Реальные взаимодействия Server GUI, Undo/Save/Open/IME/GUI-to-TeX | Пустой/pending Actions jobs list или read-only session probe |
| **W3** | Реальный Windows 10 GUI для точной UX сборки, DPI и IME | W3 исторического SHA `488a9687…`, hosted GUI или текстовый отчёт |
| **W4** | Финальный exact-source release artifact, rollback/recovery и независимая проверка | Сборка предыдущего SHA или создание release tag без GO |

Каждый gate имеет собственные доказательства в [release control](WINDOWS_1_0_RELEASE_CONTROL_RU.md). Здесь кратко отражён статус, а не создаётся второй release ledger. Если локальный Windows channel недоступен, записать `BLOCKED_DIRECT_CHANNEL` и сохранить физическую часть как `NOT_RUN`.

### Связанные PR: обзор границ, не таблица готовности

| PR | Роль в общем плане | Текущее использование |
| --- | --- | --- |
| [#167](https://github.com/i-shutov/tikzarium/pull/167) | UX1: редактор и навигация по исходнику | **IMPLEMENTATION_IN_PROGRESS; не full PASS** |
| [#165](https://github.com/i-shutov/tikzarium/pull/165) | AT0 intake/ledger для будущих примеров | Исследовательский вход; не закрывает UX или S0–S4 |
| [#156](https://github.com/i-shutov/tikzarium/pull/156) | Win10 Default-desktop QA probe | Инфраструктурная проверка; не продуктовый runtime и не физический W3 сама по себе |
| [#157](https://github.com/i-shutov/tikzarium/pull/157) | Документация локального Default-desktop QA | Контекст и runbook; не подтверждает доступный сейчас канал |
| [#146](https://github.com/i-shutov/tikzarium/pull/146) | Scientific-142 / будущий source work | После 1.0 в последовательности SC; отдельный L0–L4 gate |
| [#148](https://github.com/i-shutov/tikzarium/pull/148) | Scientific-142 / будущий source work | Не включать в Windows 1.0 UX scope |
| [#149](https://github.com/i-shutov/tikzarium/pull/149) | Scientific-142 / будущий source work | Не считать GUI-адаптеры принятыми по факту PR |
| [#151](https://github.com/i-shutov/tikzarium/pull/151) | Scientific-142 / будущий source work | Сохраняет независимую трассировку научного корпуса |
| [#128](https://github.com/i-shutov/tikzarium/pull/128) | Старый source metadata/Inspector draft | Выбирать полезные части после ревью; draft не заменяет UX1 lexer, integrity, Find/Replace, gutter и acceptance |

### Ближайший исполнимый блок

Сейчас завершить UX1 как единый проверяемый vertical slice на ветке текущего main: lexer и четыре темы в mutable source editor; gutter; Find/ReplaceAll/GoToLine; корректные selection/caret; native editing; байтовая целостность и интеграция с source revision/Undo. Затем провести независимый code review, strict Rust/targeted event tests и замеры G3. После реализации получить review UX1 и сделать реальную проверку в локальном Windows 10 GUI. Физический этап заблокирован до восстановления прямого Computer Use к VM-910136; hosted checks или статус задачи runner его не заменяют.

Перед расширением UX1 обязательно проверить: исходник CRLF/UTF-8/Unicode/неизвестные макросы, no-op и пустой query, Replace All как один обратимый edit, stale search result после внешней правки и Open, смешанный native/visual Undo, GoToLine на пустых/trailing строках и wrapped/unwrapped документе, IME composition и границы фокуса. Полная матрица критериев остаётся в [UX execution plan](../plans/2026-11-11_UX1_EXECUTION.md) и нормативных UX приложениях.

**Результат реализации 11.11 в PR #167:** редактор и кэш реализованы, 431 workspace test проходит, независимые code-review findings устранены; проверены отдельные нативные Linux-сценарии и четыре темы. [Оригинальные результаты и ограничения](../insights/2026-11-11_UX1_IMPLEMENTATION_RU.md). G3 остаётся **NOT_ACCEPTED**: полный relayout 100k-строчного повторяющегося fixture измеренно занимает около 0,8–2 с даже в release. Следующий обязательный шаг — уменьшить работу после правки и измерить реальные input-to-frame задержки; это не основание переносить UX1 или DPI за 1.0.

## После Windows 1.0: общий платформенный и предметный план

Работы ниже **не входят** в Windows 1.0. AT0/AT1 source intake и engine research могут идти параллельно UX-разработке, но не означают принятие новых GUI-адаптеров. Все новые предметные поставки сохраняют существующие ограничения редактора одного рисунка, source-preserving `SourcePatch`, внешнего TeX-компилятора и отсутствия автоматической установки пакетов.

### Путь Scientific-142

| Блок | Основной результат | Переход к следующему блоку |
| --- | --- | --- |
| **SC1 → SC2 + AT1/AT2** | Один активный рисунок, dependency snapshot для `.tex`/`.dat`/`\input`; ограниченный распознаватель, ownership/byte ranges, revision-checked `SourcePatch`/Undo; AT1 runtime и AT2 versioned package/library catalogue | L0/L1 provenance, source safety, негативные тесты OPAQUE/UTF-8/CRLF/revision conflict и общий редакторный контракт |
| **SC3 + AT4** | Первый PGFPlots adapter: `axis`, `\addplot`, expressions/data, Axis/Series Inspector и реальные внешние PDF примеры | Проверенные значения/единицы/диапазоны, сохранённый `compat=1.17` исходного корпуса, source/PDF/Undo exactness |
| **SC4–SC6** | Именованные пути/layers/fill, углы/размеры/формы, ограниченные PGF Math/`\foreach` data adapters | Fixture-level tests и ясный OPAQUE для нераспознанного синтаксиса; никаких координат, выведенных из PDF |
| **SCI142 L0–L4** | Отдельная интеграционная и научная приёмка исходного корпуса | 142 source cases с provenance, external compile, GUI edit/Undo и независимыми визуальными/научными критериями |

**Счёт корпуса SCI142:** **142 = 100 AK + 42 Sarov**. Это один отдельный корпус, не «100 плюс 142». В нём **103 нормативных requirements** из существующего `REQUIREMENTS.csv`; они не прибавляются к числу рисунков.

Подробности, файлы, версии, source, контрольные суммы и лицензии остаются в [Scientific-142 R4](../roadmap/Tikzarium_Scientific_142_R4/README.md), исходном [TRD](../roadmap/Tikzarium_Scientific_142_R4/docs/SCIENTIFIC_142_TRD_R4.md), [REQUIREMENTS.csv](../roadmap/Tikzarium_Scientific_142_R4/REQUIREMENTS.csv), `QA_MANIFEST.json`, `QA_MATRIX.csv`, `SHA256SUMS.txt` и `provenance/`. Не редактировать эти приложения этим roadmap и не мигрировать fixture молча.

### Общий пакет предметных примеров и навигации

Параллельная предметная цепочка после принятия UX-контрактов:

**AT3 geometry/graphs + AT5 STEM adapters → AT6 Figure Explorer для одного рисунка → AI88 S0–S4 и platform qualification.** AT4 PGFPlots одновременно использует SC3; готовность AT6 не создаёт многофигурный холст. AT6 индексирует и открывает один источник за раз, даёт переходы «пример → `.tex` → PDF/preview → требования», сохраняет возврат без потери текущего source.

| Область | Зафиксированный объём | Definition of Done |
| --- | --- | --- |
| AI TIKZ Skills source set | **88** конкретных примеров в 16 классах; отдельная ведомость source IDs и зависимостей | 88/88 с provenance, версиями, engine, независимыми S0–S4 evidence; PLANNED не считается PASS |
| Subject catalogue | **35** специализированных packages, плюс базовые `tikz` и `booktabs` вне этого счёта | Раздельно verified package/version, installed, loaded, compatible, GUI adapter и help; неизвестное состояние остаётся UNKNOWN |
| TikZ libraries | **23** именованные библиотеки из каталога | Source-aware Connect/Disconnect/Undo и явные engine/version/help status |
| Assistant contracts | **13** доступных skills | Версионированные контракты для поиска/QA/help; никакого произвольного исполнения skill-инструкций в продукте |
| Atlas / one-figure navigation | HTML/PDF atlas, source files, reference previews, error/stale status | Поиск и переходы по одному рисунку; недоступный исходник или skill показывается как отсутствующий |
| Platform qualification | Windows 10/11, macOS ARM, Linux и заявленные внешние engines | Отдельные exact-source GUI, compiler, PDF/font, visual, performance и platform evidence; ограничения обозначены явно |

**Engine mapping AI88:** 85 XeLaTeX и 3 LuaLaTeX (ID **65/68/86**). LuaLaTeX требует явного per-project opt-in и отдельной проверки после 1.0; он не становится скрытым fallback для XeLaTeX. Поддержка движка не равна проверке всех адаптеров.

**Разделять ведомости:** 88 AI examples и 142 Scientific figures не объединять. Учитывать в AI88 именно **35 packages / 23 libraries / 13 skills**; 142 корпуса остаются отдельными 100 AK + 42 Sarov с собственными 103 requirements. Не прибавлять 100 AK к 142 и не считать контракты/требования новыми примерами.

Существующие нормативные приложения хранят точные списки исходников, версий и лицензий: [AI TIKZ Skills support roadmap](../roadmap/AI_TIKZ_SKILLS_2026-11-10_SUPPORT_ROADMAP.md), [88-case CSV](../roadmap/AI_TIKZ_SKILLS_2026-11-10_88_CASES.csv), [references/SOURCES.md](../roadmap/Tikzarium_Scientific_142_R4/references/SOURCES.md), `references/DOMAIN_PACKAGES.md`, `references/IMAGE_EXAMPLES.md`, `dependencies/`, CTAN checksums, каталоги лицензий и подписанный R4 baseline. Авторские шрифты и сторонние файлы не перепаковывать без проверки прав.

### Общие правила готовности и статусов

- Различать `PLANNED`, `IMPLEMENTED_NOT_VERIFIED`, unit/event, hosted GUI, physical QA, independently accepted и blocked. PR, код или зелёный CI по отдельности не закрывают продуктовый gate.
- Exact-source проверки привязаны к принятому SHA и оригинальным `.tex`, PDF/PNG/log, зависимостям и контрольным суммам. После изменения source, engine, package version, `compat`, шрифта или renderer затронутые доказательства повторяются.
- Пользовательский XeLaTeX/MiKTeX остаётся внешним; shell escape выключен, автоматическая установка пакетов запрещена. Неизвестные TeX макросы/области остаются редактируемым исходником либо получают явный OPAQUE; не нормализовать комментарии, CRLF и Unicode без пользовательского решения.
- Историческая приёмка никогда не переносится на новый SHA или новый layout. Hosted Windows не равен физической Win10, а read-only readiness не равен GUI доказательству.
- Календарных обещаний нет. Оценка объёма делается после принятых вертикалей и фактических измерений, а не по числу PR, пакетов или файлов.

## Нормативные указатели

- [Windows 1.0 release control W0–W4](WINDOWS_1_0_RELEASE_CONTROL_RU.md) — статусы и release gates.
- [Owner override UIX/1.0](../roadmap/WINDOWS_1_0_UIX_OWNER_OVERRIDE_20261110_RU.md) — обязательный UX scope и критерии.
- [UX1 execution plan](../plans/2026-11-11_UX1_EXECUTION.md) — ownership, implementation/review boundary и acceptance checklist.
- [AI TIKZ Skills full support roadmap](../roadmap/AI_TIKZ_SKILLS_2026-11-10_SUPPORT_ROADMAP.md) — 88 examples, 35 packages, 23 libraries, 13 skills, sources and platform details.
- [Scientific-142 R4 README](../roadmap/Tikzarium_Scientific_142_R4/README.md) и [TRD](../roadmap/Tikzarium_Scientific_142_R4/docs/SCIENTIFIC_142_TRD_R4.md) — SC1–SC6, fixtures, L0–L4 и нормативные приложения.
- [Историческая версия roadmap на main `0a5dd9a8`](https://github.com/i-shutov/tikzarium/blob/0a5dd9a81bd240ffe924630fadd8dfc53f9a36f9/docs/ROADMAP.md) — dated context, не конкурирующая актуальная последовательность.
Точные acceptance records обновляются в соответствующих нормативных приложениях после получения нового проверяемого evidence.
