# Roadmap — TikZ-native visual authoring

Owner-corrected scope, 2026-10-31. Replaces the earlier S0–S7 universal-CAD plan and its unsupported calendar forecast. Existing useful runtime/GUI/font/QA work is retained.

**Product loop:** TikZ primitive or library tool → properties and explanations → ordinary editable code shown beside the figure → independently installed XeLaTeX → exact PDF. Windows uses external MiKTeX; macOS ARM uses the user's external XeLaTeX. No new TeX interpreter, general geometry solver or PDF decompiler is on the critical path.

## Large delivery blocks

| Block | Delivered user workflow | Exit criterion |
| --- | --- | --- |
| N1 — Native primitive authoring | Draw line/arrow/rectangle/circle/node/Bézier, edit parameters, immediately see the changed TikZ command and its explanation, compile via external XeLaTeX | Six real tool workflows: canvas/input → source → PDF → save/reopen/undo; no unrelated source damage |
| N2 — Connected libraries | Project library panel; positioning/calc/arrows.meta/fit/shapes tool contributions; explicit preamble changes; installed/loaded/compatible/tool/help states | Connect and disconnect a library with visible diff/undo; correct tool state; raw code remains usable without an adapter |
| N3 — Full authoring assistance | F1/hover, parameter explanations, syntax hints, completion, examples and manual navigation from the same catalogue used by tools | Every exposed control has verified semantic help, requirement and example; no invented defaults; works offline for shipped help |
| N4 — Domain tool packs | PGFPlots axes/series, CircuitikZ components, tikz-cd arrows/grids; then geometry/graphs/Petri/trees/physics/chemistry packages using their native commands | Each pack has a concrete end-to-end drawing workflow, generated-source tests and real XeLaTeX fixtures, with explicit limits |
| N5 — Everyday-use acceptance | Compact layout, typography/themes, project recovery, safe exports, package diagnostics, packaging, R4 regression where licensed | Physical Win10+MiKTeX and Mac ARM smoke, exact-SHA evidence, no critical defects; release scope explicitly listed |

N1 includes basic help from the first tool; N3 deepens assistance, it is not permission to postpone explanations. Native prerequisite work and QA proceed in parallel with N1. Broader package adapters need not wait for a generic WASM SDK. Version labels are assigned to accepted functional slices, not used to delay basic authoring until a speculative architecture is complete.

## Parallel ownership

- A: core/CLI, MiKTeX detection and invocation, project/prelude configuration, diagnostics and dependency freshness.
- B: egui tools and gestures, permanent code pane, properties/help UI, exact preview and native interaction.
- C: one command/parameter/help catalogue, generators, declared source-edit contracts and package requirements.
- D: independent generated-source/MiKTeX/TeX/GUI regression evidence and physical-target runbooks.
- Integrator: shared contract review, source compatibility, substantial vertical merges and plans/insights synchronization.

Do not replace this with four independent incompatible prototypes. C publishes the small shared contract; B uses it, A remains the compiler host and D checks actual outcomes. Read active branches before editing and group commits to avoid redundant full CI for each file.

## Progress vocabulary

The existing XeLaTeX source workbench, PDF navigation, font/theme support and package audits are reusable infrastructure. The six-primitives mouse-authoring workflow, library-driven tool palette and integrated explanatory UI are new acceptance targets, not already accepted functionality. Code in a PR, green hosted CI and physical desktop acceptance are separate states.

## Forecast correction

The earlier 2–4 weeks / 4–7 months / 9–15 months forecast is **withdrawn**, not a schedule for this corrected product. Initial PR lead-time measurements are not development-effort benchmarks for these workflows. Re-estimation must use actual completion of N1/N2 and shared catalogue reuse; do not manufacture a new calendar from PR count.

Detailed execution contract: `plans/2026-10-31_FULL_SCOPE_ROADMAP.md`. Research and correction log: `insights/2026-10-31_DELIVERY_VELOCITY_BENCHMARK.md`.
