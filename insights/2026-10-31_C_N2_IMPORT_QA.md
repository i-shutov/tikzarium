# C/N2 implementation and QA evidence ledger

2026-10-31. Started from main ca90c2ee685e0c997d2d90a3ac60dab9e31fdb87 after checking AGENTS, open PRs, N1 plans/insights and C-owned sources; N1 #44 is already merged.

## Tests written (not automatically PASS)

- Literal package and library comma lists, package options: independent project-loaded states.
- Commented imports ignored; macro wrapper, conditional branch, opaque package name, imported preamble, mixed LF/CRLF and malformed/missing anchor return UNKNOWN with refusal.
- Each of arrows.meta, positioning, calc, fit produces a visible insertion proposal; tikz package is added only on confirmed absence.
- CRLF, Cyrillic comments, unknown TeX macros in body remain byte-for-byte intact across import/inverse Undo.
- Duplicate import is no-op; wrong anchor range, stale revision and modified anchor refuse mutation.
- Existing six-tool fixture and five distinct tool capability dimensions get regression assertions.

## Runtime evidence and risks

Current sandbox has no usable Rust cargo toolchain and external git clone DNS fails; format/check/test/clippy must be read from GitHub Actions at exact PR head. No local Rust PASS is claimed. This source recognizer does not run XeLaTeX, raster preview or GUI pointer interactions. Existing N1 compiler evidence is not an N2 compiler test.

B received proposed public contract on PR #46 before implementation. D should reuse the public Rust test and, separately, compile an actual generated preamble using external XeLaTeX, recording source SHA/PDF/log and distinguishing compilation from visual editability. E/F own separate validation work and their files have not been touched.

Conservative limitation: indirect imports via macro or class cannot be resolved and are never classified as confirmed; unknown preamble commands block automatic import, not manual source compilation. Physical Windows 10 x64 with installed MiKTeX and Mac M1/M4 GUI: NOT_RUN. No release claim.
