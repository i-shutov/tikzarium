# A / W05 — project dependency freshness after I05

Date: 2026-10-31. Own branch `feat/a-w05-project-dependency-freshness`.
Base `main`: `8764a732b9a846a6ba1f111c9b656781195a6412` (I05 #24 merged).
A #10 is closed unmerged; do not force-merge it. F01 #16 and F02 font warnings are already integrated.
Open independent B #25, C #26 and D #27 are out of scope.

## Vertical workpack

1. Consume successful runner `.fls` dependencies without changing original TeX sources or compiler arguments.
2. Record SHA-256 of the original source and each distinct local project input (scoped by the source directory). Preserve Unicode/space filenames and normalize resolved path identities.
3. Expose `BuildArtifact.project_dependencies` with `is_project_fresh()`, `invalidated_project_paths()` and `ignored_external_paths()`. The GUI may debounce these checks and label stale previews in a follow-up B-owned integration.
4. Detect byte changes even when file size is unchanged, missing/deleted inputs and initially unverifiable files. Keep local hashing bounded to 64 MiB per input; reject a freshness claim above that cap.
5. Ignore TeX installation paths and files outside the selected root **explicitly**. Never assert globally fresh from a project-only snapshot. Out-of-root includes are reported for later project-root configuration.
6. No shell, network or source modification; no new external runtime program. The compile-time Rust `sha2` dependency calculates deterministic SHA-256.
7. Add portable unit tests plus a Unix end-to-end fake XeLaTeX `.fls` integration test. Test same-byte-length edits, deletion, missing and huge files, Unicode and external paths.
8. Run exact-head Rust fmt/check/tests/Clippy and the existing 3+6+font GitHub Actions matrix, inspect results. Physical Win10 and physical Mac M1/M4 remain separate release gates.

## Boundaries and explicit next block

This is **project-scope post-build freshness**, not a global TeX cache, file watcher, or provenance attestation. Outside-root files and symlinks to external targets are listed but are not hashed; changing them does not invalidate `is_project_fresh()`. Build-time changes (TOCTOU) and font/TeX-installation drift are not yet verified. SHA-256 hashing on a UI thread should be debounced or moved to a worker by lane B; lane A does not alter GUI files. Next A-owned workpack: explicitly select a project root and record external includes, or pre/post source fingerprint reconciliation to reject a PDF compiled from a concurrently changed source.

No declaration of PASS until exact-head CI is observed.

## Recorder completeness: fail-closed extension

A successful engine exit plus PDF is insufficient if `.fls` is absent, unreadable or contains no `INPUT`. The runner now passes an explicit `recorder_complete` flag to the snapshot. Its `is_project_fresh` returns false with no usable recorder, but the PDF remains accessible to avoid incorrectly failing the build itself. A fake engine test covers this failure mode.

## Platform path canonicalization gate

macOS `/var` → `/private/var` alias demonstrated a dangerous false-fresh classification when a missing input is under an aliased project root. Missing paths now resolve through the nearest existing canonical ancestor before root-boundary checks. Regression tests require macOS and Unix symlink-root parity.
