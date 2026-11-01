# I23 — B25 full-page GUI acceptance, native TikZ + exact PDF

Source: B25 [#67](https://github.com/i-shutov/tikzarium/pull/67) exact `0174bab2fdc9b6f47f8680f01fbbfba93858f877`, app-src tree `033ece8a178c5c7d315fb95267e348975fe4b5d5`; QA branch `qa/i23-b25-live-fullpage-x11` targets B25. No production edits, no alteration of active old #48.

Acceptance vertical: run actual egui binary under isolated Linux/X11 (external TeX Live XeLaTeX), clipboard source with original Cyrillic/opaque macro, six native C pointer tools, true GUI Save per gesture, real GUI Build/Export and PDF with fonts/Unicode. Inspect F1 Russian help screenshots and source/PDF SHA. B25 «Вся страница» must be clicked and visually verified against reference raster to show six shapes **and** lower original «Не менять». Fit width + Zoom Out remain an independently tested baseline. No headless Session substitution. Screenshot frame differences alone are NOT a visual PASS.

B25 pointer/focus-loss has 96 egui event-frame regression paths; native window focus loss is separately NOT_RUN. Coordinate profile changes (tool and points y+24, Fit-page x515,y97) are explicit hypotheses after new wrapped toolbar row; recalibrate from true screenshots if rejected. Pinned app tree intentionally fails if B25 changes. Artifacts contain real saved source/PDF/PNG/report and generated untracked Cargo.lock.

Exact-head CI, artifact hashes, screenshot/PDF visual review, controlled QA→B merge, B→main merge and independent main CI required. Physical Win10 x64 independently installed MiKTeX and Mac ARM M1/M4 external XeLaTeX both NOT_RUN. No release.
