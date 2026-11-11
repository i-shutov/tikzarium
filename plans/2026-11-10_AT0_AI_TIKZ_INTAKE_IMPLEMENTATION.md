# AT0 — AI_TIKZ_SKILLS: проверяемый intake и source-ledger (10.11.2026)

**Состояние:** post-1.0 implementation candidate; никакой физический GUI/научный gate не принят. Базовая ветка до разработки: main `5caa2acfbac82ed2d130cbc7dde1719d505c65e3`. Действует заморозка Windows 1.0, выпускаемый продукт не изменять.

## Реальная исходная точка

- [Владелец: AI_TIKZ_SKILLS_2026-11-10](https://drive.google.com/drive/folders/1SVuTweUP2dl5718n0VPtcQ4ryB2ymUW0), оригинальный `examples/catalogue.json`, SHA256 `4a94885064027806d4c9df7220216a160a923a4346671973365e59aa3cee94a5`.
- Физически считанный каталог: 88 JSON записей с полями `id, group, title, description, packages, libraries, stem, engine, check`. Независимое полевое сравнение с `roadmap/AI_TIKZ_SKILLS_2026-11-10_88_CASES.csv` — **0 расхождений в ID/классе/имени/пакете/библиотеке/движке**. Сверка 88 `.tex` имён в Drive и 88 ledger путей — **88/88**.
- 16 классов, 37 package tokens = 35 specialized extensions + `tikz` + `booktabs`; 23 library names; XeLaTeX **85**, LuaLaTeX **3** (`65`, `68`, `86`). Никакой GUI adapter пока не утверждён.
- Внешний README/REVIEW заявляет 88 собранных примеров и визуальный PDF-атлас 92 страницы, но это **доказательство только входного набора**, а не нативного исполнения через TikZarium.
- Полные исходные `.tex`, временные зависимости CTAN и лицензии **не коммитятся в публичный репозиторий**. Путь к Google Drive не подменяет byte-level локальную проверку.

## Что реально добавлено

1. `scripts/ai_tikz_intake.py`: проверка неизменного SHA256 каталога **до** любого разбора; строгий JSON с защитой от дублирующихся ключей, схема и порядок 88 ID, защита stem/path traversal и повторов пакетов/библиотек; строгий UTF-8 CSV, 1:1 полевое сравнение с оригиналом; fail-closed на любом расхождении.
2. Валидатор базового объёма 88/16/35+2/23 и жёстко закреплённой тройки Lua; статус потока данных `AT0_CATALOGUE_LEDGER_PASS_SOURCE_BYTES_NOT_CHECKED` либо `...SOURCE_BYTES_PASS` при явном подключении локального дерева оригиналов.
3. `--source-root` (по явному указанию) сверяет ровно 88 `.tex`, безопасное расположение без symlink, UTF-8 и SHA256 каждого файла, фиксирует окончания строк. Без этой опции **не** заявляет о содержимом `.tex`, только о каталоге и ledger.
4. `--check-skills` (только с `--source-root`) проверяет 13 реальных `SKILL.md`, frontmatter, SHA и наличие перечня; пустая директория `tikz-tool-interoperability` не засчитывается как 14-й skill.
5. Формирует детерминированный JSON со SHA оригинального каталога/ведомости, engine и package/class summary, статусами незакрытых gates. Никаких запросов в сеть, запуска TeX, Lua, внешних скриптов, DLL, обновлений или глобальных изменений.
6. `scripts/tests/test_ai_tikz_intake.py`: adversarial сценарии неверного SHA, JSON/CSV, duplicate, engine, path traversal, package mutation, symlink, UTF-8, missing/extra sources, missing skill; отдельная проверка текущего реального репозиторного CSV **без подтасовки в него PRIVATE source**.
7. В CI `qa-matrix.yml` тесты исполняются на **hosted Windows/macOS/Linux**. Это unit/ledger QA, не реальный desktop и не установка внешнего TeX.

## Команды для полного локального intake владельческого дерева

Из корня репозитория; отдельно распаковать или экспортировать оригиналы в доступный **только оператору** каталог, без выполнения импортированного кода:

~~~bash
python -m unittest discover -s scripts/tests -p 'test_ai_tikz_intake.py' -v
python scripts/ai_tikz_intake.py \
  --catalogue /PRIVATE/AI_TIKZ_SKILLS_2026-11-10/examples/catalogue.json \
  --source-root /PRIVATE/AI_TIKZ_SKILLS_2026-11-10 \
  --check-skills \
  --report /PRIVATE/qa/at0-intake.json
~~~

Если имеется **только каталог** (без 88 файлов): опустить `--source-root --check-skills`; отчёт честно даст `SOURCE_BYTES_NOT_CHECKED`. Не называть этот статус full AT0.

## Дополнительная оригинальная проверка исходников

По итогам прямого read-only скачивания из Google Drive все 88 `.tex` совпали с каталогом и прочитаны как UTF-8; 88 SHA256 сохранены в закрытой ведомости без публикации приватных файлов. Доступность 13 `SKILL.md`, заголовки frontmatter и все 13 исходных SHA256 подтверждены. **Это независимый audit оригиналов, а не запуск нового Python-скрипта на полном дереве или факт сборки через редактор.** [Details](../insights/2026-11-10_AT0_88_OWNER_SOURCES_AUDIT.md).

## Реальный proof на exact-head hosted auditor

Скачан оригинальный hosted AT0 offline auditor artifact [#13781736178](https://github.com/i-shutov/tikzarium/actions/runs/42852690894) и выполнен **не на синтетическом корпусе**, а на приватном дереве 88 исходных `.tex` + 13 `SKILL.md` (которое не публикуется). Unit suite: **12/12 PASS**. Полный intake: **`AT0_CATALOGUE_LEDGER_SOURCE_BYTES_PASS`**, исходные 88/88 и skills 13/13 по SHA256 совпали с закреплённым каталогом и ведомостями; исходный каталог SHA256 `4a94885064027806d4c9df7220216a160a923a4346671973365e59aa3cee94a5`. JSON checkpoint SHA256 `2612f6892801ec04a3b904f28d552d6bab823b2c82a3c81a47869ae3e313ac1c`.

[Независимый лог по оригинальным байтам](../insights/2026-11-10_AT0_88_OWNER_SOURCES_AUDIT.md). **Не путать:** полная проверка доступных исходных файлов ≠ закрытие исходных `.fls`, CTAN/language version/лицензий и тем более реальной native GUI/внешнего XeLaTeX.

## Условия приёмки следующего блока

- [x] Верифицированы оригинальный каталог и схема ledger: 88/88, 16/35/23/85+3; исходный SHA закреплён.
- [x] Fail-closed source intake реализован и добавлены adversarial unit tests (реальный CI статус проверять по PR HEAD).
- [x] Все 88 оригинальных `.tex` получены отдельно из Drive и побайтно проверены независимым локальным аудитом; 88 SHA сохранены в закрытом манифесте, 78 CRLF + 10 LF, 38 581 байт. [Протокол](../insights/2026-11-10_AT0_88_OWNER_SOURCES_AUDIT.md).
- [ ] Введены engine-produced `.fls` и полный граф package/asset dependencies, CWD, system/private TEXINPUTS, версия/лицензия каждого; текущий scanner **не** является TeX-expansion parser.
- [ ] Проверено наличие и соответствие оригинальному набору `dependencies/ctan-lock.json`, `VISUAL_GUIDE/atlas.tex`, `VISUAL_GUIDE/build-report.json`, отсутствовавших в первичном листинге Drive; отсутствие оставить `NOT_AVAILABLE`, не придумывать артефакт.
- [x] 13/13 исходных `SKILL.md` прочитаны и побайтно сверены с [проверенными SHA256](../roadmap/AI_TIKZ_SKILLS_2026-11-10_13_SKILLS_SHA256.csv); **осталось** проверить `.agents`, относительные ссылки и лицензии пакетов/шрифтов. [Протокол](../insights/2026-11-10_AT0_88_OWNER_SOURCES_AUDIT.md).
- [ ] AT1 (Engine & Source runtime): 88/88 фактическая компиляция во внешнем движке через продукт — **NOT_RUN**.
- [ ] AT3–AT9: Native GUI/Undo/TeX→PDF, предметная и независимая физическая приёмка — **NOT_RUN**.

**Стабильность и безопасность:** входные данные непрозрачны и считаются недоверенными; Unicode/CRLF/макросы нельзя нормализовать, Lua запускать лишь явным opt-in в будущем. Existing Administrator trusted-only — без изменений UAC/RDP/MiKTeX. Ни одной проверки 1.0 W2b/W4 это изменение не закрывает.
