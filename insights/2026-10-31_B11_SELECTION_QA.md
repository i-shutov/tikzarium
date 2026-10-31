# B11 — Evidence for provisional selection
Date 2026-10-31. Source-reviewed: N1 guide only painted selected draft and lacked mouse selection for previous generated source commands. Added numbered read-only N1-owned cm anchors and distinct muted draft overlays. Alt pointer selection calls existing Session::choose and returns a line for the real Split highlight; it never inserts code. Overlapping markers are explicitly refused.

Added actual egui Context::run(RawInput) Alt pointer event-frame test: reselect earlier command, change parameter through C generator, Undo to byte-identical original with unrelated opaque macro. Added unit test for overlap/no hit. No TeX interpreter, geometry solver or PDF alignment claim.

Evidence: AUTHORED code/tests. CI exact-head PENDING. No local Rust toolchain/TeX in this runtime. Physical Win10 MiKTeX, M1/M4, IME, dialogs and screenshots NOT_RUN. Previous B10 exact SHA ba5647719f629bf4966c256b2243280a7a65efcd: Rust/D/fonts PASS but N1 authoring proof FAIL before XeLaTeX because C/N2 considered explicit TikZ declarations UNKNOWN beside fontspec/newcommand. C API correction required; B doesn't duplicate parser.

## Exact-host formatter observation and correction

SHA `3e458c62ede4146d994a22c3cb90195d30933235`: hosted Windows Server Rust job 124535693792 and Ubuntu D QA job 124535694253 both failed at `cargo fmt --all -- --check` before tests. Retrieved raw logs, applied only nine concrete rustfmt hunks in the B-owned egui test/handler file. This is FORMAT FIX, not test/Clippy PASS; rerun on the new exact SHA required. Other lanes unchanged.
