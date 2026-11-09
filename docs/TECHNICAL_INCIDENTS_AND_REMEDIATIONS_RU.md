# TikZarium — технические проблемы и способы решения

> **2026-11-08 — C13 уточнён:** PR #131 не снял physical W2 (run #42414339864,
> `OWNED_QUEUE_DID_NOT_GAIN_FOREGROUND`). Найдены синхронный discovery в GUI,
> неограниченный `Command::output` и возможные console HWND дочерних probes.
> Кандидат устраняет эти дефекты и заменяет AttachThreadInput на bounded WM_NULL
> handshake; его достаточность для физического W2 ещё требует оригинального
> результата. [План и проверяемые пределы](../plans/2026-11-08_W2_RESPONSIVE_STARTUP.md).
> Все 79 исторических записей ниже сохранены; прежние «кандидаты» не означают PASS.


**Сводный журнал, 7 ноября 2026. Windows 1.0 release-first.** Этот документ агрегирует все установленные **классы** проблем по исходным CHANGELOG, планам, QA-исследованиям и релизным задачам. Сотни индивидуальных журналов и инцидентов по коммитам остаются в [CHANGELOG](../CHANGELOG.md), [plans](../plans/) и [insights](../insights/); ссылки на первоисточники сохранены. Исторические статусы CANDIDATE и NOT_RUN не означают актуальный дефект. Даты и состояния здесь привязаны к указанному SHA, не к любому будущему release.

