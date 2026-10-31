# B21 QA — source caret placement via egui Galley

Date: 2026-10-31. PR #62, stream B. Baseline `main=add1df220402743f7e2f72db27b10b047c1a74e0`, previous `B=2034960b9bc303d5ab2447e239325f954f82e0ed`.

## Code review evidence
In `crates/tikzarium-app/src/main.rs`, source selection already used a UTF-8 character cursor range, but its subsequent vertical scroll guessed the screen Y-coordinate from physical line number and text height. This is not guaranteed to coincide with the actual egui galley layout, especially for long lines. The replacement scroll rectangle is derived from the **same rendered TextEditOutput galley** as the editor, in global screen coordinates.

## Regression design
New Rust `b21_source_navigation_targets_actual_textedit_galley_for_long_unicode_lines` runs two `RawInput` frames through `egui::Context::run`, with 340/820 widths and long Cyrillic content. It uses the production caret helper, maps the screen point back through the galley to assert exact character index, and checks source-byte invariance. This is `UNIT_EVENT` only; it is NOT an OS mouse/screenshot acceptance.

## CI and release limits
Exact-head CI status must be checked after this merge commit. Do not extrapolate former B20 5/5 PASS to B21. Legacy B16–B20 six native gestures, F1, inspector, Undo after manual TextEdit, and Save/Reopen remain in test suite. Real Linux/X11 #48 Cubic remains independently unresolved until retested. Physical Win10/M1/M4 smoke is NOT_RUN. The XeLaTeX PDF is authoritative; guide overlay is provisional.
