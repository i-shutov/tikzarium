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

## F1 help-tab state mismatch

Source inspection: Studio `update` reacted only to F1 false→true, switching
`prefs.studio_dock=Help`; a subsequent F1 true→false left the tab at Help
although `Session::help` was false. This would render the second shortcut
visually inert. Fixed in B-owned Studio UI and main via shared
`route_studio_help_toggle`, with real egui RawInput F1 press/release/press
test asserting Help→Properties and no source/Undo mutations. Commits
`01b626edaa607e05c25d309725fc29c171590b93` and
`8faa2989bf038fd1d6679d37338c168664668746`.
Exact-head CI and independent real X11 F1 screenshot remain separate gates;
do not report PASS before evidence is available.

## B42 exact-head CI failure repaired and real Studio screenshots independently inspected

On source SHA `88877297726b0d788108e995b4dbec3e4bb22d92`, strict Rust
formatting failed on every Rust matrix at `studio_ui.rs:571`; tests were
**not executed** past that gate. The exact rustfmt layout from the hosted
job log was applied in commit
`f2273814aa160be5c0ec7b8779f9e4b7831ab6d7`, on the SAME #91 branch.
Do not inherit earlier green tests; rerun all exact-head checks.

Downloaded and inspected **two** real Ubuntu/X11 screenshots from the B42
bootstrap [run 41421044602](https://github.com/i-shutov/tikzarium/actions/runs/41421044602)
on that formatted app tree. ZIP CRC passes and image SHA-256 matches the
artifact manifest: workspace
`b5f717856087c397b9a87a98965f581a180e6f055256724072a240f413538cad`;
Geometry popup
`d3be3595ba89bed353a8af1a7c11a81c173ac4140722c2e1edc213e92a1e3c77`.
The screenshot does visibly show the popup with four selectable geometric
icons outside the editable source pane. This only proves an actual
*group click*, not selection of an individual native tool, six gestures,
source manual Ctrl+Z, file Open/Save, or XeLaTeX PDF in the Studio process.
The artifact's originally stored manual-review field remains historically
NOT_RUN; this independent review is recorded here without falsifying it.

Three older I51/I57 workflows on the formatted HEAD refuse the B42 tree
**before GUI execution**; those failures cannot count as gesture FAIL/PASS.
D-owned independent coordinate re-leasing remains mandatory. Physical
Windows 10 and M1/M4 remain NOT_RUN.

## Persistent Windows Server PDF QA trust correction

The proposed self-hosted audit incorrectly accepted
`pdffonts | -match '\byes\b'`, which only checked that *some* font had
`yes`. The B-owned script now parses every font record, rejects any
nonembedded row, requires DejaVu Serif in the Cyrillic fixture, checks
one page and extracts the expected Russian text with `pdftotext`.
Absent tools produce partial/NOT_RUN rather than false PASS. Optional
`pdftoppm` exports a PNG explicitly marked unreviewed, not proof of
visible glyph fidelity. Implemented in
`f56b3e12c48ab095c859671b74a6698c71072c84`.
This script is NOT_RUN on the actual dedicated Windows Server; hosted
MiKTeX proof does not substitute for it. Exact-head CI, script runtime,
and visual glyph review are independent gates.

## B42 external D I61 failed at first Save: screenshot-to-code root cause

[run 41427351166](https://github.com/i-shutov/tikzarium/actions/runs/41427351166)
on #92 exact D SHA `517906e80fab2bda3c6aafa834a7b90a066790df`
returned `gui_save=NOT_RUN`, `six_real_tools=NOT_RUN`,
`real_xelatex_pdf=NOT_RUN`; error: `Save did not create default
figure.tex`. Independently downloaded GitHub artifact `13133090660`,
verified the screenshot bytes against its report and visually examined
`02-file-menu-default-path.png` and `04-source-pasted.png`. The
visible `figure.tex` was grey *placeholder*, not a value. Source
`TikzariumApp::new` set `file_field` empty, while Linux
`typed_save_destination` refuses empty input. This establishes
a real first-save workflow defect, not a gesture or XeLaTeX regression.

Changed B main.rs only for production: the new scratch filename
`figure.tex` is prefilled as actual editable text, and existing
non-overwrite protection remains. Added actual egui event-frame
Save-icon test with CRLF/Cyrillic macro Save/Reopen and occupied
destination rejection. Exact-head hosted CI and new independent
D X11 acceptance remain PENDING; no physical OS claims.


## B42 actual group/tool selection event-frame QA — 2026-11-02

Identified an evidence gap, not a confirmed new production UX bug:
the previously added six-gesture Studio test directly sets Session::active,
and X11 bootstrap proves group opening only. The new B-owned UNIT_EVENT
uses production rail/palette click handlers, egui Response rectangles and
pointer press/release for all six C-catalogue native tool icons. Selection
closes the palette without editing CRLF, Cyrillic text, unknown macros or Undo.

Exact-head Rust test and independent X11 acceptance are pending after
this patch. Never equate the event test with physical Win10/M1/M4.


## B42 full-width status bar layout order — 2026-11-02

Reproducible source-level UX defect: eframe::App::update previously called
TopBottomPanel::bottom("b42-status") *after* CentralPanel and the side panels.
Egui layout is order-dependent; late bottom allocation can obscure content
and cannot reserve the intended full viewport width. The production call is
now before inspector, tool rail, source, central and optional diagnostics,
with the same status text and XeLaTeX prerequisite indication.

B-owned UNIT_EVENT uses the same status handler and actual egui panel layout
at 850x560 / 1366x768 to assert full width, nonoverlapping source/guide,
unchanged TeX and Undo. No invented PDF coordinate authority. Hosted exact-head
CI and independent real X11 remain separate and pending at authoring.
