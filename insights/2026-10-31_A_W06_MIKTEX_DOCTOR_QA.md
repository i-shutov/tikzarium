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

### W06.2 hosted regression disclosure

W06.1 exact-head [D QA 41191703287](https://github.com/i-shutov/tikzarium/actions/runs/41191703287) Linux real XeLaTeX fixture **PASS**, while the Rust suite showed **3/4 PASS, 1/4 FAIL** in `doctor_unix`: fake `findtexmf` `case` still allowed only the obsolete TikZ filename. The production mapping is correct; the test stub rejected the corrected PGF filename. Changed only the A-owned fake helper whitelist and enriched the test's error output, preserving fail-closed semantics. The new SHA's full Rust/TeX/QA evidence is **PENDING**. Hosted MiKTeX #40 and physical Windows 10/M1/M4 remain separate.

### W06.3 independent CI failure and targeted correction

[QA 41191856961](https://github.com/i-shutov/tikzarium/actions/runs/41191856961) real XeLaTeX CLI on Linux and Windows + fake doctor `4/4` passed on corrected PGF library mapping. Linux `runner_unix::fake_miktex_compiler_receives_no_auto_installer_override` failed with `UnverifiedEngine { ... details: "Text file busy (os error 26)" }` when `execve` raced a fake shell script overwritten in-place after it was made executable. This is a **test harness race**, not a MiKTeX offline flag failure. Removed the rewrite: fake version is substituted into the script before single write. Same improvement for unknown-distribution test. Physical MiKTeX and Win10/M1/M4 remain NOT_RUN. New exact-head QA pending.

### W06.4 — independently audited head and N1 merge

Fresh branch PR #38 HEAD before remediation: `ca70d60d38f4f02f467b1703751083e2ff875e6f`; latest inspected main: `97c4b44eeee7ac84ba85f789269c3e15a9f528e4` (after #44 and C/N2 #49). Full comparison showed **no overlapping A file changes** since the A branch merge base. The latest D QA at old head was specifically [run 41192232187](https://github.com/i-shutov/tikzarium/actions/runs/41192232187), 6 jobs succeeded and the Ubuntu Rust job failed because test-generated `fake xelatex` returned `UnverifiedEngine { ... Text file busy (os error 26) }` in `fake_miktex_compiler_receives_no_auto_installer_override`. All four doctor Unix tests and six other core runner tests passed in that Ubuntu log; the failure is **not** evidence of a production MiKTeX error.

Implemented an immutable test-script publication technique: write to a non-executable staging name; close its writer; set executable mode; rename the complete file into place before any XeLaTeX version probe. No production XeLaTeX invocation or source-editing logic changed. Updated A plan + QA facts together. Requires fresh exact-head Rust/QA runs; past successes are not relabeled.

D06 [real MiKTeX run 41192766128](https://github.com/i-shutov/tikzarium/actions/runs/41192766128) is independently reported SUCCESS at D head `54a0d0d7befaa745514c18aa97163507b1c3b11c` on hosted Windows Server 2022/MiKTeX 25.12; the A/W06 production code was **not** yet part of this D source SHA. No physical Windows 10, M1, M4 proof exists for A. Strict statuses remain IMPLEMENTED vs HOSTED VERIFIED vs PHYSICAL NOT_RUN.

### W06.5 — failed merged-tree QA and deterministic Unix execve regression

The merged N1/C-N2 source `43f22c0482319f88c2c827c508c54a34ae283d75` triggered [D QA run 41195662713](https://github.com/i-shutov/tikzarium/actions/runs/41195662713). Its Ubuntu Rust job **FAILED**: actual decoded log `runner_unix.rs:217`, `UnverifiedEngine { ... "Text file busy (os error 26)" }`. Merely writing the fake executable under a staging name and atomically renaming it did not eliminate the Linux race; previous W06.4 mitigation must not be called a PASS. Other exact-HEAD workflow outcomes are tracked individually.

A substantive process-execution correction now makes `inspect_xelatex()` retry only transient Unix `execve` OS error 26, max 6×25 ms, no alternate executable selection. A deterministic Linux unit test holds the selected fake MiKTeX executable writable for 65 ms and then releases it; the real version-probe code must recover and classify MiKTeX correctly. Other spawn errors still propagate. This applies to both doctor and compile prerequisite identity checks and does not execute package management or mutate TeX. **New SHA verification required**, including Linux/Windows/macOS Rust matrix and genuine MiKTeX production CLI; no old PASS inherited. Native physical Windows 10 and M1/M4 remain NOT_RUN.
