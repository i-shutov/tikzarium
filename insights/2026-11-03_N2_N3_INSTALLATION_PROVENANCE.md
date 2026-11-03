# N2/N3 installation and help provenance audit (2026-11-03)

Verified fresh main 3fb25ca7, AGENTS/ROADMAP/PRODUCT_SPEC/ARCHITECTURE, C library catalogue, core TexEnvironment::probe_package, Registry::status and live Studio panel. #91/#92 merged; no new production main changes at start.

Findings: Studio used hard-coded Evidence::Unknown for all individual libraries, even when the user-selected TeX distribution could resolve its actual files. Registry::status required kpsewhich before attempting MiKTeX findtexmf, and package_file.is_some() blurred Unavailable into false. Core TeX Live probe could borrow a kpsewhich from an unrelated PATH installation. Arrows.meta uses pgflibraryarrows.meta.code.tex rather than the tempting but incorrect tikzlibraryarrows.meta.code.tex.

Change: exact C probe file fields, cached read-only tri-state installation observations, unchanged source-derived loaded status/engine target/tool availability/help, and explicit six named libraries (shapes.geometric/misc instead of compatibility-only shapes). Missing lookup produces UNKNOWN, not fabricated ABSENT. No synchronous probe per GUI frame; no silent auto-installer or fallback.

Independent local TeX Live check: xelatex -no-shell-escape compiled both shapes.geometric and shapes.misc one-page examples with Cyrillic \`Фигура\`; pdffonts reported embedded DejaVuSerif and pdftotext extracted label. This is LOCAL SOURCE/PDF evidence only, NOT real Studio GUI, NOT MiKTeX and NOT physical Windows 10 / Mac ARM.

Code, tests, plan, insight and CHANGELOG staged as one integration candidate. Exact-head Rust CI and original Studio X11 evidence remain NOT_RUN until the actual new revision is evaluated.
## First exact-head CI forensic (A2, before reacceptance)

At PR #93 HEAD `a2bab17e`, existing hosted N1 real X11 program again reached PASS (original I61 report 69/69 SHA ledger, source/PDF preserved). Expanded N2 real X11 was FAIL / NOT_RUN at its first Connect: original screenshot `04-after-gui-open.png` exposed the standard initial scratch **dirty Open confirmation modal**, while the N2 driver had wrongly clicked the Libraries dock *behind* that modal. Subsequent screenshots 05–09 were byte-identical. No evidence of a TikZ source/registry/installation product regression. Corrective driver explicitly clicks the genuine "Отбросить и открыть" modal button, then verifies the tab transition; a new exact-head execution and independent originals remain required. Earlier CI fmt failures were source formatting (before tests), not product failures; previous C library-count assertions expected four and were updated to six while the historical I56 four-only fixture stays intact.
