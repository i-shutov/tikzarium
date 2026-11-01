# B17 QA — source-focused Undo in permanently visible Split action bar

Date: 2026-10-31. Exact base main `aa6d1d08caee984d5f31ac13396e346fc451c8fe`, previous B16 verified head `937fd9e6e88c96a1f73ed1ee648c74febbebdede`. Own-branch code+tests+plans/insights rebased with an exact-head lease; no adjacent lane files touched.

## Code inspection and reproducible UX defect

`main.rs` wrapped the entire right inspector in an egui vertical ScrollArea. `show_inspector` placed Undo **after** the F1 help, parameter list and source import links. The user had to scroll before reverting a created/edited primitive, and successful Undo didn't set `jump_to_line`. The source-first outcome could be out of sight. This change pins the single Undo/status strip outside the scroll area and focuses the exact source line of the inverse patch without changing the source patch contract.

## Event-frame regression

`inspector_undo_button_uses_real_egui_pointer_and_focuses_source`: renders real action-bar `Response` in `egui::Context::run(RawInput)`; gets measured button bounds; presses/releases; checks patch Undo restores original parameter and highlights the actual owned command line, second Undo deletes just the authored line and focuses the original insertion site, with opaque macro preserved; manual text changes cannot be rolled back by disabled Undo. This is UNIT_EVENT, not physical GUI.

## QA ledger

At implementation: Rust/Cargo not installed in local environment; no local fmt, test, Clippy or XeLaTeX run. Previous B16 CI success belongs to old SHA and is not applied to the B17 rebased head. Workflow outcomes must be checked for the new exact SHA and failures diagnosed before claiming PASS. Physical Win10/MiKTeX and Mac ARM64 M1/M4 GUI screenshot/IME/Retina/dialog tests NOT_RUN, integration Linux/X11 #48 remains independent.
