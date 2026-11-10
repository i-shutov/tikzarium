# Задание Dot — автономное W3 GUI QA на Windows 10 Pro для TikZarium

## 2026-11-10 — переход на текущий профиль Admin: готово к запуску W3

`Admin` на той же Win10 Pro успешно собрал `tikzarium-app.exe` и `tikzarium-cli.exe`; CLI создал PDF 16 449 байт. **Postflight `PDF_CYRILLIC_POSTFLIGHT_PASS`**: `standard`, `raw`, `layout` восстановили обе кириллические строки; Arial/ToUnicode подтверждён итоговым PASS. SHA256 PDF `5F6E894F58F546AED7A5CC7E53A615471EFC09B763663C1294BFEF2A463F9807`. `environment.json` от упавшего исходного Setup может отсутствовать, но `pdf-recheck.json` и оригинальный PDF сохранены.

**Не выполнять заново `Machine`, `CurrentUser`, Cargo или установку TeX.** В активной medium-token Admin-сессии с доступным Computer Use запустить изолированную Mesa через [QA launcher](../scripts/workstation/windows10/Invoke-TikZarium-W3-Mesa.ps1), отдельно подтвердить GUI START и затем проверить проблемную `▶` (сначала Save As на новый файл и диагностика), F1, шесть жестов, Undo/Redo, Save/Open, IME/DPI и GUI→XeLaTeX. `Admin W3` пока NOT_RUN. При отсутствии настоящего GUI управления не заявлять PASS.


> Версия 2026-11-09. Передавать Dot после подключения локального компьютера через ChatGPT desktop app под `tikzarium-qa`. Это **задача**, а не утверждение, что Dot уже подключён или умеет управлять мышью в конкретной RDP-сессии.

## Цель

Довести до воспроизводимого доказательства или точного дефекта цепочку: **настоящее GUI TikZarium → Save As → команда Build ▶/Ctrl+Enter → внешний MiKTeX XeLaTeX → просмотр PDF** на отдельной Windows 10 Pro 22H2 x64 build 19045, 3.96 GiB RAM. При наличии рабочего локального GUI control — самому нажимать кнопки, выполнять жесты, проверять реакцию. Если локальная графическая автоматизация не поддерживается доступным Work/Codex-инструментом, прямо сообщить «GUI control unavailable», выполнить разрешённую диагностику кода/логов и предложить проверяемую альтернативу. Не утверждать, что нажатие состоялось, когда его не было.

## Где искать контекст и исходники

