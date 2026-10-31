# B19 — responsive three-pane Split on the minimum native viewport

2026-10-31 · lane B egui · same draft PR #62, no replay of #37/#43. Exact starting accepted main `5f5a805005430ff26d3e3dd9c17c3ca3d7af9fa3`, B branch `9d523d909622218bf0e4dbca445977bf3291aa71`; AGENTS, PRODUCT_SPEC, full-scope roadmap, B18 plans/insights and open PR #48/#62 reviewed.

## Observed product defect (source inspection, not screenshot)

The native app permits an 850 logical-point-wide window, but the old default 500pt source panel plus 250pt inspector could consume nearly the entire viewport. The guide and authoritative XeLaTeX PDF in the centre were not usable alongside continuously editable code and Russian C-catalogue help. Dragging a panel wide then shrinking the OS window could retain an oversized side panel.

## B-owned intervention

Use one `SplitPanelLayout` calculator based on egui's available logical width, and bounded resizable `SidePanel::max_width` for both the existing left editor and right inspector. Reserve 230pt for the centre plus 32pt for spacing at normal supported widths. Preserve source-side TextEdit, pinned F1+Undo, six-tool guide, exact PDF, manual panel resizing and the four independent UI themes. Do not move TeX drawing fonts or modify C/A/D/E/F APIs. For sub-minimal widths (< native 850pt) this is best-effort; do not claim guaranteed usability at arbitrary widths.

## Event and acceptance gate

New `UNIT_EVENT` test runs the SAME production panel wrappers and `tikz_canvas::show_guide` through real `egui::Context::run(RawInput)` frames at 1366→850→820→1366 logical points, retaining context memory, asserting left editor, right inspector and central guide have meaningful width and no source mutation. Prior B16 six real palette/pointer tests, B17 Undo and B18 F1/keyboard Undo remain in suite. This test is not a physical GUI screenshot, PDF coordinate registration or Win10/M1/M4 proof.

Run exact-HEAD Rust format/test/Clippy, D QA, N1 external XeLaTeX, hosted MiKTeX and font workflows; capture errors and fix B files only. Integrator #48 owns separate X11 desktop/screenshot/build/export acceptance. Physical Win10 x64 + separately installed MiKTeX and Mac M1/M4 GUI remain NOT_RUN until independently witnessed.
