# Scientific-142 R4 — SC1 project dependency ledger (2026-11-09)

## Boundary and baseline

Base: trusted `main` `46fa3aa012514ec7eb886be88744ec61234304d1`, corpus `roadmap/Tikzarium_Scientific_142_R4` (142 figures, 74 AK .dat assets, Sarov and optics-common). This is a **separate feature branch after the Windows 1.0 feature freeze**. Do not merge it into Windows 1.0 while W2b/W3/W4 are NO-GO.

The existing `ProjectDependencySnapshot` already captures source and `.fls` local input hashes; this block adds a caller-facing immutable checksum ledger without inventing a parser or a second rendering engine. This is SC1-02 plus a core-only SC1-01 model and integration tests from SC1-04; **not** complete SC1 until actual GUI integration and physical preview acceptance.

## Contract

- `ProjectInputOrigin::{AuthorSource,FlsInput}`: source is distinguished from inputs recorded by XeLaTeX.
- `ProjectDependencySnapshot::project_input_records()`: captured UTF-8-independent SHA-256 (lowercase hexadecimal), original recorded spelling, resolved path and a newly checked `bytes_current` flag for local files.
- The captured checksum never silently mutates when a data dependency changes. A changed/deleted/renamed/symlink-retargeted file invalidates `is_project_fresh()`. Missing, unreadable or oversized inputs have `sha256=None`, and cannot certify freshness.
- External TeX distribution files remain explicitly **unverified** via `ignored_external_paths()`; no global TeX-cache validity is claimed.
- No source mutation, no automatic package install, no Gnuplot, no TeX evaluation in Rust.

## Cross-platform integrity correction

CI exposed two genuine failures in the first review: one manually truncated AK-F14_3 test SHA-256, and Windows Git's automatic LF→CRLF normalization of the owner's `.tex` fixtures. The test hash is now taken byte-exactly from the owner's manifest. `.gitattributes` scopes `-text` only to Scientific-142 fixtures and provenance, preventing Windows checkout from altering any manifest-pinned source/data bytes. The original corpus content was never rewritten in this repair.

## OneFigureSession SC1-01 core model

`crates/tikzarium-core/src/one_figure_session.rs` now wraps the *existing* `Document` as the sole mutable source (no CAD/CAS and no multiple canvas). It exposes revision-bound UTF-8-aligned byte selections, bounded source Undo, guarded Save/Save As, monotonically increasing build epochs, failure-preserved last-good PDF, and `NotBuilt/Building/CurrentPdf/StalePdf/FailedBuild` verdicts. A PDF is current only when the selected source path/content, local `.fls` dependency snapshot and the original PDF bytes still match. Failed or late build results cannot promote an old PDF. Never poll `preview_state()` every egui frame: local dependency and PDF hashes are verified on demand. The app GUI **has not** yet been bound to this model.

Core-only tests (no claimed rendered PDF) cover Cyrillic/UTF-8 selection, CRLF byte-preserving Undo, same-size `.dat` mutation, deleted dependencies, last-good provenance, tampered PDF, stale build epochs and Save As.

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

- SC1-01 core `OneFigureSession` model and unit tests are implemented, but not yet wired into the existing app/Undo/selection/preview UI; keep existing UI as source authority until independently reviewed integration.
- SC1-03 UI freshness indicators and error feedback still not integrated.
- SC1-04 physical GUI reload, actual missing `.dat` with external XeLaTeX and last-good PDF still NOT_RUN.
- SC2 scanner/SourcePatch adapter, SC3 PGFPlots, SC4 paths/fill, SC5 annotations, SC6 PGF Math/foreach, SC7 142 GUI edits, SC8 physical OS QA remain PLANNED.

Do not mark `L2`, `L3`, W2b or physical Win10 W3 as PASS from a Rust integration test or a green hosted CI.
