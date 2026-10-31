# A / W02 — reliable XeLaTeX runner, source-safe CLI and failure evidence

Date: 2026-10-31. Owner: lane A, issue #2.
Base main SHA: 4ceca871fc2c3b661f92d64f9c6b39b473cebd0a.
Dependency: W01 draft PR #6, branch feat/w01-xelatex-egui-core at ed8ff4f316afea97c8092aab3f65c6509ddcbdfe.
Integration: this is a stacked A-only PR, not a change to main or any B/C/D files.

## Explicit scope and acceptance

1. Execute XeLaTeX via Command::new only, retain -no-shell-escape and -recorder, protect filenames beginning with a dash by passing a relative path.
2. Preserve multi-dot TeX job names in log, recorder and PDF paths; keep canonical original source entirely unchanged.
3. Preserve full XeLaTeX .log to a caller-selected destination, including on TeX failure and best effort on cancel/timeout. Without a requested destination, transient logs remain in the temporary build directory and are discarded after the run.
4. Present actionable failure information from TeX log and stderr, with file/line diagnostics for both file-line-error and l.N forms.
5. Resolve .fls INPUT paths relative to recorder PWD (or the source directory); remove temporary output-directory artifacts from the returned dependency set.
6. CLI accepts optional --log destination.log; reject non-PDF output paths and publish PDFs atomically, never replace a TeX input with PDF bytes.
7. Add Unix fake-executable integration tests for safe argv, filename regression, recorder, failure and log, timeout and cancel. Add cross-platform pure Rust unit tests for path/diagnostic logic.
8. Preserve B GUI API expectations: BuildService::run and BuildError::TeXFailure existing fields remain; optional BuildOptions.log_path defaults to None.

## Gates and follow-up

- Rust format, compilation, unit/integration tests, Clippy and real CLI XeLaTeX smoke: require GitHub Actions evidence; not proven by editing.
- Native macOS ARM64 CI is a build gate, not a physical M1/M4 UI test.
- Windows-2022 CI is not a Windows 10 smoke test.
- Temporary sandbox is not an OS security boundary. Cancellation kills the direct child; recursive subprocess-tree termination is not guaranteed.
- This workpack does not introduce visual editing, package compatibility claims, live log streaming, a persistent cache, or changes to the GUI.

## Reproduction

cargo fmt --all -- --check
cargo check --workspace --all-targets
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo run -p tikzarium-cli -- build examples/quickstart.tex /tmp/quickstart.pdf --log /tmp/quickstart.log
cargo run -p tikzarium-cli -- build examples/cyrillic.tex /tmp/cyrillic.pdf

On Windows, replace /tmp paths with a writable local directory. TeX Live or MiKTeX with XeLaTeX must be installed for real smoke tests.
