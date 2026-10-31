# GUI QA B08 — native TikZ via shared C catalogue

Status as of 2026-10-31: test design / NOT_RUN on physical Win10, M1, M4. This is not a screenshot result.

## Expected walkthrough

Launch with the user's external XeLaTeX configuration. Open a scratch project that explicitly loads tikz. In Split mode ensure three adjacent areas are visible: source editor, exact XeLaTeX PDF (read-only) with a separately marked *approximate* guide pad, and compact inspector/help. Draw a line, rectangle, circle, cubic Bézier, and text/math node by click/drag. After each action inspect the inserted TikZ command in source and selection highlight. Modify known numeric parameters, click Apply, Build with external XeLaTeX, check PDF and Undo, Save/Open, compare all unrelated source bytes.

Arrow is a distinct negative/positive test. With tikz installed and explicitly loaded but no arrows.meta, the Arrow tool must explain its unavailable state and provide the exact proposed \usetikzlibrary{arrows.meta} preamble insertion. Approve it, insert arrow, change its tip Stealth/Latex, Undo source edit, Undo library addition. Other tools must remain available without arrows.meta. Do not confuse availability of .sty files with project imports.

In F1 help and hover for each tool inspect the SAME C ToolSpec used by the toolbar; inspect all exposed C ParameterSpec values: TikZ syntax, kind/type, unit, permitted enum, editor preset vs verified PGF default (or UNKNOWN), Russian explanation, effect, example, warnings and manual section. Switch node between escaped text (e.g. Привет_мир) and user-entered math (e.g. \alpha+\beta); verify source string and real PDF.

Manual direct Source changes and unknown macros must be preserved byte-for-byte, invalidate visual undo safely and never become a new visually editable object. Reload recognized B08 commands, edit known ones only. For multiple tikzpictures or opaque transforms the guide must not pretend to map to arbitrary PDF geometry.

Check Light/Dark/Midnight/Paper and compact/comfortable persistence separately from unchanged TeX/PDF. At 1366x768 and Retina capture full-window screenshots. Check toolbar, hover, F1, file dialog, Unicode Windows/macOS paths, keyboard shortcuts and IME Cyrillic. Mac M1 and M4 require separate physical QA; hosted macOS ARM jobs are build evidence only.

## Evidence slots

- Exact B08 SHA and cargo fmt/check/test/clippy logs: PENDING.
- C07 catalog dependency exact SHA and generator fixture parity: PENDING.
- XeLaTeX six-primitives manual Linux fixture and PDF visual: PASS, SHA in insights.
- Self-contained repository fixture and CI: NOT_RUN until workflow.
- Windows hosted and macOS hosted app tests: PENDING.
- Physical Windows 10 + separately installed MiKTeX / Mac M1 / Mac M4: NOT_RUN.
- Screenshots, actual GUI drag + save/reopen/undo and accessibility at both densities: NOT_RUN.

Do not label the B08 PR merge-ready until exact-head tests and integration review pass.


A local exact-text copy of the B08 checked-in six-primitives ASCII fixture was separately compiled by Linux XeLaTeX with no-shell-escape: PASS exit 0, one-page PDF and visual raster inspection. Source SHA-256 278c9219a27d4e49bf9178de3d238fe3fdcaf5f6b6c8e78dae53ade7f1fe5eba; PDF SHA-256 ece7edf94a03bfd445427813a59244276d9ab77b016b0c610c004e1154db9883. This is source-level verification, not GUI acceptance or compiled C generator parity. B08 Rust CI on ceab19a9 is blocked by C07 malformed source; no app CI PASS or physical GUI PASS claimed.
