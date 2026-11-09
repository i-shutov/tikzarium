# Scientific-142 R4 — SC1 project dependency ledger (2026-11-09)

## Boundary and baseline

Base: trusted `main` `46fa3aa012514ec7eb886be88744ec61234304d1`, corpus `roadmap/Tikzarium_Scientific_142_R4` (142 figures, 74 AK .dat assets, Sarov and optics-common). This is a **separate feature branch after the Windows 1.0 feature freeze**. Do not merge it into Windows 1.0 while W2b/W3/W4 are NO-GO.

The existing `ProjectDependencySnapshot` already captures source and `.fls` local input hashes; this block adds a caller-facing immutable checksum ledger without inventing a parser or a second rendering engine. This is initial SC1-02 implementation, **not** complete SC1, and provides an integration test from SC1-04.

## Contract

- `ProjectInputOrigin::{AuthorSource,FlsInput}`: source is distinguished from inputs recorded by XeLaTeX.
- `ProjectDependencySnapshot::project_input_records()`: captured UTF-8-independent SHA-256 (lowercase hexadecimal), original recorded spelling, resolved path and a newly checked `bytes_current` flag for local files.
- The captured checksum never silently mutates when a data dependency changes. A changed/deleted/renamed/symlink-retargeted file invalidates `is_project_fresh()`. Missing, unreadable or oversized inputs have `sha256=None`, and cannot certify freshness.
- External TeX distribution files remain explicitly **unverified** via `ignored_external_paths()`; no global TeX-cache validity is claimed.
- No source mutation, no automatic package install, no Gnuplot, no TeX evaluation in Rust.

## Real-corpus acceptance

New Rust integration test uses actual five AK sources (not fabricated drawings) and their manifest-declared local inputs:

| Figure | Input family |
|---|---|
| AK-F6_4 | `optics-common.tex` |
| AK-F6_5 | `optics-common.tex` |
| AK-F14_3 | 4 local `.dat` |
| AK-F15_1 | 5 local `.dat` |
| AK-F21_2 | 7 local `.dat` |

For each, assert captured manifest source SHA256, local input count/provenance, 64-character captured checksums, local paths, unchanged source bytes and fresh initial snapshot. For a **copied** AK-F14_3, mutate the first byte of one `.dat` without changing its length, then delete that `.dat`. Both must mark the dependency stale, retain the captured checksum, and preserve the source. Original corpus is never modified.

Run exact-branch `cargo fmt --all -- --check`, `cargo test --locked -p tikzarium-core`, clippy, and normal Windows/Linux/macOS CI. Original 142 external XeLaTeX L1 evidence from R4 is retained, but is not re-run or promoted to L2/L3 here.

## Remaining SC1–SC8 gates

- SC1-01 production `OneFigureSession` still not integrated with app/Undo/selection/PDF state.
- SC1-03 UI freshness indicators and error feedback still not integrated.
- SC1-04 physical GUI reload, actual missing `.dat` with external XeLaTeX and last-good PDF still NOT_RUN.
- SC2 scanner/SourcePatch adapter, SC3 PGFPlots, SC4 paths/fill, SC5 annotations, SC6 PGF Math/foreach, SC7 142 GUI edits, SC8 physical OS QA remain PLANNED.

Do not mark `L2`, `L3`, W2b or physical Win10 W3 as PASS from a Rust integration test or a green hosted CI.
