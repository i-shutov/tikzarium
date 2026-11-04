# Linux-first UX iteration 1: N3 source-caret F1 readability and context hierarchy

Date: 2026-11-04. Based on the **original** hosted Linux/X11 I61 artifact [41835077376 / 13324913784](https://github.com/i-shutov/tikzarium/actions/runs/41835077376/artifacts/13324913784) at accepted N3 PR #98 exact head `5cbd1d0a7e9be05a72576f54c7791615c207b4c8` (merged `261b8223e2981a4de4a615c3385ca8506e7faee5`). This is a product usability edit, not a CI-only rerun or a second N3 implementation.

## Observed defect and evidence

The screenshot `43-n3-f1-catalogue-radius.png` in the **actual 1440×900 X11 root image** shows a 1366×768 egui application with editable `n3-source-parameter-crlf.tex`, literal `circle[radius=8mm]` and correctly selected Russian `radius` help. I independently read the original PNG and verified all 75 original entries in `i61-evidence/report.json` against their actual SHA-256 bytes. The original `figure.pdf` was rendered and inspected, and the original `pdffonts.txt` shows DejaVuSerif embedded with Unicode.

**UX failure A (readability):** the F1 right dock renders units, type, allowed values, provenance and five independent availability statuses as 12pt low-contrast run-on `ui.small` paragraphs in a narrow panel. It is hard to parse and impossible to scan statuses individually.

**UX failure B (context hierarchy):** after showing the correct F1 parameter result, the same Help dock adds a redundant generic `Справка TikZ / Выберите инструмент` block, wasting space and implying the source-caret command was not recognized.

## Implementation in one vertical

- Make F1 value semantics full-sized separate body rows: type, units, allowed values, editor preset vs TikZ default UNKNOWN; all C-owned, no new catalogue.
- Render five **independent** evidence labels as one localized row each, not a long concatenated small line. Preserve uncertainty; do not infer unavailable installations or PDF PASS.
- Hide only the redundant generic fallback **when** source-caret context was resolved; keep normal tool help otherwise, and retain library completion and search.
- Add a Rust regression for five statuses including explicitly unknown and absent. Update original exact-tree lease on I61 X11 smoke; keep all other gestures and source-byte safeguards unchanged.
- Run locked fmt/clippy/test on Linux, Windows and macOS plus original hosted GUI screenshots before accepting. Baseline status is **REAL_GUI_N3_PASS**, UX before/after acceptance is **NOT_RUN until new exact-head artifacts and image inspection**.
- Leave icon-group architecture, code pane, source patches and external XeLaTeX unchanged. This iteration does **not** imply a complete ergonomic release; further work still required for DPI, keyboard, panels, palette density, 1920×1080 and packaged desktop.

## Required acceptance

Exact HEAD CI and I61 actual source tree SHA must agree; in the re-captured `43-n3-f1-catalogue-radius.png`, parameter types and all five independent statuses must be visually readable, no generic fallback should appear beneath the recognized F1 result. The source, opaque macros, CRLF, six pointer tools, Undo, PDF/Unicode and native shortcut tests must all remain stable. Report actual pass/fail without elevating hosted X11 to packaged native Wayland or Windows10.

