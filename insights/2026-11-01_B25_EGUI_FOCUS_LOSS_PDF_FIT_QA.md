# B25 QA — actual event frames and exact PDF viewport

2026-11-01 · B branch `feat/b25-egui-pointer-focus-fit-page-20261101` · base main `bb96abccea86835977e2608887f7470ba83a1167` (PR #62 already merged).

**Defect 1 / cause:** after an armed primary egui pointer gesture, loss of pointer/window focus was not part of the cancellation condition. If egui supplies drag stop or click on the same frame, source generation must never proceed. The production guide now inspects native `PointerGone` and `WindowFocused(false)` events and makes the current capture inert until release. The next deliberate click remains available.

**Defect 2 / cause:** Fit width is dimensioned from panel width alone; I19 independent 1366×740 screenshot demonstrated the PDF's lower user text clipped after Fit width. A separate **Вся страница** action now measures the post-guide remaining viewport and raster size; no synthetic PDF geometry. If the smallest 20% zoom cannot fit, the UI explicitly warns and does not pretend success.

**Implemented regression:** `b25_pointer_loss_or_window_focus_loss_never_commits_a_held_gesture` uses production `egui::Context::run(RawInput)`, 96 pointer/focus-loss timelines, all six shared-C primitives, two widths, click/drag, both event orderings, fresh insertion/Undo and byte-exact user macro preservation. `b25_fit_page_uses_real_remaining_viewport_not_canvas_width_or_provisional_guide` runs actual egui layout frames and checks fit bounded by the remaining viewport. These are UNIT_EVENT/LAYOUT, **not physical Win10/M1/M4**.

**Exact-head CI:** PENDING until published run and manual inspection. I19 desktop evidence tested earlier B23/B24 source, not this B25 code. Independent screenshot acceptance of the new Fit-page button and physical Win10/M1/M4 GUI/IME/Retina/native dialogs remain NOT_RUN. No C/A/D/E/F file changes, no novel TeX/CAS/solver, no PDF-guide coordinate claims.
