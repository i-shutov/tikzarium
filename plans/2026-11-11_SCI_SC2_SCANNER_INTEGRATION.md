# Scientific Studio 1.0 — SC2 source-only scientific scanner integration

Owner-approved release scope: docs/RELEASE_SCOPE_SCIENTIFIC_STUDIO_1_0_RU.md. Source branch: https://github.com/i-shutov/tikzarium/pull/148 (stacked on SC1 #146). PR #148 originally had 6/6 successful hosted checks. Main extensions Cargo.toml, lib.rs and Cargo.lock were byte-identical to that PR's baseline at review. The scanner and its original tests are reused by immutable Git blob SHA.

SC2 conservative source recognition: bounded UTF-8 lexical scanner for native TikZ/PGFPlots axis, addplot, draw/path/fill/clip/node/pic/dimline with source spans, revision/source-SHA, explicit OPAQUE under unknown macro scopes, limited verified literal samples/domain fields, safe minimal SourcePatch plans. No macro interpreter, PDF inverse renderer or universal geometry solver; unknown defaults UNKNOWN.

This independent integration intentionally excludes original PR #148's old main.rs/tikz_authoring.rs GUI code and scientific_inspector.rs; UX2 is concurrently changing the app's layout. After UX2 stabilizes, its Inspector integration is rebased onto the new Studio as a separate L3 vertical, followed by scoped PR #149 and #151 functions.

Work is ready for exact-head generic three-platform Rust workspace cargo fmt/clippy -D warnings/tests and scientific_scanner test suite. This branch does not itself prove live GUI editing, PDF, complete corpus 142/103 or native Win10. All those gates remain NOT_RUN / NOT_ACCEPTED. Do not claim stable Scientific 1.0 GO from source scanner tests.