- GitHub `i-shutov/tikzarium`, [PR #150](https://github.com/i-shutov/tikzarium/pull/150) — канонические scripts/workstation/windows10 и документация; [единая инструкция](../scripts/workstation/windows10/README_RU.md), [физический W3 чеклист](WINDOWS_10_W3_PHYSICAL_QA_20261109_RU.md), [релизные ворота](WINDOWS_1_0_RELEASE_CONTROL_RU.md).
- Локальные исходники: `C:\Users\tikzarium-qa\source\tikzarium` (проверить `git rev-parse HEAD`; никаких reset/force-pull без отдельного согласования).
- Локальные QA данные: `C:\Users\tikzarium-qa\Documents\TikZarium-QA\`, PDF/JSON from User stage: `evidence\20261109-090708`.
- Изолированный GUI: `Documents\TikZarium-QA\W3-Mesa-26.2.6\runtime\tikzarium-app.exe`; launcher: `Documents\Invoke-TikZarium-W3-Mesa.ps1`. Environment Mesa `GALLIUM_DRIVER=llvmpipe`, `LIBGL_ALWAYS_SOFTWARE=1` только для процесса; не заменять Windows opengl32.dll.

## Уже подтверждено (не повторять установку)

- `Machine PASS`, пользователь `tikzarium-qa` вошёл в RDP.
- Rust 1.91, cargo compiled `tikzarium-core`, `tikzarium-extensions`, `tikzarium-app`; CLI XeLaTeX построил PDF размером 16 448 bytes, reported 93 inputs, 11.5s; исходный `environment.json` создан, внутренний font/text audit прошёл.
- Изолированный software OpenGL Mesa/7zr загружен и запущен, пользователь предоставил скриншот настоящего GUI окна, с исходником, холстом, русскими меню и панелью свойств: `W3 GUI START PASS`.
- **Новый дефект:** пользователь нажимает значок `▶` (build), но визуально ничего не происходит. CLI работает, поэтому приоритет — GUI startup/context/save/diagnostics, а не переустановка MiKTeX.

## Анализ кода до кликов

В `crates/tikzarium-app/src/main.rs` функция `show_studio_toolbar` обрабатывает кнопку Build: `self.build()`. В `build()` есть ранние возвраты, если идёт TeX discovery, активная сборка, отсутствует `xelatex`, либо `save()` вернул false. Для нового несохранённого файла `save()` вызывает native `Save As` через `rfd::FileDialog`; этот диалог в RDP может быть за окном/не иметь фокуса. `self.status` и `Диагностика` — источники причины. **Это гипотезы, не предрешённый диагноз**.

## Исполнение W3: крупным блоком

1. Подтвердить, что ChatGPT/Work реально имеет доступ **к этой локальной VM и её пользовательскому GUI**. Не принимать облачную Windows вместо физической Win10. Записать ограничение, если UI-control недоступен.
2. При доступном управлении: в активной сессии вызвать `Ctrl+S` на новом документе, отследить нативный диалог даже за основным окном, сохранить новый `figure.tex` в отдельную `Documents\TikZarium-QA\W3-physical`. Проверить наличие файла, разрешения и изменившийся индикатор статуса.
3. Нажать `▶` или `Ctrl+Enter`, открыть `Вид → Диагностика`, зафиксировать после клика `self.status`, stderr, прогресс/отмену и результат PDF; если нативный диалог скрыт, фиксировать фактический фокус/окно, не разрушая исходник. Проверить что PDF действительно получен из GUI, а не только отдельным CLI.
4. Проверить F1 before/after, шесть pointer gestures (line/arrow/rect/circle/node/Bezier) → обычный редактируемый TikZ code; Undo/Redo и Save/Open без потери комментариев/CRLF; кириллицу и Unicode file path; DPI 100/125/200 если реально доступно.
5. Собрать оригинальные `tex`, `pdf`, `environment.json`, `pdffonts`, `pdftotext`, логи и SHA256. Зафиксировать отдельный PASS/FAIL/NOT_RUN на каждом шаге. Не выдавать успешный CLI PDF за GUI→PDF.
6. При найденном баге предложить минимальное исправление с тестом `egui`/Windows (например диагностика скрытого Save dialog или отображение статуса Build) на новой ветке и PR после исходных негативных тестов; не менять `main` напрямую и не создавать микро-PR без доказанного дефекта.

## Полномочия и ограничения

Владелец разрешает: запуск уже установленного TikZarium под `tikzarium-qa`, обычные щелчки и ввод тестовых данных, просмотр исходников/локальных логов, использование существующей QA-папки и текущей изолированной Mesa, вызовы cargo test/check в пределах QA-профиля, подготовку PR с минимальными исправлениями. Не разрешает: ввод/сбор паролей, расширение прав, изменение UAC/RDP/системных драйверов или DLL, регистрация runner, изменение служб, системное обновление MiKTeX, доступ к Windows Server/FlowBridge, force-reset Git, публикация скриншота всего RDP рабочего стола в публичном репозитории. Для установки дополнительных программ или новых прав — запросить отдельное разрешение.

## Критерий результата

Доложить: фактический доступ к UI (YES/NO), точный Git SHA и хеш EXE, что произошло после `▶`, статус и логи Build, при наличии PDF — хеш/font/text, фото **только окна TikZarium**, отчёт по W3 и PR для исправления реального дефекта. Сохранить чекпойнт в docs/RESUME и docs/WINDOWS_1_0_RELEASE_CONTROL_RU через проверяемый PR, не объявлять W4 GO пока полный W2b/W3 и W4 не приняты.


## Дополнительная GUI-диагностика: обнаружение внешнего TeX

`crates/tikzarium-core/src/discovery.rs` ищет `TIKZARIUM_XELATEX`, иначе `xelatex` из `PATH`, а растровый предпросмотр — `pdftoppm` из `PATH`. Это потенциальный источник расхождения между успешным CLI и GUI, запущенным в другой RDP-сессии. В SHA-проверенном изолированном Mesa launcher дополнительно включается процессный путь к **уже установленным** пользовательским MiKTeX и Poppler. Никаких системных установок, реестра и постоянного PATH. Даже успешный hosted CI не означает физический W3 GUI→PDF PASS.


## Admin вместо QA-пользователя — 2026-11-10

На Windows 10 Pro build 19045.4412 под `VM-910136\admin` подтверждены PowerShell x64, medium integrity и Administrator SID `deny-only`; локальный Computer Use уже перечисляет окна. Для этого профиля введён `-Phase CurrentUser` в общем установщике. Скрипт не требует локального `tikzarium-qa` и не меняет Admin/UAC/RDP. Пользовательский набор программ (Rustup/MiKTeX/Poppler) и GUI остаётся неиспытанным под Admin до реального запуска. При `Get-CimInstance Access denied` используем только read-only registry fallback, не ослабляем WMI. Далее Computer Use тестирует GUI из того же профиля.
