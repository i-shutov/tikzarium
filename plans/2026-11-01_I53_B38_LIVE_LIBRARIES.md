# I53 — независимый реальный X11 сценарий B38

Base PR #81 HEAD `628d48ea3ccf4e53f9ea95096803e52e1f531525`; app/src tree `c0e45c3445f25f365ca7ac4a2985b9a4261b7373`. QA branch не меняет production Rust и существующую I06 ветку.

Строгая вертикаль: настоящее окно egui/Linux/X11 → пользовательская вставка исходника через X11 clipboard → GUI Save → раскрыть N2 library panel и конкретную запись positioning, снять read-only before/after → click Connect → GUI Save → byte-exact проверка одной `\\usetikzlibrary{positioning}` → GUI Build/Export внешним XeLaTeX → PDF с кириллицей и встроенными шрифтами → Disconnect → GUI Save исходных байт → Undo → сохранение восстановленного импорта. QA не пишет и не исправляет итоговый source вручную, сохраняет скриншоты и хеши даже при ошибке. Координаты **не откалиброваны**; результат по умолчанию NOT_RUN и только реальные GUI-артефакты + визуальный просмотр дают PASS.

Сценарий использует Linux/TeX Live: не заменяет hosted MiKTeX, физические Win10 или Mac M1/M4 (NOT_RUN). CRLF уже проверено в отдельной I46 и C/N2 приёмке, данный clipboard fixture LF. Принимать в B38 только после точного QA HEAD и screenshot/PDF/hash ревью. Затем заново полные #81 HEAD CI, merge с expected_head_sha и отдельно push CI на новом main.

## I53/B39 · согласование независимой QA-ветки с производственным B39

QA интегрируется поверх точного #81 B39 HEAD `42c21c693b1f1998f59d6bfe7f5d2e10313ccd90` / дерева `crates/tikzarium-app/src` `0ebdd9e123dda4ea18024150cf284c905badcdb6`. Историю I53 сохраняем дополнительным родительским коммитом; B-owned production не меняется.

В B39 строка `positioning` остаётся раскрытой после Connect благодаря стабильному egui ID. Обязательное повторное нажатие по строке из B38 удалено (в B39 оно её закрыло бы). Кнопка Disconnect из реального старого X11 кадра находилась около x1109–1299/y573–603; точка [1190,584] — **кандидат**, не подтверждённая B39 калибровка.

Добавлены два настоящих `Ctrl+O` в окне egui: отдельный сохранённый файл с контрольным комментарием и повторное открытие исходного подключённого документа. Проверяется полный UTF-8 текст из GUI `TextEdit` через X11 clipboard с предустановленным sentinel, обе неизменные копии на диске и хеш ранее скомпилированного XeLaTeX PDF. Простое сравнение `read_bytes()` без Open не считается приёмкой.

Новые exact-HEAD workflows, ручной просмотр B39 X11 скриншотов и артефактов: **NOT_RUN** до результата нового CI. N3 реальный GUI-поиск также **NOT_RUN**. Этот Linux/X11 прогон не заменяет физические Win10/MiKTeX и macOS M1/M4/XeLaTeX.

## I53/B39 QA run 9b732ccf027d8b76ef484141f9d79aea668ab55f — observed X11 Save timing defect

Actual CI [41359783212](https://github.com/i-shutov/tikzarium/actions/runs/41359783212) passed exact B39 tree, offline negative tests and Cargo build, but **failed BEFORE Connect** at `Timeout: GUI initial Save`. Screenshot `failure.png` and report prove that GUI saved `library-connect.t` rather than `library-connect.tex`; the X11 test typed the path using `xdotool type --delay 3` then immediately clicked Save. This is an observed test-driver input race, **not evidence of failed library actions**. The profile and production code were unchanged. Replacement uses clipboard paste into native egui Path field plus Ctrl+A/C readback of the exact full UTF-8 pathname before Save or Ctrl+O; unit negative case rejects truncated `.t` and extra bytes. New exact-head GUI CI and screenshot acceptance **NOT_RUN until complete**.