# TikZarium — release resume, 2026-11-13

## 2026-11-13 — единый SourcePatch/Undo для текста и Inspector

[Новый checkpoint](../insights/2026-11-13_SHARED_SOURCE_HISTORY_RU.md), [исходные команды/результаты](../insights/assets/2026-11-13-shared-history/summary.json), [SHA256 evidence manifest](../insights/assets/2026-11-13-shared-history/manifest.json). Исходная база [draft PR #189](https://github.com/i-shutov/tikzarium/pull/189) — `0eee418ca4d4869b2a4b9fb6ea1462d53df84e1d`; новый commit/app-tree и CI интегратор фиксирует после публикации/readback.

Исправлен подтверждённый разрыв истории: ручной текст → Inspector Apply → Undo → Undo теперь проходит через один bounded ledger точных inverse SourcePatch. Standalone Session API сохранён; старые inverse stacks не дублируются, idle source clones не добавлены. Open отделяет document identity и старый deferred/raw input; общий Undo отменяет удержанный жест без ghost insertion. **566 workspace tests PASS / 0 failed / 4 ignored / 27 suites; fmt, strict Clippy, app/CLI build PASS.** Четыре новые production-shell регрессии — `UNIT_EVENT`; offline collector — 16/16 PASS. Есть отдельный независимый static review.

Аудит исходной базы: 15 runs, из них 13 success и 2 старых APP_TREE lease stops; финальный D QA matrix success. I61/N5 не перепривязаны. Сейчас наблюдались реальное production-окно и мышь, но ненадёжный keyboard focus не позволил принять полный native scientific workflow. Отдельный hosted 1366×768 сценарий готовится; его originals/итог ещё ожидаются. Старые HWND/F1/CLI/PDF PASS не перенесены на новый код.

**Следующий шаг:** exact-commit native SV-001 derivative → Inspector draft/Apply `150 → 151` → два Undo → byte-exact Save/Open → GUI XeLaTeX → текущий PDF Export, затем независимый просмотр originals и provenance. Physical Win10/IME/DPI/G3 и full ST-SCI остаются открытыми. Stable v1.0 и merge/release GO **не выданы**.

Дополнение 13.11: настоящие native attempts cc25 (**13/3 из16 CI**) и QA1 6b3e (**12/3 из15**) подтвердили Open/typed, но не Inspector Apply/Undo/PDF; false draft candidate пойман source guard. Исправлены только устаревший Undo status и QA-coordinate/focused-field proof; повторные локальные **566 tests/fmt/clippy/build PASS**, helper20/20. [Актуальный follow-up и оригинальные аудиты](../insights/2026-11-13_SHARED_SOURCE_HISTORY_RU.md#follow-up-1311--два-настоящих-hosted-прогона-и-точная-граница-результата). Новый native PASS/commit здесь не заявлен.

## 2026-11-12 — Compact Studio: восстановлен точный app tree, публикация PR #189

[Отчёт восстановления](../insights/2026-11-12_COMPACT_STUDIO_RECOVERY_RU.md), [атлас реального интерфейса, 6 страниц](../design/studio-compact-atlas/published/TikZarium_Studio_Compact_UI_Atlas_RU.pdf), [свежие исходные журналы](../insights/assets/2026-11-12-compact-recovery/validation.json).

Последний процесс успел загрузить app tree `6c3208dc309a4c31ba36c4cf3ccda63b85083bd9` и PDF blob, но не обновил ветку. Восстановлены все 25 app blobs; base `eb9d415e` и 1440 записей опубликованного дерева сверены. Это точная поздняя версия, а не восстановление интерфейса по скриншоту или перенос непроверенного CP03. Верхнее меню, компактные иконки, gutter, отдельный fold преамбулы, revision-checked source Undo/Redo и порядок source → tools → canvas → Inspector включены в единый блок.

**Свежие 562 workspace tests PASS / 0 failed / 4 ignored; fmt, strict Clippy, app/CLI build PASS.** Два независимых static review не выявили блокирующих дефектов. Новый native GUI здесь не состоялся из-за недоступного keyboard focus desktop; прежние native кадры атласа не стали новой приёмкой. Финальный SHA/ref, CI и пакет восстановления фиксируются в описании [draft PR #189](https://github.com/i-shutov/tikzarium/pull/189) и delivery receipt в [рабочей папке](https://drive.google.com/drive/folders/1KOiMLat9r0QN-J0R1mTjZuIx2QvEDw4H).

Следующая исполнимая задача: exact-tree native 1366×768 PGFPlots Inspector → patch → Undo → Save/Open → XeLaTeX → PDF с оригиналами; затем проверка старых APP_TREE-gated сценариев на новой геометрии. Локальный кандидат `fe85cc60` из атласа не является новым remote SHA. Stable v1.0 **NO-GO**.

## 2026-11-12 — SCI-BUILD и настоящий F14_3 GUI → PDF

[Текущий checkpoint](../insights/2026-11-12_SCI_BUILD_CHECKPOINT_RU.md), [draft PR #189](https://github.com/i-shutov/tikzarium/pull/189), [папка чекпойнтов на Google Диске](https://drive.google.com/drive/folders/1KOiMLat9r0QN-J0R1mTjZuIx2QvEDw4H).

Проверенный опубликованный code commit `79168f6838d29748bc4cd51a372b7c267fd97386`, tree `aaa57d868e836d6dab8588c32b5bc2b4da289a8a`; ветка `feat/studio-scientific-integration-20261112`. **531 workspace tests PASS**, fmt/strict Clippy/build PASS. Реализованы bounded pre/post input baseline, явный project root для `../data`, CLI refusal до изменения PDF и ручной ввод папки при недоступном системном picker. Регрессия с `.dat`, изменённым во время TeX, отклоняет неподтверждённый кандидат. Изменение с восстановлением байтов между наблюдениями всё ещё вне гарантии; внешняя TeX-установка не сертифицирована.

Desktop восстановлен. На точном Linux binary `708e3a8c…` в окне 1180×680 выполнены F14_3 Open → общий root → XeLaTeX → Preview → Export; recorder показал source + три `.dat`. После same-length изменения тестового `.dat` повторный экспорт заблокирован, last-good PDF сохранён и помечен stale. Данные восстановлены, исходный corpus не изменён. F1 открыл справку. Это конкретный native Linux subset; полный Inspector/Undo workflow, physical Win10/IME/DPI/G3 и full scientific acceptance **не приняты**.

CP00/CP01 сохранены на Google Диске, итоговый CP02 фиксируется отдельным delivery receipt. Атлас 14 страниц сохранён. На code `79168f6` два hosted задания остановились на прежнем APP_TREE до своих проверок; общий CI не зелёный. Gates не ослаблялись. **Следующий шаг:** native PGFPlots Inspector → patch → Undo → Save → PDF с оригиналами, затем корректная актуализация соответствующих APP_TREE/GUI scripts. Stable v1.0 **NO-GO**.

## Предыдущий checkpoint 2026-11-12 — интеграция и атлас, PR #189

[Предыдущий checkpoint](../insights/2026-11-12_SCIENTIFIC_STUDIO_IMPLEMENTATION_RU.md), [draft PR #189](https://github.com/i-shutov/tikzarium/pull/189), [атлас PDF, 14 страниц](../design/studio-atlas/published/TikZarium_Studio_UI_Atlas_RU.pdf).

Проверенный code commit `1784a48246cbdfd260fb80ce4731c7f165ad52c5`, tree `3bb17ee38e0f77d6d06a125d4076c70f1f707bf1`; ветка `feat/studio-scientific-integration-20261112`. **512 workspace tests PASS**, strict Clippy/fmt/build PASS, 20-operation API и 53-request/26-action matrix PASS, два explicit SC3 exports и реальные CLI/XeLaTeX PDFs PASS. Hosted Win32 startup/F1/slow-probe subset на последующем QA-only commit `8fa502c277920599f0ca8e43b49ef74b7bb31591` — **PASS**; полный native scientific workflow и physical Win10 — **NOT_ACCEPTED**, stable v1.0 **NO-GO**.

Интегрированы шесть прямых инструментов, компактный PGFPlots Inspector и shared Undo/F1, read-only resource references, project-local dependency ledger и повторная проверка перед экспортом. Source ownership и opaque TeX случаи усилены по независимому ревью. Подробные hashes/logs и реальные задачи gpt-6-luna сохранены в checkpoint.

**Следующий исполнимый шаг:** SCI-BUILD regression для изменения `.dat` во время работы TeX и контракт project root для parent-data inputs; затем native compact GUI с новыми оригинальными PNG и корректным обновлением APP_TREE gate. Post-build snapshot не устраняет build-time race; внешние ресурсы не сертифицированы. Desktop runtime в этой сессии после перезапуска не запускается. Старые платформенные PASS не переносятся; Asymptote/Typst и дальнейшие домены не опережают научную приёмку.

Исторические записи ниже сохраняют свои source SHA и даты.

Дополнение к текущему checkpoint: [hosted follow-up](../insights/assets/2026-11-12-scientific-studio/HOSTED_FOLLOWUP.md). На `8fa502c` завершены 26 успешных checks, 2 failed APP_TREE gate, 1 skipped. Исправленная проверка полного capture interval прошла: оригинальный кадр после F1 целиком получен во время synthetic lookup probe. JSON, probe log и PNG сохранены с hashes. Это Windows Server 2022/96 DPI startup/F1/responsiveness; локальный интерактивный канал, полный GUI workflow и physical Windows10 остаются открытыми. Rust crate/lock objects не изменены; общий CI пока не зелёный.

## SCIENTIFIC STUDIO v1.0.0 — OWNER APPROVED SCOPE, 11.11.2026

[Normative scientific release scope](RELEASE_SCOPE_SCIENTIFIC_STUDIO_1_0_RU.md). Full ST-SCI is the target for stable 1.0 (not historical narrow TikZ/96DPI RC): scientifically accepted TikZ/PGFPlots, SCI142 142/103, science AI88, scoped native Asymptote/Typst/CeTZ GUI edits and builds, premium multi-document UX/G3, exact-source W2b/W3/IME/96/120/192/W4. Stable still NO-GO. Prior dated resume sections record older source SHA and cannot transfer previous PASS to new enlarged candidate. [Current execution](../plans/2026-11-11_SCI_1_0_EXECUTION.md), [Win10 Codex request](../plans/2026-11-11_WIN10_CODEX_SCI_1_0_QA_RU.md). PR #172 remains unmerged draft with failed checks at last inspected SHA. User can run local Codex to collect native facts; no automatic system adjustment.


## 2026-11-11 — единый roadmap и реализация UX1

**Результат первого блока:** 431 workspace test PASS, независимое ревью и нативные Linux subsets; G3 и Windows-приёмка открыты. [Отчёт с исходными evidence](../insights/2026-11-11_UX1_IMPLEMENTATION_RU.md).

Текущий маршрут задан [docs/ROADMAP.md](ROADMAP.md), контракт первого блока — [UX1 execution](../plans/2026-11-11_UX1_EXECUTION.md). База `main=0a5dd9a81bd240ffe924630fadd8dfc53f9a36f9`, код редактора развивается в [PR #167](https://github.com/i-shutov/tikzarium/pull/167). Все UX-F01–F14 входят в Windows 1.0. Масштабы: 100%/125%/200% = 96/120/192 DPI. Полные W2b/W3/IME/W4 остаются открытыми. Старые профильные результаты Admin/QA ниже сохраняют собственную дату, source SHA и границы приёмки.

Первый блок: подсветка и кэш → номера физических строк → поиск/замена и Go to line → native Undo/source integrity → независимая проверка. Реальная Windows10-приёмка нового UI ещё не выполнена. Точные результаты текущей реализации публикуются в её PR/checkpoint, без переноса исторического W3 PASS на новый бинарник.

## История: 2026-11-10 — Admin: CLI PDF / кириллица / Arial **PASS**, следующий этап — GUI W3

**Фактический результат владельца на Windows 10 Pro в профиле `Admin`:** после сборки `tikzarium-app` (`Finished dev profile` за 1m59s) `tikzarium-cli.exe` успешно сгенерировал `windows-cyrillic.pdf` (**16 449 байт**, 93 зависимости, 10.8436788 с). Независимый от установки **повторный аудит уже созданного PDF** завершился `PDF_CYRILLIC_POSTFLIGHT_PASS via standard` без Cargo, MiKTeX и пересборки.

Проверки `pdftotext` во всех трёх режимах дали **UTF8=True; Точка=True; Кириллица=True**: `standard=PASS`, `raw=PASS`, `layout=PASS`. Итоговый PASS аудитора дополнительно требует встроенного Arial/ToUnicode. PDF SHA256: `5F6E894F58F546AED7A5CC7E53A615471EFC09B763663C1294BFEF2A463F9807`.

Оригинальный PDF: `C:\Users\Admin\Documents\TikZarium-QA\evidence\20261110-041404\windows-cyrillic.pdf`. Диагностический отчёт: `C:\Users\Admin\Documents\TikZarium-QA\evidence\20261110-041404\pdf-recheck-20261110-045600-4b1d438c\pdf-recheck.json`. Это **подтверждение по терминальному логу владельца**; байты PDF/JSON не загружены в GitHub и независимо здесь не перепроверены.

**Вердикт:** `Admin User environment + native Rust build = PASS`, `Admin CLI→XeLaTeX→PDF + postflight Cyrillic/Arial = PASS`. Первый вызов `Setup.ps1 -Phase CurrentUser` всё же завершился с ошибкой из-за ложного отказа старого кириллического сравнения в PS5.1. Подтверждённый дефект исходного кода — **UTF-8 без BOM при наличии кириллических литералов** — исправлен в PR #150, дополнен BOM/Unicode регрессионным тестом. Это не означает повторного запуска всего `CurrentUser`; **пользовательские приложения и PDF уже готовы**.

**Следующий gate:** `Admin GUI START = NOT_RUN`, `Admin W3 F1/6 gestures/Save/Open/IME/DPI/GUI→PDF = NOT_ACCEPTED`, `W4 stable = NO-GO`. Продолжать в **том же разблокированном сеансе `Admin`**, где локальный ChatGPT Computer Use уже умеет перечислять окна. Запустить изолированный [Mesa W3 launcher](../scripts/workstation/windows10/Invoke-TikZarium-W3-Mesa.ps1) в medium-token Admin, затем поручить локальному агенту реальное взаимодействие. Старые PASS GUI в профиле `tikzarium-qa` остаются самостоятельными, не переносятся на Admin автоматически.


## 2026-11-10 — WS11: Admin Cargo/XeLaTeX PASS, аудитор кириллицы не принял PDF

Оригинальный вывод владельца из `C:\Users\Admin` на той же Win10 Pro 22H2: `tikzarium-app` нативно собран за 1m59s, CLI создал `windows-cyrillic.pdf` размером **16 449 байт**, 93 зависимости, время **10.8436788 с**; MiKTeX warning «So far, you have not checked for MiKTeX updates» не был фатальным. Только после успешной сборки `-Phase CurrentUser` остановилась в сравнении результата `pdftotext` со строками `Точка` и `Кириллица`. Оригинальные файл и `pdf-extracted.txt` остались в `Documents\TikZarium-QA\evidence\20261110-041404`.

**Обнаруженная причинная уязвимость**: GitHub `TikZarium-Win10-Setup.ps1` содержал кириллические литералы проверки в **UTF‑8 без BOM**. Windows PowerShell 5.1 на Windows с ANSI codepage может неверно декодировать сам `.ps1` при `-File`, в отличие от UTF‑8 PDF-данных. Под `tikzarium-qa` локальные патчи сохранялись через PowerShell `Set-Content -Encoding UTF8` (с BOM), что согласуется с предыдущим PASS. Это подтверждённый дефект исходной кодировки; до повторного независимого анализа *оригинального PDF Admin* нельзя однозначно заявлять, что он был единственной причиной отказа.

**Исправление в [PR #150](https://github.com/i-shutov/tikzarium/pull/150):** `Setup.ps1` сохраняется с UTF‑8 BOM; GitHub-hosted PS5.1 CI теперь проверяет реальный BOM у всех скриптов с русскими литералами. Добавлен самостоятельный [Audit-TikZarium-WindowsPdf.ps1](../scripts/workstation/windows10/Audit-TikZarium-WindowsPdf.ps1): только читает готовый PDF, запускает уже установленный `pdffonts` и `pdftotext` в режимах standard/raw/layout с **строгим UTF‑8 и NFC**, фиксирует наличие обеих строк, Arial/ToUnicode, SHA256, первые кодовые точки и исходные текстовые файлы. Нет установки, Cargo, XeLaTeX, изменения исходников или PDF. Положительный результат нельзя объявлять из одного созданного PDF.

**Hosted audit PS5.1:** [#42792382319](https://github.com/i-shutov/tikzarium/actions/runs/42792382319) SUCCESS, в том числе UTF8 BOM и независимые Unicode-codepoint-тесты. В [единой инструкции](../scripts/workstation/windows10/README_RU.md) закреплена команда повторного аудита без компиляции.

**Следующее действие:** под `Admin` один раз выполнить независимый postflight-аудит имеющегося PDF. При PASS — принять `CurrentUser` как готовую CLI/PDF среду и продолжить W3 GUI через isolated Mesa/Computer Use; при FAIL — изучить сохранённые UTF‑8 text/JSON, не менять шрифты и требования проверки вслепую. Полный W3 GUI и W4 stable остаются NO-GO.


### 2026-11-10 — WS10: повреждённый preflight в предыдущем SHA

**Подтверждённая ошибка:** скрипт `TikZarium-Win10-PREFLIGHT.ps1` из прежнего SHA `824335f5c575cb5aed79ae669aac744b4efb2bc8` имел разорванное регулярное выражение проверки `CurrentBuildNumber` и ошибочно продублированный хвост `catch`/`exit`, поэтому PowerShell 5.1 выдавал `UnexpectedToken` ещё до запуска. Ничего в системе от этого запуска не изменилось. **Нельзя больше использовать этот SHA.**

**Исправление:** восстановить preflight из уже проверенной v5 (`d995488...`), добавить только read-only fallback для WMI через реестр и проверить весь файл. Исправление в коммите `e5eb979ed8c12ffd3cd40ab5a95634cf661327a8`, расширенная hosted PS5.1 проверка (положительная имитация Win10 с `Get-CimInstance Access denied` плюс отказ Windows Server) в `c37aeb9f8962bde482e470d4378bb13f75a5429b`. До завершения соответствующей CI запрещено объявлять скрипт верифицированным.

**На существующем профиле Admin ничего переустанавливать ради WS10 не нужно:** повторно скачать **только исправленный `PREFLIGHT.ps1`** по закреплённому SHA в `Documents\TikZarium-QA\setup`, выполнить независимый `Parser.ParseFile` и только затем `PREFLIGHT`/`-Phase CurrentUser`. Основной `Setup.ps1` и optional runner из прежней загрузки сохраняются. `Machine` не запускать, существующий QA-профиль не трогать.

**Граница User:** системные Git/MSVC/Windows SDK уже установлены предыдущим `Machine`. Но пользовательские Rust/MiKTeX/Poppler из `tikzarium-qa` не обязаны быть доступны `Admin`; `CurrentUser` выполнит их проверку и при необходимости подготовит в профиле Admin. GUI и PDF под Admin пока не имеют физического PASS.


## 2026-11-10 — existing Admin profile on Windows 10: CurrentUser bootstrap candidate

Владелец подтвердил, что ChatGPT установлен в профиле `VM-910136\admin` на Windows 10 Pro 22H2 x64 build `19045.4412`. Локальные команды `hostname` и `whoami` выполнились, но `Get-CimInstance Win32_OperatingSystem` в изолированном Codex процессе вернул `Access denied` (medium integrity, Administrator SID `deny-only`). Computer Use смог перечислить окна (пока только ChatGPT), а `tikzarium-app.exe` в текущем профиле не найден. Это **не** отказ системы и не основание менять WMI/UAC.

В [PR #150](https://github.com/i-shutov/tikzarium/pull/150) добавлен явный `-Phase CurrentUser`: те же проверенные Rustup/MiKTeX/Poppler/CLI+PDF шаги, но в текущем непривилегированном процессе под существующим Admin. Старый `-Phase User` для `tikzarium-qa` сохранён, `-Phase Machine` повторять нельзя. Для ОС/версии есть read-only fallback реестра, без WMI ACL. Mesa launcher также поддерживает medium token Admin и read-only registry check. Отдельный hosted PS5.1 статический тест проверяет маршрут и отсутствие требуемого `tikzarium-qa` для `CurrentUser`.

**Статус:** схема успешно испытана под `tikzarium-qa` на физическом Windows10 до GUI start; аналогичный путь под `Admin` — **CANDIDATE / NOT_RUN** до реального запуска. Старое подтверждение W3 GUI START под QA-профилем не переносить автоматически. Для работы Computer Use требуется открыть TikZarium именно в текущем интерактивном профиле Admin, затем воспроизвести Build, F1, мышь, Save/Open и GUI→PDF. Всё выполнять только с разрешением владельца и без прямого изменения `main`.


## 2026-11-09 — единый runbook и Dot W3 GUI handoff

В PR #150 вместо последовательности архивов v1–v5 подготовлена **одна каноническая инструкция** [Windows 10 bootstrap, CLI, Mesa, W3 и Dot](../scripts/workstation/windows10/README_RU.md). Описаны подтверждённые факты Machine/User/CLI PDF, изолированный llvmpipe, исходные доказательства и ограничения по правам. Отдельное [задание для Dot](DOT_WINDOWS10_W3_GUI_HANDOFF_RU.md) предназначено для локальной Work-задачи **после явного Allow access через ChatGPT desktop app** на самой QA-машине; подключение нельзя инициировать только записью в GitHub.

Новая пользовательская проблема: кнопка Build `▶` нажимается, но видимого эффекта нет. По code review есть несколько ранних возвратов, особенно `save()` для несохранённого scratch документа с нативным Save As. Это **гипотеза**, W3 GUI→PDF пока не доказан. Физический GUI стартовал, но весь W3 остаётся NOT_ACCEPTED, W4 NO-GO.


## 2026-11-09 — W3 физическая Windows 10: нативное GUI-окно появилось через изолированную Mesa

**Новое оригинальное визуальное свидетельство от владельца в RDP-сеансе `tikzarium-qa`:** после SHA-проверенной Mesa 26.2.6 и распаковки через 7zr виден работающий процесс `TikZarium` с настоящим окном. На скриншоте одновременно присутствуют верхнее меню/панель инструментов, вкладки `Эскиз`/`PDF`, редактируемый текст обычного `.tex` в левой колонке (quickstart), сетка холста в центре, правая панель `Свойства`/`Библиотеки`/`Справка`, русские подписи и состояние `Изменено`. Прежний `OpenGL(PainterError("egui_glow requires opengl 2.0+. "))` перестал блокировать создание окна при изолированном пользовательском запуске. **Никаких подтверждений F1, редакторской операции мышью, Save/Open, GUI→PDF или DPI200 из одного скриншота нет.**

**Вердикт:** `W3-GUI-START = PASS (визуальное подтверждение, screenshot from owner conversation)`; `W3-INTERACTION = NOT_RUN`, `W3-GUI→XeLaTeX = NOT_RUN`, `W3-OVERALL = IN_PROGRESS / NOT_ACCEPTED`, `W4 = NO-GO`. Изолированная software GL — **QA runtime workaround**, не свойство распространяемого installer/portable ZIP. На снимке видна панель задач поверх нижней границы GUI, поэтому полный клиентский прямоугольник/панель статуса и покрытие разных DPI ещё не подтверждены.

**Доказательства:** первичная Win10 CLI-генерация PDF находится локально в `Documents\TikZarium-QA\evidence\20261109-090708`; исходное GUI screenshot предоставлено владельцем в чате, **не выгружено в публичный GitHub** (возможные детали RDP/рабочего стола). Для окончательного W3 требуется отдельный оригинальный набор: физическое F1 before/after, 6 жестов, .tex до/после, Undo/Save/Open, кириллица/IME, GUI→PDF, независимый SHA/fonts и снимки полного окна. Следующий тест — [W3 runbook](WINDOWS_10_W3_PHYSICAL_QA_20261109_RU.md).


## 2026-11-09 — WS09: штатный Windows 10 tar.exe не поддерживает LZMA из Mesa .7z

Фактический RDP лог: Mesa 26.2.6 скачана правильно, SHA256 проверен (`da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388`), но распаковка встроенным `tar.exe` завершилась `LZMA codec is unsupported` (exit 1). Архив не поврежден. Ошибка вызвана неверным предположением о возможностях штатного архиватора Win10.

Исправлено в кандидатном [PR #150](https://github.com/i-shutov/tikzarium/pull/150): W3 launcher использует портативный `7zr.exe` из официального выпуска `ip7z/7zip` 26.05 с закрепленным SHA256 `9bf582b894dfa665f852d7e9112b02290a1c303c2d95a21fcdc41ffcb03143b7`. Дополнительная CRC-проверка 7z предшествует распаковке. Уже проверенная загрузка Mesa (~56 МБ) переиспользуется, временные неполные результаты `tar.exe` очищаются только внутри `Documents/TikZarium-QA/W3-Mesa-26.2.6/unpacked` и не касаются исходного EXE, System32 или реестра. Изолированное программное OpenGL по-прежнему кандидат до физического GUI испытания.

В hosted Windows добавлена проверка реальной распаковки pinned Mesa через pinned 7zr с подтверждением `x64/opengl32.dll` и `libgallium_wgl.dll`. **Пока CI или локальный GUI не подтвердят результат, W3 BLOCKED/NOT_ACCEPTED, а не PASS**. Локальный обход: отдельно скачать 7zr.exe, проверить SHA256, `7zr t` и `7zr x` для уже скачанного Mesa и повторить `-Action PrepareAndRun`.


## 2026-11-09 — W3 GUI OpenGL 2.0 blocker under RDP (new WS08)

**Actual owner trace after fully successful User/CLI PDF:** launching `target\debug\tikzarium-app.exe` under non-admin `tikzarium-qa` exited `Error: OpenGL(PainterError("egui_glow requires opengl 2.0+. "))`. Root of practical limitation: `eframe 0.33.3` is built with the `glow` renderer and the active RDP OpenGL context cannot meet minimum 2.0; the physical W3 interface was **NOT RUN**.

**Canonical QA workaround (candidate, not yet physically verified):** [isolated software OpenGL launcher](../scripts/workstation/windows10/Invoke-TikZarium-W3-Mesa.ps1). It downloads SHA256-pinned Mesa3D 26.2.6 x64 MinGW artifact (GitHub upstream pal1000), verifies digest, uses SHA256-pinned standalone `7zr.exe` for `.7z`, and stages a **copy** of native `tikzarium-app.exe` plus x64 Mesa DLLs only under `Documents\TikZarium-QA\W3-Mesa-26.2.6\runtime`. The launcher scopes `GALLIUM_DRIVER=llvmpipe`, `LIBGL_ALWAYS_SOFTWARE=1` and `PATH` to the child, does not replace system or `target\debug` OpenGL DLLs, drivers, registry or UAC. Two initial valid outcomes: software GL GUI really opens (then proceed with six gestures/F1/Save/Open/GUI→PDF); or launcher shows actual new error (record and diagnose, **do not** infer GUI PASS).

Independent source: official [Mesa llvmpipe Windows DLL-local usage](https://docs.mesa3d.org/drivers/llvmpipe.html) and [Windows tar 7z support](https://learn.microsoft.com/en-us/windows/tar/). The upstream package has a fixed SHA256 already validated in TikZarium QA transport. **No runtime W3 evidence from this launcher yet**.
## 2026-11-09 — Win10 physical workstation: **Machine PASS / User PASS / CLI PDF PASS**, GUI W3 NOT_RUN

Новое **подтверждение по выводу пользователя из RDP**: `tikzarium-qa` на Windows 10 Pro 22H2 x64 build 19045, 3.96 GiB RAM. В ходе `-Phase User` успешно выполнена нативная сборка `tikzarium-core`, `tikzarium-extensions`, `tikzarium-app` (`cargo build --locked -j 1`, `Finished dev profile ... 2m14s`) и настоящий `tikzarium-cli.exe build` для `examples/windows-cyrillic.tex`. Внешний MiKTeX XeLaTeX создал `windows-cyrillic.pdf` **16 448 bytes**, 93 dependencies, 11.5004974s; скрипт прошёл `pdffonts`/`pdftotext` проверки и завершился строками `Physical PDF generated and audited` и `Environment report`. Оригиналы: локальный `Documents\TikZarium-QA\evidence\20261109-090708\{windows-cyrillic.pdf,environment.json}`. Исходный Git SHA/двоичные файлы/оригинальный PDF независимо ещё не скачаны — независимая QA в ожидании.

MiKTeX напечатал `major issue: So far, you have not checked for MiKTeX updates` в stderr; компиляция имела успешный результат, не классифицировать предупреждение как ошибку XeLaTeX. Не менять пакеты и конфигурацию TeX скрыто. Bootstrap-инциденты WS01–WS07 документированы; WS07 (повторная установка уже установленного `pgf`) снят при локальной явной проверке пакетов и `-SkipTexProvision`, и канонически исправлен в [PR #150](https://github.com/i-shutov/tikzarium/pull/150).

**W3 GUI остаётся NOT_RUN / NOT_ACCEPTED**: владелец ещё не представил оригинальные экранные снимки и подтверждения шести реальных pointer gestures, F1, Undo, Save/Open, native dialogs, IME/DPI, GUI→XeLaTeX. Следующий точный сценарий: [Windows10 W3 physical QA](WINDOWS_10_W3_PHYSICAL_QA_20261109_RU.md). Серверный W2b независимо NOT_RUN, стабильный W4 NO-GO.


## WS07 — MiKTeX пакеты уже установлены, 2026-11-09

**Фактический пользовательский лог:** `xelatex --version` успешно отработал, MiKTeX Package Manager 4.10; затем `-Phase User` завершилась на `pgf: package is already installed` / `MiKTeX explicit package install failed with exit code 1`. Это ошибка повторного пакетного provisioning в первоначальном установщике, а не неисправность XeLaTeX.

**Исправлено в [PR #150](https://github.com/i-shutov/tikzarium/pull/150):** перед установкой каждого из пяти пакетов (`pgf`, `standalone`, `fontspec`, `xcolor`, `unicode-math`) вызывается `miktex --disable-installer packages info --template '{isInstalled}' <package>`. Устанавливаются только отсутствующие; после операции выполняется повторная верификация. `update-package-database` выполняется только если выявлены отсутствующие пакеты. Статус, отличный от `true` или `false`, запрещает продолжение. Добавлена отдельная hosted PowerShell 5.1 регрессия на состояния `true`, `false` и ошибочные значения без установки стороннего ПО.

**Обход для уже запущенной RDP-сессии QA:** явно проверить каждый из пяти пакетов через `packages info`, установить только отсутствующие, затем выполнить локальный исправленный `TikZarium-Win10-Setup-fixed.ps1 -Phase User -SkipTexProvision`. Данный флаг пропускает лишь повторное provision пакетов; Cargo, XeLaTeX PDF, встроенные шрифты и кириллица по-прежнему должны проверяться. Не скачивать ZIP заново под `tikzarium-qa`, не менять пользователя/права/UAC, не переустанавливать MiKTeX.

**Статус:** Windows 10 `Machine PASS`; `User IN_PROGRESS` с подтверждённым MiKTeX CLI, но без итоговых `environment.json`/PDF; физический W3 `NOT_ACCEPTED`; W4 `NO-GO`.

## 2026-11-09 — новая Windows 10 Pro W3: Machine PASS, User выполняется (не W3 PASS)

**Источник статуса — журналы владельца из RDP; локальный релизный GUI ещё не испытан.** На отдельной Windows 10 Pro 22H2 x64 (build 19045, RAM 3.96 GiB) создан обычный пользователь `tikzarium-qa`, доступ по RDP подтверждён. `-Phase Machine` завершилась сообщением `Machine phase complete`: Git for Windows 2.56.0 с проверенным SHA256, VS 2022 Build Tools, MSVC C++ x64, Windows SDK x64 и существующий VC++ runtime. `winget` и Windows 11 не нужны, Windows Server/FlowBridge не изменялись.

Первые `-Phase User` выявили **две ошибки установщика**: опечатку в ожидаемом SHA256 Rustup 1.29.3 (фактический скачанный Rustup имел корректный SHA256 `38027d51d69a5d05493627a0634dbea52d6cd793c8f072d2373d3f4163eec7db`) и сохранение бинарника как `tikzarium-bootstrap-rustup-1.29.3.exe` вместо `rustup-init.exe`, из-за чего Rustup отвечал `unknown proxy name`. Исправления зафиксированы в [draft PR #150](https://github.com/i-shutov/tikzarium/pull/150) (commit `2a7d605e75c88d762c445a3bd440e217cbbc7e17`); проверка SHA256 сохранена. Пользователь подтвердил «так пошло» после локальной корректировки и перезапуска под `tikzarium-qa` — это **признак снятия предыдущего блокера**, а не доказательство завершённого Rust/TeX/GUI этапа.

Подробный [runbook](../scripts/workstation/windows10/README_RU.md), [инциденты](TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md) и [gate W0–W4](WINDOWS_1_0_RELEASE_CONTROL_RU.md). Следующие необходимые оригинальные свидетельства: полный terminal log `-Phase User` и `environment.json`/PDF/font audit (без секретов), native GUI из активной RDP-сессии, реальные жесты/F1/Undo/Save/Open/IME/DPI/GUI→PDF с исходными screenshots/sha. **W3 пока IN_PROGRESS / NOT_ACCEPTED; W2b NOT_RUN; W4 NO-GO.** Hosted PS5.1 parse-only CI [#42630107591](https://github.com/i-shutov/tikzarium/actions/runs/42630107591) PASS, но не подтверждает установки на Win10.

## 2026-11-08 — candidate per-pointer RDP and source-byte QA fences

Exact trusted baseline `4ec94747f2d11840a5dbc5a274b9840ce30dfba9`; original personal [Server run #42490214199](https://github.com/i-shutov/tikzarium/actions/runs/42490214199) W1 actual native Rust/MiKTeX PDF PASS, but original early artifact #13621431232 says WTSDisconnected=4 and **W2b NOT_RUN**. Final original W1 artifact #13621878747 is not GUI-origin PDF. Reviewed PR #143 QA-only candidate: live WTSConnectState check at every Win32 pointer step, strict UTF-8 and byte-exact preservation of all original source after one additive C-owned draw command, plus offline native/synthetic negative tests. **Neither code changes nor green CI qualify physical W2b.** Win10 W3 NOT_RUN; stable W4 NO-GO. PR #144's read-only trusted-main WTS watcher is now merged at `5e3fb16c4c74f6d7e60649350ccd4d3b3c07f625` after hosted CI. Its success does not prove GUI and its first original personal WTS JSON must be audited. This candidate branch integrates the two independent safety controls with that watcher; personal-server code remains restricted to trusted main.



## 2026-11-08 — latest exact-main physical evidence and read-only scheduled RDP readiness

Current accepted main is \`4ec94747f2d11840a5dbc5a274b9840ce30dfba9\` (PR #142 merged).
All three exact-main hosted push checks SUCCESS: Rust native [#42489761081](https://github.com/i-shutov/tikzarium/actions/runs/42489761081), D QA [#42489761101](https://github.com/i-shutov/tikzarium/actions/runs/42489761101), Windows admin [#42489761099](https://github.com/i-shutov/tikzarium/actions/runs/42489761099).
Personal original [run #42490214199](https://github.com/i-shutov/tikzarium/actions/runs/42490214199) SUCCESS **for W1, not GUI**. Original WTS early artifact **#13621431232**, ZIP SHA256 \`48f3b3f70ab6e7290442ae67e4059c1b8bfb162b2ebf491e7a73aca6762aeb94\`, and final artifact **#13621878747**, ZIP SHA256 \`5c8e9434f8d9c2f4075000c94101419333c8647a8af031e1138e4b2109a64631\` independently agree: session 2 **WTSDisconnected=4**, \`BLOCKED_RDP_DISCONNECTED\`, no GL, HWND, input or GUI photo. Full W2b **NOT_RUN**; historical W2a accepted only at SHA \`ef95c1c9\`, physical Win10 W3 NOT_RUN, stable 1.0 W4 NO-GO. Current original PDF SHA256 \`abbc6a18ed3a10acddc2fc29e39abab083c1d4e3744a887406cea2dab1b242b7\`: real native MiKTeX/dvipdfmx, one page, Arial embedded/subset with ToUnicode, Cyrillic text, visually rendered — W1 PASS.

New **read-only readiness monitor CANDIDATE**, independent of W1: a scheduled trusted-main self-hosted workflow every 30 minutes runs only the reviewed Win32/WTS native probe and uploads an original JSON. It does NOT stage OpenGL, move user mouse, unlock RDP, create a window, start XeLaTeX or claim GUI PASS. Its distinct concurrency key cannot cancel pending full-main W1/QA. An \`WTS_ACTIVE_CANDIDATE_NOT_GUI_PROOF\` is only permission to *consider* running already reviewed W2b GUI; further real same-owned HWND/Default/input focus/DPI/F1/Save-As and physical Windows10 remain mandatory. Existing RDP session must become Active normally; no process/user/RDP policy alteration is authorized. PR #144 has passed exact-head CI and merged into main; the watcher's actual original self-hosted JSON is still required before treating any WTSActive as readiness, and no GUI may be inferred from a scheduled job.


## 2026-11-08 — original current-main postmerge Server proof and WTS evidence hardening

Latest trusted main is `ccb4ecb7f31981bd433f8bbe3f331ec59cc512d3` (PR #141 merged).
[Exact-main hosted CI #42484403986](https://github.com/i-shutov/tikzarium/actions/runs/42484403986)
and [personal Windows Server #42484861464](https://github.com/i-shutov/tikzarium/actions/runs/42484861464)
completed SUCCESS. **Actions success is not physical W2b success.**

Independently downloaded and inspected **original early artifact #13619042829**
(outer ZIP SHA256 `aea4751731af1e8f23a9d98909d3c67505b69017fb5cebee0f7a7495241dce0e`).
Its separate `w2-session-readiness.json` and `windows-server-w2-interactive.json`
agree: at 2026-11-08 13:26 UTC RDP Session 2, **WTS state 4**,
`BLOCKED_RDP_DISCONNECTED`, before GL/GUI launch. No own HWND, pointer event,
GUI screenshot, Save/Open/dialog, IME, DPI200 or GUI→XeLaTeX ran. The original
early verified-hosted binary/ZIP report is **not** GUI input evidence.

Independently inspected **original final artifact #13620370186**
(outer ZIP SHA256 `029418b45169b10c1bae5dbd016687f281ea1863b10e8383e9401157e04e7b25`).
Actual native Server Rust release GUI and CLI are AMD64 PE32+ subsystem
**2/3**, hashes `d84e60be2e97f52fcfb5ba9598de851677ecc283c4d8abb8970b230c800d1ee4`
and `8d117c661599b7162ed075803be121a0992bb16e3b26db5443f2220e529aef13`.
The real native product CLI called existing MiKTeX 26.5 XeLaTeX, exited 0;
the actual uploaded one-page PDF has SHA256
`42c9209e6d6987212afd3ab38de542d4ca4f3269226fa3a5a85e396e4dfe6e6c`,
embedded/subset ArialMT CID TrueType, ToUnicode, correct extractable
`Точка` and `Тест XeLaTeX: Кириллица.`; original source bytes match
`examples/windows-cyrillic.tex`. Installed package lists before/after are
byte-identical. This accepts **W1 on current main**, not GUI→PDF.

This isolated **engineering candidate**, until exact-head CI/review/merge, extends
the independent original-W2 auditor: a new WTS-block verdict must match the
separately uploaded read-only native WTS JSON (source/session/state/blocked
reason), and cannot conceal injected GUI claims or physical PNG/gesture traces.
It does not manipulate RDP and does not promote W2b. Real W2b remains blocked
until an already-authorized existing desktop is genuinely **Active/unlocked**
and the full owned-HWND/runtime/GUI checks pass. W2a only historical
`ef95c1c9` physical PASS; W2b **NOT_RUN**, physical Win10 W3 **NOT_RUN**,
stable W4 **NO-GO**. No runner/UAC/accounts/install changes.


## 2026-11-08 — new physical W2b blocker: actual WTSDisconnected; no input attempted

Trusted `main` a5e2335825af4391d380792406ee0d9e529a5a17, exact-main hosted CI SUCCESS:
[CI #42479515561](https://github.com/i-shutov/tikzarium/actions/runs/42479515561),
[D QA #42479515684](https://github.com/i-shutov/tikzarium/actions/runs/42479515684),
[Windows Administrator #42479515669](https://github.com/i-shutov/tikzarium/actions/runs/42479515669).
Personal [Windows Server run #42480008310](https://github.com/i-shutov/tikzarium/actions/runs/42480008310)
completed SUCCESS with **original early artifact #13616951919**
(outer ZIP SHA256 `f98bf0da4906ac6d81994ab0aa88b7197bf21cfb9f1f294787ed721cc4b7bf2e`)
and **original final artifact #13617707472**
(outer ZIP SHA256 `0830406a4b2265caed160444d1ee90e00ab90d93f3cd19b557c395cafe5a3e6e`).
The original GL provenance proves successful QA-only transfer from exact-main CI escrow:
`PAL1000_MINGW_26_2_6`, archive SHA256
`da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388`,
19 original DLL digests, no system installation or product distribution.
**The previous 7-Zip/CDN blocker is cleared on this run; the remaining blocker is different.**

Original `windows-server-w2-interactive.json`: **`BLOCKED_DISCONNECTED_OR_UNKNOWN_SESSION_STATE`**,
at 2026-11-08 12:24 UTC, RDP Session 2, WinSta0/Default,
**WTSConnectState=4 (WTSDisconnected), `input_desktop=UNAVAILABLE`**.
No GUI process/HWND, source gestures, F1 PNG, native dialogs, IME or GUI-origin PDF was tested.
Historical W2a full-window/F1 PASS at ef95c1c9 is preserved but **not transferred** to a5e23358.
Do not change RDP/UAC/accounts/runner services or infer physical W2b PASS.

Independently checked actual uploaded **W1** `owner-admin-proof/product.pdf`:
PDF SHA256 `f3a914670c959b54b321d9cf62b5ebb213c6381e1e6619545b89a640ffb7c1c5`,
one page, MiKTeX-dvipdfmx/XeTeX producer, embedded/subset ArialMT CID TrueType, ToUnicode yes,
extractable `Точка` and `Тест XeLaTeX: Кириллица.`. Original native Rust 1.91.0
GUI PE subsystem 2 / CLI 3, no dynamic VCRUNTIME, actual MiKTeX 26.5 CLI build exit 0,
packages unchanged, disabled shell escape, existing HIGH Administrator trusted-document warning.
This is **W1 PASS** at a5e23358, **not** W2b GUI→PDF.

Follow-up candidate in independent branch `fix/w2b-rdp-session-gate-20261108`:
read-only WTS native query before Mesa staging; exact trusted-main/self-hosted run and
SHA guards; seven fail-closed Windows PowerShell 5.1 tests; original
`w2-session-readiness.json` and a W2 `NOT_RUN` result when disconnected.
Save GL transfer/network work until WTS is Active, but WTSActive is **only a candidate**:
the existing owned HWND/input desktop/focus/PMv2 runtime gates remain mandatory.
W1 native Rust/MiKTeX continues even when W2 is blocked.

**Release verdict:** W1 PASS current server; W2a PASS historical original; W2b NOT_RUN
(disconnected RDP), W3 physical Windows10 NOT_RUN, stable W4 NO-GO.

## 2026-11-08 — exact-main QA archive escrow candidate (no product redistribution)

To avoid personal Server HTTP 504 to pal1000 CDN, new hosted-main **optional** Windows CI step attempts the same original `pal1000 26.2.6` SHA256 `da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388` and uploads it as a short-lived `tikzarium-private-w2-pal1000-qa-only` Actions artifact from that exact-main successful CI run. The self-hosted workflow downloads it only using its already-validated CI run ID, and revalidates source SHA, CI ID, archive source/digest, complete original archive hash and private copied hash before using it in `RUNNER_TEMP` as a non-shipping test overlay. No external package is inserted in Windows portable release or system directories. Absent hosted escrow allows original pinned network method and official MSYS2 fallback; incomplete/forged escrow fails closed and never bypasses SHA. CI step is optional so an unavailable public CDN never suppresses mandatory native release verification. This is a candidate pending exact-head CI and original real Server proof — archive presence is NOT GUI/F1/W2b acceptance.
## 2026-11-08 — latest personal W2b stage blocker: no 7-Zip, native tar candidate

Trusted main `6cb083b29e4e0f020237b4fa869a979032f5c22b`, physical [run #42476793403](https://github.com/i-shutov/tikzarium/actions/runs/42476793403), original early artifact #13615637630 (ZIP sha256 `1482667918a429d27056d9fc9fb7b1c6e218462b34764039a488e402a87f7a56`). Original JSON: `BLOCKED_PINNED_MESA_STAGE_UNAVAILABLE`, exact reason `PINNED_MSYS2_REQUIRES_EXISTING_7ZIP_NO_INSTALL_ALLOWED`. Existing private hosted EXE/portable SHA/CLI and Administrator token PASS; no owned HWND, no F1/PNG, no physical W2b gestures, Save As or PDF. The original pal1000 release transport failed, MSYS2 fallback was selected but previous script unnecessarily demanded independently installed 7-Zip. Candidate PR uses preinstalled Windows `tar.exe`/libarchive to unpack actual SHA-pinned official .pkg.tar.zst directly, and retains 7-Zip two-layer extraction only when already present. PowerShell 5.1 selftest uses a **synthetic uncompressed tar layout**; real Zstandard support and actual OpenGL runtime are still unproved until exact trusted-main personal execution. If actual tar cannot decompress zstd, fail closed `PINNED_MSYS2_NATIVE_TAR_ZSTD_EXTRACTION_FAILED_EXIT_<N>` without installing programs. Keep W2b/W3 NOT_RUN and stable W4 NO-GO.


## 2026-11-08 — latest original personal W2b transport BLOCKED; separate candidate fallback

Fresh trusted main `597dc894070202975fdf58c434f599deac42fe7d` merged reviewed PR #136 only after exact-head hosted CI and the previous Server #42470761858 completed SUCCESS. New trusted-main [personal Server #42473309431](https://github.com/i-shutov/tikzarium/actions/runs/42473309431) uploaded **original early artifact #13613977992**, ZIP SHA256 `06cdd5733eefd519da3875939baa974223c99aa85b85bea4efb439c4a5482c85`. Its native JSON says **`BLOCKED_PINNED_MESA_STAGE_UNAVAILABLE`** with `PINNED_MESA_TRANSPORT_EXHAUSTED_4_ATTEMPTS: CURL_RELEASE_EXIT_22`. This is a failed GitHub release CDN transport for QA OpenGL, **not** a six-gesture GUI PASS. Exact hosted EXE/portable verification passed; W2b stage1/native pointer, dialogs, IME, DPI200 and GUI→PDF remain NOT_RUN. W2a remains PASS only at original ef95c1c9 evidence.

Engineering candidate (separate branch, NOT trusted on personal Server until reviewed merge): permit **only a transport-exhausted pal1000** fallback to the independently SHA256-pinned official MSYS2 26.2.6-1 MinGW Mesa archive (`7b14de4d3f234efd0022d14dd7fb313ed751c829bb1f46026e0b2dce2d2d05a4`). Enforce exact origin+digest, nested archive structure, actual `opengl32.dll`/`libgallium_wgl.dll`, all staged DLL hashes, and existing private run-only directory; no retry on corrupted/changed bytes, no system install or product redistribution. Windows CI exercises offline negative transport contracts. A network-independent future path is to escrow an original pinned QA archive as an exact-main hosted CI artifact; do **not** assert this exists today.

**Release verdict remains:** W2a accepted at prior SHA; full W2b NOT_RUN, physical Win10 W3 NOT_RUN, stable W4 NO-GO. **Independently accepted latest personal W1:** trusted-main [run #42473309431](https://github.com/i-shutov/tikzarium/actions/runs/42473309431) completed SUCCESS; original final artifact **#13614209996**, ZIP SHA256 `a16ff580f364787bce70142fe3f8ed47cb9b580381e499cf88f98933288f640c`. Independent raw ZIP/pdfinfo/pdffonts/pdftotext and rendered-page inspection: personal Windows Server 2025 x64 genuine native Rust/CLI/PE PASS, real MiKTeX 26.5/XeTeX product-CLI external PDF SHA256 `825a1bc5eb08bb5876f2d263a48ac84335169f3bf79ef30ac165763f64aa81c5`, 1 page, embedded/subset ArialMT CID TrueType with ToUnicode, readable `Точка`, `Тест XeLaTeX: Кириллица.`, correct native .tex SHA; MiKTeX package inventories identical apart from elapsed timing, no automatic packages; HIGH current Administrator trusted-document warning. **W1 PASS on this SHA, still not GUI→PDF W2b.**


## 2026-11-08 — diagnostic: fixed-hash QA Mesa asset HTTP 504

**Вторая ветвь загрузки, только кандидат:** после нескольких 504 даже через curl и официальный release-asset API добавлен резервный пакет [MSYS2 mingw-w64-x86_64-mesa 26.2.6-1](https://packages.msys2.org/packages/mingw-w64-x86_64-mesa), 12.43 МБ, точный SHA256 `7b14de4d3f234efd0022d14dd7fb313ed751c829bb1f46026e0b2dce2d2d05a4`. Путь и DLL-хеши будут отражены в исходном отчёте. Ни подмены пал1000 после SHA-мисматча, ни незаверенного зеркала, ни системной установки. Проверить исполнением на disposable Windows, не присваивать hosted GUI PASS до исходного артефакта. Физический Server W2b остаётся NOT_RUN.

On exact-head PR #136 hosted Win32 run #42467815916 and PR #137 #42467958458, four requests to the external **pal1000 Mesa 26.2.6** QA-only archive all returned HTTP 504. Rust/Windows/macOS/Linux, PS tests and MiKTeX checks were successful; the hosted Win32 GUI evidence step was **NOT PASS**. Retry of the failed job did not fix the gateway error. A disposable-only transport candidate now tries PowerShell HTTP, Windows curl.exe and GitHub's official release asset API, bounded and requiring the **same original SHA256**. All wrong/missing bytes fail closed. This candidate must pass new exact-head hosted CI; **no personal Server W2b input has run**. No system installs or alternate unverified mirrors.

## 2026-11-08 — личный runner: исправление отмен ожидающих заданий

Повторные запуски self-hosted workflow-run на trusted-main SHA `fa55b9af3e2e236819feee73d26c326002ea8028` имели `pending → cancelled` **без единого запущенного job** при завершении множества PR CI. Причина в единой workflow-level `concurrency.group` для всех событий, включая PR `workflow_run` (для которых `jobs.if` уже запрещает реальное выполнение, но очередь может быть занята до обработки `if`). GitHub Actions по умолчанию вытесняет предыдущий `pending` новый ожидающим запуском даже с `cancel-in-progress: false`. Исправление выделяет уникальную очередь для PR/no-op событий и сохраняет один сериализованный ключ для реальных trusted main push/ручного запуска с `main`, не ослабляя контроль SHA и безопасности runner. Это не означает, что сама Windows машина уже предоставила новый W2b PASS.


**Trusted main:** `ef95c1c9ef1ac2b311a654c1daac53c97c8d7ef9`. PR #132/#133/#134 merged, original hosted Windows/macOS/Linux exact-main workflows PASS. **W1 exact-current-main PASS**: personal [run #42460198175](https://github.com/i-shutov/tikzarium/actions/runs/42460198175) completed SUCCESS; final original artifact **#13609998582** ZIP sha256 `e7a39d60a263968ea6b2640507727f52204e92bb45db1b669eab9a6b4d47e13a`, independently executed `qa_windows_server_uploaded.py` PASS_ORIGINAL_WINDOWS_NATIVE_CLI_MIKTEX_PDF_FONTS_UNICODE on original bytes. Actual MiKTeX one-page PDF sha256 `b288cc80cb756deab46ba30c99f347c46ef52e8a46f46f8756c257b8383b72b7`, embedded Arial yes/subset yes/ToUnicode yes, decoded UTF-8 Cyrillic. Native Rust tests, PE GUI/CLI and no unwanted dynamic CRT imports PASS. Independent external XeLaTeX via product CLI, not GUI-origin PDF; W2b remains NOT_RUN.

## W2a genuine physical acceptance: PASS

Original personal Windows Server early artifact **13609526883** in [run #42460198175](https://github.com/i-shutov/tikzarium/actions/runs/42460198175), ZIP SHA256 `1a238945a8b9007d9be4b21198b1ebad9c8378a4ccda996d38e2ea3d797a6b1b`. Verified the original JSON and both PNGs with current independent geometry/decoded-pixel auditor and visual review: existing HIGH Administrator, RDP Session2 WTSActive0/WinSta0/Default, own GUI PID8440/HWND2294498, first-attempt stable foreground525ms, no AttachThreadInput. Complete **1475×850 physical client pixels at 125%/DPI120**, same dimensions before and after, restored per-monitor-v2 DPI context, zero unpainted pixels, right Properties/Help and bottom status fully visible, real F1 opens Russian Справка. Own client PrintWindow only, no desktop pixels. Earlier 1180×680 historical screenshot from 9c721242 was cropped and is intentionally rejected.

## Release gates

| Gate | State |
|---|---|
| W0 Windows x64 release candidate/PE/manifest | **PASS** (hosted exact main #42459875159) |
| W1 native personal Server Rust/MiKTeX PDF | **PASS** exact SHA `ef95c1c9`, original final artifact #13609998582, independent auditor PASS |
| W2a own HWND/F1 complete physical 125% screenshot | **PASS** (original artifact 13609526883) |
| W2b six true GUI gestures, source/Undo, Save/Open, native dialogs, IME, GUI→XeLaTeX PDF | **NOT_RUN** |
| W3 separate actual Windows 10 x64 native GPU/GUI/IME/DPI/full PDF | **NOT_RUN** |
| W4 clean installation/uninstall, signed-status disclosure, stable tag | **NO-GO** |

## Resolved historical defects

PR #132 removed synchronous TeX discovery from GUI loop, solving NO_FOREGROUND_WINDOW. PR #133 fixed virtualized 125% screenshot cropping via bounded native PMv2 and context restoration. PR #134 hardened 105 optimized-Python assertions, verified actual decoded opaque pixels and prevented metadata-only F1 false changes. The old [canceled #42453220928](https://github.com/i-shutov/tikzarium/actions/runs/42453220928) lost artifact uploads/logs; current early **and final** uploads both succeeded; read-only transport probes before/after W1 show DNS RESOLVED and TCP443 CONNECTED for github.com, api.github.com, results-receiver.actions.githubusercontent.com and >62 GB free space. Earlier transient failure's root cause remains **UNKNOWN**; do not assert a permanent network fix.

## Boundaries and next steps

Do not change main during its personal exact-SHA run. Owner's HIGH Administrator is allowed for trusted TeX, not a sandbox; no UAC, registry, new accounts, automatic TeX/package/fonts or system drivers, nor FlowBridge modifications. Temporary pinned Mesa is QA-only, removed after test, never distributed.

Next: run full physical Server W2b and independent native Windows10 W3. Only release stable v1.0.0 after W2b+W3 and tested clean-install/uninstall/W4. See [canonical gate](WINDOWS_1_0_RELEASE_CONTROL_RU.md).
