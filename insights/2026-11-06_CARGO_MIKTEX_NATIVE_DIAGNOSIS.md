# Owner-directed Cargo / MiKTeX repair (2026-11-06)

The owner explicitly requested fixing Cargo/MiKTeX now on existing Administrator in dedicated tikzarium-winserver. Keep system-wide MiKTeX and UAC/account policy unchanged, never touch another runner.

## Original evidence revisited

Original personal-server job 127148812057 (run 41998880215) ran Windows PowerShell 5.1, ErrorActionPreference Stop and redirected native stderr through PowerShell. It raised a script exception on `xelatex: security risk: running with elevated privileges` but did not capture XeLaTeX's process ExitCode. This does NOT prove the compiler itself failed. Microsoft documents native stderr/redirection differences before PowerShell 7.2; MiKTeX warns about elevated privileges independently of native success. Current release code intentionally blocks elevated TeX before execution; that restriction is NOT evidence that system MiKTeX is broken.

## This maintenance operation

Hosted Windows PowerShell 5.1 selftest captures warning+exit0, warning+exit7 and a timed-out child separately through ProcessStartInfo. Main-only personal-server invocation checks native `xelatex --disable-installer --version` and read-only package file lookup, retaining stdout/stderr and native exit codes. No TeX source is compiled, no warnings suppressed, no MiKTeX security configuration changed. PDF/admin-account product safety remains independently NOT_RUN.

Cargo discovery checks actual PATH, CARGO_HOME, user profile and dedicated runner cache. If absent, the explicit owner maintenance action provisions Rust 1.91.0 with rustup 1.28.2 from the official HTTPS location after checking official SHA256, with --no-modify-path, isolated CARGO_HOME/RUSTUP_HOME under this runner's cache. No system PATH, other user's Rust, or FlowBridge changes. It then runs a dependency-free offline Cargo compile/link/execute and diagnoses actual MSVC availability. Version PASS is not compilation PASS. No application release/tag is created.

This is a narrowly reviewed maintenance branch: only hosted tests run on PR, personal server runs reviewed current main after merge. Original native logs and reports determine result, not prior PR prose. Sources: Microsoft about_Preference_Variables (PowerShell 5.1/7.2); MiKTeX XeTeX options; official Rustup Installation/Cargo Home documentation.
