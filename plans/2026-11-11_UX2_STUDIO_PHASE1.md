# UX2 Studio — первый инженерный срез

Дата: 11 ноября 2026. Base main: 19187fc17968659267540fe279702bf77eeb77e6, tree: 7126aa2657cf823a6c7e660415dd52ac7b0b5c33. Это **только UX2-A-first slice**, не полный UX2 GO.

## Согласованное визуальное направление

Профессиональная научная студия: центральный холст/точный PDF, всегда видимый исходник TeX рядом, компактный Inspector справа, нативные инструменты слева, сверху документ и первичная сборка, диагностика снизу по запросу. Light/Dark/Midnight/Paper получают единые отступы, типографику, контроль контраста и доступность. Визуальные изменения никогда не изменяют цвета или шрифты исходного TeX/фигуры.

## Реализовано в коде этого среза (проверка CI ещё нужна)

1. Шесть C-owned инструментов Line/Arrow/Rectangle/Circle/Node/Cubic доступны напрямую в rail, без плавающего меню для базовых действий. Русские короткие подписи, tooltip с настоящим синтаксисом/manual, egui Button и AccessKit WidgetInfo. Выбор не мутирует TeX.
2. После выбора активного инструмента открывается Properties dock; плавающая палитра сбрасывается. Расширения живут на отдельной кнопке, не имитируют реализованные инструменты.
3. Основное действие «Собрать PDF» — подписанная нативная кнопка с visible disabled reason, использует существующий ограниченный внешний XeLaTeX. Нет скрытых установок/изменений TeX engine.
4. «Эскиз» и «PDF исходника» снабжены пояснениями об отличии временных направляющих от авторитетного PDF.
5. Добавлен raw egui pointer event test: 6/6 direct clicks на production widgets, отсутствие source mutation/Undo для Unicode/CRLF и неизвестного макроса.

## Следующие завершённые пакеты (не входят в первый PR)

- UX2 inspector: компактные координаты, единицы, один Apply, без дублирующейся справки.
- UX2 визуальная система (#169): spacing/typography, polished focus/hover, contrast, four themes.
- Независимая визуальная приёмка (#171): original screenshots, Windows 96/120/192 DPI, keyboard/IME/screen reader, пользовательские задачи.
- UX3 Build/PDF states, последняя успешная PDF, диагностика и экспорт; UX1 G3 p95/100k memory отдельно остаются открыты.

## Контроль

Блоки: [#169](https://github.com/i-shutov/tikzarium/issues/169) — дизайн-система, ui_theme.rs; [#170](https://github.com/i-shutov/tikzarium/issues/170) — rail/Inspector, studio_ui.rs/main.rs; [#171](https://github.com/i-shutov/tikzarium/issues/171) — независимая QA.

Постановки задач созданы, но GitHub отклонил реальное назначение Copilot coding agent с ошибкой 422. Не считать их запущенными subagent sessions. Точный выбор младшей модели через текущее подключение недоступен.

| Проверка | Состояние до CI |
| --- | --- |
| Формальная реализация rail/toolbar | Сохранена в Git-объектах; требуется компиляция |
| Raw-input regression | Написан, NOT_RUN |
| Контракт source/Undo | Не изменён; требуется regression |
| F1/Saving/PDF workflows | Требуют повторной QA |
| Win10 / Server W2b / IME / 96/120/192 | NOT_RUN |
| UX2 полного состава / stable Windows 1.0 | NOT_ACCEPTED / NO-GO |

Приоритетны AGENTS.md, docs/PRODUCT_SPEC.md, roadmap/WINDOWS_1_0_UIX_OWNER_OVERRIDE_20261110_RU.md. Никакой смены UAC, прав, MiKTeX, RDP, FlowBridge или shell-escape. Исходник .tex остаётся единственной истиной.
