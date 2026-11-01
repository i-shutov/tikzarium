# I50 / D06 — журнал независимого разбора MiKTeX rerun-артефактов

Дата: 2026-11-01. База: main `16ef4fc`; B35 #75 `041a229a5f548e7be66c9e98ef827faf5fa5a58b`; GitHub Actions [run 41315329378](https://github.com/i-shutov/tikzarium/actions/runs/41315329378).

## Что действительно проверено до разработки

- GitHub job attempt 4 `124875701909`: **SUCCESS**, реальный Windows Server 2022 + приватно установленный MiKTeX 25.12. Linux job `124876713686`: **FAIL** до собственного аудита, ибо `download-artifact` выбрал старую попытку 1.
- В логах Linux: имя `qa-miktex-windows-server` разрешилось в artifact **13087620037**, 265 байт. Для реального Windows PASS есть artifact **13087296791**, 212261 байт, ZIP SHA-256 `f240aa8d2e3daea6c13ff22cd958254e6afe1279c2da104be6ac99bdbe9104b0`.
- Независимо загруженный artifact 13087296791: ZIP CRC **PASS**, 47 файлов, `setup-stage.json.status=SETUP_COMPLETE`, `miktex-qa.json.source_head_sha=041a229a...`, `commit_sha=6c56d54bfa4bc8a6a1ff514238910853f8a24089`, пакеты до/после идентичны по байтам. Шесть PDF повторно прочитаны локальным Poppler: по 1 странице, Cyrillic/Greek text и embedded DejaVuSerif/LatinModernMath. Авторский документ и native Session оба сформировали действительный TeX/PDF.
- На этом основании **HOSTED_WINDOWS_PRODUCER_PASS**, **INDEPENDENT_UPLOADED_PDF_AUDIT_NOT_RUN due to wrong artifact selection**. Весь D06 workflow не PASS; пользовательские Win10/Mac **NOT_RUN**.

## Оценённые варианты

- Только `github.run_attempt` для имени: даёт разные ZIP, но **ломает** независимый Linux-only rerun после успеха Windows, поскольку новый attempt не создаёт Windows producer.
- Старое одинаковое имя без перезаписи: выбор первой устаревшей попытки уже воспроизведён.
- Принято: `github.run_id` как неизменная аренда внутри workflow плюс `overwrite: true` у трёх загрузок; проверка строго того же имени в Linux. Старые версии артефактов при retry удаляются, но журналы всех попыток и отчёт о результате сохраняются в истории GitHub Actions. Это осознанный компромисс ради однозначного, не устаревшего источника доказательств.

## Регрессии и оставшиеся риски

Новый `test_qa_miktex_artifact_lease.py` использует только stdlib, парсит реальные имена action-steps, выполняет четыре отрицательных мутации и должен запускаться в обоих hosted jobs. Из-за отсутствия локального GitHub Actions / Windows MiKTeX в интеграторском runtime **live rerun на новом контракте NOT_RUN** до нового PR CI. Полную приёмку проводим по exact-HEAD + артефактам, не по зелёному статусу отдельного Windows job.

Изоляция: только workflow/test/plans/insights/CHANGELOG, без prod B и C; отдельное безопасное изменение в D. Открытый B35 #75 остаётся draft до устранения CI gate и интеграции.
