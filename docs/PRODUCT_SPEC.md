# TikZarium — Product Requirements (v0.2 planning, 2026-10-31)

## 1. Audience and objective

A local professional workbench for scientific illustrations, mathematical constructions, technical diagrams, publication-quality TikZ, advanced PGF/PGFPlots and third-party TikZ-related TeX packages. It should feel like a graphical design/CAD application rather than a generic TeX IDE. Primary use: original figures, diagrams and publication art for LaTeX documents.

## 2. Non-negotiable decisions

- Primary and default engine: **XeLaTeX**; no silent fallback to LuaLaTeX, PDFLaTeX or a native Rust approximation.
- Primary platforms: **Windows 10 22H2 x64** and **macOS ARM64** on both M1 and newer Apple Silicon. Mac minimum OS is provisional, to be confirmed by real device tests.
- Native desktop application on Rust using `eframe/egui`; no browser or remote service required.
- The editable source remains ordinary `.tex`/`.tikz` and is the source of truth.
- All source-backed builds can use the full installed **XeLaTeX-compatible** package ecosystem; visual support expands release by release.
- Third-party TeX packages and user macros are not to be rewritten merely to fit an internal object model.

## 3. Primary use cases

1. Open an existing full LaTeX document or standalone TikZ figure, compile under its selected XeLaTeX project profile and see an exact preview.
2. Write/edit source with syntax support, searchable package/key documentation, navigation from errors to source and stable build logs.
3. Create and transform lines, Bezier curves, shapes, nodes, labels, arrows and connectors visually while seeing generated TikZ code.
4. Express mathematical relationships (midpoints, intersections, perpendiculars, named parameters, dependent vertices) and modify them without invalidating the construction.
5. Use PGFPlots, circuitikz, tikz-cd, tkz-euclide, graphs/petri, positioning, decorations, backgrounds, 3d and domain packages through installable capability descriptions and optional visual adapters.
6. Export PDF first and other formats only through verified, explicit pipelines; retain text/vector quality and crop/bounding boxes.
7. Work entirely offline on both primary desktops.

## 4. UX and ergonomics

- Workspace modes: **Source**, **Split**, **Canvas**. Multiple tabs, restore session, recent files and configurable layout.
- Canvas: zoom/pan, ruler, grid, snapping, selection, layers/scopes, precise coordinate inputs, keyboard nudging, alignment, snapping guides, high-DPI rendering.
- Panels: object tree, properties, library explorer, build diagnostics, command palette, source editor, exact preview.
- Dense ergonomics: important workflows visible at 1366x768 with useful panel sizes; dark/light themes; legible mathematical glyphs and Cyrillic.
- Direct manipulation must show whether the canvas is an approximate interactive overlay or the **exact, XeLaTeX-generated PDF**; never confuse the two.
- Editing familiar code must avoid massive formatting churn and preserve comments/macros.

## 5. Out-of-scope in Core

- Full Rust reimplementation of TeX, PGF, TikZ or every installed macro.
- Claiming that arbitrary custom macros can be reverse-mapped into draggable objects.
- Cloud collaboration, account system, AI-required features.
- Built-in circuit simulation, CAS proving, chemistry validation or complete 3D CAD.
- Automatically installing TeX packages, executing shell commands or changing the compiler without informed user consent.
- A universally supported native dynamic-library plugin ABI in the initial release.

## 6. Mandatory application contracts

**Editable document.** Source bytes plus encoding, line endings, document/project roots, preamble and included resources are preserved. A document may have non-editable rendered sections but must remain text-editable.

**Build.** One selected local XeLaTeX executable, explicit build arguments, no shell escape by default, recorder-enabled dependency reporting, bounded job controls, cancellability, source-linked errors and readable command/log history.

**Packages.** Discovery via `kpsewhich`, `texdoc`, TeX package/version inventory and load diagnostics. Missing, incompatible and unverified statuses are distinct.

**Visual actions.** A visual action is allowed only if the owning adapter returns a source-range patch with validity requirements. On mismatch, refuse the patch or ask the user to choose source editing; never regenerate the whole document without authorization.

**Offline privacy.** No telemetry or outbound access required to edit/render; package management remains external and optional.

## 7. Measurable nonfunctional targets (aspirational until benchmarked)

- UI remains responsive during long XeLaTeX builds; cancel and close must work.
- Editor starts without TeX installed and clearly explains what functionality is unavailable.
- Typical canvas interactions target smooth rendering at 60 FPS on ordinary 1366x768 systems; heavy exact-PDF compilation is asynchronous.
- A build failure leaves the last successful preview visible and marked stale.
- Undo/redo restores both source text and model-specific edits deterministically.
- Reproducibility manifest records actual exe path, XeTeX version, PGF/PGFPlots versions where discoverable, package hashes, inputs and build arguments.
- All published version claims are backed by CI and manual acceptance evidence.

## 8. Compatibility promise

“Full extension support” means **access to every installed XeLaTeX-compatible TeX package through the canonical build pipeline**, not instant GUI object editing. Some libraries require other engines or external helpers; those are recorded explicitly with explanations and optional future adapters. Never mark an untested package as supported or silently degrade its meaning.
