# TikZarium 1.0 compact source + inspector — 2026-11-07

Release-gated UX block for [issue #125](https://github.com/i-shutov/tikzarium/issues/125), based on original native Linux I61 screenshots. This change is presentation-only and does not implement any new TikZ syntax, patching, PDF or CAD functions.

## Original problem

At 1366×768, long inline generator markers `% tikzarium:n1:...` wrap repeatedly, hiding editable `\\draw` code. Every Inspector parameter repeats its full help paragraph below the row, pushing later Bézier/node fields far under the visible viewport despite already pinned Undo/Apply controls.

## Changes

- New source default: **horizontal scrolling, no soft wrap**. A user can enable `Перенос` at any time; legacy persisted preference remains honored via `serde(default)`.
- The exact original TextEdit buffer is unchanged. A new *layout-only* job softly tones generated `% tikzarium:n1:` annotations but preserves the **identical source string and byte offsets** in every galley. No source filtering, truncation, insertion, replacement, escaping, or parser modification. Normal user comments are not toned. Undo/Save/Open/CRLF/opaque macros retain their original authorities.
- Parameter rows remain interactive. Detailed C-catalogue help is available through the new inline `ⓘ` popup and F1 instead of always consuming a full extra row. One pinned Apply/Undo bar remains above scrolling; the redundant lower Apply button is removed. Selected tool help is a one-line summary with full hover text.

## Validation and limitations

Added Rust tests for exact byte/CRLF/Unicode retention, marker distinction and parameter-row height. Existing source/edit/Undo/PDF, real egui API, Windows/macOS/Linux CI must remain green. Reinspect original native screenshot after merging to ensure the tool/source/guide/Inspector still fit compact windows and the full parameter help is accessible via mouse/F1.

This is a reversible UI presentation improvement, not physical owner Windows Server W2 or physical Windows10 W3 acceptance. Windows stable/installer remains blocked until real desktop tests.
