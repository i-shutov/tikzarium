# C02 — Portable XeLaTeX fixture evidence and fail-closed lookup
Date: 2026-10-31. Owner: lane C, issue #4.

Main SHA at preflight: 4ceca871fc2c3b661f92d64f9c6b39b473cebd0a.
Upstream C01 PR #7 SHA: 79d6863922da728dda4e6fabd51513b59bb64a52.
C01 exact-head CI run 41169642087: SUCCESS across Linux real XeLaTeX, Windows Server Rust and hosted macOS ARM Rust.
Open neighbor PRs: W01 #6, A #10, B #8/#12, D #9. Do not edit their files.
C02 is based on C01 and PR must target C01, not main.

## Implement this bounded block
1. Cross-platform Python 3.11+ stdlib recorder executing only the fixed five C-owned fixtures under real XeLaTeX with -no-shell-escape; record hashes, logs, pages, compiler version, exit codes and elapsed time.
2. Rust serde/TOML v1 observation parser with engine/fixture binding and contradiction checks. Untrusted observations never promote runtime capability.
3. Change tri-state lookup to NotLocated if any dependency is explicitly absent; reject leading dash manifest requirements.
4. Python unit tests and Rust unit tests, docs and QA evidence. Keep changes within C-owned paths.

## Acceptance
Exact-head cargo fmt/test/clippy and hosted jobs must finish before PASS claims. Linux compiler fixture observations are not general library compatibility or visual editing. Windows 10 x64 and physical macOS ARM64 GUI/manual smokes: NOT_RUN. Do not modify CI workflows; ask lane D to schedule the C recorder in its own workflow.

## Next block
Preserve C-runner logs as CI artifacts on three hosts, validate TOML records against source hashes, aggregate package-version-scoped evidence without allowing an unsigned local TOML to change an install/build/edit capability. Ask A separately to harden the generic kpsewhich filename path.
