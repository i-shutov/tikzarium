# Compact Studio: полные I61/N5 приняты в hosted Linux

Дата: 13.11.2026. Рабочая ветка: `feat/studio-scientific-integration-20261112`, существующий [draft PR #189](https://github.com/i-shutov/tikzarium/pull/189).

**INDEPENDENTLY_ACCEPTED — полный заявленный hosted Linux/X11 объём I61, N2/N3 и N5 с R1/R2/R3/R5.** На проверенном source commit `fa9f8d9c9bd4d7365dbc6f927fb247d0d945c33d` завершились **все 15 workflows: 15 success, 0 failure, 0 pending**. Получены оригинальные артефакты обоих native runs; независимый reviewer и интегратор сверили исходники, действия, снимки, GUI-журналы, PDF и идентичность исполняемых файлов. Это завершает блок адаптации, обозначенный следующим после CP05.

Приёмка относится к Linux/Xvfb/Openbox и фактически выполненным операциям. Physical Win10 W0–W4/IME/96–120–192 DPI, physical Linux/macOS, G3 и полный Scientific Studio остаются отдельными gates. PR остаётся draft; merge/stable/release GO не выданы.

## Точная идентичность результата

| Объект | Проверенное значение |
| --- | --- |
| Source commit приёмки | `fa9f8d9c9bd4d7365dbc6f927fb247d0d945c33d` |
| Root tree этого source | `e0e1f9060a41199ad8135ddb567f51e1e498397a` |
| Production app/src tree | `fe40516186fb1728baceb40d0da137a780c1d9de` |
| Debug production ELF SHA256 | `55c5424932f3e8581cd4ab7d2ea848bb1a398d457880074cb92bddcf2d2eaf15` |
| Release production ELF SHA256 | `eade89ecbbfd2301e0a12c061ef9fb62b7c0f1b962727e3643dd0209a88b1bcb` |
| Release CLI SHA256 | `8d2df1cdb13a39fa63d55646192d170a1b91fc978e3434384172b2ce3ca11384` |
| Main при проверке | `0a9831404687296a5467f89e77e873de8cdc5137`, без изменений |

Production Rust/crates, extensions и Cargo inputs этим блоком не изменялись. Исправлены QA-драйверы, их проверки, workflows, сведения об упаковке и доказательства. После временных UNIT geometry probes исходный Rust test file восстановлен до Git blob `701c23500f2d014ba6c7ba1075c55b4d2dd7ba7d`, SHA256 `3382d3db4d86f7550b22c382e13607b3b9ab912397509f35f4b238915911ebca`. Последующая публикация этого отчёта является отдельным documentary head; source приёмки и его оригиналы закреплены здесь явно.

Среда основного native сценария: desktop **1366×768**, client **1180×680**, тема Midnight. Наблюдались настоящие production PID, активное окно, absolute client geometry из `xwininfo` и фактический `/proc/PID/exe`. Сборки выполнены locked Rust **1.91.0**; GUI запускал внешний **XeTeX 0.999995, TeX Live 2023/Debian** на disposable hosted runner. Установка TeX пользователю или изменение его Windows-системы не выполнялись.

## Полный принятый объём

| Блок | Проверенное поведение |
| --- | --- |
| I61: создание | Native Paste и полный clipboard readback; Scratch Build показывает настоящий Save+Build modal, Escape отменяет его без записи файла; GUI Save сохраняет точные байты. Line, rectangle, circle, cubic, arrow и node создаются шестью реальными жестами, по одному source owner на инструмент. Исходные макросы и кириллица сохраняются. |
| I61: PDF | Сборка выполняется через GUI XeLaTeX. Оригинальный PDF содержит шесть фигур и «Не менять», одну страницу и встроенный DejaVu Serif с ToUnicode. Скопирован настоящий Raw build log из Console. |
| I61: Inspector и история | Сначала доказано старое значение именно X — `10.25cm`, затем draft `10.50cm`. Save до Apply не меняет source. Apply меняет только X в native-команде и соответствующих metadata; общий Undo возвращает исходные байты. Ручной Ctrl+Z и Undo седьмого жеста тоже восстанавливают точный исходник. |
| I61: документы и Help | F1 переключает Properties → Help → Properties. Второй CRLF/opaque файл открывается, редактируется и сохраняется без нормализации. Настоящий Ctrl+O загружает внешнюю ревизию, подтверждённую новым clipboard readback; dirty Open → Cancel сохраняет правку. В третьем файле F1 на `radius=8mm` показывает именно справку по радиусу, не меняя source. |
| N2: библиотеки | На original PNG видны пять независимых статусов installed / project-loaded / engine-target / tool-implemented / help. Connect добавляет ровно один import, Disconnect удаляет именно его, общий Undo восстанавливает подключение. Внешний reload и GUI append/Save подтверждены байтами редактора и файла. |
| N3: completion | Native редактор заменяет только имя `arrows.meta` на `arro`. Свежий clipboard доказывает выделенные четыре байта; F1 открывает соответствующую справку, Complete возвращает имя минимальным patch. Повторный GUI Build создаёт отдельный PDF; общий Undo возвращает точный prefix source. |
| N5 | Полный I61 и N2/N3 повторены через распакованный `launch.sh` на release ELF. Наблюдаемый исполняемый файл процесса совпадает с ELF в manifest; hash одного launcher не используется как замена этому доказательству. |
| R1 | Dirty WM close и Alt+F4 перехвачены. Оба Cancel сохраняют все 486 байт исходника; обычный Save пишет те же байты, чистое закрытие завершает процесс с кодом 0. |
| R2 | Три оригинальных desktop PNG и actual geometry подтверждают видимый интерфейс при 1366×768/1.0, 1920×1080/1.25 и 1920×1080/2.0. При 2.0 client ограничен 1886×1023 внутри экрана. Это hosted scale/geometry, не physical DPI. |
| R3 | Четыре настоящих GTK portal dialogs с отдельными OS window IDs: Open, Cancel, Save As, PDF Export. Пути содержат кириллицу и пробелы; исходные 221 байт/9 CRLF сохранены, новый файл содержит ровно 243 байта — исходник плюс 22-байтовый marker. Native Export побайтно совпадает с текущим GUI-built PDF. |
| R5 | Preview и historical RC содержат тот же GUI-tested ELF, CLI и launcher. Проверены все manifest hashes, executable modes и ELF64 x86_64. Независимая повторная упаковка обоих архивов дала точно те же `.tar.gz` байты. |

Для N2/N3 отдельно сохранены оба PDF, оба build-source и оба реальных GUI XeLaTeX log. Проверенная последовательность размеров source: **295 → 325 → 295 → 325 → 334 → 360 → 353 → 360 → 353 байта** — исходный файл, Connect, Disconnect, Undo, внешний reload, GUI append, prefix, Complete и Undo. CRLF и непричастные байты сохранены во всех соответствующих состояниях.

Во всех **семи** проверенных PDF обычной и переносимой сборок — одна страница, встроенный DejaVu Serif и корректная кириллица. Независимый Poppler render дал три ожидаемые группы одинаковых изображений: шесть фигур, «Фигура» и R3 canary. Совпадение изображений первого/второго N2 PDF ожидаемо: завершение import не меняет сам рисунок. Отдельные PDF и их provenance сохранены.

## Оригиналы и независимая проверка

| Native run | Original artifact | Размер ZIP | SHA256 ZIP |
| --- | --- | ---: | --- |
| [I61/N2/N3 43388892327](https://github.com/i-shutov/tikzarium/actions/runs/43388892327) | `14020396373` | 21 833 659 | `84c4fed17e97d71d7121074caaca2d5410ceaaa812213bf0b5a8249a71661b80` |
| [N5 43388892262](https://github.com/i-shutov/tikzarium/actions/runs/43388892262) | `14020476697` | 40 361 562 | `0d77eb532e7bd75adf92cea41a08c33502668ab1107cceb6c9416140a2a760e0` |

Оба ZIP проверены по API digest, размеру и CRC. Полные неизменённые ZIP, неудачные попытки, job logs, snapshots и source recovery входят в CP06. В Git опубликован компактный набор исходных свидетельств с [provenance manifest](assets/2026-11-13-compact-i61-n5/accepted-fa9/provenance-manifest.json), original run/path и SHA каждого файла.

Авторитетные отдельные заключения: [полный I61/N2/N3](assets/2026-11-13-compact-i61-n5/accepted-fa9/reviews/43388892327/independent-original-audit.json), [полный packaged N5/R1/R2/R3/R5](assets/2026-11-13-compact-i61-n5/accepted-fa9/reviews/43388892262/independent-original-audit.json). Каждый source/PDF аудит выполнил 46 проверок; package/native/reproducibility аудит — 159. Это проверки доказательств, а не заявленное количество продуктовых сценариев.

Исходные автоматические `report.json` оставлены неизменными: их поля `manual_review=NOT_RUN` описывают состояние во время CI. Последующая ручная приёмка записана в отдельных audit JSON. Необязательный toolbar fallback не выполнялся, поскольку обязательный Ctrl+O прошёл; Library contract проверен отдельным N2, поэтому legacy-поле I61 `library_inspector=NOT_RUN` не заменялось вымышленным PASS.

[Все 15 завершённых workflows](assets/2026-11-13-compact-i61-n5/accepted-fa9/ci/final-summary-root-fa9.json) охватывают 14 PR runs и один push run, включая основной Rust CI, D QA, Windows jobs, scientific mixed Undo, fonts, I61 и N5. Первоначальные 68 локальных контрактов и static preflight сохранены в [отчёте адаптации](2026-11-13_COMPACT_I61_N5_REVALIDATION_RU.md). После исправлений root и независимый reviewer повторили **34 compact contracts: 34 PASS**; четыре новых регрессии добавлены по реально найденным отказам. Production inputs не менялись, formatting/compilation/diff проверки проходят.

## Что исправлено по первым отказам

| Candidate | Полный CI | Подтверждённый результат |
| --- | --- | --- |
| `27923bc2` | 14 success / 2 failure / 16 runs | Full-source toggle попадал в строку размера кода: copied source содержал 130 лишних байт quickstart. Exact guard отклонил его. N2/R1/R3 остановились на Python collision аргумента `kind`. Пакет/startup/R2 subsets сохранены. D06 network timeout attempt 1 и успешный attempt 2 сохранены отдельно. |
| `9126f9bf` | 13 success / 2 failure / 15 runs | Уже прошли шесть инструментов/PDF/F1 и самостоятельные hosted R1/R3. После расширения Inspector прежняя координата попадала в Y, Apply — в текст статуса; прежний Connect открывал соседнюю группу. Source guards снова остановили полный сценарий. |
| `fa9f8d9c` | **15 success / 0 failure / 15 runs** | Координаты сверены с оригиналами; перед draft проверяется первоначальное значение X. Отдельные кадры показывают все пять library statuses. Полные debug и packaged сценарии прошли и независимо приняты. |

Startup event теперь передаёт metadata как вложенный `report`, устраняя collision без потери provenance. Негативные проверки отвергают folded-editor prefix, неверное исходное поле и неприменённый ввод. Исходный объём I61/N2/N3/R1/R2/R3/R5 не сокращён; критерии source/PDF/Undo не заменены одним startup или сменой tree pin.

## Пакет, восстановление и следующая задача

Original preview archive SHA256: `256d528f5b1d2b9f5c686506270cd795f5996fa49fc28cf0d92ec706af17ccf9`. Historical `Tikzarium-linux-x86_64-1.0.0-rc.1.tar.gz`: `4263d5a5284cddb2d092954306c95e22d982188a3b7f4d3d0b8d574c13387c5f`. Его [attestation](assets/2026-11-13-compact-i61-n5/accepted-fa9/n5/rc-attestation.json) явно содержит `scientific_studio_scope=NOT_ACCEPTED` и `release_go=false`. Версия/tag/stable publication не создавались; это принятая hosted проверка существующего формата упаковки.

[CP06 восстановления](https://drive.google.com/file/d/1c8AqOBGfIgmyjuYgrx2AxaUhqoEa-kBF/view) содержит exact source archive, blob/mode manifest, patch из CP05/b1, все попытки и отдельный текущий `RECOVERY.json`. Финальный documentary commit, внешний ZIP SHA и результат повторного скачивания фиксируются интегратором после публикации, чтобы не создавать циклический hash внутри самого архива. Предыдущий CP05 сохранён: 45 923 460 байт, SHA256 `6d19bf6c9c9bcf5a020dc0555f0a4dd154cfcde83ae875334b7d9bd9103b056d`, CRC и все 300 внутренних SHA повторно проверены.

Работали три фактически запущенные задачи с запрошенной конфигурацией `gpt-6.1-sol`, reasoning `high`: `/root/i61_compact_driver_1113b`, `/root/n2_compact_driver_1113b`, `/root/i61_contract_audit_1113b`. Драйверы разделены по владельцам, независимый reviewer не менял их; root выполнил интеграцию и публикацию. Backend-реализация модели отдельно не наблюдалась.

**Следующая исполнимая задача по V2:** полный native PGFPlots SC3/AT4 маршрут `axis/addplot → Inspector Apply → общий Undo → Save/reopen → GUI XeLaTeX → current PDF`, с сохранением `.dat/.csv` dependencies и отдельной пооперационной приёмкой. CP05 SV-001 и текущие шесть примитивов не заменяют этот объём. G3, весь SCI142/103 и scientific AI88, physical Win10/IME/DPI, Asymptote и затем Typst/CeTZ остаются в принятом научном плане; Data Figure и следующие домены не активированы.
