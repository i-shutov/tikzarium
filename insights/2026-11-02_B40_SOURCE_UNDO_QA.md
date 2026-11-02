# B40 — code inspection and test provenance

Date: 2026-11-02. Baseline accepted main `81d35447711500399f44f11aecc34ac9ad3bd67a` with PR #81 and I56 already merged.

Observed code-level UX safety gap: `show_source_text_edit` resets egui native undo snapshots only when `reset_source_editor_undo_history` is true. The previous owner B handler set it for external library source patches, global shortcut Undo and a fallback guide Undo; *not* for ordinary guide insertion, the pinned inspector Undo button, or inspector source actions. With an already-focused text widget, stale native snapshots could reach a different revision of the same document. This is supported by source review; a physical reproduction was NOT_RUN at this checkpoint.

Patch intended: compare the B Session's source revision before/after three production handler boundaries; fence only on revision change, before the next source editor frame (or request a second frame for guide). Keep selection/F1/manual native typing unaffected. C/N2 imports, known opaque macros and all other owners unchanged.

New B40 `UNIT_EVENT` uses real `egui::Context::run(RawInput)` TextEdit frames to test Unicode/CRLF manual typing, one native TikZ primitive patch, source Undo, an attempted stale Ctrl+Z and byte-exact saved file with an unknown macro. It does not exercise the full native window or verify screen-space PDF coordinates. The prior I56 four-library `UNIT_EVENT`, I47 six-gesture real-X11, I46 dirty Open and I53 library/Help real-X11 remain separate evidence.

Exact-HEAD CI, independent GUI click/visual review and physical Windows 10 / Mac ARM: NOT_RUN at authoring. Do not claim PASS until observed.
