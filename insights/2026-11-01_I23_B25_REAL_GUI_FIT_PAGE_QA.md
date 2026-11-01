# I23 — B25 X11 independent QA checkpoint

Date 2026-11-01. Current main `bb96abccea86835977e2608887f7470ba83a1167`. B25 source `0174bab2fdc9b6f47f8680f01fbbfba93858f877`, app tree `033ece8a178c5c7d315fb95267e348975fe4b5d5`.
Historical main B24 X11 [41255441717](https://github.com/i-shutov/tikzarium/actions/runs/41255441717) SUCCESS: independently downloaded artifact 13062754730, 29 ZIP members, report hashes 27/27. True six native GUI gestures, saved TikZ, Russian F1, GUI external XeLaTeX PDF, reference rendering; full-page visible only after Fit width + Zoom Out. B24 result **cannot** be transferred to B25.

Old B24-pinned X11 on B25 [41256825485](https://github.com/i-shutov/tikzarium/actions/runs/41256825485) intentionally failed app-tree guard before starting GUI. New I23 pins updated tree and adds a real «Вся страница» button click + screenshot, source-preservation guard, and separately testable candidate coordinates. This does not change B production.

I23 exact GUI/Screenshot/PDF/F1/fit-page on B25: **NOT_RUN** until fresh CI. Candidate coordinates are not verified. B25 96 egui event frames are UNIT_EVENT, not actual desktop deactivation. Physical Windows10/MiKTeX and macOS M1/M4 NOT_RUN. No release.

## I24 — completed B25 independent review, B26 evidence pending

Downloaded authentic GitHub artifact `13064825120`, digest `sha256:9addf88205dc96369afb003c993ebf8d11847f7b257d30238f8d1b025fa0d7f4`. All **29/29** recorded internal file SHA-256 values match; run [41258646232](https://github.com/i-shutov/tikzarium/actions/runs/41258646232) SUCCESS. Saved six native TikZ tool commands, unchanged Cyrillic macro, one genuine GUI-exported PDF `ddca2b064848484f7a623b943ade0192eba5ea9b4383e8db52c7c44a0d80ca60` with DejaVuSerif, and actual visual screenshot `04d-fit-page-candidate.png` shows all objects + bottom-left `Не менять`, F1 screenshot Russian contextual Bézier. B25 live GUI PASS; physical targets NOT_RUN. 

**B26** `73878df418dd6343bbca9dd94a2e5daf979ed7fc` app tree `47c4c86be10471a5f56f7019ad63a77e7f4480f5` changes persistent fit-page behavior: historical B25 screenshots cannot prove resize/new-page live GUI. New X11 driver adds genuine window shrink/restore screenshots, with no auto visual PASS. Exact B26 post-change CI/visual review **NOT_RUN at authoring**; keep draft. The historic `Cargo.lock` is generated but not tracked; release reproducibility not established.
