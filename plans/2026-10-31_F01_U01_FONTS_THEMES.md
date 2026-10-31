# F01/U01 workpack — fonts in TikZ and persistent GUI themes

Date: 2026-10-31. Issues #14 and #15.
Integration branch: feat/fontspec-glyph-proof-egui-themes, based on B02.
W01 + B01 + B02 are stacked PRs, not yet all merged into main.

## Scope and acceptance gates

- [x] Core validated font profiles and plain-text-safe snippet generation.
- [x] XeLaTeX proof source with Cyrillic, Greek/math and text/sans families.
- [x] Direct XeLaTeX Linux reference proof was compiled; PDF extracted text and embedded fonts inspected.
- [x] GUI figure font panel, copyable snippet helpers, independent background proof.
- [x] GUI theme palette switching Light/Dark/Midnight/Paper with compactness.
- [x] Persist theme and last-used font settings via eframe.
- [x] Rust unit test cases for invalid families, literal escaping, theme invariance and default settings.
- [x] Separate Linux XeLaTeX font fixture workflow.
- [ ] Run full cargo fmt/check/clippy/test on hosted Windows and macOS ARM on exact PR SHA.
- [ ] Run Linux font workflow on exact PR SHA; archive proof PDF, pdffonts, pdftotext evidence.
- [ ] Confirm real Win10 + Mac ARM font discovery and proof, GUI theme persistence and Retina visual QA.
- [ ] Source-aware TikZ node font inspector: separate adapter milestone.

## Boundaries

No silent compiler switch from XeLaTeX. No bundling external font files. No unverified font fallback. UI themes never update document content or force PDF recompilation. A missing pdftotext/pdffonts results in NOT_RUN rather than PASS.

## Handoff to A/B/D

A: font-aware build diagnostics; B: theme UX and source-aware inspector after this PR; D: per-platform font QA and 1366x768 visual inspection. Each lane uses separate plans/insights and does not rewrite this integration branch concurrently.
