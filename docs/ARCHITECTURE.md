# Architecture — TikZarium Multi-Engine Scientific Studio

Date: 2026-11-11. **Target architecture, not implemented capability.** The new owner direction is authoritative in [AGENTS](../AGENTS.md); delivery order is in [ROADMAP](ROADMAP.md). This document proposes engineering contracts derived from the supplied concept. It does not claim upstream API/version/licence verification.

## 1. Keep the working base; generalise responsibilities

The existing Rust/egui app, core, CLI and extensions catalogue remain the implementation base. XeLaTeX build/diagnostics/fonts and source-preserving TikZ authoring are retained behind explicit adapters. Introduce modules first; create a separate crate only when a tested boundary justifies it. A successful adapter must run through the actual Studio, not only a CLI stub.

Target responsibilities:

- Studio shell: project/document navigation, source/preview split, contextual tools, docks, palettes, keyboard/focus, preferences.
- Project/document service: ordinary native sources, explicit root/working directory, dependencies, per-document revisions, dirty state, transactional save/close/recovery.
- Engine registry and build scheduler: explicit profiles, discovery/requirements, run/cancel, resource limits, structured diagnostics, artifacts and provenance.
- Language/domain adapters: supported-object recognition, source mapping, minimal edits, help and operation-level capabilities.
- Preview/export service: reviewed PDF/SVG/raster/media paths; current/stale/failed state and file/version provenance.
- Data/publication service: immutable input references, transformations with recorded parameters, figure composition and export profiles.

No universal graphics AST is the authoritative document. A derived common interface can expose selection IDs, bounding boxes, property schemas and operations; opaque unsupported content stays in its native source.

## 2. Document and project contracts

A DocumentId identifies one native source and format, not an assumed .tex buffer. Each document keeps an in-memory revision, saved revision, path/encoding/EOL facts, view state and its own edit history. Project metadata names figures, sources, assets/data and render profiles; it is additive and must not rewrite original files on import.

Save/Open/tab switch and external modification are revision checked. A generated edit carries expected revision, exact source range/value and inverse operation. Mixed native text/visual Undo has a single explicit transaction policy; stale derived handles cannot revive an old buffer. No-op operations preserve bytes; unsupported format-wide reserialisation is not silently substituted for a minimal edit.

A project supports many figures but keeps one explicitly active document per editor. A publication document references figure artifacts and source identities plus layout properties. Its own revision advances independently. Dependency invalidation travels from source/data to figure output to publication output. Cycles, missing resources and outside-root references must be diagnosed rather than guessed. Filesystem/symlink safety is an explicit implementation/test concern.

## 3. Proposed engine boundary

The following are design contracts, not already-existing Rust APIs:

| Contract | Required information |
| --- | --- |
| EngineDescriptor | Stable ID, native input kinds, executable/runtime, version probe, supported platforms and licences pending/verified |
| EngineCapabilities | Output formats, cancellation, diagnostics/source-map precision, optional interactivity, L3/L4 operation scopes |
| RenderProfile | Engine + validated arguments, working root, inputs/dependencies, output policy, environment fingerprint and trust decision |
| BuildRequest | Project/document ID, revision set, dependency hashes, requested format, purpose and cancellation token |
| BuildResult | Exit facts, diagnostics, bounded logs, artifacts, provenance, dependency observations and limitations |
| Artifact | Kind, source/dependency identity, engine/version/options, path/hash, dimensions, audit result, current/stale/last-good |

Selection by file extension is a suggestion, not permission to run code or switch engine. Fragment/preamble wrapping is explicit. External XeLaTeX is migrated through this interface first, with before/after regressions. Then Graphviz is the first proposed non-TeX vertical slice; D2/Mermaid follow the same public boundary. This ordering is an engineering plan, not a claim of measured implementation cost.

## 4. Build lifecycle and trust

Use typed lifecycle states: queued, preparing, running, cancelling, succeeded, failed, cancelled; distinguish document dirty and artifact stale from process state. A finite scheduler bounds global and per-engine concurrency. A result applies only to the captured revision/dependency snapshot; an older job never overwrites a newer accepted preview. Cancelling stops the supported child process tree and cleans only owned temporary outputs.

