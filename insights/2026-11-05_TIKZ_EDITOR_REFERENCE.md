# TikZ Editor 1.1.0 — Windows UX and distribution benchmark

Reference: https://github.com/DominikPeters/tikz-editor/releases (latest observed app-v1.1.0, published 2026-11-04). Read project README, DEVELOPMENT.md and MIT LICENSE from default master; no code, artwork, fonts or assets copied to TikZarium.

## Directly relevant to Windows release 1.0

- **Windows distribution contract:** v1.1.0 publishes portable x64 ZIP, Setup EXE and MSI along with matching signatures. TikZarium should start with proven x64 native GUI/CLI PE roles and real portable ZIP smoke; installer comes **after** genuine user Windows 10 GUI and external MiKTeX testing, not before.
- **Native UX quality:** dense inspector, compact tabs/panels, Windows Fluent/system accent/Snap Layouts and keyboard-accessible menus are useful evaluation criteria during real Windows GUI review. No speculative implementation or new feature work without a verified release defect.
- **Editing safety:** v0.5.0 notes unnecessary default options and modifier hints in status bar. TikZarium must continue minimal revision-checked SourcePatch, preserve user macros/CRLF/comments and provide legible guidance; compare ergonomics with original screenshots only.
- **Input/authoring ergonomics:** v1.0.0 mentions on-canvas text/math, code completion and syntax highlighting. Keep as follow-on research rather than expanding the frozen first Windows release.

## Not adopted for this release

Its core architecture uses a lossless TikZ AST, semantic scene graph and SVG renderer (per DEVELOPMENT.md); desktop is Tauri v2. TikZarium intentionally remains native Rust/egui, ordinary editable TeX authority, six supported native TikZ commands and **external XeLaTeX PDF**. No new TeX parser/evaluator/CAD/solver, Beamer workspace, imports/AI/auto-update or new domain tools for 1.0. MIT permissive license is noted, but no copying is necessary. Preserve Windows/macOS/Linux source compatibility.

## Honest comparison and concrete acceptance

1. Validate real Windows PE GUI window without console flash, CLI console behavior, exact ZIP source and SHA.
2. Review actual running Windows GUI at compact/full-HD/DPI using original screenshots, F1/right inspector, icon pallettes, native menus/file dialogs, keyboard/IME and correct source/PDF.
3. Document differences as known scope (not regressions) and do not call portable binaries a Windows 10 PASS without actual user-machine acceptance.
