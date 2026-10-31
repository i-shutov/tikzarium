# C03 — Evidence integrity and QA log

2026-10-31 · independent lane C · issue #4.

## Baseline and ownership

At start, main SHA f2a55fa13fd9a1e0af2718bc328ed16786975184 (C01 #7 and C02 #13 already merged). Open PRs #10/#18 (A), #19/#20 (B), #17 (integrator). Read current main, AGENTS.md, C01/C02 plans and insights, existing recorder, Rust observation parser, package matrix, docs and workflows. Isolated head branch: feat/c03-artifact-integrity-audit, based directly on this exact main. Only C-owned extension QA files/docs/plans/insights changed.

## Why this audit exists

The C02 v1 TOML parser checks structural consistency but cannot see whether recorded source/log/PDF hashes correspond to actual artifacts, nor whether a claimed expected Lua error was caused by the correct diagnostic. A user-written observation is not proof of a compiler run. C03 implements a standalone, fail-closed auditor reading *actual* files alongside observation.toml and summary.json, with fixed fixture IDs and required pdfinfo reinspection. It cannot enable ExtensionStatus.compilation_verified or visual editing.

- Check five known fixture-to-manifest bindings, XeLaTeX-only, real current-tree source hashes, saved console/TeX log hashes, positive PDF hashes/header/trailer and independent one-page pdfinfo result.
- For Lua-only graphdrawing, require nonzero exit other than timeout/OS launch failure, explicit LuaTeX-required error in log, and no PDF. Never call that a XeLaTeX render PASS.
- Reject inconsistent summary verdicts, duplicate fixture names, mixed host/compiler metadata, symlinked/missing/oversized artifacts, changed sources, missing glyph warnings and incomplete suite by default.
- Explicit --allow-partial yields scope=selected_only and complete_suite=false even if every selected probe is consistent.
- No executable plugin or manifest changes; no shell execution by this auditor. It invokes pdfinfo directly with a fixed argument list.

## Executed local QA

In the C03 Linux execution sandbox, Python 3.13.5 ran 10 new unittest cases: **10/10 PASS** (synthetic artifacts, mocked pdfinfo response; the legacy C02 helper API was locally represented with matching fixed constants and writer). Also executed actual XeTeX 3.141592653-2.6-0.999996 (TeX Live 2025/dev/Debian) directly with -no-shell-escape, -recorder, -halt-on-error, -file-line-error and -interaction=nonstopmode against **byte-identical GitHub C02 fixtures** (SHA checked against extensions/qa/2026-10-31_DEBIAN_LOCAL.csv). Four positive probes exited 0 and produced one-page PDFs; graphdrawing-lua exited 1 with the explicit required LuaTeX error and no PDF. A local *one-off recorder producing the C02 v1 record format* fed the new auditor; its result: accepted=true, complete_suite=true, verified_fixtures=5, errors=[].

Local real-trial summary SHA-256: b0c0c5de01736fb658d8752a09b0c87abad096b405b62c22e9ed92c20ea0412e.
Local audit JSON SHA-256: fe6453f0fcf2a0098cecee33fd06b5be2f20b852e757be3052d5cb0edd004dfb.
The actual local logs and PDFs are *not* GitHub-hosted artifacts and their hashes cannot be used as remote CI evidence.

C03 has **not yet been tested end-to-end using the exact checked-out production C02 run_smoke.py**; the real local test used a one-off producer with matching record format. The production runner + auditor combination remains a distinct integration QA gate. Rust compilation/testing was not run locally (cargo/rustc unavailable); CI status at initial documentation: NOT_YET_CHECKED for final C03 head.

## Interpretation, limitations, blockers

- The audit checks internal artifact consistency, not attested runner identity, real host OS/architecture, compiler argv, immutable Git commit identity, trusted TeX source, or signed provenance. An attacker controlling both logs and records can forge a consistent bundle.
- Five fixture-level observations do not certify every version of PGF/TikZ packages, inspection support, or visual editing. No result changes the environment-agnostic PACKAGE_MATRIX.csv.
- Real Windows 10 x64 desktop smoke: NOT_RUN. Physical Apple Silicon macOS smoke: NOT_RUN. Windows Server and hosted macOS build checks do not replace either.
- The current D-owned GitHub CI runs Rust and a separate CLI smoke, but does not yet execute extensions/qa/run_smoke.py + verify_smoke.py or the C03 Python regression suite. Request lane D to add those into its own workflow and upload full artifacts; lane C does not edit .github/workflows.
- Next small block: D-hosted reproducible full-suite artifact audit across Linux, Windows Server and hosted macOS ARM64, with exact PR-head status, logs and hashes; then explicitly schedule physical-platform QA.
