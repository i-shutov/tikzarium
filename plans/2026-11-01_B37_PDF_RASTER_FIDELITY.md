# B37 — PDF-focus raster fidelity and stale-fit feedback

2026-11-01. Owner B egui, same draft PR #79 over accepted main `95b9ecb0f7183de7eb3864468a35b474b49042b8`; no #37/#43 replay. Independent I51 exact B36 real Linux/X11 [run 41330287961](https://github.com/i-shutov/tikzarium/actions/runs/41330287961) verifies the six native C-driven TikZ gestures and PDF-focus buttons but manual compare of actual screenshot `05b-b36-pdf-large-candidate.png` with same-run exported PDF reference `04-pdf-reference.png` reveals missing left/bottom rectangle edges, dashed Bézier/circle and a stale top bar “even at 2%” error despite a fit at ~26%.

## Correctness intervention

The original Poppler PNG texture is downscaled by the GPU with `egui::TextureOptions::LINEAR` without a multilevel footprint filter. The new B-owned asynchronous Lanczos-3 quarter-resolution *raster preview* is prepared in a worker after the full source PNG is decoded, uploaded as a separate texture, and selected only under 38% zoom. The layout size and Fit Page calculations still derive from the original full PNG and original PDF; no PDF rewrite, coordinate inversion, CAS, own TeX engine or source mutation. Full-resolution texture remains available immediately and at larger zoom. Worker replies carry PDF epoch+page identity and are discarded after document/page changes. No blocking resize in event handlers.

The fit-space warning is now a **local current-frame PDF pane warning**, never written into persistent Build/Save status. A successful refit removes the warning; the top bar continues to report the relevant source/build action.

## Evidence and acceptance

B37 tests: synthetic four-stroke PDF-like raster verifies continuous antialiased coverage after minification, async epoch/page receipt; a real `egui::Context::run(RawInput)` frame exercises production full/LOD image selection in Split with editable source and original on-screen geometry. Existing B36 toggle test, six pointer gestures, parameter/F1/highlight, held Undo after manual source edit, UTF-8/CRLF, Save/Reopen and external XeLaTeX tests remain mandatory. Use `cargo fmt --check`, strict Clippy, `cargo test --locked`, N1, fonts and hosted MiKTeX gates.

**Independent D-owned I51 real X11 must repin to B37 app/src tree, visually compare the same PDF raster crop/rectangle/circle/Bézier and stale-fit message, retain all prior safety checks.** Automated PASS alone is not fidelity acceptance. Physical Win10 + separately installed MiKTeX and Mac ARM M1/M4 remain NOT_RUN.
