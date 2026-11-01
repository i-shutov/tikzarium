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

## I28 B28 exact-source integration

2026-11-01 · I28 QA integration onto exact B28 `f2dfbd0bb073e6152146a151eca138af8fc030e1` (independently verified app src tree `4be7a5aebbdd77a820abc08ea37d349dcab6bcec`). Real B27 X11 [41267001529](https://github.com/i-shutov/tikzarium/actions/runs/41267001529) was FAIL and remains historical evidence. B28 routes Undo during an armed guide pointer despite stale focused TextEdit, consuming the key; unweakened genuine X11 held-click/held-drag, exact saved-source rollback, fresh gesture, 6 native tools, F1 and GUI Save/Build/Export PDF must pass with independent source/PDF/screenshot review. Unit-event B28 success alone is insufficient. Real B28 X11 NOT_RUN, physical Win10/MiKTeX and Mac M1/M4 NOT_RUN, Cargo.lock untracked; no release.

## I31 — exact B29 GUI re-acceptance (pending new workflow evidence)

2026-11-01 · Accepted source truth: main `529217b89e83ffb93393eefb99a2a6ff07967c13`, B-owned draft PR #69 exact `133cab9eff2da0e2ab2ae9574e5328f2dad3ee62`, app source Git subtree `d7a487e91614c7b607ce92f53275e10e2a5ee911`. Previous B28 actual Linux/X11 [41271432298](https://github.com/i-shutov/tikzarium/actions/runs/41271432298) **FAIL**: source editor reintroduced line after app Undo reported success. B29 separates native TextEdit undo snapshots from revision-checked visual Undo; hosted B29 unit/event/TeX/MiKTeX checks passed, but the real desktop acceptance remains **NOT_RUN** until this independently pinned QA branch runs.

Preserve the entire I29 X11 procedure without weakening predicates: real held-click **and** held-drag Ctrl+Z; GUI Save of byte-identical original Cyrillic/macro source; no ghost command; fresh gesture still works; all six native tools; F1; external GUI XeLaTeX PDF + Unicode/embedded-font review; fit/resize screenshots. An automated workflow success is **not** manual visual acceptance. QA changes only QA workflow/driver/fixture/tests/docs, with a two-parent integration commit from QA and B29 source; do not edit B-owned production or legacy #48. Inspect exact-head artifacts before any QA→B29 or B29→main merge; use expected_head_sha and fresh post-merge CI. Physical Win10/MiKTeX, Mac M1/M4 XeLaTeX **NOT_RUN**; Cargo.lock untracked; no release.
