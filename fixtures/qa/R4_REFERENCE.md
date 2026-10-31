# R4 graphics research corpus: reference-only registry

Canonical local research pack: user's TikZ/PGF R4 scientific graphics skills,
dated 2026-10-29. Its exact accessible source URI, full checksum manifest,
authorship and redistribution licenses are not present in this repository.

Recorded legacy claims (NOT re-verified by these fixtures):

| Population | Legacy result | Local/CI status |
| --- | --- | --- |
| Active TeX-to-PDF cases | 135 compile / 135 | NOT IMPORTED / NOT RUN |
| Raster pages | 158 | NOT IMPORTED / NOT COMPARED |
| Semantic tests | 18 | NOT IMPORTED / NOT RUN |
| Strict warning gate | 131 / 135 | NOT RE-RUN |
| Warning outliers | O027, O028, O030, O047: extra nullfont .01pt | UNRESOLVED |
| Historical excluded themes | 7 | NOT RE-RUN |

The project-authored cases in manifest.json are new smoke tests and are
NOT a substitute for R4. Do not import images, screenshots, third-party
TeX, external binaries or generated PDFs without checking provenance,
copyright/licensing, source location and hashes first.

## Future ingestion sequence

1. Find authoritative R4 manifest and original assets; record immutable source URI,
   license/author, file SHA-256, engine version, fonts and platform for each fixture.
2. Separate owned, permissively redistributable, private-test-only and uncertain
   provenance cases. No repository check-in for uncertain cases.
3. Run original 135 cases on unchanged original environment and compare the
   four strict-warning anomalies without silently altering fixtures.
4. Test compatible, consented subsets with XeLaTeX on Linux, Windows 10 x64
   and native macOS ARM64. Record failures per engine and OS.
5. Raster comparisons must record renderer, DPI, font versions and meaningful
   vector/text differences; do not require byte-identical PDF hashes across hosts.
