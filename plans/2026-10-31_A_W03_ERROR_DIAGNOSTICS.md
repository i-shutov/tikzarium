# A / W03 — structured failed-build diagnostics and upstream integration

Date: 2026-10-31. Lane A, issue #2; stacked PR #10 against W01 #6.

## Vertical problem
A/W02 saves the engine log on failure, but its `BuildError::TeXFailure` only exposes a formatted `details` string. The GUI cannot reliably navigate to a failed source location without reparsing that concatenated human-oriented error. Concurrent W01 integration also fixed an inherited B GUI Clippy lint, but W02 was tested against an older W01 SHA and must be reconciled without editing B/C/D code.

## Implementation
1. Retain previous `code` and `details`, add a bounded `log_excerpt` and structured `diagnostics` to `TeXFailure`. Accessors `BuildError::diagnostics()` and `log_excerpt()` return empty/None on non-TeX errors. The complete log still requires optional `BuildOptions.log_path`.
2. Update the Unix simulated compiler failure fixture to check the error carries TeX source line 9 and original log content; verify source and persisted log stay untouched/present.
3. Merge the latest W01 branch into A (two-parent merge) with W01's B/C/D files retained byte-for-byte and the A-only core/CLI, tests and plans/insights overlaid. Do not edit GUI or independent QA assets.
4. Require fresh hosted GitHub CI at the new A head: Linux real XeLaTeX fixture; Windows Server rustfmt/check/tests/Clippy/release; macOS ARM64 native rustfmt/check/tests/Clippy/release. The Windows Server result is not Windows 10 acceptance.

## QA and remaining gates
- Before this change, A HEAD `7937ffa9542584ce35d973058010ea36eb38146d`, Actions 41169804989: Linux real fixtures PASS, hosted Windows/macOS cargo fmt/check/tests PASS, Clippy FAIL in inherited B GUI file line 283; release binaries skipped.
- W01 upstream HEAD `3e3de6a1eeb5a268f296cf9aa6a4e93b2d215f7e`, Actions 41170856043 and 41170859719 succeeded after independent integration. This does not prove W03.
- New A HEAD must be checked separately; no local Rust compiler is installed in this environment.
- User Windows 10 x64 and physical Mac M1/M4 GUI/platform tests remain NOT_RUN.
- Core API extension exposes error context but B GUI does not consume it in this PR; follow-up B integration is required for click-to-error behavior.
