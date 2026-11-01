# I53 — независимый реальный X11 сценарий B38

Base PR #81 HEAD `628d48ea3ccf4e53f9ea95096803e52e1f531525`; app/src tree `c0e45c3445f25f365ca7ac4a2985b9a4261b7373`. QA branch не меняет production Rust и существующую I06 ветку.

Строгая вертикаль: настоящее окно egui/Linux/X11 → пользовательская вставка исходника через X11 clipboard → GUI Save → раскрыть N2 library panel и конкретную запись positioning, снять read-only before/after → click Connect → GUI Save → byte-exact проверка одной `\\usetikzlibrary{positioning}` → GUI Build/Export внешним XeLaTeX → PDF с кириллицей и встроенными шрифтами → Disconnect → GUI Save исходных байт → Undo → сохранение восстановленного импорта. QA не пишет и не исправляет итоговый source вручную, сохраняет скриншоты и хеши даже при ошибке. Координаты **не откалиброваны**; результат по умолчанию NOT_RUN и только реальные GUI-артефакты + визуальный просмотр дают PASS.

Сценарий использует Linux/TeX Live: не заменяет hosted MiKTeX, физические Win10 или Mac M1/M4 (NOT_RUN). CRLF уже проверено в отдельной I46 и C/N2 приёмке, данный clipboard fixture LF. Принимать в B38 только после точного QA HEAD и screenshot/PDF/hash ревью. Затем заново полные #81 HEAD CI, merge с expected_head_sha и отдельно push CI на новом main.
