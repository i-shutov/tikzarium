# Текущий план работ — Scientific Studio первой, Data последней

Редакция SCIENCE_FIRST_DATA_LAST, 11 ноября 2026. Главный маршрут — [docs/ROADMAP.md](../docs/ROADMAP.md). Этот файл заменяет прежний исполнительский порядок ST1/ST2 Graphviz-first в PR #173, не создаёт второй roadmap.

## 1. Последняя директива и текущий фокус

**Научная графика → UML → BPMN → инженерия → химия/биология → анимация → остальное → данные.** Полноценная Studio сохраняется как цель. Сейчас исполняем только ST-SCI и необходимый для него ST-BASE; следующие продуктовые этапы имеют QUEUED_BY_PRIORITY.

Не запускать Data Figure, обработку/анализ данных, отдельные Vega-Lite/Matplotlib/Gnuplot/Plotly adapters, обязательную тройку Graphviz/D2/Mermaid или полный междвижковый compositor как предварительное условие научного редактора. Общий build API подтверждаем существующим XeLaTeX, затем Asymptote и Typst/CeTZ. Уже обязательные PGFPlots/SCI142 .dat/.csv fixtures и dependency hashes сохраняем сейчас, без нового data UI.

## 2. Проверенная отправная точка

- Remote main перед правкой: `a2a6c79ee14c58282da8a4a1106392faf9643029`, tree `66bfe37efa3ec3b7286c8fa07785db55c96d18ea`.
- #167 уже находится в main. Полная UX1/G3 и native Windows приёмка не объявляются закрытыми по этому факту.
- #172 по свежему API OPEN/DRAFT, head `fef081d7481bd095182c2e74e5eb830cbd1e6612`. Это отдельная незавершённая ветка, не принятая новая Studio. Прерванная правка из чата не считается commit.
- #169 design system, #170 native Studio, #171 independent QA сохраняются, получают научный приоритет; не плодить дубли задач.
- Текущая операция — согласование пяти документов, commit/push и синхронизация task threads. Runtime, tests, fixtures, dependencies, workflows, ОС и release versions не меняются. Доступность Win10/Server в этом блоке не проверяется и не предполагается.

## 3. Ближайшие пакеты: вход, результат, владение, приёмка

| Пакет | Исполнимый результат | Файлы/границы | Обязательная проверка |
| --- | --- | --- | --- |
| SCI-01 / #172 | Довести direct-tool UI до пригодной базы: six tools, Properties, primary Build, честные состояния | studio_ui.rs и выделенные UI modules; main.rs только интегратор | fmt/clippy/workspace tests, production raw-input events, реальные screenshots; F1/Undo/Save/Build/source intact |
| SCI-02A / #169 | Четыре согласованные темы, типографика, отступы, иконки, focus/disabled/error | ui_theme.rs / isolated design tokens; не core/main.rs | Contrast, theme persistence/startup, figure-source invariance, compact 1180×680/1366×768 |
| SCI-02B / #170 | Научная рабочая область, компактные координаты/единицы, один Apply, единая F1; безопасные document tabs | studio shell/Inspector modules, catalogue fields согласованно | Создать/править научную фигуру, не терять draft/focus/Undo при tabs/F1; без пустых декоративных панелей |
| SCI-03A / editor G3 | Bounded document/editor state, revision/history/view; исправить memory/full-layout costs | Source/editor/document modules; общие contracts через integrator | UTF-8/CRLF/opaque, mixed text/visual Undo, external edits, 3-document scenario; native 10k p95 и 100k stress отдельно от CPU |
| SCI-03B / build contract | Общий request/result/artifact/profile, в котором текущий XeLaTeX ведёт себя не хуже | tikzarium-core build/diagnostics + CLI adapter; не UI layout | Missing executable, error/cancel/child cleanup, revision/dependency invalidation, last-good/stale и правильный файл диагностики |
| SCI-04 / SC1–SC6 + AT4 | Научный SourcePatch/catalogue, PGFPlots один раз для двух корпусов; paths/fill/dimensions/macros по scope | extensions/catalogue и scientific modules; originals не редактировать | Реальная GUI-правка + Undo + внешний PDF; geometry/formula/unit checks; scientific acceptance, сохранённый compat/data |
| SCI-05 / дополнительный научный engine | После согласованного build API: upstream audit + Asymptote vertical, затем Typst/CeTZ; scoped Penrose feasibility | Один adapter/fixtures за раз; API changes только согласованно | Engine/version/licence facts; source→build→preview→parameter→Undo→export в Studio, negatives и declared platform |
| SCI-QA / #171 | Независимая проверка научного маршрута, интерфейса и оригиналов | QA scripts/fixtures reports/review, не production code автора | Exact source/EXE/artifacts; отдельно UNIT_EVENT/HOSTED/Win10/Server/IME/DPI; научные выводы не по одному screenshot |
| SCI-CORPUS | Классифицировать неизменённые SCI142/AI88 по утверждённой очереди | Derived traceability/ledger, не исходные TEX/CSV requirements | 142/103 отдельно от 88/35/23/13; каждый original ID сохранён, нет двойного счёта/пропусков; Lua65/68/86 явно |

