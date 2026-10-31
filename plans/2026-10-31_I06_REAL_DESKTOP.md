# I06 — actual desktop process, not just Session unit tests

Base: N1 accepted merge `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49`.
Owner: foreground integrator. Changes limited to a new workflow, new Python driver/tests and I06 documents. B owns egui event tests; D owns genuine Windows MiKTeX #40; neither is duplicated or overwritten.

## User-visible scenario
Launch the real compiled egui executable on an isolated X11 display. Paste a Unicode TeX document through the clipboard, select its destination through GUI, press Save, and verify exact source bytes. Preserve actual screenshots. Then calibrate a SHA-specific coordinate profile using observed screenshots and perform native pointer gestures for six primitives, save and check command metadata and untouched user macro bytes. Compile/export through the GUI and verify an actual PDF, not a fixture written behind the application's back.

## Gates
- [x] Executable driver with process/PID matching, bounded tool calls, isolated preferences, actual X11 input and screenshots.
- [x] Five offline evidence-predicate tests pass locally; they do NOT prove GUI operation.
- [ ] Hosted actual GUI launch/paste/save and screenshot inspection (PENDING exact-head workflow).
- [ ] Calibrated pointer profile, six gestures and genuine GUI compile/export (NOT_RUN at bootstrap).
- [ ] Native Windows10+MiKTeX, Mac M1/M4 (NOT_RUN; Xvfb cannot substitute).

Bootstrap status can be PASS_BOOTSTRAP_ONLY, not authoring PASS. F1 event sent alone is not verified help visibility. A failing coordinate or missing window must fail with captured evidence, not a synthesized screenshot. No OCR and no assumed GUI pixel results.

## I18 exact-head acceptance bridge (2026-11-01)

I06 remains the integrator-owned QA branch; production B22 lives only in draft PR #62. The isolated X11 job now builds pinned B22 SHA `3c6d76894b23397d252d771d985baa933d00723a` in a separate Git worktree and drives that **real executable** using I06 Python/xdotool; no B production source is copied into this PR. Review and update the pin if B HEAD moves. Both QA and tested source SHAs appear separately in the JSON report.

New source parser checks both legacy v1 hex and B20 compact v2 JSON (strict schema, unique positive integer IDs, six known tools, string parameters), splitting at the **first** ownership marker. The six-of-six gate and real Bézier controls must appear in on-disk source; original Unicode/user macro bytes remain unchanged. Cubic click moved to screenshot-derived (600,230), provisional until fresh screenshots. Build/Export and fonts remain conditional on actual PDF; passing offline unit tests is not GUI proof. Physical Win10/M1/M4 remain NOT_RUN.

## I18 actual B22 desktop calibration attempt 1 (evidence, not acceptance)

Actual [run 41246209257](https://github.com/i-shutov/tikzarium/actions/runs/41246209257) compiled B22 exact `3c6d7689` from its own Git worktree, successfully ran six offline metadata predicates, opened real egui/X11, pasted Unicode and saved unchanged source. It **FAILED on gesture #1**: old line click (648,142) selected Arrow, as the real source and selected screenshot prove. Archived screenshot shows B22's responsive toolbar in row1 Line (599,142), Arrow (653,142), Rectangle (737,142), Circle (832,142) and row2 Node (559,168), Cubic (742,168). Coordinates are now based on that actual image, not old N1; rerun and check new source/PDF artifacts. This attempt is not evidence of a passed tool gesture or GUI export.

### I18-B — real GUI Save focus regression (2026-11-01)

[Run 41246572973](https://github.com/i-shutov/tikzarium/actions/runs/41246572973) again built the exact B22 executable and passed offline tests, but failed **before any gesture**: real X11 screenshot shows the path TextEdit retained focus and Ctrl+S did not write the destination file. No pointer PASS can be attributed to this attempt. The driver now types the exact path at a paced key delay, captures a path-field screenshot, explicitly re-focuses the real source editor, then sends Ctrl+S and requires an on-disk exact Unicode source; it never writes the document directly. Fresh CI/real screenshot review required.
