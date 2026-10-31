# I06 — evidence boundary and findings

N1 #44 provides a shared six-command catalogue, source edits, egui controls and generated-source XeLaTeX proof. Its accepted headless test calls the application's Session state, not OS pointer events. This leaves a distinct integration gap: actual window creation, layout, clipboard, focus and Save via keyboard.

I06 uses the normal app binary, X11, Openbox, software OpenGL and xdotool. Coordinates are deliberately test-profile data, not product API. A profile is valid only for a recorded app SHA/window geometry and must be calibrated from actual screenshots. Exact source bytes, owner IDs and PDF output independently determine success; visual assertions remain manual until inspected.

The initial default profile exercises only keyboard paste/save and captures F1. It does not claim six-pointer success. Linux TeX Live and Xvfb are hosted evidence only, not MiKTeX or physical Windows/macOS. Runtime settings are isolated below the output directory; no font files or user source is bundled.

Locally: Python syntax compiled and 5/5 unittest predicates passed. Rust toolchain unavailable locally; repository access only through connector.

## Actual desktop attempt 1
Exact head e9a192330c0d967fdb464cf556e4a693a2cb9dcc, run 41192241938, job124511204418: prerequisites, five Python tests and actual Rust GUI build PASS. Native process exited101 before a visible window: xkbcommon-dl could not load libxkbcommon-x11.so. Artifact13039530840 was downloaded; app.log and desktop-report.json confirm this failure and no screenshots/pointer execution. This is a hosted Linux runtime prerequisite defect, not a TikZ source failure, and would not have been discovered by cargo build alone.

Correction: install explicit libxkbcommon-x11-dev in the isolated test runner (supplies X11 runtime and library link). No app production code or user OS settings changed. Fresh workflow required; pointer/physical host acceptance remains NOT_RUN.
