# B11 — Selecting previously authored N1 primitives in Split
2026-10-31 · owner B, app-owned files only. Consolidated with open B10 PR #50 atop freshly inspected main 9b20edcd2e1dedab228a4d0d96e969b0bf139a95. Do not merge legacy #37/#43.

Problem: the egui guide painted only the current draft. Existing N1 primitives were not recognizable/selectable by pointer. A ComboBox alone did not complete the drawing → select → properties → source highlight → Undo loop.

Implementation: paint muted provisional overlays for validated N1 source-owned shapes; number their literal cm start anchors. Alt+click chooses a unique marker via the existing Session::choose, returns actual line to Split source focus, never generates or changes TeX. Ambiguous overlapping markers fail closed; opaque macros, transformed scopes and other units remain source-first. Only C catalogue/generator produces commands; external XeLaTeX renders exact PDF.

QA: headless egui RawInput modifier + pointer press/release tests, source preservation and C parameter patch/Undo, overlapping-hit test; retain six primitive tests, F1, Save/Reopen. UNIT_EVENT is not physical Windows 10 + MiKTeX or Mac M1/M4 GUI. Check exact-head fmt/tests/Clippy and N1 proof separately. Known C N2 UNKNOWN-on-fontspec blocker remains upstream; do not mask it.