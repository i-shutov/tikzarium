# TikZarium

**Local, extensible scientific graphics workbench for PGF/TikZ.**

**Primary typesetting engine:** XeLaTeX. **Desktop:** Windows 10 x64, macOS Apple Silicon (ARM64). **Implementation:** Rust + egui/eframe.

TikZarium combines faithful TeX rendering with a progressively richer visual editor, semantic geometry, and domain-specific tools. **The original TeX source remains authoritative.** Unknown or unsupported visual constructs must survive round-trips intact.

## Core product contract

- Open and save ordinary `.tex` and `.tikz` projects without proprietary conversion.
- Discover an existing local TeX installation; use **XeLaTeX** for actual rendering, including project preambles, local files and installed XeLaTeX-compatible packages.
- Provide exact PDF preview, source editing, reproducible builds, diagnostics and clear package/engine compatibility status.
- Start with source/preview, then add safe visual edits, a dependency-based geometry engine and opt-in library adapters.
- Offline-first: no cloud service, telemetry or sign-in required.
- Windows 10 x64 and macOS ARM64 are **release gates**, not stretch goals.

## Important compatibility distinction

1. **Compile**: XeLaTeX can compile the project if the required packages and dependencies are installed and compatible.
2. **Inspect**: TikZarium recognizes constructs sufficiently for highlighting, navigation, diagnostics and limited selection.
3. **Visually edit**: a versioned adapter can safely modify specific constructs while preserving unrelated source.

An extension may support level 1 without levels 2 or 3. LuaTeX-only features such as Lua-driven graphdrawing are **not** claimed as available through XeLaTeX.

## Development documents

- [Product requirements](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Extensions and capability model](docs/EXTENSIONS.md)
- [Incremental releases](docs/ROADMAP.md)
- [QA and acceptance](docs/QA_ACCEPTANCE.md)
- [Working conventions](AGENTS.md)

## Current stage

Planning / architecture baseline. No production-ready Rust application is implied by this documentation.

Initial research corpus: the user's TikZ/PGF scientific graphics skills R4 (2026-10-29) with 135 active build fixtures and additional semantic tests. The corpus is **referenced, not copied** into this repository until provenance/licensing and artifact-size checks have been completed.

## References

- PGF/TikZ manual: https://tikz.dev/
- CTAN PGF: https://ctan.org/pkg/pgf
- GeoGebra: https://github.com/geogebra/geogebra (architectural study; do not copy code without license review)
- egui: https://github.com/emilk/egui

See [ROADMAP](docs/ROADMAP.md) for the first executable milestone.
