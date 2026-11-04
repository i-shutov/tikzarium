# N3 — контекстная F1 для 27 литеральных параметров TikZ + D06 честный CI

Базовая ветка на начало работы: `4d3c580eedc3f8f1d1522bd9cafdd568109f85fa`. Windows-first решение владельца от 2026-11-04: первый релиз Windows 10 x64, внешний MiKTeX/XeLaTeX, рисунок/редактируемый .tex/инспектор/русская F1 одновременно. Физический Windows Server 2025 — отдельный интерактивный кандидат для ближайшего GUI smoke, но не Windows 10 PASS. N4, физический Mac/Linux, notarization не входят в первый блок выпуска.

## Одна сквозная вертикаль

- C-реестр `extensions/primitives/catalog-v1.toml` остаётся единственным источником имён, параметров, синтаксиса, ограничений, примеров, источника и русских пояснений. В шести штатных шаблонах 27 наблюдаемых мест подстановки; `tikz.node:mode` — только настройка инспектора, а не печатаемый параметр.
- `source_assist::parameter_caret` определяет точный исходный токен на строке в изначальном шаблоне C, с преобразованием Unicode character caret → UTF-8 byte span, без парсера общего TeX. Макросы, экранированные/вложенные/комментированные данные, неполная строка, verbatim, catcode и неузнанный синтаксис => нет контекстной справки, UNKNOWN. Существующий N3 `usetikzlibrary` completion не меняем.
- Studio Help dock показывает параметры прямо под курсором TextEdit через `help_search::exact` и существующий C `ParameterSpec`, включая значение editor preset отдельно от недоказанного default TikZ. F1 и показ помощи — read-only, не создают `SourcePatch`, не меняют Undo или CRLF.
- D06: тест с mock `xelatex` изолируется от реального `TIKZARIUM_XELATEX` в hosted MiKTeX. Каждый Python в многострочной PowerShell проверяет `$LASTEXITCODE`, чтобы green CI больше не скрывал 1/16 FAIL.

## Предикаты приёмки

1. Rust unit 27/27 реально существующих C-подстановок, отрицательные ветви для opaque/comments/CRLF/Unicode/catcode/partial source, без изменения исходника.
2. Настоящий `egui::Context::run` F1 UNIT_EVENT на `tikz.circle:radius`; источник до/после побайтово одинаковый.
3. Exact HEAD `cargo fmt --check`, clippy, locked Rust, D matrix; настоящая hosted Linux/X11 (I61) шесть жестов, Save/Open/Undo, PDF/Unicode/all embedded fonts + новый реальный ввод caret circle-radius и F1; **оригинальные PNG/.tex/PDF/log/SHA** перепроверить после загрузки.
4. Hosted D06 Windows MiKTeX real engine/offline PDF и PostUpload audit должен завершиться на точном HEAD без скрытых Python FAIL. Installer download FAIL трактовать как setup-blocker, не кодовый регресс; без повторного бездумного старта.
5. Только затем merge с expected head lease; отдельно postmerge QA. Пользовательский Windows Server runner на `main` пока блокирован отсутствием Git в PATH, а интерактивный egui smoke ещё не реализован. Запуск на самом сервере должен быть только из trusted main, в logged-in RDP session, ни из PR, ни из Session0.

Снятие физических Windows 10 ограничений здесь НЕ происходит. Windows installer начинается после Windows Server GUI smoke и отдельной квалификации выпуска, без включения MiKTeX или пользовательских шрифтов.