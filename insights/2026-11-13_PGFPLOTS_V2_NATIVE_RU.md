# PGFPlots V2: точное владение исходником и native научный маршрут

Дата: 13.11.2026. Рабочая ветка `feat/studio-scientific-integration-20261112`, существующий [draft PR #189](https://github.com/i-shutov/tikzarium/pull/189). Предыдущий завершённый блок — [compact I61/N5, CP06](2026-11-13_COMPACT_I61_N5_ACCEPTANCE_RU.md).

## CP07 — полный обход V2 и восемь принятых AT4

Исполняемый source **`ee35ec96fd0bea203627f7acb45092cc0d74d5b8`**, root tree `08d229e9acfb8e08c32b0d6a8bd0d2a61677fa3c`, app/src tree `7d35e7b8064a651084fef931a827ac46b3448c6a`. [Run06](https://github.com/i-shutov/tikzarium/actions/runs/43419233297) достиг **26/26 V2 transactions, 109 source/editor/image stages и восьми GUI Build/current PDF**. Все 16 workflows завершены: **15 SUCCESS / 1 PGFPlots FAIL**. Последующий documentary commit сохраняет эти конкретные native identities; его собственный статус CI не подменяет Run06.

| Объём | Подтверждённый результат и граница |
| --- | --- |
| V2 source workflow | Все 26 минимальных literal Apply, точные общие Undo, 33 original/proposed/selected-property F1 pairs, сохранение формул и внешних `.dat/.csv`, восемь настоящих reload challenges/builds. SV-040 остаётся preservation/build-only, без Inspector edit claim. |
| V2 PDF gate | Пять чистых сборок: formula, external-tables, SV-001, SV-022, SV-040. SV-003, SV-029 и SV-009 создали свои PDF, но каждый получил два `Missing character … ; … nullfont`; **общая V2 приёмка FAIL**, exit1. |
| AT4 original cases | **8/8 bounded hosted GUI vertical принят:** 09/48/49/50/55/56/58/61, по одной точной операции, общий Undo, Save/настоящее reopen, восемь current PDF и предметная проверка. Все 56 stage PNG и восемь PDF raster PNG Run06 побайтно совпадают с исправленно привязанными и просмотренными Run05 originals; source/PID/window/recorder/PDF binary provenance перепроверена на новом source. |
| Полный Studio/portable маршрут | I61/N2/N3, N5/R1/R2/R3/R5 и scientific mixed Undo имеют собственную независимую приёмку на **source24f7ae4c** с тем же production app tree. Это отдельная attribution, не перенос результатов по одному совпавшему app hash. |

[Run06 V2 independent audit](assets/2026-11-13-pgfplots-v2/run06/v2-audit.json), [Run06 AT4 independent audit](assets/2026-11-13-pgfplots-v2/run06/at4-audit.json), [точные CI outcomes](assets/2026-11-13-pgfplots-v2/run06/ci-final.json). В V2 независимо сверены все 2104 report files, source/clipboard/recorder и текущие PDF; в AT4 — 1368 native и 90 reference hashes. Native artifact retains production build receipt and observed owned `/proc/PID/exe` hash; отдельной копии debug ELF для локального перечитывания в PGF ZIP нет. Reference PDFs остаются только `EXTERNAL_REFERENCE_ONLY`.

### Почему V2 остаётся FAIL

В неизменённых оригиналах SV-003 и SV-009 после двух `\def` стоят отдельные `;`; у SV-029 это `\def\ql{-1};` и `\def\qr{1};`. Текущие GUI logs содержат по два semicolon/nullfont warnings, успешный `Output written on` и не содержат fatal `!` lines. Исторические журналы компиляции тех же точных original source hashes также содержат эти предупреждения при engine exit0. Это сильная source/log атрибуция предупреждений исходному корпусу; isolation compile с изменённым примером здесь не выполнялся. [Source/log diagnosis с точными hashes](assets/2026-11-13-pgfplots-v2/run06/warning-source-diagnosis.json).

Typed end-of-case refusal сохранил каждый strict FAIL и его evidence, после чего обычный guarded native Open перешёл к следующему независимому случаю. История отказов не потеряна; полная stage validation не перезаписала итог в PASS. Любой source/clipboard/identity/font/recorder/fatal-engine отказ по-прежнему останавливает suite. Оригинальные 17 AT4 `.tex` и полный каталог сохранены побайтно.

### Проверки и следующий блок

Production gates на тех же байтах: **586 Rust PASS / 0 failed / 4 existing ignored**, fmt, strict Clippy и locked build PASS. Новый QA-only кандидат: **91 contracts PASS / 0 failed / 0 skipped**; cache/archive policy CP07: **8 tests PASS**, включая все 18 неизменённых original CI ZIP. В derived 88-case ledger изменены только два status поля восьми AT4 строк; остальные 80 строк и все научные исходные поля сохранены. Эти статусы означают частичную поддержку literal properties и hosted действий, а не полный S3/S4.

CP07 сохраняет исходники точного documentary head, binary patch от CP06, все **18** original CI ZIP (623102727 bytes до упаковки), историю отказов, независимые reviews и отдельные source/acceptance identities. Адрес доставки — [папка Studio Checkpoints](https://drive.google.com/drive/folders/1KOiMLat9r0QN-J0R1mTjZuIx2QvEDw4H); размер, SHA256 и подтверждение обратного чтения относятся к итоговому INDEX/transport receipt, а не к существованию этого отчёта.

Следующий исполняемый блок — отдельная атрибутированная проверка чистых производных SV-003/029/009 с сохранением immutable originals и устранением причины строгих предупреждений, затем расширение оставшегося SC3/AT4 scope (включая groupplots59/pgfplotstable60). G3, полный SCI142/103/scientific AI88, physical Win10/IME/DPI и другие платформенные gates остаются открытыми. Очередь ST-SCI → UML → BPMN → engineering → chem/bio → animation → other → data сохранена; Asymptote, затем Typst/CeTZ идут после общих scientific gates. **Draft; merge/stable/release GO отсутствуют.**

## История Run05: достигнутый partial scope

**Зафиксированный статус Run05: AT4 8/8 независимо приняты в bounded hosted scope; V2 FAIL после 23/26 операций и четырёх PDF.** Source `24f7ae4cdb483b9097337c38aa0f932ad89e3f80`, root tree `f88fb5caeb62062c1893c5a4cf8eb95c1de36a77`, app tree `7d35e7b8064a651084fef931a827ac46b3448c6a`; **15 SUCCESS / 1 FAIL**. [PGFPlots run43415761917](https://github.com/i-shutov/tikzarium/actions/runs/43415761917) завершил AT4 job успешно; V2 остановлен на SV-003 строгим glyph gate, а не выбором popup. Оригиналы обоих ZIP проверены по GitHub digest/size/CRC и всем 1454 V2 + 1339 native AT4 + 90 reference hashes.

## Run05: строгий отказ корпуса и следующий полный сбор evidence

V2 прошёл всю synthetic formula matrix (18 операций), external-tables (три), SV-001 и SV-003 (по одной). Actual GUI log SV-003 содержит два `Missing character … ; … nullfont`, при этом XeLaTeX создал PDF; сохранены текущие source/clipboard/recorder/PDF/fonts/text/render. Последующие SV-022/029/040/009 не достигнуты. [Независимый partial audit](assets/2026-11-13-pgfplots-v2/run05/v2-partial-audit.json) подтвердил 85 attained stages, 23 точных Apply/inverse Undo, 27 selected-property/F1 pairs, 13 scrollbar drags с 26 Button1 proofs и четыре реальных reopen challenges; failure attribution опирается на текущий GUI log и historical exact-source log. AT4 завершил восемь native операций и восемь PDF; ограниченная предметная приёмка подтверждена [независимым review](assets/2026-11-13-pgfplots-v2/run05/at4-audit.json). Перепроверены все 56 source/editor/image hashes; просмотрены точные opened/first-applied кадры и все восемь PDF. Ошибка suffix-подбора ссылок в первоначальном отчёте исправлена через exact stage.json; [correction note](assets/2026-11-13-pgfplots-v2/run05/at4-audit-correction.json) фиксирует paths/hashes и целевой повторный просмотр. Гауссова поверхность сохраняет геометрию при samples21→25, спираль — два оборота при181→201, у разрывной функции отсутствует соединяющий отрезок. Оба набора остаются раздельными по suite и файлам.

[Run05 Studio/packaged review](assets/2026-11-13-pgfplots-v2/run05/studio-packaged-audit.json) и [Run05 mixed Undo review](assets/2026-11-13-pgfplots-v2/run05/compact-mixed-undo-audit.json) независимо подтверждают прежний hosted объём на exact source24; семь PDF, GTK dialogs, R1 clean exit0, R2 geometry, R5 inner manifests/hosted cmp проверены заново. R3 child exit−15 остаётся cleanup harness, не clean exit claim. [CI outcomes](assets/2026-11-13-pgfplots-v2/run05/ci-final.json) отделены от этой приёмки.

QA follow-up выделяет только законченный strict-warning build в типизированный отказ. Он возникает после прежних engine-success/fatal, current-source, embedded-font, recorder и dependency проверок. Suite сохраняет отказ и его stage, затем открывает следующий независимый case обычным guarded GUI путём. Все прочие ошибки останавливают исполнение. Полная source-stage validation не может перезаписать предупреждение в PASS: итог остаётся `FAIL_STRICT_XELATEX_WARNING_GATE`, `native_acceptance=NOT_ACCEPTED_STRICT_XELATEX_WARNINGS`, exit1. Оригинальный корпус и production app tree не меняются. Это полнота диагностического покрытия, а не допуск предупреждений.

Локально **31 evidence/popup/aggregation contract PASS**: 25 прежних и шесть отрицательных/агрегирующих проверок. [Повтор интегрированного кандидата](assets/2026-11-13-pgfplots-v2/strict-warning-collection/integration-gates.json): **91 PASS / 0 failed** (31 V2, 26 AT4, 34 compact). [Независимый review](assets/2026-11-13-pgfplots-v2/strict-warning-collection/independent-review.json) разрешил QA-only integration/rerun; все Driver methods, кроме указанной завершающей ветки build, AST-identical. Новый native результат до повторного запуска не заявлен. Для успешных случаев приёмка потребует source/PDF review; строгие отказы сохраняются в CP07.

## Run04: F1 и полный Studio прошли; обнаружены два расхождения QA popup

Source `81f8acccaa9783f9cfaea3a70321ddca345a0464`, root tree `4fe527bebf33d334bdd6251cfafd4cb837dde9d1`, app tree `7d35e7b8064a651084fef931a827ac46b3448c6a`. Все **16 workflows завершены: 15 SUCCESS / 1 PGFPlots FAIL**. Actual debug ELF SHA256 `bde9fbb2598c16de2d45f9ec4c55d1580d68db3e3e2c9de8f0f12bf2a4f3f55a`. [PGFPlots run43410590342](https://github.com/i-shutov/tikzarium/actions/runs/43410590342) сохранил собственные PID/window/proc-exe/clipboard/source/engine originals.

| Маршрут | Фактически достигнутый результат |
| --- | --- |
| V2 formula | Шесть axis операций samples/domain/xmin/xmax/ymin/ymax: точный draft/Apply/Undo и 19 source/editor состояний. Повторный F1 показывает выбранную справку, dock не расширяется. Следующий выбор xtick distance ошибочно попал в ytick distance: свежий clipboard `0.2` вместо `1` остановил runner до правки. Остальные 20 операций и все V2 Build/Export ещё не достигнуты. |
| AT4-09 | Полный native маршрут: samples `161 → 181`, точный Undo, повторные F1/Apply, Save, явный discard unsaved challenge, reopen, GUI XeLaTeX/current PDF. Recorder сохранил именно изменённые 683 байта. Независимо просмотрены исходник, оригинальные GUI кадры и PDF/reference: единичный пик, чётная модель и пять модельных точек сохранены. |
| Остальные семь AT4 | Стоп на AT4-48 до Apply: у списка из 15 свойств фактический viewport сохранил высоту около 86 px после прежнего короткого списка; видны три строки, runner ожидал высоту 200 px. Native операции/PDF ещё NOT_RUN. Все восемь original reference PDFs имеют только EXTERNAL_REFERENCE_ONLY. |
| Полный Studio | [I61/N2/N3](https://github.com/i-shutov/tikzarium/actions/runs/43410590489) и [portable N5/R1/R2/R3/R5](https://github.com/i-shutov/tikzarium/actions/runs/43410590289) независимо приняты в hosted X11 scope после исправления координат: шесть primitives, draft/Apply/inverse, F1, два CRLF документа/dirty cancel, N2/N3, семь точных PDF, R1 close, три R2 geometry кадра, настоящие GTK Open/Save/Export. R5 inner manifests и бинарная идентичность preview/RC проверены; CI повторная упаковка побайтно совпала. |
| Scientific mixed Undo | [Run43410590249](https://github.com/i-shutov/tikzarium/actions/runs/43410590249) независимо принят в узком hosted scope: 99 hashes, восемь точных source состояний, два общих Undo, Save/Open clipboard, текущий PDF и четыре встроенных шрифта. |

[Полный Studio/packaged review](assets/2026-11-13-pgfplots-v2/run04/studio-packaged-audit.json), [R5 archive review](assets/2026-11-13-pgfplots-v2/run04/r5-package-audit.json), [V2 partial review](assets/2026-11-13-pgfplots-v2/run04/v2-partial-audit.json), [AT4-09 review](assets/2026-11-13-pgfplots-v2/run04/at4-audit.json), [mixed Undo review](assets/2026-11-13-pgfplots-v2/run04/compact-mixed-undo-audit.json). AT4-09 native PNG отличается от original reference на 66 из 157284 пикселей при 120 dpi; визуально модель сохранена, точное равенство растров не заявляется. Это scoped case acceptance, а не полный SC3/AT4.

Все пять original CI ZIP проверены по GitHub digest, размеру и CRC. V2 ZIP SHA256 `54db8ad926ebfae933b6d69e93c0c51131d64940c9ff7aa2815046bf47fb25de` (22719006 bytes; 292 file hashes); AT4 ZIP `b9fc708fa53ecfdd253d3f0524ac5f7b8cbb4b2ac9258c729f779fd4fe2d51ed` (11687954 bytes; 228 native + 90 reference hashes). Отказы сохранены; exact-value/source guards не ослаблены. Новый повтор должен исправить только наблюдение геометрии/прокрутки popup и пройти весь прежний объём. Фактический один wheel tick в V2 дал 80 px вместо предполагаемых 40; коэффициент не является достоверным наблюдением положения строки.

### QA-кандидат после Run04

[Диагноз по оригиналам](assets/2026-11-13-pgfplots-v2/popup-observed/diagnosis.json) и [проверенный offline патч](assets/2026-11-13-pgfplots-v2/popup-observed/implementation-report.json): источник наблюдения — точные RGB-пробы original PNG, явно помеченные как derived. Popup helper измеряет фактический viewport 86–200 px, два столбца ползунка и допустимый интервал scroll offset. Щелчок допускается только внутри строки для всего этого интервала. Для невидимой строки используется реальный drag наблюдаемого ползунка, доказательство удержания Button1 через XQueryPointer, обязательный mouseup при исключении и повторный снимок перед выбором.

Прежнее предположение «40 px на шаг колеса» удалено; число свойств остаётся 3/15. Все исходные field/draft/source/F1/Apply/Undo/build guards AST-identical to `81f8accc`. **25 popup/evidence + 26 AT4 offline tests PASS**, включая реальные probes Run04, повреждённые/неоднозначные ползунки, stale положение и исключение при mousedown. Production и immutable originals не меняются. Новый native drag и весь 26+8 scope требуют собственного hosted rerun; этот offline результат не объявляет его PASS. [Независимый review](assets/2026-11-13-pgfplots-v2/popup-observed/independent-review.json) разрешил QA-интеграцию; [повтор на интегрированном кандидате](assets/2026-11-13-pgfplots-v2/popup-observed/integration-gates.json) дал **85 PASS / 0 failed**: 25 popup, 26 AT4, 34 compact. App tree и все workflow файлы неизменны; прежние 586 Rust PASS относятся к тем же production байтам.

## Run03: первая транзакция прошла, повторный F1 выявил рассинхронизацию

На source `73667007ecc5b6a66b3a178c486700be98bd1aa3` / root `8f5f3fba8811bb2eed62c2ba6e48baeba889e2ec` завершены **16 workflows: 13 SUCCESS / 3 FAIL / 0 pending**. [Два PGFPlots jobs run43408533617](https://github.com/i-shutov/tikzarium/actions/runs/43408533617) выполнили первую настоящую транзакцию: V2 `41 → 43 → Undo 41`, AT4-09 `161 → 181 → Undo 161`, с неизменным source до Apply и точным inverse. Compact Help сохранил ширину. Следующее F1 оставило видимую вкладку Properties; последующие операции и GUI PDF не достигнуты. ZIP hashes: V2 `b6797f8b5c824c0d25ea806817328ba984fb30c563c8c9f20f6a15df87e52d14` (6683254 bytes), AT4 `970be8a565a4777db989eddf6b4330e14f904bd334db28fa581d0a1385a5d6d5` (6783308 bytes). CRC и 108/104 native file hashes проверены; отдельно 90 hashes reference evidence.

Подтверждён product defect: mouse tab selection меняла `prefs.studio_dock`, оставляя `Session.help=true`. Повторный F1 выключал невидимый флаг и не открывал Help. Новый Studio handler синхронизирует состояние с реально видимой вкладкой до прежнего toggle/routing. Legacy handler и modal gate сохранены. Две регрессии с реальными pointer press/release и F1 down/up падают на прежнем коде, проходят после исправления и сохраняют source, revision и точный Undo. Скрытая панель с remembered Help корректно открывается по F1. Новый app tree **`7d35e7b8064a651084fef931a827ac46b3448c6a`** требует собственного полного повторного GUI прогона. [Локальные gates и review](assets/2026-11-13-pgfplots-v2/repeated-f1/local-gates.json): **586 PASS / 0 failed / 4 ignored**, fmt/strict Clippy/locked build PASS; 45 PGF/AT4 и 34 compact contracts PASS.

[I61 run43408533757](https://github.com/i-shutov/tikzarium/actions/runs/43408533757) и [packaged N5 run43408533485](https://github.com/i-shutov/tikzarium/actions/runs/43408533485) остановлены прежними координатами original-X guard: фиксированная ширина Help изменила перенос строк Inspector. На оригинальных кадрах X находится в client `(1050,487)`, Apply на второй строке `(999,151)`; прежняя точка X возвращает свежий sentinel. Исходник шести инструментов неизменён; неправильной правки не было. Обновлены только эти координаты; исходный value/patch/Undo guard и весь сценарий сохранены. N2/N3 и отдельные R1/R3 отмечены собственными автоматическими PASS, но полный I61/N5 остаётся FAIL.

Отдельные восемь исходных AT4 reference PDFs прошли внешний XeLaTeX/font/source check и независимый просмотр всех восьми оригинальных PNG. Они имеют **EXTERNAL_REFERENCE_ONLY**: native Build/Export и сравнение с GUI-derived PDF ещё ожидаются. Последующий GUI retry сохраняет все 26+8 операций, исходники, критерии и независимые jobs.

## Продолжение CP07: реальная причина F1 и оригинальные AT4

Повторный published candidate `0d33710e4b20dbb8bdef6b2e5fe377e840bd20b9`, root tree `21ff51a8bf9083e03616c63abda44df41b43cdce`, проверен в [run43403624097](https://github.com/i-shutov/tikzarium/actions/runs/43403624097). Выбор оси и свойства прошёл; свежий clipboard подтвердил исходные `41`. F1 показал именно `PGFPlots: samples`. Затем длинный свёрнутый заголовок поиска расширил dock с 260 до примерно 307 px; прежний target возврата выбрал Libraries. Sentinel guard остановил прогон **до Apply**, исходник остался прежним. Original ZIP `3383760` bytes, SHA256 `3121c0759097c7a8840529203e2db3f763947e223082f5a2bb387a704f5f6056`; CRC и все **73** report hashes проверены независимо. Все 16 workflows этого head завершены: **15 SUCCESS / 1 PGFPlots FAIL / 0 pending**.

Это подтверждённый compact-layout defect и отказ маршрута QA; операция редактирования продукта не выполнялась. Новый блок исправляет ширину самой справки, сохраняет идентификатор её fold и весь поиск. Его собственная UNIT_EVENT regression воспроизводит старое расширение `225 → 307.15625 px`; новый native результат должен подтвердить положение панели после F1. Полные I61/N5 перепроверяются на новом app tree; прежняя приёмка остаётся привязана к CP06.

Дополнительно подключён отдельный native набор из восьми **неизменённых оригиналов AT4**, со своим scope, списком операций, source hashes, PID/ELF, source/clipboard/Undo/reopen/recorder/PDF. Основной V2 сохраняет все 26 операций. Matrix jobs V2 и AT4 независимы, `fail-fast=false`; ZIP имена различаются по suite, а восстановленный cache никогда не заменяет locked production build и текущую квитанцию.

| AT4 | Одна точная операция | Что сохраняется и отдельно проверяется |
| --- | --- | --- |
| 09 | Первый model addplot: `samples=161 → 181` | Формула `1/(1+Δ²)`, пик 1, чётность; пять точек второго ряда остаются модельными |
| 48 | Axis `width=10cm → 11cm` | Все четыре координаты и условные симметричные ошибки; дочерний `error bars/.cd` остаётся opaque |
| 49 | Axis `width=10cm → 11cm` | Пять положительных пар `E=h²`, две log оси, наклон 2 |
| 50 | Axis `width=10cm → 11cm` | Имена upper/lower, fill-between binding, условная полоса ±0.5 |
| 55 | Addplot3 `samples=21 → 25` | Формула `exp(-x²-y²)`, domain по x/y −2:2, положительная симметричная поверхность с центральным максимумом |
| 56 | Addplot3 `samples=181 → 201` | Параметрическая спираль, исходные градусы, два оборота, единичный радиус, z от 0 до 2; `samples y=0` |
| 58 | Axis `width=10cm → 11cm` | `unbounded coords=jump` и `(0,nan)`; отсутствие линии через разрыв требует просмотра PDF |
| 61 | Addplot `samples=161 → 201` | Исходный domain `.01:100`, модель Боде, значение −3.0103 dB при ωRC=1; асимптота −20 dB/decade |

Для предметного сравнения, включая шаг сетки Gaussian, AT4 job отдельно сохраняет reference PDFs восьми неизменённых оригиналов. Это явный внешний XeLaTeX, `EXTERNAL_REFERENCE_ONLY`, без GUI acceptance; он выполняется после native сценария, не заменяет его и при ошибке сохраняет неуспешный итог job. Оригиналы, console/recorder, fonts/text и renders сохраняются отдельно от GUI-derived PDF.

Научные source checks выполняются для фактического compiled-source после GUI Build/recorder proof. Они не переименовывают условные ошибки в доверительные интервалы и не являются визуальной приёмкой PDF. **45 offline evidence/scientific tests PASS** при интеграции, включая отрицательные мутации формул/чисел/путей/манифестов и исходных файлов. Ещё 34 compact I61/N2/R1/R3 contracts прошли без изменений критериев. [Локальные gates и независимые source reviews](assets/2026-11-13-pgfplots-v2/source-review/local-gates.json) фиксируют фактические команды, hashes и младшие модели. Точное следующее действие — новый locked production build, два native набора и независимый просмотр оригиналов.

## Bounded addplot3 и новый app tree

Сканер распознаёт точный суффикс `3` и необязательный один `+`, сохраняя исходный command range и привязку к оси. Поддержаны только прежние literal keys серии: `samples`, `domain`, `mark`. `domain y`, `samples y`, z/view, неизвестные выражения и macros не получают новых editable свойств. Отказанные `30`, `3x`, `3@foo`, `3.0`, `3_`, `3++` поглощаются до сбалансированного semicolon либо вызывают отказ разбора; вложенные команды не выдаются за независимые объекты. Девять регрессий проверяют исходные CRLF/hash AT4-55/56, mixed 2D/3D ownership, точные patches/inverses, stale revisions, namespace/duplicate guards и отрицательные формы. Независимый review исправленной версии не нашёл блокеров; это source-only scope.

Полные локальные gates объединённого production кода: **582 PASS / 0 failed / 4 ignored**, 27 test binaries; format, strict Clippy и locked offline app build PASS. Help изменяет app/src tree на `6ea8f033c5241781e895ecb54af3bb3b48bb0735`. Три exact app-tree pins I61/N2/workflow обновлены вместе с причиной и обязательным новым полным исполнением I61/N2/N3/N5/R1/R2/R3/R5. Проверки не сокращены; CP06 acceptance автоматически не переносится.

## Исправленный дефект

Комментарий перед повторным параметром мог скрыть его от поиска Inspector: из `samples=150,% comment` и следующей строки `samples=180` выбиралось первое значение, хотя фактическое поведение PGFPlots определяет повторный ключ. Новый разбор пропускает только граничные пробелы и комментарии, сохраняет внутренние комментарии и выявляет неоднозначность. Комментарий между частями ключа или значения не превращается в выдуманный literal token.

Ключ `/.cd` переключает пространство имён PGF. Редактировать последующий голый `samples` как параметр оси без интерпретации пути небезопасно. Такой список теперь `OPAQUE`; поддержанные вложенные axis plot styles проверяются тоже. Отдельный дочерний список `error bars/.cd` не блокирует независимую правку оси. Явно квалифицированные error-bar keys сохраняются и допускают поддержанную отдельную literal-операцию.

Это ограниченный source-preserving adapter. Он не вычисляет TeX, не переписывает формулы, комментарии или таблицы и не заявляет полный интерпретатор `pgfkeys`.

## Проверяемый native объём

| Вход | Операции и доказательства |
| --- | --- |
| Синтетическая формула | Все 15 доступных axis fields и 3 addplot fields: focused old/draft readback, неизменность source до Apply, минимальный patch, общий Undo, точный inverse |
| Синтетические внешние таблицы | 3 операции: axis ymax и mark двух рядов; исходные `.dat/.csv` побайтно неизменны; actual engine `.fls` должен подтвердить чтение обеих таблиц и текущего author source |
| SV-001 | `ymax=1.4 → 1.2`; максимум исходной гауссианы остаётся видимым |
| SV-003 | `xmax=1080 → 1000`; четыре периодических ряда и подписи сохраняются |
| SV-009 | `domain=0:1.5 → 0:1.4` первого addplot; исходная формула и все аннотации сохраняются |
| SV-022 | `width=0.6\textwidth → 0.7\textwidth`; формула и остальные параметры неизменны |
| SV-029 | `height=0.3\textwidth → 0.4\textwidth`; симметричные лепестки и стрелки сохраняются |
| SV-040 | Native TikZ `draw … plot`: только byte-preservation/reopen/GUI Build; Axis/AddPlot descriptor отсутствует, редактирование Inspector не заявлено |

Итого — **26 literal transactions в 8 входах**, ожидается 109 retained source/editor/PNG stages. В каждом редактируемом входе последняя операция применяется повторно, сохраняется и действительно перечитывается после отдельно наблюдаемого unsaved challenge. Далее Build/current Export выполняет production GUI. Точная сборка связывается с source head, app tree, PID/окном и фактическим `/proc/PID/exe`.

Все шесть SV runtime-файлов побайтно совпадают с исходным корпусом и сохраняют Charis SIL. Синтетические примеры используют DejaVu Serif и CRLF. Синтетические tick-distance операции подтверждают source transactions: явные tick lists имеют приоритет, а PDF строится только для финальной ревизии входа. Эти строки нельзя объявлять 18 отдельными оптическими приёмками.

## Идентичность и проверки

| Объект | Значение |
| --- | --- |
| Завершённая база CP06 | `48c096b3831a125802a890b73fbefa6d9632b627` |
| Первый code candidate | `a4d936c543a17bb7c2bc574ce741799f9353002a` |
| Root tree кандидата | `3d95f5d35fb3df9c6e602aa92bbd6657278e4c2e` |
| app/src tree | `fe40516186fb1728baceb40d0da137a780c1d9de` |
| Первый hosted run | [43400159227](https://github.com/i-shutov/tikzarium/actions/runs/43400159227), FAIL до первого Apply: candidate не выбран |
| Локальный workspace | **571 PASS / 0 failed / 4 ignored**, fmt и strict Clippy PASS |
| Evidence contracts | **19/19 PASS** после восстановления и исправления popup, UNIT_EVENT/negative artifact checks, без native claim |

Изменён production extensions scanner, поэтому старый ELF/PDF acceptance CP06 автоматически не переносится. Первый exact-head CI завершён: **15 SUCCESS / 1 native selection FAIL / 0 pending**. Независимые source/scanner и QA reviews не нашли production blocker; native приёмка требует отдельного просмотра оригиналов.

Первый GUI run остановлен точной проверкой поля: `Tab → Return` закрыл список, не выбрав axis. На original PNG по-прежнему видно «Выберите исходную команду», поля draft нет; clipboard содержит выделенный текст пояснения вместо `41`. Все пять source/editor/live/failure snapshots имеют исходный SHA и 19 CRLF. Действия Apply/Undo, Build/PDF не состоялись. Оригинальный ZIP: **2 290 048 байт**, SHA256 `d3bfbd3ac30038ad84921de1b195269049e47603ce93c7368c37d24763ff6272`; CRC всех 75 записей и 65 report hashes независимо проверены. Исправление должно касаться выбора UI-элемента; source guard сохраняется.

Продолжение после прерывания: все 25 staged файлов восстановлены побайтно в отдельную integration worktree. Исходная worktree сохранена. Выбор candidate переведён на реальные строки исходного popup; property menu ограничен фактически наблюдаемой геометрией, сбрасывает scroll и сохраняет оригинальные PNG. Точная проверка old/draft source остаётся обязательной перед Apply. Четыре новые регрессии используют исходный RGB strip неудачного run01 и проверяют отказ при неподходящей геометрии; все 19 offline contracts прошли повторно. Это исправление runner, его native результат ещё требуется.

Локальная попытка reference-only XeLaTeX не дошла до разбора SV-009: отсутствует `xelatex.fmt`, installed fmtutil config ссылается на отсутствующий файл. Этот отказ не является результатом проверки формулы; вместо изменения пользовательской TeX-установки используется уже подготовленный disposable hosted workflow. Reference font-only варианты отделены от неизменённых native SV originals.

У того же точного SV-009 SHA256 `5e6e3dfc2d2b44a74a0a3069e55a402900d2317580fd6991bf39c16648a86fac` есть отдельное [историческое R4 engine evidence](../roadmap/Tikzarium_Scientific_142_R4/evidence/compile-evidence.csv): XeTeX exit 0 и PDF, но [исходный console](../roadmap/Tikzarium_Scientific_142_R4/evidence/console/SV-009.txt) содержит два предупреждения о semicolon в `nullfont`. Это `HISTORICAL_EXTERNAL_XELATEX_PASS_WITH_WARNINGS`, не текущая native приёмка. Строгий новый glyph gate остаётся обязательным; успешный exit code с такими предупреждениями не превращается в PASS. SV-009 выполняется последним из той же восьмёрки V2, чтобы его известное предупреждение не блокировало доказательства остальных независимых случаев. Проверка engine success/TeX errors остаётся немедленной; перед строгим отказом по glyph warnings сохраняются также PDF/font/text/render/recorder diagnostics и явный `FAIL_STRICT_XELATEX_WARNING_GATE`. Общий результат и exit остаются FAIL; число операций и критерии не изменены.

## Восстановленные оригиналы AT4

[17 исходных примеров и полный оригинальный каталог AI88](../roadmap/AI_TIKZ_SKILLS_2026-11-10/README.md) теперь доступны с ID, canonical source URLs, размерами и SHA256. Оригиналы 09/34/35/48–61 имеют 8 097 байт суммарно; исходный 88-record catalogue имеет SHA256 `4a94885064027806d4c9df7220216a160a923a4346671973365e59aa3cee94a5`.

Независимый scanner probe выполнил exact axis width edit/inverse на 15 оригиналах. У groupplot59 и pgfplotstable60 нет обычного descriptor. Начальный intake probe также выявил отсутствие series option range у addplot3 в 55/56; этот bounded source gap исправлен текущим блоком, native результат ожидается. Все 17 содержат inline inputs; project-local внешних `.dat/.csv` в них нет. Intake не является S3/S4 и не меняет исходные научные `check`.

## Следующая исполнимая задача и сохранённые границы

Текущий исполнимый блок — V2 и оригинальные AT4 09/48/49/50/55/56/58/61: реальные axis/series edits, общий Undo, Save/reopen, GUI XeLaTeX и предметная проверка model samples/error bars/log slope/fillbetween/3D/gaps/Bode, плюс полный повторный I61/N5. Затем оставшиеся AT4 families и descriptor gaps: groupplots, pgfplotstable, native TikZ draw-plot, а также неохваченные SC3 keys/styles/ticklabels и 3D properties. Full SC3/AT4, SCI142/103 и scientific AI88 остаются пооперационными обязательствами.

G3, physical Win10/IME/DPI, весь Scientific Studio и последующие Asymptote → Typst/CeTZ остаются в принятом порядке. Текущий scope Linux/Xvfb/Openbox 1366×768, client1180×680, Midnight, если подтверждён оригиналами. PR остаётся draft; merge/stable/release GO не выдаётся.
