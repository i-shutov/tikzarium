# I06 — QA ledger and source-preservation rationale

Date: 2026-10-31. Engineering baseline: main SHA `2da3a298b9c323951a64a5ba2c878b2448821d09` after C05 #30 merged from exact head `430ec24b4bc0a473a732b778d292408433092a28`. Main C05 Actions initially PENDING when this workpack started. Four active lanes can change other PRs: never infer current main or CI status from this frozen note; recheck before merge.

## Confirmed root cause by source inspection (not claimed physical reproduction)

`crates/tikzarium-app/src/main.rs` calls `self.save()` on each Build. `crates/tikzarium-core/src/document.rs` formerly unconditionally called `NamedTempFile::persist(target)` even if `doc.dirty() == false`. Hence a compile of untouched source could replace the actual file, sever symlink or hard link, alter metadata and overwrite an independent editor's changes. Rust-based source-inspection finding; no native GUI reproduction is claimed.

## Patch evidence and tests prepared

- Code: `Document::save_to` checks same logical file via exact path or canonical identity; compares raw disk bytes with saved source; errors on externally changed/deleted source; true no-op for clean source; symlink/read-only/irregular target safety before writing; retains atomic tempfile persistence for intended dirty saves.
- New Rust cases include `clean_save_preserves_existing_file_bytes_and_identity` (Unix inode), `changed_disk_source_is_never_overwritten_by_stale_buffer` (both clean & dirty), `deleted_open_source_cannot_be_silently_recreated`, `explicit_save_as_to_new_path_preserves_the_original`, `clean_build_save_preserves_symlink_and_dirty_save_fails_closed` (Unix), `readonly_open_source_can_be_built_without_replacement`.
- Workflow: both hosted main CI and D QA Rust matrices execute the named core document test subset; existing real XeLaTeX CLI and PDF artifact checks remain intact.
- Local cargo/rustc not installed: **NOT_RUN**. No physical Windows 10/M1/M4 GUI sessions: **NOT_RUN**. Exact branch source SHA, actions IDs and artifacts to be recorded after CI, not predeclared.

## Non-goals / follow-up

No race-free concurrent-write guarantee; stat/read/rename is vulnerable to a small TOCTOU window, particularly on network filesystems. No source file is ever rewritten merely to use XeLaTeX. The extension `PACKAGE_MATRIX.csv` remains unchanged: installation, real XeLaTeX compile, semantic inspection and visual-edit statuses have not been expanded. B05/B06 preview safety and D05 artifact audit are separate PRs and not assumed accepted. Do not treat hosted Windows Server as user's Windows 10, or hosted macOS ARM as user's physical M1/M4.
