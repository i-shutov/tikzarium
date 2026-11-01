# B18 — visible F1 help and keyboard-safe source Undo

2026-10-31 · lane B egui · continuing **one draft PR #62**. Before edits: exact main `5f5a805005430ff26d3e3dd9c17c3ca3d7af9fa3` (#44 N1 and D11 #64 already merged), B head `6235be440913580034344661a6e838a1f7ab8856`, open PRs and AGENTS plus B16/B17 and integration plans/insights inspected. Historical #37/#43 are not merged or copied separately. PR62 is reconciled with main via a two-parent commit; C/A/D/E/F content is inherited unchanged.

## User-facing defect and correction

The long right-hand parameter inspector placed expanded F1 help below numerous fields. F1 toggled state, but the requested explanation/syntax could remain entirely below the scroll viewport at 1366×768. Pin a **compact Russian summary, TikZ syntax and PGF manual link above the inspector ScrollArea**, entirely derived from the same C catalogue used for tool generation/help; full property help still scrolls below. The pinned preview appears only when contextual help is active; no independent help facts/defaults are hardcoded.

The existing pinned source-patch Undo had no matching keyboard access. In default Split view, Ctrl/Cmd+Z outside a focused text widget uses exactly the existing `Session::undo_and_focus_line` and highlights the affected source line. **When a TeX/parameter TextEdit owns keyboard focus, egui retains its native Ctrl/Cmd+Z**; manual source changes still revoke stale visual patches. Button Undo stays reachable in all cases.

## Source authority and constraints

No C/core APIs or catalogues, TeX commands, engine, PDF geometry, arbitrary macro model or native dialogs changed. All six primitives still use C. Exact rendering is the external XeLaTeX PDF, provisional pad does not claim PDF registration, Windows 10 MiKTeX installed independently. New `UNIT_EVENT` tests call production egui F1 and keyboard Undo handlers with real `Context::run(RawInput)` including key press/release and a focused TextEdit; they are **not** Win10/M1/M4 physical GUI acceptance.

## Gate

Rust fmt/test/Clippy, D QA, real N1 XeLaTeX, hosted MiKTeX Windows Server, fonts on the **new exact HEAD**. Never inherit B17 green without a run. Inspect test failures rather than weakening invariants. Handoff new HEAD, check URLs, tested scenarios and remaining NOT_RUN to integrator PR #48.
