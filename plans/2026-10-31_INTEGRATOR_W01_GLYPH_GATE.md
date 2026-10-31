# Integrator W01-G — Cyrillic text/glyph correction

2026-10-31. Exact parent W01 commit: `aae15fb9f425921aa0f37fc39ba6354eabc4fefa`. Scope is integration quality, separate from A/B/C/D source ownership.

## Root cause

Draft PR #6's XeLaTeX Linux CI at [run 41169414557](https://github.com/i-shutov/tikzarium/actions/runs/41169414557) was green but tested only `pdfinfo Pages: 1` for `cyrillic.tex`. Independent PR #9 identified 19 missing Cyrillic glyph warnings due to implicit font fallback. The previous PDF therefore cannot count as Unicode acceptance.

## End-to-end code workpack

1. Explicitly set Cyrillic-capable `DejaVu Serif` in the source fixture; install `fonts-dejavu-core` on Ubuntu.
2. Run built Rust CLI against real XeLaTeX; retain PDF page count and add Poppler `pdftotext` checks for 3 Russian fragments.
3. Cover NFC, line-wrap normalization, missing Russian text, missing/bad PDF, external tool errors and failure artifact retention with Python stdlib tests.
4. Preserve source SHA-256, output checksums and toolchain provenance; retain partial artifacts on workflow failure.
5. Review isolated integration PR into `feat/w01-xelatex-egui-core`, merge only after its own SHA-specific green CI; check fresh W01 commit CI before integrating base PR #6 into `main`.
6. Reevaluation of stacked PRs #7/#8/#9/#10 is mandatory after W01 branch advances.

## Explicit release blockers

Real Win10 x64 GUI interaction and physical Apple Silicon M1/M4 GUI/Retina smoke: **NOT_RUN**. Original R4 O027/O028/O030/O047 warnings: **OPEN**. General TikZ/PGF extension matrix: **no new compiled compatibility claim**. No release until physical acceptance.
