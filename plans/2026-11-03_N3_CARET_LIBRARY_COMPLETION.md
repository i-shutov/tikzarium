# N3 source-caret library completion — integrated candidate (2026-11-03)

Baseline main 5f2c790e; no open PR. N1/N2 are accepted hosted Linux/X11 historical evidence, N5 unsigned packaging merged but physical Win10/M1/M4 NOT_RUN.

One user-facing path: put source caret at the end of \usetikzlibrary{arro} in a literal preamble line; F1 opens Studio Help, displays the SAME C catalogue entry for arrows.meta (Russian explanation, syntax, example, PGF version/manual, warning and independent installed/loaded/engine/tool/help), and Complete applies one C SourcePatch for only the name. Visual Undo restores the exact bytes, including comments, CRLF and opaque Cyrillic macros. No parser or macro expansion; multi-library/macro/body/comment contexts fail closed; unknown source remains editable.

Gates: C and app source contract tests, exact-head fmt/clippy/Rust/D CI; then fresh real Linux/X11 F1 -> click -> Undo -> Save/Open -> XeLaTeX/PDF with original PNG/.tex/PDF/log/SHA review BEFORE merge. Unit/API checks must never be presented as real GUI evidence. No workflow churn or automated TeX installation. Full parameter completion, physical Win10/MiKTeX, Mac ARM/XeLaTeX, installers NOT_RUN/PENDING; N4 deferred.
