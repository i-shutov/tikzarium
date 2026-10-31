# C06 — integrate C04 metadata QA with hosted CI

Date 2026-10-31. Starting C04 PR #26 SHA `2a8b079d3d1d2d94bc87d4bbb50cdb46a6ad19ed`: existing hosted 13/13 Rust/TeX/font checks passed; **but** `.github/workflows/ci.yml` and `qa-matrix.yml` did not run `test_verify_catalog.py` or `verify_catalog.py`. Thus C04's key requirement remained UNVERIFIED by hosted CI despite unrelated green checks.

The C06 combined integration PR uses exact inherited C04 code + mandatory workflow audit commands; no changes to C04's implementation needed or claimed. New Linux output `/tmp/tikzarium-ci/catalog-audit.json` is retained by existing fixture artifact upload. New per-host D QA `.qa-artifacts/catalog-audit.json` is independently uploaded under `qa-catalog-metadata-<OS>` with SHA-linked hosted jobs. The test suite mutates temporary copies of manifest/matrix to detect metadata drift; never mutates repository TeX/fixtures.

Acceptance gate: inspect exact combined PR HEAD, three green workflows and artifact JSON `accepted: true`, `manifest_count:5`, `matrix_rows:14`, `bound_rows:5`, `fixture_bindings:5`, `errors:[]`; then merge with SHA lease. Green jobs alone without the new commands are insufficient. Any new file count or matrix update should be investigated rather than silently changing expected counts.

**Status when authored: PENDING / NOT_RUN**; no local Python/cargo from this connector environment. Physical Windows 10 x64 and physical macOS M1/M4 GUI NOT_RUN; hosted Windows Server and hosted macOS ARM are not these targets. No all-packages-XeLaTeX or visual-edit compatibility claim; Lua-only remains `INCOMPATIBLE_ENGINE`. No changes to extension PACKAGE_MATRIX.csv because statuses remain correct.
