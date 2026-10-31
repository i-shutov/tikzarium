# Extension model and support catalogue

## 1. Two different kinds of extension

A **TeX package** is a TeX Live/MiKTeX package or installed PGF/TikZ library. Existing user projects may compile without any TikZarium-specific adapter. Its presence, queried through kpsewhich, proves neither successful compilation nor visual-edit support.

A **TikZarium adapter** adds syntax inspection, palettes, source-safe edit transactions, and optionally export workflows. It is not required for ordinary XeLaTeX source compilation. A declarative manifest is **data**, never executable native code.

## 2. Distinct compatibility dimensions

| Dimension | Available evidence | What it does NOT imply |
| --- | --- | --- |
| Installation | A named file was located by kpsewhich | Package version, compilation or functional correctness |
| XeLaTeX compilation | A real, recorded XeLaTeX fixture result | Source inspection or visual editing |
| Inspection | Tested grammar recognition on a source span | Permission to modify arbitrary source |
| Visual edit | Versioned adapter and byte-preserving round-trip tests | Complete PGF syntax support |
| Export | Verified output backend and restrictions | That an unrelated exporter also works |

The current Rust registry reports **Present / NotLocated / Unknown** for package discovery; **NotTested / IncompatibleEngine** for XeLaTeX compilation; inspection and visual editing remain false. Its W01-compatible installed and compilation_verified booleans are conservative aliases, not promotion mechanisms. The package panel should display Unknown as unknown, not as conclusively missing.

Neither the presence of kpsewhich nor a manifest mentioning a file constitutes a PASS. A package found on one TeX Live installation provides no platform-independent acceptance.

## 3. Versioned declarative schema v1

The manifest is UTF-8 TOML, at most 64 KiB, with a maximum of 128 manifests per directory. The **schema_version = 1** number versions this *metadata format*, not a binary ABI or a public visual-edit SDK.

~~~toml
schema_version = 1
id = "org.tikzarium.pgfplots"
display_name = "PGFPlots"
version = "0.1.0"
category = "Scientific plots"
engine = "xelatex"
requires_files = ["pgfplots.sty"]
visual_features = []
notes = "Metadata-only until a verified adapter exists."
~~~

Rules enforced by the crate:
- Unknown TOML keys, unsupported schema versions and malformed version triplets are rejected.
- IDs are lower-case dotted names. Duplicate IDs, duplicate or unsafe TeX filenames, parent traversal and path separators are rejected.
- TeX requirements are simple filenames with .sty/.cls/.tex/.def extensions, never arbitrary paths or shell arguments.
- Files in a selected directory load **atomically** in sorted order. A malformed file rolls back the whole directory load. Symlinks and non-regular .toml entries are rejected. The selected directory itself must be a real directory (a symlink or dangling symlink is rejected); a genuinely missing optional directory is accepted as empty. Other file types are ignored.
- Additional metadata cannot launch scripts, postprocessors, DLLs, dylibs, network requests or WASM.
- visual_features is forward-looking declarative metadata. It does not make a feature selectable or editable without a separately verified source adapter.

Only built-in manifests are enabled by Registry::new(); optional user directories must be explicitly loaded. No automatic execution or installation of third-party code occurs.

The directory check rejects a symlink at the **final directory component** but is not a race-free filesystem sandbox: symlinked ancestor directories and concurrent filesystem replacement require a platform-specific handle-relative API. Configure optional catalogue roots in a trusted, non-writable location; do not use untrusted concurrently mutated directories.

## 4. Initial built-in catalogue

| Feature/family | Manifest | Expected engine | Current verified support |
| --- | --- | --- | --- |
| PGF/TikZ core | core.toml | XeLaTeX | Discovery metadata only |
| PGFPlots | pgfplots.toml | XeLaTeX | Discovery metadata only |
| CircuitikZ | circuitikz.toml | XeLaTeX | Discovery metadata only |
| TikZ-CD | tikz-cd.toml | XeLaTeX | Discovery metadata only |
| Lua-based PGF graphdrawing algorithms | graphdrawing-lua.toml | LuaLaTeX | **Incompatible with native XeLaTeX engine** |

See [machine-readable package matrix](../extensions/PACKAGE_MATRIX.csv) for the broader PGF/TikZ feature backlog. All NOT_PROBED and NOT_TESTED entries remain so until platform- and version-specific evidence is recorded. This matrix is a catalogue, **not an allowlist**: arbitrary installed TeX packages need no manifest to compile as ordinary source.

Planned visually edited packages include core TikZ v0.2, geometry libraries v0.3, PGFPlots v0.5, circuitikz and tikz-cd v0.6, and specialized scientific packages v0.7+. This is a roadmap, not implementation evidence. Lua-driven graphdrawing, tkz-elements Lua operations, and external Graphviz/gnuplot/Asymptote pipelines require explicit alternate-engine or external-helper handling, not hidden XeLaTeX fallbacks.

## 5. Adapter lifecycle and plugin security

