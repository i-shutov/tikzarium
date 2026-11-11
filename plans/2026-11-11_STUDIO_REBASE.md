# ST0 — смена курса на полноценную Studio и ближайшие исполнительские пакеты

Дата: 11 ноября 2026. Основание: прямая команда владельца о радикальном изменении roadmap и приложение «Pasted text(1).txt». Главный план — [docs/ROADMAP.md](../docs/ROADMAP.md); этот файл — checkpoint/постановка, не конкурирующий roadmap.

## Решение

Полноценная Multi-Engine Scientific Studio — основной продукт. Все ранее принятые требования сохраняются, но TikZ-only ceiling и глобальная отсрочка всей Studio «после 1.0» сняты. Основной цикл программы: проект → native source/data → supported visual edits → engine builds → publication → reproducible export. Project/document/build/design contracts начинают сейчас; stable publication остаётся закрыта до фактической приёмки соответствующего кандидата.

Продуктовые уточнения, предложенные при декомпозиции: per-document state/history, linked publication document, bounded multi-engine scheduler, операция-зависимая ME-L1…ME-L4 матрица. Это инженерные решения для реализации курса, а не утверждение, что пользовательский текст задавал конкретный Rust API или формат manifest.

## Проверенная база

- main = `19187fc17968659267540fe279702bf77eeb77e6`, tree = `7126aa2657cf823a6c7e660415dd52ac7b0b5c33`.
- UX1 #167 присутствует в main; независимые G3/native acceptance остаются открыты по прежним записям.
- UX2 #172 OPEN/DRAFT, head `fef081d7481bd095182c2e74e5eb830cbd1e6612`. Незавершённый tool call из прерванной работы не считается новым коммитом.
- #169 дизайн-система; #170 native Studio; #171 independent QA. Не дублировать их новыми микрозадачами без причины.
- В этой стратегической редакции не запускаются приложения на Win10/Server, не меняются настройки или runtime code и не создаётся релиз.
- Прямой git clone из рабочего контейнера недоступен (DNS); чтение/публикация выполняются через подключённый GitHub. Это не говорит о состоянии пользовательских Windows-машин.

## Пакеты исполнителям

| Пакет | Чёткий результат | Граница владения | Приёмка |
| --- | --- | --- | --- |
| ST1-A Design system (#169) | Четыре темы, typography/spacing, primary/secondary/focus/disabled; compact Studio | ui_theme.rs и изолированные visual components; не main.rs/core | Реальные screenshots/contrast + theme invariance; не изменять figure fonts/source |
| ST1-B Studio shell (#170) | Шесть direct tools, компактный Inspector/один Apply/F1, подготовленные document tabs/project navigation | studio_ui.rs + выделенные shell modules; integration main.rs только интегратор | GUI scenario + source intact + keyboard/IME readiness; не считать tabs реализованными от mockup |
| ST1-C Document/editor/G3 | DocumentId/revision/save/history/views для нескольких native documents; bounded source layout | Изолированный document/editor service, SourcePatch contracts совместно с интегратором | UTF-8/CRLF, mixed Undo, external edits, 3-document scenario; native latency vs CPU отдельно |
| ST2-A Engine contract | Descriptor/capabilities/request/result/artifact + существующий XeLaTeX adapter | Core build abstractions, CLI adapter; без UI rearrangement | Existing XeLaTeX positives/negatives unchanged; cancel/stale/revision/dependency tests |
| ST2-B First non-TeX vertical | После заморозки контракта: Graphviz source→build→preview/export в Studio | Один adapter и его fixtures, shared API только согласованно | Проверенные upstream/version/licence/platform facts; actual GUI L2, missing engine, errors/cancel |
| SCI/AT intake | Свести старые requirements к новой проектной модели; общий SC3/AT4 план PGFPlots | Corpus/catalogue/fixtures plans; не править originals ради PASS | 142/103 отдельно от 88/35/23/13; Lua65/68/86 сохранены |
| Independent QA (#171) | Проверка UX2/engine/document сценариев и оригиналов | QA harness/evidence/review, не production code автора | Exact SHA/EXE/artifacts; distinct unit/hosted/Win10/Server/IME/DPI verdicts |

Младшие модели назначаются на ограниченные пакеты реализации, тестов и каталогов; более сильный review/интеграция — на общие контракты, безопасность и противоречивые результаты. Уточнённое имя модели выбирается только из реально доступного launcher. **В этом блоке новые субагенты не запущены**; записи выше — постановки. Прежний отказ GitHub назначить coding agent не обходить вымышленным assignment. При реальном запуске сохранять task/session ID, модель, branch/base и результат.

Не все пакеты должны исполняться одновременно. Первый параллельный набор — Design, Documents/G3, Engine contract и Independent QA. Graphviz начинается после согласованного API; массовые D2/Mermaid/domain adapters — после первого доказанного vertical. main.rs, shared schema и merge принадлежат одному интегратору.

## Ближайшая техническая точка выхода

Согласованные документ/движок/action contracts, существующий TikZ-профиль на новом build API без потерь, живой Studio shell и первый не-TeX пример. Затем D2/Mermaid + linked publication prototype. При блокере Windows не заявлять native PASS, но продолжать независимые кодовые/контрактные части с сохранением открытой физической приёмки.

## Контроль неизменяемых обязательств

Все UX-F01…F14; G3 10k/1MiB p95<=50ms и first edit<=2s; 100k stress; W0–W4; real IME; 96/120/192 DPI; 1180×680/1366×768/1920×1080 и stress1024×640. SCI142=100AK+42Sarov/103 requirements; AI88=88 cases/35 packages/23 libraries/13 skills/85XeLaTeX+3LuaLaTeX(65,68,86). Source-preserving edits, unknown macros, external engines, no auto-install, no silent cloud, current Administrator trust warning. Никаких изменений UAC/RDP/MiKTeX/FlowBridge/чужих runner.

## Evidence и публикация изменения

Документальная приёмка проверяет: изменены только AGENTS и плановые Markdown-файлы; application/source/tests/workflows/fixtures и Cargo.lock совпадают с базой; текущий roadmap единственный, старые scope-ограничения явно исторические; source facts и инженерные предложения различены. Новый runtime CI/Windows прогон не является результатом этой документационной редакции. Коммит/PR фиксируют действительный способ интеграции; до merge нельзя утверждать, что main обновлён.
