# I51 — B36 independent real desktop PDF focus acceptance

Base production: [B36 #79](https://github.com/i-shutov/tikzarium/pull/79) exact `af75b0402bdf9c99dd18999fc5a4f6eb4c974e23`; `crates/tikzarium-app/src` Git tree `276ad1525db4ef3d3aab4624808453a897ad5b6a`. QA-only branch `qa/i51-b36-real-x11-pdf-focus`. No edits to B-owned Rust, shared C catalogue, core/TeX services, legacy I06 QA branch, or user's files.

## Vertical and non-negotiable gates

1. Re-pin both complete I46 dirty-Open and I47 native-gesture X11 workflows to **the exact B36 app source tree**. Run B35 safety, modal rejected/accepted destination, cross-file Undo, six real XTest pointer gestures, F1 Russian help and GUI external XeLaTeX PDF unchanged; do **not** reduce historical predicates for a green check.
2. Add genuine 1180×680 X11 **PDF крупно → Рисовать TikZ** click sequence *after* successful Save/Build/Export, preserving the six native TikZ commands and byte-exact arbitrary original source. Save screenshots of drawing, larger PDF, restored drawing and canonical external PDF.
3. Check file hashes, PDF content/fonts, screenshots, split source visibly editable, toggle actually selected and entire PDF legible. Differing screenshots or `UNIT_EVENT` alone **do not establish the B36 feature**. Verify coordinate bounds from real screenshots and recalibrate fixture before declaring accepted.
4. Verify workflow source SHA, app-tree SHA, Git-tracked lock, output hashes and visual screenshot/PDF manually. Exact PR head CI, then integrate QA into B36 only with expected-head lease; exact B36 head CI, then only approved main merge and separate post-merge main CI.
5. Hosted Linux/X11 is **not** physical Win10 with external MiKTeX or Mac M1/M4 external XeLaTeX. Both remain NOT_RUN. Figure fonts are independent of GUI theme; no auto-installer/fallback.

## Initial checkpoint

- Five hosted B36 core CI groups reported PASS on `af75b0402bdf9c99dd18999fc5a4f6eb4c974e23`; old X11 workflows failed **before GUI** due stale B35 tree fence. New I51 actual X11: **NOT_RUN** until fresh branch workflow.
- B35 modal/tool coordinates inherited as **provisional**; B36 new PDF focus coordinates are *unreviewed bootstrap guesses*, never treated as visual PASS. Explicit live full acceptance required.
- Entire X11 run may fail closed on outdated coordinates; inspect uploaded failure.png, screenshots and reports before adjustments.

## First actual X11 I51 result and calibrated correction

- [I46 #41329108921](https://github.com/i-shutov/tikzarium/actions/runs/41329108921) **automated SUCCESS** on QA `e6389d6a`; independently downloaded artifact `13092083442`, 21/21 SHA, genuine B36 modal red foreground error, victim/occupied CRLF untouched, scratch saved separately, Undo fenced, real GUI XeLaTeX PDF with extractable Cyrillic and embedded DejaVuSerif. Manual screenshots 06/12 reviewed. This is hosted Linux/X11, not Win10/Mac.
- [I47 #41329108813](https://github.com/i-shutov/tikzarium/actions/runs/41329108813) **FAILED at compact Fit Page**, after all six distinct native GUI pointer gestures, held-click and held-drag XTest Ctrl+Z, source save, F1 frame toggles, GUI PDF, zoom/fit frames. Downloaded artifact `13092567737`: actual B36 screenshots 04d/04e2 prove the earlier **B35 coordinate profile hit different controls**. In particular [882,72] clicked **PDF крупно**, not Zoom Out, and [680,98] was no longer compact Fit Page. This is **QA calibration failure**, not demonstrated B36 application failure.
- Recalibrated first-row vs wrapped second/third-row at 1366×740 and 1180×680 using actual B36 screenshots. Fixed all Fit width/Zoom Out/Fit Page clicks and PDF-focus/return clicks. Added explicit pixel-selected-button guard at real X11 coordinates, while **whole-page PDF visual remains NOT_RUN until a new exact-head screenshot review**.

## Second real I51 GUI result — wrapped warning discovery

- [I46 #41329734416](https://github.com/i-shutov/tikzarium/actions/runs/41329734416) SUCCESS unchanged source safety on exact QA `7dcc8d6e`.
- [I47 #41329734338](https://github.com/i-shutov/tikzarium/actions/runs/41329734338) reached **all six real GUI gestures, held click/drag Undo, F1, actual XeLaTeX PDF, Fit width/Zoom Out/Fit Page and resize** but failed at new *B36 selected-button safeguard*. Uploaded artifact `13092618731`, screenshot `05a-b36-drawing-before-toggle.png` manually inspected: previous Fit Page **"2% cannot fit"** diagnostic in top toolbar wrapped onto a second line, shifting B36 PDF switch from y98 to **y114** and guide from y72 to **y87**. Product drawing mode is visibly active and source is intact; static QA probe used stale one-line y. The fail-closed result is a QA layout adaptation requirement, **not a demonstrated application failure**.
- Independent I51 now enumerates the *two screenshot-reviewed layouts* (normal/wrapped), samples actual selected/unselected egui button fills from each real PNG and requires **exactly one** expected-state match per step before selecting PDF or returning to guide. Unrecognized layout fails closed. Offline negative tests cover none/ambiguous selection, and preserve user source immutability. Fresh exact-head CI plus manual PDF page review **NOT_RUN** at commit.
