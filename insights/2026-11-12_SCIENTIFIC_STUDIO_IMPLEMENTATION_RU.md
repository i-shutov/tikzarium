# Scientific Studio: интеграция, ресурсы и атлас интерфейсов

Дата: 12.11.2026. Рабочий блок V1/V2 в рамках ST-SCI. [Draft PR #189](https://github.com/i-shutov/tikzarium/pull/189). Полный Scientific Studio v1.0.0 остаётся **NO-GO** до выполнения нормативного scope и независимой платформенной приёмки.

## Опубликованная основа и точность исходников

База main: `0a9831404687296a5467f89e77e873de8cdc5137`.
Ветка: `feat/studio-scientific-integration-20261112`.

Интегрированы сохранённые heads #172 (`1d82fbe958524418e05bb1d729c98955b4844caf`), #188 (`121f3d3453078d94759ce85f82707ad0d4c947e5`), #183 (`8d22580c5de7c4c38e6831440147e758308985a5`), #184 (`5f8a8afffb9b045fb061a5ed8616e3781450d1c9`) и #185 (`8670a3966680b72b7fbc7928c4b58a9b9d63a4a6`). История исходных веток сохранена родителями интеграционного commit.

| Контрольная точка | Remote commit | Точное дерево |
| --- | --- | --- |
| Восстановленная и проверенная интеграция | `af08b2e0f780ef2646b7a14881114301afae48a1` | `5ee3eb4d3018e3943a98b14105e5a8e6d61981c5` |
| Resource UI и генератор атласа | `723b5b536bd33dd419370847fae54a95fcd9d8fe` | `02697e004a3d0c0882512b017b99846ca98378c7` |
| Сохранённые PDF/PNG и validation fixes | `476d2c0007751183f6d94d9f0d05b11d234b7ec7` | `fc873d924d6c2df85b83a0e9acec5fb95446a146` |
| Итоговый проверенный код | `1784a48246cbdfd260fb80ce4731c7f165ad52c5` | `3bb17ee38e0f77d6d06a125d4076c70f1f707bf1` |

Последний локальный code commit — `a434d2669d21124944a581197a6214a4782ad9c0`; его полное дерево равно последней строке таблицы. Обычный git push не получил HTTPS credentials, поэтому разрешённая владельцем публикация выполнена аутентифицированным GitHub connector: SHA каждого blob и полного дерева сверены, branch ref обновлялся с expected SHA, без force. Временные поля API commit отличаются от локального commit; тождество проверенных исходников подтверждается деревом. Следующий commit добавляет только этот отчёт, RESUME и архив свидетельств.

Рабочая среда перезапустилась с потерей scratch во время выполнения. Опубликованная интеграция сохранилась; остальные изменения восстановлены, после чего заново выполнены приведённые ниже проверки. Результаты до перезапуска не подменяют текущие журналы.

## Изменение пользовательского сценария

**Инструменты и Inspector.** Шесть прямых команд Line, Arrow, Rectangle, Circle, Node и Cubic доступны в native rail; выбор инструмента не создаёт исходник и Undo. Проверены pointer events, Enter/Space и disabled controls. Основное действие подписано «Собрать PDF». Кнопки открытия, сохранения и экспорта используют фактическую доступность действия.

Компактный PGFPlots Inspector показывает выбранный объект, параметр, текущее и предлагаемое значение, «Применить» и F1. Для axis поддержаны 15 явных свойств: `samples`, `domain`, `xmin/xmax/ymin/ymax`, `xtick distance`, `ytick distance`, `width`, `height`, `mark`, `xtick`, `ytick`, `xlabel`, `ylabel`; для addplot — `samples/domain/mark`. Это ограниченный редактор литералов. Формулы и произвольные TeX-макросы остаются непрозрачными. Неизвестные engine defaults не заменяются выдуманными значениями. Применение использует минимальный revision-checked patch и существующий общий Undo.

**Право на изменение исходника.** Публичные поля RecognizedInstance не являются разрешением на запись. Перед поиском изменяемого значения заново проверяются revision, fingerprint и совпадение descriptor с bounded scan. Вложенные plot styles разрешены только для четырёх проверенных вариантов every axis plot/post `.style`/`.append style` и `samples/domain/mark`. Свойства legend/node/custom styles не присваиваются оси.

Независимое ревью выявило apparent scopes внутри определения окружения и строкифицированного TeX. Source-edit scanner теперь явно отказывает для неподдержанных `newenvironment`, `renewenvironment`, `string`, `detokenize`. Отказ относится ко всему документу и не меняет его bytes; это честное ограничение адаптера до реализации соответствующей грамматики.

**Ресурсы рядом с исходником.** В разделе «Библиотеки» добавлен read-only поиск `plot file`, `input`, `include`. Показаны точный путь из исходника, вид ссылки и физическая строка; переход действителен только для текущей revision. Макросы не раскрываются, файловая система не сканируется, наличие файла из ссылки не утверждается. Активный `plot file` ограничен Draw/Path/Fill/Clip; комментарии, вложенные группы, определения, строки и verbatim не создают фиктивных ссылок. Лимиты: 2 MiB исходника, 512 ссылок, 64 уровня групп. Verbatim closing marker поддерживается на отдельной строке; неподтверждённые формы не дают частичного успешного результата. В UI показаны первые 64 ссылки.

Лексические ссылки отделены от фактического `.fls` ledger. Ledger содержит author source и локальные входы, исходный и разрешённый путь, захваченный SHA-256 и результат сравнения bytes. Хеширование выполняется при захвате/явной проверке/экспорте, а не в каждом кадре. Экспорт проверяет текущий source и локальные ресурсы повторно; native picker проверяется до открытия и после выбора пути. Same-length edit, missing file, неверный source и неполный recorder блокируют подтверждение свежести.

## Проверки и исходные свидетельства

[Manifest](assets/2026-11-12-scientific-studio/manifest.json) перечисляет размеры и SHA-256 файлов внутри [архива оригинальных свидетельств](assets/2026-11-12-scientific-studio/evidence.zip). В архиве находятся исходные logs/JSON, TeX после проверенного patch, реально собранные PDF, их PNG-рендеры, точное QA environment и версии ресурсов. Шрифтовых бинарников, TeX-дистрибутива и credentials в архиве нет.

| Проверка | Фактический результат и предел |
| --- | --- |
| `cargo fmt --all -- --check`, `git diff --check` | PASS |
| `cargo test --locked --workspace` | **512 passed, 0 failed, 4 ignored**, 27 suites |
| `cargo clippy --locked --workspace --all-targets -- -D warnings` | PASS |
| Native Rust app + CLI build | PASS, Rust 1.91.0, Linux x86-64 |
| Production egui / JSONL API | PASS, 20 operations, actual unit-event routing |
| All declared API v0 actions | PASS, 53 requests, 26/26 actions, 13 expected rejections |
| Два explicit SC3 export tests | PASS, минимальные patches, точное inverse restore, исходный corpus не менялся |
| SC3 edited source → TikZarium CLI → XeLaTeX | PASS: axis bounds и style/ticks/height/mark, реальные PDFs, logs и просмотр рендеров |
| Оригинальные SV-001 и AK/F14_3 → XeLaTeX | PASS в изолированном QA environment, существующий `/usr/bin/xelatex` |
| AK/F14_3 → настоящий TikZarium CLI | PASS, 19858 bytes, 118 dependencies reported; отдельный runtime результат на code tree a865797/476d2c |
| Native GUI нового кандидата | **BLOCKED / NOT_RUN**: runtime рабочего стола после перезапуска не запускается |
| Windows10/IME/DPI/G3/полный SCI142 | **NOT_ACCEPTED**, прежние свидетельства на новый кандидат не перенесены |

Четыре ignored workspace tests: два специально запускаемых SC3 exports (выше выполнены отдельно), ручной CPU benchmark и дочерний owned-process probe, который вызывается родительскими тестами. Это не четыре неизвестных падения.

Headless API не подтверждает OS file picker, native screenshot, IME или реальные Windows DPI. Проверка `850×560` и виртуального масштаба в egui остаётся UNIT_EVENT.

Исходный SV-001: SHA-256 `d6f5f8ea1a5876b6ef191b07c8f7b35177fbe56ef152ed1ce564fbff66959301`. Axis-edited source: `43d473b71f96e9e9133c5e13928e4bdb2504a442c9938107ded65afeb75492b5`; style-edited source: `2d4f141bd5546286846f43e5e8e16fac0160936e7cd3d85d9962ab3db9674786`. Последние PDF hashes приведены в manifest. В F14_3 lexical test точно распознаёт три `\datadir/...dat`; CLI stdout сообщает число зависимостей, но не перечисляет их. Поэтому имена `.dat` не выдаются за подтверждённые именно этим stdout/TeX log `.fls` записи.

Hosted macOS на предыдущем `476d2c` обнаружил тестовое сравнение `/var` с `/private/var`; corrected assertion сравнивает canonical path по существующему контракту. Это не изменение механизма freshness. Новые hosted jobs относятся к собственным head SHA; завершённый Linux local run не является macOS/Windows PASS. CI-ссылки и конкретные заблокированные native gates сохранены в архиве; общий зелёный CI не объявляется.

## Атлас дизайна

[PDF, 14 страниц](../design/studio-atlas/published/TikZarium_Studio_UI_Atlas_RU.pdf), [превью главного экрана](../design/studio-atlas/published/TikZarium_Studio_UI_Preview.png), [генератор и инструкции](../design/studio-atlas/README.md).

Рабочая область держит editable TeX, эскиз/белый PDF и один Inspector рядом. Основная сборка подписана текстом; шесть прямых инструментов не прячутся в категории. Инспекторы показывают результат правки через одно «Применить» и Undo. Темы Light/Dark/Midnight/Paper меняют оболочку, не типографику самой фигуры. Отдельные страницы показывают PGFPlots, opaque formulas, F1, состояния сборки, экспорт, внешние ресурсы и следующий научный профиль.

Все экранные изображения — **дизайн-макеты**, не original screenshots приложения. Страницы компактной будущей раскладки и дополнительных движков имеют статус концепта. В макеты включены настоящие reference PDFs SV-001 и AK-F14_3, с подписью об их происхождении. Все 14 страниц отрендерены и просмотрены, кириллица использует embedded DejaVu. PDF: 151252 bytes, SHA-256 `5e22464b51e87c1b3b30925a14711bf62e7204b023e1e0235c5427a98497bf83`.

## Делегирование и независимое ревью

Реально использованы junior subagents **gpt-6-luna, high**, с отдельным владением файлами. Canonical task IDs:

| Агент | Чёткая задача | Проверка интегратором |
| --- | --- | --- |
| `/root/scientific_next` | Bounded resource scanner, его regressions и BuildResources helper; последующие false-positive fixes | Root source review, exact-tree tests/Clippy/build; main.rs bridge только root |
| `/root/atlas_design` | 14-страничный атлас и генератор; затем отдельное read-only ревью scanner/ledger | Root просмотр contact sheet и ключевых полноразмерных страниц; findings исправлены либо явно оставлены открытыми |
| `/root/recover_checkpoint` | Восстановление QA toolchain/resources, настоящие XeLaTeX/CLI fixture checks, hashes и CI failure audit | Root прочитал logs/notes, повторил SC3 CLI путь и сверил неизменность corpus |

Интеграцию, main.rs, общие границы source ownership, GitHub publication и статус приёмки держал `/root`. Review-only задания не выдаются за запущенные tests. Findings о macro/literal false references исправлены; ниже сохранены нерешённые границы build provenance.

## Открытые границы и следующий исполнимый шаг

1. **Build-start provenance остаётся открытым.** Snapshot захватывается после TeX. Если `.dat` изменится между чтением TeX и захватом SHA, post-build сравнение само по себе не доказывает соответствие PDF прочитанным bytes. Следующий SCI-BUILD шаг: воспроизводимый тест с управляемой подменой входа во время сборки, затем capture/validation до и после сборки либо эквивалентный проверяемый контракт. До этого нет глобальной гарантии freshness.
2. **Root проекта ограничен директорией author source.** Внешние `.fls` inputs явно не проверены; пути с выходом через `..`/symlink остаются fail-closed. В частности, parent-data layout F14_3 нельзя считать принятым для GUI export лишь по успешному CLI build. Нужен явный контракт project root и отдельный runtime test с тремя `.dat` до снятия этого ограничения. Не расширять root молча до всего диска.
3. **Новый native UI ещё не принят.** Наблюдавшийся сбой: `failed to start Node runtime: No such file or directory (os error 2)`. Existing `APP_TREE=bf8ec7532f7c3f11d32567722828b43c83c17a7d` в native X11 gate не заменён автоматически. Следующий GUI шаг — получить настоящий read-only кадр нового app, сверить layout/координаты, затем повторить compact source→Inspector→Undo→PDF с оригинальными PNG. Это отдельно от Win10 W0–W4/IME/96–120–192 DPI.
4. SCI142 142=100AK+42Sarov/103, научный AI88, G3 и native Asymptote/Typst/CeTZ остаются в полном scope v1.0.0. Переход к новым движкам после проверки shared scientific runtime; последующие домены: UML → BPMN → engineering → chemistry/biology → animation → other → data last. Этот блок не меняет version/tag и не даёт release GO.