**Проверенная база:** main **4b79d71a05dfc1a116d67c040d21b8502ad7fc3e**, успешные [CI #42382400325](https://github.com/i-shutov/tikzarium/actions/runs/42382400325), [D QA #42382400221](https://github.com/i-shutov/tikzarium/actions/runs/42382400221), [Administrator #42382400251](https://github.com/i-shutov/tikzarium/actions/runs/42382400251). Серверный W1 PASS, W2 в [Actions #42382753629](https://github.com/i-shutov/tikzarium/actions/runs/42382753629) имеет статус BLOCKED_FOREGROUND_NOT_OWNED, не W2 PASS. Исходный [artifact #13579401001](https://github.com/i-shutov/tikzarium/actions/runs/42382753629/artifacts/13579401001) SHA256 ZIP 2ed2dd579fb3fbcaa0b2f4ff0fedc331cb75d7e6fde3a8274aeca88c7c8b1f01, WTSActive/WindowStation/Default, native GUI PID4060, окно 1194×718 @125%, клиентские PNG и F1 NOT_RUN.

**Легенда:** ИСПРАВЛЕНО означает проверенную инженерную корректировку, но не автоматически физический Windows 10 PASS; QA-ONLY означает только тестовый обход, не поставку в ZIP; КАНДИДАТ требует нового exact-head и физического доказательства; NOT_RUN означает отсутствие результата, а не FAIL. Поправка владельца 2026-11-06 отменяет историческое требование отдельного не-администратора или запрета HIGH текущему пользователю. Сохраняются warning, offline/no-shell-escape и отсутствие OS sandbox.

## A. Сборка, GitHub Actions, среды и артефакты

| ID | Наблюдавшаяся проблема / причина | Решение и ограничение | Статус / свидетельство |
| --- | --- | --- | --- |
| A01 | В Windows runner не виден установленный Git в PATH. | Read-only поиск git.exe в Program Files и временный PATH лишь для job; не устанавливать Git повторно. | ИСПРАВЛЕНО; qa-selfhosted-winserver.yml |
| A02 | Cargo/Rust объявляли отсутствующим, хотя они были в профиле существующего Administrator. | Проверить USERPROFILE/.cargo/bin и версии, запустить existing cargo с --locked; не устанавливать toolchain автоматически. | ИСПРАВЛЕНО; insights/2026-11-06_CARGO_MIKTEX_NATIVE_DIAGNOSIS.md |
| A03 | Ошибка вызова несуществующего/непроверенного python.exe ошибочно диагностировалась как дефект CRT и Cargo. | Замена на native PS5.1/.NET PE32+ parser, проверка импортов и реальный запуск CLI; исходные серверные EXE на самом деле PASS. | ИСПРАВЛЕНО; insights/2026-11-06_OWNER_ADMIN_FALSE_BLOCKERS.md |
| A04 | Windows GUI был собран как Console subsystem 3, консоль запускалась вместе с GUI. | windows_subsystem=windows для release app PE subsystem 2; CLI остаётся subsystem 3. Проверить точные байты и исходную сборку. | W0 PASS; CI #42382400325 |
| A05 | Исходный Windows ZIP импортировал VCRUNTIME140.dll, отсутствовавший в архиве. | Windows MSVC CRT-static и независимый PE import/delay-import parser, reject VCRUNTIME и MSVCP. | ИСПРАВЛЕНО для текущих native EXE; insights/2026-11-06_WINDOWS_X64_CRT_DEPENDENCY_QA.md |
| A06 | Python сортировал SHA-manifest ordinal, а PowerShell locale-dependent Sort-Object отклонял настоящий пакет. | Ordinal comparison и тесты на подлинных и испорченных ZIP; SHA оригинальных EXE и манифеста сравнивать независимо. | ИСПРАВЛЕНО; PR #110, CHANGELOG |
| A07 | Консоль CP1252/ANSI ломала сопоставление Unicode-stdout и статуса Windows CLI. | Отделить байты stdout, stderr, exit code и декодирование; Unicode в PDF проверять pdftotext UTF-8. | ИСПРАВЛЕНО на тестах; CHANGELOG 2026-11-05 |
| A08 | PowerShell относительный .qa-artifacts path ломался после Push-Location в staged release. | Канонизировать output, executable и working directory до Push-Location; regression реального CLI из Unicode/space path. | ИСПРАВЛЕНО; CHANGELOG 2026-11-06 |
| A09 | PowerShell 5.1 смешивал native stderr (предупреждение) и ошибку и давал false failure при exit 0. | Отдельный bounded native_process.ps1, возврат исходного exit code, оригинальные stdout/stderr без неверной классификации. | ИСПРАВЛЕНО; plans/2026-11-06_OWNER_ADMIN_BLOCKER_CORRECTION.md |
| A10 | Успешный XeLaTeX содержал предупреждения Administrator в stderr, но GUI/CLI журнал их терял. | Сохранять stderr даже при успешном exit=0; предупреждение не равно TeXFailure. | ИСПРАВЛЕНО; PR #123, insights/2026-11-07_WINDOWS_XELATEX_SUCCESS_STDERR_EVIDENCE.md |
| A11 | PS5.1 использовал неподходящий overload AppendAllLines при настройке CI Mesa. | AppendAllText с явной кодировкой UTF-8 без BOM, никакой системной настройки окружения. | ИСПРАВЛЕНО; hosted #42361805938 |
| A12 | SelfTest PowerShell ошибочно оценивался по устаревшему LASTEXITCODE другого native процесса. | Реальные terminating assertions и явная проверка ответов, не stale LASTEXITCODE; отрицательные тесты. | ИСПРАВЛЕНО; PR #124 |
| A13 | Test fixture сохранял JSON под чужим basename, вызывая ложный FileNotFoundError. | Согласовать имя артефакта и независимый auditor; проверять ожидаемые paths. | ИСПРАВЛЕНО; PR #124 |
| A14 | Rustfmt/clippy остановил PR при работающем коде из-за форматирования. | Точное rustfmt исправление, новый HEAD и полный повтор CI; не считать старый зелёный run действительным. | ИСПРАВЛЕНО в соответствующих PR; CHANGELOG |
| A15 | GitHub job failed в финализации/загрузке, хотя отдельные steps были зелёными. | Требовать completed SUCCESS для всего workflow и точного attempt, исходный ZIP и SHA проверить независимо. | ОБЯЗАТЕЛЬНАЯ ПОЛИТИКА; CI #42147933151 attempt 2 |
| A16 | Несколько серверных Actions запускались одновременно, часть skipped/cancelled. | Trusted current-main + serial concurrency и cancel-in-progress=false; квалифицировать конкретный run/attempt, не пропущенную задачу. | ИСПРАВЛЕНО; qa-selfhosted-winserver.yml |
| A17 | Дрейф source SHA/GUI-tree между PR и I61/N5 приводил к fail-closed до UI. | Перепривязать APP_TREE к фактическому git tree после UX-изменения, сохранив exact-head/provenance gate. | ОБЯЗАТЕЛЬНАЯ ПОЛИТИКА; PR #128 |
| A18 | Медленный Azure apt mirror и гонка старта Openbox давали ложный NO_VISIBLE_WINDOW. | Bounded apt retries/timeout, временный CI mirror и ожидание готовности Window Manager с отдельными Xvfb/process logs. | ДИАГНОСТИРОВАНО; insights/2026-11-06_OWNER_ADMIN_FALSE_BLOCKERS.md |
| A19 | Портативный ZIP/EXE собирались из разных артефактов или менялись после проверки. | CRC + MANIFEST.sha256 + PROVENANCE.json, PE2/PE3, SHA EXE побайтово равен исходному native, реальный запуск extracted CLI. | W0 PASS; CI #42382400325 |
| A20 | Cargo.lock/инструментальная цепочка могли не совпадать между CI и сборкой. | Tracked Cargo.lock, Rust 1.91, cargo --locked, исходный commit SHA и контроль зависимостей на всех платформах. | ИСПРАВЛЕНО; plans/2026-11-01_I40_LOCKED_RUST_RELEASE.md |
| A21 | Unit green и зелёный CI ошибочно выдавались за реальную Windows 10 GUI-приёмку. | Сохранять отдельные слои UNIT, HOSTED_NATIVE, PERSONAL_SERVER, PHYSICAL_WIN10 и исходные SHA/PNG/PDF. | ЗАПРЕТ ЛОЖНОГО PASS; docs/QA_ACCEPTANCE.md |

## B. Windows Administrator, MiKTeX, XeLaTeX, Poppler и файлы

| ID | Наблюдавшаяся проблема / причина | Решение и ограничение | Статус / свидетельство |
| --- | --- | --- | --- |
| B01 | Членство в Administrators смешивалось с реальным HIGH token, UAC linked token и Session 0. | Измерять elevation, RID, linked token, SID, session и desktop независимо; не делать вывод по имени учётной записи. | ИСПРАВЛЕНО; owner correction 2026-11-06 |
| B02 | Ложное требование нового не-администратора и blanket block HIGH для MiKTeX задерживали W1. | По решению владельца разрешить собственный HIGH Administrator с постоянным предупреждением «только доверенный TeX, НЕ sandbox»; не менять UAC. | ИСПРАВЛЕНО; plans/2026-11-06_OWNER_ADMIN_BLOCKER_CORRECTION.md |
| B03 | Встроенный Administrator может не иметь linked MEDIUM токена для запуска child. | Read-only расследование; restricted/LUA/UAC-linked child experiments были исследованием, не обязательной архитектурой релиза. | ОТМЕНЁННЫЙ МАРШРУТ; insights/2026-11-06_WINDOWS_ADMIN_TOKEN_RELEASE.md |
| B04 | TOKEN_DUPLICATE, ERROR_BAD_LENGTH, IsTokenRestricted и CreateProcessAsUser неверно интерпретировались в лабораторных попытках. | Исправлены флаги handle rights, SID/integrity readback и suspended-only child cleanup; это НЕ разрешённый TeX sandbox. | ИССЛЕДОВАНИЕ НЕ В ПРОДУКТЕ; insights/2026-11-06_WINDOWS_MEDIUM_RESTRICTED_CHILD_PROBE.md |
| B05 | Внешние Poppler/XeLaTeX процессы наследуют пользовательский токен. | Прямой bounded process invocation, visible HIGH trusted-document warning, shell escape disabled, offline/no-auto-package; не обещать OS-изоляцию. | АКТУАЛЬНОЕ ОГРАНИЧЕНИЕ БЕЗОПАСНОСТИ |
| B06 | MiKTeX мог автоматически скачать недостающие пакеты без согласия. | Подтвердить именно MiKTeX и поддержку --disable-installer, запускать вместе с -no-shell-escape; inventory до/после. | ИСПРАВЛЕНО; A/W06, I59 и D06 QA |
| B07 | MiKTeX и TeX Live имеют несовместимые CLI flags, неизвестная версия вызывала некорректный fallback. | Engine identity/version probe, distribution-specific argument set, отказ при UNKNOWN; никакой тихой замены движка. | ИСПРАВЛЕНО; docs/QA_WIN10_MACOS_ARM.md |
| B08 | XeLaTeX exit=0 скрывал 19 предупреждений Missing character и потерю кириллицы в PDF. | Отдельная проверка glyph warnings, реального pdftotext UTF-8 и font embedding, не только числа страниц. | ИСПРАВЛЕНО ДЛЯ FIXTURES; docs/CI_MATRIX.md |
| B09 | Шрифт был установлен на хосте, но не встроен в PDF или потерялась ToUnicode карта. | Реальные TikZ nodes с DejaVu Serif/Latin Modern Math, pdffonts embedded+pdftotext кириллица/Greek, pdfinfo pages. | РЕАЛЬНЫЙ HOSTED И W1 PASS, не все пользовательские fonts |
| B10 | Отсутствуют pdfinfo/pdffonts/pdftotext/pdftoppm или не доказана совместимость font/preview. | Отделить успешный PDF build от NOT_CHECKED/FAIL инспекции; Poppler пользователь устанавливает отдельно. | ДИАГНОСТИКА ЯВНАЯ |
| B11 | NULLFONT .01pt и посторонние warnings в исторических fixture скрывали смысл ошибки. | Аудит точных log/fixtures и ожидаемых negative cases, прежде чем менять тест; 135/135 compile не тождественно warning-clean. | ИСТОРИЧЕСКОЕ ОГРАНИЧЕНИЕ; docs/QA_ACCEPTANCE.md |
| B12 | Превью показывало старый успешный PDF как точный после изменения source/dependencies. | Build связан с source revision/dependency fingerprint, last-good preview помечено «PDF устарел», export fail-closed. | ИСПРАВЛЕНО; B02/B25/B37 планы |
| B13 | Долгая компиляция, зависший Poppler и огромный PNG могли повесить UI. | Ограниченные workers, cancel/timeout, bounded decoding/preview, оригинальные logs и статус без подмены результатов. | ИСПРАВЛЕНО В ДВИЖКЕ; B05/B06/W03 планы |
| B14 | Диагностика included file ошибочно прыгала к строке активного файла. | Раздельные file+line source targets и отказ от перехода при неподтверждённой идентичности файла. | ИСПРАВЛЕНО; B02/N3 |
| B15 | Сохранение/замена могла затереть внешний файл, symlink, read-only файл или чужие CRLF/макросы. | Safe Save/Save As с проверкой конфликтов, source bytes/inode/symlink, source revision и Undo fence. | ИСПРАВЛЕНО В CORE; I06/B32/dirty-open/dirty-close |
| B16 | Разные типы ошибок TeX (wrong argument, wrong macro, missing package) засчитывались одним no-PDF. | Специфичная отрицательная fixture/engine banner и exact expected error; любой nonzero недостаточен. | ИСПРАВЛЕНО; QA_negative и D06 |

## C. Настоящее GUI, Windows Server RDP, OpenGL и клиентские PNG

| ID | Наблюдавшаяся проблема / причина | Решение и ограничение | Статус / свидетельство |
| --- | --- | --- | --- |
| C01 | Service/Session0, Window Station не WinSta0/Default или locked input desktop не дают открыть пользовательское GUI. | Запустить runner в существующем интерактивном пользователе и проверить WTS, WinSta0, input desktop, token; не создавать нового пользователя. | ТЕСТОВЫЙ КОНТРАКТ W2 |
| C02 | На Windows Server Session 2 был WTS=4 Disconnected, input desktop UNAVAILABLE. | Владелец подключился RDP; исходный run #42365691563 attempt2 подтвердил WTS=0 и input Default. | СТАРЫЙ БЛОКЕР УСТРАНЁН В ТОМ ПРОГОНЕ |
| C03 | В GitHub-hosted Windows и Windows Server RDP egui_glow не нашёл OpenGL 2.0, GUI закрывался до HWND. | Проверенный QA-only Mesa llvmpipe рядом с копией точного EXE, без системных изменений; product fallback не реализован. | ОБХОД ТОЛЬКО QA; PR #129 |
| C04 | Архив Mesa 26.2.6 MSVC прошёл SHA, но вообще не содержал opengl32.dll. | Взят Mesa 26.2.6 MinGW x64, SHA256 da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388; проверять DLL inventory. | ИСПРАВЛЕНО В QA; #42361805938 |
| C05 | Архив может распаковываться 7z, но на персональном Server нет 7z; несовместимы дочерние runtime DLLs. | Использовать существующий 7z или системный tar, проверить opengl32 и Gallium; локальные 19 DLL только во временный bin. | ОБХОД ТОЛЬКО QA |
| C06 | Появилась опасность непреднамеренно включить программный GPU driver в ZIP или систему. | RUNNER_TEMP/tikzarium-w2-gl-runID, EXE SHA unchanged, per-file manifest, удалять всё при любом исходе. | ПРОВЕРЕНО; PR #129; исходный #42382753629 |
| C07 | Первое hosted окно 1008×719 при (78,78) выходило за пределы 1024×768. | Переместить только доказанно принадлежащий приложению HWND в одноразовом hosted desktop, повторно измерить bounds. | ИСПРАВЛЕНО ТОЛЬКО HOSTED |
| C08 | GetWindowRect+CopyFromScreen захватывал тонкую полосу wallpaper и taskbar рядом с HWND. | Прямой GetClientRect/ClientToScreen+PrintWindow(PW_CLIENTONLY|PW_RENDERFULLCONTENT); PID/foreground/unlocked проверки; без desktop DC. | ИСПРАВЛЕНО; PR #127, issue #126 |
| C09 | PrintWindow иногда возвращает успех с пустым/чёрным GPU кадром. | Magenta sentinel/число цветов/PNG CRC+SHA+размеры и F1 frame difference; blank → BLOCKED, не fallback к BitBlt. | ЗАЩИТНЫЙ ТЕСТ HOSTED PASS |
| C10 | Отправка F1 без настоящего HWND не доказывает работу справки. | Фактический PID/title/visible HWND, источник exact SHA, две оригинальные PNG и визуально подтверждённая вкладка «Справка». | HOSTED WINDOWS PASS; #42364795994 |
| C11 | Первые фото после F1 не изменялись из-за неверной геометрии или чужого foreground. | Повторная проверка фактического HWND и diff original PNG, отказ при чужом окне. | HOSTED PASS, ФИЗИЧЕСКИЙ W2 ЕЩЁ НЕ PASS |
| C12 | На прежнем main visible Server HWND не владел foreground. | PR #132: bounded asynchronous discovery, no-console helper, ready/processed WM_NULL + stable owned foreground; AttachThreadInput удалён. | ФИЗИЧЕСКИЙ FOCUS/F1 ПОДТВЕРЖДЁН на9c721242, run42450616810; complete PNG требует C14 |
| C13 | PR #130/#131 не сняли NULL foreground; synchronous GUI discovery задерживал обработку оконных сообщений. | TeX discovery вне GUI-потока, bounded read-only child/no-console; native responsiveness regression во время2s lookup; actual own HWND handshake без queue attachment. | PR #132 MERGED; personal PID1652/HWND4128904, first-attempt705ms, no attach; full W2b NOT_RUN |
| C14 | DPI120/125% personal original PNG1180×680 обрезали Inspector/Help справа и статус снизу: logical GetClientRect bitmap против физических PrintWindow pixels. | Один native thread-scoped PMv2 для window/client/monitor/PrintWindow; finally restore; original schema3 physical geometry и auditor, запрещающий legacy non100%-DPI как complete capture. Не масштабировать PNG постфактум и не менять DPI системы. | ФИЗИЧЕСКИЙ W2a PASS: current main `ef95c1c9`, [original #42460198175](https://github.com/i-shutov/tikzarium/actions/runs/42460198175), artifact 13609526883: complete 1475×850 physical client PNGs, restored PMv2 and full right Help/bottom status, independently audited. W2b NOT_RUN. |
| C15 | Green Actions при continue-on-error маскирует W2 статус BLOCKED. | Читать windows-server-w2-interactive.json и original stderr, Mesa manifest, PID/foreground, PNG CRC/SHA и W2 independent auditor; не утверждать PASS по success workflow. | ОБЯЗАТЕЛЬНО; #42382753629 |
| C16 | Видимое окно может появиться лишь после длительного OpenGL-start и renderer initialization. | Bounded native HWND polling, отдельные exit-before-window/no-window statuses, original stderr; не выдумывать GUI crash из времени. | ДИАГНОСТИКА РАЗДЕЛЕНА |

## D. GUI Studio, источники TikZ, N1–N5, X11 и DPI

| ID | Наблюдавшаяся проблема / причина | Решение и ограничение | Статус / свидетельство |
| --- | --- | --- | --- |
| D01 | Старая программа имела перегруженную панель текстовых кнопок, не соответствовала TikZ-first эргономике. | Studio icon groups, source всегда рядом с canvas/PDF, отдельные Properties/Libraries/Help, палитры из C-каталога. | ИСПРАВЛЕНО; B42 Studio |
| D02 | Источник и Inspector отнимали ширину у эскиза на 850–1366 pt. | Responsive widths после реальных SidePanel и tool rail, сохранение центрального canvas и pinned status. | ИСПРАВЛЕНО; B19/B43 |
| D03 | Длинный % tikzarium:n1 marker занимает множество строк source; пользовательский TeX плохо читается. | Визуальное приглушение marker и default no-wrap без изменения единого буфера/CRLF/Undo, опция «Перенос». | PR #128 DRAFT, 10/10 hosted checks PASS, main не изменён |
| D04 | desired_width(INFINITY) в egui SidePanel НЕ отключал wrapping. | Контролировать galley LayoutJob wrap width, горизонтальный ScrollArea; никакого source rewrite. | ИСПРАВЛЕНО; B43 |
| D05 | Курсор/scroll-to-line по line_no×font_height ошибался при wrap и Unicode. | Galley pos_from_cursor и char-range/source revision вместо фиксированной высоты строки. | ИСПРАВЛЕНО; B21/N3 |
| D06 | После визуальной SourcePatch/внешнего Open Ctrl+Z возвращал старый .tex. | Очистка TextEdit undo history только при actual source revision change; раздельный visual inverse patch. | ИСПРАВЛЕНО; B40 |
| D07 | Ctrl+Z при удержании мыши или смене фокуса случайно менял исходник. | Pointer capture/escape/cancel guards, source focus fencing, release-before-undo tests с настоящим X11. | ИСПРАВЛЕНО; B27–B30 |
| D08 | Короткий X11 Ctrl+O отпускался в том же frame и не считывался глобальными modifiers. | Читать modifiers из каждого key event, а не только текущего input.modifiers. | ИСПРАВЛЕНО; B43 |
| D09 | Плавающая палитра перекрывала код после перехода в source. | Скрывать palette только при явном pointer click на editor; привязка к реальному краю source pane. | ИСПРАВЛЕНО; B43 |
| D10 | F1 менял внутренний help flag, не показывая реальную вкладку. | Route F1 в видимый StudioDock Help, общий C-каталог и проверенные оригинальные screenshots. | HOSTED PASS |
| D11 | Полные справочные абзацы под каждым параметром выталкивали Apply и Node/Bézier поля ниже окна. | Pinned action bar сверху; компактные ⓘ + F1 и удаление дублирующего Apply внизу — PR #128. | КАНДИДАТ UX, физический Win10 NOT_RUN |
| D12 | После уплотнения Inspector I61 кликал Node-x в старой точке y=560 вместо новой y≈509. | Ревью original PNG, скорректированный реальный click и clipboard readback до Apply. Не отключать acceptance. | PR #128, exact-head I61 SUCCESS |
| D13 | X11 popup/toolbar координаты устаревали после редизайна. | Снимки реальных response rectangles и проверка SHA дерева исходников APP_TREE; перепривязать harness при GUI change. | ИСПРАВЛЕНО В QA |
| D14 | Исходник менялся при выборе списка/hover или при непрозрачной макрокоманде. | Revision-checked minimal SourcePatch только C-owned primitives, неизвестный TeX сохраняется побайтово. | ИСПРАВЛЕНО; N1/C07/B11 |
| D15 | Installed package путали с project-loaded library и GUI-implemented. | Пять независимых статусов: installed, project-loaded, engine-compatible, implemented, help; UNKNOWN допустим. | ИСПРАВЛЕНО; C/N2 |
| D16 | Подключение/отключение TikZ-библиотеки выглядело как автоматическая установка пакета. | Только видимая undoable правка \\usepackage/\\usetikzlibrary, не изменение MiKTeX installation. | ИСПРАВЛЕНО; N2 |
| D17 | Lua-only PGF graphdrawing ошибочно считался XeLaTeX-совместимым. | INCOMPATIBLE_ENGINE, source-only или help-only режим, без автопереключения компилятора. | ИСПРАВЛЕНО В КАТАЛОГЕ |
| D18 | GUI theme/font и fontspec внутри фигуры путались. | Light/Dark/Midnight/Paper только для UI; TeX/Unicode-Math fonts отдельны, фонты не прикладывать к дистрибутиву. | ИСПРАВЛЕНО; F01/U01 |
| D19 | Close/Alt+F4 терял dirty .tex без Save/Discard/Cancel. | R1 interception реального WM close с безопасными и явными решениями. | LINUX HOSTED PASS; issue #103 |
| D20 | При 200% DPI minimum inner size 850×560 выходил за физический экран. | R2 viewport/workarea-aware layout, DPI 100/125/200% проверка X11, Win10 остаётся отдельно. | LINUX HOSTED PASS, W3 NOT_RUN |
| D21 | На Linux отсутствовал реальный OS file picker, был лишь ввод пути. | R3 native GTK/XDG dialogs Open/Save/Export; сохранять Unicode, no-clobber, source revisions. | LINUX HOSTED PASS, WAYLAND НЕ ПРОВЕРЕН |
| D22 | Linux portable launcher менял CWD, figure.tex попадал не в проект. | Сохранять caller working directory, запускать извлечённый ELF/launcher и проверять Save/Open/PDF из каталога проекта. | LINUX HOSTED PASS; N5 |
| D23 | Openbox/Xvfb запускались одновременно; NO_WINDOW был ошибочно приписан дефекту EXE. | Ждать фактической готовности WM, сохранять X11 logs, PID, WinId, stdout/stderr; отдельный replay того же бинарника. | РЕШЕНО В HOSTED QA |
| D24 | Исходный PDF и временный визуальный overlay могли приниматься за один источник истины. | Exact XeLaTeX PDF authoritative; overlay provisional и stale, отдельные page/zoom/image quality tests. | ИСПРАВЛЕНО; B25/B37 |
| D25 | Успех UNIT_EVENT/JSONL считали доказательством настоящего GUI. | Реальные xdotool X11 и Win32 HWND/F1 снимки, оригинальные PNG/source/PDF SHA; физический Win10 остаётся W3. | ПОЛИТИКА ПРИЁМКИ |
| D26 | Шесть primitives из C-каталога ошибочно расширялись до полного Photoshop/CAD/TeX parser. | Линия, стрелка, прямоугольник, окружность, Bézier, node; не переписываем TeX, не строим solver/CST и не меняем engine. | АКТУАЛЬНАЯ ФИКСАЦИЯ ФУНКЦИЙ |


## E. Отклонённые пути, которые НЕ надо повторять

1. Переустановить Cargo/MiKTeX из-за красного job без чтения подлинного error stage — отвергнуто, так как оригинальные native EXE/PDF были успешны.
2. Завести нового не-администратора или менять UAC/registry ради XeLaTeX — **отменено владельцем**. Built-in Administrator поддерживается с честным предупреждением «trusted documents only».
3. Запустить TeX Live вместо выбранного MiKTeX, включить shell escape или автоматически загружать пакеты — запрещено.
4. Установить Mesa/OpenGL, VC Redistributable, fonts или Rust системно на персональном Server только ради QA — не требуется; QA использует временную проверенную per-app Mesa, которая НЕ включается в продукт.
5. Принять скриншот GetWindowRect+CopyFromScreen за строго клиентский или временно игнорировать другой foreground HWND — риск утечки чужого RDP экрана; нельзя.
6. Зачесть тестовое Win32 HWND как полную W2; зелёный workflow с continue-on-error может содержать BLOCKED и не имеет физического W3.
7. Отключить exact-head/tree lease ради зелёного теста или запускать PR на persistent runner — недопустимо.
8. Объявить Lua restricted token автоматическим безопасным sandbox на основании suspended whoami experiment — не разрешено и не нужно для текущей релизной линии.
9. Добавить CAD/geometry solver, все пакеты/источник TeX parser и новые функции ради 1.0 — вне scope freeze.
10. Мержить стороннюю UX-ветку в main, пока идёт trusted-main физическая W2 попытка на exact SHA — только после завершения текущего gate.

## G. Windows 10 workstation bootstrap — отдельные инциденты установки (2026-11-09)

**09.11.2026, итог первичного развёртывания Windows 10:** инциденты WS01–WS07 преодолены для первоначального пользовательского запуска: получены успешные Rust/cargo app build и `tikzarium-cli build` с MiKTeX PDF (16 448 байт, 93 зависимости, 11.5004974 с), завершились проверки Arial/ToUnicode и извлечения кириллицы в установочном скрипте. Это приёмка **работоспособности установки и CLI**, а не фактическая приёмка GUI W3. MiKTeX warning об обновлениях при exit 0 не считать фатальным. Оригинальные `environment.json`, PDF и снимки требуются для независимого ревью. См. [W3 physical QA](WINDOWS_10_W3_PHYSICAL_QA_20261109_RU.md).


## WS07 — MiKTeX пакеты уже установлены, 2026-11-09

**Фактический пользовательский лог:** `xelatex --version` успешно отработал, MiKTeX Package Manager 4.10; затем `-Phase User` завершилась на `pgf: package is already installed` / `MiKTeX explicit package install failed with exit code 1`. Это ошибка повторного пакетного provisioning в первоначальном установщике, а не неисправность XeLaTeX.

**Исправлено в [PR #150](https://github.com/i-shutov/tikzarium/pull/150):** перед установкой каждого из пяти пакетов (`pgf`, `standalone`, `fontspec`, `xcolor`, `unicode-math`) вызывается `miktex --disable-installer packages info --template '{isInstalled}' <package>`. Устанавливаются только отсутствующие; после операции выполняется повторная верификация. `update-package-database` выполняется только если выявлены отсутствующие пакеты. Статус, отличный от `true` или `false`, запрещает продолжение. Добавлена отдельная hosted PowerShell 5.1 регрессия на состояния `true`, `false` и ошибочные значения без установки стороннего ПО.

**Обход для уже запущенной RDP-сессии QA:** явно проверить каждый из пяти пакетов через `packages info`, установить только отсутствующие, затем выполнить локальный исправленный `TikZarium-Win10-Setup-fixed.ps1 -Phase User -SkipTexProvision`. Данный флаг пропускает лишь повторное provision пакетов; Cargo, XeLaTeX PDF, встроенные шрифты и кириллица по-прежнему должны проверяться. Не скачивать ZIP заново под `tikzarium-qa`, не менять пользователя/права/UAC, не переустанавливать MiKTeX.

**Статус:** Windows 10 `Machine PASS`; `User IN_PROGRESS` с подтверждённым MiKTeX CLI, но без итоговых `environment.json`/PDF; физический W3 `NOT_ACCEPTED`; W4 `NO-GO`.


Новые **WS01–WS07** дополняют, но не перенумеровывают ранее задокументированные 79 классов; это ошибки установочных скриптов, а не доказательство дефекта ОС/TikZarium.

| ID | Симптом и причина | Исправление | Фактический статус |
| --- | --- | --- | --- |
| WS01 | Первоначальный Win11-only guard отклонял настоящую целевую Win10 Pro 22H2 build 19045. | Принимать Windows workstation x64 build 19045+ (Win10 19045, Win11 22000+), исключить Server; не требовать покупать другую ОС. | ИСПРАВЛЕНО; в логе `Windows 10 x64 build 19045: SUPPORTED`. |
| WS02 | В интерполяции `"$build: ..."` PowerShell 5.1 интерпретировал двоеточие как некорректную scoped-variable ссылку. | Заменить на `${build}:`, запускать `Parser.ParseFile` до исполнения и в hosted PS5.1 CI. | ИСПРАВЛЕНО; в том же логе `Machine` дошла до завершения. |
| WS03 | После создания QA-пользователя скрипт требовал отсутствующий `winget`, необязательный для Win10. | Прямые официальные подписанные/SHA256-фиксированные дистрибутивы; идемпотентная установка Git/MSVC/SDK/VC Runtime без `winget`. | Machine PASS, Git SHA256 verified, MSVC/SDK detected, runtime detected. |
| WS04 | `PREFLIGHT.ps1` обращался к `$PSScriptRoot` в выражении значения параметра до инициализации переменной. | Разрешать относительные пути после разбора параметров; отдельный hosted PS5.1 parse-only workflow. | ИСПРАВЛЕНО в коде; hosted [#42630107591](https://github.com/i-shutov/tikzarium/actions/runs/42630107591) PASS; локальная v5 preflight-фаза отдельно НЕ ПОДТВЕРЖДЕНА. |
| WS05 | В закреплённом SHA256 `rustup-init.exe` x64 1.29.3 была опечатка; **скачанные байты совпадали с официальным эталоном**. | Правильный хеш `38027d51d69a5d05493627a0634dbea52d6cd793c8f072d2373d3f4163eec7db`; сохранять строгую проверку загрузки. | Исправление в [PR #150](https://github.com/i-shutov/tikzarium/pull/150); в пользовательском логе на исправленной копии `SHA256 VERIFIED`. |
| WS06 | Rustup installer был переименован в `tikzarium-bootstrap-rustup-1.29.3.exe`; Rustup распознал имя как неизвестный proxy и выдал `unknown proxy name`. | Сохранить бинарник с basename `rustup-init.exe` в выделенной подпапке, с прежней проверкой SHA256; добавить отрицательную регрессионную проверку имени в hosted CI. | Исправление в PR #150, пользователь сообщил «так пошло» после локальной коррекции; Rust toolchain/MiKTeX/Poppler/PDF/GUI пока NOT_ACCEPTED. |
| WS07 | `xelatex --version` отработал, но пакетный `install pgf ...` завершился кодом 1: `pgf: package is already installed`. | Проверять `packages info --template '{isInstalled}'` и устанавливать только отсутствующие; повторная проверка; hosted тест состояний. | Исправление в PR #150; физический User/PDF/W3 пока не принят. |

**Границы:** подтверждён `Machine PASS`, не `User PASS`. В активном профиле `tikzarium-qa` лежит исправленная частная копия скрипта; первоначальный `C:\ProgramData\TikZariumSetup\TikZarium-Win10-Setup.ps1` автоматически не меняется после GitHub-коммитов. Не давать инструкции повторно скачивать ZIP под QA-пользователем, не менять пароли/политику RDP/UAC, не регистрировать runner без необходимости. Отдельный [runbook](../scripts/workstation/windows10/README_RU.md).

## F. Первичные источники и аудит полноты

- [CHANGELOG](../CHANGELOG.md) — датированные исходные изменения, включая A/W/C/N/I/B/D/R; записи «candidate/draft» являются **историческими**, а не текущим GO/NO-GO.
- [plans](../plans/) — отдельные постановки всех микродефектов, B21–B43, I61, N5, D06, W0–W4, R1–R5.
- [insights](../insights/) — независимая инженерная QA, первоначальные ошибочные гипотезы, исправления и исходные SHA.
- [issue #108](https://github.com/i-shutov/tikzarium/issues/108), [issue #103](https://github.com/i-shutov/tikzarium/issues/103), [issue #125](https://github.com/i-shutov/tikzarium/issues/125), [issue #126](https://github.com/i-shutov/tikzarium/issues/126).
- [PRODUCT_SPEC](PRODUCT_SPEC.md), [AGENTS](../AGENTS.md), [Windows release control](WINDOWS_1_0_RELEASE_CONTROL_RU.md) — современные релизные ограничения и верхнеуровневые критерии.

Для каждой новой ошибки обязателен набор: source commit, job/run attempt, исходный stderr/log, host/session/token, наблюдаемый симптом, причинная проверка, способ решения, negative test, статус физической приёмки. Не смешивать «исправили скрипт» с «проверили Windows10» и не объявлять UNKNOWN автоматически FAIL.
