# Scientific Studio 1.0 — SC3 source-safe PGFPlots properties

2026-11-11. Exact base after merged SC1 #181 and SC2 #182: main 9828acb042c3ecac8f03ef118a3c49669597ffca. Original source branches: [#149](https://github.com/i-shutov/tikzarium/pull/149) axis bounds, [#151](https://github.com/i-shutov/tikzarium/pull/151) ticks/sizes/markers/plain labels, stacked on #148 source scanner. These were originally research-only; owner now includes scientific source support in v1.0.

## What code is ported

1. The scientific_scan.rs exact Git blob from PR151 head c81be09836493c2ecd24699cbdbed90b6a70900a on top of the already merged SC2 scanner; original SC2 version in main matched PR151 ancestor.
2. Original tests for scientific_142_axis_limits, scientific_142_lexical_coverage and scientific_142_style_literals are ported verbatim by Git SHA. Existing scan test unchanged.
3. Only the tikzarium-extensions crate and regression tests change in this PR; no app main.rs/Inspector or figure fixtures. This keeps UX2 branch ownership independent.
4. The adapter only applies revision-checked minimal SourcePatch for recognized literals. Unknown TeX macros and unsupported PGFPlots grammar remain OPAQUE; actual engine defaults are not invented. Numeric axis bounds, supported tick distances/lists, width/height with original unit, plot marker and plain label values are scoped by the source tests.

## Acceptance and limits

Before merge: exact-head cargo fmt, clippy -D warnings, tests for all four scientific scanner/axis/style files and workspace across Linux/macOS/Windows, source review of unknown/negative cases. Compare original corpus files/hashes; no rewritten scientific fixtures. This is source-level scientific functionality, not a visually edited GUI figure. It does **not** complete SC3+AT4 L3, SCI142 142/103, optical/physical review or Windows W2b/W3/DPI/IME. Follow-up: new Studio Inspector with real controls and one Apply/Undo, external XeLaTeX PDF exact source.
