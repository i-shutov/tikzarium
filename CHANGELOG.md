# Changelog

Unreleased development state, no production release.

## Unreleased — 2026-10-31: integration W01 Unicode gate

- Require DejaVu Serif for the W01 Cyrillic sample rather than the implicit Latin Modern font that dropped 19 characters.
- Gate compiled Rust CLI → XeLaTeX PDFs on real Poppler Unicode text extraction; page count alone is insufficient.
- Preserve source hashes and save PDF/CLI SHA-256, tool versions and extracted text; upload partial artifacts on smoke failures.
- Add seven standard-library Python tests for text audit and failure behavior.
- Native Win10 22H2 GUI, physical M1/M4 Retina GUI and production release are **not** accepted. Lua-only graphdrawing is **not** supported by XeLaTeX.

## W01 baseline

- Four-crate Rust workspace, egui shell, XeLaTeX core/CLI, package catalogue and hosted CI in draft PR #6.
- Independent QA PR #9 documented the missing-Cyrillic-glyph false positive.
