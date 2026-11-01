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
