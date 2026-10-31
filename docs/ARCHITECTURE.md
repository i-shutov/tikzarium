# Architecture — XeLaTeX-first, extensible, source-preserving

## 1. Responsibility boundaries

```text
egui Desktop Shell
  ├── Source Editor + Project Navigator + Command Palette
  ├── Canvas / Selection / Properties / Layers
  └── PDF Preview + Build/Problem Panels
              │ stable application commands/events
          Application Services
   ┌──────────┼────────────┬───────────────┐
   │          │            │               │
Source Store  Build Host   Semantic Core  Extension Host
+ CST/ranges  + XeLaTeX    + geometry DAG + package manifests
+ edits       + PDF view   + constraints  + visual adapters
+ undo        + log parse  + tool commands+ future WASM
```

The **source is authoritative**. The XeLaTeX-produced PDF is the authoritative **rendering**. Rust canvas geometry is an optional working model and must never pretend to render arbitrary PGF macros exactly.

## 2. Proposed Cargo workspace

```text
crates/
  tikzarium-app/          # eframe startup, application state, docked UI
  tikzarium-project/      # project roots, config, sessions, dependency paths
  tikzarium-source/       # text storage, lexing/CST, source maps, patches, undo
  tikzarium-build/        # XeLaTeX detection, process, recorder, logs, cache
  tikzarium-preview/      # PDF pages, zoom, pan, overlays; platform bindings
  tikzarium-geometry/     # expressions, exact-ish predicates, DAG, constraints
  tikzarium-scene/        # selectable/editable domain objects and commands
  tikzarium-extensions/   # manifests, discovery, capability registration
  tikzarium-sdk/          # stable serializable contracts (no ABI commitment)
  tikzarium-cli/          # headless build/inspect/QA entrypoints
adapters/
  core-tikz/              # simple nodes/paths/scopes/labels
  pgfplots/               # opt-in visual adapter later
  circuitikz/
  tikz-cd/
docs/ fixtures/ tools/ .github/workflows/
```

Naming may be simplified at bootstrap; crate boundaries should follow actual ownership, not create empty packages for their own sake. UI must not own TeX invocation, parsing or geometry algorithms.

## 3. Source preservation: three-level parser

1. **Lossless lexical/CST layer:** tokens, trivia/comments, macros, braces, environments, source spans and opaque regions; unsupported syntax stays byte-for-byte unchanged.
2. **Partial semantic recognizer:** recognize bounded PGF/TikZ commands, `\tikzset`, paths, nodes, coordinate expressions and known adapter schemas, with errors and confidence.
3. **Optional scene projection:** typed objects representing only constructs owned by adapters; every object tracks source origin, revision and supported operations.

Editing is a transaction: check source revision → compute *minimal* range edit → validate affected syntax and round-trip invariants → apply as one undo entry → build asynchronously → signal exact/approx status. Reject edits on stale ranges or opaque macro-generated objects.

Do **not** implement “parse → serialize whole source” for arbitrary existing documents. Restrict canonical code generation to new blocks or explicitly user-opted managed regions.

## 4. Build execution and safety

- Detect XeLaTeX executable using configured path and local installation; record `xelatex --version`. Discover `kpsewhich` and `texdoc` independently.
- Invoke executable directly with argument vector (not through a shell), fixed working directory and a temporary output directory. Start with `-interaction=nonstopmode -halt-on-error -file-line-error -recorder -no-shell-escape` (verify flags in installed distribution).
- A **project profile** stores main file, preamble mode, include roots, font/asset lookup policy, build arguments and allowed helpers.
- Maintain last-good PDF; stamp preview with SHA/input versions. On build errors, show stale indicator and scrollable log.
- Parse `.log` and `.fls` to capture source locations, included assets, generated outputs and dependency hashes.
- Restrict resource usage through time limits and cancellation; avoid running untrusted user projects with elevated rights. Note that `-no-shell-escape` is NOT a full OS sandbox: file reads, writes, arbitrary TeX macros and package scripts can still be risky.
- Shell escape and external commands are disabled by default. Any relaxation requires explicit per-project trust and audited, narrow helper policies; do not silently enable unrestricted shell escape.
- Avoid assuming all successful projects are `standalone`: support full documents, fragments with project preamble and multi-file projects.
- Missing packages are diagnostic states, not triggers to silently mutate the TeX installation.

## 5. Preview and geometry

PDF raster/selection backend is an implementation decision to benchmark (e.g. PDFium binding with packaging/licence checks), not a requirement that ties the whole architecture to one renderer. Preview must handle high DPI, zoom, panning, vector export and precise cropping. A fast Rust canvas may render editable primitives separately; an explicit “exact preview” button invokes XeLaTeX.

Semantic geometry tracks dependency edges (parent-to-derived), immutable object IDs, formula/parameter evaluation, incremental recomputation, cycles, multiple intersection solutions, invalid constraints and consistent undo. It borrows GeoGebra's architectural separation, **not** its implementation.

## 6. Incremental compilation

A cache key combines the document revision, preamble, build profile, actual compiler/package versions and discovered dependencies. File watcher invalidation plus `.fls` dependency closure triggers rebuild. Never use cache output of a different TeX package environment without an explicit compatibility decision.

## 7. Platform and packaging

- Windows target: `x86_64-pc-windows-msvc`, Windows 10 22H2 native smoke test. CI Windows Server is a build signal, not Win10 acceptance.
- Mac target: `aarch64-apple-darwin`, physical Apple Silicon smoke test including text, fonts, preview, file chooser, clipboard, menus, high-DPI.
- Non-x64 ARM Windows and x86 macOS are outside first-line acceptance.
- Reproducible installers/portable artifacts, unsigned local test builds first; notarization/signing is a later distribution concern.
- Native plugin code is not loaded from arbitrary DLL/dylib files in Core. Plugin code execution follows a separately reviewed sandboxed host.

## 8. Architectural decisions to keep documented

ADR-001 primary XeLaTeX, explicit and visible incompatibilities.
ADR-002 source-preserving edits and opaque regions, not forced full-AST rewriting.
ADR-003 TeX packages ≠ visual adapters ≠ executable tool plugins.
ADR-004 release proof from both CI and physical primary desktop smoke tests.

## I05 source-linked errors and protected preview

On compilation failure the Rust build service preserves the optional durable XeLaTeX log and exposes typed diagnostics with optional filename/line. The egui diagnostic panel distinguishes current-file diagnostics from included-file diagnostics: it navigates only the former to avoid an incorrect source jump. The previous successful PDF remains stale/nonexportable after an error. `font_audit` and text/math glyph warnings remain independent checked signals; no success is inferred solely from XeLaTeX exit code zero.
