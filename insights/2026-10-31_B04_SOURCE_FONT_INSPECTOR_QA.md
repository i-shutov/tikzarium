# B04 — font inspector evidence and limitations

Date: 2026-10-31. B-only work after merged font/theme prototype #16. B04 is **stacked on B03** to avoid conflicting edits to app/main.rs. In-flight A #10/#18 and integrator #17 remain untouched.

## Implementation
The Figure typography window now includes a read-only list of explicit `fontspec` / `unicode-math` commands found in the current buffer, with line-number buttons returning to Source/Split. The separate FigureFonts proof still uses independent XeLaTeX and does not rewrite the user's source. Comments are masked byte-for-byte (preserving UTF-8 offsets), and incomplete commands are omitted; the parser is intentionally not a TeX interpreter.

## Evidence vocabulary
- New Rust unit tests for comment handling, multiline options, Cyrillic, CRLF, escaped percent, source preservation and false command prefixes: **SUBMITTED**, execution unverified until exact-head GitHub CI.
- Local cargo/rustfmt: **NOT_RUN** (not installed in executor; GitHub connector is the only writable repository path).
- Native Win10 22H2 and Apple M1/M4 screenshot smoke: **NOT_RUN**, not replaced by Windows Server or hosted macOS compile jobs.
- An inspector hit means **explicit source hint only**. It does not prove local installation, TeX expansion, font embedding or glyph rendering. Source may contain unknown macros, verbatim material or catcode changes; false positives and negatives are possible.

## Small follow-up
Review B04 exact SHA CI, make any B-only rustfmt/Clippy fixes and collect real physical-platform font inspector screenshots. For effective per-node font selection, request an integration-owned expansion/annotation contract before editing core.
