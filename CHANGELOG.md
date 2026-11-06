# Changelog

## 2026-11-06 — Windows portable VC runtime import hardening (candidate)

- New original-binary audit found both Windows GUI and CLI imported VCRUNTIME140.dll, not bundled in the W0 portable ZIP. This is a clean Windows10 first-use risk; no actual missing-DLL failure has been observed on the target.
- Candidate Windows x64 MSVC static CRT flag plus real PE import-table parser, malformed/VC runtime negative tests, hosted native release import gate and independent trusted-main server proof when Python is available. No installer/runtime/TeX download, no Linux/macOS flag changes.
- Exact-head Windows rebuild/CI/real PE import list/original artifact manual review PENDING, Windows Server Rust/MiKTeX/GUI and physical Win10 remain NOT_RUN. See insights/2026-11-06_WINDOWS_X64_CRT_DEPENDENCY_QA.md.


## 2026-11-05 — Windows ZIP CP1252 console-output regression (candidate)

- Exact PR-head Windows CI [42099748244](https://github.com/i-shutov/tikzarium/actions/runs/42099748244) compiled GUI PE=2/CLI=3, passed four portable negative tests, successfully packaged the Windows ZIP and executed extracted CLI, but failed at final console output: Python 3.13 used cp1252 and could not print Cyrillic in JSON (`UnicodeEncodeError`). The UTF-8 audit file remained intact. This is a CI/report encoding defect; exact-head check remains FAIL, not accepted.
- Print ASCII-escaped console JSON only, preserve full UTF-8 audit bytes, add a strict cp1252 test; reverify exact new HEAD and original assets before expected-head merge. No MiKTeX security bypass, no Windows 10 claim.

## 2026-11-05 — Windows x64 native portable ZIP hosted acceptance (candidate)

- Build portable Windows x64 ZIP from the exact reviewed hosted Windows native release PE32+ GUI/CLI binaries, fail-closed SHA + complete archive manifest/source provenance, then **execute extracted CLI help** from a Unicode/space directory with XeLaTeX unavailable. Include independent tamper/duplicate/PE-role unit tests, original ZIP + JSON audit CI artifacts; no TeX/font bundles, installer or physical GUI claims.\n- Separate self-hosted trusted-main Rust/PE/portable and MiKTeX checks so an unavailable Rust toolchain cannot silently suppress the distinct XeLaTeX diagnostic; MiKTeX requires a non-admin interactive user session. No reinstall or elevated MiKTeX bypass. Current platform priority supersedes older Linux-first document preambles.\n- Original PR-head CI, Windows ZIP, embedded PDF/font/PNG audit, persistent runner and physical Windows 10 GUI: **PENDING until reviewed**.

## 2026-11-05 — Windows release lane, native GUI executable role (candidate)

- Owner changed active priority to Windows x64. Linux RC and hosted evidence preserved without claiming physical Linux/Windows success.
- Original hosted Windows artifact 13401159253 main 4382ca3e had both app.exe and cli.exe PE Subsystem 3 Console; GUI needs 2. Added Rust release-only native GUI subsystem, fail-closed PE roles in Windows portable package, negative unit tests and real Windows build header gate.
- Trusted Windows Server job 41998880215 got checkout/SHA PASS but MiKTeX failed before PDF due to elevated privileges. No bypass, no package installations and no Windows GUI/Win10 PASS. See plans/2026-11-05_WINDOWS_X64_RELEASE.md.


## 2026-11-05 — R5 Linux 1.0.0-rc.1 native reproducible candidate (PENDING)

- Confirmed exact postmerge main 4f3a2ebb: N5/Rust/D QA/I61/N1/D06 SUCCESS; original N5 artifact13395297726 checks: archive manifest 6/6, R1 9/9, R2 6/6, R3 14/14 SHA. This is NOT physical Linux.
- Pin workspace version and Cargo.lock to 1.0.0-rc.1. Offline release packaging checks original native ELF/CLI SHA, deterministic tar.gz, versioned first-use Russian README, provenance, manifest and explicit CANDIDATE_NOT_FINAL.
- Use the same already full-X11-tested native release ELF in the RC and compare binary hashes byte-for-byte. Additional actual ELF reproducibility and negative unit tests are in the existing N5 pipeline, not separate CI-only workflows.
- Physical Ubuntu24 x86_64/X11 workstation acceptance R4 remains NOT_RUN. Final 1.0 tag/release blocked. Preserve R1/R2/R3/N1/N2/N3, Windows/macOS hosted paths and no TeX/font bundling, install/fallback/shell escape.
- New exact branch CI, postmerge and original GUI/PDF SHA evidence: PENDING at this candidate point. See issue #103, plans/2026-11-05_LINUX_1_0_R5_RC.md, insights/2026-11-05_LINUX_1_0_R5_QA.md.


## 2026-11-05 — Linux 1.0 R3 native PDF export no-clobber completeness (candidate)

- Independent review of exact PR #105 head `1df36978`: hosted N5/D QA/Rust/I61 complete SUCCESS. Original N5 artifact 13390653515 ZIP sha256 `fa054edc1254766f878aadfae2a1b1706cf25182169478d3ce98191cc3fc977e`; R2 original X11 PNG+geometry SHA256SUMS 6/6 independently matched. At 200%/1920×1080 actual extracted release client (2,40;1886×1023) fits, unlike old clipped 1120px. Physical screen remains NOT_RUN.
- R3 independent real pointer click on the extracted PR binary with no XDG portal confirmed the native Open menu exists, does not crash, and reports the missing portal with manual typed-path fallback. This is NOT native-dialog acceptance: no real picker was shown.
- Fix a user-data flaw introduced by the first R3 candidate: direct create_new + write could leave a truncated, visible PDF on write failure. Stage the entire bytes into a same-directory temporary file, sync, then `persist_noclobber`; refuse existing targets and clean temporary files on errors. Add Unicode-name, no-overwrite, byte-integrity and invalid-parent Rust tests. Current new exact-head CI/PDF/X11 review PENDING; R3 real XDG picker, R4 physical desktop and R5 tag still gated.


## 2026-11-05 — Linux R2/R3 exact rustfmt recovery (candidate)

- GitHub hosted Rust fmt on prior HEAD failed before Rust tests: exact main.rs formatting diffs. Apply original 0.33/Rust 1.91 formatter suggestions to R2/R3 integration code and correct a CRLF fixture (one actual escaped CRLF rather than literal backslash characters). Source-tree lease refreshed; this changes no accepted N1/N2/R1 behavior. New exact-head CI and GUI source/PDF artifacts PENDING.


## 2026-11-05 — Linux 1.0 R3 native system file picker candidate

- Add explicit Open, Save As and PDF Export native file-picker commands to the File menu. On Linux use rfd's XDG desktop portal, with manual typed-path workflow retained for portal-less and offline X11. Do not silently install a portal or TeX. Protect dirty-Open with existing confirmation, reject native Save As overwrites of occupied unrelated TeX, preserve Unicode PathBuf, and export new PDFs atomically with create_new (no overwrite races). Source/PDF integrity unaffected.
- R3 is **NOT PASS** until real Ubuntu/X11 desktop with XDG backend shows actual dialogs, Cancel, Unicode/Open/Save/export and safe existing-file rejection; hosted Rust tests do not count as this acceptance. R2 exact-head visual DPI, R4 desktop and R5 publication remain gated.


## 2026-11-05 — Linux 1.0 R2 DPI-safe viewport candidate

- R2 prior real packaged X11 200% failure: 1920×1080 client at y22 plus height1120 clipped 62px. Reduce immutable 560pt minimum height to 440pt, preserve DPI/font choices, and request monitor-relative inner size only when actual outer window is oversized. Do not affect source, PDF, external XeLaTeX or accepted R1.
- Add Rust 1.0/1.25/2.0 bounds test and exact-head N5 extracted release X11 three-scale PNG/geometry/sha gate. All new code, native-screen screenshots, and source/PDF regressions PENDING until CI and independent review. Physical Linux still NOT_RUN. R3/R4/R5 open.


## 2026-11-05 — Linux 1.0 release freeze: native unsaved-close guard (candidate)

- **Safety defect:** reproducible dirty TeX loss on normal packaged Linux/X11 WM close despite successful dirty-Open testing. Use egui root `close_requested`/`CancelClose` and a blocking Russian Save/Discard/Cancel modal; do not exit after rejected path, failed save or Cancel. Same safe validation as scratch Save; do not overwrite unrelated TeX or change existing source/Undo from showing the dialog.
- Shared Rust unit tests cover root viewport Close interception and Unicode/occupied path validation. Add real **extracted portable release** X11 WM-close/Cancel/source-preservation/clean-Save regression to the N5 workflow with original screenshots and SHA; preserve the existing exact I61 app-tree lease.
- This is **PENDING** exact PR-head Rust/macOS/Windows, hosted X11, original artifact and manual review. R2 (200% clipped status), R3 (Linux file pickers), R4 (qualified X11 desktop) and R5 (versioned final release) remain separate open blockers. No 1.0 tag or physical-machine PASS. See `plans/2026-11-05_LINUX_1_0_R1_SAFE_CLOSE.md` and `insights/2026-11-05_LINUX_1_0_R1_CLOSE_QA.md`.


## 2026-11-05 — Linux N5 real portable launcher project directory and packaged source-to-PDF (candidate)

- Verified current merged main `ddf018a7d57f963fd8491c82ef303e9223e3f41c`: postmerge hosted Rust/D QA/N1/I61/N5/D06 workflows SUCCESS. Secondary trusted Windows Server QA failed, not a Linux gate.
- Fix a real portable UX defect: the existing `launch.sh` cd'ed into the extracted application directory before launching egui, so relative GUI Save/Export went there rather than to the user's working project, potentially failing for read-only bundle. Now resolve the ELF relative to the launcher while preserving caller CWD. Executed offline shell tests cover spaces, Unicode, arguments and PATH lookup.
- Extend the same Linux N5 **product** workflow beyond extracted release GUI boot to the actual extracted launcher → six native mouse tools → editable TeX/CRLF → Save/Open/F1/Undo → external XeLaTeX PDF Unicode/fonts, plus real N2/N3 library and completion path. Fail-closed source-tree, manifest and original PNG/.tex/PDF/SHA upload.
- New PR exact-head CI and manual original-artifact review PENDING. Physical Linux, HiDPI, native dialogs, Wayland NOT_RUN. Existing Windows/Mac Rust/TeX paths unchanged.


## 2026-11-05 — N5 restore Unix worker timeout test; cross-platform release gate (candidate)

- On PR head `837c4ce6`, the real packaged Linux X11 release, full I61, fonts, B42 and Windows Rust passed, **but** Linux/macOS Rust and N1 failed with reproducible `E0423` in `pdf_navigation.rs:241`; it was a literal `\\n` in a Rust `//` comment that inadvertently commented out the Unix fixture path declaration. A Windows-only PASS did not cover this `#[cfg(unix)]` regression.
- Restore actual source line breaks, retain real sleeping Unix child timeout/kill test (no spinning CPU), and update the exact app/src git-tree lease for full I61 Python and workflow atomically. Production Poppler timeout, source preservation, fonts, PDF, Windows/Mac and N5 package behavior unchanged.
- Existing previous-head N5/I61 and PDF artifacts are not proof of the **new** HEAD. Release blocked until new exact-head Linux/macOS/Windows full Rust, N1, I61 and N5 X11 artifact checks all pass, with original PNG/.tex/PDF hashes reviewed. Physical Linux/HiDPI/Wayland NOT_RUN.


## 2026-11-05 — N5 corrected X11 viewport and exact-head regression recovery (candidate)

- Original Linux N5 extracted release [41937982111](https://github.com/i-shutov/tikzarium/actions/runs/41937982111) passed; independent screenshot and xdotool geometry show X=94, Y=71, 1180×680 fully within the 1366×768 screen. The N5 cropped-bottom-screen regression is fixed for hosted X11; physical Linux desktop/DPI/Wayland NOT_RUN.
- Full six-gesture I61 [41937982066](https://github.com/i-shutov/tikzarium/actions/runs/41937982066) failed on the first tool. Original `01-line-group-popup.png` clearly shows button centers x=532/585/639/693; stale x=599 click selected **Rectangle**, not Line, and a real Rectangle command was generated. Recalibrate geometry/arrow/node and seventh-tool x coordinates using the original screenshot. Keep source-tree exact-SHA lease and the existing owner-command/Save/Open/Undo/PDF gates. Until rerun, six gestures and full N3/PDF remain NOT_RUN at this head.
- D QA [41937982165](https://github.com/i-shutov/tikzarium/actions/runs/41937982165) Linux Rust: 115/116 app tests passed, one process-timeout test used a CPU-spinning POSIX shell loop and returned a non-timeout error. Replace fixture with `exec sleep 10` to test actual bounded kill without resource contention; preserve strict timeout and elapsed tests and include unexpected error diagnostic. Windows/macOS Rust succeeded; hosted Windows Poppler Chocolatey install failed before product tests, distinct infrastructure issue. No merge until exact-head full acceptance.


## 2026-11-05 — N5 real Linux portable viewport-fit regression (candidate)

- Independently audited original N5 artifact and exact-head four successful workflows. Client X11 geometry (2,40;1366×768) overflowed 1366×768 compact screen by 40px, clipping the bottom status bar despite successful workflow.
- Start production viewport at 1180×680 logical points, preserve resize/maximize and 850×560 minimum, add a Rust desktop-chrome test and a real N5 xdotool bounds gate. Refresh fail-closed I61 app-tree SHA in workflow and Python.
- N5 Russian README now distinguishes PR source SHA from merged main. New exact-head Rust/GUI, original screenshot and PDF verification remain PENDING; physical Linux/DPI/Wayland NOT_RUN.


## 2026-11-05 — Linux N5 native portable bundle and extracted-X11 launch (candidate)

- B43 PR #100 squash-merged on main `26abc5461bba06d610394080ffe23bbbf92cc6bb` after **seven** exact PR HEAD green workflows and original X11 PNG/source/PDF/font/SHA review. Main push acceptance must be tracked separately.
- New native Linux x86_64 target in existing cross-platform N5 offline packager: fail-closed ELF64 little-endian AMD64 executable/PIE program-header checks, immutable binary SHA256, deterministic `.tar.gz` and executable `launch.sh`, README, CRLF fixture and manifest/provenance. Windows PE and macOS ARM Mach-O compatibility unchanged.
- Add actual hosted native Linux release build → archive extraction/hashes → offline extracted CLI → **real X11 launch of packaged release binary and original 1366×768 screenshot**, with logs/window geometry/artifact. Synthetic header tests are not an app QA substitute. The Linux N5 workflow runs only on relevant paths, so does not create perpetual CI-only churn.
- Update stale README from 2026-10-31 W01/Windows-first summary to the currently accepted Linux-first product. **Current N5 build and screenshot acceptance PENDING until exact-head workflows finish; physical desktop/Wayland/other distros, DPI and release installer NOT_RUN.** See plans/2026-11-05_LINUX_N5_PORTABLE_RELEASE.md and insights/2026-11-05_LINUX_N5_PORTABLE_QA.md.


## 2026-11-04 — B43 full exact-head GREEN and real wide/horizontal UX gate (candidate)

- On exact PR #100 HEAD \`a71efb96d7bd6ca44951a4f7ac7018f44e02f10a\`, seven pull-request workflow conclusions are SUCCESS: Rust CI (Linux fixture / hosted Windows & Mac), D QA matrix, I61 full real Linux/X11, B42 screenshot bootstrap, N1, PDF/font and D06. No hidden pre-step CI blockage. Original B42 artifact 13362594222 and I61/N2 artifact 13362229988 downloaded. SHA256 checks across B42 6/6, I61 75/75, N2 42/42 all match reports. I61 reports actual six GUI gestures, Undo/Save/Open/CRLF, N2/N3 library source edits and external XeLaTeX PDF; pdffonts confirms embedded DejaVuSerif in inspected figure.pdf. This is hosted X11, not native packaged Linux/Wayland or physical Win/Mac.
- Independently viewed B42 1366x768 running app screenshot with no-wrap ON/OFF: source, central canvas and inspector coexist and long opaque/Cyrillic comment remains on one physical row OFF. **Missing evidence**: actual horizontal navigation/caret-end and a real 1920x1080 window. Extend existing B42 real X11 scenario (not a separate PR) to capture \`05-long-line-end-caret-horizontal-candidate.png\`, poison-and-copy source bytes after keyboard End, resize the actual X11 display/window to 1920x1080 and capture \`06-wide-1920x1080-workspace-candidate.png\` with framebuffer-size assertion. Treat screenshots as candidate until original manual review; do not claim horizontal scrolling or legible wide DPI before inspection.
- Existing full I61 source-tree lease unchanged, because this change touches only B42 QA and release documents, not Rust \`app/src\`. New exact-head B42 and full CI must complete before merge. Linux packaging, native Wayland and user physical desktop remain NOT_RUN.


## 2026-11-04 — B43 production-equivalent ScrollArea regression (candidate)

- On exact HEAD `4ce4142384b2ba6ed8b7d120bba44384308e25bf`, Rustfmt passed across platforms. [D QA 41911049405](https://github.com/i-shutov/tikzarium/actions/runs/41911049405) executed real Rust workspace tests and exposed **one** failure out of 115 in `b43_egui_soft_wrap_preserves_opaque_unicode_crlf_and_preferences`: `assertion failed: ui.available_width() > 260.0`, same on Linux, macOS and Windows. All 114 other app tests passed. This is a **test harness layout error**: its `SidePanel` contained an infinitely wide unwrapped `TextEdit` directly; production actually nests that edit in `ScrollArea::new([!soft_wrap, true]).auto_shrink([false, false])`, which constrains the left panel while allowing horizontal scrolling.
- Update the test to use **exactly the production ScrollArea configuration**, without weakening either its central-canvas-width assertion or its visual-row-count assertions, and without modifying the proven source layouter. A previous-head original B42 `03`/`04` X11 screenshot pair explicitly shows wrapped/unwrapped long Cyrillic/opaque source; all 6 B42 and 117 I61/N2 file SHA256 entries checked against their reports (no mismatches). However horizontal scroll and 1920×1080/DPI remain unobserved; no fabricated PASS.
- Re-pin exact I61 app/src tree in workflow and Python script after changing the test code. New exact-head Rust tests and original I61 X11 + B42 screenshots must be accepted before merge. Linux native installer/Wayland NOT_RUN; Windows Server remains secondary.

## 2026-11-04 — B43 exact-head rustfmt unblock after Linux/X11 GUI PASS (candidate)

- At PR #100 HEAD `7add27f66889c200f346f13b38e203b93a8f7703`, genuine I61 Linux/X11 [41901598076](https://github.com/i-shutov/tikzarium/actions/runs/41901598076), B42 [41901598041](https://github.com/i-shutov/tikzarium/actions/runs/41901598041), N1 [41901598115](https://github.com/i-shutov/tikzarium/actions/runs/41901598115), PDF fonts [41901597985](https://github.com/i-shutov/tikzarium/actions/runs/41901597985) and D06 [41901597894](https://github.com/i-shutov/tikzarium/actions/runs/41901597894) succeeded; **Rust native CI** [41901597919](https://github.com/i-shutov/tikzarium/actions/runs/41901597919) and **D QA** [41901598146](https://github.com/i-shutov/tikzarium/actions/runs/41901598146) failed at `cargo fmt --all -- --check`, **before** executing the corrected no-wrap regression tests.
- Exact Rust 1.91.0 logs (Linux + Windows) show a **single** rustfmt diff in `crates/tikzarium-app/src/main.rs:314`: collapse `if soft_wrap { wrap_width } else { f32::INFINITY }` onto one line. Apply this formatting-only change without altering tested layouter logic, without bypassing fail-closed I61 source SHA and without touching accepted N1/N2/N3.
- The previously inspected B42 old-head screenshot with unchecked `Перенос` still visually wrapped long Cyrillic source, so it was NOT evidence of functioning no-wrap. The new `LayoutJob` galley change remains a candidate until `b43_egui_soft_wrap_preserves_opaque_unicode_crlf_and_preferences` runs and proves distinct row counts, and original new-head screenshots show horizontal scrolling. Do **not merge** on I61 green alone; require full current-HEAD Rust CI/D QA, original GUI PNG/.tex/PDF/SHA, hosted cross-platform checks and manual visual review. Linux packaged release / Wayland NOT_RUN.

## 2026-11-04 — B43 real soft-wrap OFF repair after successful I61 X11 (candidate)

- Exact-head `5db42b46` restored public hosted Actions: independent I61 Linux/X11 six-tool + N2/N3 + external XeLaTeX/PDF passed; B42 screenshot bootstrap, N1, PDF-font and D06 passed. CI and D QA remained RED because the same Rust UI unit test failed on Windows and Linux (`b43_egui_soft_wrap_preserves_opaque_unicode_crlf_and_preferences`, `rows=[33,33]`). macOS Rust matrix was cancelled, NOT PASS.
- Root cause confirmed in egui 0.33.3: `TextEdit::desired_width(f32::INFINITY)` is still clamped to available panel width; both checkbox states wrapped the long Unicode source even though X11 screenshot changed the checkbox. Add a real TextEdit layouter that explicitly uses infinite galley width when visual wrap is disabled; retain native code-editor focus, Cyrillic, source bytes, CRLF and Undo. Tighten the regression to assert no-wrap stays at physical source rows and wrap increases visual rows.
- Original B42 screenshot 03/04 from previous run proves UI checkbox selected/unselected but source lines visibly wrap in BOTH — the earlier claim that the checkbox controlled wrapping was premature. Mark B43 no-wrap acceptance FAIL on old head, despite exact source clipboard equality. Current patched HEAD requires new Rust test and actual Linux/X11 before acceptance; no merge with red CI, and native Linux package/Wayland remain NOT_RUN.

## 2026-11-04 — B43 original X11 acceptance and F1 caret QA precision (candidate)

- Public GitHub Actions now execute real checks. Original I61 PNG proves N3 QA clicked a **comment**, not the intended source library line; fix coordinate and verify selected native TextEdit literal `arro` before F1/Complete, preserving fail-closed source/PDF/Undo acceptance.
- Independently reviewed original B42 1366×768 source/canvas/inspector, toggled wrap ON→OFF without source bytes changing, unobstructed canvas and legible Cyrillic. Apply four exact Rustfmt corrections from actual Windows/macOS logs. Full new exact-head CI/visual/PDF acceptance pending; Linux-first unchanged.

## 2026-11-04 — B43 return-to-source focus and unobstructed canvas (candidate)

- The original X11 long-source screenshot shows an undismissed floating geometry palette occluding the central drawing. A real click in the editable TeX now closes that palette, while hover/typing/F1 do not change selection and no source/CRLF/opaque/Undo bytes are rewritten.
- Add an actual egui TextEdit pointer press/release UNIT_EVENT test, carry this behavior through the existing X11 screenshot bootstrap, update exact I61 app-src tree lease. Source/inspector proportions and visual-only wrap from existing B43 remain unchanged.
- **Evidence blocker:** exact pre-change HEAD `44e09cc0` has seven failed workflow conclusions with zero reported job steps, no I61 artifact and job logs returning GitHub BlobNotFound; causes are not attributable to Rust or UX without runner logs. Fresh CI and real X11 screenshot/font/PDF acceptance for this candidate remain PENDING. Do not merge or rerun blindly.


## 2026-11-04 — B43 real UI evidence and Rust exact-head gate recovery (candidate)

- Reviewed original running 1366×768 screenshot: source/canvas/inspector are visible and Cyrillic source wraps; `↵` and `●` header glyphs are unsupported. Replace with legible `Перенос` and `Изменён` labels without font downloads.
- Apply exact rustfmt corrections identified from failing CI, keep exact full I61 app-tree guard and update its SHA in both workflow and Python. Existing B42 X11 adds a real candidate wrap-click fourth PNG and source clipboard bytes before/after; check outputs independently.
- New CI/I61/source/PDF/font evidence PENDING; Linux package, Wayland and physical Windows/Mac NOT_RUN.


## 2026-11-04 — Linux B43: responsive canvas and visual-only source wrapping (candidate)

- Calculate source maximum from the live egui rectangle after inspector/tool rail, reserving room for real canvas and exact PDF.
- A compact source header shows filename, dirty state and full path on hover. Default visual soft wrap is user-toggleable and persisted; opt out for horizontal scrolling. No TeX, CRLF, opaque macro, Unicode or Undo changes.
- Rust width/egui wrap/source-preservation/serde tests added. Exact-head CI, real 1366×768 X11 PNG and original PDF/font/TeX SHA independently inspected **NOT YET**.
- See plans/2026-11-04_LINUX_B43_WORKSPACE_ERGONOMICS.md and insights/2026-11-04_LINUX_B43_WORKSPACE_QA.md.


## 2026-11-04 — Linux UX iteration 1: readable F1 statuses and contextual Help hierarchy (candidate)

- Real I61 X11 `43-n3-f1-catalogue-radius.png` review found cramped 12pt run-on source-parameter metadata and five status fields, plus a redundant generic help block after successful F1. This is a user-facing readability issue, not a failure of N3 recognition.
- Use separate readable body text for type/units/choices/default provenance; display five independent installed/project-loaded/engine/tool/help evidence rows without UNKNOWN → PASS; suppress generic fallback only when exact source parameter context exists. Shared C semantics and source editing remain unchanged.
- Add unit regression for independent five-status semantics and retain the **same real X11 six-pointer/Save/Open/F1/PDF** evidence workflow, with exact app source tree lease updated for this code. Actual results and visual acceptance **PENDING**; Windows/macOS architectural support unchanged.
- See `insights/2026-11-04_LINUX_N3_F1_ERGONOMICS_QA.md`.


## 2026-11-04 — Native Ctrl+O fast-release repair and real N3 caret F1 on Linux/X11 (candidate)

- Exact-head Rust fmt across Linux/macOS/Windows rejected two one-line `Modifiers { shift: true, ..command }` literals in the new event regression, with no other proven Rust failure. Corrected both to rustfmt canonical multiline syntax and re-pinned existing I61 actual app source tree accordingly; original F1 evidence preserved, exact-head revalidation still required.

- Real I61 [41833261353](https://github.com/i-shutov/tikzarium/actions/runs/41833261353) independently confirmed: all six GUI pointer gestures, external XeLaTeX/Unicode and embedded PDF fonts, inspector Apply+Undo, two-file Open/CRLF, dirty Open Cancel, and **real F1 help on circle radius under the actual editable TextEdit caret**. Ctrl+O alone failed to reload the externally changed file; the visible Open toolbar did reload it and the full N3/F1 test then completed. Overall job **FAIL correctly** because the keyboard shortcut is a release requirement. Original artifact ID `13324366740`.
- Correct global app file shortcuts to read **key-down event-local modifiers** instead of relying on end-of-frame `input.modifiers`, which can lose a fast Ctrl+O release under X11. Add Rust regression for pressed/released within one frame, no-command/Shift negative and Save/SaveAs/Build; preserve macOS Command abstraction. Re-pin the SAME I61 app tree in workflow and script. This production fix's exact-head real GUI/CI PASS is **PENDING**; no Windows10/Mac physical claims.

## 2026-11-04 — Linux real-GUI exact-head failure localization (PR #98, in progress)

- The exact-head I61 Linux/X11 run `41825209680` passed genuine six pointer tools, Save, XeLaTeX PDF/embedded fonts, inspector Apply/Undo and two-file CRLF Open/Save, but **FAILED** in real Ctrl+O external-file reload at `Reopened GUI document cannot be edited and saved`. The original `36-second-crlf-saved.png` and `37-second-reopened.png` show no visible reload; native keyboard acceptance is **NOT PASSED**. D QA, CLI/TeX, Rust and hosted cross-platform checks passed on the same head; no false blanket PASS.
- Existing I61 full GUI scenario now captures the *actual in-editor selected source via X11 Ctrl+A/C* after Ctrl+O. If the external marker is missing, records an explicit `keyboard_reopen=FAIL`, exercises the visible native Open button for recovery, and continues testing real F1/caret/opaque/CRLF without suppressing the keyboard failure. Source-tree SHA lease unchanged: QA script only, no production egui edit or guessed keyboard fix. Exact-head CI and original visual acceptance **PENDING**.


## Release-plan decision — 2026-11-04: first Linux full application, cross-platform code maintained

- Owner moved first **complete, ergonomically accepted desktop release** to Linux x86_64. Native Rust/egui architecture, external XeLaTeX/MiKTeX selection, source/Undo/CRLF/opaque safety and single-C Russian help remain shared across Linux, Windows and macOS from day one.
- Physical Windows10/MiKTeX and Mac ARM/XeLaTeX GUI qualification and their release packages follow the Linux release; hosted cross-platform CI remains mandatory. Registered Windows Server runner is secondary QA only. N4 domain packs not first-release blockers.
- Adds `plans/2026-11-04_LINUX_FIRST_CROSS_PLATFORM_RELEASE.md` with genuine Linux/X11 GUI, ergonomic iteration and native Linux packaging acceptance gates. **Documentation/release-priority change only; not a product GUI PASS.** Existing PR #98 code/CI must be checked independently.


## Unreleased — N3 source-caret parameter F1 + D06 truthful Windows QA (candidate)

- Resolve 27 exact literal placeholders across six C-catalogue TikZ command templates under the actual editable .tex TextEdit caret; node mode remains inspector-only. Inherit Russian syntax, parameter type/units/choices, verified editor preset vs TikZ default UNKNOWN, effect, example, manual anchor and package provenance from the SAME C registry; five independent availability signals remain visible.
- No TeX parser or guessed macro expansion: comments, verbatim, catcode, opaque values, partial templates and unsupported paths fail closed to UNKNOWN. Read-only F1 does not change revision, Undo, source CRLF or Cyrillic. Add catalogue-driven 27-case Rust fixture, egui F1 key-frame test and real I61 Linux/X11 full-GUI F1/CRLF evidence capture using actual Studio file Open. Exact-head CI/X11 PNG original review remains PENDING at authoring.
- Fix D06 hosted MiKTeX green despite 1/16 Python glyph-audit unit failure: isolate mocked XeLaTeX from the actual MiKTeX environment, and explicitly fail the multiline PowerShell step for each nonzero Python LASTEXITCODE. Recheck external MiKTeX, PDFs, fonts and original logs before declaring PASS.
- Windows-first release remains Windows 10 x64 + user's separately installed MiKTeX. Windows Server interactive GUI / Windows 10 physical acceptance NOT_RUN; N4 and physical Mac/Linux qualification not on the first-release critical path.


## Unreleased — N3 C-backed source-caret library completion (DRAFT)

- Native Studio TextEdit caret now scopes F1 offline help to one literal \usetikzlibrary{...} name. Six C library names yield original syntax, examples, Russian explanation, provenance and five separately observed availability axes; clicking Complete applies exactly one revision-checked C patch with visual Undo.
- No opaque/macro/multi-name/comment/body guessing, auto-installation or compiler change. C lexical/negative/stale/CRLF tests and app Session integration regression added. Exact-head CI, real GUI X11 source/Undo/Save/Open/XeLaTeX screenshots/PDF/hash and physical Windows10/M1/M4 are NOT_RUN until proved; no new workflow.


## Unreleased — N5 native unsigned portable preview packaging (CANDIDATE, physical GUI NOT_RUN)

- Add offline provenance-locked native preview packager, taking independently verified CI app/CLI binaries; reject wrong PE32+ AMD64/Mach-O ARM64 or hash mismatch. No compilation, silent installers, TeX distribution, fonts or source rewriting.
- Package Windows 10 x64 portable ZIP and native macOS ARM .app directory inside tar.gz with executable bit and Info.plist, plus CRLF/opaque Cyrillic QA fixture, Russian physical acceptance steps, exact-source/CI PROVENANCE.json and per-file SHA-256 manifest. Both outputs UNSIGNED and NOT installers. Explicit NOT_RUN physical Win10/M1/M4, Mac Gatekeeper/launch/notarization, fonts/themes/IME/installer.
- Local Python negative architecture/hash and archive metadata tests 3/3 PASS; the existing D QA matrix now runs the N5 packager test module on three hosted OS and adds a CLI tamper-before-output regression. This closes a real missing-CI-coverage gate in the same N5 user-facing PR; exact-head CI still required. External Linux TeX Live fixture XeLaTeX/PDF DejaVuSerif check is not macOS/Windows acceptance. Existing main postmerge hosted MiKTeX job FAIL before TeX on upstream installer connection timeout, not verified product failure; no CI rerun or workflow edits.

## Unreleased — N3 semantic help search + observable external source reload (CANDIDATE)

- Extend existing single-C-catalogue Russian offline help search to index parameter kinds, units, allowed choices and editor presets, not just prose/examples. No new TeX parser, invented upstream defaults, duplicated tool schemas or package installation.
- Strengthen the existing Linux/X11 N2+N3 user flow after post-merge FAIL #41560989884: a real Studio File-menu Open replaces the unobserved Ctrl+O, the source-pane image must change visibly before editing, then real TextEdit appends a distinct marker, GUI Save records its own screenshot, and exact CRLF/opaque bytes and external XeLaTeX Unicode PDF/fonts must match. Document::save_to external-conflict protection stays intact.
- The original premerge real GUI pass remains HISTORICAL. This revision's exact-head GUI/CI and manual original-artifact audit are PENDING. Physical Windows 10/MiKTeX, Mac ARM M1/M4/XeLaTeX, signed installer and broad N3 completion remain NOT_RUN/PENDING; no N4 packages.

## Unreleased — N2/N3 source libraries + external installation evidence (candidate; Studio X11 NOT_RUN)

- Enrich the ONE C library catalogue to six entries including `shapes.geometric`/`shapes.misc` with manually specified PGF probe paths (notably `pgflibraryarrows.meta.code.tex`), Russian help and verified source examples. No speculative CAD tools.
- Cache per-library read-only file observations from the selected user XeLaTeX at startup and explicit Refresh; preserve five independent installed/loaded/engine/tool/help axes. `Unavailable` remains UNKNOWN, not ABSENT.
- Fix core/manifest MiKTeX `findtexmf` support and stop inspecting an arbitrary PATH TeX Live helper. C/library negative tests and real egui event-source preservation cover declared contracts.
- First PR #93 CI: Rust formatting preflight failed (corrected), a legacy four-library count assertion failed (updated), while real Linux/X11 N1 remained PASS. N2 QA driver clicked through an expected dirty-scratch Open modal and failed before any library action; this was a QA control-flow defect, not proven production regression. Exact-head rerun and original Library Connect/Save/Undo/Open/PDF acceptance still required. Physical Windows10/M1/M4 and installers NOT_RUN.

## Unreleased — I64 real pinned Inspector Apply → one minimal TikZ source edit → Undo (PENDING)

- Extend the SAME I61 hosted Linux/X11 six gestures/Save/Open/CRLF/F1/Undo/XeLaTeX script with real selected Node property TextEdit and pinned shared-C Apply, prove draft-only source integrity, one-command patch and exact visual Undo. No new workflow/PR/B code. I63 earlier head SUCCESS and original 64/64 SHA/manual reviewed; new I64 head acceptance pending, physical Win10/M1/M4 NOT_RUN.

## Unreleased — I63 dual B42 source-tree lease & real File Open focus snapshots

- Pin workflow + script to current B42 app/source Git tree `72499c6e31d4cf6a2a36d16fb7bc8b10a9d66acb`; reject mismatches before TeX Live installation. Capture real focus/Ctrl+A/paste screenshots while retaining all six native gestures, source/Undo/Open/PDF assertions. NOT_RUN full GUI and physical hosts until exact-head artifact audit.

## Unreleased — I63 B42 P0 File Open integration lease (actual X11 NOT_RUN at commit)

- Merge frozen B42 File TextEdit click-to-edit production repair into existing stacked #92 as a second-parent exact SHA, preserving all prior D QA changes; move I61 app-source-tree guard to `72499c6e31d4cf6a2a36d16fb7bc8b10a9d66acb`. Do not disable source-tree provenance or replace external TeX Live with MiKTeX in Linux/X11 QA.
- B42 exact-head Rust/Clippy/D QA/hosted MiKTeX/N1 XeLaTeX/fonts passed before re-lease; product popup fix is UNIT_EVENT until real two-file Open/edit/Save/reopen and dirty Cancel succeed with original PNG/source/PDF hashes reviewed. Inspector Apply and physical Win10/M1/M4 remain NOT_RUN. No merge to main.

## Unreleased — I62 real N1 GUI Help, Undo and two-file I/O acceptance (QA ONLY)

- Extend existing stacked #92 independent Linux/X11 driver to test actual F1 open/close, TextEdit Ctrl+Z, visual Undo, second CRLF/opaque-source GUI Open/Save/Reopen and dirty Open cancel; separate NOT_RUN until exact-head CI and manual artifacts. No B/C/A production edits.
- Diagnose exact I61 QA head f3aa1ea7 cancellation before GUI (45-minute Azure apt mirror stall); use canonical Ubuntu archive and bounded package retries/HTTP timeouts, never replace external XeLaTeX or waive evidence.

## Unreleased — I61 independent real B42 acceptance (six-gesture subvertical PASS; N1 NOT_ACCEPTED)

- CI transition: historical B41 I51/I53/I57 fixed-tree X11 workflows remain manually runnable at matching B41 revision, no automatic false-red main runs; I61 exact-B42 six-gesture/source/PDF regression now runs for main PRs and pushes. Real B42 Open/Undo/Apply/F1 and physical targets are still unaccepted release gates.

- Re-lease existing #92 stacked QA onto B42 production HEAD `91e2d8201cd0` with native C six-gesture X11 driver; no changes to A/B/C/E/F production. Exact app-tree provenance remains fail-closed.
- Replace broken doubled-escape `pdffonts` parser with all-font embedding audit; four offline positive/negative tests run before installing external XeLaTeX. Actual GUI source/Save/Open/Undo/help/PDF is NOT_RUN until new exact-head artifact acceptance. Physical Win10/Mac ARM NOT_RUN.


## Unreleased — B42 redesigned Studio and dedicated user's MiKTeX Windows Server QA (PENDING)

- Follow-up from real B42 X11 screenshot review: restore a dark Midnight default and readable 14pt source/body fonts, relocate grouped palette away from source, search the live C registry instead of hard-coded packages, and keep manual PDF zoom stable when selecting PDF. Exact-head reacceptance PENDING.

- Replaced repeated long tool buttons with native egui vector icons in four grouped floating palettes. No font-file asset or second PGF renderer; native C-catalogue commands and source-first semantics retained.
- Added a concise icon toolbar, permanently editable TeX beside the center drawing/PDF, independent Properties/Libraries/Help tabs, persistent workspace preferences and collapsed-by-default diagnostics. Classic UI remains temporarily available for regression comparisons.
- Added a manual main-SHA-gated GitHub Actions test for a dedicated user Windows Server runner and a no-auto-install MiKTeX/locked-Rust proof script. Runner connectivity and physical Windows10/M1/M4 are NOT_RUN; this is not GUI Session proof.
- Exact-head Rust/GUI/Windows CI and separate post-merge CI NOT_RUN at authoring. No release claim.

d — I60 independent B41 real-X11 inspector acceptance (PR #90; PDF preview/F1 recheck pending)

- Extend the same stacked I60 QA gate to re-run existing I46 dirty Open, I47 six held-pointer gestures, I53 positioning/help and I57 four-library real-X11 workflows on the **exact B41 app/src tree**, preserving fail-closed source/PDF/hash predicates and explicitly provisional B40-derived coordinates. Old head X11 failures remain NOT_RUN until new exact QA head plus manual artifact review. No production-code changes.
- Add a separate exact-B41-source-tree Linux/X11 workflow exercising the **real egui window**: native Circle pointer → actual property TextEdit → unchanged source while draft pending → pinned C-backed Apply changing only selected command and metadata → native TextEdit Ctrl+Z history fence → visual Undo → Save/Open two distinguishable files including a CRLF/opaque Cyrillic source, followed by GUI external XeLaTeX PDF. Captures immutable sources, PDF, screenshots and per-file SHA-256; no production Rust/C or external TeX package installation changes.
- First exact QA head `8402b0e`: [real I60 X11 run 41397220307](https://github.com/i-shutov/tikzarium/actions/runs/41397220307) SUCCESS; 20/20 independent artifact SHA-256 verified. Screenshots confirm property draft vs source, pinned Apply, exact inverse Undo and separate CRLF GUI Open. Rendered PDF contains visible native circle + Cyrillic macro with embedded DejaVuSerif.
- **Two gaps explicitly rejected by visual review:** actual screenshot 13 exact-PDF panel is solid white although the independently rendered PDF contains ink, so PDF **preview visibility is NOT accepted**; screenshots 13 and 14 are byte-identical, so the earlier bare F1 key was **not proved** (active tool reset after GUI reopen). Follow-up QA probes genuine Fit Page and reselects Circle before F1, collecting screenshots; no PASS until new exact-head run/artifact review. Physical Win10/MiKTeX and M1/M4 remain NOT_RUN. #90 is stacked QA draft against #89; neither merged to main.

## Unreleased — B41 pinned C-backed parameter Apply and post-Open F1 guidance (PR #89)

- Fix real I60 X11-observed F1 no-op after GUI Open/Reopen clears the selected TikZ tool: the pinned inspector now shows Russian next-step guidance. All detailed syntax/defaults still come from C; add real production-handler `egui::Context::run(RawInput)` key-frame test. Fresh exact-head CI and X11 screenshot acceptance required; this is not physical GUI proof.
- In the native egui inspector, move the selected-command Apply action above the independently scrolling property list, next to visual Undo, with a Russian draft-not-committed warning. The button activates only for a unique, byte-validated C-owned command with changed parameters; both Apply controls reuse the same revision-checked Session/C minimal source patch. The ordinary editable .tex file and opaque macros remain authoritative.
- Add real `egui::Context::run(RawInput)` UNIT_EVENT coverage for radius TextEdit → Ctrl+A/type → Apply/Undo → byte-exact disk round-trip, plus a second **260-pt production SidePanel and scrollable inspector** event test targeting the actual wrapped pinned action and preventing double writes. File I/O in a unit test is **not** a GUI Save/Reopen.
- B41 exact earlier SHA `671fb4f`: Rust/D QA (93/93 app, 56/56 core), hosted Windows/macOS Rust, XeLaTeX, Unicode and hosted Windows Server MiKTeX PASS. Three D-owned real-X11 suites rejected the changed app tree before GUI; genuine B41 X11 + combined inspector/manual Ctrl+Z acceptance and all physical Win10/M1/M4 remain **NOT_RUN**. New compact test on the next head needs fresh exact-SHA CI and manual X11 QA; this entry is not release acceptance. PDF from external XeLaTeX alone is authoritative; provisional guide not calibrated.

## Unreleased — I59 direct XeLaTeX QA MiKTeX offline policy (candidate exact-head CI NOT_RUN)

- Close an offline safety discrepancy: production Rust already passes `--disable-installer` on MiKTeX, but direct Python figure-glyph and five scientific extension XeLaTeX QA fixtures previously did not. New shared read-only distribution/version check verifies the option on the selected MiKTeX binary before adding it to these QA subprocesses; TeX Live continues without the MiKTeX-only flag, unknown/ambiguous compilers are refused.
- Add negative stdlib regressions for flag refusal and both direct invocation paths; run the same helper against real hosted Windows Server MiKTeX and preserve original Rust/GUI/C catalogue, user source and external TeX distribution. No package installation, GUI rendering or general solver added.
- This checkpoint is **not** a CI pass claim. Exact-head PR checks, downloaded artifact review, merge and postmerge remain NOT_RUN at authoring. Hosted MiKTeX is CI_ONLY; physical Windows 10 x64/MiKTeX and Mac ARM M1/M4 XeLaTeX are **NOT_RUN**. Details in plans/insights I59.

## Unreleased — B40 native TextEdit Undo transaction fencing (PR #85, independent X11 PENDING)

- B-owned egui source safety: compare the session source revision around the real inspector action bar, parameter/dependency/library inspector and six-gesture guide; after a confirmed visual source transaction, clear stale native TextEdit undo snapshots on the next editor frame. Do not reset for pure selection/F1; ordinary code remains editable and source-authoritative.
- New real egui `Context::run(RawInput)` UNIT_EVENT checks Unicode/CRLF hand-edit → shared-catalogue primitive patch → visual Undo → native Ctrl/Cmd+Z → byte-for-byte disk persistence with opaque macro. On previous exact B HEAD `4c46fdb`, Rust CI, D matrix, N1 XeLaTeX, hosted MiKTeX and Unicode workflows PASS. Older I46/I47 X11 rejected changed app tree BEFORE launching the GUI: B40 window-level source-history QA remains **NOT_RUN**, not PASS.
- Reconcile with I57 accepted main `3a1e18d` without touching C/A/D/E/F production. Exact merged B40 head CI and independent B40 X11 source-history gestures must be run and reviewed before merge. Overlay is provisional; external XeLaTeX PDF authoritative. Physical Windows 10/MiKTeX and Mac ARM M1/M4 GUI **NOT_RUN**; no v1.0 claim.

## Unreleased — I57 N2 four real X11 library GUI source-to-PDF sessions (candidate NOT_RUN)

- Add one four-library hosted Linux/X11 acceptance workflow on exact PR SHA and after main merge; reuse the existing I53 real egui driver for independently isolated arrows.meta/calc/fit/positioning Connect → Save → external XeLaTeX PDF → Disconnect → Undo → two-file in-GUI Open and unified-C Russian help. No production Rust, C generator, compiler or package installation change.
- New matrix/profile negative tests, individual original-source/PDF/hashes and screenshots; three unreviewed library coordinates are **PROVISIONAL** and must be corrected from actual X11 screenshots on the same PR. No bootstrap or UNIT_EVENT is a host GUI PASS. Initial exact-head CI, visual review and merge **NOT_RUN**.
- Independently verified preceding I56 on merged main `81d3544`: 7/7 distinct postmerge workflows success; downloaded I53 28/28 hashes, N1 9/9, N2 12/12, MiKTeX auditor 6/6 PDF hashes. Four catalogue-figure rasters reviewed. Physical Windows 10/MiKTeX and macOS ARM/XeLaTeX **NOT_RUN**.

## Unreleased — I56 N2 four-library event / PDF QA (repaired exact CI NOT_RUN)

- Extend the real egui handler Context::run(RawInput) Connect → Disconnect → Undo → disk byte-roundtrip test from one arrows.meta row to all four C-catalogue libraries (arrows.meta, positioning, calc, fit). Each starts in its own collapsed UI context, verifying exactly one CRLF import and unchanged Cyrillic/opaque source. This is UNIT_EVENT, **not hosted X11 or physical desktop**.
- Generate all four unchanged C-owned TeX examples using n2-library-fixture. Compile via external Linux TeX Live XeLaTeX (not MiKTeX), no shell escape, inspect PDF pages, extracted labels, font embedding where applicable, PNG raster and unchanged source SHA-256. Preserve all files under existing N1 evidence artifact.
- I56 initial HEAD had an invalid YAML workflow and rustfmt failures; X11 safety checks stopped at old app/src tree guards before GUI. Repaired in the same I56 PR: short YAML delegates to separately tested script, Rust formatted, three X11 workflow guards and their JSON profile leases aligned to exact test-only app tree `c3b0f6ed5e4ad8c738d8ab8a26d13733c34c61bf`. A remaining I47 offline predicate asserted the old B39 tree; corrected in scripts/tests/test_qa_n1_desktop.py without loosening the fence. N1 source/PDF workflow now checks out exact PR HEAD and runs separately on main, including script-only changes. No X11 status inferred from the old red preflight.
- No TeX parser, solver, package auto-installer, second help catalogue or engine fallback. Exact-head CI, manual artifact review, main merge and postmerge CI **NOT_RUN at authoring**. Existing X11 library workflow proves positioning only; physical Windows 10/MiKTeX and Mac ARM/XeLaTeX remain **NOT_RUN**.

## Unreleased — I55 exact-branch/postmerge real-X11 N2+N3 QA (new CI NOT_RUN)

- PR #83 I54 independently accepted against exact QA SHA `00eacbf`, then merged into B #81 as `84ebe1f`. I46/I47/I53 real Linux/X11 artifacts independently rehashed **21/21, 46/46, 28/28**; manual screenshot review confirms source-safe modal, six TikZ gestures, Connect/Disconnect/Undo/two-file Open and Russian C-catalogue search expanded to syntax/example. These do not substitute for physical Windows 10/Mac ARM.
- I53 push workflow previously ran only on QA branches; add B branch and main to ensure real N2/N3 GUI coverage on exact B source SHA and as separate postmerge CI, with regression assertion and unmodified exact app-tree gate. Actual new B and postmerge CI NOT_RUN at commit, no silent TeX installation.

## Unreleased — I54 third QA SHA 234efdb · real Open focus ambiguity (next exact CI NOT_RUN)

- I46 [41362909390](https://github.com/i-shutov/tikzarium/actions/runs/41362909390) and I47 [41362909481](https://github.com/i-shutov/tikzarium/actions/runs/41362909481) real-X11 workflows PASS on `234efdbb17a98cae72f4320ce8e1b2c8f177494f`. I53 [41362909420](https://github.com/i-shutov/tikzarium/actions/runs/41362909420) real Connect/Disconnect/Undo/PDF PASS but *fails at two-file GUI Reopen BEFORE N3 detail click*: screenshot `13-control-opened.png` still displays selected path and prior source after Ctrl+O. This is a GUI-input focus/shortcut uncertainty (one previous Ctrl+O run passed), not demonstrated file corruption.
- Replace I53 uncertain keyboard shortcut with **actual visible Open path toolbar click**, while still validating two separate in-app GUI source buffers, source hashes, and PDF. New exact CI and final N3 details screenshot NOT_RUN at commit. Track Ctrl+O shortcut reliability separately rather than claiming it always passes.

## Unreleased — I54 second real QA accepted (details expansion next HEAD NOT_RUN)

- Exact I54 `9adbbde4ae1dbf0bacac3279605db852889ccfbe`: I46 X11 [41362471144](https://github.com/i-shutov/tikzarium/actions/runs/41362471144) SUCCESS, I47 six real gestures and held-pointer Undo [41362471218](https://github.com/i-shutov/tikzarium/actions/runs/41362471218) SUCCESS, I53 N2+N3 search [41362471344](https://github.com/i-shutov/tikzarium/actions/runs/41362471344) SUCCESS. Downloaded original artifacts: I46 21/21 previous HEAD verified; I47 **46/46** and I53 **27/27** report SHA-256 match. Manually compared saved native source and XeLaTeX PDF to screenshots; screenshot of actual N3 entered query shows exactly one shared-C result `tikz.library.positioning` with "Найдено: 1". No host hardware claim.
- Extend actual N3 search by clicking returned positioning help entry and screenshotting syntax/requirements/Russian explanation; coordinate [1150,175] from real 9adb screenshot. Its new exact HEAD CI/visual evidence NOT_RUN when committed. Source/PDF must remain unchanged.

## Unreleased — I54 review of first real QA (CI first HEAD FAILED, repair NOT_RUN)

- First exact B39 I46 actual dirty-Open [41362016898](https://github.com/i-shutov/tikzarium/actions/runs/41362016898) SUCCESS; downloaded ZIP 13105683167 and verified 21/21 report hashes; manually inspected modal rejection/acceptance/GUI PDF frames, original UTF-8/CRLF source preserved, PDF Cyrillic and embedded DejaVuSerif. I46 accepted on first QA HEAD 3b9af78, no physical Win/Mac implication.
- First I47 [41362017043](https://github.com/i-shutov/tikzarium/actions/runs/41362017043) failed at stale B38 unit assertion before opening egui. Update unit assertion to exact B39 tree and candidate-only profile; real six-gesture proof still NOT_RUN.
- First N3 [41362016972](https://github.com/i-shutov/tikzarium/actions/runs/41362016972) full N2 Connect/Disconnect/Undo/two-file Reopen/PDF passed but N3 TextEdit copy timed out: screenshot shows prior [1200,159] click below actual input y130–148, accidentally selecting explanatory help. Correct target [1200,138] based on *real* failed X11 screenshot; new N3 search result/visual review NOT_RUN.

## Unreleased — I54 B39 N2/N3 real desktop QA (CI NOT_RUN)

- Exact-tree re-pin I46/I47 for actual B39 X11 reaccept; old modal/gesture coordinates remain provisional until manual screenshot/PDF/source validation.
- New actual N3 Russian search TextEdit interaction added to I53 full Connect/Disconnect/Undo/two-file Reopen/GUI PDF proof; user source and PDF invariant. No production Rust changes; physical Win10/Mac NOT_RUN.

## Unreleased — I53 B39 real-X11 N2 libraries / two-file GUI Reopen (CI NOT_RUN)

- I53 B39 run 41359783212 reached real GUI but failed at initial Save before Connect: X11 `xdotool type --delay 3` submitted `library-connect.t`, not requested `.tex` (verified in screenshot/file report). QA driver now pastes the UTF-8 Path through X11 clipboard and checks full in-app field with Ctrl+A/C before Save or GUI Open. Negative tests reject missing filename suffix/extra bytes. New CI NOT_RUN at authoring; production unchanged.

- New full-window positioning Connect → saved TeX → externally compiled XeLaTeX PDF → Disconnect → Undo QA, with failure screenshots, hashes and negative tests; B39 stable-row ID in scope and actual two-file GUI Open source checks added; Disconnect candidate [1190,584] requires fresh B39 screenshot before GUI PASS.

## Unreleased — B38 library connect/disconnect + N3 help inspector (DRAFT: QA NOT_RUN)

- Re-pinned I46/I47 real Linux/X11 workflows and their screenshot-coordinate profiles to the exact B38 app/src Git tree, preserving full pointer/Save/Open/PDF checks. Inherited B37 coordinates remain provisional pending fresh screenshot review; this does NOT silently promote bootstrap to PASS.

- The native egui inspector now exposes four C-owned TikZ library entries and displays installation/project loading/engine target/tool implementation/help independently without promoting UNKNOWN to installed/compiled.
- Shows byte-local before/after source proposals before explicit user Connect/Disconnect; revision-checked C plans append inverse to existing N1 Undo, preserve CRLF/unknown macros and cancel in-flight pointer. No implicit package install, TeX substitution, solver or full-source rewrite.
- Adds Russian offline search in egui over the same C catalogue used by CLI/authoring; syntax/examples/parameter units/default provenance/manual sections remain unified.
- All new unit/egui layout tests, detailed plans and QA insight included. Exact-head CI, real GUI-PDF artifacts, postmerge and physical Win10/Mac remain NOT_RUN at authoring.

## Unreleased — I51 B36 actual-X11 automated PASS / PDF-focus manual visual FAIL (block main merge)

- QA `6eea588f`: genuine Linux/X11 I47 `41330287961` SUCCESS, ZIP `13092913019` CRC and 45/45 hashes, real PDF/guide selected states and six native gestures with byte-preserved source. Separate I46 real safe Open SUCCESS. Manual comparison with same-run GUI-exported PDF reference exposes **missing rectangle strokes, stippled circle/Bézier and tiny text in the compact PDF-focus viewport**, plus stale prior `2% cannot fit` warning while focused PDF fits; **B36 visual fidelity FAIL**. No B/main merge pending correction, exact next QA CI NOT_RUN, physical Win10/Mac NOT_RUN.

## Unreleased — I51 B36 two-line diagnostic layout X11 strict selection (fresh CI NOT_RUN)

- Real I47 `41329734338` reached six native gesture+actual GUI PDF but exposed a wrapped Fit Page error banner shifting control y-coordinates by 16px; no B36 production fault demonstrated. Independently inspected screenshot `05a`; QA now tests exactly one selected-button layout among reviewed single-/two-line cases using real PNG RGB, with negative ambiguous/none tests. No edits to production Rust. New exact-head GUI and whole-page manual QA NOT_RUN at authoring; physical Win10/Mac NOT_RUN.

## Unreleased — I51 real B36 X11 screenshot calibration (second QA HEAD pending)

- First exact-I51 genuine X11 I46 PASS, independently verified 21/21 uploaded hashes and foreground modal + real XeLaTeX PDF. I47 first run failed after six persisted native TikZ gestures, XTest held Undo, F1 and PDF because B35 fit coordinates were now wrong: Zoom Out clicked B36 PDF focus and compact Fit Page missed. Corrected all zoom/fit and focus click positions from B36 screenshot 04d/04e2, added actual selected-button blue-pixel predicates in both modes. No production Rust touched. Fresh exact-SHA rerun and new visual acceptance **NOT_RUN** at correction authorship; physical Windows 10 / Mac ARM NOT_RUN.

## Unreleased — I51 B36 independent X11 PDF-focus integration (NOT_RUN; QA source head)

- QA-only source-tree rebase of I46 dirty-Open and I47 full six-gesture native-X11 workflows onto B36 #79 `af75b0402bdf9c99dd18999fc5a4f6eb4c974e23` (app/src `276ad1525db4ef3d3aab4624808453a897ad5b6a`), preserving existing Save/Undo/CRLF/opaque macro, external XeLaTeX PDF and F1 checks. Adds provisional 1180×680 real pointer PDF-focus/guide-return screenshots and no-TeX-mutation hash gates. Old B35 coordinates expressly NOT calibrated on B36; no visual acceptance inferred from mere differing screenshots.
- Exact-head hosted X11, screenshot and PDF manual review, PR merge and post-merge CI **NOT_RUN** at authoring. Physical Windows 10/MiKTeX and Mac M1/M4/XeLaTeX **NOT_RUN**. No production Rust, catalogue or TeX behavior changed.

## Unreleased — I50 D06 MiKTeX rerun artifact provenance (CI pending)

- Closed a demonstrated GitHub Actions evidence-routing defect: [D06 #41315329378](https://github.com/i-shutov/tikzarium/actions/runs/41315329378) attempt 4 actually built six PDFs with privately installed MiKTeX 25.12 on hosted Windows Server (47-file ZIP, package inventory unchanged), but the independent Ubuntu auditor fetched the stale 265-byte ZIP from attempt 1 by nonunique artifact name and failed before PDF audit.
- Bind Windows evidence, lock and independent report to the same `github.run_id` and explicitly replace prior attempts with `actions/upload-artifact overwrite: true`; Ubuntu downloads the exact same-run Windows name. The naming does not use `run_attempt`, so a failed-audit-only rerun can read the last successful Windows producer without changing source provenance.
- New stdlib negative regression checks execute in both Windows and Ubuntu jobs, rejecting absent overwrite, stale/nonunique names, attempt-based naming and consumer mismatch. Workflow, tests, plan and research/QA insight committed together; no B/egui/C catalogue edits, no TeX auto-installs or GUI-font coupling.
- New exact-HEAD CI, independent uploaded-PDF/Unicode/font audit and post-merge CI: **NOT_RUN at authoring**. Physical Windows 10 x64 with external MiKTeX and Mac ARM M1/M4 with external XeLaTeX: **NOT_RUN**.

# Changelog

## Unreleased — I46/I47 B34 real-X11 acceptance (verified tested SHA 4e31346; final evidence HEAD CI pending)

- I46 now exercises same exact B34 dirty-Open source preservation on the merged B branch, PR #75 targeting main, and main push (paths limited, app-tree SHA guarded), not just stacked PR #77. This preserves independent **post-merge** desktop safety CI instead of dropping the gate on merge; fresh exact-head CI required.

- Independent Linux/X11 B34 GUI verification at exact SHA `4e31346`: [I46 41309725726](https://github.com/i-shutov/tikzarium/actions/runs/41309725726) PASS source-safe dirty Open, 21/21 hashes, Cyrillic/CRLF/opaque macro preserved, GUI PDF; [I47 41309725695](https://github.com/i-shutov/tikzarium/actions/runs/41309725695) PASS six native source-generating gestures, held-pointer Ctrl+Z and fresh redraw, F1 Russian help, GUI XeLaTeX PDF, fit/zoom, 42/42 hashes. Critical real frames visually inspected. 100% I46 preview is cropped; full page verified separately in I47 25% restored and 7% compact. These are hosted Linux tests, NOT physical Win10/M1/M4. Added docs paths to I47 workflow for final exact-head rerun after acceptance ledger update.

- **I47 B34 six-tool true-X11 gate:** repinned existing N1 desktop smoke workflow, 1366px source-tree profile and offline predicate from historical B31 tree to exact B34 tree ecc6d40668fd6edddc97c682f8ddcca5fe615c99; enables on QA #77 and B #75. This is independent of I46 dirty-Open and must prove six real pointer gestures, held Ctrl+Z, source bytes, GUI XeLaTeX PDF and fit/zoom screenshots. New exact-head run and manual review PENDING, do not infer from B31 historical PASS; physical Win10/Mac NOT_RUN.

- Independent I46 artifact review: [real-X11 run 41308995293](https://github.com/i-shutov/tikzarium/actions/runs/41308995293) PASS on `d2c67a8`, 21/21 reported file SHA-256 values match, source victim/occupied unchanged, separately saved scratch matches input, GUI Ctrl+Z fenced, GUI XeLaTeX PDF verified (Cyrillic `Не менять`, embedded DejaVuSerif), screenshots 06/07/09/10/12 manually viewed. PDF page is visually cropped at 100% in app; **not a full-page visual PASS**. Physical Win10/M1/M4 NOT_RUN. This docs-only source head must still pass fresh CI.

- **I46 QA coordinate correction:** independently downloaded and visually inspected real [run 41307868676](https://github.com/i-shutov/tikzarium/actions/runs/41307868676) screenshot; former (506,458) missed the actual Save-and-open button (x465–603,y416–441). Calibrated (536,429), added bounds-checked offline regression. Hosted run reached actual B34 modal but its Save/Reject click paths and PDF are **NOT PASS** until exact-head rerun+manual artifact review. No B production change or physical Win10/Mac claim.

- Integrator QA branch carries latest B #75 SHA f9a4838c8e3a2ea2e2adf58efc152a016c41f09a and current app/src tree ecc6d40668fd6edddc97c682f8ddcca5fe615c99, preserving N3 shared help merged into main. QA-only paths, no production edit. Real modal/XeLaTeX evidence still NOT_RUN pending exact-head workflow and screenshot review. Physical Win10/Mac NOT_RUN.

 — N3 Russian contextual help semantic correction (CI pending)

- Fixed the shared C-catalogue offline help search and CLI detail to include full existing Russian `help_ru` for native tools, parameters and TikZ libraries, not just a short title. Tests exercise exact IDs and description-only Cyrillic search; no second data source, TeX parser, auto-install, or changes to app GUI/figure fonts.
- New exact-HEAD CI, real CLI output, post-merge CI and physical Win10/M1/M4 acceptance: NOT_RUN at authoring. Do not mark accepted until verified.

# Changelog

## Unreleased — N3 offline search and CLI from ONE Russian TikZ catalogue (CI PENDING)

- Added read-only C-owned search over the exact primitive/parameter/library specifications already consumed by egui; CLI `help` exposes full Russian syntax, type/units/values, examples and PGF/TikZ provenance. No duplicate help database, parser, TeX substitute, or speculative package support.
- CLI `help [--all|query|exact-id]` works without an installed XeLaTeX, distinguishes editor presets from documented TikZ defaults and reports package/project installation as NOT_CHECKED. Rust unit tests and an offline real-CLI CI smoke are mandatory.
- Exact-head CI and post-merge CI NOT_RUN when authored. Physical Windows 10/MiKTeX and Mac M1/M4/XeLaTeX NOT_RUN; no release.


## Unreleased — I45 corrected-B31 genuine-X11 zoom-readout reacceptance (PENDING)

- QA-only integration on B-owned PR #72 corrected SHA `8f20359f2118660e27a28ecb773c32f8676f56c0`: repin real-X11 workflow, physical-pointer profile and tests to app tree `af316d5e5452d74186b92d65c95c448253d0e61c`. No production Rust/source/TeX edits and no old PR #48 replay.
- Preserve two authentic restored-size screenshots at 1366×740 to independently verify that the visible zoom toolbar no longer reads stale 7% when raster refits to roughly 25%; screenshot frame changes alone **NOT** a numerical correctness PASS. All six native pointer tools, held-click/drag Undo, byte-preserved source, Russian F1 and actual GUI XeLaTeX PDF remain mandatory.
- Corrected-head hosted Rust/D QA/N1/font workflows SUCCESS. Hosted MiKTeX installer initial network timeout then rerun + independent PDF audit SUCCESS; this is **not** physical Windows 10. Exact I45 GUI artifact/visual acceptance **NOT_RUN**, physical Win10/M1/M4 **NOT_RUN** at changelog authoring; no merge/release.

## Unreleased — I43 independent B31 compact real Linux/X11 acceptance (NOT_RUN)

- Accepted I40 main `8640c2cf`, B31 draft `174207d0`, Git-tree-confirmed B31 app `3aea076697daef8572d24694995a4e2ef24bbcaa`. Five hosted B31 exact-head locked CI families succeeded; old I33 X11 failed B30 tree fence before GUI launch.
- QA-only: strict six native TikZ gestures, XTest held-click/drag Undo, source restoration, F1, GUI XeLaTeX PDF; 1180×680 Fit Page/Fit width candidate screenshots, restored window, source-byte checks. Manual PDF/image review required; frame changes alone are not PASS; compact Fit width coordinate is provisional.
- Production, C catalogue, Cargo.lock and user TeX newline policy unchanged; physical Win10/MiKTeX, Mac M1/M4 XeLaTeX NOT_RUN; no release.

## Unreleased — I40 tracked Rust 1.91 Cargo.lock across all hosted build/GUI/MiKTeX QA (CI pending)

- Tracked the real `Cargo.lock` from accepted post-merge X11 main `06b62eea`: source artifact `13072954180` ZIP SHA-256 `48cb9ddffed42ccb71531eb75b7f9d7b59e64ddf375de5a9269fc8cfdef3018d`, lock SHA-256 `4713fd0c29ef8718ff71316f68e5dffe43335b77857e5c7eff9771d087310503` (370 packages, 366 registry). Exact one-time [Rust 1.91 import/check](https://github.com/i-shutov/tikzarium/actions/runs/41282413609) SUCCESS; its temporary workflow removed.
- CI Rust check/test/clippy/build/run now uses `--locked` across native Windows Server / macOS ARM, D three-host matrix, actual Linux/X11 egui, hosted private MiKTeX and N1 generated TeX/PDF. Shared Python audit + seven offline negative tests record tracked lock SHA, checked Cargo metadata and host provenance; archive JSON with build evidence. No TeX/package auto-install change.
- I40 first-HEAD three-host lock audit found a real cross-platform byte divergence: Windows Server checkout auto-CRLF changed `Cargo.lock` SHA to `a88dd89468c3b215fd8fd608115ef41a574c7aa9c50a3806871edf1a0ec041ad` while Linux/macOS remained `4713...`. Git diff had silently normalized it. Added scoped `.gitattributes: Cargo.lock text eol=lf` and raw Git blob versus worktree byte comparison, plus CRLF negative tests. No normalization of user .tex/.tikz. First Windows report's logical Cargo PASS does **not** count as byte-provenance PASS; full exact-HEAD recheck required.
- Final branch exact-head CI and post-merge main checks **NOT_RUN** at changelog authoring time. Physical Windows 10 x64 with separately installed MiKTeX and physical Mac ARM M1/M4 with user-installed XeLaTeX **NOT_RUN**; deterministic binary reproducibility **NOT_VERIFIED**. Real PDF and GUI proof remain separate requirements. No release.

## Unreleased — I36 B30 X11 held-button AND keyboard receipt desktop acceptance (NOT_RUN pending artifacts)

- I35 [actual Linux/X11 41279880858](https://github.com/i-shutov/tikzarium/actions/runs/41279880858) held **Button1Mask=256** across key-only XTest Ctrl+Z but source Undo still failed and later release inserted Line #2. I36 adds 80ms XTest key dwell/XSync, native XQueryKeymap proof of Ctrl/z down/up, XGetInputFocus snapshot, server Button1Mask check each key step, preserving strict source rollback. This disambiguates too-fast synthetic key events from B30 production routing. QA-only; actual I36 GUI acceptance NOT_RUN until complete, physical OS NOT_RUN, no release.

## Unreleased — I35 B30 true XTest held Ctrl+Z and GUI acceptance (HISTORICAL FAIL)

- [I34 real X11 41279540150](https://github.com/i-shutov/tikzarium/actions/runs/41279540150) correctly failed closed: X11 Button1Mask **256→0** across `xdotool key --clearmodifiers` before QA mouseup, so old “held” ghost tests used invalid input. I35 replaces that key with genuine XTestFakeKeyEvent key-only Ctrl+Z, demonstrated under isolated Xvfb to preserve Button1Mask=256, and keeps server mask/byte-exact/no-ghost tests. No B production edits; actual I35 acceptance and physical Win10/M1/M4 NOT_RUN, no merge/release.

## Unreleased — I34 B30 real held-pointer XQueryPointer forensic acceptance (QA_HARNESS FAIL)

- I33 actual [X11 41279059557](https://github.com/i-shutov/tikzarium/actions/runs/41279059557) **FAIL**: before explicit driver mouseup, Ctrl+Z screenshot reveals ghost Line #2; saved .tex contains Line IDs 1+2, matching previous B29 source SHA exactly. QA now queries actual X11 Button1Mask before/after key to distinguish XTest-button release from application early insertion. Fail closed on absent held button; source-rollback assertions unchanged. B30 production and C catalogue untouched, physical Win10/M1/M4 NOT_RUN; no release.

## Unreleased — I33 B30 real X11 pointer Undo QA (historical FAIL)

- First exact B30 QA [41278805656](https://github.com/i-shutov/tikzarium/actions/runs/41278805656) failed **offline fixture-key consistency** before launching the executable; corrected the test reference to the unchanged B30 fixture marker. This is a QA preflight correction, **not** a real GUI FAIL/PASS; strict live test unchanged.

- QA-only integration at B30 #69 exact `750fb6b743a516f44a362f2f568ce1b92c69e6f4` and source tree `965933b3f70504f2f4082bc22795bab67fad5d44`; real X11 six-tool/held-click and held-drag Undo, exact source restoration without ghosts, Russian F1, GUI XeLaTeX PDF, fit/resize screenshot evidence. Historical B29 GUI [41274957152](https://github.com/i-shutov/tikzarium/actions/runs/41274957152) FAIL. B30 hosted CI 5/5 workflow families PASS does not prove actual GUI; B30 X11 NOT_RUN at commit. Physical Win10/MiKTeX and M1/M4 XeLaTeX NOT_RUN; no release.

## Unreleased — I31 B29 source-history actual GUI re-acceptance (NOT_RUN)

- Independently pinned QA source to B29 draft PR #69 HEAD `133cab9eff2da0e2ab2ae9574e5328f2dad3ee62`, app tree `d7a487e91614c7b607ce92f53275e10e2a5ee911`. Previous B28 real X11 [41271432298](https://github.com/i-shutov/tikzarium/actions/runs/41271432298) failed despite apparent Undo success. Re-run real held-click and held-drag Undo plus 6 native tools, GUI Save/Build/Export and F1/PDF screenshot audit without weakening test predicates; no B production changes, old #48 untouched. Hosted B29 CI does not replace actual X11; physical Win10/Mac NOT_RUN. No release.

## Unreleased — I29 B28 X11 initial source-save gate: explicit GUI Save (pending rerun)

- [I28 run 41271124460](https://github.com/i-shutov/tikzarium/actions/runs/41271124460) failed before held-pointer tests: actual source editor displayed original Unicode and path but Ctrl+S did not persist the file. Real pointer/PDF NOT_RUN. QA now records shortcut failure separately and uses the visible GUI Save button to test the required source-persistence vertical; no TeX is fabricated and shortcut is not called PASS. Corrected exact-head CI/visual evidence pending.

## Unreleased — I28 B28 focus-safe pointer Undo real X11 gate (NOT_RUN)

- QA-only integration onto exact B28 `f2dfbd0bb073e6152146a151eca138af8fc030e1`, source tree `4be7a5aebbdd77a820abc08ea37d349dcab6bcec`. Existing B27 real-X11 FAIL retained. Requires actual Ctrl+Z during a held guide pointer despite TextEdit focus, byte-exact Save rollback, no ghost, 6 native tools, Russian F1, GUI XeLaTeX PDF and independent visual review. Real B28 X11 / physical OS NOT_RUN pending new exact-head evidence.

## Unreleased — 2026-11-01: I26 B27 physical-input Linux/X11 Undo + six native tools (QA PENDING)

- QA-only branch based on [#69 B27](https://github.com/i-shutov/tikzarium/pull/69) exact source HEAD `1805a46cbca2985c4b4798ccf4b0e22171107297`, app source tree `5274ea9c12a3a9f25cea3b47c0fa504c1b5fff1b`. No edits to B-owned Rust or the old independent #48 branch. Updated X11 driver sends **real Ctrl+Z while holding a mouse press/drag on the provisional guide**, releases, GUI-saves and checks exact restored source bytes and zero ghost commands; then creates a fresh line, verifies Save and proceeds with all six native TikZ gestures, contextual Russian F1 and actual GUI XeLaTeX PDF/fitting.
- This is **NOT_RUN until exact-head hosted workflow plus independent saved-source/PDF/screenshot artifact review**. Unit-event B27 proof cannot substitute. Hosted X11 is not physical Windows10/MiKTeX or Mac M1/M4/XeLaTeX acceptance; no release. Cargo.lock remains untracked.


## Unreleased — 2026-11-01: I24 B26 actual X11 sticky whole-page resize QA (NOT_RUN)

- Non-production I23 QA bridge merged with **B26 #67** exact source `73878df418dd6343bbca9dd94a2e5daf979ed7fc`, src tree `47c4c86be10471a5f56f7019ad63a77e7f4480f5`; actual egui six-tool + GUI-save/build/export + Russian F1 and full-PDF visual evidence must be regenerated on B26. Driver now captures a genuine selected Fit Page resize/restore (1180×680 ↔ 1366×740); screenshot difference is **not** a visual PASS, and desktop new-page raster still NOT_RUN. Track exact Cargo.lock resolution separately, do not claim physical Win10/MiKTeX/M1/M4 QA. No release.


## Unreleased — 2026-11-01: I23 B25 real GUI whole-page QA bridge (B25 ACCEPTED, B26 NOT_RUN)

- Subsequent independent I23 B25 run [41258646232](https://github.com/i-shutov/tikzarium/actions/runs/41258646232) SUCCESS: artifact `13064825120`, 29/29 report hashes, six actual native pointer gestures, GUI-save original macro, XeLaTeX PDF with embedded font/Cyrillic and original full PDF with six shapes + bottom-left text visually reviewed in «Вся страница». This does **not** transfer to B26 persistent fit-page. Physical Win10/Mac NOT_RUN.
- QA branch based on B25 [#67](https://github.com/i-shutov/tikzarium/pull/67) exact `0174bab2fdc9b6f47f8680f01fbbfba93858f877`, app-src tree `033ece8a178c5c7d315fb95267e348975fe4b5d5`, original active I06 #48 untouched. Actual Linux/X11 six native gestures, GUI Save/Build/Export, Russian F1 and new **«Вся страница»** candidate screenshots will be inspected before QA is called PASS; frame change alone is insufficient. Proposed coordinates require recalibration, and B24 PASS is not inherited. Physical Win10 x64/MiKTeX and Mac M1/M4 XeLaTeX NOT_RUN. No release.


## Unreleased — 2026-11-01: I21 B24 real egui GUI re-acceptance (NOT_RUN until exact-head evidence)

- B24 production [#62](https://github.com/i-shutov/tikzarium/pull/62) exact `33f5ef5cc0f5dbb955d7979497a291845b9f6130` is now included in QA [#66](https://github.com/i-shutov/tikzarium/pull/66) alongside the seven original I19 QA-only files. The real-window test tree pin is updated from B23 `0fbea02a14a08e568da831d78c562cd20dedb8d9` to B24 `e00089592b23219df58adf6cc9550ecaefd7414b` without replaying older I06 branch or overwriting B-owned files. Actual B23 6/6 gestures, GUI PDF, Russian F1, and full-page 32% acceptance are **historical B23 evidence**, not B24 PASS. Pending fresh exact-head hosted X11 run, source/PDF/screenshot review, lease-controlled QA merge into #62 and separate B/main CI. No physical Windows10 or macOS tests, no release.

## Unreleased — 2026-11-01: I19 independent B23 Linux/X11 real GUI acceptance (PASS, not physical OS)

- **Exact QA source HEAD `519c288fb34d48e4354ce292681cec495cc00246`**, [actual GUI CI 41251681392](https://github.com/i-shutov/tikzarium/actions/runs/41251681392) **SUCCESS**. Independently downloaded [artifact 13061293588](https://github.com/i-shutov/tikzarium/actions/runs/41251681392/artifacts/13061293588), ZIP SHA-256 `852ef10b43ee7217c98f8f4cbcdef9b5aa7e64c378a39f52a1fd57de25ebef63`: 29/29 CRC-clean members, 27/27 JSON manifest hashes match uploaded files, including generated Cargo.lock for transparency. Actual B23 egui executable X11/Xvfb performed **6/6 GUI pointer gestures and GUI Save**, distinct native TikZ commands, v2 owner IDs 1–6, unchanged original Cyrillic opaque macro; true GUI Build/Export generated one-page external XeLaTeX PDF SHA-256 `955138a162998731acdc9093e91ca18d7b353cd607c7efc5807c71533c3d7795` with embedded DejaVuSerif, extractable `A` and `Не менять`.
- **Independent screenshot review PASS for contextual F1 and complete PDF:** original full-page raster compared with actual [`04b-entire-page-candidate.png`](https://github.com/i-shutov/tikzarium/actions/runs/41251681392/artifacts/13061293588) SHA-256 `34da9712032e4fb94696dd22bc572be45ab7856442dc7de84b6f9bc8c1806a2c`: full page includes **all six shapes and the lower-left Cyrillic `Не менять`** beside the always-visible TeX source, and real F1 screenshots visibly toggle Russian C-catalogue Bézier help. At 1366×740 **Fit width alone** is vertically clipped; one existing **Zoom Out** click after Fit width (38%→32%) shows the complete page. This is a verified user path, **not** a newly implemented Fit-page button or pixel-calibrated authoring overlay.
- These live results prove **hosted Linux X11 egui B23**, not physical Win10 x64 with independently installed MiKTeX or physical Mac M1/M4 external XeLaTeX, both **NOT_RUN**. B23 PDF fonts independent from GUI theme; source macros untouched; no release. QA PR #66 still requires exact final documentation HEAD CI, integration into B23 and separate main post-merge checks.


## Unreleased — 2026-11-01: I19 proposed B23 real Linux/X11 desktop acceptance (NOT MERGED)

- This QA integration branch is cut **from exact B23 #62** `fb8908adff8b993670ae0a69f3f65d413318515a`, not from diverged I06 #48 or the superseded #37/#43. Transplants only I06 desktop driver/tests/profile/workflow, alongside I19 docs and this record. It does not modify B-owned app, C catalogue, A/D core or independent active QA branch. The initial profile is tied to the B23 `crates/tikzarium-app/src` Git tree `0fbea02a14a08e568da831d78c562cd20dedb8d9`; stale application edits fail instead of silently reusing coordinates.
- Accepted predecessor D04 [#27](https://github.com/i-shutov/tikzarium/pull/27), main `e28a3a4fb067a0a752d720cea484043d52beab00`, adds source-specific negative XeLaTeX diagnostics; accepted A/W05 [#28](https://github.com/i-shutov/tikzarium/pull/28), main `9b4cd26b5b73f8011b975f9922cb208e36e12564`, adds fail-closed SHA-256 `.fls` dependency freshness. Both are already included in the B23 ancestry. Prior actual B22 X11 run [41247531372](https://github.com/i-shutov/tikzarium/actions/runs/41247531372) produced six saved source commands and real GUI-exported PDF, but its visible PDF viewport was cropped and F1 had not been visually checked.
- I19 updates the X11 profile toward screenshot-observed Fit width, enforces F1/fit frame changes without calling them a visual content PASS, adds external-PDF reference PNG and the previously omitted `clipboard-input.txt` to artifacts. Actual B23 desktop execution, whole-page screenshot comparison, exact-head PR CI, and post-merge CI are **NOT_RUN** until new GitHub workflow evidence is reviewed. First QA HEAD `0739e81a` failed at an unintended extra `cargo build --locked` gate: Cargo 1.91 wanted to update tracked Cargo.lock; no GUI started. Corrected QA uses the same non-locked Cargo build as preexisting B23 hosted CI and now captures `cargo-lock.diff` plus a visible warning, for later shared lock review. A green driver only means automated predicates, not independent visual acceptance.
- Physical **Windows 10 x64 with separately installed MiKTeX** and actual **Mac ARM M1/M4 with external XeLaTeX** remain **NOT_RUN**. Hosted Server ≠ Win10; Xvfb ≠ native Mac; figure fonts independent of GUI theme; no silent TeX/package install, no release.


## Unreleased — 2026-10-31: I13 accepted C/N2 library catalogue and D10 MiKTeX evidence

- **C/N2 [#58](https://github.com/i-shutov/tikzarium/pull/58)** merged from exactly tested source HEAD `7114d2d9bb3ce622dd7f1523e53f72082557d446` at main `8a33b2f67f7e72202e8abbe31f74ec21d22ac889`. Four native PGF/TikZ libraries (`arrows.meta`, `positioning`, `calc`, `fit`) now share the original six-primitives C schema, Russian contextual help, verified manual sections and separate installed/project-loaded/XeLaTeX-compatible/tool/help status. A targeted document-body import scanner returns UNKNOWN for late/imported dependencies, preserving confirmed preamble source locations while refusing uncertain source edits; no opaque macro expansion, automatic package install or new Rust TeX interpreter.
- C/N2 exact-head five workflow families PASS: [Rust 3/3](https://github.com/i-shutov/tikzarium/actions/runs/41215112434), [D QA 7/7](https://github.com/i-shutov/tikzarium/actions/runs/41215112467), [N1 app state → actual XeLaTeX](https://github.com/i-shutov/tikzarium/actions/runs/41215112448), [MiKTeX on hosted Windows Server](https://github.com/i-shutov/tikzarium/actions/runs/41215112465), [fonts](https://github.com/i-shutov/tikzarium/actions/runs/41215112411). Independently checked N1 ZIP `13047845621`, SHA-256 `56ae8b5a49cf5304155dd42153b672445336135e871bc346f25c210a1e34cb1c` and hosted MiKTeX ZIP `13048101044`, SHA-256 `5e913f820283e8345a68717f8345d1c65c9f74d8dbcbd038b6a10aadd0edf639`. Independently compiled all four documented N2 library examples via external local **TeX Live XeLaTeX** with shell escape disabled: four one-page PDFs, not a GUI or MiKTeX claim.
- **D10 [#63](https://github.com/i-shutov/tikzarium/pull/63)** merged from exact source HEAD `606fd4b3b3472acc8ea78b9d45dde37c7c4ee6d5` at main `aa6d1d08caee984d5f31ac13396e346fc451c8fe`. The direct handwritten baseline PDF now receives the *same* Unicode/font/page audit as all five other positive PDFs, and strict negative TeX logs must begin with the actual MiKTeX XeTeX engine identity. Source-head real hosted MiKTeX [41215828555](https://github.com/i-shutov/tikzarium/actions/runs/41215828555), Rust [41215828562](https://github.com/i-shutov/tikzarium/actions/runs/41215828562), D QA [41215828566](https://github.com/i-shutov/tikzarium/actions/runs/41215828566), fonts [41215828554](https://github.com/i-shutov/tikzarium/actions/runs/41215828554) PASS. Audited 45-file MiKTeX ZIP `13047761760` SHA-256 `fc3c225fa9a608b6465539f2537d2bc234a247ea1665dd6757e3ef8cb793bea6`.
- **Post-merge actual main `aa6d1d08caee984d5f31ac13396e346fc451c8fe` is independently checked:** [Rust 3/3](https://github.com/i-shutov/tikzarium/actions/runs/41217239643), [D QA 7/7](https://github.com/i-shutov/tikzarium/actions/runs/41217239580), [real hosted MiKTeX 1/1](https://github.com/i-shutov/tikzarium/actions/runs/41217239682) COMPLETE SUCCESS. Re-downloaded the hosted MiKTeX artifact `13048052949`, SHA-256 `e1dcee9294e83705011733fa29ac95918326ed0249ee080246c6f171f5522163`, CRC-valid 45 files; `miktex-qa.json` commit/source SHA matches main, `accepted=true`; independent Poppler checked **6/6 actual one-page PDFs**, Unicode/Cyrillic+math and embedded DejaVuSerif/LatinModernMath; 9130/9130 package-list hashes identical. Historical intermediate C-only main `8a33b2f6` hosted MiKTeX [41217225528](https://github.com/i-shutov/tikzarium/actions/runs/41217225528) FAILED *before* compilation on external private package index refresh timeout: do not call that job a PDF PASS or weaken offline gate. Latest main new run succeeded.
- Remaining real GUI gate: draft [B16 #62](https://github.com/i-shutov/tikzarium/pull/62) headless egui Response-event six-tool PASS but not merged; [I06 #48](https://github.com/i-shutov/tikzarium/pull/48) actual Linux X11 remains 5/6 mouse gestures and **FAIL** Bézier tool selection due to obsolete fixture coordinate; real GUI Build/Export PDF **NOT_RUN**. Physical Windows 10 x64 with user MiKTeX and physical Mac M1/M4 with user XeLaTeX **NOT_RUN**. Hosted Windows Server 2022 is not Win10. Lua-only `graphdrawing` incompatible with XeLaTeX. No release.

## Unreleased — 2026-10-31: I12 verified B15 egui/TikZ source-first integration

- [PR #50](https://github.com/i-shutov/tikzarium/pull/50) merged at `8c77976ec6c5698904cdd15a2d45a310a34dca33` from exact head `6a1f3f9c5d7ed060e53c072b6ee36bb115dd23d7`. Source visible alongside external XeLaTeX PDF, six C-native TikZ tools, Russian context F1/help, explicit C/N2 import preview and undo, source-line focus, Alt-selection, Esc-cancel and stale-Undo invalidation. User macros and CRLF not replaced. No private TeX parser or hidden installation.
- All five exact-head workflow families SUCCESS: [Rust](https://github.com/i-shutov/tikzarium/actions/runs/41210626857), [D QA](https://github.com/i-shutov/tikzarium/actions/runs/41210626845), [N1 source to XeLaTeX](https://github.com/i-shutov/tikzarium/actions/runs/41210626866), [hosted MiKTeX](https://github.com/i-shutov/tikzarium/actions/runs/41210626859), [font gate](https://github.com/i-shutov/tikzarium/actions/runs/41210626838). Independently inspected real N1 PDF PNG and SHA-256 audited artifacts (details in I12 insight).
- Main post-merge jobs [Rust](https://github.com/i-shutov/tikzarium/actions/runs/41212000216), [D QA](https://github.com/i-shutov/tikzarium/actions/runs/41212000320), [MiKTeX](https://github.com/i-shutov/tikzarium/actions/runs/41212000199) require separate completion. Linux/X11 actual egui #48 remains 5/6 gestures PASS, cubic FAIL; GUI PDF export and native Windows10/M1/M4 acceptance NOT_RUN. Lua-only is not XeLaTeX compatible. NO RELEASE.

## Unreleased — 2026-10-31: I11 C04/C06 catalogue gate restoration and C/N2 integration

- Merged C/N2 source attribution [#55](https://github.com/i-shutov/tikzarium/pull/55) at main `b7c8e993b9da64060dfd3261833e4be3a1d280ba`, exact head `0cc7427cbbdee8b5ffe5fa63dcc8737ae5781cba`; seven new provenance tests and no opaque source changes. All five source-head workflow families SUCCESS. Independently inspected hosted real MiKTeX artifact `13045161386` (SHA-256 `6970bdfb252bc07d854d544bbf801db6b24285ed672345108d0995b0692d9368`; 44 ZIP members, six PDFs, 9,130 identical package rows) and Linux N1 PDF artifact `13044543886` (SHA-256 `0ed343667fc89acf2967193d2dcc6f0f2fa1a3e2dc5cfdf7cc145a0d59707191`, 9/9 manifest hashes, embedded fonts and Unicode text). No physical GUI claim.
- Recover **previously unmerged** C04/C06 #26/#34 code: static `verify_catalog.py`, 14 tamper tests, bounded input validation and machine-readable JSON on Linux XeLaTeX fixture CI plus three hosted QA Rust jobs. Source old head `2fad1ab90b56a749ceceeb1725e82804c2b0597d`; adapt workflow steps without replacing modern workflows. Metadata is not installation, compilation of all packages or visual-edit evidence. Lua-only remains incompatible with XeLaTeX.
- This I11 branch CI is PENDING until exact-HEAD jobs plus artifact inspection. Post-merge main CI required. Physical Windows 10 x64/MiKTeX and Mac M1/M4 native GUI remain NOT_RUN. No release.


## Unreleased — 2026-10-31: I10 D07 exact-main MiKTeX proof and C/N2 reversible library imports

- Integrated [D07 #52](https://github.com/i-shutov/tikzarium/pull/52) into main at `1e3a1e7131bd6e8d9c9d9d9c93ae5c9203c0f455` from exact C-independent D head `69387a230d746a0af16bc46593ca21b1dfe882d5`. Real MiKTeX Windows Server 2022 CI now covers BOTH pull requests and filtered pushes to main, including changes confined to the N1 app, extension library, catalogue, fixtures and Cargo manifests. A structural Python regression checks the trigger contract.
- D07 source-head workflows completed SUCCESS: real MiKTeX [41201660165](https://github.com/i-shutov/tikzarium/actions/runs/41201660165), Rust [41201660163](https://github.com/i-shutov/tikzarium/actions/runs/41201660163), D QA [41201660229](https://github.com/i-shutov/tikzarium/actions/runs/41201660229), font gate [41201660208](https://github.com/i-shutov/tikzarium/actions/runs/41201660208). Re-downloaded artifact `13043002420`, ZIP SHA-256 `78e0f3aa6d514251cb079cfa5fa3b80886d690fee6caf6736e4b749129437112`; 44 CRC-valid members, six independently inspected one-page PDFs, correct extracted Cyrillic/math and embedded DejaVuSerif/LatinModernMath. The 9,130 before/after MiKTeX package records are byte-identical; AutoInstall=0 and explicit per-process `--disable-installer`. This is hosted Windows **Server**, not physical Windows 10.
- Integrated [C/N2 #51](https://github.com/i-shutov/tikzarium/pull/51) at main `6d15d86344ab1281391d3ea1b458dc18ae443985` from exact source head `3d64c60815f7980df67394ce6fd2541f80b75c43`. Additive C-owned Rust code proposes a revision-checked, reversible, source-visible removal of literal `\usetikzlibrary` imports for arrows.meta/positioning/calc/fit; refuses opaque/macro/conditional, comment-bearing, duplicated or mixed-EOL edits. The shared inspector now retains explicit literal import evidence from a trusted preamble prefix, without claiming TeX package installation or expanding unknown user macros.
- C/N2 exact-head checks SUCCESS: Rust [41202090696](https://github.com/i-shutov/tikzarium/actions/runs/41202090696), D QA [41202090692](https://github.com/i-shutov/tikzarium/actions/runs/41202090692), N1 actual app-state → external XeLaTeX [41202090704](https://github.com/i-shutov/tikzarium/actions/runs/41202090704), font gate [41202090693](https://github.com/i-shutov/tikzarium/actions/runs/41202090693). Independent `n1-app-authoring-linux` archive `13043022726`: ZIP SHA-256 `bd957348fb67e965565cc19eb626d6587a476e8deda08c7c2f944dc58bb3af3e`, 34 CRC-valid members, 9/9 file hashes, three one-page PDFs, actual Cyrillic/math extraction and embedded fonts. This is programmatic app state, **not** an egui pointer acceptance.
- **Post-merge main `6d15d86344ab1281391d3ea1b458dc18ae443985` complete hosted PASS:** Rust [41203529736](https://github.com/i-shutov/tikzarium/actions/runs/41203529736) 3/3, D QA [41203529679](https://github.com/i-shutov/tikzarium/actions/runs/41203529679) 7/7, genuine MiKTeX [41203529698](https://github.com/i-shutov/tikzarium/actions/runs/41203529698) 1/1. Independently downloaded main-push MiKTeX artifact `13044230534` SHA-256 `0c6f7a1af3871ab7078d104272c6a1fe221f1bb095747f5468abd58776430eb1`, 44 CRC-clean files; report `commit_sha=source_head_sha=6d15d863...`, six correct PDFs, 9130 unchanged package records, source-specific strict negatives without PDFs. This is hosted Windows Server 2022 CI, not Windows 10.
- GUI B10/B11 [#50](https://github.com/i-shutov/tikzarium/pull/50) remains draft: previous N1 full-run FAIL on `75e5cb04` against old C scanner; B needs a fresh rebase and exact-head rerun. Real Linux X11 desktop #48 remains 5/6 mouse gestures, sixth Bézier coordinate FAIL, GUI PDF/export not accepted. Physical Windows 10 x64 MiKTeX and Mac M1/M4 remain **NOT_RUN**. Lua-only graphdrawing remains incompatible with XeLaTeX. No release declared.

## Unreleased — 2026-10-31: A/W06 external MiKTeX offline build integrated (#38)
- Merged verified core/CLI code at main `013720ee6f0e1dc29f487124499ed9469d86b089` from PR head `74ca61c6aff408d92286f91e0b49143e9b7e72b1`: read-only `doctor` package lookup with explicit PRESENT/MISSING/NOT_CHECKED; selected XeLaTeX identity validation and fail-closed invalid user path; per-process MiKTeX `--disable-installer` without persistent package/settings mutation; no embedded TeX distro or implicit fallback.
- Changed nine A-owned code/test/fixture/plan/insight files. Branch-head 16/16 checks SUCCESS including actual hosted Windows Server MiKTeX 25.12; independently audited artifact [13041745718](https://github.com/i-shutov/tikzarium/actions/runs/41197706754/artifacts/13041745718), ZIP SHA-256 `59debcf6045fcc1d4cfba8c221712a602412eb3c8023f1a3994a5be702e0bb2a`, 6 PDFs with extractable Cyrillic/math and embedded fonts, Lua-only/missing-library negative results, and byte-identical package inventory. Main Rust CI [41198781494](https://github.com/i-shutov/tikzarium/actions/runs/41198781494) plus D QA [41198781586](https://github.com/i-shutov/tikzarium/actions/runs/41198781586) both SUCCESS on exact merge SHA.
- Physical Win10 x64 MiKTeX and Mac M1/M4 GUI acceptance remain NOT_RUN. D07 real MiKTeX **post-main** job is not automatically proven by branch-head checks; #52 follow-up triggered and its initial external installer download failed. Linux/X11 desktop gestures 5/6 on #48 but cubic + GUI PDF/export still FAIL/NOT_RUN. B10 #50 still fails actual N1 generated-authoring proof because C imports scanner mistakes unrelated font/user macro lines for unknown loaded status; no unsafe workaround. No release declared.


## Unreleased — 2026-10-31: I07 bounded initial XeLaTeX PDF preview

- Protect the **first-page** Poppler renderer (`tikzarium-core::preview`), previously missing time and allocation budgets despite B05 navigation and B06 PNG decoding protections: 45-second subprocess deadline with kill/wait; 64MiB compressed PNG read cap.
- Source and canonical compiled PDF are never modified by the guard. On missing/stalled/oversized raster, retain the valid PDF and report a preview-specific error instead of hanging indefinitely.
- Add five small Rust tests (portable and Unix mock-tool paths), separate physical Windows 10 and M1/M4 QA protocol, plan, insight. Existing full workspace CI exercises the tests; exact new-head results PENDING at authoring. No package capability changes.

## Unreleased — 2026-10-31: N1 native TikZ visual authoring merged (#44)

- **Implemented and merged**, not merely proposed: six Rust/egui TikZ-native input tools (line, arrow with explicit `arrows.meta`, rectangle, circle, text/math node, cubic Bézier). Main after [PR #44](https://github.com/i-shutov/tikzarium/pull/44): `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49`; validated source HEAD `1a274485ca8e728643bc0cf0ed79a18c6b4d5c34`.
- A single C-owned declarative schema drives six code generators, 28 editable parameters and Russian syntax/unit/allowed values/editor preset warnings/help/manual links, shared by toolbar, inspector and F1/hover. The normal Split workspace shows editable TeX adjacent to PDF and visually separate, approximate input guide; the authoritative figure is rendered by external XeLaTeX, **not Rust**.
- Generated commands use owned metadata in TeX comments, source-range + monotone revision preconditions and undo; unknown author TeX is not parsed/rewritten. Visible `\\usepackage` / `\usetikzlibrary` patches require an explicit user action; no automatic MiKTeX or package installs. Figure fonts and four persisted egui themes remain independent.
- Independent exact-source-head CI: [Rust CI 3/3](https://github.com/i-shutov/tikzarium/actions/runs/41190945419), [D QA 7/7 incl. 3 hosted OS](https://github.com/i-shutov/tikzarium/actions/runs/41190945357), [real N1 app-state → XeLaTeX/PDF 1/1](https://github.com/i-shutov/tikzarium/actions/runs/41190945352), [Cyrillic+math+embedded fonts 1/1](https://github.com/i-shutov/tikzarium/actions/runs/41190945413). The N1 artifact `13037984941` ZIP SHA-256 `a86d8bf24338105f6b9519323b761dab4d55c9a24ef0798abef307d33ff0d800` was downloaded: 34 CRC-clean members, 9 manifest hashes, actual 3 PDF pages (3 one-page PDFs), embedded fonts and extractable Cyrillic/math. Crosshost verification artifact `13038961920` ZIP SHA-256 `22863f21bae9472f6ff19ceeccd32f54d416a6c35da22ae209150c504d302b12`, accepted for hosted Linux/Windows Server/macOS ARM.
- **Remaining NOT_RUN**: true GUI mouse/drag/restart screenshot acceptance on Windows 10 x64 MiKTeX and physical Mac M1/M4. Separate MiKTeX-specific Windows Server D06 #40 is not included or claimed PASS. PGF Lua-only graphdrawing is not XeLaTeX compatible. Post-merge main CI still pending on initial integration ledger; N1 is not a release.

## Unreleased — 2026-10-31: I06 source-saving integrity (draft until CI)

- Normal Build/Save of an **unchanged** TeX buffer now checks the bound file's bytes, then performs a **true no-op**: preserves file identity, symlink/hardlink relationship, timestamps and user content rather than replacing it with a temporary file.
- Reject externally changed/deleted open files instead of silently overwriting the external edits; dirty save of symlink and read-only file fails with a descriptive error and leaves original bytes unchanged. Explicit Save As to a new regular path remains possible.
- Added 6 source integrity tests (including Unix symlink and inode regression); both hosted Rust workflows now run the source-integrity subset explicitly, in addition to workspace tests. **PR exact-head CI PENDING**, physical Windows 10 and M1/M4 GUI NOT_RUN.
- This is a preflight protection, not an inter-process lock or race-free compare-and-swap. No editable TikZ capabilities or XeLaTeX package statuses are promoted; `extensions/PACKAGE_MATRIX.csv` deliberately unchanged.

## Unreleased — 2026-10-31: I05 hardened XeLaTeX runner and extension evidence

- Correct the Windows-hosted XeLaTeX `./filename.tex` source operand: never construct it using Windows-native `Path::join` (`.\\filename.tex` is a TeX control-sequence hazard). Use an `OsString` literal `./` prefix and regression-test ordinary, leading-dash and Cyrillic filenames. Re-run cross-host CI against the exact new SHA; no Win10 acceptance claim.

- Reconciled former A #10 runner improvements with F02 font-warning detection: XeLaTeX retains structured file+line diagnostics, optional durable logs, source-safe atomic output and recorder paths.
- GUI error panel uses structured failures and refuses current-buffer line jumps for diagnostics belonging to a different included TeX file.
- C03 verifier now runs after real five-fixture extension XeLaTeX observation in Linux CI and on each hosted Windows Server/macOS ARM/Linux D QA job. Stored artifact hashes and Lua-only negative are audited, not merely reported.
- Exact-head CI and uploaded evidence are PENDING at initial integration. Native Windows 10 and M1/M4 GUI remain NOT_RUN. No v0.1 release claim.


## Unreleased — 2026-10-31: I04 two-page PDF integration gate

- Added `scripts/qa_multipage_pdf.py` for actual Rust CLI → XeLaTeX → Poppler two-page evidence, including page-specific Cyrillic text and distinct 120-dpi PNG hashes.
- Added nine offline negative-control unit tests for invalid page counts, Unicode cross-page leakage, fake/identical PNGs, source mutation and unsafe output paths.
- Wired Linux real-tool GitHub Actions and artifact upload; new checks are **PENDING exact-head CI**, never predeclared PASS.
- Original TeX source is not passed to the CLI: the harness copies it and checks SHA-256 before/after. No GUI theme, figure font or Lua-only engine claims are expanded.
- B03 first-page/multi-page GUI clickthrough on physical Windows 10 and Mac M1/M4 remains **NOT_RUN**, as does geometric visual editing.

Unreleased development state; no production release.

## Unreleased — 2026-10-31: W01 → B01 → B02 → F01/U01 merged to main

- Integrated four **real, previously tested** PRs in dependency order: #6, #8, #12, #16. Main after #16: `3f71681a4d0febe143f0777d635867e9287e82eb`.
- W01: Rust workspace, source-preserving XeLaTeX runner and exact PDF/first-page raster preview, Linux real-compiler fixture, hosted Windows/macOS Rust checks.
- B01: egui Source/Split/Canvas, native Save As, clickable diagnostics, last-good PDF; Canvas remains read-only.
- B02: path-aware stale PDF guard, safe export gating, Ctrl/Cmd open/save/build shortcuts and in-flight file identity protection.
- F01: validated `fontspec`/`unicode-math` figure family recipes, isolated XeLaTeX glyph/embedding PDF proof, no mutation of author TeX source.
- U01: independent persistent egui Light/Dark/Midnight/Paper themes and compact density. UI appearance is not a TikZ style or TeX font.
- Added integration `plans/` and `insights/` SHA/run/artifact ledger; branch-head CI green, **post-merge main CI pending when ledger authored**.
- D QA #9 merged at `2848697cb8c1d374bcbfd5e651a2319cf48ea830`: 3 hosted OS real XeLaTeX jobs plus Rust/QA harness matrix; not equivalent to Win10 GUI smoke.
- C01 registry #7 merged at `f2a87c0c27c07ef423f33dd60435adaac1fa3284`; C02 auditable fixture observations #13 merged at `f2a55fa13fd9a1e0af2718bc328ed16786975184`. Extension matrix keeps package installation, compilation, inspection and editability separate. Lua-only statuses remain incompatible with XeLaTeX.
- A #10 source-file diagnostic parser remains unmerged due a real conflict with font-warning handling. No artificial success flag.
- Release blockers remain: physical Windows 10 x64 and M1/M4 acceptance, full extension family testing, reliable multi-page PDF UI, visual editing. LuaTeX-only packages are not promised under XeLaTeX.

## Unreleased — 2026-10-31: integration W01 Unicode gate

- Require DejaVu Serif for the W01 Cyrillic sample rather than the implicit Latin Modern font that dropped 19 characters.
- Gate compiled Rust CLI → XeLaTeX PDFs on real Poppler Unicode text extraction; page count alone is insufficient.
- Preserve source hashes and save PDF/CLI SHA-256, tool versions and extracted text; upload partial artifacts on smoke failures.
- Add seven standard-library Python tests for text audit and failure behavior.
- Native Win10 22H2 GUI, physical M1/M4 Retina GUI and production release are **not** accepted. Lua-only graphdrawing is **not** supported by XeLaTeX.

## W01 baseline

- Four-crate Rust workspace, egui shell, XeLaTeX core/CLI, package catalogue and hosted CI in draft PR #6.
- Independent QA PR #9 documented the missing-Cyrillic-glyph false positive.

- I05 QA found TeX Live 2026/PGF 3.1.12 wraps the required LuaTeX graphdrawing diagnostic **inside the word graph**; narrowed negative-control matching to the full phrase with allowed TeX line wraps, with targeted regression tests. Previous TeX Live 2023 five-fixture artifact audit remained green. Fresh head CI pending.

- **I19 lockfile diagnosis correction:** checked B23 Git root tree and `.gitignore`: the repository does **not** contain `Cargo.lock` at all; `--locked` failed because no lockfile existed, not because a tracked file changed. The X11 workflow now captures generated `Cargo.lock` in its evidence and warns that exact dependency resolution is not yet version-controlled. This is separate from all TeX package offline guarantees and a reproducibility item for release acceptance.

- **I19 actual CI preparation correction:** [run 41250983388](https://github.com/i-shutov/tikzarium/actions/runs/41250983388) compiled B23 and passed 7/7 offline predicates but failed **before X11 launch** because generated lockfile evidence was mistakenly put in the GUI driver's must-be-empty output directory. The lock evidence now uses a distinct sibling directory, uploaded with the GUI artifacts; the unmodified driver still refuses stale/nonempty GUI evidence. No production source changes and no real GUI PASS inherited from this preparation failure.

- **Independent I19 B23 real GUI proof:** [PR #66 exact 79b5859](https://github.com/i-shutov/tikzarium/pull/66), [X11 run 41251332807](https://github.com/i-shutov/tikzarium/actions/runs/41251332807) **SUCCESS**, independently downloaded artifact `13060884416`, SHA-256 `a72ebdf179a479555318160436de67f441fffd9142422120a1f95311a6f4f9d3`, all 28 entries CRC-clean. Actual B23 process performed 6/6 native gesture→GUI Save; 26 manifest-listed files SHA-256 match, Unicode source original and v2 owners 1–6 correct; real GUI Build/Export produced 1-page PDF SHA `b6434b5e76adcf180e8a2a8751d4b5342ae3b3bf02f9cac851edb2eb6b962c19`, embedded DejaVuSerif and text `A`, `Не менять`. F1 Russian contextual help was independently visually verified in the true X11 screenshots. **Remaining visual defect:** Fit width displays all six native shapes but crops the original bottom-left `Не менять` label in the 1366x740 Split viewport (PDF raster independently proves it exists); this is not FULL_PAGE_PASS. I19 QA now additionally tests one real Zoom Out action and uploads a separate candidate whole-page screenshot; fresh exact-head CI/screenshot review is required before merging. No B production edits.

- I46 QA expanded to actual unbound-scratch GUI Save/Ctrl+S/Build negative paths before dirty Open, with exact victim-byte retention and independent screenshots. Fixed driver-only Openbox activation race using verified direct X11 focus fallback after a documented run failure (41307305009), not a product GUI failure. No manual visual acceptance yet.


### I48 B35 independent desktop QA checkpoint (2026-11-01)

- Integrated existing I46 dirty-Open and I47 six-native-gesture real-X11 QA onto B35 source `8b4f25bc827b264f10083f038e0f7bd55f8dfe69` / app tree `46aced2dbe1b66ba10d8cc92292024625e73936b`; updated two exact-tree workflows, source profiles and offline regression, preserving all QA-only assets. No changes to authored TikZ, Rust production code or dependencies.
- Prior B34 actual-X11 PASS does not prove the B35 in-modal error. B35 actual GUI/screenshot/PDF evidence NOT_RUN until new exact-head workflow and manual review; physical Windows 10/MiKTeX and M1/M4 remain NOT_RUN.


## I49 B35 actual modal reflow bug in independent X11 driver — 2026-11-01

The first exact QA `94a081559f280acda0fe6718982f98b5866caf31` B35 real egui/X11 I46 run [41313976782](https://github.com/i-shutov/tikzarium/actions/runs/41313976782) **FAILED** at "Production modal never saved scratch to separate file", despite successful app launch, Cargo build, offline predicates, and verified original victim/occupied SHA256 byte preservation. Downloaded artifact [13085569228](https://github.com/i-shutov/tikzarium/actions/runs/41313976782/artifacts/13085569228) (ZIP CRC PASS) and independently reviewed screenshots 05/06/07/08. B35 product's requested fix **IS confirmed in real foreground modal**: 06 displays bright-red "Файл уже существует. Автоматическая перезапись чужого TeX запрещена; выберите новое имя." The live modal layout **re-centers** when this new red error line is shown. Before error the save TextEdit is at approx x465–875, y381–401 (driver click [675,398]); after error it moves to x465–875, y366–387. The old subsequent click [675,398] selected the explanatory text, not the TextEdit. Screenshots 06 and 07 have identical SHA-256; 08 still displays victim.tex, not the intended new scratch destination. Consequently the first X11 red run diagnoses a **QA mouse coordinate defect**, *not* a demonstrated B35 application failure. Do **not** claim the full safe Save/Open, cross-document Undo or GUI PDF PASS from I46 yet.

QA-only correction introduces screenshot-reviewed `modal_input_with_error=[675,376]` and bounds [465,366,875,387], separate from no-error `modal_input=[675,398]`. Driver uses error-state click after each rejected Save, offline tests reject stale y398 and missing bounds; B production Rust/source tree unchanged. New exact-head workflow, saved-scratch exact byte hash, original victim/occupied hashes, cross-buffer Undo, PDF glyph/font, and screenshot 07/08/09 must be independently reviewed before PASS. B35 I47 six actual pointer gestures/held-button Undo/PDF [41313976739](https://github.com/i-shutov/tikzarium/actions/runs/41313976739) **PASS exact previous QA SHA** with B35 app tree, downloaded ZIP artifact [13086785731](https://github.com/i-shutov/tikzarium/actions/runs/41313976739/artifacts/13086785731), ZIP CRC and 42/42 file SHA256 verified and visual sample/manual PDF inspected; this proves that unchanged B35 production tree, not the as-yet-unrun new I46 QA. It does not replace the I46 source-safety gate. Physical Win10+MiKTeX and macOS ARM remain NOT_RUN.

- QA I52 (B37 candidate, **not yet accepted**): source-tree-pinned independent Linux/X11 replay of I46/I47 and two real PDF-focus raster snapshots; PDF stroke fidelity and stale-fit-status remain manual NOT_RUN pending exact-head evidence. No production TeX/GUI changes in QA branch.

### I58 B40 independent QA lease (2026-11-02, D/integrator, NOT ACCEPTED)
- Independent Linux/X11 regression adds source-focused Ctrl+Z after native TikZ guide insertion, plus fail-closed B40 app tree leases for I46/I47/I53/I57, preserving source/XeLaTeX PDF evidence. No production changes; physical Win10 and macOS ARM remain NOT_RUN. See `plans/2026-11-02_I58_B40_REAL_X11_ACCEPTANCE.md`.

- I58 QA source history: four independent hosted Linux/X11 suites on `ee36c446` passed with 208/208 artifact SHA-256 and seven XeLaTeX PDFs; source-focused Ctrl+Z preserved B40 native TikZ edits after guide insertion. Physical Win10 and Mac ARM still NOT_RUN (see I58 insights).
