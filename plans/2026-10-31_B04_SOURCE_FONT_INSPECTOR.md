# B04 — read-only font references from current XeLaTeX source

Date: 2026-10-31. Lane B only. Stacked on B03 `feat/b03-pdf-pagination` at `ca12580c6d964cd1f9b80493ba2808b2ec52875b`, because both touch app `main.rs`. B03 must merge before retargeting this PR to main. Original B03 base main `f2a55fa13fd9a1e0af2718bc328ed16786975184`.

## Scope
- [x] Reuse merged F01/U01 #16 Figure typography panel: no duplicate font proof or theme implementation.
- [x] Scan *explicit* `fontspec`/`unicode-math` font declarations in the **current source text**, not a copy or a generated TeX document.
- [x] Handle comments and literal escaped percent, newlines/CRLF, Unicode font names, one optional bracketed feature group and nested braced arguments.
- [x] Cover `setmainfont`, `setsansfont`, `setmonofont`, `setmathfont`, `newfontfamily` and `fontspec`; show source line and family, click to jump to source, open Split if Canvas was selected.
- [x] Never modify source, color palette, PDF, selected proof fonts, or other lanes' APIs.
- [x] Unit tests for Cyrillic, comment filtering, escaped percent, macro references, CRLF, incomplete declarations and non-matching command prefixes.
- [ ] Hosted exact-SHA cargo fmt/check/test/clippy — pending workflow.
- [ ] Interactive Windows 10 x64 and physical Mac ARM64 proof/screenshot test — NOT_RUN.

## Explicit non-goals
This is a lexical **source-reference inspector**, not TeX expansion or OS font discovery. A listed name is **not proof** that the font exists, is embedded in PDF, or is effective for a particular TikZ node. TeX macros, conditionals, verbatim regions, unusual catcodes and package-defined font commands can yield misses/false positives. Font proof remains an independent XeLaTeX + optional Poppler check. Do not turn lexical hints into PASS. Full effective-font inspection requires an explicit agreed integration API and real PDF analysis.

## GUI acceptance
On each physical OS, open source containing `\setmainfont{DejaVu Serif}` and a node with `\fontspec{DejaVu Sans}`; open Figure fonts → Source references, click both, verify source caret navigation and no output-PDF/source SHA change. Repeat with a commented-out declaration and Cyrillic family label. Use Light/Dark/Midnight/Paper at compact and comfortable density. Capture screenshots with exact app SHA, OS version, DPI, font proof report and hashes.

## Integration handoff
A #10 owns structured compiler failure diagnostics; B04 does not change core. A #18 owns missing-glyph/font messages. #17 owns integration/release QA; do not edit their plans or insights. Next B-only block after B04: physical screenshot acceptance and controlled font/source inspector usability fixes.