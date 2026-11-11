# TikZarium Studio — продуктовая спецификация

**11 ноября 2026, редакция SCIENCE_FIRST_DATA_LAST.** Это целевой продукт, не описание уже реализованных функций. Последняя команда владельца задаёт порядок: **научная графика → UML → BPMN → инженерия → химия/биология → анимация → остальное → данные последними**. Подробный порядок и приёмка — в [едином roadmap](ROADMAP.md), ближайшие задачи — [в исполнительском плане](../plans/2026-11-11_STUDIO_REBASE.md).

## 1. Продукт и приоритет

TikZarium Multi-Engine Scientific Studio — локальная профессиональная среда научной и технической графики. Единый красивый интерфейс объединяет проекты, native sources, предметные инструменты, сборку, предпросмотр, диагностику, публикационный экспорт и поэтапно все утверждённые направления. TikZ — первый полноценный профиль, не предел архитектуры.

Первый продуктовый результат — **научная Studio**: рисунок/формула/геометрия/поддержанная поверхность → source + visual editing → сборка → проверка → качественный экспорт → повторное открытие без потерь. UML и BPMN следуют после научной графики, а не заменяют её ранней общей диаграммной платформой. Data Figure и анализ данных — последняя поставка, а не обязательный стартовый экран.

Studio foundations развиваются вместе с первым научным сценарием. Общая архитектура готова к нескольким языкам, но не требует сначала интегрировать Graphviz/D2/Mermaid, полный compositor и data stack. Конкретный кандидат выпуска имеет ограниченный scope, freeze и реальную приёмку; стратегия не публикует stable версию сама по себе.

## 2. Все прежние обязательства сохраняются

Шесть настоящих TikZ-инструментов, editable TeX рядом с рисунком, русская F1, библиотеки, компактный Inspector/один Apply/Undo, обычные .tex/.tikz, внешний XeLaTeX/MiKTeX, качественный PDF, Light/Dark/Midnight/Paper и source safety остаются. Все UX-F01…F14 обязательны. SCI142=100AK+42Sarov/103 requirements и AI88=88 cases/35 packages/23 libraries/13 skills имеют отдельную полную приёмку. PGFPlots SC3/AT4 — одна ранняя реализация для двух независимых ведомостей.

Перенос данных в конец не разрешает сломать existing .dat/.csv inputs научных примеров или отложить обязательный static PGFPlots case. Сохранение native resources, hashes и invalidation — научная совместимость. Новый import UI, column mapping, transformations/statistics, dashboards и Vega-Lite/Matplotlib/Gnuplot/Plotly integrations — ST-DATA.

## 3. Проект, документы и публикация

Проект хранит обычные native sources, рисунки, assets и явные зависимости. Метаданные описывают profile/engine/working root/output relationships, не заменяют языки закрытым монолитным форматом. Данные могут существовать как файлы ресурсов до появления data-продукта.

Каждый документ имеет ID, ревизию, saved/dirty state, view/caret/selection и историю. Tabs/Open/close/external-change не теряют source или pending draft; конфликты требуют явного сохранения/отмены/сравнения. No-op операции не меняют Unicode/CRLF/comments/unknown fields. Несколько документов не равны одному универсальному многофигурному холсту.

Для научных рисунков сразу нужны корректные физические размеры, labels/fonts/formulas и принятые экспортные маршруты. **Полная междвижковая Publication Studio относится к ST-OTHER:** отдельный linked composition document, панели/сетка/выравнивание/подписи (a)/(b)/общие стили и profiles, invalidation от компонентов. Исходник компонента остаётся редактируемым; PDF/SVG не объявляются восстановленным TikZ.

## 4. Карта интерфейса и последовательность активации

| Область | Контракт | Когда активируется |
| --- | --- | --- |
| Project Hub / Explorer / tabs | Проект, документы, ресурсы/зависимости, поиск/возврат, сохранение контекста | Минимально в ST-SCI, расширяется по доменам |
| Source + Preview workspace | Native language, подсветка/gutter/Find/Replace/Go to line, Undo; точный result, pages/zoom, current/stale/error | ST-SCI и регрессии во всех профилях |
| Toolbox / Inspector / Outline | Шесть direct TikZ tools; параметры/единицы/один Apply/F1; outline/layers только доказанных конструкций | ST-SCI, затем предметные profiles |
| Build Centre / Engine Manager | Явный engine/path/version, capabilities/dependencies, очередь/cancel/diagnostics/last-good | На существующем XeLaTeX и научном дополнительном engine |
| UML workspace | Поддержанные diagram kinds, элементы/отношения, native source/свойства | ST-UML |
| BPMN workspace | Native model/diagram representation, palette/Inspector/validation, save/reopen | ST-BPMN до инженерии |
| Engineering / Chemistry / Biology | Профильные инструменты/семантика/экспорт, общая оболочка | ST-ENG и ST-CHEMBIO |
| Animation workspace | Native сцены, параметры, timeline, кадры/media | ST-ANIM до остальных extras |
| Publication / extended vector exchange | Linked multi-panel composition, physical layout, обратные ссылки на sources | Полная версия ST-OTHER |
| Data Figure | Таблицы, столбцы, units/types, transformations, статистика, воспроизводимый plotting | **ST-DATA — последним** |
| History / Compare / F1 | Source transactions, сравнение, одна контекстная карточка/manual/version, сохранение focus | Общая работа по нуждам активного домена |

