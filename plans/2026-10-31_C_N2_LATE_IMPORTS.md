# C/N2 — late library loading and external-source ambiguity

Date: 2026-10-31. Repository i-shutov/tikzarium. Base main SHA ab5705d4dd7e3dcefd3ef6ddfd695f6d0ee4dfd1. N1 #44 and earlier C/N2 #49/#51/#55 are merged; **do not replay #39**. Read live AGENTS, main, open PRs, C plans and insights before editing. No A/B/D/E/F files touched.

## Real correctness gap

The old targeted scanner stopped at literal \begin{document} and declared the missing calc/fit libraries Absent even when they were explicitly loaded later in the document body. This is a demonstrable XeLaTeX-valid pattern, not just a theoretical concern. An Absent UI state can lead to an incorrect user-visible "not loaded" statement and an earlier duplicate import diff. The exact external XeLaTeX fixture is extensions/primitives/fixtures/late-library-in-body.tex.

## Single bounded source-first vertical

1. Preserve existing trusted direct preamble declaration sites, UTF-8 offsets, five independent capability dimensions, the six primitive generators and all Russian help. C adds no visual application, CST, macro expansion, geometry solver or package installer.
2. After the explicit begin-document anchor, conservatively look for exact TeX control words usepackage, RequirePackage, usetikzlibrary, input, include and csname. Ignore commented and escaped spellings; do not falsely match longer control names. This signals **possible** runtime imports, not actual confirmed package loading, since verbatim and macro scopes are opaque.
3. If a possible late import is detected, mark missing dependencies UNKNOWN; preserve already-confirmed preamble imports. Report a bounded diagnostic and refuse source connection/disconnection plans. B retains source diff/Undo UI and raw source editing.
4. Add C-owned Rust tests for a genuine late calc fixture, body file inclusion/dynamic controls, LF/CRLF, commented/escaped/long-control negatives, no mutation, and original six-tool regression. Keep E/F source/help test files untouched.
5. Independently compile the fixture with externally installed XeLaTeX and record source/PDF SHA; hosted CI gates are fmt/check/test/clippy plus N1 regression, not physical Windows 10 MiKTeX or Mac M1/M4 GUI tests.
6. Handoff to B via an additive API note: same inspect()/status()/begin_document_target() contract; no new B type changes required. D may incorporate this fixture in its native XeLaTeX smoke matrix.

## Acceptance conditions and scope limit

- Exact branch HEAD and CI outcomes must be recorded; no PASS based on older commits.
- No returned SourcePatch when the body might load libraries; source remains byte-for-byte unchanged.
- The scanner is a targeted ambiguity detector, **not complete TeX evaluation**; arbitrary unrecognized macros may still import indirectly. If exact source proof is unavailable, use UNKNOWN where a supported ambiguity is detected.
- No claims about installed packages, visual edits, physical Windows 10 x64 MiKTeX or Apple Silicon Mac.
