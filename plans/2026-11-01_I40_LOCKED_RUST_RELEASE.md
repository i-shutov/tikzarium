# I40 — reproducible dependency resolution for TikZarium's hosted builds

Date: 2026-11-01. Scope: **i-shutov/tikzarium only**. Based on accepted main `06b62eea47591c7cb64b0a0cd0026fce8834c9e8`. No changes to B-owned GUI primitives, C command catalogue, physical TeX installation or old draft PR #48.

## Problem and evidence provenance

The repository had no tracked `Cargo.lock`, even though its real Linux/X11 egui evidence archived the generated dependency resolution. A subsequent hosted build could pick different Rust dependency versions without changing the TikZarium source. This blocked reliable *dependency-level* release comparisons, particularly across Windows Server, native hosted macOS ARM64 and hosted Linux.

Independently recovered `i19-build-evidence/Cargo.lock` from the **post-merge main** [X11 action #41281154331](https://github.com/i-shutov/tikzarium/actions/runs/41281154331), [artifact 13072954180](https://github.com/i-shutov/tikzarium/actions/runs/41281154331/artifacts/13072954180), archive SHA-256 `48cb9ddffed42ccb71531eb75b7f9d7b59e64ddf375de5a9269fc8cfdef3018d`. Lock file SHA-256 **`4713fd0c29ef8718ff71316f68e5dffe43335b77857e5c7eff9771d087310503`**; format 4, 370 packages including 366 registry packages and the four TikZarium workspace members. It is a record of a real completed 1.91.0 build, not a synthetic dependency list.

The dedicated one-time [import run #41282413609](https://github.com/i-shutov/tikzarium/actions/runs/41282413609) independently redownloaded both exact bytes, verified both SHA-256 hashes, ran `cargo metadata --locked` and `cargo check --workspace --all-targets --locked` using Rust 1.91.0, and committed that lock. The temporary bootstrap workflow was removed from the branch after this succeeded; it must **not** be merged as a permanent dependency downloader.

## Integrated vertical

- Track the immutable accepted Cargo.lock in Git; no Cargo.lock regeneration or live version upgrade on release CI.
- **Cross-host byte reproducibility gate:** Windows hosted checkout initially converted 3,805 LF endings to CRLF, changing raw lock SHA to `a88dd89468c3b215fd8fd608115ef41a574c7aa9c50a3806871edf1a0ec041ad` while Git diff hid this normalization. Scope `.gitattributes` to `Cargo.lock text eol=lf`, and compare raw committed Git blob to raw checked-out bytes; no line-ending policy for user .tex/.tikz files. Retest exact revised PR HEAD on Windows/Linux/macOS and demand one canonical SHA on all three.
- Every Rust `check`, `test`, `clippy`, `build`, `run` in the five relevant CI workflows uses `--locked`. `cargo fmt` does not resolve dependencies.
- Add a single Python stdlib lock auditor `scripts/qa_cargo_lock.py`: checks tracked and unchanged lock, format 4, unique package records, registry SHA-256 entries, all four local crates, actual `cargo metadata --locked`, source Git commit and Rust/host provenance. Explicitly records `NOT_VERIFIED` for bitwise identical binaries.
- Run adversarial offline tests for missing/cracked checksums, missing workspace member, duplicated packages, invalid TOML and invalid format.
- Archive host-identified JSON provenance in native Windows Server/macOS ARM64 release artifacts, three-host QA matrix, external XeLaTeX smoke, real Linux/X11 egui acceptance, N1 generated PDF proof and actual private MiKTeX hosted acceptance.
- Keep Rust vs MiKTeX independence: this lock **does not** install, alter or substitute the external TeX engine or libraries. Existing actual PDF/font/source/package-inventory audits remain authoritative.

## Acceptance and limits

1. **Bootstrap proof:** PASS on exact main-generated X11 artifact and Rust 1.91.0.
2. **Final PR exact-HEAD CI:** NOT_RUN until GitHub Actions completes on the final branch SHA; check all jobs, then independently audit critical artifacts.
3. **Main post-merge CI:** NOT_RUN; required separately after and only if PR merge is accepted with `expected_head_sha`.
4. **Physical Windows 10 x64 / independently installed MiKTeX:** NOT_RUN.
5. **Physical Mac ARM M1/M4 / independently installed XeLaTeX:** NOT_RUN.
6. **Bit-identical binaries across repeated environments:** NOT_VERIFIED; this is locked dependency-resolution evidence, not deterministic-build certification.
7. **Compact PDF at 1180×680:** existing UI clipping limitation remains; outside this I40 scope.

Any intentional Rust dependency upgrade requires explicit lock change, all three hosted target resolutions, reviewed provenance and an ordinary source PR. Never treat `cargo --locked` alone as proof of physical GUI or TeX runtime compatibility.

Merge only when exact PR HEAD CI, source diffs, critical artifact review and SHA lease are satisfied. Save separate post-merge results in issue #35; no release announcement from this block.
