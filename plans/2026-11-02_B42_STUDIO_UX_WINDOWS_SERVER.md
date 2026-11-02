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

## B42 resized-source palette placement and hidden-rail consistency

Reproducible code-path UX defect: `main.rs` positioned the floating
tool palette using `SplitPanelLayout::source_default`, while the editable
source SidePanel is `resizable(true)`. After the user changed its width,
the palette no longer started at the actual source/guide boundary and could
obscure the code or float unexpectedly. The View menu could also hide the
tool rail without closing an already open floating palette.

The production fix now reads the real `SidePanel::show(...).response.rect`,
anchors the palette at `source_rect.right()+8pt`, gates the popup on the
visible rail and closes its open group when the rail is disabled. A separate
test covers both wide and narrow actual-boundary input rectangles; the
B42 real-RawInput six-gesture test covers code patches independently.

Acceptance still requires a real X11 resize/rail hide/reopen screenshot
sequence plus six live Studio gestures, genuine source Ctrl+Z and PDF.
Synthetic rectangles and `UNIT_EVENT` do not prove real resizable GUI.

## B42 F1 Studio dock coherence

In B42, the first F1 switches to the shared C Help tab, but the second F1
previously only cleared `Session::help` while leaving the Help tab visually
unchanged. Keep the control honest: F1 on opens the inspector's Help tab;
F1 off returns to Properties when Help is selected. The existing B41 F1
fallback for no active tool still applies. Reuse one C catalogue.
Cover real `egui::Context::run(RawInput)` F1 down/up/down with persisted
opaque TeX and no Undo entries. Independent actual desktop screenshots
must still verify visible tab movement, not just the unit event.

## Reacceptance on B42 exact-head after CI and QA corrections

The early B42 exact HEAD `88877297726b0d788108e995b4dbec3e4bb22d92`
failed `cargo fmt --all -- --check` on a single event-frame closure.
The fix `f2273814aa160be5c0ec7b8779f9e4b7831ab6d7` is production
semantics-neutral. Do not merge based on the earlier short-circuited tests;
require new successful hosted Rust/test/Clippy and D QA on the final SHA.

The old B41/B37 X11 drivers have source-tree guards; D owns new Studio
calibration, six actual tool selections/gestures, inspector/Undo, F1,
manual source Ctrl+Z, two CRLF/opaque-macro Open/Save files, and PDF raster.
B bootstrap confirmed only the Geometry group popup on real X11.

User-server audit must distinguish all embedded fonts, extracted expected
Cyrillic text, and visually reviewed rendered glyphs as separate facts.
The prior any-`yes` predicate was unsafe. The corrected B-owned
`scripts/tools/qa_windows_server_user.ps1` does not auto-install packages,
and produces partial states if Poppler PDF tools are unavailable. The
dedicated Windows Server and physical Windows 10/M1/M4 remain NOT_RUN.

## B42 real-X11 scratch Save incident and B-owned correction (2026-11-02)

Independent stacked D #92 I61 Linux/X11 on B42 source tree
`817ef8606d882ed39111b886fce57e0c0a37fb3a`, run
[41427351166](https://github.com/i-shutov/tikzarium/actions/runs/41427351166),
artifact `13133090660` stopped **after a real clipboard paste** with
`Studio toolbar Save did not create default figure.tex`. The original
`02-file-menu-default-path.png` shows that `figure.tex` was only a
TextEdit grey *hint*, whereas B-owned `TikzariumApp::new` initialized
`file_field = String::new()`. On Linux `save_as()` uses the actual
field via `typed_save_destination` and thus rejects an empty path.
This is a concrete Studio UX defect (and a wrong D assumption), **not**
a failure of the six native pointer tools: I61 never got that far.

B42 now gives the new scratch file a **real editable** `figure.tex`
destination, matching the already displayed hint. Explicit user Save
writes the current directory only if that name does not exist; existing
files are still rejected by `typed_save_destination` (no overwrite).
File → Save As retains user-controlled paths. A new B-owned
`RawInput` UNIT_EVENT test clicks the *production vector Save icon*,
checks UTF-8/CRLF/opaque macro byte fidelity on disk and fails closed
for a second scratch with an occupied destination.

New B-only commit HEAD exact SHA/CI: inspect after push; do not
report I61 PASS until D independently re-leases its app tree,
reruns all six real X11 icons/gestures, Save/Reopen, Help/Undo and
XeLaTeX source/PDF + manual artifact review. This UNIT_EVENT is
not physical Win10/MiKTeX, Mac M1/M4 or the user Windows Server.
