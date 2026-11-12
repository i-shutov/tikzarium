# TikZarium Studio UI atlas

Векторный PDF атлас 14 экранов на русском языке. Макеты показывают концепт интерфейса, не реальные screenshots и не платформенную приёмку.

## Готовые материалы

- [Атлас, PDF, 14 страниц](published/TikZarium_Studio_UI_Atlas_RU.pdf).
- [Превью главной рабочей области, PNG](published/TikZarium_Studio_UI_Preview.png).

Проверенная редакция от 12.11.2026: PDF 151252 байта, SHA-256 `5e22464b51e87c1b3b30925a14711bf62e7204b023e1e0235c5427a98497bf83`.
Все 14 страниц отрендерены и просмотрены; кириллица использует встроенные DejaVu.
Готовые материалы сохранены в проекте вместе с воспроизводимым генератором.

## Сборка

Из корня репозитория:

```bash
python3 design/studio-atlas/generate_atlas.py
```

PDF и исходные fixture PNG пишутся в соседний `atlas-output/`, вне репозитория. Для другого пути: `python3 design/studio-atlas/generate_atlas.py --output-dir /path/to/atlas-output`.

Зависимости: `reportlab`, Poppler `pdftoppm`, DejaVu Sans/Mono/Serif в `/usr/share/fonts/truetype/dejavu/`. Генератор строго читает реальные fixture PDFs из репозитория и завершится ошибкой при отсутствии файла/Poppler, без синтетического fallback.

## Пластины

1. Обложка Scientific Studio.
2. Главная рабочая область, source и точный PDF.
3. Шесть прямых TikZ-инструментов.
4. Inspector окружности, Apply, Undo.
5. 15 literal PGFPlots properties; `samples/domain/mark` для ряда; выражения остаются opaque.
6. Opaque formula и source-first editing.
7. Контекстная справка F1.
8. Сборка, ошибка, stale PDF.
9. Light, Dark, Midnight, Paper.
10. Компактная раскладка и keyboard focus.
11. Экспорт свежего PDF.
12. Концепт будущих scientific engines.
13. Resource workflow: lexical `.dat` references vs `.fls` inputs and SHA ledger.
14. Handoff map: scientific → UML → BPMN → engineering → chemistry/biology → animation → other → data last.

Экранные пластины несут бейджи `МАКЕТ • на реализованных возможностях` либо `КОНЦЕПТ • ещё не реализовано`; страница ресурсов отмечает дизайн реализуемого workflow. Она различает TeX macro paths и наблюдённые `.fls` inputs; hash значения не выдумываются.

## Provenance и исходники

- `roadmap/Tikzarium_Scientific_142_R4/evidence/compiled/SV-001.pdf` — real PGFPlots figure fixture.
- `roadmap/Tikzarium_Scientific_142_R4/evidence/compiled/AK-F14_3.pdf` — real resource figure fixture.
- `roadmap/Tikzarium_Scientific_142_R4/fixtures/AK/F14_3/figure.tex` и `fixtures/AK/data/F14_3_{left,middle,right}.dat` — source и три реальных ресурса.
- Палитры взяты из `crates/tikzarium-app/src/ui_theme.rs`; labels/layout сверялись с `main.rs`, `studio_ui.rs`, `tikz_authoring.rs`, `build_resources.rs`, `tikzarium-core/src/dependencies.rs`.

Все страницы — дизайн-макеты. Embedded PDF fixtures являются фигурными примерами, а не снимками приложения. Атлас не подтверждает визуальную идентичность, доступность, Windows/DPI/IME или иную платформенную приёмку.
