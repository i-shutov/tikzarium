# B41 — egui parameter-commit provenance and QA

Date: 2026-11-02. Baseline main 48447d5916fa190b3ca7312130bde45d695ffd16. B41 initial implementation checkpoint.

## Verified code observation

In production tikz_canvas.rs, the only Apply-parameters control was rendered after the parameter list and command preview inside a scrollable right inspector. This is a structural compact-layout UX limitation (particularly for cubic Bézier with many parameter rows), not an assertion that a physical target GUI was measured. The always-visible action bar had visual Undo and F1, but no Apply. No-op parameter Apply was not disabled, and the UI did not separately label uncommitted inspector values from authoritative source/PDF.

## Correction

- Pinned Apply adjacent to Undo, using the identical Session::apply_parameters C-owned revision-checked patch path already used by the lower action.
- Enable only if selected ID is unique and byte-valid C-owned metadata, active tool matches, and the draft differs. Fail-closed for unknown macros/edited commands.
- Russian pending-draft warning; no-op lower Apply disabled.
- Return actual production parameter control rectangle to an egui RawInput UNIT_EVENT integration test; send real pointer Ctrl+A Text to radius, then real pointer Apply, verify one patch/Undo/byte-exact Save-Reopen and foreign macro.
- None of these controls creates a TeX evaluator or claims provisional guide alignment with XeLaTeX PDF.

## Evidence status at authoring

New B41 UNIT_EVENT: NOT_RUN pending exact-head hosted CI. Independent real X11 combined inspector-parameter + native TextEdit Undo: NOT_RUN; D-owned independent runner remains responsible. Physical Windows 10/MiKTeX and M1/M4: NOT_RUN. Prior B40 real X11, N1 and hosted MiKTeX evidence is historical only and is not falsely relabeled B41.

Main 48447d5916fa190b3ca7312130bde45d695ffd16 exact-main workflow I53 first attempt had a 15-second xdotool --sync pointer-move timeout after successful C library Connect and before the remaining PDF/Undo steps, while Rust/D QA/I47/I46/MiKTeX passed. Re-run failed I53 job was requested; this failure does not yet prove an app defect or a pass. Do not modify D-owned runner to conceal it.
