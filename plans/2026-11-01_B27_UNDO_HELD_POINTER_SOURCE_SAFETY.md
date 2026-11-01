# B27 — Undo must cancel an armed egui guide gesture

2026-11-01 · B-owned `tikz_authoring.rs` / `tikz_canvas.rs` · base main `529217b89e83ffb93393eefb99a2a6ff07967c13`.

## Reproducible UX defect

Create a native TikZ line (or another shared-C primitive). Press the primary mouse button in the provisional guide for a second object, hold it (with or without dragging), and press Ctrl/Cmd+Z to undo the first object's source patch. In the old Session::undo, the initial object is removed but the pending guide capture stays armed. Releasing the mouse then inserts a new command the user did not intend. This is especially confusing when the source editor shows correct restored text for only a moment.

## Narrow B-owned fix

On successful source Undo, keep the revision-checked source patch unchanged, and cancel any armed guide click, active drag or Alt-selection capture through its mouse-up. Preserve keyboard TextEdit Undo routing, previously chosen tools and F1, and ensure the next fresh click works normally. No new public types, no C catalogue edits, no TeX parsing/generation, no changes to A/D/E/F paths.

## Acceptance and evidence boundaries

- Real egui `Context::run(RawInput)` invokes the production global shortcut and production guide Response in app order.
- 48 event timelines: six native C tools × 820/1366 logical-width windows × click/drag × simultaneous vs later mouse release.
- Assert undo source-byte exactness (including Cyrillic and opaque macros), zero ghost insertions, next gesture working and second Undo exactness.
- Retain all existing B16–B26 tests: F1, selection/parameters/code highlight, manual edits, Esc, focus loss, Save/Reopen, exact PDF fit mode.
- This is `UNIT_EVENT`, not native Linux X11, physical Windows10/MiKTeX or Mac M1/M4. XeLaTeX alone owns exact PDF; provisional guide is not a calibrated PDF map.
- Rustfmt, tests, Clippy and exact-head GitHub Actions are acceptance gates. Integrator receives exact commit SHA, checks and physical NOT_RUN.
