# B16 — Actual egui palette-to-source pointer vertical

Date: 2026-10-31. Lane B, `i-shutov/tikzarium` only. Baseline main `ab5705d4dd7e3dcefd3ef6ddfd695f6d0ee4dfd1`; earlier B15 PR #50 is already **merged**, so B16 is a new branch, not a duplicate merge of #37/#43.

## Reproduced integration gap
I06 actual X11 proof [#48](https://github.com/i-shutov/tikzarium/pull/48#issuecomment-6544972716) recorded 5/6 real mouse tools, with cubic missing because the external GUI automation clicked the Node button at (798,204), not Cubic. That is a **fixture coordinate error, not evidence of a cubic renderer failure**. Existing B UNIT_EVENT tests manually set `Session::select_tool` before drawing, so they did not exercise an actual egui palette click or responsive toolbar layout. The separate I06 fixture belongs to integration, not B.

## B-owned change
1. Keep the six controls derived from the **single C catalogue**. Show the active tool name prominently above the provisional guide, even if toolbar wraps; do not claim PDF coordinate alignment.
2. In a headless egui Context::run frame, collect the *production button Response rects* through an optional test hook. Do not calculate hardcoded button positions, invent input handlers, or move core/C APIs.
3. For each of six catalogue tools at two widths (820 and 1366), simulate real pointer press/release on its button, verify active/help/no source mutation, F1 on the actual handler, then pointer drag on the live guide. Verify exact generated ownership marker + source-line focus, Save/Reopen, C patch for a known parameter, Undo to saved text and original opaque source. Reuse normal Response handler; no event flag fabrication.
4. Retain existing Esc, Alt+selection, manual TextEdit, provenance and CRLF tests.

## Acceptance boundaries
This exercises **UNIT_EVENT** in a headless egui frame, not a running desktop executable, screenshot or physical Win10/M1/M4. Main Split must keep editable code, compact C help/inspector and external XeLaTeX preview; neither TeX engine nor PDF is changed. No own TeX/CAS, solver, package installation, source reconstruction or C contract change.

Gate on exact B16 head: fmt, Rust tests/Clippy all hosted OS, N1 generated source → real XeLaTeX, independent hosted MiKTeX, fonts. Record individual results; no PASS pending jobs. Physical Windows 10 with external MiKTeX + Mac M1/M4 native GUI, dialogs, IME and screenshots remain NOT_RUN.

Integration owns repair and rerun of #48 calibrated desktop profile. B should hand off a stable selected-tool label and test evidence, not edit integrator-owned CI/fixtures.
