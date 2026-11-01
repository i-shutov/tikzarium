# B31 — Compact whole-page XeLaTeX PDF fit under the provisional guide

Date: 2026-11-01. Owner: B egui. Base main: `06b62eea47591c7cb64b0a0cd0026fce8834c9e8` (integrated B30, exact real Linux/X11 I36 accepted). Do not replay #37/#43 or merged #44.

## Reproduced UX issue and bounded fix

Independent I36 desktop screenshot audit for 1180×680 showed that clicking **«Вся страница»** could not display the whole exact PDF while the source, inspector and provisional TikZ guide remained visible: the previous 20% minimum was too large for the remaining preview height. B26 correctly warned but did not solve the first usable vertical. The 20% limit was a UI policy, not a XeLaTeX or source constraint.

- Allow exact XeLaTeX PDF raster whole-page scale down to 2% **only if geometry actually fits** the post-guide viewport; keep conservative 24pt scrollbar margin. Explicit warning remains if even 2% cannot fit; no claim of calibrated PDF/guide coordinates.
- Align manual +/- limits to 2% to prevent a jump from e.g. 7% to 20% after Fit Page. Zoom displays the true rounded percentage. Tooltip explains readability trade-off. Manual zoom turns off auto-fit.
- Leave all editable TikZ/TeX bytes untouched; do not change shared C commands, arbitrary macros/scopes, TeX executor, A/D/E/F ownership, provenance or library detection.

## Evidence and acceptance

- Test the production `fit_page_zoom` and `refit_selected_page` for 1200×1700 raster within 500×150 PDF preview, continuous manual zoom and fail-closed genuinely too-small viewport.
- New headless `egui::Context::run(RawInput)` split panels with *real* editable `TextEdit` and production `tikz_canvas::show_guide` at 1180×680 and 850×560. This is UNIT_EVENT/LAYOUT, not a physical OS or independent screenshot.
- Retain six-pointer/selection/source/F1/Undo/Save-Reopen coverage from integrated B16–B30. Compare exact source and ensure no unexpected Undo entry.
- Require exact-head CI Rust, D QA, N1, MiKTeX, fonts; independent X11 screenshot of new Fit Page behavior before acceptance. Hosted Windows Server does **not** establish physical Win10. M1/M4 physical tests NOT_RUN.
- External XeLaTeX PDF remains authoritative; provisional guide has no verified coordinate calibration.
