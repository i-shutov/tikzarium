# I23 — B25 X11 independent QA checkpoint

Date 2026-11-01. Current main `bb96abccea86835977e2608887f7470ba83a1167`. B25 source `0174bab2fdc9b6f47f8680f01fbbfba93858f877`, app tree `033ece8a178c5c7d315fb95267e348975fe4b5d5`.
Historical main B24 X11 [41255441717](https://github.com/i-shutov/tikzarium/actions/runs/41255441717) SUCCESS: independently downloaded artifact 13062754730, 29 ZIP members, report hashes 27/27. True six native GUI gestures, saved TikZ, Russian F1, GUI external XeLaTeX PDF, reference rendering; full-page visible only after Fit width + Zoom Out. B24 result **cannot** be transferred to B25.

Old B24-pinned X11 on B25 [41256825485](https://github.com/i-shutov/tikzarium/actions/runs/41256825485) intentionally failed app-tree guard before starting GUI. New I23 pins updated tree and adds a real «Вся страница» button click + screenshot, source-preservation guard, and separately testable candidate coordinates. This does not change B production.

I23 exact GUI/Screenshot/PDF/F1/fit-page on B25: **NOT_RUN** until fresh CI. Candidate coordinates are not verified. B25 96 egui event frames are UNIT_EVENT, not actual desktop deactivation. Physical Windows10/MiKTeX and macOS M1/M4 NOT_RUN. No release.
