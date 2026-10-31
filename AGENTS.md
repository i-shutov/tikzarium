# TikZarium engineering instructions

## Owner decision, 2026-10-31 — overrides the earlier CAD roadmap

TikZarium is a **TikZ-native visual authoring editor**, not Photoshop/Corel, a general-purpose CAD engine or a replacement for TeX. Tools create/edit ordinary TikZ/PGF and selected-library commands; the installed XeLaTeX performs typesetting, expression evaluation and final rendering.

1. **Targets/prerequisites:** Rust + egui; Windows 10 x64 with independently installed **MiKTeX/XeLaTeX**; macOS ARM64 M1/M4 with external user-installed XeLaTeX. Do not bundle TeX, silently install packages or substitute compilers. Distinguish MiKTeX from TeX Live in tests.
2. **Code visible:** normal drawing mode keeps the editable TikZ source beside the canvas. A tool action immediately reveals/highlights its command. Source/Canvas-only focus views are explicit user choices, not the standard authoring workflow.
3. **Help is core:** toolbar, property inspector, completion and F1/hover use one versioned catalogue. Explain syntax, type/units/allowed values, verified default or UNKNOWN, effect, example, package/library, version and manual section. Russian explanations, original TikZ names; no invented defaults or bulk copying of manuals.
4. **Library states:** distinguish installed, project-loaded, engine-compatible, tool-implemented and help-available. UNKNOWN is valid for macro-dependent imports. Missing adapters do not block source compilation. Lua-only code is not advertised as XeLaTeX-native.
5. **Source authority:** keep ordinary .tex/.tikz. Use revision-checked minimal source patches and undo; preserve comments/macros/styles/unrelated bytes. Do not regenerate an arbitrary full document or force it through a proprietary scene model.
6. **No unnecessary interpreter:** targeted lexical recognition, a small authored-command model and coordinate handles are allowed. Full TeX parsing/CST, macro expansion, CAS, universal geometry DAG/solver and PDF-to-source inversion are NOT prerequisites for the first drawing tool.
7. **Rendering:** XeLaTeX PDF is authoritative. Mark interaction overlays as provisional. Never claim accurate pointer mapping in unsupported transformed/opaque scopes. Preserve TeX expressions instead of replacing them with Rust approximations.
8. **Preamble:** adding `\usepackage` or `\usetikzlibrary` is a visible undoable source edit, not package installation or modification of global MiKTeX settings.
9. **Fonts/themes:** figure fontspec/unicode-math choices are independent of GUI themes/fonts. Verify actual glyphs/embedding, not only exit zero. Do not redistribute user font files.
10. **Build safety:** direct process invocation, shell escape off by default, cancellation, bounded logs/workers and last-good/stale preview. Prevent hidden MiKTeX package downloads in offline mode with verified distribution-specific options; no claim of a full OS sandbox. External XeLaTeX/PDF utilities are prerequisites, not cloud services.
11. **Ownership:** A core/CLI/MiKTeX; B egui interaction/code/help UI; C shared command/generator/help catalogue; D fixtures/CI/independent acceptance; integrator coordinates contracts. Read main/PRs before editing; separate branches and exact-head leases. Ship code, tests, plans/, insights/ together in meaningful user-facing blocks, not endless defensive micro-PRs.
12. **Evidence:** exact-SHA hosted CI is not physical Win10/MiKTeX or M1/M4 GUI acceptance. Keep implemented/CI/manual/NOT_RUN distinct. Dispatching a scheduled task is not completed subagent work. Do not derive calendar promises from initial PR lead times. Keep R4 provenance and known warning exceptions explicit.

The old S0–S7 calendar projection in PR #32 is withdrawn. Current requirements: docs/PRODUCT_SPEC.md, docs/ARCHITECTURE.md, docs/ROADMAP.md and plans/2026-10-31_FULL_SCOPE_ROADMAP.md. Historical insights remain evidence, not overriding product requirements.
