# Extension model and support catalogue

## 1. Two completely different meanings of “plugin”

**External TeX package**: PGF/TikZ libraries and packages installed in TeX Live or MiKTeX. XeLaTeX itself executes their TeX macros. TikZarium must NOT require a special Rust plugin merely to compile them.

**TikZarium adapter/plugin**: extra knowledge and UI capability that makes particular syntax navigable, visual/editable or exportable. Adapter support is incremental, independent of package installation.

## 2. Explicit feature-level statuses

Every package+feature+environment entry has separate states:

- `installed`: present on the machine; discovered via TeX tooling, not guessed.
- `build`: PASS / FAIL / NOT_TESTED / INCOMPATIBLE_ENGINE, with compiler/version evidence.
- `inspect`: recognized source grammar, parameters and diagnostics.
- `visual_edit`: a tested safe editor transaction with round-trip source preservation.
- `export`: explicit supported output backend (including restrictions).
- `requirements`: required TeX engine, dependencies, helper executables, shell permissions.

Do not claim that a library is unsupported merely because it lacks a visual adapter. Do not claim full visual editability merely because it compiles.

## 3. Initial catalogue / release sequence

| Family | XeLaTeX-build path | Visual adapter roadmap |
| --- | --- | --- |
| Basic PGF/TikZ, scopes, styles, paths, nodes, labels, arrows.meta, positioning, calc, fit | Core compilation | v0.2 |
| Intersections, angles/quotes, transformations, backgrounds, decorations, shapes, patterns | Installed PGF libraries | v0.3–v0.5 |
| PGFPlots and pgfplotstable | Installed packages, per-profile tests | v0.5 |
| tkz-euclide, math/geometry diagrams | Installed compatible packages | v0.3–v0.6 |
| circuitikz, logic and electronic circuits | Installed compatible package | v0.6 |
| tikz-cd, automata, petri, forest, mindmap | Installed compatible packages | v0.6–v0.7 |
| tikz-feynman (explicit vertex layout), quantikz, chemfig, chemformula | Profile-specific proof | v0.7+ |
| tikz-ext and independently released PGF libraries | Per-feature evidence | catalogue first, visual by demand |
| TikZ graphdrawing algorithms requiring LuaTeX, tkz-elements Lua operations | **Not XeLaTeX-native** | explicit limitation; possible external preprocessing later |
| External programs (Graphviz, Asymptote, MetaPost, gnuplot) | Separate audited pipeline, not silently enabled | later optional tool plugins |

Timing is planned, not proof of support. The catalogue is extensible; **do not hardcode a finite whitelist of packages**.

## 4. Adapter lifecycle and capability negotiation

An adapter advertises:

- unique ID, semver, host API compatibility, feature IDs, supported TeX requirements and supported operations;
- patterns/grammar keys and source edits it owns;
- palette/tool/inspector/schema contributions;
- diagnostic messages and round-trip test fixtures;
- optional trusted postprocessors and their permissions.

Capability handshake: the editor checks host API, actual package availability/versions, XeLaTeX compatibility, project trust and confidence before offering an editable control. Missing or unverified information means no unsafe visual operations.

## 5. Security and ABI strategy

**v0.1–v0.3:** in-repository Rust adapters behind stable internal traits; declarative manifests can add metadata, docs, snippets and templates without running code.

**v0.4–v0.6:** versioned serialized host API and **packaged declarative plugins**; schema validation, load/unload, dependency resolver and conflict handling.

**v0.7+:** investigate component-model WASM/WASI for *untrusted external code*, capability-based host calls, filesystem/network restrictions, execution budgets and explicit opt-in permissions. Do not expose Rust trait object ABI or accept arbitrary DLL/dylib loading as the public plugin interface.

Plugin contracts operate on stable serializable IDs, immutable source snapshots, patch requests and preview/canvas data. They never receive unrestricted internal mutable pointers. A plugin crash cannot corrupt the active document or take down the main GUI process.

## 6. Example conceptual manifest (illustrative, not committed API)

~~~json
{
  "id": "org.tikzarium.pgfplots",
  "version": "0.1.0",
  "api": "0.x",
  "kind": "visual-adapter",
  "requires": {
    "engine": "xelatex",
    "tex_packages": ["pgfplots"]
  },
  "capabilities": ["inspect:axis", "palette:axis"],
  "visual_edit": {
    "axis-options": "planned"
  }
}
~~~

No schema here is yet a frozen ABI. Freeze it only after two distinct adapters are integrated and tested end-to-end.

## 7. Research corpus to import after licensing/provenance review

2026-10-29 R4 skills, figures and source-to-PDF/PNG registry:
- https://drive.google.com/drive/folders/1wZ9CmzWz4OmrZzwDeWibve27O3REvImn
- R4 corpus reports: **135/135** clean compile; **131/135** strict warning gate; **18/18** semantic tests; **158** rendered pages.
- Four preserved warning defects: O027, O028, O030, O047; retain as known warning-gate exceptions, not silent passes.
- 125 PGF/TikZ plus 24 tikz-ext installed library files were inventoried in one reference environment. This is not the whole CTAN ecosystem and does not guarantee compatibility with a new environment.
- The corpus covers user diagrams, UML/BPMN, graphs, Petri, STEM, engineering, tables, Beamer and alternate render engines. Alternate-render-engine fixtures are not native XeLaTeX library tests.

R4 is an **evidence-backed reference set**, not the only or complete acceptance set.
