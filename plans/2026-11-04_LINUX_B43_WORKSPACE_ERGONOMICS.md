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


## B43 follow-up: dismiss palette when editor takes pointer focus

The original long-Unicode X11 image shows the Geometry palette lingering above the drawing after returning to editable source. Implement actual source-TextEdit click dismissal without disturbing active tool, F1, TeX, CRLF, or Undo. Add a native egui pointer event test and require original X11 screenshot of the unobstructed center before acceptance. New run gates remain NOT_RUN/FAIL until exact-head jobs execute and artifact SHA/PDF/font evidence is independently inspected; previous `44e09cc0` workflow failures have **no step logs**, so do not infer a product defect from their red result alone.

## Original public Actions and X11 review — 2026-11-04

B42 original archive 13352791638 (sha256 fd5b5ef999bc6a90585c344ae004b0f15f39ff21bb5e0584ce094a7592f5521b): source/canvas/inspector visible, Unicode source readable, wrap ON→OFF, palette dismissed on source click, before/after source bytes equal. I61 original archive 13351594197 (sha256 9e241068ed1f895fad791b5ee89e075fc3b16d08d28baa2bd135f6d23fc8aa3b): six gestures/N2 real TeX/PDF passed, then source caret on the COMMENT row, hence generic F1 and missing completion; QA y coordinate and real selection validation repaired. Native CI rustfmt errors repaired. Exact HEAD rerun required; full N3 and Linux package still PENDING/NOT_RUN.

## Exact real soft-wrap OFF defect and correction — 2026-11-04

Previous exact HEAD `5db42b46`: full I61 Linux/X11 [41892350886](https://github.com/i-shutov/tikzarium/actions/runs/41892350886) SUCCESS (real six tools, N2/N3/Save/Open/PDF), but native CI [41892350956](https://github.com/i-shutov/tikzarium/actions/runs/41892350956) and D QA [41892351201](https://github.com/i-shutov/tikzarium/actions/runs/41892351201) FAIL at the same genuine UI wrap unit. Source was not changed, but `rows=[33,33]` revealed visual wrap OFF was ineffective; actual B42 original screenshot 03 vs 04 shows checkbox change without horizontal unwrapped line. Root cause: egui 0.33 TextEdit clamps desired width to available width. Correct production renderer with explicit LayoutJob/layouter infinite wrap width only in OFF mode and keep monospace editor semantics. Test must assert physical row count in OFF, more visual rows in ON and stable CRLF/opaque source/Undo/preferences. Rerun exact-head cross-platform Rust; independently inspect new B42 PNG ON/OFF, source/PDF/fonts and I61. No merge until confirmed.
