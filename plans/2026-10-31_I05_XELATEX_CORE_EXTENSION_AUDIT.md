# I05 — Integrate A runner and C03 package evidence
Date: 2026-10-31 · project: i-shutov/tikzarium · starting main SHA `e3a78ae5646ef24994161c8ebe7bfaaf7a7d2ab6`

## Scope and ownership
Integrate A's standalone #10 changes without force-merging its conflicting `diagnostics.rs`, preserving F02 Unicode glyph audit (#18). Connect the merged C03 #21 artifact auditor to actual cross-platform XeLaTeX matrix. Preserve independent B04 #20 and multipage I04 #23, both now in main.

## Vertical workpack
- [x] Import source-safe runner and CLI: direct XeLaTeX argv with `-no-shell-escape`; leading-dash/dotted filenames; optional durable `.log`; atomic PDF output; cancel/timeout log retention; normalized `.fls` dependencies.
- [x] Merge source-aware `BuildDiagnostic` with all previous font-warning semantics, including `Missing character:`, `LaTeX Font Warning`, `Package fontspec Warning`.
- [x] Wire failed-build structured diagnostics and log excerpt to GUI, with current-file-only jump guard; retain stale last-good PDF.
- [x] Bring A's native/Unix fake-compiler tests and distinct CLI tests, preserving font proof and GUI test contracts.
- [x] Call production C02 `run_smoke.py` and independent C03 `verify_smoke.py` for five fixed cases; retain Linux evidence and cross-platform WinServer/macOS ARM evidence in existing CI artifact structures.
- [x] Keep TeX package detection, compilation evidence and visual-editability separate.
- [ ] Exact integration PR Rust fmt/check/clippy/test on Windows Server and macOS ARM; Linux real XeLaTeX; D 6-job matrix, font proof — **PENDING GitHub CI**.
- [ ] Confirm five-fixture observations, all hashes, expected Lua-only negative; inspect uploaded JSON, not just green workflow.
- [ ] Full Windows 10 x64 and physical Apple Silicon M1/M4 GUI acceptance, font/theme persistence, Unicode input and native PDF interaction — **NOT_RUN**.

## Acceptance gates
1. Build source/byte integrity and recorded `.fls` dependencies preserved. Failed XeLaTeX returns source/line diagnostics and persistent log.
2. Source-linked warnings and missing-glyphs survive core refactor; bad include source does not make GUI jump to wrong line.
3. Actual installed extension fixtures: four positive 1-page PDFs plus one engine-incompatible graphdrawing negative with correct LuaTeX diagnostic, hashes matched. Only specific package/host scoped claims.
4. All 3 hosted build CI and 6 independent D QA jobs succeed against the **same Git SHA**. A successful branch run does not prove physical Win10 or Mac M1/M4.
5. Merge to main only after checked evidence and conflict resolution; then mark superseded #10 appropriately and record integrated SHA.

## Follow-on work
- Replace optional external Poppler dependence with reviewed packaged renderer, or documented native deployment.
- File watcher: dependency fingerprints for included resources, not only open document source.
- Process-tree termination for TeX helpers; `-no-shell-escape` is not an OS sandbox.
- Real native 1366×768/Retina visual acceptance before internal v0.1. No geometry-aware direct drawing yet.

## New cross-version negative control
- [x] Observed real TeX Live **2026 / PGF 3.1.12** failure text wraps inside “graph” (`grap\n h`), unlike TeX Live 2023. Four other extension fixtures compiled successfully.
- [x] Keep Lua-required message semantics exact; tolerate intra-word TeX log line wraps; added unit regression examples for graph/drawing/library word splits.
- [ ] Re-run I05 exact-head 3-host CI and inspect **actual** negative observation + independent auditor JSON. A previous Linux D job failed despite valid expected engine failure because the old recognizer missed the wrapped word — not a successful 5/5 until rerun.
