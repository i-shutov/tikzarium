# B30 — Real X11 I32 held-Undo: release edge, source focus and native history

2026-11-01; B-only, existing draft PR #69, based on main `529217b89e83ffb93393eefb99a2a6ff07967c13`.

## Reproduction (independent, NOT accepted)

I32 independent [X11 run 41274957152](https://github.com/i-shutov/tikzarium/actions/runs/41274957152) on B29 `133cab9eff2da0e2ab2ae9574e5328f2dad3ee62` is a **real desktop FAIL**. The actual editor saved original UTF-8 and first C-native Line, but during a second held click + Ctrl+Z a second Line was visible in `b29-click-undo-held.png` *before* the QA driver's explicit mouse-up; saved TeX contains two owned Lines. Root cause of this exact event ordering is not yet proven; do not call a headless PASS desktop acceptance.

## B-owned correction / minimal contract

1. Permit an authored gesture to commit **only when the frame actually includes a primary-button release event** (and primary is no longer down), not merely when `Response::clicked` or `drag_stopped` is reported. This fails closed for unusual backend/focus/key event interleavings without changing C's TikZ generator.
2. Cancel a held pointer when Ctrl/Cmd+Z has no visual-history entry; allow a fallback to route the genuine keyboard shortcut if app-level handling happened before the guide first claimed focus. A successful visual Undo cancels even a mouse-down arriving in its *same* event frame.
3. A source-line jump highlights and galley-scrolls but **does not take keyboard focus away from the guide**. Direct source clicks still focus the editable code. On a verified visual inverse patch, show the code editor noninteractive for *one frame* and clear its stale native undo snapshot, then repaint as an editable editor. This is not a permanent read-only mode.
4. Keep debug-build, user-content-free gesture/Undo diagnostics available to independent QA's `app.log`.
5. Add actual `egui::Context::run(RawInput)` regressions for the production handler: same-frame press+Undo and already held press (24 paths), Ctrl+Z without visual history (12 paths); keep prior 6×width×drag click and focused-editor tests. These are `UNIT_EVENT` only.
6. Retain ordinary .tex UTF-8, unknown TeX macros/scopes, exact patch-based Undo, Save/Reopen, F1 Russian descriptions, common C catalogue and external XeLaTeX PDF. No own TeX/CAS, no guessed PDF coordinates.
7. Require integrator/D to re-pin their QA-only #70 to final exact B30 app source tree, execute unchanged independent X11 test, audit raw TeX/PDF/PNG and do not merge #69 until real GUI PASS. Physical Win10 + independently installed MiKTeX and Mac M1/M4 remain NOT_RUN.

## Ownership/evidence

Only `crates/tikzarium-app/src/tikz_canvas.rs`, `main.rs`, and new B `plans/insights`. No modifications to C catalogue, A/core, D/#40, E/help, F source tests, QA/#70, old #37/#43 or integrated #44. Hosted checks and exact SHA must be appended after execution, not assumed.
