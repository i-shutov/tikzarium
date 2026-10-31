# B01 — egui source / split / canvas and diagnostics

- Owner: lane B only, issue #3; stacked on W01 integration PR #6.
- Exact base: `eb8b1a10278dd3572ea8e6ca90430372678d2b19` (W01); main at start of run: `4ceca871fc2c3b661f92d64f9c6b39b473cebd0a`.
- Owned files: `crates/tikzarium-app`, this plan and B insight. No core API changes.

## Workpack gates
- [x] Source, Split and Canvas modes; Canvas describes **read-only PDF page 1**.
- [x] Native Save As chooser on Windows/macOS through existing `rfd`.
- [x] Diagnostics and log tabs, clickable one-based line navigation without rewriting source.
- [x] Retained last-good PDF marked stale on failed build or changed source.
- [x] Unit tests: workspace state, Cyrillic and CRLF navigation indices, zoom clamp.
- [ ] `cargo fmt --check`, `cargo test -p tikzarium-app` and clippy: await CI evidence.
- [ ] Windows 10 x64 native GUI, dialog, IME, compact window screenshots.
- [ ] Physical Mac ARM64 Retina native GUI, dialog and keyboard smoke.
- [ ] PDF multi-page navigation, packaged raster renderer: separate future workpack.

## Integration request
`BuildError` currently exposes error text instead of a structured failed-build log. B displays an error diagnostic without invented source spans and preserves last-good PDF. A should propose typed failure diagnostics through the integration stream; B must not modify `tikzarium-core` API.

## Manual visual QA checklist (not performed)
Capture Source, Split, Canvas and a failed-build diagnostic at 1366×768 plus macOS HiDPI; confirm clickable line places caret near visible target; Save As native chooser, stale banner, text input with Cyrillic/CRLF; store versions, SHA, screenshots and observed results. Windows Server CI is not Windows 10 acceptance.
