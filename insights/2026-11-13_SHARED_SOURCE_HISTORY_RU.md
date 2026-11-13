# Единая история исходника: Inspector, текст, Undo/Redo

13.11.2026. Продолжение [draft PR #189](https://github.com/i-shutov/tikzarium/pull/189), исходная проверенная база `0eee418ca4d4869b2a4b9fb6ea1462d53df84e1d`, app tree `6c3208dc309a4c31ba36c4cf3ccda63b85083bd9`. Новый production-код проверен локально; финальные commit/app-tree и результат нового hosted запуска интегратор фиксирует после публикации и readback. Их нельзя подменять SHA исходной базы. Stable v1.0 и merge/release GO **не выданы**.

## Подтверждённый дефект и результат исправления

При последовательности **ручная правка текста → PGFPlots Inspector Apply → Undo → Undo** второй Undo не возвращал исходные байты. Редактор хранил текстовые транзакции в `SourceHistory`, Inspector — обратные SourcePatch в `Session`. После Apply сброс native TextEdit snapshots одновременно очищал текстовую историю. Обратный порядок тоже разрывал цепочку: последующая ручная правка очищала визуальные inverses. Поэтому прежний тест отдельного Apply → Undo не доказывал общую историю.

Теперь production-обработчики передают уже созданные точные inverse SourcePatch из Session в **одну ограниченную историю исходника**. Проверяются смежные ревизии и соответствие числа переданных транзакций полному изменению revision. При разрыве цепочки небезопасная история сбрасывается. Применение Undo/Redo по-прежнему проверяет текущую revision, диапазон и ожидаемые байты. Сохраняются лимиты 100 patches / 16 MiB с удержанием последней большой транзакции и очистка redo-ветки после новой правки. В idle Inspector/guide нет добавленного клонирования полного документа; отдельный Session-стек передаётся, а не хранится второй копией.

Toolbar, меню, Inspector action bar и source/canvas shortcuts используют этот ledger. Standalone Session API сохранён для независимых потребителей и прежних тестов. Общий Undo/Redo отменяет незавершённый жест и инвалидирует производные handles: повторное mouse-up не создаёт скрытую команду. Поля черновика Inspector сохраняют собственный локальный Undo; изменение draft без Apply не меняет TeX.

Open отделяет идентичность документа: сбрасывает историю, Inspector и отложенные события старого source. Однокадровая защита также удаляет старые события, уже доставленные egui до показа нового буфера. В конце update она истекает: поздний Open или Canvas-only режим не должны отбрасывать свежий ввод следующего кадра. Fold преамбулы и глобальные Unicode/CRLF offsets остаются представлениями одного авторитетного `document.source`.

Изменены только `main.rs`, `source_editing.rs`, `source_workspace_tests.rs`, `tikz_authoring.rs`, `tikz_canvas.rs`; семантика научного рисунка и движок не заменялись. [Точная матрица source/native acceptance](assets/2026-11-13-shared-history/source-inspector-undo-review.md).

## Свежие проверки

Оригинальные [команды и exit codes](assets/2026-11-13-shared-history/commands.json), [сводка](assets/2026-11-13-shared-history/summary.json), [SHA256 manifest](assets/2026-11-13-shared-history/manifest.json). Task-local Rust **1.91.0**.

| Проверка | Результат и исходный журнал |
| --- | --- |
| `cargo test --locked --workspace` | **566 passed / 0 failed / 4 ignored**, 27 suites; [tests.log](assets/2026-11-13-shared-history/tests.log) |
| `cargo fmt --all -- --check` | PASS, exit 0; штатно пустой [fmt.log](assets/2026-11-13-shared-history/fmt.log) |
| `cargo clippy --locked --workspace --all-targets -- -D warnings` | PASS; [clippy.log](assets/2026-11-13-shared-history/clippy.log) |
| `cargo build --locked -p tikzarium-app -p tikzarium-cli` | PASS; [build.log](assets/2026-11-13-shared-history/build.log) |
| Четыре новых production-shell regression tests | **4/4 PASS**, `UNIT_EVENT`; [mixed-shell-tests.log](assets/2026-11-13-shared-history/mixed-shell-tests.log) |
| Offline artifact collector | **16/16 PASS**; [artifact-tests.log](assets/2026-11-13-shared-history/artifact-tests.log), не native evidence |
| Независимый static review | [Отдельный итог ревью](assets/2026-11-13-shared-history/independent-source-review.md): блокирующих дефектов не найдено; native приёмку не заменяет |

SHA256 Linux debug app: `647f1d63d8fab634876b79e8d00fe01259e412f5ee1b7615a50a02af406ac568`. CLI: `e6699cc9399f63ebf5ad595bb4c43be3625073622aa90d58acd82a1c11f153c7` — совпадает с предыдущей локальной сборкой этого блока; изменения относятся к app.

| Новая регрессия | Что реально проверено |
| --- | --- |
| Текст → scientific Apply → два Undo | Raw egui clicks по настоящим Scan/axis combo/literal/Apply; ровно `samples=150 → 151`, затем два точных обратных состояния; Unicode, CRLF, комментарии, неизвестное определение сохранены |
| Apply → текст, Undo/Redo, Save/Open | Ctrl+Y / Shift+Z, новая ветка после Undo, сохранённые байты, Open того же пути, deferred и уже доставленный ввод, stale revision и expected-byte mismatch |
| Визуальный Node и удержанный новый жест | Реальный guide click, затем общий Undo вместе с release: одна отмена без ghost insertion и двойной обработки; точный Redo |
| Несколько inverses | Порядок нескольких подтверждённых транзакций, отсутствие дублирующего Session history, отказ при неподтверждённой revision chain |

Эти тесты выполняют production widgets и input hook в raw egui кадрах 1366×768. Статус — **UNIT_EVENT**, а не работа с нативным окном, реальным IME или измерение G3 input-to-frame.

## CI, desktop и граница приёмки

[Независимый аудит исходной базы](assets/2026-11-13-shared-history/baseline-ci-audit.md) охватил все 15 runs exact-head `0eee418…`: **13 success, 2 failure**, 38 неистёкших artifacts. Финальный [D QA matrix 43293210950](https://github.com/i-shutov/tikzarium/actions/runs/43293210950) завершился success, 7/7 jobs. I61 и N5 остановились до своих GUI-сценариев на старом `APP_TREE=bf8ec753…`. Эти leases сохранены; механическая замена pin не является приёмкой новой геометрии. Результаты этой базы не переносятся на новый код. Исходные hosted HWND/F1 и CLI/PDF свидетельства также сохраняют собственный platform/source scope.

В текущем локальном desktop наблюдались настоящее production-окно и мышь; keyboard focus остаётся ненадёжным. Полная цепочка Inspector → patch → Undo → Save/Open → XeLaTeX → PDF **не принята**. Временный image URI computer-use не является файлом executor; попытка читать такой кадр через executor с эскалацией отклонена политикой. Такой кадр не подменён синтетическим «оригиналом».

Отдельный hosted Ubuntu/Xvfb workflow 1366×768 и driver готовятся для нового scientific сценария с сохранением старых I61/N5. Collector различает `inputs`, `expected` и настоящие `observed`, сохраняет отрицательные originals, сверяет байты/clipboard/hash/порядок/время и не объявляет native PASS автоматически. Исполнение нового workflow и независимый просмотр его оригинальных PNG, `.tex`, PDF и logs **ожидаются**. Ввод Unicode marker через Paste не является real IME или Unicode keyboard qualification.

## Реально запущенные bounded задачи

По записи интегратора launcher запросил для всех трёх `gpt-6.1-sol`, reasoning `high`, `fork_turns=none`. Ниже фактические task IDs из списка активных/завершённых агентов; backend model/session identity независимо не подтверждён. Написанное задание не выдаётся за отдельного запущенного работника.

| Task ID | Владение и результат |
| --- | --- |
| `/root/sci_source_review_1113` | Начальный независимый source audit; затем по явному расширению владения — исправление смешанной истории, 4 regression tests, checkpoint docs |
| `/root/sci_native_harness_1113` | Отдельные fixture/collector/driver; production Rust не редактирует |
| `/root/sci_ci_audit_1113` | Read-only exact-head CI/original-artifact audit, независимый static review source fix; отдельный hosted workflow |

Один интегратор владеет финальным commit/ref, broad checks, native запуском и публикацией. Это изменение не закрывает physical Win10 W0–W4, actual W2b/W3, IME, 96/120/192 DPI, G3, SCI142/103, научный AI88 или Asymptote/Typst. Очередь ST-SCI → ST-UML → ST-BPMN → ST-ENG → ST-CHEMBIO → ST-ANIM → ST-OTHER → ST-DATA сохранена.

**Одна следующая исполнимая задача:** на финальном exact source commit собрать production app и выполнить новый native 1366×768 scientific workflow: явный SV-001 derivative → source marker → Inspector draft/Apply `150 → 151` → два Undo → byte-exact Save/Open → GUI XeLaTeX → текущий PDF Export. Сохранить original source, кадры, action/build provenance, log/PDF/font checks, затем независимо проверить соответствие исходнику и только после этого присваивать scoped `HOSTED_GUI`/native статус. Отсутствующие реальные зависимости SV-001 — явный BLOCKED; упрощённый fixture не закрывает corpus acceptance. **Stable и merge GO отсутствуют.**

## Follow-up 13.11 — два настоящих hosted прогона и точная граница результата

Публикация source fix подтверждена на `cc25f815248215f7f4d4e50656cc91545e1c01d0`, app tree `865b883c508faf647dea5011dcff09b88f26c131`. QA1 `6b3e36e94719fab114e23a5a80e4f24b6ab1c770` меняет только workflow/driver; app tree тот же. Последующие изменения ниже проверены локально, их новый опубликованный SHA здесь не придуман.

| Exact head / run | Свежий результат и оригинальный аудит |
| --- | --- |
| `cc25f815…` / [43367842268](https://github.com/i-shutov/tikzarium/actions/runs/43367842268) | Все16 runs завершены: **13 success /3 failure**. Native **failure после Open PASS**: saved source и настоящий editor clipboard совпали; повторное `xdotool mousemove --sync` остановилось до marker paste. [Аудит](assets/2026-11-13-shared-history/native-attempts/43367842268/audit.md), [полный итог CI](assets/2026-11-13-shared-history/native-attempts/43367842268/ci-final.md). |
| `6b3e36e…` / [43368808565](https://github.com/i-shutov/tikzarium/actions/runs/43368808565) | Все15 runs завершены: **12 success /3 failure**. Open и сохранённый typed marker подтверждены. Координата Scan попала в collapsing header; samples field не был выбран. Applied source guard корректно отказал: в source осталось150 вместо151. [Аудит оригиналов](assets/2026-11-13-shared-history/native-attempts/43368808565/audit.md), [полный итог CI](assets/2026-11-13-shared-history/native-attempts/43368808565/ci-final.md). |

В обоих inventories два других failure — прежние I61/N5 source-tree leases; D QA matrix успешна. **Реально подтверждены только Open и native typed transaction во втором прогоне.** Draft stage показал неизменный source, но этот false candidate был выявлен просмотром originals и последующим source guard: он не доказывает ввод151 в нужное поле. Apply/Undo/Reopen/GUI XeLaTeX/PDF не приняты. Полные неизменённые ZIP originals обоих прогонов сохранены. Первый включён в [проверенный CP05 на Drive](https://drive.google.com/file/d/1n4cvVs-un4pJRssnA6b7P9dy5dJ3l4a9/view); второй пока сохранён локально для итогового обновления того же CP05. В репозитории лежат компактные аудиты, без дублирования ZIPs.

Новая UI-строка после ручного ввода теперь честно предлагает выбрать объект или заново распознать PGFPlots, без устаревшего утверждения об отмене visual Undo. **Это только статусный текст; shared Undo semantics не менялись.** Driver усилен привязкой Scan к уникальной бинарной маске реального before-scan PNG (fixed threshold144; zero/duplicate/blank matches отклоняются), последующими относительными координатами и независимым clipboard proof выбранного source-owned numeric field. Совпадение source до Apply само по себе больше не считается доказательством работы с draft.

[Временный production-widget probe](assets/2026-11-13-shared-history/layout-probe/probe.log) на1180×680/right260 подтвердил interact height26, toolbar bottom66, статус3rows/42px и offsets от Scan: combo+30, первая axis option+63, value field+155, Apply+182.125. Это **UNIT_EVENT coordinate proposals**, native guards сохраняются. [Числовые rectangles](assets/2026-11-13-shared-history/layout-probe/coordinate-proposals.json), [точное восстановление test file](assets/2026-11-13-shared-history/layout-probe/restoration.json): Git blob `701c23500f2d014ba6c7ba1075c55b4d2dd7ba7d`; диагностический тест удалён, постоянных тестов не добавлено.

После статусной правки повторены broad checks: **566 passed /0 failed /4 ignored /27 suites**, fmt, strict workspace Clippy и app/CLI build **PASS**. [Команды](assets/2026-11-13-shared-history/final-status/commands.json), [сводка](assets/2026-11-13-shared-history/final-status/summary.json), [tests.log](assets/2026-11-13-shared-history/final-status/tests.log), [clippy.log](assets/2026-11-13-shared-history/final-status/clippy.log), [build.log](assets/2026-11-13-shared-history/final-status/build.log), [fmt.log](assets/2026-11-13-shared-history/final-status/fmt.log). Новый local app SHA256 `f80b07e00d24f83d750493b0d3c91098a2cf3e9d1f968f41ef68ffdbe938eb67`; CLI `e6699cc9399f63ebf5ad595bb4c43be3625073622aa90d58acd82a1c11f153c7` неизменён. [20/20 offline helper contracts PASS — original log интегратора](assets/2026-11-13-shared-history/final-status/artifact-tests.log), [отдельный повтор](assets/2026-11-13-shared-history/final-status/helper-contracts-20.log); это проверка валидатора/анализа изображений, не native success.

Следующий исполнимый шаг: опубликовать проверенный статусный текст и усиленный driver, затем на **его собственном exact head** получить настоящий samples field clipboard151 → Apply150→151 → два Undo → точные Save/Open → GUI XeLaTeX/PDF с originals и независимым review. До этого scientific vertical **NOT_PASSED**, merge/stable GO отсутствуют; physical Win10/IME/DPI/G3/full ST-SCI остаются открытыми.
