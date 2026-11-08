# Windows W2b — real physical input and source authority, stage 1

## Evidence progression

W2a PASS at trusted main ef95c1c9, original personal Server #42460198175: real own RDP HWND, physical 1475×850 at 125%, Russian F1 and independent original screenshot audit. It **does not** constitute the six-input/PDF vertical.

This W2b stage adds a **real Windows OS input** candidate in the same verified PID-owned RDP foreground window, with no desktop pixel capture, no foreign HWND input, no registry/UAC/account/system MiKTeX or driver modification. Both source and screenshots must come from the running application, never a fake test-generated output. It runs after W2a captured two original F1 PNGs and before the app process is terminated. Failures of W2b are reported separately and cannot be promoted to W2a or full W2b PASS.

Physical 125% screenshot was independently reviewed for coordinate selection; input mapping is explicitly **leased to client 1450..1510 × 825..880 at DPI120** and must reject other geometry or focus loss. OS mouse down/move/up has actual pointer frames. The real toolbar Save must create figure.tex in the app's new, isolated working directory. We require exactly one C-owned TikZ source marker, a real \draw, and unchanged original preamble, and save original before/after PNGs and source bytes. First line passing is **stage1 only**.

## Implementation and CI gates

- scripts/tools/qa_windows_w2b_stage1.ps1: six negative/positive layout-guard selftests in Windows PowerShell5.1; owned PID/foreground/session/Default desktop checks before every OS pointer step and exact per-thread PMv2 DPI restoration.
- Existing W2a real personal GUI harness gains -ProbeRealW2bStage1. Early artifact uploads w2-interactive/w2b-stage1/ JSON, screenshots and saved TeX. Run only reviewed trusted main after hosted exact-head CI; any error stays BLOCKED_STAGE1, not W2b PASS.
- Exact PR-head hosted Windows/macOS/Linux CI and PowerShell native selftests, no need to execute untrusted PR binary on persistent owner Server.
- Independent audit must require exact source SHA, original native GUI PID/HWND, plausible PNG geometry and restored DPI context, original source physical bytes with exactly one native C-owned line, and manual palette screenshot review. Never treat a green workflow or unreviewed PNG as physical PASS.

## Remaining work after stage1

1. Validate actual original stage1 palette screenshot and saved source (the popup selection coordinates are **provisional**, not established yet).
2. Expand the reviewed coordinates to all six native pointer tools, preserving comments, macros and CRLF.
3. Add real Inspector Apply/Undo, TextEdit Ctrl+Z, source Save/Open/dirty-close and file pickers, IME, DPI100/125/200.
4. Trigger XeLaTeX using the **GUI Build button** on trusted source; capture PDF through GUI Export and independently verify actual PDF, logs, page count, Cyrillic and fonts.
5. Only after entire physical W2b and separate real Win10 W3 can clean-install W4 and stable v1.0.0 be considered.

No claim of full W2b at this candidate stage.

## Native Save As and transport engineering (candidate, not physical verdict)

