# D / QA evidence log — 2026-10-31

## Initial repository reading

main SHA at start: 4ceca871fc2c3b661f92d64f9c6b39b473cebd0a.
Open W01 PR #6 head observed first at 48bcce1b042e972cb710cb8f182fc95a5f29e98d;
then moved to bbb6e90e9195827fbbc86dd51c06e0dbcac63172.
This D workpack branches exclusively from the latter W01 commit.
Main initially has only docs/ and AGENTS.md, hence a D PR against main
would not have a Rust workspace to test: this is a **stacked** PR.

W01 workflow job 41169201065: hosted Windows and macOS both failed at
cargo fmt check, before cargo build/tests; temporary formatting bootstrap
workflow 41169197653 completed successfully. Later W01 runs had not
yet produced trustworthy overall PASS when this D workpack started.
Do not recycle older red results as current head CI results.

## QA executed outside GitHub

- On Linux Python 3.13.5, unit tests for path traversal, duplicate IDs,
  PDF header/EOF checks: **3 passed**.
- On Linux TeX Live 2025/dev, the fixture harness with a **test-only Python
  adapter invoking actual XeLaTeX**, not the Rust CLI: initially 4 PDF/exit
  assertions passed. Visual inspection then found that W01's original
  Cyrillic PDF is **not visually correct**: TeX reported 19
  "Missing character" warnings and the displayed PDF had no Cyrillic.
  This exposes an important false-positive in PDF-only smoke.
- Added a separately authored DejaVuSerif.ttf fixture and an independent
  XeLaTeX log glyph audit (no Missing character warnings). The updated
  local harness now passes 5/5 PDF/error fixtures; pdfinfo confirms all
  4 positive PDFs are one page, and pdftotext confirms exact Cyrillic
  text extraction for the new glyph-audited fixture. The original W01
  example remains labeled **PDF-only / known limitation**, not Unicode PASS.
- This establishes correctness of the QA harness plus the example TeX in
  that specific local environment only. It does not show that TikZarium's
  BuildService or its Rust executable works.

## Architectural risks and gaps

- CI windows-2022 is **Windows Server**; Windows 10 GUI acceptance is untouched.
- Hosted macos-15 ARM64 is not equivalent to M1/M4 user GUI/Retina checks.
- A missing pdfinfo or pdftotext is recorded as NOT_CHECKED, not silently
  passed as a page/text assertion; PDF
  byte integrity remains a separate assertion.
- TeX Live 2026 installation action is initially version-tagged (v4).
  Audit/pin SHA and exact package versions before reproducible release.
- Cargo.lock is not yet in the W01 branch: cargo registry resolution is
  not reproducible. Coordinate locking with A/integrator.
- R4 source, images and licenses are not established, so no R4 files copied.
  Four outliers O027/O028/O030/O047 remain unresolved.
- No shell-escape claim is made from this smoke harness; core code was
  inspected to pass -no-shell-escape, but negative runtime security
  verification remains outstanding.

## Follow-up evidence requirements

When QA workflow completes, record head commit SHA, exact run/job URLs,
tool versions, fixture IDs, pass/fail counts, package installer outcome,
artifact checksums and missing checks in this stream's next insight file.
Do not mark anything PASS before reviewing actual workflow results.
