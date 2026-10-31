# B02 — PDF identity, safe exports and native keyboard workflow

Date: 2026-10-31. Owner: independent B (egui). Tracks #3.
Base: B01 branch `feat/b-egui-workspace-diagnostics` at `50f9876e7927d7d97ed2cff00624d42fc6efea43`; B01 is itself stacked on W01 PR #6. `main` inspected at `4ceca871fc2c3b661f92d64f9c6b39b473cebd0a`; Rust workspace is not in main.
Do **not** merge B02 straight to main. Review W01 -> B01 -> B02 prerequisite chain (or integrator-managed equivalent).

## Scope and acceptance
- [x] Track the source pathname alongside source text for *last successful* XeLaTeX artifact. A Save As that changes pathname makes the last-good PDF stale even when bytes do not change.
- [x] Keep the originating source/path snapshot per in-flight build; edits while compiling cannot promote stale preview to current.
- [x] Refuse **Export PDF** for stale builds, including a *new build still running*, both in disabled toolbar action and in direct method call. Retain and visibly label last-good preview.
- [x] Disable file open/save, Save As and TeX discovery actions while a worker is running. Cancel remains available.
- [x] Desktop bindings: Command/Ctrl+O open, Command/Ctrl+S save, Command/Ctrl+Shift+S Save As, Command/Ctrl+Enter XeLaTeX build. Shortcut actions are ignored while active build or unsaved-changes modal is open. All actual native dialogs still use `rfd` on Win/macOS.
- [x] App unit tests for path mismatch/failed build/edits and shortcut modifier dispatch.
- [ ] Exact-head `cargo fmt --check`, `cargo test -p tikzarium-app`, `cargo clippy --workspace --all-targets -- -D warnings` — require hosted CI job evidence.
- [ ] Physical Windows 10 22H2 x64 and macOS ARM64 screenshot/keyboard/native-dialog regression acceptance — NOT_RUN. Do not treat hosted Windows Server 2022 or macOS build as hands-on acceptance.

## Native smoke procedure
See `crates/tikzarium-app/QA_GUI_SMOKE.md`. Ensure every screenshot and observed result is attached to the PR with platform version, app SHA, TeX version, PDF rasterizer and screen DPI. Cover 1366x768/Retina, source edit/save, compiled exact PDF, stale export refusal after Save As to another pathname, split/canvas layouts, modal and cancellation.

## Separate integration handoff (no foreign changes)
- A PR #10 publishes `BuildError::diagnostics()` and `log_excerpt()`. B should wire it once upstream integrates the API; B02 deliberately makes no core changes and does not pretend failure spans are already available.
- C PR #7 distinguishes unknown/missing TeX package status; current W01 legacy bool conflates them. B03 should use C's states only after compatible integration.
- True multi-page PDF navigation needs reviewed core preview/page-count renderer contract; B02 retains explicit page-one read-only canvas and makes no claim of multi-page support.

## Merge decision
Remain draft until exact-head CI is verified; physical Win10 and Mac ARM screenshot smoke are explicit release gates. Report blockers and one next executable action in insights.
