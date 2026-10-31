# C/N2 implementation and QA evidence ledger

2026-10-31. Started from main ca90c2ee685e0c997d2d90a3ac60dab9e31fdb87 after checking AGENTS, open PRs, N1 plans/insights and C-owned sources; N1 #44 is already merged.

## Tests written (not automatically PASS)

- Literal package and library comma lists, package options: independent project-loaded states.
- Commented imports ignored; macro wrapper, conditional branch, opaque package name, imported preamble, mixed LF/CRLF and malformed/missing anchor return UNKNOWN with refusal.
- Each of arrows.meta, positioning, calc, fit produces a visible insertion proposal; tikz package is added only on confirmed absence.
- CRLF, Cyrillic comments, unknown TeX macros in body remain byte-for-byte intact across import/inverse Undo.
- Duplicate import is no-op; wrong anchor range, stale revision and modified anchor refuse mutation.
- Existing six-tool fixture and five distinct tool capability dimensions get regression assertions.

## Supplemental local external XeLaTeX evidence

Four small source fixtures using the exact TikZ syntax emitted by the Rust fixture CLI were manually reconstructed, compiled with local Debian TeX Live XeLaTeX and inspected as raster output. Command: xelatex -no-shell-escape -halt-on-error -interaction=nonstopmode -file-line-error <file>. Result: arrows.meta 1-page PDF PASS, positioning 1-page PASS, calc 1-page PASS, fit 1-page PASS. TeX SHA-256: arrows.meta 415f3e7a7b3ce4ab4b44c62b8a9503f60e9d92c55ad14ed23e7119377816f23f; calc 34e9c7c23b9484da50de713a4b4a2e94dc7b6201130f4adf8b77f1f2064c172f; fit 46af75958910cd48322db536d76216ce0850ee6df7fe5278753a57b671d4b03f; positioning c0b9dbb92d8c941f7e5e12edb40444acde962b4b19d593e3c3620a5d5a89220e. This proves **these TeX examples compile and display** on that Debian installation. It does NOT prove that the Rust generator binary emitted byte-identical source (cargo unavailable), does not prove Windows MiKTeX, and does not test GUI editing.

An additional import-order risk was found during review: an already-present usetikzlibrary appearing before any explicit usepackage{tikz} cannot safely be repaired by appending tikz before begin-document. The scanner now classifies this as UNKNOWN and refuses automatic edits instead of generating a broken preamble. Added regression test. No user source is mutated when refused.

## Runtime evidence and risks

Current sandbox has no usable Rust cargo toolchain and external git clone DNS fails; format/check/test/clippy must be read from GitHub Actions at exact PR head. No local Rust PASS is claimed. This source recognizer does not run XeLaTeX, raster preview or GUI pointer interactions. Existing N1 compiler evidence is not an N2 compiler test.

B received proposed public contract on PR #46 before implementation. D should reuse the public Rust test and, separately, compile an actual generated preamble using external XeLaTeX, recording source SHA/PDF/log and distinguishing compilation from visual editability. E/F own separate validation work and their files have not been touched.

Conservative limitation: indirect imports via macro or class cannot be resolved and are never classified as confirmed; unknown preamble commands block automatic import, not manual source compilation. Physical Windows 10 x64 with installed MiKTeX and Mac M1/M4 GUI: NOT_RUN. No release claim.
