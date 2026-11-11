# Architecture — TikZarium Multi-Engine Scientific Studio

Date: 2026-11-11, revision SCIENCE_FIRST_DATA_LAST. **Target architecture, not implemented capability.** Read [AGENTS](../AGENTS.md), [ROADMAP](ROADMAP.md) and [current execution plan](../plans/2026-11-11_STUDIO_REBASE.md). Delivery order is now scientific graphics → UML → BPMN → engineering → chemistry/biology → animation → other extensions → data LAST. The earlier PR #173 Graphviz-first and early-data migration order is superseded.

## 1. Existing base, minimal enabling foundations

Retain Rust/egui, core/app/CLI/extensions, the working XeLaTeX build/diagnostics/fonts and source-preserving TikZ authoring. Introduce tested modules before new crates. Build only the shared abstractions needed by the current scientific vertical, without forcing a universal platform, graph engines, full compositor or data service ahead of it.

Target responsibilities:

- Studio shell: scientific project/document navigation, source/preview split, tools, docks, properties, help, keyboard/focus and four-theme design system; later domain profiles use the same shell.
- Project/document service: ordinary native sources, working root/resources, per-document revision/dirty/history/view state, transactional save/close/recovery.
- Engine registry/build scheduler: explicit profiles/discovery/requirements, run/cancel, resource bounds, diagnostics, artifacts/provenance; first exercised with XeLaTeX and scientific engines.
- Language/domain adapters: supported recognition, source mapping, minimal patches, semantic validation, catalogue/help and operation-level capabilities.
- Preview/export: reviewed PDF/SVG/raster and later media routes, current/stale/error and verified dimensions/fonts/source identity.
- Linked publication service: full composition in ST-OTHER, not a prerequisite for correct scientific output or required existing corpus layouts.
- Data service: new import/mapping/transformation/statistics/Data Figure ONLY in ST-DATA; native resource/dependency handling is available earlier and stays separate.

A shared API does not make a universal graphics AST authoritative. Derived selection IDs, bounding boxes, properties and operations are allowed only where mapped safely to native source. Unknown constructs stay editable and cannot be regenerated through an invented common language.

## 2. Document/project/source contracts

DocumentId identifies a native source, not an assumed .tex buffer. Keep revision, saved revision, native format/path/encoding/EOL facts, view/caret/selection and edit history per document. Project metadata is additive: figures, source identities, explicit profiles/assets/dependencies. No-op import/save must not rewrite original files.

Save/Open/tab switch and external edits are revision checked. A visual operation carries expected revision, exact range/value and inverse action. Mixed text/visual Undo has one explicit transaction policy; stale handles cannot restore an old snapshot over new input. Unsupported format-wide reserialisation is not silently substituted for a minimal patch. Pending drafts and IME focus survive lawful context changes.

Projects may contain many figures while each editor has an active document. Resource references can include existing .dat/.csv files needed for PGFPlots/SCI142/AI88; keep bytes/hashes and invalidation. This is not a data-import or analysis UI. Full publication documents later reference source/artifact identities and independent layout revisions. Cycles, missing files, outside-root paths and symlink behaviour require explicit safety tests.

## 3. Engine boundary and scientific-first migration

These are proposed contracts, not already-existing public APIs:

| Contract | Required information |
| --- | --- |
| EngineDescriptor | Stable ID, native inputs, executable/runtime, version probe, platform/licence verification status |
| EngineCapabilities | Actual output formats, cancellation, diagnostic/source-map precision, L3/L4 operation subsets |
| RenderProfile | Explicit engine/validated argv, root/working directory, dependencies/output policy, environment fingerprint/trust |
| BuildRequest | Project/document IDs and captured revisions, dependency hashes, format/purpose/cancellation token |
| BuildResult | Exit facts, bounded logs, diagnostics, artifacts, observed dependencies, limitations |
| Artifact | Format, source/dependency/options/version identity, hash/path/dimensions/audit, current/stale/last-good |

Migration order: preserve existing XeLaTeX positives/negatives under the interface → scientific TikZ/PGFPlots editing → **Asymptote** as the first proposed additional scientific profile → Typst/CeTZ. Scoped Penrose mathematical semantics is evaluated within scientific work, not a universal solver prerequisite. New upstream facts require primary-source verification before delivery.

**Graphviz is no longer the mandatory first non-TeX backend.** Graphviz/D2/Mermaid are later scoped domain implementations or documented essential dependencies, not general product gates before science. UML/BPMN then get their own source/semantic contracts. Extensions are chosen by current domain operations; architecture convenience must not reverse the owner's priority.

File extension suggests a profile but does not authorise execution or engine switching. Fragment/preamble wrapping, LuaLaTeX and other engine choices are explicit. AI88's 85 XeLaTeX and cases65/68/86 LuaLaTeX retain separate tests, no silent fallback.

## 4. Build lifecycle, cache and trust

Typed states: queued/preparing/running/cancelling/succeeded/failed/cancelled, distinct from document dirty and artifact stale. Bound global/per-engine concurrency. Apply results only to the captured revision/dependency snapshot; a slower old job never overwrites a newer preview. Cancel the supported child-process tree and clean only owned temporary paths.

Cache source/dependencies/options/runtime version/fonts/resources and record seeds/time/network or declare non-reproducibility. Byte-identical output is required only where the profile promises it; otherwise use explicit normalised semantic/render invariants and retain originals. UI styling changes must preserve native source bytes and figure semantics.

