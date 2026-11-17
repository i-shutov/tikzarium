# CP09 — NativePlot, 17 научных AT4-сценариев и Visual Guide

Дата: 17 ноября 2026. PR [#189](https://github.com/i-shutov/tikzarium/pull/189) остаётся draft.

## Результат и точная область приёмки

Завершён ограниченный блок SCI-04: редактирование `samples` у закрытой формы native TikZ Gaussian plot; 17 AT4-операций с проверкой исходников, Undo, сохранения, повторного открытия и фактического GUI PDF; повторная проверка I61/N2/N3, compact и переносимого N5. Visual Guide построен из 14 оригинальных кадров проверенного приложения и прошёл постраничный просмотр.

Это приёмка перечисленных операций в hosted Linux/X11/Xvfb. Полная SC3, SCI142, SC4–SC6, G3 и физические Windows/macOS остаются отдельными открытыми задачами. Релизная готовность и merge не заявлены.

| Идентичность | Значение |
| --- | --- |
| Проверенный native source | `92a01f2a8d58718e4d1439b0343e9d0d03d6444d` |
| Root tree native source | `b13ba7d867f887352aaa873696a05d7454d7d277` |
| Production app/src tree | `b5759efbf0c200f3497e99d43ea8de4a110f1f85` |
| Генератор итогового Guide | `efe2e70845055e0fba9dfca7c511d1ca54f4d97d` |
| Итоговый Guide run | [44058148597](https://github.com/i-shutov/tikzarium/actions/runs/44058148597) |
| Guide PDF SHA256 | `06d8831772669b5f70e1f99ac99735230c5c5997c957c7a1d8a47075d1be069a` |

Позднее документальное обновление PR сохраняет production bytes. Оно не переносит приёмку на новый executable: native screenshots, PID/ELF, source и PDF остаются привязаны к указанному source92. Короткая сборка Guide отдельно записывает source кадров и source генератора.

## NativePlot и владение исходником

Новый `ScientificKind::NativePlot` поддерживает закрытую форму `\draw … plot[domain=…,samples=…] (\x,{exp(-\x*\x)});`. Доступна только правка целого `samples` в диапазоне 2…4096. Диапазон и формула остаются авторским текстом; приложение не вычисляет и не переинтерпретирует физическую модель.

Перед Apply проверяются revision, SHA исходника, ожидаемые байты и повторно распознанный владелец диапазона. Shared Undo возвращает исходные байты, включая Unicode и CRLF. Неизвестные макросы/неоднозначная арность и неподдержанные формы не получают эту операцию. Старые Axis/AddPlot/GroupPlot/Table операции сохранены.

На оригинальном SV-040 проверены `samples=50→80`, Apply/Undo, Save/reopen и GUI XeLaTeX. Gaussian, пик 1, оси, подписи и направляющие сохранены. Значения `±0.83` в исходнике приближают точную полуширину `sqrt(ln 2)≈0.8325546`; ошибка приблизительно 0.0025546 (0.307%). Приближение не исправлялось и не выдаётся за точное пересечение.

Полный контракт: [SCIENTIFIC_NATIVE_PLOT_SCOPE_RU.md](../docs/SCIENTIFIC_NATIVE_PLOT_SCOPE_RU.md).

## Научные AT4-операции

Свежий [PGFPlots run](https://github.com/i-shutov/tikzarium/actions/runs/44052884286) содержит 17 AT4-операций, 119 состояний и 17 GUI PDF-сборок. Все 2717 producer-файлов проверены по SHA; сохранены compiled source, recorder `.fls`, исходные и итоговые PDF. Для каждого случая просмотрены обе PDF-версии и реальный кадр текущего результата.

IDs: **09, 34, 35, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61**. Семь добавленных случаев — 34/35/51/52/53/54/57. Повторные сборки не считаются новыми научными операциями.

| Случай | Правка и научная проверка |
| --- | --- |
| AT4-34 | `samples=301→401`; sinc² guard в нуле, значение 1, симметрия, боковые лепестки и аналитические нули |
| AT4-35 | samples первой серии `251→301`; затухающая косинусоида, degree-семантика PGF, огибающие ±exp(-0.22x) |
| AT4-51 | `width=10→11cm`; две серии, порядок A/B/C, легенда и общий нулевой baseline |
| AT4-52 | `width=10→11cm`; 12 наблюдений, пять bins с counts [2,3,4,2,1]; normalization в источнике явно не задана |
| AT4-53 | `width=10→11cm`; подготовленные whisker/Q1/median/Q3/whisker 1≤2≤3≤4≤6; метод вычисления квартилей по отсутствующим raw data не заявлен |
| AT4-54 | `width=10→11cm`; 3×3 metadata, соответствие координат, отсутствие транспонирования, максимум 5 в (1,1) |
| AT4-57 | `height=6→7cm`, width 10cm и axis equal image сохранены; восемь ненулевых векторов (-y,x), ортогональность радиусу, ориентация против часовой стрелки и отдельная точка начала |

Остальные десять ранее выбранных AT4-операций повторены на source92 с отдельными source/PDF checks. Успешная численная или визуальная проверка одного примера не доказывает произвольную научную модель.

## V2 original и явно атрибутированные clean-копии

Оба набора прошли одни и те же **27 логических операций, 113 состояний, 8 GUI-сборок**. Это перекрывающееся покрытие, а не 54 новых операции.

- **Original остаётся FAIL:** SV-003, SV-029, SV-009 содержат по две строки semicolon/nullfont missing-character в actual GUI log.
- **Attributed clean PASS:** из каждого из трёх disposable файлов удалены ровно две соответствующие точки с запятой; исходный корпус не изменён.
- Независимо сверены 2268 original и 2242 clean producer-файла; просмотрены все 16 GUI-built PDF, все 16 кадров PDF, F1/Undo originals и шесть standalone isolation PDF.
- В standalone isolation original/clean raster-пары совпадают побайтово. Это не отменяет строгий FAIL исходников.
- Recorder сохранил 480 / 463 снимка и 5 269 767 / 5 190 489 байт при лимитах 512 / 64 000 000; ошибок записи нет.

Все 235 научных corpus source/assets (161 tex + 74 dat), а также три intake metadata файла совпадают с CP08. Clean-копии не заменяют corpus originals.

## Регрессии оболочки и переносимой сборки

[I61/N2/N3](https://github.com/i-shutov/tikzarium/actions/runs/44052884536), [compact mixed Undo](https://github.com/i-shutov/tikzarium/actions/runs/44052884613) и [N5](https://github.com/i-shutov/tikzarium/actions/runs/44052884627) повторены на source92.

Независимая проверка I61/N2/compact охватила 386 producer-файлов, 27 оригинальных GUI-кадров и шесть PDF-файлов (четыре уникальных содержимых). Подтверждены draft/Apply/Undo, dirty Cancel, CRLF/Unicode, library Connect/Disconnect, caret completion и F1.

Для N5 проверены package manifests, фактически запущенный ELF, R1/R3 dialogs, сохранение/экспорт, три hosted scale-состояния и четыре различных PDF. Наблюдаемый ELF SHA `a618b0359f9002fdc91fec3ecfc598b7868fd3dd4bc2e599de1329ec22463c66` отличается от SHA launcher; они не смешиваются. R5 repeat-package comparison подтверждён CI, самостоятельная локальная пересборка root не заявляется. Legacy I61/N5 evidence не содержит полного recorder dependency closure, в отличие от новых AT4/V2 build bindings.

## Visual Guide по реальному интерфейсу

Итог: **17 страниц A4 landscape; 14 реальных кадров; 3 встроенных Unicode-шрифта; 0 missing glyph / overfull / undefined-font findings**. PDF: **3 172 813 байт**. Все страницы просмотрены. Оригинальный build-report оставлен с честным producer-статусом `COMPILED_REQUIRES_INDEPENDENT_PAGE_REVIEW`; последующий просмотр оформлен отдельными review JSON.

Guide объясняет расположение интерфейса, видимый исходник, draft, Apply, Undo, повторное открытие, sinc/vector/table examples, NativePlot до/после сборки, внешние таблицы и F1. F1-страница показывает справку узла A; она не выдаётся за native-plot help.

Полноэкранные PNG 1366×768 в `assets/` побайтово совпадают с producer originals. В PDF/HTML показывается проверенная область окна 1182×704; пиксели оригиналов не переписываются. Подписи различают исходное значение, черновик и применённую правку, а также `Not built` и построенный PDF.

Guide сохраняет переносимые `guide.tex`, HTML, изображения, source manifest, логи, сведения о шрифтах и все page renders. Автоматические replay counts описывают записанные X11-события и разреженные координаты; это не исследование скорости человека или движения руки. Использованные пользовательские рекомендации сохранены только как provenance в checkpoint, полные тексты не опубликованы в git.

## Проверки, исправления и история отказов

Локальная база: **609 Rust PASS, 0 FAIL, 4 существующих ignored; fmt PASS; strict Clippy PASS; 196 Python PASS**. Повторно выполнялись затронутые наборы Python; результаты неизменного Rust source не выдаются за новый запуск. Дополнительные независимые probes считаются отдельно.

На source92 завершились 16 workflows: 15 SUCCESS и 1 PGFPlots FAILURE. В этом PGFPlots run AT4 и clean jobs успешны; original job сохраняет три строгих FAIL, первый Guide job не собрал PDF из-за отсутствующей font metric. Позднейший Guide proof — отдельный успешный run, а не переписанный результат PGFPlots.

Сохранены все ранние ошибки:

1. На e87a898 stale N2 app-tree lease остановил I61/N5; AT4 достиг прежнего общего предела 512 snapshot после 12 PDF. Исправлены привязки и конечные квоты на fixture, с обязательной обработкой late recorder errors; native product не менялся.
2. Guide source92: отсутствовала `pzdr.tfm`, PDF не был создан. В disposable CI добавлена явная font dependency и обязательный preflight.
3. Guide generator728ce6b: 17-страничный PDF собран, но шесть metadata hbox вышли на 4.80482pt. Исправлен перенос метаданных без уменьшения шрифта и без ослабления strict gates.
4. Guide generatorefe2e708: strict compile и последующий просмотр всех 17 страниц PASS.

## Следующий рабочий блок

Продолжать SCI-04: остальные SC3 операции и научную evidence matrix, затем SC4–SC6; единый каталог/F1 и source ownership остаются обязательными. Следующий локальный сценарий `PGFPlots addplot coordinates` для AT4-51 подготовлен в checkpoint как **предложение, пока не реализованное**. Точная правка B 5→5.5 и распределение задач не выдаются за текст нормативного плана.

SCI-03 document/build lifecycle и native G3, физические Windows/IME/DPI/macOS gates продолжаются отдельными доказательствами. После подтверждения общего scientific runtime сохраняется очередь Asymptote, затем Typst/CeTZ. Полный SCI142/AI88/SC3 и release GO остаются открыты.

Сводные хеши и идентификаторы: [acceptance-summary.json](assets/2026-11-17-cp09/acceptance-summary.json).
