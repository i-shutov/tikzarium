# I50 / D06 — аренда доказательств MiKTeX на один workflow run (2026-11-01)

## Источник истины

Принятый main на старте: `16ef4fcdc6c8aa886a4f8ae23165f6c7168271e5`; независимый egui draft B35 [#75](https://github.com/i-shutov/tikzarium/pull/75) на `041a229a5f548e7be66c9e98ef827faf5fa5a58b`. Ветка I50 только D/CI, не меняет B `main.rs`, C catalogue, TeX-документы, движок или установщик.

## Реальный сбой, а не предполагаемая угроза

На [D06 run 41315329378](https://github.com/i-shutov/tikzarium/actions/runs/41315329378) было четыре попытки. В попытках 1–3 Windows Server 2022 не закончил приватную загрузку/refresh реестра пакетов MiKTeX, Linux audit пропускался. В попытке 4 Windows job `124875701909` реально **PASS**: отдельный MiKTeX, `--disable-installer`, `packages-before.txt == packages-after.txt`, Rust CLI/N1, четыре положительных и отрицательных типа проверки, шесть PDF. Готовый Windows artifact **13087296791** (212261 байт ZIP, SHA-256 `f240aa8d2e3daea6c13ff22cd958254e6afe1279c2da104be6ac99bdbe9104b0`).

Но независимый Ubuntu job `124876713686` **FAIL**, поскольку `actions/download-artifact` по одинаковому имени `qa-miktex-windows-server` выбрал **13087620037** (265 байт, попытка 1). Поэтому `setup.json` отсутствует и `RealEvidenceTamper.setUpClass` завершается `FileNotFoundError`. Не путать это с ошибкой компиляции MiKTeX или действительным отрицательным PDF-аудитом.

## Контракт исправления

1. Дать producer и consumer одно имя `qa-miktex-windows-server-${{ github.run_id }}`. Идентификатор run сохраняется при rerun; не использовать `run_attempt`, иначе audit-only rerun не найдёт уже успешный Windows producer.
2. `actions/upload-artifact` применяет **`overwrite: true`**, чтобы свежая попытка заменила предыдущий artifact в том же run. `qa-lock-miktex-windows-server` и `qa-miktex-independent-postupload` получают аналогичную политику.
3. Linux consumer получает **то же строгое имя**, без широкого поиска по старым попыткам, без fallback на другой workflow. Отчёты `qa_miktex_uploaded.py` по-прежнему сверяют source SHA, synthetic merge checkout SHA, реальный MiKTeX, содержимое PDF/font/text и source bytes.
4. Новый stdlib unittest выполняется на Windows и Linux; отрицательные мутации запрещают потерю `overwrite`, неуникальное имя, `run_attempt` и иной download target.

## Приёмка

- CI точного head I50: Windows setup + шесть PDF + неизменный inventory, Ubuntu реальная повторная проверка **загруженного** ZIP, журналы/артефакты, успешные Python tests. Проверить не только зелёный статус, но выбранный artifact id/размер, setup.json, PDF и Unicode.
- После самостоятельной приёмки D интегрировать в main с `expected_head_sha`, запустить и проверить **отдельный** post-merge CI. Только затем обновить/перебазировать #75 и повторить exact-head CI + real X11 acceptance, не утверждая физической Win10/macOS приёмки.
- Отдельные физические Windows 10 x64/MiKTeX и Mac ARM M1/M4/XeLaTeX: **NOT_RUN**. Headless Session не является GUI. Старые B ветки не переносить поверх N1.