Local built-in adapters may ultimately register through an internal Rust trait. Before public SDK/ABI commitment, two independent adapters must demonstrate source ownership, snapshot revision checks, minimal-range patches, undo and round-trip QA. Disabled or unsupported features must leave source untouched.

For separately packaged extensions, use validated serialized contracts and explicit capability negotiation. Do **not** load arbitrary DLL/dylib plugins. WASM/WASI component-model execution is only an investigated future option after filesystem/network access controls, resource limits, version handshake and crash isolation pass security review. TeX -no-shell-escape is not a substitute for a trusted-document or OS sandbox policy.

## 6. Evidence and acceptance

For every actual compatibility verdict, record engine and exact version, package version, OS/architecture, fixture ID and source hash, full compile exit code, diagnostics, PDF artifact hash, optional visual review, and CI/manual test link. A build PASS cannot be synthesized by the registry's package lookup.

Windows 10 x64 physical acceptance and physical Apple Silicon macOS acceptance remain separate from hosted windows-2022/macOS CI. A successful TeX build proves **rendering**, not visual editability.

## 7. Existing research corpus (not yet imported)

R4 research set dated 2026-10-29: [Drive folder](https://drive.google.com/drive/folders/1wZ9CmzWz4OmrZzwDeWibve27O3REvImn) contains 135 active source→PDF builds, 158 rendered pages, and 18 semantic tests in its original environment. Previously reported 135/135 clean compilations and 131/135 strict-warning cases are historical reference evidence, **not** TikZarium tests. Preserve the four unresolved warning-gate defects O027, O028, O030 and O047. The historical inventory included 125 PGF/TikZ and 24 tikz-ext library files on one installation; it is not an exhaustive global package inventory.

Fixture import requires provenance/licensing checks. No historical alternate-render-engine result can establish XeLaTeX-native support.


## 8. Reproducible XeLaTeX smoke fixtures

Five minimal original TeX documents and a local Linux/macOS verification script live in [extensions/fixtures](../extensions/fixtures) and [extensions/qa](../extensions/qa). An observed Debian 13 x86_64 TeX Live 2025/dev local test compiled four XeLaTeX examples into one-page PDFs (core, PGFPlots, circuitikz, tikz-cd), and confirmed that Lua-driven graphdrawing fails with its explicit LuaTeX-required diagnostic. This is **fixture-level local evidence only**: not Windows 10/macOS acceptance or package-wide compatibility. The broader package matrix remains environment-agnostic and NOT_TESTED until per-environment evidence is aggregated.


## 9. C02 per-fixture evidence, not global package certification

The portable Python 3.11+ runner in extensions/qa/run_smoke.py executes only five fixed, original, repository-owned fixtures with XeLaTeX, no shell and no shell escape. It requires pdfinfo and verifies positive PDFs have exactly one page. Its outputs include the actual compiler version, OS/architecture, source/console/TeX-log/PDF SHA-256, exit code, elapsed time and source preservation. It writes versioned observation.toml for each fixture, preserves complete logs, and writes summary.json.

The Rust FixtureObservation::parse accepts only bounded, structurally consistent v1 TOML. Positive PDF observations require exit 0, unchanged source, a valid PDF hash, TeX-log hash and exactly one page. A graphdrawing-lua expected-error observation requires a nonzero XeLaTeX exit and no PDF. Unknown fields and contradictory outcomes are rejected. Neither TOML nor this runner is a signed attestation.

Importantly, storing or parsing evidence cannot mark ExtensionStatus.compilation_verified true or enable a visual adapter. A hosted Windows Server job is not Windows 10 acceptance; hosted macOS ARM compilation is not physical Mac GUI acceptance. The recorded Linux probe covers the five source fixtures only, not general PGF compatibility.

The C02 registry now prioritizes a definite missing file over another indeterminate lookup and rejects manifest filenames starting with a dash, preventing option-like arguments from reaching kpsewhich. The general-purpose kpsewhich caller in A-owned core needs a separate upstream safety review.


## 10. C03 artifact-integrity audit (still not package certification)

The C03 tool [extensions/qa/verify_smoke.py](../extensions/qa/verify_smoke.py) independently checks the *bytes* behind a C02 observation: the fixed fixture SHA-256 in the current source tree, captured console and TeX logs, positive PDF hash/signature/EOF plus \`pdfinfo\` page count, and the specific expected LuaTeX-only diagnostic for the negative graphdrawing probe. It reconciles the five observations with summary.json and rejects incomplete, contradictory, mixed-host and symlinked evidence by default. See the [QA runbook](../extensions/qa/README.md), [C03 plan](../plans/2026-10-31_C03_ARTIFACT_AUDIT.md), and [C03 insights](../insights/2026-10-31_C03_ARTIFACT_AUDIT_QA.md).

\`--allow-partial\` is explicitly *selected-only* auditing, never an accepted full five-fixture suite. A recorded \`runner_kind=hosted_ci\` is self-reported metadata, not an attested GitHub runner. Matching hashes also cannot prove the compiler really produced those bytes or identify the exact operating system. The auditor does not promote registry capabilities, authenticate machines, certify package versions, or prove visual edits. The PACKAGE_MATRIX.csv remains conservative until per-platform evidence has been reviewed, not merely parsed.

## I05 real package evidence integration

The fixed five-fixture C02 runner is followed by the independent C03 auditor in CI. An observation is bound to a source SHA, exact TeX and log/PDF artifacts, the host/TeX engine, a pdfinfo page count and an explicit incompatible-Lua negative. This is **not** a whitelist of all CTAN libraries, nor an editable scene model. See `plans/2026-10-31_I05_XELATEX_CORE_EXTENSION_AUDIT.md` and `insights/2026-10-31_I05_INTEGRATION_QA.md`. The packages on real Windows 10 and physical M1/M4 are not yet accepted.


## 11. C07 — native TikZ tool catalogue (six generators, no CAD)

The versioned [single source of truth](../extensions/primitives/catalog-v1.toml) defines the IDs, literal parameter types/units/choices, explicit editor-preset provenance (not inferred PGF defaults), requirements and Russian help for **line, arrow, rectangle, circle, node and cubic Bézier**. The same schema drives an executable generator and can be consumed by future egui toolbar, inspector, completion and contextual help. Each tool emits an ordinary TikZ command; see [the C-owned contract and fixtures](../extensions/primitives/README.md).

Only the arrow tool needs `\\usetikzlibrary{arrows.meta}`; all six require `\\usepackage{tikz}`. The standalone package-installed status, the actual project-loaded declaration, XeLaTeX compatibility, source-tool implementation and help availability are five separate dimensions. The bundled source generator is implemented; **GUI visual interaction and range discovery are not**. An installed MiKTeX package must never be treated as loaded source; unknown user macros imply unknown dependency evidence, not missing packages. The minimum PGF version is reported UNKNOWN; syntax was checked against the v3.1.12 manual, not an invented compatibility floor.

The `SourcePatch` contract changes one caller-owned known byte span with an expected previous substring and source revision; it emits its inverse for undo. It neither decompiles a PDF nor rewrites unknown TeX. Raw mathematical TeX in a node is user-authored and intentionally not blocked by the literal coordinate validator. XeLaTeX remains an external prerequisite: MiKTeX on actual Windows 10, user-installed XeLaTeX on physical macOS ARM64. Lua-only graphdrawing is still incompatible with XeLaTeX, and existing installed compatible packages remain source-compilable without a GUI adapter.

Review primary PGF/TikZ 3.1.12 manual sections [14 — paths](https://tikz.dev/tikz-paths), [16 — arrows](https://tikz.dev/tikz-arrows) and [17 — nodes](https://tikz.dev/tikz-shapes); linked descriptions here are original summaries, not copied manual pages.


## N2 source-backed library catalogue (same schema v1)

The \`[[libraries]]\` entries now describe \`arrows.meta\`, \`positioning\`, \`calc\` and \`fit\` in the **same versioned TOML file** as the six primitive tools. They carry stable ids, native \`\usetikzlibrary\` syntax, package and engine requirements, Russian effect/help/warnings/interactions, a complete source example and a primary PGF/TikZ manual section. Unverified minimum PGF versions remain \`UNKNOWN\`; library record examples are not claims of GUI implementations. No defaults are invented for library key parameters that have not been adapted.

**Additive C→B contract**: \`Catalog::bundled()?.libraries\`, \`Catalog::library(name)\`, \`project_imports::capabilities_for_library(&catalog, name, &inspect(source), installed_evidence, Some("xelatex"))\`, \`ProjectImports::declaration_sites(TikzLibrary,name)\`. The five status dimensions remain separate. \`tool_implemented=CONFIRMED\` for \`arrows.meta\` means *only* that the native arrow generator depends on it; no general-purpose library authoring is implied. \`positioning/calc/fit\` currently have usable TeX snippets and import adapters, not visual tools. \`visual_editable=false\` for arbitrary library syntax. The \`installed\` argument is externally obtained evidence, never inferred from \`\usetikzlibrary\`.

C's existing \`plan_import\` and \`plan_library_disconnect\` build revision-checked minimal source patches; B owns diff preview, explicit confirmation, source focus and inverse Undo in egui. Unsafe/opaque preambles yield \`UNKNOWN\`, a reason and no mutation. A found library file is not project-loaded; an unadapted installed XeLaTeX package may still compile raw source. Lua-only graphdrawing remains incompatible with XeLaTeX.

**C→D fixture contract**: \`cargo run -p tikzarium-extensions --bin n2-library-fixture -- <name> > example.tex\`, then external XeLaTeX with shell escape disabled and explicit artifacts. The four examples are full \`standalone\` documents. Hosted CI cannot replace physical Windows 10 + separately installed MiKTeX or M1/M4 + user XeLaTeX testing. The published manual sections are [arrows 16.5](https://tikz.dev/tikz-arrows), [positioning 17.5.3](https://tikz.dev/tikz-shapes), [calc 13.5](https://tikz.dev/tikz-coordinates), [fit 54](https://tikz.dev/library-fit). 
