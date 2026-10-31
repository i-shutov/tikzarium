# I06 — actual desktop process, not just Session unit tests

Base: N1 accepted merge `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49`.
Owner: foreground integrator. Changes limited to a new workflow, new Python driver/tests and I06 documents. B owns egui event tests; D owns genuine Windows MiKTeX #40; neither is duplicated or overwritten.

## User-visible scenario
Launch the real compiled egui executable on an isolated X11 display. Paste a Unicode TeX document through the clipboard, select its destination through GUI, press Save, and verify exact source bytes. Preserve actual screenshots. Then calibrate a SHA-specific coordinate profile using observed screenshots and perform native pointer gestures for six primitives, save and check command metadata and untouched user macro bytes. Compile/export through the GUI and verify an actual PDF, not a fixture written behind the application's back.

## Gates
- [x] Executable driver with process/PID matching, bounded tool calls, isolated preferences, actual X11 input and screenshots.
- [x] Five offline evidence-predicate tests pass locally; they do NOT prove GUI operation.
- [ ] Hosted actual GUI launch/paste/save and screenshot inspection (PENDING exact-head workflow).
- [ ] Calibrated pointer profile, six gestures and genuine GUI compile/export (NOT_RUN at bootstrap).
- [ ] Native Windows10+MiKTeX, Mac M1/M4 (NOT_RUN; Xvfb cannot substitute).

Bootstrap status can be PASS_BOOTSTRAP_ONLY, not authoring PASS. F1 event sent alone is not verified help visibility. A failing coordinate or missing window must fail with captured evidence, not a synthesized screenshot. No OCR and no assumed GUI pixel results.
