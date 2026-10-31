# B09 — real egui pointer-event frames for TikZ-native authoring

Date: 2026-10-31; owner B; source main SHA `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49`, merged N1 PR #44. Isolated branch `feat/b09-egui-pointer-event-frames-20261031`. B07/B08 #37/#43 are not independently merged or duplicated.

## Purpose and owned surfaces

Test real egui `Context::run(RawInput)` event frames for the production guide handler: six native C-catalogue primitives with press/move/release, single-click node, selection and generated-source jump, exact source preservation, filesystem save/reopen, circle property edit, undo, F1 and manual source edit. The guide remains provisional and cannot claim PDF coordinate agreement. The PDF is produced only by external XeLaTeX (Windows 10 MiKTeX separately installed; macOS ARM external XeLaTeX).

## B-owned implementation

- `tikz_canvas.rs`: shared production `Response` handler and headless event-frame harness, guide-bound clamping of captured pointer release, F1 handler used by production UI and tests, cancel gesture when capabilities/dependencies are unavailable.
- `tikz_authoring.rs`: source-revision observer clears selected ownership and all visual inverse patches on external manual editing; undo also checks and invalidates stale external changes. C catalogue remains the only code generator and help owner.
- `main.rs`: egui `TextEdit::show().response.changed()` immediately informs the authoring session; F1 uses the same handler as the event-frame harness.

## Acceptance evidence and limits

Run `cargo fmt --all -- --check`, `cargo test -p tikzarium-app --bin tikzarium-app`, `cargo clippy -p tikzarium-app --bin tikzarium-app --all-targets -- -D warnings` on exact PR head. UNIT_EVENT exercises the actual egui event pipeline and the same production response handler, not OS windows or mouse hardware. Do not call this a Windows 10/M1/M4 native GUI PASS. Native dialogs, interactive source TextEdit selection screenshot, real PDF output, DPI/IME/Retina, MiKTeX and full integration remain separate QA gates. D owns CI and physical QA. No core/extension/CI modifications from B.
