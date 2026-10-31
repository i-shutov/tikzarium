# Full-scope execution plan — TikZ-native tools, code and explanations

Owner correction recorded 2026-10-31. The initial S0–S7 CAD/solver-oriented version of this file and its calendar windows are superseded. Do not merge or execute that historical plan as the current specification.

## Non-negotiable deliverable

A native Rust/egui visual editor of TikZ/PGF constructions, within the capabilities of the selected packages. The code remains visible and editable beside the drawing. Commands and parameters have contextual Russian explanations. TeX is an external dependency, not code being rewritten by this project. Windows 10 x64 uses independently installed MiKTeX/XeLaTeX; Mac ARM64 M1/M4 uses the user's external XeLaTeX.

## Current accepted direction

Use the existing source workbench, process service, PDF preview, fonts/themes and tests. Do not discard them. Stop making a universal CST, geometry DAG, CAS/solver or PDF inversion a prerequisite for drawing the first primitive. Local command models, literal coordinate handles, bounded recognition and revision-checked source edits are sufficient for a scoped initial tool.

## N1 — first complete authoring block (A+B+C+D)

| Owner | Actual implementation target | Independent evidence |
| --- | --- | --- |
| A | MiKTeX doctor/build and external runtime profile; missing package/font diagnosis; no hidden install/download | Exact executable/version/args; real MiKTeX-generated PDF; separate Windows Server versus physical Win10 evidence |
| C | Shared schema and generator for line, arrow, rectangle, circle, text/math node and cubic Bézier; native TikZ syntax and library metadata | Literal generation tests; unchanged unrelated source; compilation of generated examples; verified help fields |
| B | Coordinate gestures and controls, continuously visible code pane, properties and help/F1/hover; select/highlight generated source, undo | Create/edit/save/reopen/undo each tool; exact XeLaTeX result; actual GUI interaction distinguished from snippet copying |
| D | Validate generated sources and core workflow; MiKTeX-specific Windows CI plus macOS external XeLaTeX; source/hash/glyph/help checks | Reproducible tests and artifacts; no inference from a TeX Live-only run or green mocks |

C owns the command contract; B consumes it rather than creating another schema. A owns process/compiler behavior, D owns tests. The integrator resolves shared API changes and uses exact SHA leases. Each lane first checks current branches, then makes one substantial vertical PR with code, tests, plan and insight.

## N2–N5 — functional growth

N2: connect libraries through an explicit undoable preamble patch; enrich tools with positioning, calc, arrows.meta, fit and shapes. Distinguish installed, project-loaded, engine-compatible, implemented-tool and help-available; UNKNOWN is valid for macro-dependent activation.

N3: deepen searchable offline assistance and completion, driven by the same command catalogue. Exposed controls require syntax, type/units/allowed values, source-verified default or UNKNOWN, effect, example, requirements and manual section. Editor presets are not represented as upstream defaults.

N4: native tools for PGFPlots, CircuitikZ and tikz-cd first, then other requested scientific packages. Do not copy their layout/math implementations into Rust. Dependencies, templates, available properties, code generation and explanation are adapter responsibilities.

N5: compact desktop/Retina usability, theme/font invariance, recovery, projects, renderer deployment, exports, R4 corpus integration and native acceptance. Keep useful implementation moving while target-machine testing is pending; never label untested hosts PASS.

## Source and exactness contract

New drawings insert normal TikZ commands. Safe edits target known source ranges with revision checks and undo; no wholesale normalization of arbitrary user TeX. Unknown macros stay in source and can compile normally. Parameterized TeX expressions are passed through, not numerically replaced by a new solver. Handles/drag previews may be provisional; the XeLaTeX PDF remains exact. Unsupported transformed scopes must not receive guessed pointer-to-source coordinates.

## Acceptance checklist for every primitive or adapter

- [ ] Real creation/edit action, not only a code-copy button.
- [ ] Generated ordinary TikZ source visible immediately beside the drawing.
- [ ] Useful parameter explanation and valid minimal example, source/version identified.
- [ ] Required package/library states shown correctly, missing/unknown states honest.
- [ ] Actual external XeLaTeX build and PDF/font check, no implicit engine substitution.
- [ ] Save/reopen, undo and preservation of unrelated comments/macros.
- [ ] Applicable hosted and physical-target statuses separately recorded.

These boxes are planned gates, not claims that N1 has already been implemented. The four existing autonomous engineering tasks were updated and immediate runs requested; task dispatch is not proof of finished work.
