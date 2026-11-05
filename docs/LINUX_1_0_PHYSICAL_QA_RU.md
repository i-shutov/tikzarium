# TikZarium Linux 1.0 — физическая desktop-приёмка R4

**Статус 2026-11-05: NOT_RUN.** Канонический реестр — https://github.com/i-shutov/tikzarium/issues/103 (последнее сообщение важнее исторического body). Hosted Ubuntu/Xvfb/Openbox подтвердил R1/R2/R3 на работающем GUI и GTK/XDG portal, но это НЕ монитор, драйвер и пользовательский TeX Live. CI PASS не является физическим R4.

## Цель
Один фактически наблюдаемый Ubuntu 24.04 x86_64 / X11 / физический монитор, установленный пользователем TeX Live/XeLaTeX, TikZ/PGF, Poppler, шрифты, XDG/GTK portal. Отдельные Win10/MiKTeX, macOS ARM, Wayland и другие дистрибутивы не являются первым release gate.

## Протокол
1. Записать дату/оператора, исходный commit SHA, архивный SHA256, app ELF SHA256, ОС (cat /etc/os-release, uname -m), X11 session ($XDG_SESSION_TYPE, $DISPLAY), WM/DE/монитор/драйвер, фактические xrandr --query и xdpyinfo. Масштаб 200% в Xvfb НЕ считается реальной HiDPI-приёмкой.
2. Записать внешние xelatex --version, pdftoppm -v, pdfinfo -v, pdffonts -v, pdftotext -v, fc-match DejaVu Serif и работоспособность XDG portal. ПО ничего не устанавливает.
3. Сверить опубликованный rc-archive.sha256, извлечь точный релиз-кандидат, выполнить sha256sum -c MANIFEST.sha256 и ./tikzarium-cli doctor до запуска.
4. Из отдельной записываемой папки с кириллицей и пробелами вызвать полный путь к launch.sh. Подтвердить читаемость source/canvas/inspector/help/status на реально доступных разрешениях и масштабах; неподдерживаемые физически случаи отметить NOT_RUN.
5. Выполнить все шесть мышиных line/arrow/rectangle/circle/node/Bézier, прочитать обычный .tex рядом с canvas, F1, Properties, Libraries Connect/Disconnect, пять состояний, Undo, CRLF/opaque/comments.
6. Нажать native XDG Open → Cancel → Open для Unicode/CRLF .tex; native Save As в новое имя, отказ перезаписывать чужой существующий файл. Ручной typed path не подменяет picker.
7. Выполнить Build через внешний XeLaTeX и native PDF Export, проверить извлечённую кириллицу pdftotext, встраивание fonts pdffonts и совпадение итогового PDF. Проверить ошибки отсутствующих внешних prerequisites.
8. Изменить .tex и закрыть через X11 WM/Alt+F4: Cancel/Save/Discard, неуспешная запись в занятый путь; после повторного запуска данные соответствуют решению.
9. Сохранить оригинальные PNG физического desktop (включая native picker), .tex, PDF, log, версии ПО, SHA256 каждого артефакта; не публиковать личные файлы/ключи.
10. Привязать результат к точному RC ELF/source/архиву в issue #103. Отделить physical и hosted evidence.

**R4 PASS** только при отсутствии критических дефектов исходника/PDF/сохранения/диалогов/перекрытия обязательного UI. Если физическая машина недоступна — R4 NOT_RUN и финальный 1.0 tag запрещён. Наличие versioned RC не меняет этот статус.
