# A / W05 — evidence and risks

Date: 2026-10-31. Observed `main` at start: `8764a732b9a846a6ba1f111c9b656781195a6412` (merged I05 PR #24).
Reviewed AGENTS.md, I05 plan/insights, core runner and Unix integration fixtures. Source-safe CLI, `.fls` recorder, fontspec/unicode-math and font-log warnings exist in main; none are duplicated.

## Changes submitted in this branch

- New pure core project-input snapshot API; SHA-256 hashes streaming and capped at 64 MiB per path.
- Runner returns a snapshot alongside existing raw dependencies after compiling successfully, without rewriting source or shelling out.
- New portable tests for Unicode paths, same-length edits, missing/deleted/oversized inputs, external boundaries, deduplication and Unix symlink-outside-root.
- New fake XeLaTeX end-to-end test proving `.fls` input discovery and stale detection after a local included file changes with the same byte count.

## QA truth table (not claims of execution)

| Check | Status at authoring |
| --- | --- |
| Read `main` SHA, I05 #24, #10, #16, issue #14, lanes B/C/D | CONFIRMED through GitHub |
| Source files directly edited by runner | NONE; no source write path added |
| Local Rust fmt/check/test/clippy | NOT_RUN: container has no rustc/cargo |
| GitHub Actions on W05 exact head | PENDING |
| Actual local XeLaTeX via this new Rust code | NOT_RUN |
| Physical Win10 x64 / Mac M1/M4 | NOT_RUN |
| TeX installation dependencies freshness | OUT_OF_SCOPE, listed as external |

Unverified dependencies always invalidate project freshness; out-of-root inputs do not, because this is deliberately a **project-only** claim. Rechecking hashes incurs disk I/O, so GUI must not poll this API every frame. Existing built artifact PDF is not auto-deleted: callers can mark it stale.

Follow-up after CI: inspect exact-run Rust test logs; fix formatting/compiler issues in A branch; only then request integration. Never confuse macOS hosted ARM64 and Windows Server with target-machine acceptance.

## First hosted CI finding (not PASS)

Exact first head `f0bc0e2e0b3041c999f610eaedf8afeb892570ee`, [GitHub Actions 41183770626](https://github.com/i-shutov/tikzarium/actions/runs/41183770626), Windows Server + hosted macOS formatting gate **FAILED**. Rustfmt requested only two A-owned formatting changes: collapse the `item.digest.is_none() || ...` line and expand one long assert in `runner_unix.rs`. Both are applied in this follow-up commit; initial head is explicitly not PASS. All other jobs on that old SHA cannot certify the corrected head. Await fresh exact-head CI.

## Self-review correction

Identified and addressed an initially uncovered failure mode: if XeLaTeX emits a PDF but the `.fls` recorder is missing, the earlier snapshot would have contained only the source and returned `is_project_fresh=true`. This would mislabel an untracked project as fresh. Snapshot capture now requires an explicit recorder-completeness input, which is false for unreadable or absent `.fls` or no `INPUT`. New portable and Unix integration negative tests cover the condition. This is an engineering fix, not CI PASS.

## Compile blocker discovered from hosted W05 predecessor

The **older** `7b322c8c00a58b10e3a36a68c97b07695716a1f8` head failed hosted macOS and Linux Rust compilation: [main CI 41183832561](https://github.com/i-shutov/tikzarium/actions/runs/41183832561), [D QA 41183832301](https://github.com/i-shutov/tikzarium/actions/runs/41183832301). Compiler E0277/E0308 inferred the collected dependencies as an unsized `[PathBuf]` when passed to `capture(&[PathBuf])`. Add an explicit `Vec<PathBuf>` type in `build.rs`; not PASS until this new commit is compiled.

## Exact hosted formatter correction

The still-older `50d2a012401b2db5f5d59b98367590445a243eef` head failed rustfmt in [CI 41183937545](https://github.com/i-shutov/tikzarium/actions/runs/41183937545): multiline `recorder_complete` expression and 3 long unit-test calls. Applied the four requested formatting edits to A-only paths. That failed run does not certify the corrected SHA.

## macOS ARM64: real canonical-path failure

Exact `61e095b5bab63818b3e8bd148f9e5b7845472dc0`, [D QA run 41184006839](https://github.com/i-shutov/tikzarium/actions/runs/41184006839) macOS hosted tests: **5 dependency-unit FAIL**, other 26 core tests PASS. macOS temp paths expose `/var` which canonicalizes to `/private/var`. Four tests compared canonical results to noncanonical expectations. Crucially, a fifth showed missing input falsely classified outside root, allowing `is_project_fresh=true`: actual implementation bug. Corrected by canonicalizing the nearest existing ancestor before reconstructing missing path suffix; adjusted expectations to compare canonicalized paths; added a Unix symlink-root regression for missing nested inputs. No macOS PASS until re-run of corrected SHA.

## Exact SHA formatter correction after path fix

The macOS hosted fmt gate for `377cf455e0e04691137a9be68ee20433747e98a9`, [CI 41184117973](https://github.com/i-shutov/tikzarium/actions/runs/41184117973), rejected 3 long assertions in the new A tests. Applied only the three requested rustfmt layout edits, no behavior change. Earlier Mac functional failure remains recorded; new exact SHA must independently pass.

## Windows Server clippy — exact `fc09ad32` run is FAIL

[GitHub CI 41184185958](https://github.com/i-shutov/tikzarium/actions/runs/41184185958), Windows Server job 124487593011: Rust fmt and workspace tests PASSED, strict Clippy FAILED with four `clippy::cloned_ref_to_slice_refs` findings in new A unit tests (local variables `asset`, `absent`, `external`, `big`). Replaced all four unnecessary `&[path.clone()]` with `std::slice::from_ref(&path)`, preserving each original test assertion. Corrected SHA must rerun checks before any PASS assertion. Hosted Windows Server is CI-only, not Win10 acceptance.


## 2026-10-31 · A-only integration after accepted #38/#44/#51/#56

Existing PR #28 reconciled with main `b2a1299d5660d04614c78ca696189dfab10e4f43`. Keep native MiKTeX `--disable-installer`, explicit XeLaTeX, source diagnostics and B/C/D work unchanged. Add source-boundary fail-closed: if the mandatory TeX author source resolves outside the project root (including symlink escapes), `is_project_fresh` is false even if no local inputs remain. External dependencies remain explicitly unverified and do not form a global TeX cache guarantee. Portable Unicode/CRLF/opaque source and Unix source-symlink regressions accompany existing file-recorder tests.

Require fresh exact-head fmt/check/test/clippy, D QA and hosted real MiKTeX CI; all PENDING at commit. Physical Win10/M1/M4 and GUI NOT_RUN.

Integrator review caught a real false-fresh: `root/main.tex` symlink to external source was classified in ignored_external, so an empty project snapshot could claim true. Fixed by mandatory source-locality flag, preserving original input bytes and project-only scope. Existing #28 base was 183 commits behind; this merge makes main a parent rather than rewriting other lanes. No Rust toolchain in execution container; old W05 PASS must not be inherited.
