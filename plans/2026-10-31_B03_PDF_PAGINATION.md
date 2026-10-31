# B03 — read-only, multi-page PDF navigation (egui lane B)

Date: 2026-10-31. Owner: B. Base `main` commit `f2a55fa13fd9a1e0af2718bc328ed16786975184`.
Issue context: #14, #15; F01/U01 prototype #16 **merged** into main, so it is reused rather than copied.
Open PRs read before work: A #10 (structured TeX failure API, conflict), integrator #17 (docs), A #18 (font audit). Do not modify those lanes.

## Single vertical slice
- [x] Optional `pdfinfo` page-count probe using the exact `BuildArtifact.pdf` bytes; never guess page count when the tool is absent/fails.
- [x] Explicit 1-based Page N / M, Previous, Next in read-only Canvas and Split modes. The existing first-page BuildArtifact raster stays the first preview.
- [x] Rasterize a selected page in a background worker using the configured Poppler `pdftoppm`, an isolated temporary PDF, and a direct (no shell) invocation; no edits to TeX, PDF or core API.
- [x] On decoder/raster failure, preserve the last displayed page and provide visible failure text. Unavailable `pdfinfo` disables pagination, clearly marks count NOT_CHECKED.
- [x] Epoch-guard page workers against a newer document or completed build; changing source/path still marks retained PDF stale, prohibits its export, and keeps it inspectable.
- [x] Pure tests for Poppler metadata, page bounds, zero-page rejection.
- [ ] Rust fmt/check/test/clippy on exact PR SHA — GitHub workflow required (no local rust toolchain in this executor).
- [ ] Real PDF smoke with a known 2-page XeLaTeX specimen, page 1 → 2 → 1; screenshot and source/PDF hash checks — NOT_RUN.
- [ ] Windows 10 x64 physical GUI and macOS ARM64 physical GUI — NOT_RUN (hosted CI is not a substitute).

## Reproduction + visual acceptance
Create `two-pages.tex` with:
```tex
\documentclass{article}
\begin{document}
First page — Привет.
\newpage
Second page — Геометрия.
\end{document}
```
Run XeLaTeX from the GUI in Source → Split → Canvas. With `pdfinfo` and `pdftoppm` on PATH, inspect Page 1/2 and Page 2/2, verify Next/Prev disabled at bounds and visually distinct text. Change source without Build and confirm a STALE indicator, blocked Export PDF and continued navigability of last-good preview. Build another file while a page is rasterizing; no old-page completion may replace the new PDF. Test also without `pdfinfo` (Page 1/? and disabled navigation) and without `pdftoppm` (PDF export still works, bitmap unavailable).

Capture for each platform: exact head SHA; OS/CPU; screen size/scale; XeLaTeX/`pdftoppm`/`pdfinfo` versions; first and second page screenshots; source+PDF SHA-256; per-case PASS/FAIL/NOT_RUN. No screenshots are inferred from CI build logs.

## Strict limits and handoff
This is **navigation of a read-only PDF**, not geometry-aware canvas editing. `pdfinfo` is an optional external metadata reader; a missing tool is an explicit unverified gate, not a guess of one page. Large PDF copies can increase peak memory until the worker finishes; rendering does not include cancellation/timeouts in B03. No core API or other workstream files changed.

Next independently reviewable B blocks: read-only source font inspector with honest macro/override limitations; wire failed-build line diagnostics after A #10 is reviewed and integrated; compact/comfortable screenshot QA on physical targets.