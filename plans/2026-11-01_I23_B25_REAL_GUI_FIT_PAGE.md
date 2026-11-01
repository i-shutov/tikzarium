# I23 — B25 full-page GUI acceptance, native TikZ + exact PDF

Source: B25 [#67](https://github.com/i-shutov/tikzarium/pull/67) exact `0174bab2fdc9b6f47f8680f01fbbfba93858f877`, app-src tree `033ece8a178c5c7d315fb95267e348975fe4b5d5`; QA branch `qa/i23-b25-live-fullpage-x11` targets B25. No production edits, no alteration of active old #48.

Acceptance vertical: run actual egui binary under isolated Linux/X11 (external TeX Live XeLaTeX), clipboard source with original Cyrillic/opaque macro, six native C pointer tools, true GUI Save per gesture, real GUI Build/Export and PDF with fonts/Unicode. Inspect F1 Russian help screenshots and source/PDF SHA. B25 «Вся страница» must be clicked and visually verified against reference raster to show six shapes **and** lower original «Не менять». Fit width + Zoom Out remain an independently tested baseline. No headless Session substitution. Screenshot frame differences alone are NOT a visual PASS.

B25 pointer/focus-loss has 96 egui event-frame regression paths; native window focus loss is separately NOT_RUN. Coordinate profile changes (tool and points y+24, Fit-page x515,y97) are explicit hypotheses after new wrapped toolbar row; recalibrate from true screenshots if rejected. Pinned app tree intentionally fails if B25 changes. Artifacts contain real saved source/PDF/PNG/report and generated untracked Cargo.lock.

Exact-head CI, artifact hashes, screenshot/PDF visual review, controlled QA→B merge, B→main merge and independent main CI required. Physical Win10 x64 independently installed MiKTeX and Mac ARM M1/M4 external XeLaTeX both NOT_RUN. No release.

## I24 — B26 responsive whole-page real-window acceptance

B25 archived evidence: [run 41258646232](https://github.com/i-shutov/tikzarium/actions/runs/41258646232), [artifact 13064825120](https://github.com/i-shutov/tikzarium/actions/runs/41258646232/artifacts/13064825120). 29/29 manifest SHA-256 verified and complete PDF page with lower Cyrillic visually accepted **only for B25** app tree `033ece8a178c5c7d315fb95267e348975fe4b5d5`.

Carry the QA-only driver forward to **B26 production HEAD** `73878df418dd6343bbca9dd94a2e5daf979ed7fc`, app-src tree `47c4c86be10471a5f56f7019ad63a77e7f4480f5` by a fast-forward two-parent integration commit (existing QA parent + B26 source parent). Keep B26 production source unchanged. Real X11 B26 must repeat all six commands, Save/Build/Export, Russian help, exact whole PDF, then resize the actual selected-fit window to 1180x680 and restore 1366x740, preserving original TeX byte-for-byte; screenshots require independent review against original PDF raster. B26 internal page-navigation/new-raster behavior remains UNIT_EVENT and actual GUI page switching is NOT_RUN unless explicitly exercised. Fail closed on source/tree drift; no physical Windows10/Mac claim. Integrate QA into B only after exact HEAD CI and independent artifacts, then B/main with independent post-merge checks.
