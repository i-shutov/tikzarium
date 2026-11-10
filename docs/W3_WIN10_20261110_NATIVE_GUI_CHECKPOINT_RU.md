# TikZarium W3 — Windows 10 native GUI, checkpoint 10 ноября 2026

> **Текущий результат:** физические GUI-действия **PASS по отчёту Codex**, но `W3 NOT_ACCEPTED` до независимого ревью оригиналов и остаточных тестов.

## Окружение и версия

- Win10 Pro 22H2, `VM-910136`, Admin, настоящий активный `WinSta0\Default`. Новый worker использовал один контекст для запуска, реального `PrintWindow` client-capture и ввода.
- Основное окно получено через перечисление HWND нового PID, а не `MainWindowHandle` служебного окна 50×50.
- GUI исходник `57cb62e4b70f896eb48978da4252ec1fede6c26a`; текущее для этого среза `main` `488a9687c404f9714eecbcb8ccb4edbf97a54d89`. История линейна, разница ровно 2 коммита: PR #153 (W3 evidence auditor) и PR #150 (Windows bootstrap).
- Оригинальные файлы **только локально**, ещё не представлены независимому ревью: `C:\Users\Admin\Documents\TikZarium-QA\evidence\w3-native-20261110-061007\RESULTS.md` и соседние TEX/PDF/PNG/XeLaTeX logs/SHA ledger.

## Тестовая матрица

| Сценарий | Физический результат по отчёту Codex | Независимая приёмка |
|---|---|---|
| HWND / WinSta0 Default / PrintWindow | PASS | Оригиналы не проверены |
| F1 / встроенный scratch Build диалог / Escape | PASS | Оригиналы не проверены |
| Повторный Save & Build → GUI PDF export | PASS | Оригиналы не проверены |
| Шесть TikZ-жестов | PASS | Оригиналы не проверены |
| Undo, Save/Open, побайтовая проверка `.tex` после повторного Undo | PASS | Оригиналы не проверены |
| Русский текст с явным Arial, embedded+ToUnicode | PASS | Оригиналы не проверены |
| Latin Modern Sans и `Missing character` для «Точка» | REPRODUCED | Issue #159; не считать дефектом движка без отдельного анализа |
| Windows IME (вместо paste) | NOT_RUN | NOT_RUN |
| DPI 125% / 200% | NOT_RUN | NOT_RUN |
| Проверка exact final release EXE+SHA | NOT_RUN | NOT_RUN |
| Полный W3/W4 | NOT_ACCEPTED | NO-GO |

## Дальнейшая приёмка

1. Не повторять Machine/CurrentUser/Cargo/MiKTeX без проверенной необходимости; сохранить исходные доказательства неизменными.
2. Проверить настоящий IME, DPI 125% и 200% с клиентскими снимками и фактической геометрией; clipboard paste — отдельный сценарий.
3. Независимо запустить [W3 evidence auditor](../scripts/tools/qa_w3_physical_evidence.py) на оригиналах и провести ручной обзор исходных PNG/TeX/PDF/XeLaTeX логов. Его STRUCTURE_PASS сам по себе **не означает W3 PASS**.
4. Финальное испытание на exact-source-sha portable ZIP после принятия релизных PR; W2b Server и W4 clean-machine отдельные обязательные проверки.

Ссылки: [#154 resolved desktop blocker](https://github.com/i-shutov/tikzarium/issues/154), [#159 Cyrillic font scope](https://github.com/i-shutov/tikzarium/issues/159), [#108 W2b/W3 release gates](https://github.com/i-shutov/tikzarium/issues/108).
