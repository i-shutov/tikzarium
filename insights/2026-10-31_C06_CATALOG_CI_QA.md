# C06 — integrate C04 metadata QA with hosted CI

Date 2026-10-31. Starting C04 PR #26 SHA `2a8b079d3d1d2d94bc87d4bbb50cdb46a6ad19ed`: existing hosted 13/13 Rust/TeX/font checks passed; **but** `.github/workflows/ci.yml` and `qa-matrix.yml` did not run `test_verify_catalog.py` or `verify_catalog.py`. Thus C04's key requirement remained UNVERIFIED by hosted CI despite unrelated green checks.

The C06 combined integration PR uses exact inherited C04 code + mandatory workflow audit commands; no changes to C04's implementation needed or claimed. New Linux output `/tmp/tikzarium-ci/catalog-audit.json` is retained by existing fixture artifact upload. New per-host D QA `.qa-artifacts/catalog-audit.json` is independently uploaded under `qa-catalog-metadata-<OS>` with SHA-linked hosted jobs. The test suite mutates temporary copies of manifest/matrix to detect metadata drift; never mutates repository TeX/fixtures.

Acceptance gate: inspect exact combined PR HEAD, three green workflows and artifact JSON `accepted: true`, `manifest_count:5`, `matrix_rows:14`, `bound_rows:5`, `fixture_bindings:5`, `errors:[]`; then merge with SHA lease. Green jobs alone without the new commands are insufficient. Any new file count or matrix update should be investigated rather than silently changing expected counts.

**Status when authored: PENDING / NOT_RUN**; no local Python/cargo from this connector environment. Physical Windows 10 x64 and physical macOS M1/M4 GUI NOT_RUN; hosted Windows Server and hosted macOS ARM are not these targets. No all-packages-XeLaTeX or visual-edit compatibility claim; Lua-only remains `INCOMPATIBLE_ENGINE`. No changes to extension PACKAGE_MATRIX.csv because statuses remain correct.

## Integrator rebase evidence, 2026-10-31

On C06 original exact HEAD `c03801e4f3f426c1b8e5777fc0a77e669c2d3a47`: hosted TikZarium CI 3/3, D QA 6/6 and figure fonts 1/1 PASS (runs 41186709171, 41186709166, 41186709270). Reviewed I06 main `7b2f11de63b20f3ae2ee61ae899f863ac52c521f` and preserved its source-save regression jobs while merging C04 audit steps. The new combined branch must pass fresh checks before merge; its SHA does not inherit PASS by assumption. Physical Windows 10 and M1/M4 GUI acceptance NOT_RUN.

## I11 current-main integration checkpoint

Main base: `b7c8e993b9da64060dfd3261833e4be3a1d280ba`; legacy C04/C06 source head `2fad1ab90b56a749ceceeb1725e82804c2b0597d`. A Git tree comparison confirmed the 3 missing executable catalogue files before this migration. C04/C06 legacy #26/#34 stay open until this new branch passes exact-head CI and is merged. The original tamper tests and verifier are retained; current workflow changes are additive. No user TeX, native TikZ catalogue, MiKTeX configuration or PACKAGE_MATRIX.csv changes. Hosted and physical acceptance are separate.
