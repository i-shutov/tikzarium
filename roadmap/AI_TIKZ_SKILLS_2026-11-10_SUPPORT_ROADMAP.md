# TikZarium — полная поддержка AI_TIKZ_SKILLS_2026-11-10 (после Windows 1.0)

**Тип документа:** целевой функциональный roadmap / acceptance contract, **не заявление об уже реализованных возможностях**.
**Дата инвентаризации:** 10.11.2026.
**Нормативный источник набора:** [AI_TIKZ_SKILLS_2026-11-10 на Google Drive](https://drive.google.com/drive/folders/1SVuTweUP2dl5718n0VPtcQ4ryB2ymUW0).
**Авторитетная таблица примеров:** [examples/catalogue.json](https://drive.google.com/file/d/1LU2otOJ0HWCBfDKHnAPxZwFew6oH0SSG/view) (SHA256 **4a94885064027806d4c9df7220216a160a923a4346671973365e59aa3cee94a5**).
**Трассировка всех объектов:** [AI_TIKZ_SKILLS_2026-11-10_88_CASES.csv](AI_TIKZ_SKILLS_2026-11-10_88_CASES.csv), 88 уникальных ID, соответствующие `examples/<stem>.tex`, пакет, библиотеки, движок, статус и ссылка на поле `check` оригинального каталога.

> **Scope gate:** текущий Windows 10 x64 релиз 1.0 **заморожен**. Ни один пункт этого roadmap не становится условием ранее принятой 1.0 и не разрешает менять исходники/бинарники release candidate. Разработка — отдельными post-1.0 ветками с exact-head CI и физической приёмкой. Авторитетны [release control](../docs/WINDOWS_1_0_RELEASE_CONTROL_RU.md), [AGENTS.md](../AGENTS.md), [Scientific-142 R4](Tikzarium_Scientific_142_R4/README.md). План не означает, что 88 сценариев, 35 пакетов или 142 рисунка уже поддерживаются в GUI.

## 1. Подтверждённый объём входного набора

| Компонент источника | Наблюдаемое содержимое | Обязательство для TikZarium |
| --- | --- | --- |
| `examples/catalogue.json` + `examples/*.tex` | **88** отдельных записей/исходников, **16** предметных классов; 85 `xelatex` и 3 `lualatex` | 88/88 записей импортированы без потери данных, сопоставлены с источниками и критериями `check`; отдельная проверка конкретного движка |
| Специализированные расширения | **35** пакетных имён (перечень ниже); дополнительно базовый `tikz` и вспомогательный `booktabs` | Названия и состояния в реестре, версии и справка, требуемые GUI-адаптеры поэтапно, поддержка TeX-кода независимо от наличия адаптера |
| Библиотеки в каталоге | **23** имени (перечень ниже) | Раздельные установлено/подключено/совместимо/GUI/справка, source-safe import/Undo |
| `skills/` | **13 доступных SKILL.md**, ещё одна папка `tikz-tool-interoperability/` без видимого `SKILL.md` | 13 проверяемых контрактов для маршрутизации, каталогизации и QA; недоступный skill — `SOURCE_MISSING`, не выдумывать содержимое |
| `VISUAL_GUIDE/` | HTML-атлас, PDF-атлас; исходный REVIEW указывает на **92 страницы**, изображения 88 примеров, контакты страниц, QA JSON | Просмотр/поиск/фильтры и переход «рисунок → TeX → требования → PDF»; отдельная проверка доставленных артефактов |
| `tools/`, `tests/`, `templates/`, `references/`, `dependencies/`, `.agents/` | Маршрутизатор, построение/аудит атласа, поиск, 3D/предметные проверки, шаблон карточки, локальный CTAN/версии, агентские ссылки | Составить воспроизводимый adapter/import и QA-маршрут, **не** встраивать произвольное исполнение Python/агентских skills в нативное приложение |

**Ограничение исходных свидетельств.** Отчёт `REVIEW.md` и `VISUAL_GUIDE/qa/verification.json` сообщают, что **88/88 образцов собирались в окружении набора**, проверены исходные hashes и атлас; это **не физическая приёмка TikZarium**, не полная проверка науки и не гарантия совместимости с установленным TeX пользователя. В verification приведены три математических model unit tests и три парные параметрические проверки, не 88 независимых научных доказательств.

**Контроль полноты Drive:** прямой листинг папки не показывал упомянутые в README `VISUAL_GUIDE/atlas.tex`, `VISUAL_GUIDE/build-report.json`, `dependencies/ctan-lock.json` и файл `SKILL.md` внутри `tikz-tool-interoperability/`. При A0 проверить, действительно ли они отсутствуют или недоступны коннектору, и сохранить факт/статус отдельно; не заменять файл ссылкой на чужой артефакт и не приписывать ему PASS. Для `VISUAL_GUIDE/artifacts` листинг выдаёт первые 100 объектов, поэтому нужен полный paginated manifest и сверка каждой пары PDF/PNG/log с каталогом.

## 2. Что именно означает «поддержка всех элементов»

Ввести **независимые уровни** для *каждого* ID и каждого пакета:

| Level | Обязательная функция | Что не считается достаточным |
| --- | --- | --- |
| **S0 — inventory** | Объект с ID, классом, движком, исходными зависимостями, версиями, правами и исходным SHA | Просто наличие пакета в списке или ZIP |
| **S1 — source** | Открыть исходный UTF-8 `.tex`, зависимости, комментарии, CRLF, macro/opaque выражения; безопасно редактировать текст, сохранить/открыть и сделать byte-exact Undo. Поддерживать компиляцию исходника внешним совместимым TeX | Перерисовать неизвестный код, подменить TeX выражение экранной координатой |
| **S2 — assisted** | Версионированная русская F1/Inspector/help/search по каждому использованному namespace/ключу; 5 отдельных availability states, конкретные требования двигателя и `UNKNOWN` при неустановленном значении | «Пакет установлен» = «все команды есть в палитре» |
| **S3 — native subject GUI** | Для каждого из 88 образцов хотя бы **одно содержательное предметное действие через реальный GUI**, изменяющее подходящий известный параметр/объект минимальным `SourcePatch`; Undo возвращает исходный SHA, PDF перестраивается через внешний движок | Только чтение/превью, copy-snippet, программно сгенерированное событие, фальшивый атлас |
| **S4 — verified** | Оригинальные TeX/PDF/PNG/log, versions/`.fls`/hashes, проверка координат/текста/глифов, отрицательные тесты, независимый предметный `check` и GUI-доказательство; отдельные `SOURCE, BUILD, STRUCTURE, VISUAL, SCIENCE, EXTERNAL_REVIEW` | Успешный exit 0 или равный PNG hash вместо научной приёмки |

**Смысл конечной цели:** 88/88 должны пройти S0–S4 на требуемой физической платформе; если визуальная правка конкретного opaque/macros случая пока невозможна, установить `OPAQUE / ADAPTER_MISSING`, обеспечить S1/S2 и оставить S3 **OPEN**, а не ложно закрыть пункт. Универсальный parser TeX, CAS, SPICE, физический симулятор и CAD **не требуются**: интерфейс реализует точные предметные source-native адаптеры для конкретных конструкций.

## 3. Полное покрытие 35 специализированных расширений

В скобках — репрезентативные образцы `catalogue.json`; полный record-to-package mapping находится в 88-case CSV. Сохранить точные имена, не имитировать пакет рисунком из отдельных линий.

| Домен / число | Все расширения и проверяемый предметный функционал |
| --- | --- |
| **Геометрия и математика (4)** | `tkz-euclide` (01,11,12; вычисляемые точки/центры), `tkz-elements` (65; объектная Lua-геометрия), `tkz-tab` (64; таблица знаков), `tikz-cd` (21,22; объекты/морфизмы) |
| **Графы и деревья (3)** | `forest` (07,23; деревья), `tikz-network` (66; веса/рёбра), `tkz-graph` (67; именованные вершины) |
| **Физика и оптика (7)** | `tikzphysics` (69), `physketch` (70), `tikz-optics` (33), `simpleoptics` (71), `optikz` (72), `pgf-spectra` (73), `pgf-interference` (74): модели, лучи, спектры, волны с осмысленными зависимостями |
| **Квантовые схемы (4)** | `quantikz` (10,46,47; типы вентилей, провода, control/target), `tikz-feynman` (75; вершины/линии), `tikz-feynhand` (76; ручная диаграмма), `blochsphere` (77; координаты состояния) |
| **Электротехника и инженерия (6)** | `circuitikz` (05,37–39; компоненты/порты/полярность), `tikz-timing` (78; временная шкала), `structmech` (79), `stanli` (80), `kinematikz` (81), `tikz-dimline` (82; связанные размеры) |
| **Химия и процессы (5)** | `chemfig` (06,43,44; связи/кольца), `mhchem` (45; заряд/баланс), `modiagram` (85), `chempid` (83; трубопроводы), `chemplants` (84; технологические узлы) |
| **Данные и 3D (4)** | `pgfplots` (09,34,35,48–59,61; оси, серии, uncertainty, logs, heatmap, 3D, панели), `pgfplotstable` (60; таблицы/формулы), `tikz-3dplot` (08,62,63; камеры/проекции), `lua-tikz3dtools` (86; Lua visibility) |
| **Планирование (2)** | `pgfgantt` (87; связи/этапы/шкала), `pgf-pie` (88; состав и доли) |

**Отдельные зависимости:** `tikz` — базовый язык, `booktabs` — оформление таблицы в №60; эти два имени есть в `packages` каталога, но **не увеличивают** заявленное число 35 специализированных расширений. Совместимость `tikz-feynman` с Lua layout, `pgfplots` с конкретным `compat` и пакетов с TeX engine надо устанавливать по документации установленной версии — не по одному успешному примеру.

## 4. Все 23 библиотечных имени

Каталог буквально содержит:
`angles`, `arrows.meta`, `automata`, `backgrounds`, `calc`, `circuits.ee.IEC`, `decorations.pathmorphing`, `decorations.pathreplacing`, `fit`, `graphdrawing`, `graphs`, `intersections`, `matrix`, `mindmap`, `optics`, `patterns`, `petri`, `positioning`, `quantikz2`, `quotes`, `shapes.callouts`, `shapes.gates.logic.US`, `shapes.geometric`.

Для каждого имени нужны: owner package/библиотека, требуемый engine, статус установленности, source-load check (`\usetikzlibrary` или package-specific import), наличие GUI adapter/help, source-preserving Connect/Disconnect/Undo, version/manual provenance. **`graphdrawing` / пример 68 — LuaLaTeX**, а не готовый XeLaTeX-native layout. `quantikz2` и `optics` проверять в контексте соответствующих пакетов, не выдавать за базовые core TikZ libs без version check.

## 5. Полное покрытие 16 тематических классов (88/88)

| Класс | Сценариев | Функции предметного GUI и независимые проверки |
| --- | ---: | --- |
| Геометрия | 8 | Центр, окружности, высоты, пересечения, проекции, трансформации, полярные кривые; инварианты расстояний/выражений |
| Механика | 6 | Траектории, силы, пружины, опоры, движения; единицы/направления/условность модели |
| Оптика | 8 | Рефракция, линзы, скамья, волны, интерференция, спектр; закон/приближения/диапазон |
| Квантовая физика | 3 | Уровни и диаграммы взаимодействия; типы стрелок/вершин/энергетические знаки |
| Электротехника | 7 | RLC/RC, диоды, ОУ, IEC gates и timing; топология/полярность/шкала |
| Химия | 5 | Структура, кольца, реакции, орбитали; валентность/заряд/баланс |
| Графы и иерархии | 8 | Деревья, сети Петри, автоматы, weighted graph, Lua layout; адресность/кратность рёбер |
| Пространство | 4 | 3D frame, скрытые рёбра, сферы, Lua surface; камера/окклюзия |
| Научные данные | 17 | PGFPlots: error bars, лог-шкалы, gaps, bands, bars, histogram, boxplot, heatmap, surface, поля, groupplots, таблицы |
| Квантовые вычисления | 4 | Qubit wires/gates, measurement, SWAP и сфера Блоха; индекс и control-target |
| Алгоритмы и структуры | 3 | Flowchart, mindmap, matrix/fit data flow; связь объектов/коннекторы |
| Математические структуры | 3 | Commutative diagram, exact sequence, tkz-tab; предметная корректность отдельно |
| Типографика и оформление | 3 | Layers/callouts, clipping/patterns, braces/dimensions; связанность аннотаций |
| Инженерные схемы | 5 | Controller, structural forces, beam, kinematics, dimensional drawing; порты/размеры |
| Технологические процессы | 2 | P&ID и chemical plant; трубопроводная топология и обозначения |
| Планирование и коммуникация | 2 | Gantt, pie chart; зависимости задач, доли и подписи |

**Однозначные 3 Lua-case ID:** `65 lua-midpoint`, `68 lua-graph-layout`, `86 lua-surface`. Остальные 85 кейсов зафиксированы в оригинальном каталоге как `xelatex`; если локально пакет потребует другой engine, это **несовместимость/отдельный migration proposal**, не разрешение скрытно переключить TeX.

## 6. Пакет skills, инструменты, референсы — тоже в scope

**13 настоящих skill-контрактов:** `tikz-workflow-router`, `tikz-semantic-diagrams`, `tikz-euclidean-constructions`, `tikz-physics-optics`, `tikz-circuits-engineering`, `tikz-chemistry-quantum`, `tikz-graphs-structures`, `tikz-3d-geometry`, `pgfplots-scientific-plots`, `tikz-source-reconstruction`, `tikz-figure-collection-qa`, `tikz-source-preserving-editing`, `tikz-command-catalogue`. Их требования надо выразить в versioned TikZarium catalogue/Inspector/help/QA и subject adapters, **не** исполнять произвольные инструкции skills как локальный плагин. Дополнительная `tikz-tool-interoperability/` пока `SOURCE_MISSING`.

**Внешний инфраструктурный контур:** `tools/find_examples.py` (поиск по классу/пакету/движку), `tools/atlas_build.py` и `tools/build_visual_guide.py` (HTML/PDF атлас), `tools/check_parametric_examples.py`, `tools/render_atlas_qa.py`, `tools/prepare_atlas_dependencies.py`, `tools/unpack_documented_sources.py`, `tools/check_html_atlas.cjs`; тесты `check_bundle.py`, `audit_visual_guide.py`, `audit_atlas_delivery.py`, `test_domain_models.py`, `check_failed_build.py` и `trace_navigation.py`; `templates/FIGURE_CARD.md`; `references/SOURCES.md`, `DOMAIN_PACKAGES.md`, `IMAGE_EXAMPLES.md`, `INTEGRATION.md`, `SCIENTIFIC_142_R4.md`, `KARLOV_R3.md`. Сохранить воспроизводимые команды и статусы. Эквивалентное нативное UI-поведение не означает необходимость поставлять Python, Node или shell tools всем конечным пользователям.

**Зависимости и права:** `dependencies/core/pgf` (в описании источника PGF 3.1.12), `core/pgfplots` (1.18.3), `ctan/`, `support/`, `archives/` и запертый CTAN checksum/лицензии. Источник демонстрирует локальную офлайновую сборку, но TikZarium **не должен** молча устанавливать/обновлять MiKTeX, TeX Live, CTAN или fonts и не должен перепаковывать сторонние архива/шрифты без проверки лицензий. Пользовательский внешний engine имеет приоритет; isolate `TEXINPUTS`/`LUAINPUTS` только для явной тестовой задачи, не на уровне системы.

**Атлас:** `VISUAL_GUIDE/index.html`, `atlas.pdf`, связанные `.tex`, PDF/PNG, `build-report.json` и `qa/verification.json` должны быть доступны как артефакты сравнения в одном проектном Figure Explorer. Точки: 88 примеров, HTML-фильтры, исходный код, PDF/PNG, карта пакетов и error/stale. 92-page PDF — исходный отчёт, не автоматическое подтверждение продукта.

**R5 и Scientific-142:** R5.1 skills/registry и signed artifacts не переписывать; `Scientific-142 R4` 100 AK + 42 Sarov, **103 требования** — отдельный независимый gate L0–L4, а не ещё 142 примера в этой таблице. При обновлении версий пакетов сохранять оригиналы и `compat=1.17` R4; новые проекты выбирать документированный стабильный числовой `compat` (при источнике PGFPlots 1.18.3 документирован `compat=1.18`), миграцию выполнять только в отдельной копии с полной повторной приёмкой.

## 7. Последовательность реализации — крупные, проверяемые блоки

| Workstream | Результат, без архитектурного разрастания | Gate закрытия |
| --- | --- | --- |
| **AT0 — Intake & ledger** | Замороженный импорт/хеш источника, 88-case CSV, 35 packages, 23 libs, 16 classes, 13 skills, engine mapping, полное дерево зависимостей и прав; отдельный журнал недоступных source артефактов | 88 уникальных ID, 88 source paths; SHA и все declared dependencies; контроль отсутствующих/дубликатов; архивный источник не изменён |
| **AT1 — Source/engine runtime** | Существующий безопасный `.tex` source editor и revision guarded `SourcePatch`/Undo, project engine capability. Explicit per-project opt-in LuaLaTeX для №65,68,86 **после 1.0**, без замены XeLaTeX-default и с отдельным engine guard | 88/88 external compilation on declared engines (85 Xe + 3 Lua), negative engine-mismatch tests, no shell escape/auto install, original bytes and dependencies preserved |
| **AT2 — Package/library catalogue** | Registry 35+23 с version, engine, source-load, installed/loaded/compatible/adapter/help; общий справочник F1/Inspector/completion | Каждый namespace связан с первоисточником/примером, пять статусов раздельны, default UNKNOWN если не подтверждён, import/Undo не устанавливает пакеты |
| **AT3 — Geometry/graphs/layout** | tkz/tikz-cd, forest/graphs/petri/network, transformations/scopes/angles/3D; семантические сущности и sparse source patches | Для каждого соответствующего ID тест изменения параметра, топологии/геометрических инвариантов, Undo byte exact; opaque отказ корректен, но S3 остаётся OPEN |
| **AT4 — Scientific data/PGFPlots** | `axis`/`addplot`/table, error bars, gaps, log, bands/fillbetween, plots, 3D, groupplots и таблицы на реальных примерах №09,34,35,48–61 | Исходные данные, единицы, series/range/compat и axes сохраняются; UI реальная source→XeLaTeX→PDF; отдельные негативные примеры |
| **AT5 — STEM domain adapters** | Пакеты физики/оптики, CircuitikZ/IEC/timing, engineering/structures/P&ID, chemfig/mhchem/modiagram, quantikz/Feynman/Bloch | Для всех их case IDs реальные GUI-параметры, портовая/химическая/квантовая топология + независимый предметный критерий; рисунок не «проверяет физику» сам |
| **AT6 — Figure Explorer & skills interoperability** | Поиск по 16 классам, 35 packages, 23 libs, engine, F1, карточка `FIGURE_CARD`, сопоставление HTML/PDF/TEX/исходников; источник readonly, не исполняемый agent package | Все 88 discoverable, открыть и вернуться назад без потери исходника; оригинальные ссылки/лицензии/preview; empty/missing skill явно маркируется |
| **AT7 — Full 88 physical L3/L4 QA** | Batch QA toolchain как внешний процесс, UI измерения — реальные native desktop, оригиналы исходников/PNG/PDF/log/.fls/SHA, проверка зависимостей/stale, научных инвариантов и рецензирования | 88/88 S0/S1/S2/S3/S4 с конкретными evidence; ни одного «NOT_RUN» под видом PASS. 3 Lua на отдельной совместимой среде |
| **AT8 — Scientific-142 reuse** | Применить готовые адаптеры к 100+42 corpus без изменения подписанного R4, сравнить с существующими 103 требованиями и L0–L4 | Отдельные 142-case матрица/акты, отдельно source migration с PGFPlots compat, без смешивания с 88-каталогом |
| **AT9 — Product release qualification** | UX/производительность, versioned package/engine matrix, Win10/11, macOS ARM и Linux, changelog, known issues и supported ranges | Exact-head hosted matrix + физические платформенные тесты и независимая визуальная проверка; отдельное GO post-1.0 release |

### Минимальные обязательные тесты для каждого из 88 ID

1. `S0`: исходный файл SHA, исходный набор зависимостей, version/engine/project CWD и record из `catalogue.json`.
2. `S1`: загрузка/редактирование/сохранение/reopen/Undo; провокация OPAQUE, UTF-8, CRLF, комментариев и stale revision (без подмены неизвестных команд).
3. `S2`: правильное владение ключом и его help с подтверждёнными версиями, без выдуманных значений или пакетов.
4. `S3`: **реальное физическое UI-действие**, SourcePatch SHA old/new/Undo, успешный повторный PDF; если adapter отсутствует — статус OPEN и конкретное требование.
5. `S4`: проверка оригинального `check` в каталоге (предметный инвариант), PDF font/glyph/ToUnicode, рендер при конечном размере, source+dependency hashes, визуальное/научное/внешнее решения отдельно.

### Ограничения безопасности и управления

- Один активный рисунок, обычный исходник и внешняя TeX-компиляция — базовый контракт TikZarium. Не добавлять обязательный облачный сервис, парсер всех TeX макросов, встроенный CAS, общий z-buffer/solver или выполнение недоверенных скриптов ради совместимости с этими 88.
- Переключение XeLaTeX→LuaLaTeX — **явное**, пер-проектное и только после изолированного security/compatibility review; не переписывать чужой документ, не включать `shell-escape`, не обновлять TeX автоматически.
- Изменение общего стиля, версии пакета, движка, `compat`, шрифта или входной таблицы инвалидирует затронутые GUI/растр/научные gates. `last-good` PDF хранится со статусом STALE после ошибок.
- Никаких изменений публичного R5.1 или подписанного Scientific-142 R4 без отдельной согласованной версии. Сохранять лицензии CTAN, чужих примеров, семейства шрифтов и ссылки, не дистрибуировать пользовательские fonts.
- Ответственные по действующей схеме: **A** external engines/core/source, **B** GUI, **C** пакеты/семантика/помощь, **D** независимый QA/источники, **integrator** source integrity и редкие крупные merges. Критерии измеримые; не обещать сроки на основании количества PR.

## 8. Правило обновления roadmap и фактического прогресса

Таблица `88_CASES.csv` — **обязательная per-ID ведомость**, но в этом коммите все статусы `PLANNED_NOT_VERIFIED / NOT_ASSESSED`: подготовлен только roadmap. Любой последующий PR по AT0–AT9 должен обновлять ровно затронутые строки, добавлять source SHA, версии пакетов и ссылки на действительные тесты и проверенные оригиналы, не выставляя PASS из прежней сборки набора.

**Definition of Done общего объёма:** 88/88 исходных случаев имеют S0–S4 с provenance и физическими проверками для заявленной платформы; 35 специализированных package records и 23 libraries отражают реальные engine/tool/help states; 13 Skills представлены проверяемыми контракторами без произвольного исполнения; отдельный Scientific-142 R4 не теряет свои baseline SHA и инварианты. Только после этого «все элементы набора поддерживаются» можно писать без оговорок.
