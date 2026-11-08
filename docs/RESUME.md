# TikZarium — release resume, 2026-11-08

## 2026-11-08 — latest personal W2b stage blocker: no 7-Zip, native tar candidate

Trusted main `6cb083b29e4e0f020237b4fa869a979032f5c22b`, physical [run #42476793403](https://github.com/i-shutov/tikzarium/actions/runs/42476793403), original early artifact #13615637630 (ZIP sha256 `1482667918a429d27056d9fc9fb7b1c6e218462b34764039a488e402a87f7a56`). Original JSON: `BLOCKED_PINNED_MESA_STAGE_UNAVAILABLE`, exact reason `PINNED_MSYS2_REQUIRES_EXISTING_7ZIP_NO_INSTALL_ALLOWED`. Existing private hosted EXE/portable SHA/CLI and Administrator token PASS; no owned HWND, no F1/PNG, no physical W2b gestures, Save As or PDF. The original pal1000 release transport failed, MSYS2 fallback was selected but previous script unnecessarily demanded independently installed 7-Zip. Candidate PR uses preinstalled Windows `tar.exe`/libarchive to unpack actual SHA-pinned official .pkg.tar.zst directly, and retains 7-Zip two-layer extraction only when already present. PowerShell 5.1 selftest uses a **synthetic uncompressed tar layout**; real Zstandard support and actual OpenGL runtime are still unproved until exact trusted-main personal execution. If actual tar cannot decompress zstd, fail closed `PINNED_MSYS2_NATIVE_TAR_ZSTD_EXTRACTION_FAILED_EXIT_<N>` without installing programs. Keep W2b/W3 NOT_RUN and stable W4 NO-GO.


## 2026-11-08 — latest original personal W2b transport BLOCKED; separate candidate fallback

Fresh trusted main `597dc894070202975fdf58c434f599deac42fe7d` merged reviewed PR #136 only after exact-head hosted CI and the previous Server #42470761858 completed SUCCESS. New trusted-main [personal Server #42473309431](https://github.com/i-shutov/tikzarium/actions/runs/42473309431) uploaded **original early artifact #13613977992**, ZIP SHA256 `06cdd5733eefd519da3875939baa974223c99aa85b85bea4efb439c4a5482c85`. Its native JSON says **`BLOCKED_PINNED_MESA_STAGE_UNAVAILABLE`** with `PINNED_MESA_TRANSPORT_EXHAUSTED_4_ATTEMPTS: CURL_RELEASE_EXIT_22`. This is a failed GitHub release CDN transport for QA OpenGL, **not** a six-gesture GUI PASS. Exact hosted EXE/portable verification passed; W2b stage1/native pointer, dialogs, IME, DPI200 and GUI→PDF remain NOT_RUN. W2a remains PASS only at original ef95c1c9 evidence.

Engineering candidate (separate branch, NOT trusted on personal Server until reviewed merge): permit **only a transport-exhausted pal1000** fallback to the independently SHA256-pinned official MSYS2 26.2.6-1 MinGW Mesa archive (`7b14de4d3f234efd0022d14dd7fb313ed751c829bb1f46026e0b2dce2d2d05a4`). Enforce exact origin+digest, nested archive structure, actual `opengl32.dll`/`libgallium_wgl.dll`, all staged DLL hashes, and existing private run-only directory; no retry on corrupted/changed bytes, no system install or product redistribution. Windows CI exercises offline negative transport contracts. A network-independent future path is to escrow an original pinned QA archive as an exact-main hosted CI artifact; do **not** assert this exists today.

**Release verdict remains:** W2a accepted at prior SHA; full W2b NOT_RUN, physical Win10 W3 NOT_RUN, stable W4 NO-GO. **Independently accepted latest personal W1:** trusted-main [run #42473309431](https://github.com/i-shutov/tikzarium/actions/runs/42473309431) completed SUCCESS; original final artifact **#13614209996**, ZIP SHA256 `a16ff580f364787bce70142fe3f8ed47cb9b580381e499cf88f98933288f640c`. Independent raw ZIP/pdfinfo/pdffonts/pdftotext and rendered-page inspection: personal Windows Server 2025 x64 genuine native Rust/CLI/PE PASS, real MiKTeX 26.5/XeTeX product-CLI external PDF SHA256 `825a1bc5eb08bb5876f2d263a48ac84335169f3bf79ef30ac165763f64aa81c5`, 1 page, embedded/subset ArialMT CID TrueType with ToUnicode, readable `Точка`, `Тест XeLaTeX: Кириллица.`, correct native .tex SHA; MiKTeX package inventories identical apart from elapsed timing, no automatic packages; HIGH current Administrator trusted-document warning. **W1 PASS on this SHA, still not GUI→PDF W2b.**


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
