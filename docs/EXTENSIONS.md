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
- Files in a selected directory load **atomically** in sorted order. A malformed file rolls back the whole directory load. Symlinks and non-regular .toml entries are rejected. Other file types are ignored.
- Additional metadata cannot launch scripts, postprocessors, DLLs, dylibs, network requests or WASM.
- visual_features is forward-looking declarative metadata. It does not make a feature selectable or editable without a separately verified source adapter.

Only built-in manifests are enabled by Registry::new(); optional user directories must be explicitly loaded. No automatic execution or installation of third-party code occurs.

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
