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

## Exact-head formatter follow-up (not PASS)

Source HEAD `ba6922a2b05b37e3fcbc071c7f45e0c3d67a7862`: [Rust CI 41208967201](https://github.com/i-shutov/tikzarium/actions/runs/41208967201) **FAIL** on hosted macOS and Windows Rustfmt; [D QA 41208967241](https://github.com/i-shutov/tikzarium/actions/runs/41208967241) Rustfmt FAIL on Linux/Windows/macOS. Actual rustfmt diff changes only one extra blank line and joins a two-line `ProjectDependencySnapshot::capture` assertion. No behavior/API altered. Linux XeLaTeX job SUCCESS on old HEAD, but no final-HEAD PASS inherited. Re-run final exact SHA across all hosts, including real MiKTeX.


### Recorder source-membership gate

A nonempty `.fls` with only external/foreign `INPUT` lines cannot certify full project inputs. Freshness now requires the XeLaTeX recorder to contain the canonical original author source; a source-omitting file yields `recorder_complete=false` and `is_project_fresh=false` while preserving the successfully produced PDF. Added a real fake-engine integration test with a foreign-only recorder and untouched CRLF/opaque TeX. This extends the existing missing-recorder test and closes the integrator's second false-fresh scenario. Exact new-head CI pending; no host PASS inherited.

### Latest recorder test formatting

HEAD `e0f78eec4c1e56112477e7747ac17a9c54ea0e7e`, [Rust CI 41209317672](https://github.com/i-shutov/tikzarium/actions/runs/41209317672) and [D QA 41209317661](https://github.com/i-shutov/tikzarium/actions/runs/41209317661) **FAIL Rustfmt** in one A test blank line before `external_only_recorder_cannot_certify_source_freshness`. Applied exact observed formatter removal; behavior unchanged. New SHA must pass independently.


## 2026-10-31 — main merge QA provenance / no inherited PASS

Before integrating existing PR #28, observed latest main `aa6d1d08caee984d5f31ac13396e346fc451c8fe`, branch HEAD `bd18d1b94ca2c76516f3bb3d85ef3ebe87ce9c63`, current AGENTS, open PRs and A plan. GitHub comparison against common ancestor `b2a1299d5660d04614c78ca696189dfab10e4f43`: main advanced by 53 commits, **zero files touching A core/CLI or A plans/insights**. The new branch tree is main plus the original five A code/test blobs (SHA preserved) and updates only A plans/insights. Commit has both branch and main as parents (normal merge, no history rewrite / no force update). Main's B/C/D files remain intact.

Original `bd18d1b94ca2c76516f3bb3d85ef3ebe87ce9c63` checks: [Rust 41209431449](https://github.com/i-shutov/tikzarium/actions/runs/41209431449), [D QA 41209431371](https://github.com/i-shutov/tikzarium/actions/runs/41209431371), [real MiKTeX Windows Server 41209431524](https://github.com/i-shutov/tikzarium/actions/runs/41209431524), [font 41209431447](https://github.com/i-shutov/tikzarium/actions/runs/41209431447), [N1 41209431391](https://github.com/i-shutov/tikzarium/actions/runs/41209431391) were completed SUCCESS on that **old** SHA, not this integration merge. Fresh combined-head CI/QA is PENDING and must be evaluated independently.

D10 post-main hosted checks at `aa6d1d08caee984d5f31ac13396e346fc451c8fe`: Rust [41217239643](https://github.com/i-shutov/tikzarium/actions/runs/41217239643) 3/3, D QA [41217239580](https://github.com/i-shutov/tikzarium/actions/runs/41217239580) 7/7, true MiKTeX build [41217239682](https://github.com/i-shutov/tikzarium/actions/runs/41217239682) 1/1; these prove baseline main only, **not new PR #28**. Unresolved evidence remains: production MiKTeX `doctor` with real `findtexmf` NOT_RUN, physical Win10/M1/M4 NOT_RUN, GUI/undo integrated smoke NOT_RUN. No release PASS.

## W05 symlink-retarget gap / new combined main

Integrator's precise scenario was validated as a logical failure of the prior implementation: `.fls` `INPUT ./asset.tex` was canonicalized to `a.tex` before the snapshot; after `asset.tex` changed to target `b.tex`, hashing `a.tex` would still match. This cannot be fixed by hashing alone. The new snapshot stores both recorded spelling and resolved identity, and requires both link target and digest stability. External TeX paths remain explicitly untracked; this is project-only freshness, not a universal sandbox or global provenance guarantee.

Regression contracts added to A-only Rust files: unit-level retarget of local symlink with unchanged old target; parser preserves link while canonical public dependencies remain compatible; actual fake XeLaTeX `.fls` chain with Unicode/CRLF/user macro proves the end-to-end invalidation without modifying original source. An existing source-symlink escape remains fail-closed. No B/C/D files or workflows edited.

Baseline main inspected: `5f5a805005430ff26d3e3dd9c17c3ca3d7af9fa3` (D11 #64 merged). A pre-correction branch `de114ea5b986ab57fce734c64e38393869a39a5f` had 13/13 hosted checks PASS, but **those checks do not prove this changed code**. Current code requires new exact-head Rust fmt/check/test/Clippy, D QA, actual Windows Server MiKTeX and fonts/N1 jobs. Physical Windows 10 user/shared MiKTeX, physical Mac M1/M4, GUI/undo interactions and native MiKTeX production doctor remain NOT_RUN unless independently evidenced. Local cargo/rustc absent; do not mark local tests PASS.

Self-audit on initial merge+fix commit `53a40ad107699b37c6c575b77135cb5693881e8c` found over-escaped synthetic CRLF/TeX byte literals and a malformed parser char literal before declaring any new SHA PASS. This follow-up corrects the Rust literal spelling and one excess blank line; the fixture now explicitly contains true CRLF and a single opaque TeX control sequence. Only exact new-head CI can certify formatting/compilation, no prior success inherited.

Exact SHA `0983d0d4499b302ee5c0363dcb9a384c87365568`: Rust CI [41223755830](https://github.com/i-shutov/tikzarium/actions/runs/41223755830) and D QA [41223755703](https://github.com/i-shutov/tikzarium/actions/runs/41223755703) **FAIL formatting** on macOS, Windows and Linux. Actual rustfmt 1.91.0 requested exactly one multiline `artifact.dependencies.contains(...)` assertion in new A integration test; corrected in next A commit. This failed SHA is not a functional PASS, and must not certify new head. No other formatting hunks in macOS Rust job log.

**Actual cross-host failure and correction:** [Rust CI 41223854412](https://github.com/i-shutov/tikzarium/actions/runs/41223854412), macOS ARM64 job 124603802109 on exact SHA `aaea74074c2272fed100268a8879e00ba148e456`: fmt PASSED and new symlink-retarget + parser tests PASSED, but `dependencies::tests::same_input_and_relative_components_deduplicate` **FAILED** (left 2 vs right 1). Cause is macOS temporary-root `/var` vs canonical `/private/var` alias; the relative recorder path used canonical root whereas source used original spelling. Fixed by retaining `root_spelling` for relative inputs and canonical root for locality. Deterministic Unix symlink-root regression added. No new-head PASS until CI independently finishes.

Additional preflight review of the new macOS alias fix found that BuildService receives the canonical author file for compilation but can also receive a caller-spelled /var alias. To avoid duplicate semantic source entries, the snapshot now uses canonical source for regular files and preserves original spelling only for an actual file symlink. Separate Unix tests exercise symlinked-root dedup and genuine source-link retargeting. These tests are newly added and must not be called PASS before their exact SHA CI completes.

Exact SHA `dd4ba30251c36af32dbd70ce3b03da4f350376fb` hosted Rust [41224231621](https://github.com/i-shutov/tikzarium/actions/runs/41224231621) and D QA [41224231606](https://github.com/i-shutov/tikzarium/actions/runs/41224231606) **FAILED** the Rust formatting gate: actual Windows job log `124604911875` showed exactly one A-owned assert_eq wrapping diff in the new symlinked project-root fake-engine regression. Applied that exact diff to A test only; no source/build behavior change. New exact-head fmt/check/test/Clippy and genuine MiKTeX must be verified independently, not inherited from a failed predecessor.
