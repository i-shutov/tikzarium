# TikZarium — full-scope roadmap and calendar forecast
Date: 2026-10-31 · snapshot main SHA \`8764a732b9a846a6ba1f111c9b656781195a6412\`

## Product outcome and non-goals

The user wants an offline native Rust/egui authoring workbench for Windows 10 x64 and macOS ARM64 (M1/M4), with **XeLaTeX as canonical compiler** and progressively deeper editing of TikZ/PGF figures.

Separate these statuses in *all* UI and reports:
1. COMPILABLE: existing TeX source can be rendered by installed **XeLaTeX-compatible** packages, with local preambles, assets and font selections. No compiler fallback; Lua-only graphdrawing is not compatible.
2. INSPECTABLE: editor can identify/select source constructs and navigate metadata without changing source.
3. VISUALLY_EDITABLE: precise, reversible, source-preserving canvas and property edits within a **declared supported subset**.
4. OPAQUE_SOURCE: unknown macros, conditional or code-generated constructs render exactly with XeLaTeX but cannot be safely edited visually.

It is not mathematically defensible to promise visual decompilation of arbitrary TeX macro programs or 100% editable coverage of all current/future CTAN TikZ add-ons. The v1.0 target is *complete product workflows* plus broad domain adapter support with honest fallbacks.

## Large engineering blocks

Estimates overlap. "PR" counts are **planned bounded vertical PRs**, not dates mechanically extrapolated from the initial hour and not proof of implemented functionality.

| Block | Proposed release | Vertical scope | Planned PRs | Team calendar with 4 autonomous lanes + integration | Hard acceptance |
| --- | --- | --- | ---: | --- | --- |
| S0 · Consolidation, native v0.1 | v0.1 | Integrate #25–#30, QA loops, local user profiles, source/project root and preambles, compile PDF, actual native Win10+M1/M4 smoke, offline packaging; rustfmt/clippy + fonts/themes/Unicode/2-page fixtures | 6–12 | 2–4 weeks | Native launch/edit/save/compile/preview/reopen/export+error recovery on target machines, SHA and screenshots |
| S1 · Source and scene backbone | v0.2 foundation | Source-preserving lexer/CST, comments/macro opaque zones, stable object IDs/span maps, bidirectional source↔scene, incremental patches, undo/redo, known/unknown capability tags, diff+preview reconciliation | 15–25 | 4–7 weeks | 100+ round-trip fixtures, no unrelated byte changes, undo restores source, fuzzed macro/comment inputs |
| S2 · Core visual editor | v0.2 | Nodes, paths, Bézier handles, edge anchors, arrowheads, text+math nodes, snapping/guides, keyboard/mouse selection, transform, grouping/layers, styled inspector, copy/paste, alignment, multi-select; exact XeLaTeX PDF is truth | 25–40 | 8–13 weeks | ≥100 visual workflows; source→canvas→source stable; 1366x768+Retina usable; unsupported constructs read-only |
| S3 · Semantic geometry | v0.3 | Named points/segments/lines/circles, intersections, coordinate expressions, constraints, geometry DAG, dependency propagation, degeneracy/cycle handling, sliders and safe source preservation | 18–30 | 6–10 weeks | ≥60 independent geometric cases including limits/degeneracies and dependency cycles |
| S4 · Extension SDK and registration | v0.4 | Versioned adapter contract, declarative manifests/capabilities, parser and inspector contributions, template/content snippets, permission model, project disable/enable; start with built-in Rust adapters. WASM plugin execution only after isolation/security review | 12–20 | 4–7 weeks; overlaps S2/S3 | 2 independently developed adapters through one SDK, disabling them does not corrupt documents |
| S5 · PGFPlots/scientific | v0.5 | Axis/grid/ticks/legends, 2D/3D plot configs, data series/table import, style and semantic axes, parametric/text/math labels, scientific figure templates, exact PDF verification | 18–32 | 7–11 weeks; starts after S1/S2 | ≥40 PGFPlots families, 2D/editable subset clear, 3D/unknown constructs source-only if unsafe |
| S6 · Domain adapters and package breadth | v0.6–v0.7 | CircuitikZ, tikz-cd, tkz-euclide, automata/graphs, Petri nets, trees/forest, quantikz, chemfig, optics/technical diagrams; package discovery, versioned compatibility and verified engine matrix | 30–55 | 12–20 weeks; adapters parallel to S3/S5 | ≥6 usable subject adapters, each with explicit editability contract and ≥20 source/compile fixtures |
| S7 · Professional beta and stable 1.0 | v0.8→v1.0 | Performance, PDFium/Poppler distribution/license, HiDPI/IME, project manager, batch export SVG/PDF/PNG, Git/source diff, backup/recovery, preferences and themes, documentation, installers, R4 fixture provenance/QA, release signing/hashes | 20–35 | 6–12 focused weeks, QA runs continuously throughout | Reproducible releases, no critical defects, physical Win10 + M1/M4 acceptance, accessible UX and source integrity |

**Critical path:** S0 → S1 → S2 → S3 (geometry) → semantic-scientific editing → S7 acceptance. S4 SDK can start after source/scene contract stabilizes; S5 scientific and S6 adapter implementations can run partly in parallel with geometry.

## Relative calendar forecast from 2026-10-31

| Milestone | Working window | User-visible scope |
| --- | --- | --- |
| Native v0.1 internal acceptance | November 2026 | Reliable XeLaTeX source workbench, font proof, themes, PDFs and device smoke |
| S1 source/CST interface ready | December 2026–January 2027 | Lossless parse/patch and visual editing contracts |
| First useful v0.2 visual editor | February–April 2027 | Common TikZ nodes/paths/labels and constrained source-safe canvas editing |
| Geometry v0.3 | March–May 2027 | GeoGebra-like named geometry and dependency graph |
| Stable SDK v0.4 | April–June 2027 | Separate subject adapters built independently |
| PGFPlots v0.5 | June–August 2027 | Useful scientific plot inspector/editor |
| Broad adapter pack v0.6–v0.7 | August–December 2027 | Multiple engineering/math/science packages with truthful visual subsets |
| Professional beta and v1.0 | Q4 2027–Q1 2028, high-tail Q2 2028 | Polished, stable, tested offline native application, not universal arbitrary TeX reverse compilation |

**Scenario ranges:** optimistic 6–9 months if physical target hosts and reviewers are continuously available and feature scope is limited to 4–6 high-priority adapters; central 9–15 months for broad useful library support; pessimistic 15–24 months for difficult semantic/macros/3D edge cases, slow physical acceptance or many subject adapters. Finite ETA for 100% visual support of every third-party package is not meaningful.

## Persistent engineering model

- A: XeLaTeX build/diagnostics/project dependencies/engine safety.
- B: egui/GUI, exact PDF preview, font/theme usability, native OS QA.
- C: lossless source representation + geometry DAG (new role after extension registry); subject adapters split into library owners as SDK matures.
- D: CI, R4 provenance, regression corpora, 3 hosted OSes, real Win10 and M1/M4 manual smoke.
- Integrator: SHA leases, PR conflict resolution, release acceptance, plans/insights synchronization.

Each bounded workpack must include code, tests, plan, evidence insight, and reproducible Git SHA. Hosted Windows Server is **CI_ONLY**; hosted ARM macOS builds do not prove user's physical M1/M4 GUI. Do not claim completion from a pass in the wrong OS, release profile or external TeX revision.

## Forecast risks

1. **Largest technical risk:** arbitrary macro input has no universal invertible model. Treat opaque constructs as source-first; use source-span-safe patches and explicit no-edit zones.
2. **Exactness:** Rust scene geometries need reconciliation against real XeLaTeX PDF/font metrics; avoid declaring internal GUI projection authoritative.
3. **Fonts/IME:** figure text and math fonts independent of GUI theme; check PDF glyph extraction and font embedding on each OS.
4. **Plugin security:** maintain TeX package/adapter/executable plugin separation; avoid loading arbitrary DLL/dylib for early releases.
5. **External package changes:** PGF/TikZ 3.1.12 (2026) changes behavior and dimensions; pin environment and use semantic/geometry PDF checks rather than universal pixel identity.
6. **Test environment:** current hourly automations and hosted runners are not real desktop access. Provide self-hosted Win10 + physical Mac smoke or a reproducible user-assisted protocol before releases.
7. **Corpus:** prior R4 135 examples / 18 semantic cases / 4 known warnings require verified provenance/licenses, versioned acceptance, not blind copy to public repository.

## Decision checkpoints

- End S0: choose accepted pre-alpha v0.1 and physical GUI evidence.
- End S1: stop and evaluate lossless CST and span-edit reversibility; if failing, narrow the editable grammar before proceeding.
- End S2: physical UX review of editing common figures; prioritize ergonomics and correctness over more libraries.
- End S4: establish SDK compatibility and choose extension ABI; don't enable WASM in an unreviewed host.
- Each domain adapter: compile/inspect/edit statuses and acceptance evidence.
- Before v1.0: independent full CI + real target host sign-off and reproducible artifact/bundle manifest.

See corresponding throughput record in \`insights/2026-10-31_DELIVERY_VELOCITY_BENCHMARK.md\`.
