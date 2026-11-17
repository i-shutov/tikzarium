# CP09: native TikZ plot / samples — закрытый source-owned scope

Операция SC3-05 для неизменённого `SR/SV-040/figure.tex`: распознать native TikZ `plot`, выбрать «Число точек», применить `samples=50 → samples=80`, отменить одной общей Undo. Это отдельный `ScientificKind::NativePlot`, а не PGFPlots `AddPlot` и не полный AST TikZ.

## Контракт исходника

Поддерживается только форма:

```tex
\draw[blue!50!black,smooth,thick] plot[domain=-1.6:1.6,samples=50] (\x,{exp(-\x*\x)});
```

Пробелы допускаются; набор стилей draw ограничен `blue!50!black`, `smooth`, `thick` без повторов. В plot обязательны ровно два уникальных прямых ключа `domain` и `samples`, в любом порядке. Domain — две конечные возрастающие десятичные границы, samples — целое 2…4096. Формула строго `exp(-\x*\x)`; Rust её не вычисляет. Только `samples` доступен для редактирования. Editor bound 2…4096 не является ограничением TeX.

Descriptor range принадлежит всей команде draw до `;`, option_range — только внутренности `plot[...]`. Старый Draw не дублируется для этой команды. Остальные draw сохраняют отдельные лексические диапазоны и не получают эту операцию.

Перед чтением и правкой повторно проверяются revision, SHA-256 всего исходника и точное равенство descriptor с результатом нового сканирования. Изменение — существующий SourcePatch с expected bytes `50`, replacement `80` и source revision. Формула, domain, оси, подписи, стили и все посторонние байты остаются прежними. Shared Session Undo возвращает точные исходные байты, включая Unicode и CRLF. После Apply требуются новое распознавание и новое владение.

## Закрытый контекст

Отдельный консервативный проход использует существующие bounded helpers групп, комментариев, control words и path semicolon. Он допускает известные стандартные декларации неизменённого SV-040: standalone/tikz, конкретные package/library/language объявления, `\newfontfamily\cyrillicfont`, слои, неиспользуемый стиль `add reference`, `compat=1.17`, числовую функцию `gauss` и document/tikzpicture. Их аргументы потребляются по явно известной форме. Словарь/семантика существующих CP08 Axis/AddPlot/GroupPlot/Table не расширяются.

Неизвестные вызовы до или после графика, определения/переопределения, conditionals/token controls, `^^` escapes, неизвестные окружения, unowned groups и неподдерживаемые декларации блокируют native операцию. Число аргументов неизвестного макроса не угадывается. В соседних обычных draw запрещены любые TeX controls, включая `\x`; этот параметр допускается только внутри целиком проверенной native plot-команды. Это проверка владения исходником, не обещание изоляции или безопасности исполнения TeX.

`coordinates`, `file`, `function`/gnuplot, `table`, произвольная формула/переменная, дополнительные plot operations, node suffix, вложенные/handler/namespace ключи, повторяющиеся ключи и неоднозначные владельцы не получают NativePlot. Исходник остаётся доступным текстовому редактору.

## F1 и первоисточник

Проверен онлайн [TikZ & PGF Manual §22.5 Plotting a Function](https://tikz.dev/tikz-plots#tikz/samples), ключ `/tikz/samples`, 17.11.2026: параметр определяет число выборок функции, а coordinate expression вычисляется с переменной `\x`. F1 использует отдельное native описание, тип, editor bound, пример и этот locator. Значение default остаётся `UNKNOWN`: версия установленного PGF и соответствие онлайн-редакции не подтверждены. PGFPlots help не подменяется native описанием.

## Проверки и предел свидетельств

Unit/event проверки используют оригинальный fixture, полный исходник до/после `50→80`, один inverse/общую Undo, Unicode/CRLF, соседние draw и два независимых native owner. Отрицательные проверки покрывают чужой диапазон options, forged kind/range, stale hash/revision, неверные expected bytes, неподдерживаемую property, samples вне bounds, неизвестные макросы, закрытые контексты и неподдерживаемые формы plot. Старые списки Axis 15 / AddPlot 3 / Group / Table сохранены.

Логи локальных Rust проверок находятся в `validation/cp09/native-plot` рабочего окружения. Эти проверки сами по себе имеют статус UNIT_EVENT; native GUI, реальный XeLaTeX/PDF, Save/reopen, Linux/Windows и независимая приёмка требуют собственных свидетельств на точном интегрированном head. Полный native TikZ AST, произвольные формулы/стили и остальные операции SV-040 не заявляются.

## Последующая native-проверка CP09

На source `92a01f2a8d58718e4d1439b0343e9d0d03d6444d` операция SV-040 `samples=50→80` прошла реальные Apply/Undo/Save/reopen/GUI XeLaTeX и независимый просмотр PDF в hosted Linux/X11. Formula/domain/annotations и исходный corpus сохранены. Original и attributed-clean V2 проверены отдельно; строгие предупреждения трёх других original fixtures остаются FAIL. [Итоговый CP09 report](../insights/2026-11-17_CP09_NATIVE_PLOT_AT4_VISUAL_GUIDE_RU.md) фиксирует source, run, пределы приёмки и отдельную сборку Visual Guide. Физические Windows/macOS и полный SCI142 этим результатом не закрываются.
