# B09 — pointer/event and manual-edit QA ledger

2026-10-31. Exact starting main `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49`; read AGENTS, B07/N1 plans/insights, current PRs; #44 already merged. B branch owns only app sources and B-specific plans/insights.

## Reproducible issues targeted

1. Existing tests called `Session::insert` directly and therefore could not detect an egui regression in press/move/release response handling; now an event-frame harness uses the production `show_guide_frame` and `Context::run` for all six tools. Generated code still comes from the C catalogue.
2. After manual TextEdit changes, the visual Undo remained visibly enabled until another authoring method performed a lazy source sync. This invited an invalid undo attempt and held a stale selected command. The TextEdit change response now eagerly revokes visual history and selection while keeping the user's bytes.
3. Captured drag release outside the provisional pad could produce unbounded coordinates. Snap now clamps to the guide, and a genuine release uses egui's latest pointer position fallback.

## Evidence status

Committed code, static review and exact diff: pending PR evidence. Rust fmt/test/Clippy: PENDING exact-head Actions; no cargo installed in the connector-only engineering runtime. Unit/event frames remain `UNIT_EVENT` even when green, never `PHYSICAL_GUI`. Filesystem save/reopen uses a temporary file and `Session::reset/choose`, not the native OS file picker. Source cursor jump is checked via the Unicode-aware helper, not by a screenshot of a focused TextEdit. F1 uses an actual egui key event and the same shortcut handler. No external TeX invocation occurs in the event unit tests; N1 proof and D MiKTeX QA are distinct.

## Remaining blockers / integration handoff

Record exact PR HEAD, its Rust/workflow statuses and any failing logs. If event frames expose click vs drag ordering, fix the production handler and repeat on a NEW exact SHA. Do not merge #37/#43 independently. Physical Win10 x64+MiKTeX and Mac ARM M1/M4 are NOT_RUN, as are real screenshots and native file dialogs. Unknown macro scopes, transformations and PDF inverse mapping remain intentionally opaque; no Rust TeX/CAS/solver.

## Exact-head QA correction #1

Hosted Windows Server 2022 Rust CI [41192043579](https://github.com/i-shutov/tikzarium/actions/runs/41192043579), job 124510633089, failed at `cargo fmt --all -- --check` on B09 SHA `93602b4cc250bda5e0b1e81b061edbe75003c838`. The formatter-only diffs were applied in this next commit (two B-owned `.rs` files), without suppressing CI or changing test assertions. This is not a compile/test pass. Recheck exact new SHA across all jobs.
