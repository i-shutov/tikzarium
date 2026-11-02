# B40 — Native TextEdit Undo isolation across all TikZ source transactions

Date 2026-11-02. Repository `i-shutov/tikzarium`, lane B only. Baseline main `81d35447711500399f44f11aecc34ac9ad3bd67a` (I56 N2 four-library acceptance already merged). Keep C shared catalogue and N1 source patches as sole authoring mechanism; no interpreter, re-renderer, TeX solver or undocumented coordinate mapping.

## Reproduced static gap

B39 fenced egui's native TextEdit undo snapshots after *library* changes, and the global visual-Undo keyboard path. The same revision-changing source transactions could also come from the pinned inspector Undo button, inspector parameter edits/dependency insertion, and the six gesture tools in the provisional guide. Those paths left the reset flag unset. The existing B32 stale-TextEdit history test proves why a programmatic source replacement requires a fence; this is a source-level safety gap, not yet a physical OS defect.

## One cross-path block

- Expose only B Session's monotone source revision; do not change C or A public contracts.
- Fence the native TextEdit undoer when the observed Session revision changes across the production inspector action bar, authoring inspector and guide. Leave text-only selection, F1 and normal manual editing untouched.
- Add headless real `egui::Context::run(RawInput)` frames to check manual Unicode/CRLF edits, visual insertion and Undo, native Ctrl+Z, unknown macro preservation, Save/Reopen bytes. Existing I47/I53/I56 cover real guide/library handlers on Linux/X11 and four-library `UNIT_EVENT` respectively; do not mislabel these tests as Win10/M1/M4.
- Run rustfmt, strict Clippy, Rust unit tests, real Linux/X11 regression flows, external XeLaTeX PDFs, distinct hosted Windows Server MiKTeX and independent D QA on exact PR SHA; inspect artifacts before requesting integration.

## Gate

Do not merge a draft until exact-head CI is green and the independent X11 source-edit history interaction has evidence. Any coordinate overlay remains provisional; XeLaTeX PDF is authoritative. Physical Windows 10 with external MiKTeX and Mac ARM M1/M4 remain NOT_RUN until tested.
