# B25 — Desktop focus-loss gesture safety and whole-page XeLaTeX PDF fit

Date: 2026-11-01. Owner B (egui). Base main `bb96abccea86835977e2608887f7470ba83a1167`, after B16–B24 merged as PR #62. Single B25 branch `feat/b25-egui-pointer-focus-fit-page-20261101`. No repeats of #37/#43, #44 N1 already integrated.

## Reproducible user-facing gaps
1. During an armed native guide click/drag, a desktop `PointerGone` / `WindowFocused(false)` event (including an event frame containing mouse release) is NOT an affirmative user request to write TeX. The existing B24 guard catches Esc and manual source revision but did not detect focus loss.
2. Independent I19 screenshot QA on B23 showed the "Fit width" button does not show the whole exported PDF page in Split; the last label remained cropped. A second, manual Zoom Out step was needed. Add explicit **Вся страница** with height measured after the 170-point provisional guide, status and toolbar, not from full window height or hard-coded PDF mapping.

## Implementation
- B-owned `tikz_canvas.rs`: fail-closed cancellation on focus/pointer loss; keep Esc, Alt, and next deliberate gesture intact.
- B-owned `main.rs`: calculate PDF raster zoom from the actual remaining egui viewport; reserve conservative scrollbar allowance; do not claim fit at less than 20% allowed zoom. Do not re-render PDFs, modify C catalogue or infer TikZ/PDF coordinate transforms.
- Preserve permanently visible editable source and C-owned tool/help/parameter catalogue, exact-source patches, source Undo and Save/Reopen.

## Acceptance / ownership
- UNIT_EVENT: 6 C tools × 2 widths × click/drag × two focus/pointer-loss events × two same-frame release orders = 96 real handler event timelines, never ghost insertion; fresh insertion/Undo and opaque macro preservation.
- Real egui layout frames 1366×740 and 850×560: source/inspector/guide still visible, fit zoom fits the *actual remaining* viewport without changing TeX; fail closed on invalid or undersized viewport.
- Rust fmt, tests, clippy, hosted XeLaTeX/MiKTeX/fonts on exact HEAD. Document CI separately from physical Windows 10 and Mac M1/M4; physical GUI, IME, Retina, native dialogs NOT_RUN.
- C catalogue, A core, D #40, E help, F source tests untouched. Integrator receives exact SHA and runs; PDF remains authoritative, provisional guide non-calibrated.
