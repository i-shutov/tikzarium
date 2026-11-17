# Compact Studio: полная перепроверка I61/N5

Дата: 13.11.2026. Интеграция в существующий [draft PR #189](https://github.com/i-shutov/tikzarium/pull/189).

## Исходная точка и задача

Продолжение принятого [scientific mixed-Undo блока](2026-11-13_HOSTED_SCIENTIFIC_WORKFLOW_RU.md), без переноса его SV-001 PASS на другие сценарии. Восстановлены CP05 и точный опубликованный `b1b67a5cbf41ed1c82250a1ff08e1738376f83ab`, root tree `72ef2d0afc20e8f64727943b4351ac0d198d586f`, app/src tree `fe40516186fb1728baceb40d0da137a780c1d9de`. Свежая проверка CP05: ZIP 45 923 460 байт, SHA256 `6d19bf6c9c9bcf5a020dc0555f0a4dd154cfcde83ae875334b7d9bd9103b056d`, CRC и все 300 записей SHA256SUMS совпадают. Main остаётся `0a9831404687296a5467f89e77e873de8cdc5137`.

Полный исходный CI b1: 16 завершённых runs, 14 success и 2 failure (14 PR + 2 push). [I61 43372220004](https://github.com/i-shutov/tikzarium/actions/runs/43372220004) и [N5 43372220192](https://github.com/i-shutov/tikzarium/actions/runs/43372220192) остановились на старом app-tree lease до prerequisites/GUI; новых package/native originals там нет.

## Что меняется

Тесты переводятся на реальную компактную раскладку: desktop 1366×768, client 1180×680, прямые шесть инструментов и верхнее меню. Старые обязательные сценарии сохраняются. Координаты сверяются с production widget probe и должны подтвердиться оригинальными кадрами текущего native run. Одной замены старого SHA или запуска окна для приёмки недостаточно.

- Каждое действие привязано к живому production PID и его окну; проверяются фактический `/proc/PID/exe`, его SHA256 и ожидаемый ELF. Для portable запуска сохраняется отдельный hash `launch.sh`.
- Положение client берётся из абсолютных полей `xwininfo`, затем сверяется фактическая позиция мыши. Убрано зависание stationary-pointer `mousemove --sync`.
- После Open включается полный исходник; свежий clipboard sentinel и полный Copy доказывают, что редактор действительно загрузил нужные байты. Numeric draft проверяется в фактически сфокусированном поле.
- Изменения исходника сверяются побайтно; snapshots, PNG, clipboard, PDF и журналы сохраняются и при отказе.
- N5 повторяет проверки на распакованном release ELF. Отдельный guard проверяет абсолютную геометрию, настоящий display, PID и running ELF для startup и трёх hosted scales.
- Кеш сборки сохраняется после locked build до GUI-проверок. Он не заменяет новую сборку, source-tree lease или запись хешей.
- Историческая упаковка `1.0.0-rc.1` сохраняет формат и проверку воспроизводимости. В README/provenance явно указано: полный Scientific Studio `NOT_ACCEPTED`, `release_go=false`; одного физического Linux R4 для v1.0 недостаточно.

## Обязательный объём

| Проверка | Сохраняемый контракт |
| --- | --- |
| I61 | Scratch Build modal/Cancel; GUI Save; line/rectangle/circle/cubic/arrow/node; source→GUI XeLaTeX→PDF/кириллица/все шрифты; F1; Node draft/Apply/Undo; ручной Ctrl+Z; седьмой жест/Undo; два файла CRLF/opaque; actual Ctrl+O reload; dirty Open/Cancel; caret→radius F1 |
| N2/N3 | Library details/five statuses; Connect/Disconnect/Undo с точным CRLF patch; внешний reload→edit/save; GUI PDF; literal `arro` caret/F1/Complete/Undo; второй GUI PDF |
| N5 | Native release build, детерминированная упаковка/manifest/modes, запуск распакованного launcher, повтор полного I61 и N2/N3 на том же ELF |
| R1 | WM_DELETE_WINDOW и Alt+F4 перехватывают dirty документ; оба Cancel сохраняют исходник; Save сохраняет байты, чистое закрытие завершает процесс |
| R2 | Настоящие hosted X11 geometry/PNG при 1366×768/1.0, 1920×1080/1.25 и /2.0; это не физическая DPI-приёмка |
| R3 | Настоящий DBus/GTK FileChooser: Unicode Open, Cancel, Save As без перезаписи input, GUI build и native PDF Export с точным совпадением PDF и embedded-font proof |
| R5 | Manifest/source/hash/ELF equality для historical RC, повторная сборка архива даёт те же байты; stable/physical acceptance не присваивается |

## Состояние этого checkpoint

Локальная интеграционная проверка: **68 контрактных тестов PASS** (30 compact input/evidence, 4 font, 4 viewport, 3 RC, 7 preview packaging, 20 scientific collector). Formatting, Python compilation, YAML/bash syntax и `git diff --check` проходят. Production crates/extensions/Cargo не изменены; временная layout probe восстановлена в точный исходный Git blob. [Журналы и сводка](assets/2026-11-13-compact-i61-n5/summary.json), [предложения координат](assets/2026-11-13-compact-i61-n5/layout-coordinate-proposals.json), [доказательство восстановления](assets/2026-11-13-compact-i61-n5/layout-restoration.json).

[Независимый static review](assets/2026-11-13-compact-i61-n5/independent-static-review.md) не нашёл оставшихся блокирующих замечаний и повторил 41 затронутый контракт. Обнаруженная при ревью перезапись первого N2 PDF исправлена: оба PDF, соответствующие исходники и фактические GUI XeLaTeX logs сохраняются отдельно. Вывод — готовность к exact-head hosted revalidation, не native приёмка.

**IMPLEMENTED_NOT_VERIFIED:** адаптация и локальные контрактные проверки подготовлены; новые полные hosted runs и независимый просмотр их оригиналов ещё обязательны. Результаты production widget probe — только `UNIT_EVENT` предложения координат. Native PASS здесь до получения и проверки originals не заявлен.

Фактически запущены три субагента с запрошенной конфигурацией `gpt-6.1-sol`, reasoning `high`: `/root/i61_compact_driver_1113b` (I61), `/root/n2_compact_driver_1113b` (N2/N3/R1/R3), `/root/i61_contract_audit_1113b` (независимый контрактный аудит, временная geometry probe и review). Root владеет workflows, provenance, интеграцией и публикацией. Это идентификаторы реально запущенных задач; внутренняя реализация модели отдельно не наблюдалась.

Следующая исполнимая задача: опубликовать проверенную адаптацию с exact-head lease, выполнить собственные полные I61/N5, проверить original source/image/PDF/ELF evidence и зафиксировать конкретные PASS/FAIL. Physical Win10 W0–W4/IME/96–120–192 DPI, G3 и полный ST-SCI остаются отдельными обязательными gates. **Draft; merge/stable/release GO не выданы.**
