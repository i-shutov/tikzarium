# TikZarium — release resume, 2026-11-08


## 2026-11-08 — latest exact-main physical evidence and read-only scheduled RDP readiness

Current accepted main is \`4ec94747f2d11840a5dbc5a274b9840ce30dfba9\` (PR #142 merged).
All three exact-main hosted push checks SUCCESS: Rust native [#42489761081](https://github.com/i-shutov/tikzarium/actions/runs/42489761081), D QA [#42489761101](https://github.com/i-shutov/tikzarium/actions/runs/42489761101), Windows admin [#42489761099](https://github.com/i-shutov/tikzarium/actions/runs/42489761099).
Personal original [run #42490214199](https://github.com/i-shutov/tikzarium/actions/runs/42490214199) SUCCESS **for W1, not GUI**. Original WTS early artifact **#13621431232**, ZIP SHA256 \`48f3b3f70ab6e7290442ae67e4059c1b8bfb162b2ebf491e7a73aca6762aeb94\`, and final artifact **#13621878747**, ZIP SHA256 \`5c8e9434f8d9c2f4075000c94101419333c8647a8af031e1138e4b2109a64631\` independently agree: session 2 **WTSDisconnected=4**, \`BLOCKED_RDP_DISCONNECTED\`, no GL, HWND, input or GUI photo. Full W2b **NOT_RUN**; historical W2a accepted only at SHA \`ef95c1c9\`, physical Win10 W3 NOT_RUN, stable 1.0 W4 NO-GO. Current original PDF SHA256 \`abbc6a18ed3a10acddc2fc29e39abab083c1d4e3744a887406cea2dab1b242b7\`: real native MiKTeX/dvipdfmx, one page, Arial embedded/subset with ToUnicode, Cyrillic text, visually rendered — W1 PASS.

New **read-only readiness monitor CANDIDATE**, independent of W1: a scheduled trusted-main self-hosted workflow every 30 minutes runs only the reviewed Win32/WTS native probe and uploads an original JSON. It does NOT stage OpenGL, move user mouse, unlock RDP, create a window, start XeLaTeX or claim GUI PASS. Its distinct concurrency key cannot cancel pending full-main W1/QA. An \`WTS_ACTIVE_CANDIDATE_NOT_GUI_PROOF\` is only permission to *consider* running already reviewed W2b GUI; further real same-owned HWND/Default/input focus/DPI/F1/Save-As and physical Windows10 remain mandatory. Existing RDP session must become Active normally; no process/user/RDP policy alteration is authorized. Until first exact-head hosted CI and reviewed merge this watcher is NOT running on the personal Server.


## 2026-11-08 — original current-main postmerge Server proof and WTS evidence hardening

Latest trusted main is `ccb4ecb7f31981bd433f8bbe3f331ec59cc512d3` (PR #141 merged).
[Exact-main hosted CI #42484403986](https://github.com/i-shutov/tikzarium/actions/runs/42484403986)
and [personal Windows Server #42484861464](https://github.com/i-shutov/tikzarium/actions/runs/42484861464)
completed SUCCESS. **Actions success is not physical W2b success.**

Independently downloaded and inspected **original early artifact #13619042829**
(outer ZIP SHA256 `aea4751731af1e8f23a9d98909d3c67505b69017fb5cebee0f7a7495241dce0e`).
Its separate `w2-session-readiness.json` and `windows-server-w2-interactive.json`
agree: at 2026-11-08 13:26 UTC RDP Session 2, **WTS state 4**,
`BLOCKED_RDP_DISCONNECTED`, before GL/GUI launch. No own HWND, pointer event,
GUI screenshot, Save/Open/dialog, IME, DPI200 or GUI→XeLaTeX ran. The original
early verified-hosted binary/ZIP report is **not** GUI input evidence.

Independently inspected **original final artifact #13620370186**
(outer ZIP SHA256 `029418b45169b10c1bae5dbd016687f281ea1863b10e8383e9401157e04e7b25`).
Actual native Server Rust release GUI and CLI are AMD64 PE32+ subsystem
**2/3**, hashes `d84e60be2e97f52fcfb5ba9598de851677ecc283c4d8abb8970b230c800d1ee4`
and `8d117c661599b7162ed075803be121a0992bb16e3b26db5443f2220e529aef13`.
The real native product CLI called existing MiKTeX 26.5 XeLaTeX, exited 0;
the actual uploaded one-page PDF has SHA256
`42c9209e6d6987212afd3ab38de542d4ca4f3269226fa3a5a85e396e4dfe6e6c`,
embedded/subset ArialMT CID TrueType, ToUnicode, correct extractable
`Точка` and `Тест XeLaTeX: Кириллица.`; original source bytes match
`examples/windows-cyrillic.tex`. Installed package lists before/after are
byte-identical. This accepts **W1 on current main**, not GUI→PDF.

This isolated **engineering candidate**, until exact-head CI/review/merge, extends
the independent original-W2 auditor: a new WTS-block verdict must match the
separately uploaded read-only native WTS JSON (source/session/state/blocked
reason), and cannot conceal injected GUI claims or physical PNG/gesture traces.
It does not manipulate RDP and does not promote W2b. Real W2b remains blocked
until an already-authorized existing desktop is genuinely **Active/unlocked**
and the full owned-HWND/runtime/GUI checks pass. W2a only historical
`ef95c1c9` physical PASS; W2b **NOT_RUN**, physical Win10 W3 **NOT_RUN**,
stable W4 **NO-GO**. No runner/UAC/accounts/install changes.


## 2026-11-08 — new physical W2b blocker: actual WTSDisconnected; no input attempted

Trusted `main` a5e2335825af4391d380792406ee0d9e529a5a17, exact-main hosted CI SUCCESS:
[CI #42479515561](https://github.com/i-shutov/tikzarium/actions/runs/42479515561),
[D QA #42479515684](https://github.com/i-shutov/tikzarium/actions/runs/42479515684),
[Windows Administrator #42479515669](https://github.com/i-shutov/tikzarium/actions/runs/42479515669).
Personal [Windows Server run #42480008310](https://github.com/i-shutov/tikzarium/actions/runs/42480008310)
completed SUCCESS with **original early artifact #13616951919**
(outer ZIP SHA256 `f98bf0da4906ac6d81994ab0aa88b7197bf21cfb9f1f294787ed721cc4b7bf2e`)
and **original final artifact #13617707472**
(outer ZIP SHA256 `0830406a4b2265caed160444d1ee90e00ab90d93f3cd19b557c395cafe5a3e6e`).
The original GL provenance proves successful QA-only transfer from exact-main CI escrow:
`PAL1000_MINGW_26_2_6`, archive SHA256
`da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388`,
19 original DLL digests, no system installation or product distribution.
**The previous 7-Zip/CDN blocker is cleared on this run; the remaining blocker is different.**

Original `windows-server-w2-interactive.json`: **`BLOCKED_DISCONNECTED_OR_UNKNOWN_SESSION_STATE`**,
at 2026-11-08 12:24 UTC, RDP Session 2, WinSta0/Default,
**WTSConnectState=4 (WTSDisconnected), `input_desktop=UNAVAILABLE`**.
No GUI process/HWND, source gestures, F1 PNG, native dialogs, IME or GUI-origin PDF was tested.
Historical W2a full-window/F1 PASS at ef95c1c9 is preserved but **not transferred** to a5e23358.
Do not change RDP/UAC/accounts/runner services or infer physical W2b PASS.

Independently checked actual uploaded **W1** `owner-admin-proof/product.pdf`:
PDF SHA256 `f3a914670c959b54b321d9cf62b5ebb213c6381e1e6619545b89a640ffb7c1c5`,
one page, MiKTeX-dvipdfmx/XeTeX producer, embedded/subset ArialMT CID TrueType, ToUnicode yes,
extractable `Точка` and `Тест XeLaTeX: Кириллица.`. Original native Rust 1.91.0
GUI PE subsystem 2 / CLI 3, no dynamic VCRUNTIME, actual MiKTeX 26.5 CLI build exit 0,
packages unchanged, disabled shell escape, existing HIGH Administrator trusted-document warning.
This is **W1 PASS** at a5e23358, **not** W2b GUI→PDF.

Follow-up candidate in independent branch `fix/w2b-rdp-session-gate-20261108`:
read-only WTS native query before Mesa staging; exact trusted-main/self-hosted run and
SHA guards; seven fail-closed Windows PowerShell 5.1 tests; original
`w2-session-readiness.json` and a W2 `NOT_RUN` result when disconnected.
Save GL transfer/network work until WTS is Active, but WTSActive is **only a candidate**:
the existing owned HWND/input desktop/focus/PMv2 runtime gates remain mandatory.
W1 native Rust/MiKTeX continues even when W2 is blocked.

**Release verdict:** W1 PASS current server; W2a PASS historical original; W2b NOT_RUN
(disconnected RDP), W3 physical Windows10 NOT_RUN, stable W4 NO-GO.

## 2026-11-08 — exact-main QA archive escrow candidate (no product redistribution)

To avoid personal Server HTTP 504 to pal1000 CDN, new hosted-main **optional** Windows CI step attempts the same original `pal1000 26.2.6` SHA256 `da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388` and uploads it as a short-lived `tikzarium-private-w2-pal1000-qa-only` Actions artifact from that exact-main successful CI run. The self-hosted workflow downloads it only using its already-validated CI run ID, and revalidates source SHA, CI ID, archive source/digest, complete original archive hash and private copied hash before using it in `RUNNER_TEMP` as a non-shipping test overlay. No external package is inserted in Windows portable release or system directories. Absent hosted escrow allows original pinned network method and official MSYS2 fallback; incomplete/forged escrow fails closed and never bypasses SHA. CI step is optional so an unavailable public CDN never suppresses mandatory native release verification. This is a candidate pending exact-head CI and original real Server proof — archive presence is NOT GUI/F1/W2b acceptance.
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
