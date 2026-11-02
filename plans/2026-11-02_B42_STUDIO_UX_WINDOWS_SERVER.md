# B42 — Large ergonomic studio block and Windows Server test bridge

Source of truth: i-shutov/tikzarium main
93db2044b5b91f79c0e774be8806a3693ba7329b;
AGENTS, current source and user's previous interface mockups.

Owner rejects many text buttons and poor compact-window readability.
Deliver native vector icons grouped into popover palettes, short action
toolbar, persistent code beside drawing/PDF, independently scrolling
context tabs and on-demand diagnostics. Keep original TikZ and XeLaTeX.

Tools grouped: geometry 4, connections 1, annotation 1, extensions
explicit NOT_IMPLEMENTED for adapters. No duplicate C catalogue.
Undo/Save/Open and CRLF remain untouched. Legacy GUI temporary fallback.

Windows Server stream: safe manual workflow with own user-installed MiKTeX,
no hidden installer, actual PDF inventory/hash, cargo --locked; self-hosted
runner is not known connected yet. Windows Server != Windows10.
B42 exact-head hosted CI + real X11 screenshots and user-server external
test are release gates, never infer them from source changes alone.

## UX revision after actual X11 bootstrap

- Default theme Midnight, retained 4 persistent UI themes.
- Monospace text 14pt, body 14pt, small 12pt for readable code/help.
- Popover over canvas rather than over source (actual screenshot showed overlap).
- Extension popup is data-driven from C Registry (no fixed top-three list); search and 270pt scroll cap for growth.
- Eliminate duplicate first-load orange error with no selected tool.
- PDF focus changes only on selection transition; preserve manual zoom.
- Re-run real X11 screenshot and all original source/Undo/TeX checks on revised exact HEAD before merging.

## B42 UNIT_EVENT Studio gesture regression (additional B-owned coverage)

A direct `egui::Context::run(RawInput)` test now drives the **Studio** guide
(`show_guide_frame_mode(..., legacy_palette=false)`) at 850 and 1366 pt.
For each of the six C-owned primitives it sends actual pointer down/move/up,
asserts exactly one authored C command and the selected source line, then
checks on-disk Save/Reopen, F1 without a source mutation, and byte-exact visual
Undo preserving an opaque macro and Russian comment.

This protects against the B42 UI refactor inadvertently bypassing the
production pointer handler. Palette group icon selection, the full desktop
layout, source native Ctrl+Z and external XeLaTeX still require independent
real X11 evidence. The test is **UNIT_EVENT**, not Linux/X11 process QA and
not physical Windows 10 or macOS ARM acceptance.
