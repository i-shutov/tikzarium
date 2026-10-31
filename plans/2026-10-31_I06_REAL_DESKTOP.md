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

## I18 exact-head acceptance bridge (2026-11-01)

I06 remains the integrator-owned QA branch; production B22 lives only in draft PR #62. The isolated X11 job now builds pinned B22 SHA `3c6d76894b23397d252d771d985baa933d00723a` in a separate Git worktree and drives that **real executable** using I06 Python/xdotool; no B production source is copied into this PR. Review and update the pin if B HEAD moves. Both QA and tested source SHAs appear separately in the JSON report.

New source parser checks both legacy v1 hex and B20 compact v2 JSON (strict schema, unique positive integer IDs, six known tools, string parameters), splitting at the **first** ownership marker. The six-of-six gate and real Bézier controls must appear in on-disk source; original Unicode/user macro bytes remain unchanged. Cubic click moved to screenshot-derived (600,230), provisional until fresh screenshots. Build/Export and fonts remain conditional on actual PDF; passing offline unit tests is not GUI proof. Physical Win10/M1/M4 remain NOT_RUN.
