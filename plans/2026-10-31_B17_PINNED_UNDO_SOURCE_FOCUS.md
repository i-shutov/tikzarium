# B17 — Split inspector Undo remains visible and focuses original source

2026-10-31 · B-only follow-up in the existing draft PR #62, rebased on exact main `aa6d1d08caee984d5f31ac13396e346fc451c8fe` (D10 #63 merged, C/N2 #58 merged). Historical #37/#43 are NOT re-applied. AGENTS, B14–B16 plans/insights and current open PRs #48/#60/#62 reread.

## Observed UX gap and desired vertical

Previously the only visual Undo button sat **after the full inspector, all C catalogue properties and the expanded F1 reference** inside the scrolling panel. A normal 850×560 or 1250×800 Split viewport could require long scrolling just to reverse an operation; clicking Undo did not focus the affected source line. The editable source should be the authoritative, immediately visible result of each action.

## B-only implementation

- Move the existing Undo action and Russian status above the inspector ScrollArea in the Split side panel. It is now independent of scrolling through long C-provided parameters/help, not another tool/generator.
- Reuse the existing `Session::undo` transaction, not a new inverse algorithm: add `undo_and_focus_line` for the one-based line of its verified inverse patch. On success, the main source editor receives the normal `jump_to_line` + whole-line highlight, for both parameter edits and removed generated commands. Failed/stale manual edits never mutate source or navigate.
- Test actual egui pointer click on the production action-bar Response, undo parameter patch, undo insertion and unchanged opaque source; ensure disabled button cannot silently roll back hand-edited TeX. Existing six palette/gesture F1/Save/Reopen UNIT_EVENT coverage remains B16; C catalogue/core untouched.
- All changes B-owned `crates/tikzarium-app` + own plans/insights. XeLaTeX renders exact PDF; provisional guide is not coordinate-registered to it.

## Acceptance and evidence boundary

Only exact-head Rust fmt/tests/Clippy + N1 XeLaTeX + hosted MiKTeX + fonts may be called PASS after completion. Local Rust unavailable; CI not yet observed at commit time. This event-frame test is UNIT_EVENT, not actual desktop. Separate physical Windows 10 x64 with externally installed MiKTeX, Mac M1/M4, screenshots, IME, native dialogs and Retina remain NOT_RUN. Integration #48 owns independent Linux/X11 pointer profile calibration and desktop artifacts.
