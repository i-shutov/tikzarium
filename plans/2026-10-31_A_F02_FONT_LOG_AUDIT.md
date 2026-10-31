# A/F02 — lossless XeLaTeX font-failure diagnostics

Date: 2026-10-31. Owner: lane A (XeLaTeX core). Issue #14.

## Starting state / non-overlap

Pinned starting main: f2a55fa13fd9a1e0af2718bc328ed16786975184.
Read open PR #10 (A/W02/W03 runner, draft) and #17 (integration docs);
PR #16 (fontspec/unicode-math + GUI themes) was already **merged**.
The F01 base provides FigureFonts, a GUI font proof and
missing_glyph_messages, which previously returned only individual log
lines. This work does **not** reimplement F01, modify GUI or change the TeX
source. Separate branch: feat/a-f02-font-log-audit, based on main.

## Implemented scope

- [x] Add public, typed audit_font_log with distinct MissingGlyph,
  MissingFont, FontspecError, FontWarning.
- [x] Coalesce XeTeX's wrapped missing-character log messages without
  combining adjacent glyph reports.
- [x] Recognize multi-line fontspec errors and carry exact missing font name
  and .tex source line when supplied by XeLaTeX.
- [x] Treat unrelated fontspec errors as errors without falsely saying the
  font is absent.
- [x] Preserve compatibility: existing GUI font proof still calls
  missing_glyph_messages, which now returns complete glyph/warning records
  from the shared parser.
- [x] Add parser regression tests and real TeX fixtures for missing family and
  missing glyph.
- [ ] Verify cargo fmt --check, cargo test, cargo clippy on exact branch
  SHA in GitHub Actions; do not claim PASS before all checks complete.
- [ ] Verify physically installed fonts and figure proof on Windows 10 x64,
  M1/M4 Apple Silicon machines: NOT_RUN.

## QA contract

A successful engine exit and a clean font log are **not** proof of correct
PDF text extraction or embedded fonts. The existing F01/QA PDF audit remains
separate and must prove literal Cyrillic/Greek text with pdftotext -enc UTF-8
and embedded font tables with pdffonts. Missing tools imply NOT_RUN, never
PASS. No font binary files are added to the repo. TeX input bytes remain
unchanged. No shell invocation is introduced.

Reproduce locally with real XeLaTeX from a disposable directory containing
copies of the fixtures (do not place output next to user documents):

    xelatex -interaction=nonstopmode -halt-on-error -file-line-error -no-shell-escape a-font-missing-family.tex
    xelatex -interaction=nonstopmode -halt-on-error -file-line-error -no-shell-escape a-font-missing-glyph.tex

The first command is **expected to fail** with a missing-family diagnostic.
The second is **expected to return success** while still emitting
Missing character: There is no U+0378 ..., proving why log audit is needed.
DejaVu Serif and fontspec availability are prerequisites for the latter.

## Integration and next bounded block

Do not alter #10's build.rs and diagnostics.rs concurrently; after #10
lands, integrate the typed audit into failed-run structured diagnostics and
persistent .log reports in a distinct A PR. The GUI (lane B) may display
FontIssue without ever changing the scientific figure when the egui theme
changes. D owns cross-platform QA/CI workflow changes. Native hardware
smoke remains an independent release gate.
