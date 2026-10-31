# I10 — integration of D07 real MiKTeX gating and C/N2 source library operations

Date: 2026-10-31. Repository: i-shutov/tikzarium. Baseline main `9b20edcd2e1dedab228a4d0d96e969b0bf139a95`; exact integrated main `6d15d86344ab1281391d3ea1b458dc18ae443985`.

## Accepted code, not merely tasks
- [x] [D07 #52](https://github.com/i-shutov/tikzarium/pull/52): real hosted Windows Server MiKTeX proof automatically reruns on changed app/extensions/Cargo/fixtures via PR and main push; structural regression test. Integrated `1e3a1e7131bd6e8d9c9d9d9c93ae5c9203c0f455`, exact checked D head `69387a230d746a0af16bc46593ca21b1dfe882d5`.
- [x] [C/N2 #51](https://github.com/i-shutov/tikzarium/pull/51): source-safe `\usetikzlibrary` disconnect proposal and strict literal-evidence scanner with flat font selection recognition; 9+ new Rust tests. Integrated `6d15d86344ab1281391d3ea1b458dc18ae443985`, exact checked C head `3d64c60815f7980df67394ce6fd2541f80b75c43`.
- [x] Rust/D QA, font and real N1 app-state→XeLaTeX checks on the exact C head; Rust/D QA/font and genuine hosted MiKTeX checks on exact D head. Artifacts independently downloaded and inspected.
- [x] **Exact post-merge main fully checked**: Rust [41203529736](https://github.com/i-shutov/tikzarium/actions/runs/41203529736) 3/3, D QA [41203529679](https://github.com/i-shutov/tikzarium/actions/runs/41203529679) 7/7, real hosted MiKTeX [41203529698](https://github.com/i-shutov/tikzarium/actions/runs/41203529698) 1/1. Downloaded artifact `13044230534` SHA-256 `0c6f7a1af3871ab7078d104272c6a1fe221f1bb095747f5468abd58776430eb1`, report `source_head_sha=commit_sha=6d15d86344ab1281391d3ea1b458dc18ae443985`, 44 CRC-clean entries, six real PDFs checked through Poppler, 9,130 installed package records unchanged; physical hardware NOT_RUN.
- [ ] B #50 owner rebases consolidated B10+B11 on C/N2 merged main, preserves readable Split/code/help, native canvas pointer events, visible undoable preamble edit, Alt-select source ownership, runs all exact-head workflows and visually audits PDF.
- [ ] I06 #48 owner calibrates actual cubic tool button from screenshot and verifies all six real pointer events, source save/reopen, GUI build/export, Russian F1; current 5/6 is incomplete.
- [ ] Physical Windows 10 x64 with separately installed MiKTeX plus Mac M1 and M4 with external XeLaTeX; compare native rendered PDFs, file dialogs, Unicode input/IME and DPI/Retina. NOT_RUN.

## Required invariants
Never modify unknown author macros, comments or CRLF when adding/removing known TikZ commands. All package changes are visible undoable text; no hidden auto-install or TeX fallback. The C catalogue supplies commands/parameters/help; the XeLaTeX PDF is authoritative; provisional guide is not exact PDF coordinates. No generic TeX interpreter or CAS. No release without direct evidence.
