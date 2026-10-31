# C03 — Auditable XeLaTeX fixture artifacts (independent lane C)

Date: 2026-10-31. Owner: lane C, issue #4.

## Source-of-truth preflight

- Exact starting main: f2a55fa13fd9a1e0af2718bc328ed16786975184 (C02 #13 already merged).
- Open neighboring PRs at preflight: A #10/#18, B #19/#20, integration #17. None owns extensions/qa. No changes to core, GUI, CI workflows or other lanes.
- Read AGENTS.md, C01/C02 plans and insights, current C02 Python recorder and Rust evidence parser, docs/EXTENSIONS.md, PACKAGE_MATRIX.csv, existing CI jobs.

## Workpack

1. Add a stdlib-only Python 3.11+ auditor for outputs of C02 run_smoke.py; inspect actual on-disk evidence, not only unsigned observation.toml.
2. Verify source fixture SHA against the current source tree, console and TeX log hashes, output PDF SHA/header/EOF, and actual pdfinfo page count. The Lua-only fixture must have the required LuaTeX error in the saved logs and no PDF.
3. Cross-check all selected fixture IDs/verdicts against summary.json and enforce consistent platform, engine and compiler version. Require all five by default; --allow-partial is an explicit *selected-only* result and never a complete-suite claim.
4. Reject symlinked/missing/oversized artifacts, fake logs, changed sources and contradictory positive/negative records. Include offline regression tests.
5. Write reproducible usage and QA limits. Request workflow integration from D; do not edit D-owned CI files.

## Evidence gates

- Python unit tests with synthetic log and PDF metadata: test_verify_smoke.py, precise invocation and output documented in insights.
- Run a real XeLaTeX C02 recorder + new auditor for all five fixtures on a compatible environment when available; record host, version, hashes and log artifacts.
- Check exact C03 PR HEAD GitHub Actions before asserting CI PASS, not main or earlier PR.
- Windows Server GitHub runner is not Windows 10 x64. Hosted macOS ARM64 is not physical Mac GUI. Compiler success is not visual editing.
- Neither sha256 nor runner_kind=hosted_ci authenticates an external machine. The auditor does not modify Registry/ExtensionStatus or assign package-wide compatibility.
- Existing Lua-driven graphdrawing remains deliberately incompatible with native XeLaTeX.

## Small next block

Coordinate D-owned CI to run the C02 recorder on all three hosted OSes, immediately audit and upload the complete record/log/PDF tree with workflow URL and exact head SHA. Then review reproducibility and add source-to-commit provenance in a separate workpack; keep physical target-machine acceptance distinct.
