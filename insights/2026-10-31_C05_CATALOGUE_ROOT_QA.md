# C05 — Catalogue root safety QA record

Date: 2026-10-31. Scope: `crates/tikzarium-extensions/src/lib.rs`, `docs/EXTENSIONS.md`, this QA record and C05 plan.

## Baseline
Main SHA `8764a732b9a846a6ba1f111c9b656781195a6412`. C04 #26 was refreshed independently to merge-main HEAD `2a8b079d3d1d2d94bc87d4bbb50cdb46a6ad19ed`; C05 starts directly from main and does not stack on C04.

## Before / after
Previously `read_dir` followed a symlink supplied for `dir`, even though linked individual `.toml` entries were rejected. A broken linked directory was treated as an optional missing directory. Now the final root component must be a non-symlink directory; a regular file, linked directory, or dangling linked directory returns `UnsafeEntry`. The registry is unchanged on errors.

## Regression coverage added
- `regular_file_is_not_an_optional_catalogue_directory`: platform-neutral, asserts `UnsafeEntry` and unchanged registry.
- `directory_root_symlinks_are_rejected_without_mutation`: Unix/macOS, verifies a valid symlink and a dangling symlink both fail without insertion; direct read of the genuine directory still succeeds.
- `windows_directory_symlink_is_rejected_if_host_allows_creation`: Windows only; checks root symlink rejection when symlink creation succeeds. A privilege denial prints an explicit SKIP; it is not evidence of a Windows symlink probe.

## Actual vs pending evidence
- Repository source, documentation and test changes were committed through the GitHub connector; no local Rust compiler/rustfmt is available in the execution environment, so local `cargo test/fmt/clippy` **NOT_RUN**.
- Exact-head GitHub Actions must be inspected after the PR is opened; this record does not predeclare their result.
- No `xelatex`, `pdfinfo`, visual editor or native Windows 10 / physical Apple Silicon smoke was executed by C05. No compiler, package or visual-edit capability was promoted.
- The check is *not* an OS-level race-proof sandbox; ancestors may themselves be symlinks and filesystem entries can change after validation. Never treat a path-based validation check as a substitute for handle-scoped no-follow operations.

## Integrator handoff
Review changes independently of C04 and merge only with actual exact-head Rust CI evidence. Do not rewrite another lane's files. Continue to track distinct Windows 10 x64, hosted Windows Server, hosted macOS ARM and physical Apple Silicon acceptance.
