# Tauri: checkpoint восстановления и следующий небольшой блок

17.11.2026. Дополнение к [основному плану миграции](2026-11-17_TAURI_PRIMARY_MIGRATION_RU.md), а не новая конкурирующая дорожная карта. Эта запись обновляет pending-статусы T3-A из раздела 7 основного плана; исторические записи не переписываются.

## 1. Точная точка продолжения

- Source с исправлениями: `cfe4715b6c96f33a634a6355b942248e9cf6affd`.
- Восстановленный main до переноса: `fb0fc39abab68e47ec4dadd0e2b198a7dfcb4002`.
- Main fast-forward до cfe4715b выполнен с exact-head lease, без force. Два коммита интеграционной ветки сохранены в истории.
- Первый документальный commit текущего восстановления: `bfd475a26e81fa333643759b2d6ee2ff98e95584` — артефакты и findings.
- Текущий файл — следующий отдельный документальный commit. Production source в этих двух документальных коммитах не меняется.
- Проверенный run: https://github.com/i-shutov/tikzarium/actions/runs/44088234408 . Workflow head 68e9c05a является importer; фактический тестируемый source — cfe4715b.
- Архивные теги egui CP09 и main-before-tauri сохраняются. Новые release tags/installer/assets этим блоком не создаются.

Tauri — основной интерфейс; egui — только legacy/scientific donor. Выбор фреймворка закрыт решением владельца.

## 2. Закрытый объём восстановления

| Область | Фактический итог | Класс свидетельства |
|---|---|---|
| Source/build corrections и два lockfile | Опубликованы в main на cfe4715b | IMPLEMENTED + перечисленные checks |
| Frontend | npm ci, 107 tests, tsc --noEmit, production build PASS | UNIT_EVENT / build |
| Rust host | 3 test functions, rustfmt, strict all-target Clippy, standalone embedded-assets build PASS | UNIT_EVENT / build |
| Native startup | Linux/X11, client 1180×680, оригинальный PNG, PID/executable receipt, exit 0 | HOSTED_GUI, только startup |
| Архивы | SHA-256/CRC и source binding проверены у ZIP с 5 и 13 файлами; PNG/application.log хеши совпали | Artifact integrity |
| Визуальный просмотр | Выполнен интегратором; UI-01/02/03 остаются OPEN | Не независимая агентная приёмка |
| Subagents | 0, launcher недоступен | NOT_LAUNCHED |

Подробности: [insights/TAURI_FOUNDATION_ARTIFACT_REVIEW](../insights/2026-11-17_TAURI_FOUNDATION_ARTIFACT_REVIEW_RU.md). Старые 609 тестов egui не приписываются Tauri. Сборка и открытие окна не закрывают T3 целиком, CP09 parity, Win10/IME/DPI, macOS, accessibility или G3.

## 3. Следующий ограниченный блок T3-B1 — настоящий Save round-trip

Цель: один документ, реальное native Open → текстовая правка → Save → повторное открытие с точными байтами. Не начинать одновременно все scientific adapters, все платформы и новый полный Guide.

Вход: свежий main, содержащий cfe4715b и этот checkpoint; до изменений записать точный SHA. Использовать одноразовый fixture в отдельной временной папке: кириллица, emoji, CRLF и неизвестный макрос. Не изменять immutable scientific corpus.

Обязательная последовательность:

1. Прочитать фактический маршрут frontend → tz_open_document/tz_save_document → Document::load/save_to. Проверить существование document/session identity и baseline внешнего файла; не считать чистую stateless patch-функцию владельцем дискового документа.
2. Воспроизвести без исправления нормальное Save и три отрицательных случая: Cancel Save As, внешнее изменение файла, переключение документа при открытом диалоге. Сохранить исходные bytes/hashes и результат.
3. Исправить только подтверждённый дефект владения/квитанции. Save признаётся успешным лишь для того же документа и снимка ревизии; ошибка/Cancel не очищают dirty и не переключают файл с потерей текста.
4. Добавить чистые contract tests и отдельный настоящий hosted Tauri UI/IPC прогон. Unit mock не заменяет native scenario. Оригинальные PNG, source bytes до/после, журнал и SHA сохранять без подрисовки.
5. Выполнить scoped regression: npm test/typecheck/build; cargo test --locked и strict Clippy. Commit/push на integration branch до тяжёлого GUI-прогона. После чтения результатов — один integration commit/main promotion с exact-head lease.

Граница завершения: точный no-op/save round-trip и три отрицательных исхода подтверждены; failure history сохранена; нет нового обещания полной сборки PDF. Следующий отдельный блок после этого — Save → явный XeLaTeX Build → current PDF с реальным output, затем stale/cancel/dependencies.

## 4. Подготовленные задачи младшим моделям

Это очередь, **не запущенные агенты**. При появлении рабочего launcher сначала записать model/session/task/base SHA; только затем менять статус на RUNNING. Названия junior-ролевых пакетов не обозначают доступную конкретную модель.

| ID | Разрешённые файлы / область | Задача и критерий | Статус |
|---|---|---|---|
| J-SAVE | src-tauri/src/commands.rs и новые ограниченные session helpers/tests | Найти дисковую authority, проверить external-edit и отмену; предложить минимальный patch. Без изменения core policy и без push в main | NOT_LAUNCHED |
| J-UI | domain/native save state helpers/tests; App.tsx только по lease интегратора | Переходы dirty/saving/saved/cancelled/superseded, identity диалога; не изображать success таймером | NOT_LAUNCHED |
| J-QA | scripts/qa_tauri_* и disposable fixtures, без production write | Независимое воспроизведение одного round-trip и трёх отрицательных сценариев; сохранить оригиналы | NOT_LAUNCHED |
| INT | App.tsx integration, общий IPC/session contract, main | Сложные решения, конфликты владения, review, итоговая публикация | Основной исполнитель |

Один и тот же файл не редактируют одновременно два исполнителя. При недоступных агентах выполнять один bounded slice основным исполнителем, не выдавая его за делегированный или независимо принятый.

## 5. Отдельная короткая очередь UI-дефектов

UI-01: заменить вводящее в заблуждение startup «Сборка: OK» при «PDF: Нет» на честный idle/absent. Тестировать все состояния, не менять success-критерий движка.

UI-02: читаемые select/option для активной темы в реальном WebView. UI-03: убрать перекрытия toolbar на client 1180×680; проверить также 1366×768 и 1024×640. Эти пункты не закрыты текущим PNG и не оправдывают радикальную переделку выбранного дизайна.

Vite advisory warnings и hosted accessibility-bus warning сохранены в insights. Проверка G3 и assistive technologies остаётся отдельной задачей, не выводится из размера bundle или зелёного теста.

## 6. Правило малого блока

На один ответ брать один проверяемый пользовательский маршрут либо завершение одного уже выполненного этапа. Сначала факты и промежуточный source commit, затем проверки, findings и checkpoint. Не зависать на бесконечном polling CI и не обещать работу после ответа. Незавершённые проверки указывать с точным run/source и статусом, не переносить PASS предыдущей версии.
