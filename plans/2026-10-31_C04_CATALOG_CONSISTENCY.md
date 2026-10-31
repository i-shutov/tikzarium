# C04 — Fail-closed manifest/matrix/fixture consistency gate

Date: 2026-10-31. Independent lane C; issue #4.

## Preflight and ownership

Observed main `e3a78ae5646ef24994161c8ebe7bfaaf7a7d2ab6` (C03 #21
merged). Open PR #10 (lane A), #24 (integrator; includes modifications to
`docs/EXTENSIONS.md` and `extensions/qa/run_smoke.py`), and #25 (lane B).
Read `AGENTS.md`, C01–C03 plans, C03 QA insight, main registry/runner/auditor,
`PACKAGE_MATRIX.csv` and manifest files. This PR is based on main, touches
new C-owned `extensions/qa/verify_catalog.py`, test, C04 runbook, C04 plan
and insight only. No changes to the pending #24 files or A/B/D code.

## Vertical workpack

1. Independently validate all manifest-to-package-matrix associations; prohibit
   duplicate/dangling bindings and misleading non-environmental PASS states.
2. Require correct XeLaTeX versus Lua-only engine classification. Cross-link
   the five fixed C02 fixture bindings and require actual regular TeX sources.
3. Reject oversized, malformed, symlinked, unsafe and capability-promoting
   static metadata. Keep the catalogue read-only; do not execute a plugin.
4. Add tamper-style offline regression tests, usage runbook, QA evidence and
   an isolated reviewable PR.

## Verification & non-goals

- Run Python tests and static audit on available sandbox; record exact versions,
  fixture substitution limitations and exit codes.
- Once PR exists, inspect **exact HEAD** CI rather than previous commits.
- Do not claim TeX compilation, physical Windows 10 x64 or macOS ARM64 smoke,
  package-wide compatibility, or visual TikZ editing.
- D lane integrates this independent gate into CI, as already ongoing in #24;
  C must not modify workflows or `run_smoke.py` concurrently.

## Next small block

After #24 merges, rebase/revalidate this gate on the new main and have D add
`verify_catalog.py` and its 14 offline tests into the hosted matrix. Record
separate genuine Windows 10 and physical M1/M4 evidence before release.