Invoke direct argv, no implicit shell/network/package install. Opening a project does not execute Python, Manim or scripts. Opt-in live preview respects trust and cancels superseded requests. Existing Administrator/HIGH is supported with warning for trusted sources, not called isolation. Timeouts/no-shell-escape are not OS sandboxing. Network denial and resource isolation must be truly enforced and tested before claiming them.

Optional user-selected Kroki/gateways are ST-OTHER; local engines stay usable. Any remote operation names the endpoint and content and requires opt-in. Embedded web components require isolated feasibility/security/offline/native-focus acceptance; no app-wide web rewrite or mandatory cloud. Do not alter UAC/users/RDP/system MiKTeX/fonts/drivers/FlowBridge.

## 5. Adapter and semantic boundaries

The versioned catalogue serves Toolbox/Inspector/completion/F1 with native syntax, type/units, validation, documented default versus editor preset, dependencies and provenance. Every adapter lists constructs and safe operations. ME-L1/L2 source/render, ME-L3 property edits and ME-L4 round-trip subsets remain distinct; OPAQUE is not accepted visual support.

UML is a dedicated stage with diagram-kind and relation/element semantics, not a renamed generic graph. PlantUML/TikZ profiles are candidates; other renderers need explicit supported-subset proof. BPMN is the next distinct stage, before engineering: preserve native model IDs/unknown extensions and diagram representation, validate declared constructs, and test save/reopen/Undo. bpmn-js integration is a candidate, not a fact already established. Modelling does not imply process execution.

Engineering, chemistry/biology and animation use independent semantic fixtures. Layout/geometry alone cannot prove circuit connectivity, chemical relationships or biological meaning. Animation timeline actions map only to supported scene/source subsets, not arbitrary Python decompilation. Static scientific 3D belongs to ST-SCI; time-based scenes to ST-ANIM.

PGFPlots SC3/AT4 is one mandatory scientific adapter for two separate corpus ledgers. Preserve compat, expressions, resources, raw data and unknown macros. Mathematical/static plots and existing table inputs remain early; new dataset tools and data-engine product integrations stay last.

## 6. Preview, publication and last-stage data

PDF/SVG/PNG are artifact formats, not equivalent source languages. Verify preview/export pipelines, bound decoding/media size, disable SVG active content/remote fetch unless explicitly authorised. Figure fontspec/unicode-math/runtime fonts remain separate from GUI typography; user font binaries are not redistributed. Export eligibility follows currentness and actually verified capabilities.

Scientific export, physical dimensions, formula/Unicode/font audit and existing multi-panel corpus cases are accepted early. The general linked Publication Studio comes in ST-OTHER: source/artifact references, physical-unit layout/alignment/panel labels/styles, child invalidation, project portability. Flattening output must not delete native inputs. Choose composite format/renderer by a tested ADR.

**Data service is deferred to ST-DATA, after animation AND the bounded ST-OTHER scope.** Dataset identity, column mapping, units/transforms/statistics, derived results and plotting specification are late product functionality. Preserve original measurements; later transformations produce separately traceable outputs. Reusing a source dataset as a read-only scientific dependency earlier does not activate this service.

## 7. UI quality and performance

Shared design tokens/four themes, scientific workspace, project tabs, direct tools, editable source, preview/context dock, one Apply, one F1 and diagnostics share an action/state contract. Extend by domains in the owner's order; do not fill the first UI with empty Data/Animation/BPMN placeholders.

Verify all real states, compact windows and physical DPI, visible focus and accessibility roles. Preserve cursor/selection/draft/IME across layout changes. G3 requires bounded layout memory and measured native 10k/1MiB p95<=50ms/first edit<=2s plus 100k/10MiB stress without input loss; CPU-only experiments are separate. Quick idle frames do not justify full-document mesh retention or slow changed frames.

## 8. Qualification and phased migration

Windows 10 Pro is the primary user desktop; Server 2025 is a separate native integration/GUI environment. macOS ARM M1/M4 and Linux remain architecture/CI targets with independent native qualification. Hosted Windows2022/Linux Xvfb do not prove Win10/Server2025/DPI/IME. Readiness requires an actually available channel, not an old comment.

Current path: reviewed UX2 scientific shell + editor/G3 + minimal document/build contracts → existing TikZ/PGFPlots/scientific corpus operations → Asymptote/Typst profiles → independent scientific acceptance → UML → BPMN → engineering → chemistry/biology → animation → other → data. Publication/data are not gates before the first scientific result. QA/packaging/recovery recur in every scoped release and in final consolidation, not a competing subject stage.

Retain old native documents, additive preference defaults/rollback, immutable originals and separate SCI142/AI88 ledgers. Every shipped operation/version/platform needs real source/diagnostic/visual/domain proof, W0–W4 where applicable, 96/120/192 DPI and IME. No stable tag, version bump or new PASS follows from this documentation edit.

History: [architecture before priority correction](https://github.com/i-shutov/tikzarium/blob/a2a6c79ee14c58282da8a4a1106392faf9643029/docs/ARCHITECTURE.md), [pre-Studio architecture](https://github.com/i-shutov/tikzarium/blob/19187fc17968659267540fe279702bf77eeb77e6/docs/ARCHITECTURE.md). Shared responsibilities and safeguards are retained; the previous Graphviz-first/data-before-domain sequence is not current guidance.
