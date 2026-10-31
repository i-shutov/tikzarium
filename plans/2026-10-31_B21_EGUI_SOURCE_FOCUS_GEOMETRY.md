# B21 — source-focus geometry from real TextEdit galley

Date: 2026-10-31. Branch: `feat/b16-egui-live-palette-six-gesture-20261031`, PR #62. Base main before merge: `add1df220402743f7e2f72db27b10b047c1a74e0`; prior B HEAD: `2034960b9bc303d5ab2447e239325f954f82e0ed`.

## User-visible defect and fix
The production source navigation after selecting a visual primitive or pressing Undo highlighted the correct UTF-8 characters but then scrolled using `response.rect.top + (physical_line - 1) * monospace_row_height`. TextEdit's actual rendered layout can have padding, viewport scale, varied fonts and wrapped rows; this estimated scroll rectangle does not necessarily correspond to the highlighted source. B21 uses `TextEditOutput.galley.pos_from_cursor(CCursor)` + `galley_pos` for the ScrollArea target. The same precise character index continues to drive the selection; no source bytes are changed by navigation.

## Verification contract
- New `UNIT_EVENT` frames run real `egui::Context::run(RawInput)` at 340 and 820 logical pixels, with long Cyrillic source lines. The inverse galley cursor maps to the same target character index; navigation does not mutate source.
- Retain previous B16–B20 palette/gesture/F1/Undo/manual edit/Save-Reopen tests. Continue to rely on shared C catalogue for generation and help.
- Required gates: Rust fmt/test/Clippy, C/N1 exact XeLaTeX, D MiKTeX, font QA, and independent Linux X11 GUI when available. Report actual statuses on the final commit only.
- Still NOT_RUN unless independently proven: physical Windows10+MiKTeX, M1/M4, native file dialogs, IME/Retina and screenshot inspection.
- Preview and pointer guide are provisional. Exact PDF is external XeLaTeX. Do not infer PDF coordinate transformation.

No C/core/D/E/F file changes, no solver, TeX parser, macro rewrite or extra generator.
