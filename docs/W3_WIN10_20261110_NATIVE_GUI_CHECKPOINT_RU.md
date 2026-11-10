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

## 2026-11-10 — повторный контроль: оригинальный W3 архив собран, формальная приёмка не пройдена

**Факты из локального отчёта Codex, а не из независимо открытых здесь файлов:** собран архив `C:\Users\Admin\Documents\TikZarium-QA\evidence\w3-independent-review-20261110.zip`. SHA256 `7516DB3C57C140D314A44725C0BF2F9E89DF4CD27AA44AF210E11895AF3E7716`. **63 оригинальных файла** совпали с копиями в архиве, ZIP CRC проверен локально. Эта локальная проверка не подтверждает семантическую полноту W3 и не делает файл доступным из другого компьютера: ссылка `C:/Users/Admin/...` не является публичной или подключённой к GitHub. Архив не должен публиковаться в открытом репозитории без приватного просмотра исходных окон/путей/секретов.

**Проверено дополнительно:** физические клавиши при русской раскладке ввели «тест» и сохранили его в `.tex` (без clipboard, без Unicode injection). Это `NATIVE_RUSSIAN_LAYOUT_KEYBOARD_PASS` **по отчёту Codex**. **Composition/preedit IME всё ещё `NOT_RUN`**, но это *отдельный* тест IME для языков со составным вводом (японский/китайский/корейский), а не свойство обычной русской раскладки. Не объявлять `IME PASS` и не объявлять `RUSSIAN_KEYBOARD NOT_RUN`. Ссылки: [Microsoft IME overview](https://learn.microsoft.com/en-us/windows/apps/develop/input/input-method-editors) и [русская раскладка ≠ IME composition](https://support.microsoft.com/en-us/windows/hardware/input-devices/advanced-input-methods-for-east-asian-languages).

**DPI 125%/200% = `NOT_RUN`**: текущий GUI прогон шёл при 96 DPI (100%). Прежний запрет на изменение системных/RDP настроек сохранён. Для физической DPI приёмки нужна заранее согласованная **временная QA-конфигурация масштаба** (с возвратом исходного значения) либо другая заранее настроенная интерактивная сессия/VM, допускающая 120/192 DPI. Нельзя объявить физическую DPI приёмку путём resize PNG, DPI virtualization, смены `SetThreadDpiAwarenessContext` только у тестового helper без фактического UI масштабирования.

**Аудитор v1 `qa_w3_physical_evidence.py` исходного main `488a9687` вернул `FAIL_ORIGINAL_W3_EVIDENCE`**, первая ошибка — отсутствие `w3-original.json`. Дополнительно по независимому локальному обзору отсутствуют снимки отдельных состояний исходника и reopen, полный structured event trace, доказательство связи исполнявшегося EXE с *финальным* release SHA. Отдельный ручной обзор подтвердил последовательное появление шести фигур, но в PDF с Arial `Точка` визуально **пересекает исходный узел TikZarium** из-за выбранных координат тестовой вставки; отдельно зафиксировать это как **проблему QA fixture layout**, не автоматически как дефект geometry engine. **Не перерисовывать оригинальные доказательства**; при повторном тесте выбрать непересекающееся размещение и честно объяснить изменение условий.

**Точное состояние:** source `488a9687` собран локально offline, новый debug EXE SHA256 сообщён как `D1585C62…977D0A776`, а EXE первого реального GUI прогона — `2AD442EE…5BC67522`; эти усечённые хеши не позволяют произвести SHA256-приёмку. Полный GUI-проход новой сборки **`NOT_RUN`**. Сохранить полные SHA256 в релизной ledger перед формальным W3 PASS и проверить именно нужный candidate EXE.

**Решение:** `W3 = NOT_ACCEPTED`; independent original evidence & review `NOT_RUN` в этом чате до получения байтов архива; DPI120/192 `NOT_RUN`; native keyboard RU = PASS by report; IME composition = `NOT_RUN`. Не создавать искусственный `w3-original.json` с неподтверждёнными событиями. `W4 stable = NO-GO`. Недостатки evidence-package — не доказательство дефекта TikZarium. Релизная подготовка продолжается без изменения `main`.
## Дальнейшая приёмка

1. Не повторять Machine/CurrentUser/Cargo/MiKTeX без проверенной необходимости; сохранить исходные доказательства неизменными.
2. Проверить настоящий IME, DPI 125% и 200% с клиентскими снимками и фактической геометрией; clipboard paste — отдельный сценарий.
3. Независимо запустить [W3 evidence auditor](../scripts/tools/qa_w3_physical_evidence.py) на оригиналах и провести ручной обзор исходных PNG/TeX/PDF/XeLaTeX логов. Его STRUCTURE_PASS сам по себе **не означает W3 PASS**.
4. Финальное испытание на exact-source-sha portable ZIP после принятия релизных PR; W2b Server и W4 clean-machine отдельные обязательные проверки.

Ссылки: [#154 resolved desktop blocker](https://github.com/i-shutov/tikzarium/issues/154), [#159 Cyrillic font scope](https://github.com/i-shutov/tikzarium/issues/159), [#108 W2b/W3 release gates](https://github.com/i-shutov/tikzarium/issues/108).
