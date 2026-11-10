# Windows 10 W3 — исходники, EXE и изолированный Mesa runtime: provenance gate

Дата: 10.11.2026. Исходная база `main` `488a9687c404f9714eecbcb8ccb4edbf97a54d89` после PR #150 (bootstrap) и PR #153 (независимый W3-аудитор). Релизный приоритет Windows 10 Pro x64, features frozen. Физические W2b/W3 остаются НЕ ПРИНЯТЫМИ, stable W4 NO-GO.

## Причина

Рабочий `scripts/workstation/windows10/Invoke-TikZarium-W3-Mesa.ps1` ранее копировал любой локальный `target/debug/tikzarium-app.exe` в QA runtime. Значение `source_sha` при отсутствии Git было `NOT_CHECKED`, но запуск всё равно продолжался. `-Action RunPrepared` не сверял исходный EXE с зафиксированным SHA, а локальные Mesa DLL могли быть заменены после первоначальной подготовки. Из-за этого физическое тестирование могло фактически запускать программу **до** принятого PR #152, где исправлена кнопка `▶ Build`, и ошибочно обвинять новую версию. Прежняя успешная CLI→PDF проверка этого не исключала.

## Реализовано в отдельном QA-кандидате

1. Новый чистый PowerShell-модуль `W3-Source-Guard.ps1`: до скачивания/копирования проверяет существующий Git, текущий полный SHA, отсутствие изменений отслеживаемых файлов, именно локальную ветку `main`, наличие принятого merge-коммита PR #152 в истории и исходника `build_save_dialog.rs`.
2. Проверка, что `tikzarium-app.exe` не старше исходников Rust, Cargo.lock, манифестов и `examples/quickstart.tex`. Не вносит никаких изменений и при сомнении отказывает, предлагая только `cargo build --locked -j 1 -p tikzarium-app` из доверенной main. **Только timestamp** не является криптографическим доказательством сборки, статус честно указывается в JSON.
3. Для строгого контроля конкретного принятого ревизионного среза поддержан параметр `-ExpectedSourceSha <40 hex>`; он **обязателен и для любого физического действия launcher** (PrepareOnly/PrepareAndRun/RunPrepared); только автономный чистый `-Action SelfTest` допускается без SHA. Отсутствующий либо невалидный 40-символьный Git SHA приводит к fail-closed до работы с графикой/каталогом QA. Никакого `git fetch/reset` или неизвестного удалённого кода.
4. Сохраняется `w3-mesa-preflight.json`: SourceProof SHA/EXE digest, исходный и копированный EXE SHA256, полный словарь SHA256 всех изолированных x64 Mesa DLL.
5. При `RunPrepared` и `PrepareAndRun` непосредственно перед запуском проверяется неизменность локального исходника, EXE, подготовленного EXE и всего набора DLL. Старый JSON без provenance или с изменениями FAIL-closed.
6. Дополнительная `-Action SelfTest`: восемь чистых позитивных/негативных проверок строгой SHA и временной свежести без доступа к удалённой Windows/TeX, без графического интерфейса и без изменений файлов. Hosted PS5.1 сначала парсит оба скрипта, затем выполняет SelfTest.
7. Никакой регистрации runner, установки TeX/драйверов/7z в систему, изменения Win10/W2b/RDP/UAC/реестра. Изменяются только проектные сценарии W3 QA и документация.

**Внимание:** commit `488a9687` — исторический подтверждённый срез до последующей интеграции W3 guard. Для нового запуска заменить плейсхолдер `$expected` точным SHA **последнего принятого main** по GitHub и проверить совпадение локального HEAD. Не брать SHA только из самого локального checkout как доказательство его актуальности; несовпадение блокирует запуск, а не служит поводом для `git reset`.

## Реальный запуск только в активном существующем профиле Windows 10 Admin (medium token)

Пример для доверенного среза после проверки исходного SHA:

```powershell
$repo = Join-Path $env:USERPROFILE 'source\tikzarium'
# SHA нужно взять из последнего независимо принятого GitHub main, а не из старого локального HEAD.
$expected = 'PASTE_APPROVED_FULL_40_HEX_MAIN_SHA_HERE'
& 'C:\Program Files\Git\cmd\git.exe' -C $repo rev-parse HEAD
# Если HEAD не совпадает с $expected — выяснить причину; не reset/force checkout.
# Убедиться, что exe действительно собран из выбранного main.
$launcher = Join-Path $repo 'scripts\workstation\windows10\Invoke-TikZarium-W3-Mesa.ps1'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -Action SelfTest
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -Action PrepareAndRun -ExpectedSourceSha $expected
```

Скрипт должен лежать рядом с `W3-Source-Guard.ps1` из того же Git checkout. Если exe устарел, **только по фактически наблюдаемому сообщению** его можно пересобрать через `cargo build --locked -j 1 -p tikzarium-app`, не выполняя Machine/CurrentUser и установку пакетов. Если готовый runtime уже был подготовлен старым скриптом без словаря SHA DLL, сначала `PrepareOnly -ExpectedSourceSha ...`, затем `RunPrepared -ExpectedSourceSha ...`; старый overlay не считается принятым.

После открытия реального GUI выполнять проектный W3 тест из `docs/DOT_WINDOWS10_W3_GUI_HANDOFF_RU.md`: не сохранённый исходник → `▶` → **встроенная модалка** → `Escape` без файла → корректный новый .tex → GUI→XeLaTeX PDF, шесть настоящих TikZ-жестов, F1, Undo/Save/Open, Unicode/IME/DPI и оригинальные PNG только собственного HWND. Исходные доказательства передавать `scripts/tools/qa_w3_physical_evidence.py` — это **STRUCTURE_PASS**, но не автоматическая физическая W3 приёмка.

## Релизные ворота

- C1: exact-head hosted PowerShell 5.1 parser, чистые позитивные/негативные тесты, Mesa SHA/CRC/загрузка в изолированный каталог PASS.
- C2: независимый review сценариев PS и отсутствие системных действий; проектный Git SHA и Runtime не перепутаны.
- C3: физический Win10 под активным принадлежащим пользователю HWND; оригинальные свидетельства (NOT_RUN до фактического выполнения).
- C4: Server W2b — отдельно; stable 1.0 W4 — NO-GO.

**Не объявлять успех физического GUI лишь от подготовленного runtime, CI или PDF, собранного CLI.**
