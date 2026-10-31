# B24 — source edits and tool switching during a held egui pointer
Date: 2026-11-01. Owner: B (egui), existing draft PR #62; base main e28a3a4fb067a0a752d720cea484043d52beab00. Candidate predecessor fb8908adff8b993670ae0a69f3f65d413318515a.

## Reproduced safety defect
B22 correctly cancelled Esc on a short primary click, but Session::sync() (called by the real TextEdit changed() hook) unconditionally reset cancelled_pointer_capture. When source text was edited while a guide mouse click remained down, egui reported clicked() on release, and a fresh TikZ command could be inserted despite a mid-gesture manual source revision. Switching tools during a held pointer likewise cleared the guard. A short click has no drag_start; clearing drag_start alone is insufficient.

## Implementation (B-owned only)
Track a guide-origin primary pointer press separately from drag_started(). The production guide handler arms it before the drag threshold, and clears it on mouse-up. On manual source sync or tool switch, conservatively convert the armed press into a cancelled capture until release. Existing Esc/Alt paths remain fail-closed; the next intentional mouse gesture remains usable.

Only tikz_canvas.rs, tikz_authoring.rs and own plans/insights change. No C catalogue/API, A/core, D tests, E help, F source tests, TeX generator, library scanner, CAS, or PDF coordinate inference. The C catalogue remains generator and source metadata validation authority. Native source remains visible/editable; compiled XeLaTeX PDF is exact, grid provisional.

## Regression
Actual egui::Context::run(RawInput) on the production guide: six tools × two widths × short click/drag = 24 pointer lifecycles with intervening UTF-8 manual source revision. Require zero ghost commands, no stale Undo, fresh successful C native insertion/Undo, opaque macro byte preservation and Save/Reopen. Second event-frame regression switches the tool during an armed click and demands inert release followed by a working Cubic click. These are UNIT_EVENT, not OS GUI proof.

## External QA boundaries
Preserve existing B16–B23 tests and hosted Rust/Clippy/XeLaTeX/MiKTeX/font jobs; check on exact new HEAD. Independent I19 draft #66 is currently calibrating actual Linux/X11 on B23 and pins source app tree; do not edit its fixtures or conflate its result with B24. Physical Windows10 x64 MiKTeX and M1/M4 GUI/IME/native dialogs/Retina NOT_RUN.