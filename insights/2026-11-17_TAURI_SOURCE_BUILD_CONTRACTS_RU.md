# Tauri T3-A: исходник, реальная сборка и восстановление работ

17.11.2026. План: [TAURI_PRIMARY_MIGRATION](../plans/2026-11-17_TAURI_PRIMARY_MIGRATION_RU.md).

## Срез восстановления

Live main `2a59631e67b87692c7bdfd0a542355eaed38f15c` уже содержал Tauri. Отдельный `bc67f92918942ae911cb26cf50987c784e5b7020` содержал только три добавления относительно общего Tauri source: план, findings, bootstrap CI. Они восстановлены в main как `fb0fc39abab68e47ec4dadd0e2b198a7dfcb4002`; повторного framework-selection или повторного merge #191 нет.

Источник локального исследования: GitHub artifact `14322656268`, run `44070412964`; ZIP SHA256 `6ed1dbe00562ceea2548396f5c300699af880d1cd93faa44bb578fdb51c8a7f7`. Проверены 1195 файлов по вложенному manifest. 285 исключённых файлов (в том числе fonts/PDF/archives) не восстанавливались и не удаляются из Git. Это source snapshot, не полный git clone. Прямой DNS контейнера к GitHub недоступен; connector и hosted CI работают.

## F04 — ложный успешный PDF

`App.tsx::executeBuildCycle` вызывал setTimeout(450), локальный analyzeTexDiagnostics и затем `setBuildStatus('succeeded')`, `setBuiltRevision`, `setSavedRevision` без результата XeLaTeX. Стартовая сцена и Open также начинались со «собранного» rev1. Save IPC выполнялся параллельно этому таймеру: Cancel диалога или ошибка диска не останавливали ложный Build.

Решение: исходное состояние absent/idle; реальный async EngineAdapter; требуются engine=xelatex, exact revision, full UTF-8 SHA-256 и PDF signature. Save-before-Build ожидает квитанцию; cancelled/error/mismatched save не запускают Build. Документальная generation + request token + исходник/revision отсекают поздние результаты, включая edit/undo и смену документа. Проверка подписи PDF не является научной валидацией содержимого.

## F05 — разные digest под одним именем

JS `computeHexDigest` был dual-lane FNV fingerprint; Rust выдавал первые 16 hex SHA-256. Для `a\r\nb`: JS `c40663db648db04f`, Rust `18745f36a05e2907`. Это не совместимый revision fence.

Решение: отдельный sourceDigest SHA-256 exact UTF-8, 64 hex, совместимый с Rust sha2 и независимым node:crypto. Legacy UI fingerprint не меняется и не используется как source authority. Пустой/укороченный/stale expected digest отклоняется. Короткий SHA Save — только квитанция существующего API; stateful native document authority остаётся отдельной задачей.

## F06 — Undo и Unicode

Воспроизведение на исходном snapshot: удалить единственный CRLF из `a\r\nb`, затем применить inverse — получается `a\nb`. No-op на mixed EOL переписывал окончания строк. JS принимал insertion внутри surrogate pair emoji, Rust его отвергал. Line-range offsets предполагали одинаковую длину каждого перевода строки.

Решение: inverse всегда exact + expectedText; no-op не нормализуется; UTF-16 и CRLF — неделимые границы, в том числе у обратного патча; line offsets берутся по фактическим разделителям. Shared JSON (23 случая) выполняется независимо JS и Rust, SHA ожидаемых bytes подготовлены Python hashlib. Локально SHA сверяется с node:crypto на границах блоков, кириллице/emoji/combining/BOM. Начальная ошибка authored fixture (mixed-noop endOffset7 вместо6) исправлена, не ослабляя production guard.

## F07 — сборка при открытии и source-only cache

Показ PDF-панели/включённая по умолчанию калька запускали render effect. Это делало Open скрытым исполнением TeX. Native cache учитывал только source/bounds/DPI и не учитывал изменения external .dat, runtime, fonts.

Решение: убрать этот trigger; Build явный, Live opt-in только текущего документа/сеанса, при Open выключается. Небезопасный cache reuse и накопление отключены до dependency closure. Это не реализует разрешение относительных external inputs в tempdir и не доказывает отмену дерева процессов: эти задачи остаются открыты.

## F08 — Windows runtime install

Конфигурация содержала downloadBootstrapper + silent=true. В соответствии с политикой явной установки runtime заменено на webviewInstallMode={type:skip}. Первичный источник: https://v2.tauri.app/reference/config/#webviewinstallmode (проверен 17.11.2026). WebView2 теперь внешний prerequisite, не скрытая установка. Реальный Windows installer этим изменением не испытан.

## Делегирование, доказательства и следующий шаг

Фактически запущенных младших моделей в текущем блоке 0: launcher недоступен. Пакеты J1-J4/R1 готовы, но не являются агентными сессиями. Ни unit/mock tests, ни CI jobs не называются независимой native приёмкой. Исходные FAIL/исправления сохраняются отдельно. CI lockfile import и исходный patch ограничены известной integration-веткой и ожидаемыми хешами.

Открыто: все visual mutations через native document authority; actual IPC/UI сценарий с build/save/cancel; dependency closure, bounded PDF raster/process-tree cancellation; корректность физического масштаба кальки; CP09 science parity; новая Tauri-only Visual Guide; native Win10/IME/DPI/macOS и G3. Текущий source/build блок не заявляет их PASS.

## F09 — дополнительные пути ложного Save и повторных сборок

DirtyDocumentGuard `onSaveAndSwitch` в baseline только вызывал setSavedRevision и переключал документ: записи на диск не было. Он теперь ждёт той же проверенной native Save-квитанции; cancel/error/superseded сохраняют текущий буфер. Прежний SaveAndBuildModal больше не принимает введённый путь как запись и ведёт в реальный OS dialog. Импорт `.tikzproj` сбрасывает native path, build epoch и прежний PDF, а не наследует результат другого документа.

Live admission допускает одну автоматическую попытку для данной пары document/source revision, включая отказ; ошибка не порождает бесконечную очередь TeX. Cancel выключает Live и снимает ожидающий debounce. Это проверено pure JS контрактом; реальный пользовательский сценарий/IME ещё требует native QA.

## F10 — удалённые шрифты не нужны офлайн-оболочке

В исходном index.html находились preconnect и Google Fonts stylesheet. Убраны внешние запросы; CSS использует доступные локальные семейства/fallback. Файлы шрифтов не добавлялись и не публикуются. Настройка CSS семейства не доказывает, что оно установлено на пользовательской машине.
