# TikZarium Windows 1.0 — UIX-first scope и обязательные UX gates

## SCIENTIFIC 1.0 OWNER OVERRIDE — 11.11.2026

All UX-F01…F14, T0…T8, G1…G6, real Windows 96/120/192 DPI and native W2b/W3/IME/W4 in this file remain **MUST** for 1.0. Its historical "scope exception ONLY UX / SCI142 and 35 packages after 1.0" is superseded by the new explicit approval of [full ST-SCI as v1.0.0](../docs/RELEASE_SCOPE_SCIENTIFIC_STUDIO_1_0_RU.md). Now include SCI142 142/103, PGFPlots shared SC3/AT4, science AI88, Asymptote+Typst/CeTZ scoped native scientific workflows and premium scientific Studio. All other subject packs follow future domain order; data last. Full UX still mandatory; new release stable NO-GO. Previous QA evidence remains version/SHA-specific.


**Решение владельца:** 10 ноября 2026, после публикации исходного UIX-аудита `0f2a1f19f06c39170bf5bb670ce10bf73a062d11`: **«нет, тащи их в 1.0. делай мердж и веди разработку»**.

**Статус:** нормативный новый scope / implementation plan. Никакая функция UX-F01…F14 не объявляется исправленной без отдельного доказательства. Релиз 1.0 пока **NO-GO**.

## 1. Приоритет и изменения прежних решений

