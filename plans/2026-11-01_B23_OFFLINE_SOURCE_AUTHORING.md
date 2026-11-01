# B23 — TikZ source authoring when external XeLaTeX is unavailable

Date: 2026-11-01. Owner: B (egui). Target: existing draft PR #62 on current `main e28a3a4fb067a0a752d720cea484043d52beab00`.

## Reproduced UX / design error

The previous `Capabilities::base_ready` used `installed && engine_compatible && implemented` as the *write* gate for real egui pointer gestures and inspector insertion. Thus the first TikZ source command could not be created on a workstation where external XeLaTeX or `tikz.sty` had not yet been discovered, even though native C catalogue generation only needs verified project imports, ordinary editable text and a supported tool. An unavailable renderer must block any claim of exact PDF build, **not editing source**. This made the first vertical needlessly unavailable while configuring the independently installed MiKTeX prerequisite.

## B-only design

- Separate `source_authoring_supported` (native B handler exists) from `exact_build_prerequisites_verified` (external engine and local `tikz.sty` evidence). These predicates serve distinct purposes.
- Keep the **C/N2 project-import requirement** independently strict: `CONFIRMED` is required to create a command, while `ABSENT/UNKNOWN` keep insertion disabled. Do not edit ambiguous macro-driven preambles.
- Draw/write via the existing `Session::insert` + C catalogue `command` and revision-checked `SourcePatch`. No substitute TeX/CAS, new adapter or numerical engine.
- Expose Russian warnings about missing XeLaTeX and package evidence above the provisional guide; inspector also explains that PDF remains unchecked. Windows 10 MiKTeX stays an independently installed build prerequisite.
- Retain the exact PDF as read-only XeLaTeX output, not aligned to the provisional grid.
- Keep file ownership to `crates/tikzarium-app/src/tikz_canvas.rs` and B-owned `plans/insights`; do not change C/A/D/E/F/core.

## Real-handler regression

`b23_external_tex_absence_warns_but_does_not_block_native_c_source_gestures`: for all six TikZ native tools, two window widths (820/1366) and three external-runtime evidence gaps, exercise the same handler with `egui::Context::run(RawInput)` pressed/released primary-pointer frames. Verify owned ordinary TikZ source command, preservation of user macro, and exact Undo restoration. Total 36 scenarios; all are **UNIT_EVENT**, not physical GUI tests.

`b23_missing_c_adapter_or_unverified_project_imports_still_block_source_writes`: genuine RawInput press/release frames must *not* add a command when B handler is absent or C/N2 project import is unconfirmed. Neither action gains a visual Undo entry.

## Acceptance / integration handoff

Check `cargo fmt --check`, test, Clippy, Linux XeLaTeX N1, hosted Windows Server MiKTeX and actual app `UNIT_EVENT` tests on **the final exact SHA**, then hand off SHA + workflow URLs to integrator #48. No inference of physical Win10/M1/M4 acceptance. Real Linux/X11 six-gesture and GUI Build/Export screenshots remain independent #48 gates. Historical #37/#43 are not replayed.