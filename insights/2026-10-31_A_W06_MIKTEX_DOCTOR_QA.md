# A/W06 QA evidence — 2026-10-31

## Scope and provenance

Starting main SHA: c5c8c1576b6288e1d125d558d0d4872b321efb86 (2026-10-31T08:54:43Z). Reviewed root AGENTS.md, current code, open PR roster, issue #14, merged integration #24 and independent unmerged A #28. Only A core/CLI/tests and A-namespaced plans/insights changed. Workpack #28 dependency snapshots were not copied or modified.

## Code authored

1. Read-only xelatex --version probe; classify MiKTeX, TeXLive, Unknown and reject an unidentifiable engine before build.
2. Per-invocation MiKTeX --disable-installer via direct argv; no global configuration mutations. Existing -no-shell-escape, logging and diagnostics retained.
3. MiKTeX native findtexmf file lookup without --must-exist; never invoke bare MiKTeX kpsewhich to detect missing packages. Use ONLY the helper beside the selected XeLaTeX, without PATH fallback, to prevent mixing user/shared package trees; if absent report NOT_CHECKED. TeX Live kpsewhich remains.
4. Doctor reports path/version/distribution, read-only presence status for standalone.cls, tikz.sty, the selected TikZ calc/positioning/arrows.meta library code files, fontspec.sty and unicode-math.sty; missing vs unavailable distinguished. Actual builds forward font/glyph warnings to stderr even on PDF success.
5. New pure TikZ/PGF reference with user-owned preamble, calc/positioning/arrows.meta, fontspec/unicode-math, Cyrillic, Greek, math, and opaque custom macro; source not rewritten.
6. Core and CLI Rust tests authored for identity, unknown/fail-closed, Unicode/spaces, distinct user/shared lookup roots, fake MiKTeX offline argv, unchanged CRLF/opaque macro bytes, safe findtexmf with no install options, doctor present/missing selected library/package exit codes, and a successful PDF that still reports a missing-glyph warning. These tests are not yet counted as PASS until executed at the exact PR HEAD.

## Actual Linux fixture compilation (TeX Live, NOT MiKTeX)

Source placed under a Unicode-and-space directory, copied verbatim from the new fixture. Engine: XeTeX 3.141592653-2.6-0.999996 (TeX Live 2025/dev/Debian). Ran direct xelatex -interaction=nonstopmode -halt-on-error -file-line-error -recorder -no-shell-escape -output-directory=out with source operand ./primitive font math.tex.

- Exit 0; actual generated PDF, 1 page (pdfinfo).
- Source SHA-256 before/after identical: 7e87d66804182209184d7176d8c34a4ec00e62c66932ecd2d2abac53fdc22bb4.
- pdftotext -enc UTF-8 extracts Cyrillic Точка А, Оптика, Greek αβγ and mathematics.
- pdffonts reports DejaVuSerif and LatinModernMath-Regular, both emb=yes and uni=yes.
- No Missing character, LaTeX Font Warning, or fontspec Error after dropping an unsupported italic face request.
- Rasterized PDF inspected visually at 1000×338: node, arrow, Cyrillic and math readable; no clipping.
- Package shellesc Warning: Shell escape disabled is expected.
- This validates only the local *fixture*, not Rust code, Windows 10, MiKTeX, or macOS.

## Status table

| Gate | Verdict | Constraint |
|---|---|---|
| Prior PR, SHA and AGENTS review | DONE | Verified base above |
| Code and regression tests authored | IMPLEMENTED, NOT_YET_RUN | No local cargo/rustc available |
| Linux TeX Live real fixture (manual) | PASS | Actual PDF, source hash, Poppler, visual review |
| PR exact-HEAD hosted fmt/check/test/clippy | PENDING | GitHub Actions needed |
| Hosted macOS ARM64 / Windows Server | PENDING | Not equivalent to physical user machines |
| Windows 10 MiKTeX private install | NOT_RUN | Physical host unavailable |
| Windows 10 MiKTeX shared install | NOT_RUN | Physical host unavailable |
| Network-isolated proof of zero MiKTeX downloads | NOT_RUN | Requires native MiKTeX host and monitoring |
| Physical Mac M1/M4 XeLaTeX + GUI smoke | NOT_RUN | Host unavailable |

## Remaining limitations

The version subprocess currently has no independent deadline. MiKTeX --disable-installer governs its package installer, not arbitrary TeX I/O or all network behaviors; no OS sandbox guarantee. Existing fonts may differ between distributions; the fixture explicitly requires DejaVuSerif.ttf and latinmodern-math.otf. Real native MiKTeX evidence and exact-head hosted Rust CI must be collected before any Windows-specific PASS claim.

Vendor reference: https://docs.miktex.org/manual/miktex-xetex.html ; https://docs.miktex.org/manual/texfeatures.html ; https://docs.miktex.org/manual/findtexmf.html .


## Additional QA: a real silent compiler substitution defect

Review found the pre-W06 TexEnvironment::discover() would fall back to the
PATH XeLaTeX when TIKZARIUM_XELATEX was configured but invalid; this could
silently pick TeX Live instead of independently installed MiKTeX. Fixed:
configured override selects only its exact path (or no engine); PATH lookup
is permitted only when TIKZARIUM_XELATEX is unset. Both CLI commands now
report the offending override as INVALID and return exit code 2.

Regression authored: working fake engine on PATH, explicitly selected missing
Unicode MiKTeX path, no created PDF, byte-identical CRLF plus opaque macro.
New branch SHA tests remain PENDING until exact-head hosted Rust CI finishes.
Physical Win10 MiKTeX user/shared and Mac M1/M4 remain NOT_RUN.

## W06.1 investigation — false MISSING in real doctor

The completed exact-head checks for SHA `0166c4a900e1efe4252eadcb095c1153c275351a` are **not green**: [Rust CI 41188362441](https://github.com/i-shutov/tikzarium/actions/runs/41188362441) failed Linux doctor on `tikzlibraryarrows.meta.code.tex: MISSING` (exit 3), and Windows/macOS rustfmt. [D QA 41188362460](https://github.com/i-shutov/tikzarium/actions/runs/41188362460) failed its required doctor preflight on three hosts, while [figure-font job 41188362495](https://github.com/i-shutov/tikzarium/actions/runs/41188362495) passed. No claim of all-green CI.

**Root cause independently reproduced:** local XeTeX 0.999996 TeX Live 2025/dev, `kpsewhich tikzlibraryarrows.meta.code.tex` => not found, `kpsewhich pgflibraryarrows.meta.code.tex` => `/usr/share/texlive/texmf-dist/tex/generic/pgf/libraries/pgflibraryarrows.meta.code.tex`. A direct `xelatex -interaction=nonstopmode -halt-on-error -no-shell-escape test-arrows-meta.tex` with `\\usetikzlibrary{arrows.meta}` and `\\draw[-{Stealth}]` produced an actual PDF (exit=0) and log `pgflibraryarrows.meta.code.tex`. This is a *false-negative doctor*, not evidence that the installed TikZ lacks arrow tips. Never bypass a genuinely missing package.

Corrective changes: native PGF filename in CLI doctor and fake-MiKTeX doctor test; assert invented filename absent; apply the 3 exact rustfmt differences visible in hosted job log. New exact-head CI is PENDING until completed and inspected. MiKTeX user/shared on native Win10, network-isolated verification, and physical Macs M1/M4 are still NOT_RUN; independent MiKTeX workflow #40 has no physical acceptance equivalence. Vendor MiKTeX option reference: https://docs.miktex.org/manual/miktex-xetex.html .
