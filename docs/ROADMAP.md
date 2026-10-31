# Incremental development roadmap (2026-10-31)

## Strategy

Shipping is **Core → reliable XeLaTeX workbench → visual editing → semantic geometry → extensible adapters → professional beta → 1.0**. Do not delay all releases while attempting to replicate every TikZ/PGF internal in Rust.

Each release requires compilable Windows/macOS artifacts, tested user journeys, provenance to commit SHA, documented known limits and a verified checkpoint. A release without both platform checks is not accepted.

## M0 — Bootstrap / requirements / engineering baseline

**Deliver:** Rust workspace scaffold, ADRs, architecture boundaries, command/event pattern, lint/test/rustfmt setup, sample project profiles, CI skeleton, inventory of R4 fixtures by license/provenance and PGF package catalogue.

**Exit:** `cargo fmt --check`, `cargo clippy`, unit tests on both cross-platform CI jobs; one minimal egui window launches locally on **Windows 10 x64** and **macOS ARM64**. No “GUI compiles in CI” substituted for actual smoke.

## v0.1 — XeLaTeX Workbench Core

**Vertical slice:** open existing `.tex`/`.tikz` → choose project/preamble → find XeLaTeX → compile → exact PDF preview → navigate error log → edit source → rerun → save/export.

**Deliver:** robust project roots; XeLaTeX path/config/version discovery; build process/cancellation; last-good PDF; dependency recorder; PDF preview; editor with syntax and basic navigation; basic release artifacts.

**Exit:** ordinary full documents, standalone figures and multifile projects survive round-trip; Unicode/Cyrillic/fontspec smoke; compile failures leave last-good view; no shell escape by default; works offline on both primary OSes.

## v0.2 — Visually editable TikZ Core

**Deliver:** path/node/edge/label/style/scope recognition, object tree, canvas selection, move/resize/rotate controls, anchors, snapping, undo/redo, reversible minimal source patches; explicit unsupported/opaque segments.

**Exit:** 30+ bounded visual round-trip fixtures; comments and unknown macros unchanged, repeated edits do not produce formatting churn; edit/undo restores original byte representation when expected.

## v0.3 — GeoGebra-style semantic geometry

**Deliver:** named points, segments, lines, circles, intersections, dependency DAG, formula/constraint evaluation, parameter sliders, incremental recomputation, geometry-aware pick/hit testing.

**Exit:** intersection degeneracies, directed dependencies, cycles and undo covered; modifying parents updates child geometry and conservative source expressions; all errors visible.

## v0.4 — Extension framework core

**Deliver:** manifest discovery/validation; library/feature statuses; built-in adapter registration; versioned serializable SDK; templates/snippets/inspector contributions; dependency warnings; conflicts and version handling.

**Exit:** ≥2 independently built adapters (one core, one subject-specific) register through one host contract; disabled adapter leaves documents unchanged; metadata-only packages work offline; no unsafe binary plugin loading.

## v0.5 — Scientific diagrams and PGFPlots

**Deliver:** PGFPlots axes/options/plots preview-aware tools, data import workflows, tick/legend inspector; supported transforms/decoration/style panels; reusable scientific templates.

**Exit:** valid source and exact XeLaTeX preview for verified PGFPlots fixtures; safe visual edit subset explicitly enumerated.

## v0.6 — Domain pack I

**Deliver:** graph/automata/petri adapters, circuitikz symbols/net connectors, tikz-cd grids/arrows and tkz-euclide geometry as appropriate for proven XeLaTeX compatibility.

**Exit:** graph semantics and source/preview synchronization verified; no false claims about simulation, commutativity proofs or Lua-only features.

## v0.7 — Advanced ecosystem and optional isolated plugins

**Deliver:** searchable extension catalogue for all inventoried installed packages; optional templates/styles for forest, quantikz, chemfig, other scientific packages; investigate WASM component plugins with capability sandbox and a concrete example.

**Exit:** an unknown third-party XeLaTeX package compiles without a visual adapter; extension errors cannot damage original source; WASM milestone ships only when isolated host passes security tests.

## v0.8 — Professional beta

**Deliver:** usability polish, workspace restore, batch build, diagnostics and object/search navigation, import/export UX, performance profiling and cache controls, documentation and installers.

**Exit:** five complete workflows on each target machine; R4 tests integrated with honest warning/visual verdicts; no P0/P1 blockers, known issues listed.

## v1.0 — Personal production release

**Deliver:** stable public app/adapter contract within the declared 1.x profile, offline dependable editor, versioned artifact bundles, source-preserving visuals, reliable documentation, recovery/backup, reproducible builds.

**Exit:** acceptance matrix fully signed off on Win10 and physical M1/M4; release notes per SHA; installer smoke, reopen, save, TeX compile, PDF export, error recovery, upgrade path and regression suite green or exceptions explicitly approved.

## Parallel work streams (single integrator)

| Stream | Deliverable | Depends on |
| --- | --- | --- |
| A: Build/XeLaTeX | Profiles, runner, logs, recorder, package inventory | M0 |
| B: UI/preview | egui panels, PDF canvas, keyboard and high-DPI | M0 |
| C: Source/model | lossless CST, patches, undo, geometry DAG | M0 |
| D: Extensions/fixtures | R4 registry, manifests, package compatibility matrix | M0 |

A and B can deliver v0.1 together; C supports v0.2/v0.3; D guards v0.4+. Independent streams work in branches/PRs with common contracts, one integration owner, full CI and no silent concurrent edits to the same file.

## First two engineering workpacks after approval

1. **W01:** Cargo workspace + egui window + XeLaTeX executable discovery and project profile CLI, two platform builds, 1-page minimal working figure exact PDF.
2. **W02:** source editor + compile cancellation/log parser + PDF preview + last-good/stale state; Windows 10 and Apple Silicon acceptance runs.

Avoid unreviewed plugin ABI decisions or huge parser work before the first cross-platform XeLaTeX vertical slice is functional.
