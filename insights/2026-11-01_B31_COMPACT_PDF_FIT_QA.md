# B31 QA — compact exact-PDF fit and zoom continuity

2026-11-01; B-only branch `b/b31-compact-xelatex-fit`; base main `06b62eea47591c7cb64b0a0cd0026fce8834c9e8`.

**Observed blocker:** after I36 accepted the B30 live X11 pointer/Undo/source workflow, a reviewed 1180×680 screenshot still showed **«Вся страница» cannot fit at 20%**, because the provisional guide and code panels consume the PDF viewport. This is a real UI display limit, not a compiler or source defect. See [I36 workflow](https://github.com/i-shutov/tikzarium/actions/runs/41280264391).

**Change:** whole-page viewport may select 2%–500%, only when page geometry really fits; manual +/- now use the same lower floor, avoiding an abrupt snap to 20%. The user is warned about poor readability in the tooltip; below 2%, UI continues to report inability to fit. No PDF/source coordinate inference, no TeX or C changes.

**Regression design:** a pure measured compact-viewport test asserts 1200×1700 raster fits inside 500×150 at ~7.4% and manual +/- are continuous. A real `egui::Context::run(RawInput)` layout test uses the production guide and editable TextEdit in split panels at 1180×680 and 850×560, confirms source unchanged, and verifies the geometry. Existing B25/B26 negative tests update from the obsolete 20% threshold to a genuinely unfit 2% case. All prior six-primitive gesture, source highlighting, F1, undo/Save-Reopen tests remain untouched.

**Evidence state at commit:** not yet compiled/tested at exact B31 SHA. Do not call UNIT_EVENT a physical desktop check. Need exact-head CI and independent X11 screenshot artifact review. Physical Win10 MiKTeX and M1/M4 external XeLaTeX NOT_RUN.

**Additional bounded finding:** 'Fit width' also falsely claimed success on a narrow central panel due to an independent 20% clamp and fabricated minimum 80pt canvas width. A new production `fit_width_zoom` uses real available width, allows compact 2–500% scales, returns `None` if truly impossible, and is exercised at 230pt/1200px plus negative 40pt/nonfinite cases. Added Russian hover explanation. CI needs rerun at amended exact SHA.