1. **Все 14 замечаний [UIX-аудита](../insights/2026-11-10_CRITICAL_UX_AUDIT_RU.md)** перевести из предложенных версий 1.1/1.2/1.3 в **обязательный UX-контур Windows 1.0**. Версии 1.1/1.2/1.3 в исходном [историческом UX-плане](UX_2026-11-10_RELEASE_PLAN_RU.md) теперь означают *предыдущую гипотезу о порядке*, а не целевые релизы или разрешённую отсрочку. Метки последующих релизов ещё не утверждены.
2. UIX-ветка `codex/ux-audit-20261110` / `0f2a1f1` уже содержит исходный аудит, нативные оригиналы Windows10, контрольные суммы, 14 замечаний и UX-трассировку. Это факт анализа, не факт закрытия замечаний. Сохранить ссылки на исходное evidence и reviewer provenance.
3. **Эргономика до адаптеров:** полноценный редактируемый TeX, макет, Inspector, F1, инструменты, файловые диалоги и понятный workflow «правка → PDF → ошибки → исправление» принимаются **до** массового GUI-втягивания новых `pgfplots`, `circuitikz`, `chemfig` и остальных предметных расширений. AT0 intake и низкоуровневые source/build эксперименты вправе идти параллельно, но не считаются GUI-продуктом.
4. **Новая граница release freeze:** для UX-F01…F14 открыто исключение в Windows 1.0. Все прочие новые предметные 35 packages / 88 examples и Scientific-142 SC-разработки остаются вне функционального состава 1.0 до нового решения. Код UX проходит ту же безопасность, CI и независимую физическую приёмку, что baseline.
5. **DPI:** включение *всего* UX-4 в 1.0 снова открывает физическую проверку **100%/125%/200%** и мониторные переходы из [issue #161](https://github.com/i-shutov/tikzarium/issues/161). Прежнее решение «только 96 DPI, 125/200 позже» для полного UIX-1.0 **пересмотрено** последней командой владельца. Нельзя закрывать #161 без оригинального физического доказательства. Если владелец впоследствии вновь ограничит DPI — оформить отдельное явно датированное решение, а не молча убрать проверку.
6. **W2b, W3, реальный IME и W4** остаются обязательными. Смена приоритета UX **не** превращает исторические PNG, unit-тесты или hosted Windows2022 в физическую приемку Windows10. Stable tag/Release запрещены до совокупного GO.
7. Новый UI работает с **обычным существующим TeX**, не вводит собственный parser/рендерер/CAD, не переписывает неизвестные макросы, авторские комментарии, CRLF, Unicode и source ownership. Внешний MiKTeX/XeLaTeX, запрет shell escape, отсутствие автоустановки, текущий trusted Administrator и все protective constraints сохраняются.

## 2. Порядок больших блоков

| Блок | Обязательный результат 1.0 | Закрывающий gate | Статус на момент решения |
| --- | --- | --- | --- |
| **UX0 — Baseline** | Исходный UIX-аудит на `0f2a1f1`, все 14 находок и оригинальные native снимки, статусы, сценарии пользователя, независимая точка сравнения | Source/EXE/evidence provenance; замеры длительности и pilot tasks базовой версии отдельно | AUDIT AVAILABLE / USER TIMING NOT_RUN |
| **UX1 — Readable source (F01 F02 F03 F12)** | Реальная подсветка TeX/TikZ для 4 тем, ownership comments читаемы и не меняют байты; физические номера строк; Find/Replace, Go to line, текущая строка; font 12–24 pt, wrap/focus и сохранение preferences | G1 source/UTF-8/CRLF/Undo; G2 native desktop editing; G3 performance 10k строк; T1/T2/T5 | NOT_ACCEPTED |
| **UX2 — Workspace (F04 F06 F07 F08 F13)** | Первые действия понятны; 6 tools одним выбором; эскиз отличим от точного PDF; компактный Inspector/единственный Apply; F1/Help без дублирования; доступная клавиатура/фокус и читаемые labels | Native T3/T4, keyboard smoke, original owned-client viewport matrix; нет перекрытых действий | NOT_ACCEPTED |
| **UX3 — Save/Build/PDF (F05 F09 F10 F11)** | Native save picker и fallback; disabled/причины; раздельные clean/dirty, running/cancelled/failed, absent/current/stale; диагностика и click-to-source; русский UI, безопасный экспорт и отмена | Native T0/T5/T6/T7 + GUI→external XeLaTeX PDF, original source+PDF/log, cancellation/rollback | NOT_ACCEPTED |
| **UX4 — DPI/accessibility/scale (F12 F13)** | Физические 96/120/192 DPI (#161), focus/Tab/Enter/Escape/assistive checks; адаптация 1180×680, 1366×768, 1920×1080, stress 1024×640; long-source and responsive perf | Физическое Win10, оригинальные скриншоты/лог, сохранность font/Unicode, честный статус IME/screen reader; performance budget | NOT_ACCEPTED |
| **UX5 — Release convergence (F14 + W2b/W3/W4)** | Консолидация документации, release ZIP и источников exact SHA, owner task pilot T0–T7, QA/откат/настройки | Все P1/P2 из 14 закрыты либо имеют **явное** решение владельца об исключении; exact-head CI + независимый physical GO | NO-GO |

**Не считать UX-1 выполненным**, когда добавлено только приглушение `% tikzarium:n1:`. Нужна работающая цветовая токенизация **в самом mutable TextEdit** и полноценная навигация. Документ/библиотека не становятся готовыми от теста их API.

## 3. Перекрывающие критерии приёмки

| Проверка | Обязательная демонстрация | Недопустимый заменитель |
| --- | --- | --- |
| **U-G1 source contract** | Границы UTF-8, Unicode/CRLF, нераспознанные макросы, `verbatim`, `\verb`, escaped percent, одинаковые байты при применении темы/шрифта/переноса; Undo/Redo/Save/Open не теряют пользовательские данные | Synthetic screenshot, «код изменился минимально» без сравнения |
| **U-G2 native editor** | Подсветка, номера строк, Find/Replace, корректный курсор и selection, хоткеи, клавиатура, 6 created objects и пользовательский PGFPlots файл в настоящем исходном редакторе | Рендер отчёта/HTML галереи без редактирования |
| **U-G3 performance** | Конкретная машина, OS/GPU/renderer, 10 000 строк/1 MiB p95 event→frame ≤50 ms, first editable frame ≤2 s; stress 100k/10 MiB без потери ввода | Измерение unit lexer без GUI или стенда, подставленные цифры |
| **U-G4 workflow** | Понятно новый документ→6 primitives→source→properties/Undo→Save & Build→PDF→намеренная ошибка→исправление→экспорт/rollback | Журнал CI вместо взаимодействия пользователя |
| **U-G5 accessibility/scale** | Реальные Tab/Shift+Tab/Enter, focus/accessible names; DPI+multi-monitor; IME composition отдельно от русской раскладки | Увеличенный скриншот 96 DPI, наличие tooltip вместо доступного имени |
| **U-G6 distribution** | Финальная portable ZIP точного source SHA, оригинальные EXE/ZIP hashes/CRC, MiKTeX XeLaTeX log и fonts/ToUnicode, чистый запуск и rollback W4 | Перепакованная после приёмки сборка, только hosted Windows GUI |

Задачи T0–T8, исходные метрики и ограничения использовать дословно из [UX-плана](UX_2026-11-10_RELEASE_PLAN_RU.md). Успешная компиляция не означает пользовательскую пригодность или научную корректность.

## 4. Правила выполнения и статусы

- Работать **крупными реализационными вертикалями**, а не микро-PR ради документов. Первый кодовый блок UX1: поддержка четырёх тем, lexical syntax spans и source integrity, line navigation/Find/Replace с Undo. Затем UX2/UX3 с полноценным native GUI.
- Использовать только текущий `main` и reviewed отдельные ветки, переносить из [PR #128](https://github.com/i-shutov/tikzarium/pull/128) полезные source-only решения выборочно; не сливать его устаревшие workflow leases/изменение source без ревью.
- Независимо тестировать source-safe state и обычные native desktop gestures; статус каждой находки: `PLANNED / IMPLEMENTED_NOT_VERIFIED / UNIT_EVENT_PASS / HOSTED_GUI_PASS / PHYSICAL_PASS / ACCEPTED / BLOCKED`. Один успешный green CI не закрывает P1.
- Все original Windows client PNG проверять на source/EXE/hash/права окна/foreground/защиту чужого desktop. Ранее снятые QA изображения не являются доказательством нового исполняемого файла.
- После UX5 GO только тогда можно расширять native предметный inspector/палитры до 35 пакетов, 88 примеров и Scientific-142. Source/engine intake AT0–AT1 продолжает собственные gates и не блокируется UX проектированием.
- Физический Сервер W2b и актуальная Windows10 W3/W4, отсутствие silent TeX install и warnings про elevated trusted-only остаются неизменными. **Не выпускать v1.0.0 на основании этого документа.**

## 5. Нормативные ссылки

- [Исходный аудит, 14 находок](../insights/2026-11-10_CRITICAL_UX_AUDIT_RU.md), коммит `0f2a1f1`, копии оригинальных native материалов в `insights/assets/2026-11-10-ux-audit/`.
- [Историческое покомпонентное ТЗ UX-0…UX-4](UX_2026-11-10_RELEASE_PLAN_RU.md): использовать описания задач, критерии G1–G3 и T0–T8, но **не устаревшую привязку к 1.1/1.2/1.3**.
- [Основной roadmap](../docs/ROADMAP.md), [AI/88 support roadmap](AI_TIKZ_SKILLS_2026-11-10_SUPPORT_ROADMAP.md), [canonical Windows W0–W4](../docs/WINDOWS_1_0_RELEASE_CONTROL_RU.md), [проблемы и решения](../docs/TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md).
