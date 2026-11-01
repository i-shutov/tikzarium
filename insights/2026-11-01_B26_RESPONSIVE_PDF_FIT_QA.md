# B26 QA — Fit Page remains active across changing egui frames

2026-11-01 · Existing B draft PR #67; B-owned `main.rs` only plus this record and plan.

Observed one-shot B25 zoom behavior: fit once, then resize window or page navigation retains a scalar zoom and may clip the exact PDF. B26 adds selected «Вся страница» mode with frame-by-frame measurement of actual remaining PDF viewport after provisional guide. All manual zoom buttons disable automatic fitting. Project open resets mode. If PDF cannot fit at 20%, previous zoom is retained and a warning is displayed.

New `b26_fit_page_button_remains_selected_on_resize_and_new_pdf_raster` calls the production button with actual egui pointer events via `Context::run(RawInput)`, then reuses the production fit handler across logical window resize and new raster page dimensions; verifies manual-mode exit, fail-closed minimum and unchanged TeX. Existing B25 `UNIT_EVENT` 96 paths and source integrity checks remain unchanged. External XeLaTeX/PDF remains the sole precise renderer. Headless UI frames are **UNIT_EVENT/LAYOUT**, not physical GUI acceptance.

**Exact-head CI and independent desktop screenshot review: PENDING at commit creation.** Update handoff with actual head, run/job conclusions, not assumptions. D-owned X11 profile still needs to be recalibrated on this exact B HEAD. Physical Win10/M1/M4/IME/Retina/native dialogs NOT_RUN.
