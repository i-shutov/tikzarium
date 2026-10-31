# I06 — actual desktop evidence, not merely Session tests

## Baseline and ownership
N1 #44 merge 6b0fe355 provides one six-command catalogue, source transactions, egui controls and generated-source XeLaTeX proof. Existing acceptance called Session, not OS pointer events. Foreground integrator adds only a new X11 workflow/driver/fixtures and I06 plans/insights; B owns event-unit regressions, D Windows MiKTeX. Production app/core/catalogue untouched.

## Attempt 1: real runtime failure
Head e9a192330c0d967fdb464cf556e4a693a2cb9dcc, run41192241938, job124511204418: hosted Rust GUI build and 5/5 Python predicates passed. App exited101 before any visible window because xkbcommon-dl could not load libxkbcommon-x11.so. Actual artifact13039530840 was downloaded; app.log/report confirm no pointer/screenshots. Added explicit libxkbcommon-x11-dev only in isolated hosted dependencies. This defect is invisible to cargo build alone.

## Attempt 2: actual GUI bootstrap PASS
Head e88a7116cbae278554550d0bcf463bc08aff7183, run41192581511 all steps PASS; artifact13040100262 ZIP SHA2564e4f927faf3f0ca8435eaf0a256465ee99378ef5808214ae5e147a1f4c9521d6 independently recomputed, CRC clean. Report PASS_BOOTSTRAP_ONLY, actual app SHA25627b9eddc3bbb83f4516594791e7970ddda22ed568a7ef8e842d5cc5b4c60b740.

Launched real egui process on X11/Xvfb/software GL. Actual clipboard/keyboard pasted Unicode TeX, Ctrl+S produced exact expected bytes SHA2566af5586255bc74dffe0471de0060da1c90faa38ee239b817f2551adcd175612f. Client geometry1366x740. Opened real 02-saved-source.png and visually inspected source left, approximate input grid and six native TikZ tool buttons centre, properties/help right. Source code and figure workspace are simultaneously visible. This screenshot is not a mockup. Screenshot SHA256a1a72ba7c8e5b5f156d52f2a1c34d701e9e893b52111ccd9340b5896f66b63af.

F1 before selecting a tool made no visible change (02/03 PNG hashes identical). Correct verdict: key sent, no demonstrated contextual-help result; never promote it to help PASS.

## Calibrated full pointer profile (new exact-head gate)
fixtures/qa/n1-desktop-x11-1366.json records actual toolbar/grid/export coordinates from the inspected screenshot. Added six distinct pointer actions (line, arrow, rectangle, circle, node, cubic), save after each, exact user macro/source preservation and unique owner-ID checking, then GUI Ctrl+Enter build and ExportPDF. Source/PDF must come from the actual app; no fallback direct TeX generation in this driver. Workflow uploads actual PNG/TeX/PDF/log/JSON, not shader caches. New full six-gesture results PENDING; do not inherit bootstrap PASS.

## Boundaries
Xvfb Linux TeXLive is not physical Win10+MiKTeX or Mac M1/M4. Approximate guide is not aligned with PDF; no claim of direct manipulation of arbitrary existing macros. Target-host screenshots, font/theme restart, physical pointer behaviour remain NOT_RUN. Coordinate profile tied to reviewed UI version and size; failure produces evidence, not invented pixels.