Согласованная карта UI-00…UI-13 сохраняется и расширяется; не выдавать будущие вкладки за работающие функции. Общий UI не состоит из чужих окон/iframe. WebView или внешний editor требуют доказанного сценария, offline/security/licence и возврата в Studio.

## 5. Предметные профили в порядке владельца

1. **Научная графика:** TikZ/PGFPlots/SCI142, Asymptote, Typst/CeTZ, scoped mathematical Penrose; статическая научная 2D/3D-графика. Общие механизмы вводятся для этого сценария.
2. **UML:** подтверждённое подмножество структурных/поведенческих diagram kinds; кандидаты native TikZ/UML и PlantUML, дополнительные renderers только по доказанной семантике. Generic graph не приравнивается к UML.
3. **BPMN:** native .bpmn/XML и supported model/diagram edits; bpmn-js — кандидат integration, не уже выбранный runtime. Редактор не объявляется execution engine.
4. **Инженерия:** прежние engineering-пакеты, Circuitikz, WaveDrom, SchemDraw, WireViz; connections/units/domain invariants.
5. **Химия и биология:** прежние chemistry-пакеты, RDKit, биологические схемы и предметные шаблоны; layout не подменяет научное содержание.
6. **Анимация:** Manim/поддержанные scientific scenes/timeline, кадры и verified media exports; не reverse engineering произвольного Python.
7. **Остальное:** standalone generic Graphviz/D2/Mermaid, LikeC4/Structurizr, SVG/PDF/editor exchange, Excalidraw/diagrams.net/Ipe, full Publication, optional local/user Kroki; tldraw/Blender bridge по отдельной feasibility.
8. **Данные:** Data Figure, Vega-Lite/Matplotlib/Gnuplot/Plotly, import/mapping/transformation/statistics и interactive analysis — строго в конце.

Все новые технологические строки являются кандидатами. Версии, лицензии, actual export formats, runtime dependencies, платформы, безопасность и способы интеграции подлежат primary-source проверке до реализации/поставки. Это план, а не новые подтверждённые сведения о внешних продуктах.

## 6. Уровни интеграции

ME-L1 — native source и просмотр; ME-L2 — editable code/build/diagnostics/cancel/save/export; ME-L3 — перечисленные предметные операции с минимальным reversible source patch; ME-L4 — source mapping и двустороннее редактирование заявленного subset с round-trip tests. Они отделены от SCI-L0…L4 и AI-S0…S4.

ME-L2 не равно визуальному редактору, OPAQUE не равно выполненному MUST, а одна красивая картинка не доказывает UML/BPMN/химическую или физическую корректность. Произвольные TeX/Python/macros/SVG и все возможности языка не обещаются как universal scene graph.

## 7. Красота и эргономика

Премиальная научная студия: единая типографика, отступы, ясные primary/secondary действия, качественные векторные иконки, аккуратные панели и различимые hover/active/focus/disabled/error. Все четыре темы согласованы, figure typography/colours не меняются от темы GUI. Декоративные эффекты не уменьшают рабочую площадь и не задерживают ввод.

Принять реальные screens научного проекта/ошибки/F1/stale/export прежде чем переходить к другим доменам; затем соответствующие UML/BPMN/инженерные/химические/animation состояния. Data screens проверяются на последнем этапе, не блокируют ST-SCI. Viewports1180×680/1366×768/1920×1080 и stress1024×640, physical100/125/200%=96/120/192DPI, keyboard/focus/IME/assistive. Пилот на пяти людях сохраняется, не заменяется агентами. G3 performance budget и source integrity остаются.

## 8. Безопасность, качество, платформы

Local/offline с внешними независимо установленными engines; никаких скрытых install/download/fallback/обязательного аккаунта/телеметрии. Исполняемые источники запускаются только по явной trust policy. Timeout/no-shell-escape/Administrator не являются sandbox. Remote gateway требует opt-in, endpoint и видимость отправляемого содержимого. No UAC/accounts/system-font/RDP/MiKTeX/FlowBridge changes.

Результат связан с точной revision/dependencies/options/engine version; stale/last-good не выдаётся за current, ошибки указывают правильный файл. Формулы/Unicode/physical sizes/geometry/font embedding/права на ресурсы проверяются для реально поддержанного формата. Пользовательские font binaries не распространяются. Локальные preferences имеют безопасные defaults и rollback без переписывания native source.

Windows 10 Pro — основной пользовательский стенд, Server 2025 — отдельная integration/GUI проверка; macOS ARM M1/M4 и Linux сохраняются. W0–W4, native IME/DPI и независимые оригиналы остаются условиями заявленной поставки; hosted Server не заменяет Win10. Исторические PASS сохраняют свои SHA, версия/тег этим документом не меняются.

История: [первоначальный Studio scope](https://github.com/i-shutov/tikzarium/blob/a2a6c79ee14c58282da8a4a1106392faf9643029/docs/PRODUCT_SPEC.md), [прежний TikZ scope](https://github.com/i-shutov/tikzarium/blob/19187fc17968659267540fe279702bf77eeb77e6/docs/PRODUCT_SPEC.md). Функциональные обязательства сохранены, приоритеты заменены последней командой.
