# C/N2 library catalogue — QA ledger

2026-10-31; base main `b7c8e993b9da64060dfd3261833e4be3a1d280ba`. Work limited to C-owned Rust, extensions/, docs/EXTENSIONS.md, C plans/insights.

## Engineering changes

The library panel can consume four versioned declarative records, including original Russian help, actual native import syntax and complete XeLaTeX examples, without duplicating knowledge in egui. All four library imports remain ordinary source patches. The six primitive generators and all parameter help are untouched. A library may be present in the installation, not loaded in the project, compatible with XeLaTeX, lack a dedicated tool, and still have documented help: five axes are deliberately not collapsed. `arrows.meta` has one narrow generator (arrow), other three have no dedicated visual generator; generic `visual_editable` stays false. No package is installed or silently connected.

Primary manuals checked on 2026-10-31: tikz.dev/tikz-arrows §16.5, tikz.dev/tikz-shapes §17.5.3, tikz.dev/tikz-coordinates §13.5, tikz.dev/library-fit §54. No full manual copied; unsupported PGF minimum is UNKNOWN.

## Validation required (never infer PASS)

New Rust tests: catalogue cardinality/help, six-tool source identity, five independent library states, opaque import UNKNOWN, all-four CRLF connect/disconnect and Undo, inverse source revision mismatch, already-loaded vs absent. A C-owned binary prints a full original TeX fixture for any of four libraries; D must run real XeLaTeX and archive logs/PDF/hash before a compiler PASS can be claimed.

Local sandbox lacks cargo/rustc and cannot resolve GitHub; local Rust/TeX execution NOT_RUN. This is a source-level implementation requiring exact SHA CI confirmation. B #50 was notified of the additive contract before code. Physical Win10 external MiKTeX, physical M1/M4 GUI/screenshot and display of library panel: NOT_RUN.


## Exact first-head hosted CI and correction

Initial PR HEAD `ec670761eaa3b7f2360eb1299762e11111e9bed7` and formatting-only-doc follow-up `c3ee62adbe9887509638897ab40bbc57ca1f7848` are NOT green. Hosted macOS/Windows `TikZarium CI` and Ubuntu/Windows/macOS D QA Rust jobs stopped at `cargo fmt --check` before compiling/testing the new Rust code. First-head Rust CI: https://github.com/i-shutov/tikzarium/actions/runs/41210798104; corrected-doc Rust CI: https://github.com/i-shutov/tikzarium/actions/runs/41210967266. Full hosted rustfmt diff retrieved from job 124565667127 and applied to the three C-owned Rust files without suppressing CI checks. Do not inherit any older success; only a later exact-head execution can establish Rust PASS.

## Direct local example compilation (not Rust generator proof)

On Debian TeX Live 2025/dev XeTeX 0.999996, four *literal full-document catalogue examples* were independently transcribed and compiled with `xelatex -no-shell-escape -halt-on-error -interaction=nonstopmode`. All four exited 0 and `pdfinfo` reported exactly one PDF page. Source SHA-256:
- arrows.meta: `38d89c1db82cdffa0a2537791fa0edd85907ccfe262cc3edeb3652ec14c1e163`
- positioning: `258496dcdafac6969646a31c563f1d8a6a32741a0b4aaf73a729984035bffba2`
- calc: `9a561e03192b24db20e5fb180c74cf9c43428bb21af79251ce3a9e2d852816fa`
- fit: `667d6e765d359890e30a870c1db758d79a722025fd415a7e98e6538e297f832e`

These verify the individual TikZ examples on ONE local Linux XeLaTeX installation. They do not prove the binary `n2-library-fixture` ran or validate Rust, hosted Windows Server/MiKTeX or physical Win10/M1/M4. The `fit` and `positioning` PDF pages were also rasterized and inspected; no content clipping observed. Full physical GUI validation remains NOT_RUN.

## Hosted Windows regression and precise fix

Exact SHA `23003dabebf99eabe39457b10b326e45d281fa31`: [native Rust Windows Server job 124566322698](https://github.com/i-shutov/tikzarium/actions/runs/41211177456) **FAIL**, 5/6 new library tests passed; only `four_libraries_are_in_the_same_schema_as_six_native_tools` failed because Git checked out `all-six.tex` with CRLF while the generator deliberately emits LF. The complete assertion diff showed identical TikZ commands and a pure line-ending difference. Ubuntu D QA at the same head [41211177404](https://github.com/i-shutov/tikzarium/actions/runs/41211177404) passed rustfmt/workspace tests/Clippy including 6/6 new library tests; macOS native Rust had passed tests at the check. Fix **only the test** to compare an LF-normalized fixture; never change the generator to host-dependent CRLF or alter any user source. This is a content-equivalence assertion only; separate CRLF/Undo byte-identity checks remain exact. Subsequent exact-head CI required before PASS.

## Engine compatibility evidence precision

For the four declared PGF/TikZ libraries, `engine=xelatex` records the **primary engine verified by fixture**, not evidence that alternate TeX engines reject that library. `capabilities_for_library(..., Some("lualatex"))` now conservatively returns `ENGINE_COMPATIBLE=UNKNOWN` rather than false `Absent`; an actual Lua-only library such as graphdrawing remains explicitly incompatible with native XeLaTeX via its separate registry metadata. No engine switching or feature promotion is performed.
