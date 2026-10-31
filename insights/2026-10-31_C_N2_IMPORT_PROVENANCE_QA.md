# C/N2 literal declaration provenance — QA and evidence ledger

Date 2026-10-31. Scoped only to i-shutov/tikzarium stream C.
Base main 6d15d86344ab1281391d3ea1b458dc18ae443985, with N2 #51 already merged.

## Changed behavior

The N2 scanner can now produce exact read-only byte ranges for verified direct
literal \usepackage / \usetikzlibrary **names**. Indirect, conditional and
macro-dependent names have no site. Site absence does not itself mean
NOT_LOADED: check Evidence::Unknown vs Absent separately. No ability to edit
a site directly or to treat package discovery as a project declaration.

An invalid \usepackage-before-documentclass sequence previously could be
classified CONFIRMED after a later documentclass. It is now UNKNOWN, and all
automatic patch planners refuse such a document. No user source is mutated.

## Tests added (results not presumed)

- CRLF + Cyrillic comments, option-bearing package comma list and library
  comma list: every range matches exact original source name bytes.
- BOM and indentation: original UTF-8 offsets maintained.
- Trusted declaration before opaque later macro keeps a site; a later or
  conditional import is UNKNOWN with no invented site; no patch is offered.
- Invalid order (package before class) is UNKNOWN without unsafe auto insert.
- Multiple direct sites are reported; duplicate library removal still refuses.
- Original six primitive fixture remains project-loaded with distinct
  installed/loaded/engine/tool/help states and no visual-editability claim.

## Validation ledger

- Local sandbox has no cargo/rustc and git clone DNS fails; local Rust test,
  Clippy and rustfmt: NOT_RUN. This text is not a PASS claim.
- New tests require exact PR HEAD GitHub Actions evidence before any PASS.
- B handoff on PR #50 is additive; no B app changes performed here.
- External XeLaTeX compiler and physical Windows 10 / MiKTeX and Mac ARM64
  M1/M4: not exercised by this source-attribution change.
- B inspector focus/highlight and visible diff/undo are **not** implemented by
  this C PR; project source remains the sole authority.