Cache keys include native source, dependencies, options, engine/runtime version and relevant fonts/resources. Record non-deterministic inputs (seed/time/network) or mark the result non-reproducible. Timestamp-bearing output need not be byte identical unless the specific engine profile promises it; compare normalised semantic/render invariants with declared rules, while preserving originals.

Direct argv invocation; no silent shell, network or package-install fallback. Opening a project does not execute Python, Manim or other code. User-selected live preview may debounce trusted document changes, cancel superseded requests and never override trust controls. Existing Administrator/HIGH support remains for trusted sources with visible warnings; it is not isolation. Enforced OS sandboxing, network denial and resource limits require their own platform proof. Unknown capabilities are displayed honestly.

User-provided Kroki endpoints are optional adapters. They do not replace local engines and cannot receive private source/data without explicit opt-in. Embedded web surfaces require a specific feasibility/security/UI acceptance, including offline resources; no app-wide migration is assumed.

## 5. Visual and domain adapters

Each adapter states the exact constructs it recognises and the operations it can patch. Properties carry native syntax, type, units, provenance/default status, validation and required packages. The same catalogue feeds tools, Inspector, completion and F1. Engine defaults are not editor presets.

A renderer is not a visual editor. ME-L1/L2 cover source/render workflows; ME-L3 is bounded property editing; ME-L4 requires reverse mapping and round-trip tests for the supported subset. Unsupported transformations/macros remain source-first. Imported SVG/PDF is not automatically a reconstructed TikZ scene. Unknown fields/comments are retained; raw input is always recoverable.

PGFPlots SC3 and AT4 share one implementation; SCI142 and AI88 retain separate acceptance. The 85 XeLaTeX and three LuaLaTeX AI88 examples require explicit engine configuration, never a hidden fallback. Other domain adapters reuse project/build/preview contracts, not a second package registry.

## 6. Preview, publication and data

Treat PDF/SVG/PNG as artifact formats, not interchangeable engine languages. Disable active content/external fetches in the chosen SVG preview route unless explicitly permitted; bound decoding and media size. Export availability follows verified engine/format capabilities. Figure fontspec/unicode-math/font configuration is independent of GUI themes; font files are never redistributed implicitly.

Data Figure stores original dataset identity, column mapping, units, transformations, plot specification and source. Changing source measurements through a plotting inspector is prohibited; derived data is separate and traceable. Uncertainty/error bars and numerical relationships require domain tests, not screenshot resemblance.

Publication stores layout and references: physical units, bounding boxes, alignment, panel labels, typography and output preset. Rendering a composite consumes child artifacts and preserves links back to native sources. Mixed-engine publication is a release scenario; deleting the editable inputs after flattening is not acceptable. Exact composite format/renderer must be chosen by a tested ADR, not invented as already decided.

## 7. UI shell and performance

Reuse Rust/egui with a central design-token layer and four themes. Project Explorer, document tabs, tool rail, editable source, preview, context dock, diagnostics and job status share one action/state contract. The selected document controls commands and capability presentation. Essential six TikZ tools remain one-click; field grouping and one Apply remain mandatory.

Avoid layout changes that destroy focus, selected objects, pending drafts or IME composition. Preserve visual/source integrity while solving the existing large-document memory/latency issue. Incremental parsing/layout is derived, bounded work; do not keep unbounded full-document meshes merely to make idle frames fast. Measure native input-to-frame separately from CPU harness timings.

## 8. Qualification and migration

Windows 10 Pro is the main native user environment; existing Server 2025 is a separate integration and GUI gate. Keep macOS ARM M1/M4 and Linux compatibility/CI; qualify native binaries independently. Do not alter UAC/accounts/RDP/system MiKTeX/FlowBridge to make tests appear successful.

Stage migration: extracted build contract → existing TikZ regressions → new engine in actual Studio → multi-document/cancellation/stale tests → data/composition → selected domain edits. Preserve old .tex/.tikz compatibility, preferences with safe defaults, immutable evidence and rollback. Every shipped engine/version/platform has originals, source integrity, diagnostics, visual and applicable scientific checks. No stable tag or release follows merely from the strategy change.

The original implementation-oriented architecture is preserved in [the pre-Studio snapshot](https://github.com/i-shutov/tikzarium/blob/19187fc17968659267540fe279702bf77eeb77e6/docs/ARCHITECTURE.md). Existing source/runtime safeguards remain; this target architecture broadens the product rather than declaring a completed rewrite.
