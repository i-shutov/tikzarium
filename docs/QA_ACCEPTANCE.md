# QA / Release acceptance contract

## 1. Test matrix

| Layer | Windows 10 22H2 x64 | macOS ARM64 | CI-only notes |
| --- | --- | --- | --- |
| Rust build/tests/clippy | required physical smoke | required physical smoke (M1/M4) | GitHub `windows-2022` and `macos-15` jobs |
| Launch and UI | font/IME/Cyrillic, dpi, file chooser | Retina, clipboard, menus | CI alone not enough |
| TeX integration | existing XeLaTeX distribution | existing XeLaTeX distribution | install pinned fixture TeX in CI where feasible |
| Full project | nested includes, spaces/Cyrillic paths | package install paths/permissions | use local fixture projects |
| Runtime failures | no TeX, no package, timeout, cancel | same | failure injection |

Current GitHub-hosted macOS labels `macos-15` are ARM64 M1; `windows-2022` is Windows Server and cannot prove Windows 10 compatibility. The user's actual hardware is the final acceptance environment.

## 2. Fixture categories

- G00: minimal source/preview, UTF-8/Cyrillic and `fontspec` XeLaTeX.
- G01: standalone / full document / multifile / external assets.
- G02: basic PGF/TikZ nodes, paths, styles, scopes, expressions.
- G03: unknown macros, comments, user style keys, opaque regions (byte-preserving).
- G04: editable visuals / minimal source edits / undo / copy/paste.
- G05: geometry DAG: intersections, degeneracies, cycles, constraints.
- G06: third-party packages with XeLaTeX: verified profiles per TeX version.
- G07: incompatible engine dependencies: explicit reporting, no silent compiler change.
- G08: security: untrusted source, shell-escape off, helper permissions, resource limits.
- G09: PDF preview/export high DPI, crops, PDF/vector/text fidelity.
- G10: both native OS release artifacts, installed versus portable setup.

## 3. R4 legacy reference acceptance

Research pack dated 2026-10-29:
- 135 active source → PDF runs; 158 pages; 18 semantic fixtures.
- Earlier reported **135/135 clean-compile**, **131/135 warning gate**.
- Four examples **O027/O028/O030/O047** carry unresolved extra nullfont .01pt diagnostics.
- 72 dpi raster equality confirmed for the frozen original environment only. Does not prove pixel identity across different TeX versions, fonts, rasterizers or OS.
- Seven retained historical themes not rerun in R4.
- External Asymptote/MetaPost/Graphviz examples are separate workflows and not XeLaTeX library compatibility tests.

Re-run on Windows and macOS with recorded exact TeX environment and hashes. For differences use vector/text inspection and measured page/geometry comparisons before assigning a failure or exception.

Do not ship binaries or copyrighted image assets from the research pack until provenance/licensing review. Store fixture checksums and source locators.

## 4. Release gates

1. **Build/CI**: formatting, clippy (documented exceptions only), tests, dependency inventory and binaries for Windows and macOS ARM64.
2. **Integration**: open, compile XeLaTeX, render, edit, save, reopen, export, recovery; typed and unknown constructs.
3. **Visual**: no clipped panels, truncated critical data, broken glyphs, stale previews mislabeled exact, alignment/anchor errors.
4. **Compatibility**: package matrix status is evidence-based; Lua-only limitations are visible.
5. **Security**: default no shell escape; no unreviewed external process or network use; no corrupted documents.
6. **Provenance**: Git SHA, dependency-lock hashes, environment, artifact hashes and `KNOWN_ISSUES.md`.
7. **Manual acceptance**: Windows 10 x64 + physical M1/M4; document actual OS/TeX versions and observed user flows.

Never change a fixture merely to make a failing render pass without an explicit review and explanation. Never turn “not tested” into “pass.”

## 5. Release evidence records

```text
release/
  manifest.json         # SHA, build profile, package versions, binaries
  hashes.sha256
  qa-results.json       # machine-readable per-fixture/per-platform PASS/FAIL/SKIP
  visual-review.md
  compatibility.csv
  known-issues.md
  win10-smoke.md
  macos-arm64-smoke.md
```

A missing physical smoke record blocks a production release but can be documented for an internal unaccepted development artifact.
