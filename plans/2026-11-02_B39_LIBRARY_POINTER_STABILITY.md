# B39 — first-class egui library pointer round trip

Scope: `i-shutov/tikzarium` only, lane B, extension of existing draft PR #81. Base main at investigation: `72afff410f3159b0c86341222ee2dd73e2039773`. Read current `AGENTS.md`, full-scope roadmap, B38 plan and insight, shared C/N2 imports and B37 interaction history.

## Reproducible UX defect

B38 renders a `CollapsingHeader` for each C-library with the **mutable** project-loading status in the title (`ABSENT` → `CONFIRMED` after Connect, and back after Disconnect). egui derives the state ID from the title by default. Therefore clicking Connect changes the widget identity, closes the expanded row, and hides its immediate inverse action. This is not a TeX/catalogue defect.

## B39 implementation contract

1. Preserve the visible, changing status label, but bind the row state to the immutable C-library name using `id_salt`. No new catalogue, schema, generator, TeX parser or package probe.
2. Run `show_library_panel_tracking` in production and tests through the **same** egui `Response::clicked()` handler; tests observe actual hit rectangles instead of hardcoded screen coordinates.
3. Unit event frames must click outer library panel, first library row, Connect, then Disconnect **without reopening the row**. Check source exactness, CRLF/UTF-8 unknown macro, two source-patch Undo calls and Save/Reopen. Label these `UNIT_EVENT`, not real X11, Win10 or Mac proof.
4. Every external C/N2 patch must fence the old egui TextEdit-native Undo snapshots before source rendering. Session's revision-checked Undo remains authoritative for the just-applied patch; don't claim native Ctrl+Z in focused TextEdit undoes it.
5. Keep B38 source proposal and five distinct capability states. Final exact-head hosted CI and independent X11 pointer screenshot review are separate acceptance gates. External XeLaTeX PDF authoritative; provisional guide is not PDF-aligned.

B-owned files: `crates/tikzarium-app/src/tikz_libraries.rs`, `main.rs`, this plan and corresponding `insights/`. No modifications to A/C/D/E/F, #44, #37, #43, or QA workflows.
