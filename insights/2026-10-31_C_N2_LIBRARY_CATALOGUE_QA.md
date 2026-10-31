# C/N2 library catalogue — QA ledger

2026-10-31; base main `b7c8e993b9da64060dfd3261833e4be3a1d280ba`. Work limited to C-owned Rust, extensions/, docs/EXTENSIONS.md, C plans/insights.

## Engineering changes

The library panel can consume four versioned declarative records, including original Russian help, actual native import syntax and complete XeLaTeX examples, without duplicating knowledge in egui. All four library imports remain ordinary source patches. The six primitive generators and all parameter help are untouched. A library may be present in the installation, not loaded in the project, compatible with XeLaTeX, lack a dedicated tool, and still have documented help: five axes are deliberately not collapsed. `arrows.meta` has one narrow generator (arrow), other three have no dedicated visual generator; generic `visual_editable` stays false. No package is installed or silently connected.

Primary manuals checked on 2026-10-31: tikz.dev/tikz-arrows §16.5, tikz.dev/tikz-shapes §17.5.3, tikz.dev/tikz-coordinates §13.5, tikz.dev/library-fit §54. No full manual copied; unsupported PGF minimum is UNKNOWN.

## Validation required (never infer PASS)

New Rust tests: catalogue cardinality/help, six-tool source identity, five independent library states, opaque import UNKNOWN, all-four CRLF connect/disconnect and Undo, inverse source revision mismatch, already-loaded vs absent. A C-owned binary prints a full original TeX fixture for any of four libraries; D must run real XeLaTeX and archive logs/PDF/hash before a compiler PASS can be claimed.

Local sandbox lacks cargo/rustc and cannot resolve GitHub; local Rust/TeX execution NOT_RUN. This is a source-level implementation requiring exact SHA CI confirmation. B #50 was notified of the additive contract before code. Physical Win10 external MiKTeX, physical M1/M4 GUI/screenshot and display of library panel: NOT_RUN.
