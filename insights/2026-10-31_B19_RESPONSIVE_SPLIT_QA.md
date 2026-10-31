# B19 — compact Split evidence and limitations

2026-10-31 · B-only source review against main `5f5a805005430ff26d3e3dd9c17c3ca3d7af9fa3` and draft PR #62 HEAD `9d523d909622218bf0e4dbca445977bf3291aa71` before edit.

**Reproducible structural issue:** `main.rs` declared `default_width(500.0)` for the left source pane, `default_width(250.0)` for the right inspector, and native `with_min_inner_size([850.0, 560.0])`. At the minimum width, fixed defaults leave about 100 logical points before panel spacing for the PDF/gesture centre, while `tikz_canvas` requests a guide of at least 180pt. This is a source-verified layout defect, not a fabricated physical screenshot.

**Change:** B19 allocates adaptive default and maximum source/inspector widths from available viewport width, reserving room for the centre while retaining actual resizable panes. One test drives actual egui 0.33.3 panel and guide handlers, including reverse resize using persistent context memory. The same C metadata continues serving palette and F1 help; no TeX/geometry engine or source-regeneration code was introduced.

**Verification status at commit:** new `UNIT_EVENT` test and existing B gesture/Save-Reopen/Undo suite submitted; CI must prove compilation and assertions on this *new SHA*. No local cargo/rustfmt available. Independent X11 real desktop and physical Windows10/M1/M4 GUI/screenshot/dialog/Retina/IME remain NOT_RUN; exact PDF is external XeLaTeX, guide provisional/unregistered.
