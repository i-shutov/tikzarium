# I26 — B27 actual keyboard Undo while holding the native TikZ pointer
2026-11-01 · QA integration, only `i-shutov/tikzarium`.

## User vertical and isolation
B27 #69 fixes a source-revision-safe Undo that formerly allowed a held guide gesture to create a ghost TikZ command after the mouse release. Do not accept only egui RawInput/UNIT_EVENT tests. Branch from exact B27 `1805a46cbca2985c4b4798ccf4b0e22171107297`, preserve production ownership B and legacy active QA #48 untouched, and integrate QA into the current B branch only after exact SHA and evidence review.

## Hosted acceptance
1. Verify the tested exact checkout and B27 app source tree; run isolated Linux/X11 real process, external XeLaTeX, no hidden installer.
2. Paste original Cyrillic and opaque user macro through GUI, Save, create first native line with genuine xdotool drag.
3. For held click *and* held drag: press the native guide, send Ctrl+Z while still held, release, GUI Save, demand full exact original source bytes, zero owned lines, independent screenshots; then intentionally draw a fresh line and verify source persistence. A failed source Undo or a ghost insertion is FAIL.
4. Continue all six native commands with GUI Save, actual GUI Build/Export, PDF Unicode/font checks, Russian F1 and full-page/resize screenshots. Inspect uploaded PDF/PNG and SHA manifest manually; mere frame difference or bootstrap screenshot is not visual PASS.
5. After independent exact-head hosted CI acceptance, lease-merge QA into B with expected_head_sha, rerun B exact-head workflows and independently review critical artifacts, then B→main and separate main post-merge. No premature release.

## Evidence boundary
Real hosted Linux X11 != physical Win10/MiKTeX or Mac ARM external XeLaTeX. Egui unit event != desktop process. Physical tests NOT_RUN; Cargo.lock release reproducibility NOT_VERIFIED. Do not call a workflow dispatched a completed result.
