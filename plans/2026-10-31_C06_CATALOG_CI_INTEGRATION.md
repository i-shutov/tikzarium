# C06 — integrate C04 catalogue audit into mandatory CI

2026-10-31. **Stack head** derived from C04 PR #26 exact `2a8b079d3d1d2d94bc87d4bbb50cdb46a6ad19ed`; target base is current `main` after I05/C05/B06, not a new catalogue implementation. Parallel C05 #30 `2da3a298` and B06 #29 `c5c8c157` already merged to main. C04 #26 alone is not accepted because its new tests were not invoked in CI.

## Implementation
- Trigger the source-checked C04 `verify_catalog.py` JSON auditor and 14 tamper unit tests within the Linux real XeLaTeX job.
- Trigger the same two commands independently on Linux, hosted Windows Server 2022 and hosted macOS ARM64 in D QA Rust-quality jobs. Fail the workflow on a mismatch.
- Upload `qa-catalog-metadata-<OS>` JSON artifacts, retaining failure-output evidence even if a downstream step fails.
- Preserve existing C02/C03 actual XeLaTeX smoke and C03 verify_smoke audit, I05 figure fonts and prior D QA checks; do not overwrite unrelated TeX source or ad-hoc code.
- Update CHANGELOG, QA matrix, plan, insight. No package CSV status expansion: metadata consistency is not a package installation or visual editing certificate.

## Integration
- [x] New isolated `qa/c06-catalog-ci-execution-20261031` branch from exact C04 #26 SHA.
- [ ] Exact SHA three CI workflows and artifact JSON checks; no PASS until observed.
- [ ] Independent review of all C04 source fixtures and failure semantics.
- [ ] Merge integrator PR with expected HEAD lease if fully green and base mergeable. Then close #26 as **superseded** instead of separately merging same files.
- [ ] Composite `main` CI and physical Windows 10 x64 / Mac M1/M4 UI tests (physical remain NOT_RUN).

Known gap: no universal CTAN package compatibility; Lua-only graphdrawing remains incompatible with XeLaTeX. The static matrix is environment-agnostic and all package availability remains NOT_PROBED. C04 test symlink skips on host lacking permissions must not count as a symlink probe pass.

## I11 current-main integration checkpoint

Main base: `b7c8e993b9da64060dfd3261833e4be3a1d280ba`; legacy C04/C06 source head `2fad1ab90b56a749ceceeb1725e82804c2b0597d`. A Git tree comparison confirmed the 3 missing executable catalogue files before this migration. C04/C06 legacy #26/#34 stay open until this new branch passes exact-head CI and is merged. The original tamper tests and verifier are retained; current workflow changes are additive. No user TeX, native TikZ catalogue, MiKTeX configuration or PACKAGE_MATRIX.csv changes. Hosted and physical acceptance are separate.
