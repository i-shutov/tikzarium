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

## B41 compact-app audit follow-up (2026-11-02)

Integrator [PR #89 checkpoint](https://github.com/i-shutov/tikzarium/pull/89#issuecomment-6569367823) correctly distinguishes the wide helper-only unit frame from the actual wrapped production bar. B added a second genuine `Context::run(RawInput)` UNIT_EVENT using `SidePanel::right(...).exact_width(260)`, the real `show_inspector_action_bar_frame`, and the regular `show_inspector` inside an independently scrolling area. An optional test measurement rectangle exposes the real production Apply button without creating a second generator or modifying the public API. Pointer down/up verifies disabled Apply, one validated C patch, line jump, no-op protection and Undo. The pre-existing wide frame still tests real radius TextEdit Ctrl+A/text and disk-byte roundtrip separately; neither test is a GUI Open dialog nor a combined X11 session. Exact-head CI for these changes: NOT_RUN at patch authorship. Independent D-owned B41 X11 guard and screenshot/PDF/manual verification: NOT_RUN; physical Win10/M1/M4: NOT_RUN. Retain all prior SHA/check limitations.

## Independent I60 X11 artifact and B-owned F1 remediation

Downloaded Actions artifact `13119109476` from [run 41397220307](https://github.com/i-shutov/tikzarium/actions/runs/41397220307); independently checked 20/20 SHA-256 in `i60-report.json` and visually examined all 14 captured GUI frames. Actual Circle pointer, inspector draft, one C minimal radius patch, native source Ctrl+Z, visual Undo, GUI Open of two files, 13 preserved CRLF and external XeLaTeX PDF are evidenced on **prior** production app/src tree `5fa3b794c4711cd32c1b0f68a0ea00c7bf38657a`. Source SHA before/after/Undo: `89221c2b3a6942c30e1055e43dd7db4590721d6f47a9d61ff5879aa2c5ed7531` → `665285820c962c4ec5f01d0c7f6ae40728e2bc365a16d49` → `89221c2b3a6942c30e1055e43dd7db4590721d6f47a9d61ff5879aa2c5ed7531`. XeLaTeX PDF SHA `16cb3cc29a855586b34d7750c1425c8b0f3d60d140c643f889e9324acc5a8c55` has Cyrillic and embedded Unicode font; screenshot 13 has a white PDF-preview viewport, so inline preview acceptance remains unresolved, not a PDF build failure. Screenshots 13 and 14 were byte-identical after F1 with no active tool; source confirms an invisible help state. B now displays a Russian generic fallback when no C-owned tool is active and retains C-only detailed help when active. New egui key `UNIT_EVENT` requires exact new-head CI; independent D X11 screenshots need a fresh tree lease. Separate I57 QA run `41398730811` failed **before GUI** because a D-owned negative test still expected literal old workflow branches instead of B41; not a production failure. Physical Windows10/M1/M4 remain NOT_RUN.
