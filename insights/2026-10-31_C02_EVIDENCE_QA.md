# C02 — QA and audit log
2026-10-31. Owner C / issue #4.

Preflight: main 4ceca871fc2c3b661f92d64f9c6b39b473cebd0a; W01 #6 3e3de6a1eeb5a268f296cf9aa6a4e93b2d215f7e; C01 #7 79d6863922da728dda4e6fabd51513b59bb64a52. Read C01 plans/insights, AGENTS, docs, Rust code, manifests, source fixtures and neighboring PR summaries. GitHub Checks at C01 exact head show all 3 hosted jobs completed SUCCESS (run 41169642087), not native Win10/physical Mac QA.

Findings: combined explicit missing plus unknown was incorrectly reported Unknown rather than NotLocated. A leading dash was accepted in a TeX filename and could be interpreted as a kpsewhich option. Existing shell runner was POSIX-only and did not save structured per-run reports. C02 changes only extension-owned code, docs, plans and insights.

Local Python regression suite: 4 tests PASS under Linux Python; covers glyph-warning downgrade, missing PDF/page/source mutation, Lua-only diagnostic and TOML record output. Real Linux XeLaTeX fixture execution: XeTeX 3.141592653-2.6-0.999996 (TeX Live 2025/dev/Debian), 4 positive one-page PDFs and a negative graphdrawing-lua with explicit LuaTeX-required error. An initial strict single-line Lua diagnostic matcher was too narrow for line wrapping and was fixed; rerun returned all five expected outcomes. These are local engine observations, not Rust integration or general compatibility. Rust CI for C02 final head: pending until checked.

Limitations: host local log artifacts are not yet uploaded to CI. A machine-generated TOML is not a signed attestation. Hosted Windows Server build is not physical Win10, and hosted macOS ARM build is not physical M1/M4 GUI acceptance. Visual adapter tests NOT_RUN. No Rust toolchain in this local execution sandbox; do not report local cargo PASS. Generic core kpsewhich caller is A-owned and must be reviewed by A; no cross-lane file edits.
