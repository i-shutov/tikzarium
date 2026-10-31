# Changelog

Unreleased development state; no production release.

## Unreleased — 2026-10-31: W01 → B01 → B02 → F01/U01 merged to main

- Integrated four **real, previously tested** PRs in dependency order: #6, #8, #12, #16. Main after #16: `3f71681a4d0febe143f0777d635867e9287e82eb`.
- W01: Rust workspace, source-preserving XeLaTeX runner and exact PDF/first-page raster preview, Linux real-compiler fixture, hosted Windows/macOS Rust checks.
- B01: egui Source/Split/Canvas, native Save As, clickable diagnostics, last-good PDF; Canvas remains read-only.
- B02: path-aware stale PDF guard, safe export gating, Ctrl/Cmd open/save/build shortcuts and in-flight file identity protection.
- F01: validated `fontspec`/`unicode-math` figure family recipes, isolated XeLaTeX glyph/embedding PDF proof, no mutation of author TeX source.
- U01: independent persistent egui Light/Dark/Midnight/Paper themes and compact density. UI appearance is not a TikZ style or TeX font.
- Added integration `plans/` and `insights/` SHA/run/artifact ledger; branch-head CI green, **post-merge main CI pending when ledger authored**.
- Release blockers remain: physical Windows 10 x64 and M1/M4 acceptance, full extension family testing, reliable multi-page PDF UI, visual editing. LuaTeX-only packages are not promised under XeLaTeX.

## Unreleased — 2026-10-31: integration W01 Unicode gate

- Require DejaVu Serif for the W01 Cyrillic sample rather than the implicit Latin Modern font that dropped 19 characters.
- Gate compiled Rust CLI → XeLaTeX PDFs on real Poppler Unicode text extraction; page count alone is insufficient.
- Preserve source hashes and save PDF/CLI SHA-256, tool versions and extracted text; upload partial artifacts on smoke failures.
- Add seven standard-library Python tests for text audit and failure behavior.
- Native Win10 22H2 GUI, physical M1/M4 Retina GUI and production release are **not** accepted. Lua-only graphdrawing is **not** supported by XeLaTeX.

## W01 baseline

- Four-crate Rust workspace, egui shell, XeLaTeX core/CLI, package catalogue and hosted CI in draft PR #6.
- Independent QA PR #9 documented the missing-Cyrillic-glyph false positive.
