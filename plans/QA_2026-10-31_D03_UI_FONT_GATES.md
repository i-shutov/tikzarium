# D03 QA gates — PDF font identity and GUI preference unit contract

Date: 2026-10-31. D-only workpack, based on `main` SHA `f2a55fa13fd9a1e0af2718bc328ed16786975184`.
Relevant merged PRs: #9 (D QA), #16 (F01/U01). Open related PRs: #10 A/W02,
#17 integration gates, #18 A/F02 font logging, #19/#20 B GUI, #21 C03.
Do not touch these lanes' source, plans or insights. Issues #14 and #15
remain open until target-host evidence exists.

## Concrete changes

1. `qa_smoke.inspect_pdf`: require `pdffonts` font NAME, optional
   six-uppercase-letter subset prefix, anchored expected family and
   `emb=yes` from the fifth column counting backwards. Never accept
   name substring hidden in another font's name or unrelated table columns.
   Reject empty/unparseable/nonzero Poppler results. Record parsed font
   names and embedding flags in JSON. Six offline negative/positive tests.
2. GUI Rust *unit contract* executable: inspect `cargo test -p
   tikzarium-app -- --list`; reject missing B/U01 theme/default/figure
   source isolation tests and font worker tests; re-execute both test
   groups and require positive passed counts. Save structured evidence.
   Six offline contract tests, including zero-tests and cargo failure.
   This is NOT a real GUI session or restart smoke.
3. Workflow matrix adds explicit architecture assertion in the XeLaTeX
   job (`RUNNER_ARCH` plus `platform.machine`), uploads separate unit
   contract evidence for each Rust host, and runs on `main` pushes in
   addition to PRs/manual invocations. Maintains hosted Windows Server
   versus physical Windows 10 distinction.

## Acceptable CI evidence

- All six `D QA matrix` jobs for the **exact head SHA** must complete
  successfully: Rust fmt/clippy/workspace tests/Python and *genuine*
  compiled Rust CLI → XeLaTeX fixture suite on Ubuntu 24.04 x64,
  Windows Server 2022 x64, hosted macOS-15 ARM64.
- The three UI unit-contract artifact JSON files require `status:
  PASS_UNIT` with all named tests registered/executed.
- Fixture reports require manifest/source SHA, source invariance,
  Cyrillic `pdftotext -enc UTF-8`, `pdffonts emb=yes` records,
  no `Missing character:` in the TeX log and one-page PDF proof.
- Known legacy OS-font-family limitation MUST remain `KNOWN_LIMITATION`,
  never counted among passes. A zero-exit or existent PDF alone is
  insufficient for a glyph or font verdict.
- GitHub-hosted success is `CI_ONLY`, not Windows 10/M1/M4 acceptance;
  integration font proof and GUI theme exercise remain independent.
- No R4 sources imported. License/provenance audit and O027/O028/O030/O047
  remain required before using or redistributing the reference corpus.

## Physical Windows 10 x64 and M1/M4 test protocol (NOT_RUN)

On each physical host, capture host OS build, CPU architecture, monitor
DPI/Retina scale, app build SHA, TeX engine + font and Poppler versions.
Build and launch native `tikzarium-app`; open the same original
UTF-8 `.tex` at a Unicode path. Record source SHA-256.

For each UI theme Light/Dark/Midnight/Paper, change the palette, toggle
compactness, close cleanly and restart the application. Verify the same
theme and density are restored. Exercise a saved older partial preference
record, corrupted settings (with backup/restore), and restart after
changing figure font settings. Do not modify real user preferences in
place without preserving a copy. Capture before/after GUI screenshots.

Compile actual fontspec+unicode-math TikZ proof on the native host;
require visible Cyrillic and Greek in real PDF, `pdftotext` presence,
`pdffonts emb=yes` for named fonts, no missing-glyph diagnostics and
a readable preview. Change only UI palette; confirm source SHA-256
unchanged and that *the same already-generated PDF* remains byte-identical
on export without recompiling. If recompilation is necessary, do not
compare PDF bytes blindly (timestamps/IDs may differ); compare text,
font-embedding records, rendering at fixed DPI and extracted colors.
Check native file picker, Unicode paths, relaunch, preview/zoom/scroll
and display scale. Capture defects with SHA, screenshot, reproduction
steps and logs.

Do not assert physical PASS until a real owner-run, timestamped result
exists for Windows 10 22H2 x64 and separately for Mac M1 and Mac M4.

## Next bounded block

After exact-head PR run, examine every job conclusion and uploaded JSON.
Repair workflow or D harness failures only. If B-owned tests are missing,
file a reproducible report to B rather than editing crates. If the
hosted CI is green, advance physical QA evidence capture and R4 provenance,
not release acceptance.