Все пакеты — постановки с результатом, не доказательство уже запущенных агентов или выполненного кода. Младшие модели предназначены для ограниченных задач реализации/тестов/каталога; архитектурные решения и независимое review остаются у интегратора/ревьюера. При реальном запуске фиксировать доступное имя модели, session/task ID, branch/base, scope и evidence. В этой документационной правке новых агентов не запускали.

## 4. Порядок исполнения ближайшего блока

1. Перечитать свежий main/AGENTS и #172. Сохранить рабочий код, устранить конкретные compiler/Clippy/legacy-handler замечания, не маскировать их allow/пропуском проверок. Старые координатные GUI тесты обновлять после просмотра реального окна, не из предположений.
2. Зафиксировать минимальные document/action/build contracts для текущего научного сценария. Один integrator владеет main.rs, общей схемой и интеграцией; другие исполнители не правят те же файлы параллельно.
3. Параллельно: дизайн/Inspector; editor G3; build contract; corpus и точечные scientific adapters. Число workers ограничить независимыми областями, а не максимальным количеством сессий.
4. Первый принимаемый пользовательский результат — полноценная научная TikZ/PGFPlots рабочая область и правильный source→PDF цикл. Следующий дополнительный scientific profile — Asymptote, потом Typst/CeTZ. Никакой новой data-продуктовой функциональности между ними.
5. После code/hosted evidence получить native Windows proof на точном кандидате. Неизвестная доступность машины — NOT_RUN, не PASS; при её блокере продолжать только независимые задачи текущего научного этапа.
6. Закрыть утверждённый ST-SCI scope с независимой научной/визуальной/платформенной приёмкой. После этого активировать ST-UML, затем ST-BPMN. Scope reduction/изменение порядка — только явное решение владельца.

## 5. Очередь следующих предметных задач — сейчас не запускать

| После | Задача следующего этапа | Явная граница |
| --- | --- | --- |
| ST-SCI | ST-UML: diagram-kind/operation matrix, native UML source, Inspector/relations, candidate PlantUML/TikZ profiles | Не приравнивать generic Graphviz/D2/Mermaid рисунок к UML |
| ST-UML | ST-BPMN: native .bpmn/XML, поддержанное model/DI editing, validation, candidate bpmn-js integration | До инженерии; не workflow execution engine, не screenshot-only |
| ST-BPMN | ST-ENG: circuit/timing/mechanics/wiring profiles + native engineering packages | SCI142 MUST, уже нужные для научной графики, не переносить назад |
| ST-ENG | ST-CHEMBIO: chemistry/biology sources, structures/relations/templates, native domain checks | Layout не подменяет предметную семантику |
| ST-CHEMBIO | ST-ANIM: scientific scenes/timeline/frame/media | До общих extras; no arbitrary Python decompilation |
| ST-ANIM | ST-OTHER: general graphs/C4/vector exchange/full Publication/optional gateways | Ограниченный принятый backlog, не бесконечный мешок идей |
| ST-OTHER | ST-DATA: import/map/transform/analyse/Data Figure и новые data engines | Последний предметный этап; потом только итоговая QA/поставка |

Минимальная библиотека/подсистема из позднего раздела допустима раньше лишь как явно записанная необходимая зависимость текущего scientific requirement, без самостоятельной продуктовой реализации и изменения приоритета. Нельзя называть Data Figure «общей зависимостью» ради обхода запрета.

## 6. Неизменяемые критерии и checkpoint

Все UX-F01…F14/T0–T8/G gates; G3 10k/1MiB p95<=50ms и first editable<=2s; 100k/10MiB stress; W0–W4, real IME, 96/120/192 DPI; viewport1180×680/1366×768/1920×1080, stress1024×640. SCI142=100AK+42Sarov/103 requirements; AI88=88/35 packages/23 libraries/13 skills; 85XeLaTeX+3LuaLaTeX(65/68/86). Source authority, reversible edits, external runtime, no auto-install/cloud/shell-escape/UAC/RDP/MiKTeX/FlowBridge changes, current Administrator trust notice.

На checkpoint сохранять base/head/PR, выполненный пользовательский сценарий, реальные tests/original artifacts, неисполненное и один следующий шаг. Никаких вымышленных процентов/model sessions/native passes. Прямой доступ к стендам проверяется по текущему каналу, а не по старым чатам.

Документальная проверка этого commit: только AGENTS/PRODUCT_SPEC/ARCHITECTURE/ROADMAP/этот план изменены; root application/dependency/workflow/fixture/evidence hashes сохранены; Graphviz-first/Data-middle scheduling удалён из действующих указаний; task threads #108/#169/#170/#171/#172 указывают на новую очередь. Итоговые SHA/PR фиксируются после публикации, не выдумываются заранее. Runtime CI/native QA для смены приоритетов не являются выполненными испытаниями.

[Предыдущая версия текущего плана](https://github.com/i-shutov/tikzarium/blob/a2a6c79ee14c58282da8a4a1106392faf9643029/plans/2026-11-11_STUDIO_REBASE.md) сохранена для истории; её очередь Graphviz→D2/Mermaid и Data-middle больше не действует.
