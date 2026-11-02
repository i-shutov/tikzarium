# I59 — Offline direct XeLaTeX QA gap and evidence ledger

2026-11-02, \`i-shutov/tikzarium\`. Starting accepted \`main=2b129873ce278e5fd9ec1b26ddc13bccdc67a1b6\`, all 8 post-B40 workflows on that main were observed SUCCESS (Linux real-X11, D matrix, Rust, N1 and hosted Windows Server MiKTeX). They do **not** test physical Win10/M1/M4.

## Finding

Source inspection showed production Rust \`crates/tikzarium-core/src/build.rs\` already adds \`--disable-installer\` only when real XeLaTeX version classifies as MiKTeX. The independent Python direct glyph audit in \`scripts/tools/qa_smoke.py\` and fixed extension smoke in \`extensions/qa/run_smoke.py\` instead issued unguarded XeLaTeX builds. That could allow MiKTeX's user-configured automatic missing-package installation when the user runs QA directly on a physical host. This is a demonstrated invocation mismatch, **not** proof of a download or installation.

## I59 changes and safety boundaries

- Shared \`qa_engine_policy.py\` identifies the selected compiler through a bounded read-only version query. A MiKTeX build requires a successful \`--disable-installer --version\` probe on the *same* compiler. Unknown/mixed versions refuse. TeX Live is not passed MiKTeX-only options.
- \`check_missing_glyphs\` and all five extension fixtures pass the verified distribution-specific offline options to the direct XeLaTeX process. Existing \`-no-shell-escape\`, bounded timeouts, exact fixture files and source-hash checks remain; no TeX binary/source/editor modifications.
- Regression tests attempt an unverified MiKTeX switch, unknown identity and TeX Live branch and audit both emitted command lines.
- Hosted Windows Server MiKTeX workflow gets a separate actual-executable Python helper gate and current-file CI trigger coverage. This hosted test is **CI_ONLY**, not a Windows 10 pass.

## Exact-head acceptance

New I59 branch tests, hosted real MiKTeX, source/PDF artifact SHA audit and manual review: **NOT_RUN at authoring**. Do not infer successful delivery until a concrete PR head CI and critical artifacts are checked. Merge/post-merge: **NOT_RUN**. Physical Windows 10/MiKTeX and Mac ARM XeLaTeX: **NOT_RUN**. Ownership of concurrent B GUI/source and C catalogue remains separate; no parallel production edits.
