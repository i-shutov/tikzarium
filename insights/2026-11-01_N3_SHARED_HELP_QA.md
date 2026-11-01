# N3 · Исследовательский журнал: общая русская справка без расхождения источников

Дата: 2026-11-01. Точный исходный main bef820ecc6565280d3381486239117092d16334d.
Новая интеграция не затрагивает параллельный draft #75 (защита Open/Reopen).

## Проверенные свойства исходного проекта
- Источник данных: extensions/primitives/catalog-v1.toml.
- Cargo-схема Catalog::bundled() в crates/tikzarium-extensions/src/primitives.rs
  валидирует шесть инструментов, проверяет 4 библиотеки, параметры,
  ссылки PGF/TikZ, документированную версию и редакторские presets.
- egui использует этот же Catalog через tikz_authoring.rs.
- У CLI до изменения были только doctor/build; отсутствие движка
  не должно препятствовать чтению локальной справки.

## Выбранное решение
Не дублировать TOML и help на стороне CLI. Публичный C API возвращает
ссылки на ToolSpec/ParameterSpec/LibrarySpec и стабильные ID.
CLI печатает их проверенные поля и явно НЕ выводит inferred installation
или tool availability. Поиск Unicode — простой регистронезависимый
substring; нет универсального разбора TeX-команд.

## Риски и отрицательные сценарии
- Русский Unicode search не равнозначен морфологическому поиску:
  проверять фрагменты, не обещать словоформы.
- Длинный запрос ограничен; неизвестное имя — ошибка, не подмена
  ближайшим возможным пакетом.
- preset Stealth — свойство редактора, не TikZ default.
- Search result не доказывает совместимость Lua-only расширения и не
  подтверждает установленный пакет. Для этих целей нужны doctor
  и реальные XeLaTeX fixtures.
- B32/Open modal не изменяется, никакой пользовательский TeX не открывается.

## QA ledger
Production source added, tests written; no local Rust toolchain in the
integration runtime, поэтому LOCALLY_NOT_RUN. Require exact-head CI and
read back its logs/artifacts. Hosted GUI and physical Win10/M1/M4 NOT_RUN.

## Integrator follow-up (original semantic deficiency)

На `4d809b10` успешные hosted проверки НЕ доказывали полноту помощи: CLI печатал только title, а поиск не видел `help_ru` у tools/libraries. Ветка исправлена через единый `HelpEntry::description_ru()`, никаких дублированных схем. Проверяется исходная фраза о прямом отрезке и положение узлов «смещение и якоря» в полных выводах и русских запросах. Новый SHA CI/CLI после внесения изменений NOT_RUN; физический Win10/M1/M4 NOT_RUN. Важно не объявлять новый PASS без фактических артефактов.
