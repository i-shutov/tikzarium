# I06 — actual desktop evidence, not merely Session tests

## Baseline and ownership
N1 #44 merge 6b0fe355 provides one six-command catalogue, source transactions, egui controls and generated-source XeLaTeX proof. Existing acceptance called Session, not OS pointer events. Foreground integrator adds only a new X11 workflow/driver/fixtures and I06 plans/insights; B owns event-unit regressions, D Windows MiKTeX. Production app/core/catalogue untouched.

## Attempt 1: real runtime failure
Head e9a192330c0d967fdb464cf556e4a693a2cb9dcc, run41192241938/job124511204418: hosted GUI build and5/5 Python predicates passed. App exited101 before any visible window: xkbcommon-dl could not load libxkbcommon-x11.so. Actual artifact13039530840 downloaded; no pointer/screenshots. Added explicit libxkbcommon-x11-dev only in hosted prerequisites. This is invisible to cargo build alone.

## Attempt 2: real bootstrap PASS
Head e88a7116cbae278554550d0bcf463bc08aff7183, run41192581511 all steps PASS; artifact13040100262 ZIP SHA2564e4f927faf3f0ca8435eaf0a256465ee99378ef5808214ae5e147a1f4c9521d6 independently recomputed, CRC clean. PASS_BOOTSTRAP_ONLY; app SHA25627b9eddc3bbb83f4516594791e7970ddda22ed568a7ef8e842d5cc5b4c60b740. Actual clipboard/keyboard pasted Unicode TeX, Ctrl+S saved exact bytes SHA2566af5586255bc74dffe0471de0060da1c90faa38ee239b817f2551adcd175612f. Client1366x740. Independently viewed 02-saved-source.png SHA256a1a72ba7c8e5b5f156d52f2a1c34d701e9e893b52111ccd9340b5896f66b63af: source left, six native toolbar buttons/grid centre, properties/help right. F1 without selected tool had no visible difference: SENT, not help PASS.

## Attempt 3: real first pointer command; save gate FAIL
Head5c37e017361982b6d69d5093133bf9b7d64095e3/run41193030547, actual artifact13040031502 ZIP SHA256eb22702dac660ac16cbe4de9dc150ac8f0e4506e618edb2104f7c63d774cca13 verified, CRC clean. Script failed because disk source still had zero N1 owners after its first Ctrl+S. Actual failure.png SHA2565e984019c816835adb601c65e86daad7d73499e2fc05d5e5f7f44dbe35db138a visibly proves a line was created in the real app: highlighted TikZ command, owner#1, numeric fields, approximate line, Russian context help. Thus the error text 'did not create line' was too broad: the exact failed gate is **save publication after asynchronous GUI event**, not absence of an in-memory line. Whether timing or application shortcut handling is responsible is not yet established.

Also observed a real layout shift: selecting a tool expands the inspector from250px toward300px, wraps the PDF controls and moves the tool rows down36px. First calibration coordinates therefore cannot be reused unchanged for subsequent tool selections. New profile records separate observed startup/selected coordinates. This is not a claimed ergonomics PASS; B receives the finding.

Driver correction: retry ONLY Ctrl+S within8s until the strict expected source owner/count/type is actually on disk; never repeat a pointer gesture or weaken source preservation. Capture each selected-tool screenshot, record save attempt count, require exact original macro bytes after final GUI PDF compile. Add fitted final preview and both F1-toggle captures. Local5/5 predicate tests rerun PASS; new exact-head desktop result PENDING.

## Boundaries
Xvfb/Linux TeXLive is not physical Win10+MiKTeX or Mac M1/M4. Approximate guide is not aligned with PDF; no arbitrary macro reverse editing. Physical screenshots, native font/theme restart and target interaction remain NOT_RUN. All generated source/PDF must come through app, never fabricated after exit.

## I18 integration review (2026-11-01)

Baseline main `e28a3a4fb067a0a752d720cea484043d52beab00`; B22 draft exact SHA `3c6d76894b23397d252d771d985baa933d00723a` has five GitHub CI families SUCCESS, but only egui UNIT_EVENT. Prior real I06 `91d5798f` got 5/6 actual X11 pointer actions; cubic was mis-selected as Node. Old I06 decoder accepted v1 exclusively; B22 generates v2.

This QA-only change pins the exact B candidate in an isolated worktree and makes the real executable the test target, with strict v1/v2 evidence checks, all-six source gate, source byte equality and Bézier control syntax. No production source rewrites, no synthetic screenshot. New workflow evidence is NOT_RUN until GitHub executes the exact QA head and artifacts are independently inspected. Screenshot coordinates are provisional and must not imply success if the PDF/ownership predicates fail.

### Attempt I18-A: real B22 executable, exact source and observed first-gesture failure

[Workflow run 41246209257](https://github.com/i-shutov/tikzarium/actions/runs/41246209257), QA HEAD `41a885d8e3984aa70745cca6deb3e1a965bc0e81`, exact B22 application source `3c6d76894b23397d252d771d985baa933d00723a`. The actual pinned B22 worktree checkout and executable build passed; all six offline parser predicates passed; X11 process launched; keyboard Unicode clipboard and Ctrl+S preserved source SHA `6af5586255bc74dffe0471de0060da1c90faa38ee239b817f2551adcd175612f`. Real pointer #1 **FAIL** after 21 save checks: captured native source had a valid V2 owner for **Arrow** (not Line). Downloaded real screenshot ZIP `13058913292`, SHA-256 `3c7508e1f83efdf00d343e4a563063c331c3408780152c2b4c7efc331258242b`; CRC-clean 7 members, examined selected-line/failure PNG, new B22 toolbar is relocated. No GUI PDF, no six-gesture acceptance. Updated all six coordinates from actual screenshot, and required profile reviewed-source SHA match. Fresh run is PENDING.
