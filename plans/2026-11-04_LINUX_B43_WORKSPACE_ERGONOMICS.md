# Linux B43 — responsive source, canvas and inspector

Decision 2026-11-04: Linux desktop x86_64 full release first, shared Rust/egui and external XeLaTeX/MiKTeX paths for Windows 10 and macOS ARM maintained. N4 deferred.

## Product defect and change

The accepted #99 screenshot improved F1 but long source lines and full absolute path still crowded the narrow three-panel workbench. The previous split maximum estimated the right dock but not the *actual* 62pt icon rail. At a minimum 850pt window, resizable code could steal central canvas width.

- After laying out right inspector and left tool rail, recalculate the resizable source panel's maximum from live available space, reserving 260 logical points for central canvas when the viewport allows. Preserve manual resize and minimum 240pt source. Below native minimum best effort; no fraudulent guarantee.
- Source header short filename, full path hover and visible dirty indication.
- Persisted source display-only wrap ON by default, explicit ↵ Перенос checkbox in the editor; OFF restores horizontal scrolling. TextEdit galley changes, not .tex bytes, user macros, CRLF, revision, F1 caret offsets, Undo or PDF.
- Keep C catalogue, six native gestures, libraries and independent statuses, external no-fallback XeLaTeX and cross-platform paths unchanged.

## Acceptance (NOT YET RUN on this candidate)

Rust 1.91 locked fmt/clippy/test Linux+Windows+macOS; actual egui rows and width at 850/1000/1366/1920; save/reopen/Undo/unknown source; genuine Linux/X11 1366×768 screenshots both wrap modes, path-on-hover, F1 on a long line; exact authored source and external XeLaTeX PDF glyph/font and SHA artifacts; if possible a 1920×1080 screen. Separate native Linux release packaging and Wayland remain NOT_RUN.

No merge without exact-head evidence, real visual evaluation, and expected_head_sha. Keep all fixes in the same substantive integration PR. 

## Native evidence path for changed layout

Existing B42 X11 bootstrap now captures the actual 1366×768 workspace and a third screenshot after an overlong Unicode/opaque TeX clipboard paste, without assuming previous button coordinates. It records NO unverified toggling, PDF, six tools or manual image PASS. Review the PNG and measured source/canvas/F1 positions, then update the *existing* I61 source-tree SHA/real event coordinates within this PR and execute the full source-to-XeLaTeX acceptance. This staged change explicitly preserves fail-closed I61 while GUI coordinates are unreviewed.

## Real X11 layout and CI recovery

On original 1366×768 X11 app image from run 41862999794, editor ≈479px wide, central canvas ≈507px, inspector ≈298px; source wraps long Cyrillic text. Header's `↵` wrap glyph and `●` dirty glyph appear as missing-character boxes, so replace both with plain Russian words. Existing B42 bootstrap adds actual after-click screenshot plus raw clipboard source byte-integrity check; it does not replace full I61 PDF/gesture evidence. Exact failed rustfmt changes applied and I61 tree lease synchronized to the real app source tree; new exact-head acceptance and visual re-review remain required.
