# Integration QA ledger — 2026-10-31

## Verified provenance

GitHub repository: https://github.com/i-shutov/tikzarium

Pre-integration main `4ceca871fc2c3b661f92d64f9c6b39b473cebd0a`.
Integration main ancestry:
- W01 `436ad98b8c4019ce965426c214c3d51bbe4fdbbd`, PR #6, branch head `3e3de6a1eeb5a268f296cf9aa6a4e93b2d215f7e`;
- B01 `2eb97502ea9a0177e5afc2cec6bf2e170d52aec4`, PR #8, head `6503f2f9b9f1d88f1d298c7913195e00152ebbed`;
- B02 `ee1ce4da41ee77f55ab06875565816904cddf8a4`, PR #12, head `b02011f63baf7092797b2e2b4d0a022fe4e362f4`;
- F01/U01 `3f71681a4d0febe143f0777d635867e9287e82eb`, PR #16, head `b1b691238294a9e5adb2fbb5496f3edf97e3cfaf`;
- D QA `2848697cb8c1d374bcbfd5e651a2319cf48ea830`, PR #9, head `14a6879a350b4647ed03215abc12dd2839cfe8ab`;
- C01 `f2a87c0c27c07ef423f33dd60435adaac1fa3284`, PR #7, head `79d6863922da728dda4e6fabd51513b59bb64a52`;
- C02 `f2a55fa13fd9a1e0af2718bc328ed16786975184`, PR #13, head `c453b84d163a0eb8ce5e12cf00f8763c69aee6e2`.

## Exact branch-head CI evidence

| Head SHA | GitHub Actions run | Outcome and limit |
| --- | --- | --- |
| `3e3de6a1...` | https://github.com/i-shutov/tikzarium/actions/runs/41170859719 | PASS: Linux Rust CLI → XeLaTeX PDF fixture; Rust Windows Server 2022 x64 and macOS-15 ARM64 |
| `6503f2f9...` | https://github.com/i-shutov/tikzarium/actions/runs/41172724695 | PASS: same hosted three-job matrix; no GUI interaction |
| `b02011f6...` | https://github.com/i-shutov/tikzarium/actions/runs/41172768564 | PASS: same hosted three-job matrix; no physical Win10/M1/M4 |
| `b1b69123...` | https://github.com/i-shutov/tikzarium/actions/runs/41173782947 | PASS: same hosted three-job matrix |
| `b1b69123...` | https://github.com/i-shutov/tikzarium/actions/runs/41173786603 | PASS: real Linux XeLaTeX fixture, Cyrillic text extraction, math font and PDF embedding |
| `14a6879a...` | https://github.com/i-shutov/tikzarium/actions/runs/41173898838 | PASS: six D QA jobs including **real XeLaTeX** on hosted Ubuntu, Windows Server 2022 and macOS-15 ARM64; still not physical Windows 10/M1/M4 |
| `79d68639...` | https://github.com/i-shutov/tikzarium/actions/runs/41169642087 | PASS: three hosted C01 Rust/fixture jobs; package registry statuses NOT_TESTED until individual fixtures run |
| `c453b84d...` | https://github.com/i-shutov/tikzarium/actions/runs/41172913142 | PASS: three hosted C02 pipeline jobs; parser does not convert package discovery into compiler proof |

Artifacts reported by GitHub:
- W01 Linux fixture artifact ID `13031306239`, archive digest `sha256:52546d01ec324b2adebe0d6c52a1f71f0212d7e35778ad8ec35837680edbb771`.
- B01 Win Server build artifact `13031741450`, archive digest `sha256:25c70e5a6367a882b372872bc22e4df59ebd321b8b1199c759fc02d4a2fb3610`.
- B02 macOS ARM64 build artifact `13031551797`, archive digest `sha256:77a1435689aa3858e6af2ff363c63c645570de12aae7bad210707061fe121427`.
- F01 font fixture artifact `13032067938`, archive digest `sha256:b1f75402cc817223b85003a1736fcf4746d5a56468a7001b3f077036dcb817ca`.

These are GitHub-reported archive hashes, not independently recomputed local checksums. No physical-machine GUI test or independent personal review of F01 artifact pixels occurred during this integration.

## Post-merge CI and manual QA

Latest post-merge main head `f2a55fa13fd9a1e0af2718bc328ed16786975184`: **PENDING at writing**, do not infer success from preceding branch-head runs. Earlier W01 and B01 post-merge main runs were green; later main heads have their own independent checks. Follow https://github.com/i-shutov/tikzarium/actions and record actual result.

Win10 22H2 x64 GUI+XeLaTeX: **NOT_RUN**.
User Mac M1 GUI+XeLaTeX: **NOT_RUN**.
User Mac M4 GUI+XeLaTeX: **NOT_RUN**.
Source-safe visual editing and multipage PDF: **NOT_IMPLEMENTED**, not a test failure.
XeLaTeX compilation of all PGF/TikZ libraries including Lua-only: **NOT_PROVEN / ENGINE-INCOMPATIBLE where LuaTeX required**.

## QA defects and coverage limits

- Original W01 Cyrillic fixture once produced a valid one-page PDF with 19 missing glyphs; the corrected CI now requires actual Unicode text extraction rather than page count alone.
- B02 only tracks source text and pathname freshness, not all external included asset dependency mtimes/hashes. PDF export may be stale after external image changes without a source change: add dependency-fingerprint test/contract in a future core slice.
- F01 font proof checks prescribed Cyrillic strings and embedded fonts on Linux. It does not establish per-font comprehensive Unicode coverage, visual fidelity, Windows/macOS font discovery or accessibility of all four GUI themes.
- egui persistence unit tests are not a manual quit/relaunch and corrupt-file recovery observation.

## Remaining A runner blocker

PR #10 (`3af867cfcd3228fa2ad8bad30af2bf41d809288c`) retargeted to main but GitHub reported `mergeable_state=dirty`. Main's `diagnostics.rs` adds missing glyph, LaTeX Font and fontspec warnings; A replaces the diagnostic parser to add source file/line and file-line error support. Resolve both behaviors and all respective unit tests in a separate integration commit, run fresh checks; do not force merge.
