# I43 — B31 real X11 compact Fit Page / Fit width acceptance

2026-11-01. QA-only branch `qa/i43-b31-compact-real-x11`, parent B31 `174207d0d9f78ea4790d52f9544ff07c6cc0906b`, main `8640c2cfb4871b4e4b63091c35c2c26d5a6ced0a`. Verified exact app source tree `3aea076697daef8572d24694995a4e2ef24bbcaa` by Git tree traversal.

## Large user vertical

- Preserve all six native TikZ gestures, X11 Button1Mask/XQueryKeymap held Ctrl+Z undo click+drag, exact byte rollback, fresh gesture, Russian F1, GUI Save and actual GUI Build/Export external XeLaTeX PDF.
- After PDF exists, capture actual Fit width/Fit Page, resize egui to 1180×680 with Fit Page active, screenshot, click compact Fit width, screenshot, restore Fit Page, screenshot, and resize to 1366×740. Source unchanged. Compare all PNGs with **real exported PDF raster**: page top/bottom, source always editable, fit controls genuinely activated. Compact click candidates `(603,98)` Fit width and `(680,98)` Fit Page derive from manually reviewed **B30** true 1180×680 X11 screenshot, where the toolbar wrapped to the next row; these still require B31 screenshots for acceptance. Normal 1366×740 locations must NOT be reused at compact width.
- Retain `cargo --locked`; no edits to #48, production B, shared C, external TeX executors, user CRLF/macros, or package installation. Merge QA into B31 with `expected_head_sha` only after actual GUI acceptance and exact CI; B31 into main only after full artifacts reviewed; separate post-merge CI.

## Evidence status

Five locked B31 hosted CI families PASS at `174207d0d9f78ea4790d52f9544ff07c6cc0906b`; I33 X11 `41288232689` failed at intentionally stale B30 source-tree preflight before GUI launched. I43 actual GUI NOT_RUN until evidence. Physical Win10 MiKTeX and Mac M1/M4 XeLaTeX NOT_RUN, no release.
