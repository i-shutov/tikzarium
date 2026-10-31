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
