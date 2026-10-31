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

### I18-C — three real gestures proven; fourth GUI Save shortcut blocked

[Actual X11 run 41246881402](https://github.com/i-shutov/tikzarium/actions/runs/41246881402) tested exact B22 application, successfully saved initial Unicode source and three native TikZ primitives via real pointer+on-disk source: Line, Arrow and Rectangle (v2 metadata IDs 1–3), with untouched user macro bytes. Circle was visibly created in the real GUI and screenshot, but **did not persist after 21 Ctrl+S attempts**, likely because TextEdit had keyboard focus. Therefore 3/6 real saved-source PASS, Circle FAIL at Save, Cubic/Node/GUI PDF NOT_RUN. Downloaded and independently inspected screenshot/source artifact `13059676605`, SHA-256 `1d35ed3db7a0cdabd077aef16360f2c44148af8ec042e0106ac2b616d423d56f`, 14 CRC-valid files. Change QA driver to click real Save button (553,13) after pointer actions; initial keyboard Ctrl+S remains independently tested. Do not retry gestures or fabricate source. Fresh exact-head workflow required.

### I18-D — six of six actual X11 pointer gestures fully saved

[Actual X11 run 41247214140](https://github.com/i-shutov/tikzarium/actions/runs/41247214140), B22 exact source `3c6d7689` and QA HEAD `eddb846f`: **six separate actual egui pointer tool selections/gestures, saved via real GUI Save, independently confirmed on disk**. Native commands Line/Arrow/Rectangle/Circle/Node/Cubic, unique typed v2 ownership IDs 1..6, genuine Bézier `.. controls ... and ... ..`, original Cyrillic user macro bytes unchanged; screenshot `pointer-cubic.png` visibly shows selected blue Bézier handles and six provisional overlays, with actual editable source alongside it. Captured F1 toggles, but help visibility needs explicit review. ZIP artifact `13058609965`, SHA-256 `6668317b77c7c550dff67b4f4fb597f948b0961324911f2901b6856d9716ec96`, 21 CRC-valid files; downloaded and independently inspected screenshot and `drawing.tex`. Workflow overall **FAIL only after six saved gestures** because QA Python `Path.with_suffix("pdf")` omitted the required dot; GUI Build had not yet been triggered, so **GUI PDF remains NOT_RUN**, not a TeX build failure. Fixed `.with_suffix(".pdf")`, changed Build to actual GUI button x698/y13 with screenshot, retained explicit Export UI action. Rerun required for PDF+fonts. No B production edit; physical targets NOT_RUN.
