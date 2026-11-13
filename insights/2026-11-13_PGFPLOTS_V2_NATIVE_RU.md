# PGFPlots V2: точное владение исходником и native научный маршрут

Дата: 13.11.2026. Рабочая ветка `feat/studio-scientific-integration-20261112`, существующий [draft PR #189](https://github.com/i-shutov/tikzarium/pull/189). Предыдущий завершённый блок — [compact I61/N5, CP06](2026-11-13_COMPACT_I61_N5_ACCEPTANCE_RU.md).

**Текущий статус: CODE_VERIFIED / HOSTED_NATIVE_PENDING.** Кандидат опубликован; фактические source/GUI/engine/PDF результаты ещё проверяются. Этот раздел будет обновлён по оригиналам, до итоговой публикации отчёта.

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

## Восстановленные оригиналы AT4

[17 исходных примеров и полный оригинальный каталог AI88](../roadmap/AI_TIKZ_SKILLS_2026-11-10/README.md) теперь доступны с ID, canonical source URLs, размерами и SHA256. Оригиналы 09/34/35/48–61 имеют 8 097 байт суммарно; исходный 88-record catalogue имеет SHA256 `4a94885064027806d4c9df7220216a160a923a4346671973365e59aa3cee94a5`.

Независимый scanner probe выполнил exact axis width edit/inverse на 15 оригиналах. У groupplot59 и pgfplotstable60 нет обычного descriptor; addplot3 в 55/56 пока не получает series option range. Все 17 содержат inline inputs; project-local внешних `.dat/.csv` в них нет. Intake не является S3/S4 и не меняет исходные научные `check`.

## Следующая исполнимая задача и сохранённые границы

После native результата текущего блока — оригинальные AT4 09/48/49/50/58/61: реальные axis/series edits, общий Undo, Save/reopen, GUI XeLaTeX и предметная проверка model samples/error bars/log slope/fillbetween/gaps/Bode. Затем оставшиеся AT4 families и descriptor gaps: groupplots, addplot3, pgfplotstable, native TikZ draw-plot, а также неохваченные SC3 keys/styles/ticklabels. Full SC3/AT4, SCI142/103 и scientific AI88 остаются пооперационными обязательствами.

G3, physical Win10/IME/DPI, весь Scientific Studio и последующие Asymptote → Typst/CeTZ остаются в принятом порядке. Текущий scope Linux/Xvfb/Openbox 1366×768, client1180×680, Midnight, если подтверждён оригиналами. PR остаётся draft; merge/stable/release GO не выдаётся.
