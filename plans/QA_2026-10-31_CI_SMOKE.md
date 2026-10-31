# D / QA workpack: executable CI matrix and XeLaTeX smoke

Owner: D, issue #5. Created 2026-10-31. Target base: W01 feature PR #6,
with no changes to crates or GUI-owned sources.

## Scope and design

Deliver an independent GitHub Actions check on Ubuntu 24.04 x64,
Windows Server 2022 x64 and macos-15 ARM64, rather than rewriting
the integrator's W01 workflow. Run Rust formatting, full workspace tests,
Clippy warnings-as-errors and Python harness unit tests on each runner.

Install TeX Live 2026 via a cross-platform installer for a separately
reported three-host XeLaTeX job. Compile the real Rust CLI and exercise:
- G00: existing W01 quickstart PDF, one page;
- G00: existing W01 Cyrillic source PDF, page check only (known missing-glyph risk);
- G00: project-authored DejaVu Serif Cyrillic fixture, explicit no-missing-glyph
  TeX log audit and PDF text extraction when pdftotext is installed;
- G01: nested TeX input from a source directory containing spaces and Unicode;
- G08: intentionally invalid TeX, requiring a TeX-specific error and no PDF.

Collect qa-report.json (SHA, host architecture, XeTeX version, per-case status,
PDF checksums, stdout/stderr tails). Preserve fixture logs as Actions artifacts
even when tests fail. Failure must make the job red, never yield a false PASS.

## Acceptance gates

- [x] Independent Python harness unit tests: 3/3 on local Linux Python 3.13.
- [x] Fixture TeX: 5/5 using a **test-only direct XeLaTeX mock adapter**,
  Linux TeX Live 2025/dev; this is NOT Rust CLI verification.
- [x] Local Cyrillic PDF visual/text investigation: W01's legacy example
  omits Cyrillic glyphs with default Latin Modern (19 missing-character
  diagnostics in Linux TeX Live 2025/dev); recorded, not silently waived.
- [ ] Actual GitHub Rust fmt/clippy/test for Linux/Windows/macOS ARM64.
- [ ] Real compiled Rust CLI → XeLaTeX on all three hosted CI runners.
- [ ] Windows 10 x64 real-machine source/UI/preview and file-path smoke.
- [ ] M1/M4 physical macOS ARM source/UI/Retina and PDF smoke.
- [ ] R4 135-case corpus provenance and license review, then vetted import.

No build/release acceptance on the strength of a Windows Server runner.
The macos-15 job must assert ARM64, and source-to-PDF CI is not visual QA.

## Failure triage

Read exact GitHub job and artifact report; log issue against fixture ID,
head SHA, host, TeX version and exit code. Distinguish installer/network
failure, Rust compilation failure, true TeX incompatibility, Unicode path
failure, PDF byte check, and optional pdfinfo page-count verification.
Do not change reference source to suppress TeX warnings.

## Next bounded block

After this PR runs, repair action/package setup failures **only in D files**.
Coordinate core Rust issues with A (no changes to crates). Pin external
Actions to reviewed commit SHAs and Cargo.lock with the integrator;
then add bad-font and missing-package negative cases with retained
TeX diagnostic bundles.
