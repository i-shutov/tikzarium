# B28 — Focus-safe native Undo after real X11 failure

2026-11-01 · B-owned egui only · extension of the open B27 PR #69.

## Reproduced integration failure

Independent I26 GUI job [41267001529](https://github.com/i-shutov/tikzarium/actions/runs/41267001529) ran the actual Linux/X11 egui executable and persisted the first native line using the GUI Save button. It then held the next guide click and delivered Ctrl+Z, but the saved first line did **not** disappear. Its evidence explicitly reports \`B27 Ctrl+Z did not undo saved first line\`. The earlier B27 UNIT_EVENT tests omitted an auto-focused TextEdit, so they did not cover this real application state.

## Source-authoritative correction

A guide click/drag/Alt-selection capture takes precedence over stale source TextEdit keyboard focus when Ctrl/Cmd+Z is pressed. Without that capture, TextEdit retains its native Undo. On a successful visual Undo the event is consumed, because the source TextEdit is rendered later and a source jump may focus it in the *same frame*. No unknown macros, scope syntax or other TeX bytes are rewritten, and the C catalogue remains the only generator.

## Test and acceptance

Add a production-handler \`egui::Context::run(RawInput)\` regression with an actually rendered, focused TextEdit and a held guide pointer: six C primitives × two widths × click/drag = 24 timelines. Check source byte equality (including Cyrillic and opaque macro), consumed keyboard event, mouse-up never inserts a ghost and cancellation clears. Keep prior 48 B27 timelines plus source-edit native Undo coverage. These are **UNIT_EVENT**, not physical Win10/M1/M4 or a real X11 desktop run.

Retest hosted Rust/Clippy/XeLaTeX and ask integrator to rerun **independent I26 actual X11 GUI** on the new exact source SHA after updating its source-tree pin. Its old failure must not be called a PASS. Exact PDF remains from external XeLaTeX; Windows 10 MiKTeX is an independent prerequisite.
