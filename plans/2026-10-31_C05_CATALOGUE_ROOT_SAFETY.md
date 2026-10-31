# C05 — Reject symlinked catalogue directory roots

Date: 2026-10-31. Owner: isolated lane C; issue #4.

## Preflight
- Exact main before branch creation: `8764a732b9a846a6ba1f111c9b656781195a6412` (I05 #24 integrated).
- Open lane C PR #26 was still pending; it contains only new catalog QA script, tests, plan and insights. It was independently refreshed onto this main through a merge commit; C05 does not edit any of its files.
- Read current `AGENTS.md`, extension registry, `docs/EXTENSIONS.md`, C01–C04 plans and QA, current runner and package matrix. Neighboring PRs are out of scope.

## Security finding
`Registry::load_directory()` checked each `.toml` entry's `DirEntry::file_type()` but called `read_dir(dir)` first; the OS follows a symlink **at the selected catalogue directory itself**. Consequently an optional user catalogue `alias -> outside` silently read out-of-location manifests, and a dangling alias was silently classified as an absent optional directory.

## Changes
1. Check the final directory component with `symlink_metadata` before reading it.
2. Preserve `Ok(0)` for genuinely absent optional directories, reject symlinked or non-directory roots as `UnsafeEntry`, and propagate deletion/race errors rather than returning an empty success.
3. Add platform-neutral ordinary-file rejection; Unix tests for valid alias, broken alias, unchanged registry and direct-path success; and Windows symlink regression when the host grants creation privilege (otherwise explicit test skip).
4. Clarify limitation: this is a narrow defense, *not* race-free `openat/O_NOFOLLOW` path resolution or a complete adversarial filesystem sandbox.

## QA and acceptance
- Exact-head `cargo fmt --check`, `cargo test -p tikzarium-extensions`, `cargo clippy -p tikzarium-extensions --all-targets -- -D warnings` must pass in CI before claiming Rust QA PASS.
- No TeX execution changed; only manifest metadata import behavior.
- Physical Windows 10 x64 and Apple Silicon M1/M4 remain NOT_RUN; hosted Windows Server/macOS CI are distinct evidence.
- Do not alter `.github/workflows`, GUI, core runner or C04 files. Preserve source and capability distinctions.

## Next bounded block
For truly untrusted concurrently writable catalogue trees, evaluate a reviewed handle-relative no-follow directory API for Windows/macOS/Linux and specific Windows junction/reparse-point regression tests. Do not promise complete TOCTOU protection using path-based `stat/open` alone.
