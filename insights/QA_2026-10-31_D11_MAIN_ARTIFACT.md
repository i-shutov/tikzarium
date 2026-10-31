# QA D11 — independent post-merge artifact inspection and second-host gate

2026-10-31. Main SHA aa6d1d08caee984d5f31ac13396e346fc451c8fe, #63 merged. Fresh repo and PR review confirmed #40 already merged; therefore D11 opens a distinct D-owned PR rather than editing a closed PR. Scope: the pre-existing real MiKTeX workflow and independent evidence tooling, tests, D plan/insight only.

Actual completed main push runs: MiKTeX 41217239682 (1/1 PASS), Rust 41217239643 (3/3 PASS), D QA 41217239580 (7/7 PASS). Downloaded [actual artifact 13048052949](https://github.com/i-shutov/tikzarium/actions/runs/41217239682/artifacts/13048052949) to local analysis. SHA-256 of ZIP e1dcee9294e83705011733fa29ac95918326ed0249ee080246c6f171f5522163 matches GitHub digest. Independently unpacked 45 files, not merely a CI summary. Setup state SETUP_COMPLETE, official installer pinned SHA 14b42dd9f4b4a7813a8bfd69c8f99316c2888cc4ee26f631f397e163d85d6c62, effective user roots inside runner temp, AutoInstall=0; separate root reports before/after provision. Package inventory bytes exactly equal before and after 9130 lines.

Reran Linux host Poppler on **six** uploaded PDFs: handwritten CLI/direct and N1 Session-generated text/math CLI/direct. Each is one page, extractable Cyrillic or math as appropriate, required DejaVuSerif and LatinModernMath embedded. Recalculated all six PDF SHA-256, N1 source SHA-256 and CLI/direct TeX log SHA-256; positive and both negative actual TeX logs begin with MiKTeX 25.12 XeTeX banner. Missing-library and Lua-only true errors have no PDFs. N1 session state says PASS_AUTHORING_STATE_ONLY and explicitly NOT_RUN for mouse clicks. The audit is intentionally independent of q['accepted'].

Local standalone audit against the downloaded artifact => PASS, 6 PDFs / 2 negatives / 2 N1 source variants / 9130 package rows; eight local unit+real-tamper regressions => PASS. This proof belongs only to **base main**; new branch workflow requires exact-SHA CI and posted JSON before PASS can be promoted.

Target-host Windows 10 x64, physical M1/M4, GUI pointer/F1/help/screenshots, output invariance under GUI themes: NOT_RUN. Hosted Windows Server MiKTeX cannot prove them.