- **Deterministic Windows scratch-file blocker:** product `TikzariumApp::new()` starts with `Document::scratch(QUICKSTART)`. Native `save()` on a scratch document delegates to Windows `rfd::FileDialog::save_file()`, rather than writing `figure.tex` immediately. The first physical QA attempt must invoke and verify the *real native Save As dialog*. The candidate now verifies modal HWND/PID/session, active Default RDP desktop, `#32770`, exact new output in `RUNNER_TEMP/w2-interactive/figure.tex`, actual UIA filename/Save controls, owned-client dialog PNG, and real on-disk source bytes. A native-dialog failure is a `BLOCKED_STAGE1`, never a synthetic GUI Save PASS.
- **Upstream ownership nuance:** `rfd` tag `0.15.4`, `src/backend/win_cid/file_dialog/dialog_ffi.rs`, constructs parent `None` if `FileDialog::set_parent` was not called, and passes `NULL` to `IFileDialog::Show`. On this product path, `GW_OWNER==0` may be legitimate. The native guard accepts a null owner only with the same actual owning application PID, foreground native dialog, `#32770` class and same active Default session. A nonzero foreign owner or any foreign PID remains rejected. Original upstream: https://github.com/PolyMeilex/rfd/blob/0.15.4/src/backend/win_cid/file_dialog/dialog_ffi.rs .
- **W2a isolation:** an exception during additional W2b helper execution is recorded as `BLOCKED_STAGE1_UNHANDLED_EXCEPTION` without erasing the independently captured, earlier W2a HWND/F1 PNG evidence. This guard is necessary to avoid conflating a later gesture experiment with the already accepted visual baseline.
- **Pinned Mesa CI transport:** earlier disposable hosted Windows GUI job received a transient HTTP 504 while downloading the explicitly SHA256-pinned MinGW Mesa 26.2.6 QA-only DLL archive. The replacement downloader retries bounded HTTPS attempts **against the same expected SHA256**, immediately rejects a hash mismatch, never installs system-wide and never packages Mesa into the release. Retried prior hosted job completed successfully; this is not evidence that the pending PR-head run passed.
- **Independent original verification:** the post-personal-Server workflow now conditionally audits the uploaded W2b stage1 original native JSON, TeX bytes, PNG bytes/pixels and native Save As provenance against the exact trusted-main SHA. Missing stage1 report means `NOT_RUN`; presence of actual valid stage1 bytes still does **not** constitute full six-tool W2b or physical Win10 W3. Human review of the palette PNG remains mandatory.

The only available full personal Server visual baseline at this point is W2a (1475×850 physical client, 125% DPI, F1). W2b stage1 and all later W2b sub-gates are **NOT_RUN** until the first genuine postmerge original artifacts have been independently audited.

## New field result and blocker correction candidate — 2026-11-08

- Original Server #42473309431 early artifact #13613977992, ZIP SHA256 `06cdd5733eefd519da3875939baa974223c99aa85b85bea4efb439c4a5482c85` at trusted-main `597dc894070202975fdf58c434f599deac42fe7d`: `BLOCKED_PINNED_MESA_STAGE_UNAVAILABLE`, 4 exhausted original pal1000 GitHub release HTTP methods, last curl exit 22. No GUI process was started, so stage1, six gestures, dialogs, IME, GUI PDF all NOT_RUN. Existing historical W2a original PASS is not demoted.
- Candidate engineering correction: keep same pal1000 archive exact SHA first, and only on exhausted transport (never checksum/provenance/extraction mismatch), fetch the separately pinned official MSYS2 mingw64 Mesa 26.2.6-1 package. Extract to RUNNER_TEMP with existing 7z, require unique nested tar and exact DLL pair, verify every staged DLL hash on GUI launch. Both sources are *QA-only*; Windows10 physical GPU acceptance must use the unmodified product. Do not move main while the active personal job is running.
- Acceptance sequence: review entire patch and offline Windows PowerShell negative tests on exact PR HEAD; hosted Windows/macOS/Linux regressions and source binary provenance; only after personal run final evidence+W1 audit and expected-head merge may the private trusted-main Server execute new fallback. Collect original stage1 screenshots/TeX/Win32 JSON and independently audit them. First C line remains **stage1 only**, never full W2b.


## 2026-11-08 no-7zip blocker — original run #42476793403

Trusted-main `6cb083b2` early original #13615637630 proves pal1000 transport exhausted and official MSYS2 fallback was blocked *before extraction* by `PINNED_MSYS2_REQUIRES_EXISTING_7ZIP_NO_INSTALL_ALLOWED`. Candidate repair retains exact SHA origin, uses Windows builtin `tar.exe -xf` directly on .pkg.tar.zst (if that Server build supports zstd), verifies `mingw64/bin/opengl32.dll` and `libgallium_wgl.dll` and every DLL hash before any private GUI launch. Hosted PS5.1 synthetic `.tar` tests verify native path/layout, not actual zstd support; only postmerge physical original JSON may accept W2b stage1. No system install, no package/fonts/driver/UAC/FlowBridge edits.

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
