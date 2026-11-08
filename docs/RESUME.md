# TikZarium — release resume, 2026-11-08

## 2026-11-08 — diagnostic: fixed-hash QA Mesa asset HTTP 504

**Вторая ветвь загрузки, только кандидат:** после нескольких 504 даже через curl и официальный release-asset API добавлен резервный пакет [MSYS2 mingw-w64-x86_64-mesa 26.2.6-1](https://packages.msys2.org/packages/mingw-w64-x86_64-mesa), 12.43 МБ, точный SHA256 `7b14de4d3f234efd0022d14dd7fb313ed751c829bb1f46026e0b2dce2d2d05a4`. Путь и DLL-хеши будут отражены в исходном отчёте. Ни подмены пал1000 после SHA-мисматча, ни незаверенного зеркала, ни системной установки. Проверить исполнением на disposable Windows, не присваивать hosted GUI PASS до исходного артефакта. Физический Server W2b остаётся NOT_RUN.

On exact-head PR #136 hosted Win32 run #42467815916 and PR #137 #42467958458, four requests to the external **pal1000 Mesa 26.2.6** QA-only archive all returned HTTP 504. Rust/Windows/macOS/Linux, PS tests and MiKTeX checks were successful; the hosted Win32 GUI evidence step was **NOT PASS**. Retry of the failed job did not fix the gateway error. A disposable-only transport candidate now tries PowerShell HTTP, Windows curl.exe and GitHub's official release asset API, bounded and requiring the **same original SHA256**. All wrong/missing bytes fail closed. This candidate must pass new exact-head hosted CI; **no personal Server W2b input has run**. No system installs or alternate unverified mirrors.

## 2026-11-08 — личный runner: исправление отмен ожидающих заданий

Повторные запуски self-hosted workflow-run на trusted-main SHA `fa55b9af3e2e236819feee73d26c326002ea8028` имели `pending → cancelled` **без единого запущенного job** при завершении множества PR CI. Причина в единой workflow-level `concurrency.group` для всех событий, включая PR `workflow_run` (для которых `jobs.if` уже запрещает реальное выполнение, но очередь может быть занята до обработки `if`). GitHub Actions по умолчанию вытесняет предыдущий `pending` новый ожидающим запуском даже с `cancel-in-progress: false`. Исправление выделяет уникальную очередь для PR/no-op событий и сохраняет один сериализованный ключ для реальных trusted main push/ручного запуска с `main`, не ослабляя контроль SHA и безопасности runner. Это не означает, что сама Windows машина уже предоставила новый W2b PASS.


**Trusted main:** `ef95c1c9ef1ac2b311a654c1daac53c97c8d7ef9`. PR #132/#133/#134 merged, original hosted Windows/macOS/Linux exact-main workflows PASS. **W1 exact-current-main PASS**: personal [run #42460198175](https://github.com/i-shutov/tikzarium/actions/runs/42460198175) completed SUCCESS; final original artifact **#13609998582** ZIP sha256 `e7a39d60a263968ea6b2640507727f52204e92bb45db1b669eab9a6b4d47e13a`, independently executed `qa_windows_server_uploaded.py` PASS_ORIGINAL_WINDOWS_NATIVE_CLI_MIKTEX_PDF_FONTS_UNICODE on original bytes. Actual MiKTeX one-page PDF sha256 `b288cc80cb756deab46ba30c99f347c46ef52e8a46f46f8756c257b8383b72b7`, embedded Arial yes/subset yes/ToUnicode yes, decoded UTF-8 Cyrillic. Native Rust tests, PE GUI/CLI and no unwanted dynamic CRT imports PASS. Independent external XeLaTeX via product CLI, not GUI-origin PDF; W2b remains NOT_RUN.

## W2a genuine physical acceptance: PASS

Original personal Windows Server early artifact **13609526883** in [run #42460198175](https://github.com/i-shutov/tikzarium/actions/runs/42460198175), ZIP SHA256 `1a238945a8b9007d9be4b21198b1ebad9c8378a4ccda996d38e2ea3d797a6b1b`. Verified the original JSON and both PNGs with current independent geometry/decoded-pixel auditor and visual review: existing HIGH Administrator, RDP Session2 WTSActive0/WinSta0/Default, own GUI PID8440/HWND2294498, first-attempt stable foreground525ms, no AttachThreadInput. Complete **1475×850 physical client pixels at 125%/DPI120**, same dimensions before and after, restored per-monitor-v2 DPI context, zero unpainted pixels, right Properties/Help and bottom status fully visible, real F1 opens Russian Справка. Own client PrintWindow only, no desktop pixels. Earlier 1180×680 historical screenshot from 9c721242 was cropped and is intentionally rejected.

## Release gates

| Gate | State |
|---|---|
| W0 Windows x64 release candidate/PE/manifest | **PASS** (hosted exact main #42459875159) |
| W1 native personal Server Rust/MiKTeX PDF | **PASS** exact SHA `ef95c1c9`, original final artifact #13609998582, independent auditor PASS |
| W2a own HWND/F1 complete physical 125% screenshot | **PASS** (original artifact 13609526883) |
| W2b six true GUI gestures, source/Undo, Save/Open, native dialogs, IME, GUI→XeLaTeX PDF | **NOT_RUN** |
| W3 separate actual Windows 10 x64 native GPU/GUI/IME/DPI/full PDF | **NOT_RUN** |
| W4 clean installation/uninstall, signed-status disclosure, stable tag | **NO-GO** |

## Resolved historical defects

PR #132 removed synchronous TeX discovery from GUI loop, solving NO_FOREGROUND_WINDOW. PR #133 fixed virtualized 125% screenshot cropping via bounded native PMv2 and context restoration. PR #134 hardened 105 optimized-Python assertions, verified actual decoded opaque pixels and prevented metadata-only F1 false changes. The old [canceled #42453220928](https://github.com/i-shutov/tikzarium/actions/runs/42453220928) lost artifact uploads/logs; current early **and final** uploads both succeeded; read-only transport probes before/after W1 show DNS RESOLVED and TCP443 CONNECTED for github.com, api.github.com, results-receiver.actions.githubusercontent.com and >62 GB free space. Earlier transient failure's root cause remains **UNKNOWN**; do not assert a permanent network fix.

## Boundaries and next steps

Do not change main during its personal exact-SHA run. Owner's HIGH Administrator is allowed for trusted TeX, not a sandbox; no UAC, registry, new accounts, automatic TeX/package/fonts or system drivers, nor FlowBridge modifications. Temporary pinned Mesa is QA-only, removed after test, never distributed.

Next: run full physical Server W2b and independent native Windows10 W3. Only release stable v1.0.0 after W2b+W3 and tested clean-install/uninstall/W4. See [canonical gate](WINDOWS_1_0_RELEASE_CONTROL_RU.md).
