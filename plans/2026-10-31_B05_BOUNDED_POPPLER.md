# B05 — bounded Poppler workers for multi-page egui preview
Date: 2026-10-31. Lane B. Base main `e3a78ae5646ef24994161c8ebe7bfaaf7a7d2ab6`.
Dependency: B03 (#19) and B04 (#20) are merged. F01/U01 #16 is merged; reuse themes without editing `ui_theme.rs`.
Open PRs at start: A #10 (core/CLI only), integration #24 (includes app `main.rs` and `ui_state.rs`). This block deliberately changes neither of these overlapping paths.

## Scope and acceptance
- [x] Keep existing first-page and selected-page PDF preview and XeLaTeX as authority.
- [x] Run `pdfinfo` and `pdftoppm` as direct child processes with worker-side deadlines (12s / 45s), kill and reap on deadline.
- [x] Redirect stdout/stderr to temporary files, then read at most 64 KiB each, preventing pipe backpressure deadlocks and unbounded captured output memory.
- [x] Refuse raster PNG files over 64 MiB before loading into an egui texture; show a bounded, explicit error while retaining previous page. The budget does **not** prove decoded pixel memory safety.
- [x] Add Unix fake-tool regressions for successful stdout/stderr capture and a hung tool; preserve existing page-count and bounds tests.
- [ ] Exact-head hosted `cargo fmt --check`, `cargo test`, `cargo clippy` (unverified until Actions finishes).
- [ ] Actual Windows 10 22H2 x64 and physical macOS ARM64 GUI/Retina/IME screenshot smoke (NOT_RUN).
- [ ] Real Poppler timeout/oversize GUI smoke on each target host (NOT_RUN).

## UX and failure contract
A timeout is not successful page enumeration or rendering. The existing B03 UI marks metadata failure as navigation NOT_CHECKED and retains the displayed page on render failure. No user document/PDF file is modified by these workers. No core API change, no modifications to themes, FigureFonts, font inspector, or upstream plans/insights.

## Next small block
Once integration #24 lands, independently review whether the completed failure-diagnostic view correctly identifies source paths. Separately run the native smoke protocol in `crates/tikzarium-app/QA_POPPLER_WORKERS.md`. The 64 MiB PNG **compressed file** budget is not a decoded image dimension cap; discuss a separate memory-safe decode requirement with the integrator.
