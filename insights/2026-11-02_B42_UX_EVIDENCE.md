# B42 forensic UX review and QA honesty

Observed B41 real X11 images in UI album:
- long text Open/Save/Build/Export/Discovery menus occupy two rows;
- six full-word tool buttons occupy another row above provisional guide;
- combined Help + Library + Inspector + Package inventory is a long
  inaccessible scroll; bottom log uses 145px even without an error;
- compact Fit Page had to shrink PDF to 7%.

Selected revised architecture: only 4 group icons remain in rail; grouped
floating palettes avoid permanently taking PDF/source width. 4 command
icons on top; File/View only as secondary menus; context right dock tabs.
Existing source-patch and external compiler contracts unchanged.

QA status at authoring: source code created; no local Rust binary
in integrated container, NOT_RUN local; CI on exact PR HEAD pending;
new real egui X11 NOT_RUN until artifacts reviewed. User-installed MiKTeX
reported by owner but GitHub runner connectivity NOT_VERIFIED;
persistent Windows Server test NOT_RUN; physical Win10/M1/M4 NOT_RUN.

Risk: old coordinate-pinned desktop drivers must be recalibrated for
new layout, not marked PASS from historical B41. Keep existing CI gates.

## First real B42 Linux/X11 screenshots reviewed

Actual executable/bootstrap [run 41412320640](https://github.com/i-shutov/tikzarium/actions/runs/41412320640), artifact 13126535781, was downloaded and the two real PNGs independently inspected. Group Geometry popup **really opens** with four vector icons; no generated TikZ or XeLaTeX claim. Found remaining UX problems: Light initial palette too pale, small text, popup overlapping the editable source, and an unnecessary orange warning before choosing a tool.

This B42 correction changes default to Midnight, increases Body/Monospace font sizes, moves popup over the center workspace, omits empty-tool warning, and presents package entries from the actual C extension Registry with independent installed/engine/tool states rather than hard-coded three-name buttons. Focusing the PDF no longer resets manual zoom on every subsequent frame. Requires new exact-head Rust and GUI screenshots before acceptance. The old preview screenshot status stays historical, not a new PASS.

B42 first Rust/D QA compiled and passed unit tests on Ubuntu, but strict Clippy found unused imports. These were removed in the current B42 head. All updated CI + actual final GUI **NOT_RUN** until complete. The Windows Server runner and physical Win10/M1/M4 remain NOT_RUN.

## Studio-mode six-primitive event-frame evidence (B42 QA extension)

An audit found that existing complete six-gesture `RawInput` tests called
the **legacy** guide, while B42 added a Studio branch removing its tool row.
Added `b42_studio_six_pointer_gestures_reopen_and_undo_use_actual_egui_frames`
in the same B42 PR: 2 viewport widths × 6 native C tools, actual egui pointer
press/move/release, focus line, C-produced command, file Save/Reopen,
Russian/opaque source preservation, F1 and byte-exact visual Undo. No
catalogue regeneration and no new solver. Existing legacy tests remain intact.

Authoring checkpoint: branch commit `ea1d8cf14264ba1e83eb31ff37230d6ba14eeadd`.
**No claim of test PASS until exact-head hosted CI completes**; no local
Rust toolchain or physical Win10/M1/M4 runtime available in this environment.
A real Studio grouped-palette click and real X11 source Ctrl+Z/Save/Open
with independent screenshots remain a separate gate.

## Resizable source/palette defect and correction

Static code audit of B42 identified a reproducible mismatch:
`show_split_source_panel` has `resizable(true)`, yet the palette X
position was `studio_palette_anchor.x + split_layout.source_default + 18`.
The default width is not the current source panel width after a resize.
Likewise, turning off the tool rail did not prevent `show_palette` from
continuing to render the old selected group.

Changed only B-owned `main.rs`/`studio_ui.rs`: use the measured egui
source SidePanel response rectangle, hide/close the palette with the rail,
and regression-check measured-boundary arithmetic for both 240pt/475pt
source widths. App code commit `2909e4684c8743462ccf205adf51c1ee94ac0c8b`;
helper/test commit `312ffd86d648ae0a99937b18735cf7d8de064304`.
Full GUI manual resize verification: **NOT_RUN** until exact-head X11
artifact and screenshots are reviewed. Physical Win10/M1/M4: **NOT_RUN**.
