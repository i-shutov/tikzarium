# B27 QA — source Undo vs held pointer capture

2026-11-01 · Scope B egui only; source is `main@529217b89e83ffb93393eefb99a2a6ff07967c13` before B27.

## Code inspection and reproduction mechanism

`handle_visual_undo_shortcut` is executed before the production guide in `TikzariumApp::update`. Previous `Session::undo` popped a valid inverse source patch and synchronized the source but did not invalidate an active `guide_pointer_armed` or `drag_start`. The next guide release could create a fresh C primitive, contradicting the Undo intention.

B27 adds capture invalidation only after a successful source Undo and leaves source patches/unknown TeX untouched. New test `b27_keyboard_undo_cancels_held_guide_capture_without_ghost_insertion` exercises the exact handler order with actual egui events for 48 scenarios and verifies fresh pointer usability, later Undo, untouched Cyrillic and opaque source.

## Results at authoring

Code and event-frame test added. `UNIT_EVENT` and all other CI tests: PENDING exact-head hosted run. No claim of physical Win10 or Mac M1/M4 execution, native IME/Retina/dialog QA, calibrated PDF coordinates or TeX engine replacement. Independent Linux/X11 B26 acceptance is historical evidence and cannot prove B27. External XeLaTeX/MiKTeX remain prerequisites for final PDF only. Record exact SHA/checks in PR and integrator handoff after GitHub workflows report.
