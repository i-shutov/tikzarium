# PGFPlots V2: точное владение исходником и native научный маршрут

Дата: 13.11.2026. Рабочая ветка `feat/studio-scientific-integration-20261112`, существующий [draft PR #189](https://github.com/i-shutov/tikzarium/pull/189). Предыдущий завершённый блок — [compact I61/N5, CP06](2026-11-13_COMPACT_I61_N5_ACCEPTANCE_RU.md).

**Текущий статус: UNIT_EVENT / IMPLEMENTED_NOT_VERIFIED для нового hosted GUI объёма.** После двух retained native отказов подготовлен объединённый кандидат: compact Help, bounded addplot3 и исходные AT4. Итоговый source/GUI/engine/PDF статус будет записан по собственным оригиналам этой сборки.

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
