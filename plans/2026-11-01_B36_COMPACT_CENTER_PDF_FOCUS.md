# B36 — Split center focus for a usable compact exact PDF

Date: 2026-11-01. Owner: B egui only. Exact base main `95b9ecb0f7183de7eb3864468a35b474b49042b8` (B32–B35 PR #75 merged). Do not replay #37/#43/#44. Changes are B-owned main.rs and this plan/insight only; shared C catalogue, A runner, D acceptance scripts, E help and F source integrity unchanged.

## Reproduced UX limitation and chosen intervention

Independent real Linux/X11 I46/I47 review in PR #75 notes the 1180×680 split workspace shows only about 70px of exact PDF below the fixed-height provisional TikZ drawing guide, forcing an unreadable ~7% whole-page fit. The previous B31 fit correction is mathematically truthful but cannot solve lack of screen space. Do not falsely scale or claim aligned PDF coordinates.

Provide two explicit CENTER modes **inside Split only**: **Рисовать TikZ** (default; shared C-backed six native pointer tools and visible editable source) and **PDF крупно** (temporarily hides the provisional guide, not the source or inspector). Entering PDF focus selects whole-page fit against the newly available center viewport, and invalidates any unfinished pointer gesture without modifying source/Undo. Switching back resumes the same C tools. Canvas-only button to return to drawing explicitly resets PDF focus. The exact PDF is always the external XeLaTeX output; the guide remains provisional and uncalibrated.

## Acceptance

One B-owned `egui::Context::run(RawInput)` UNIT_EVENT uses production center-mode buttons, actual Split inspector + editable TextEdit and production `show_guide` at 1180×680. Real pointer press/release switches to PDF and back; verifies enlarged center PDF viewport and fit, visible source panel, unchanged UTF-8/CRLF + opaque macro bytes, no new visual Undo. Existing six-gesture/Alt/F1/parameter/Undo/Save-Reopen tests must remain green. Require hosted `cargo fmt --check`, strict Clippy and `cargo test --locked`, actual independent X11 screenshots before GUI acceptance. Physical Win10/MiKTeX and ARM M1/M4 remain NOT_RUN; do not treat UNIT_EVENT or hosted runner as physical device validation.
