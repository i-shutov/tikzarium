# B12 — exact-main C/N2 and Alt pointer selection evidence

Date: 2026-10-31. Read `AGENTS.md`, current PRs (including #50 and I10 #54), N1/B09/B10 plans and insights; main `6d15d86344ab1281391d3ea1b458dc18ae443985`. Verified main `9b20edcd...`→`6d15d86344ab1281391d3ea1b458dc18ae443985` does NOT change the three B app source files; the only production source differences are C/N2 #51. This permits a merge-base-on-main reconstruction of only the seven existing B-owned #50 changed files, without touch to C/D sources.

## Findings and fix

- **C/N2 upstream regression was corrected in main #51.** The scanner retains literal positive package/library evidence before later opaque macros. The new B regression invokes the real C API through `requirements_status` and performs six catalogue-owned Session insert/Undo cycles in a fontspec/unicode-math + later macro preamble. Prior B10 N1 failure came from the old C scanner, not a false XeLaTeX PASS.
- **Alt gesture defect identified from production response flow:** B11 checked only `response.clicked() && modifiers.alt`. A pointer drag is not a click, so `drag_stopped()` could insert an unintended native TikZ primitive while the user intended read-only selection. Added Alt-initiated capture lasting through mouse release; a real `egui::Context::run(RawInput)` test releases the modifier before the pointer and asserts source equality, then performs a normal gesture. This is UNIT_EVENT only.
- B10 C/N2 visible diff/Undo, B11 numbered provisional markers and selection, F1, manual TextEdit invalidation, Save/Reopen, six gestures and source preservation remain in the same PR. No own generator or dynamic scope interpretation.

## QA classification

Code/diff review: performed. Local cargo/rustfmt: NOT_RUN (toolchain unavailable). Exact merged-head hosted CI: PENDING at authoring; record check URLs and failures after execution. Physical Win10/M1/M4 GUI/screenshots and native dialogs: NOT_RUN. Linux/X11 process-level I06 #48 is separate and cannot be inferred from UNIT_EVENT tests.

## Integration

The branch is updated by a non-forced Git merge commit with the old B head and current main as parents. The resulting PR compare with main must list only B app sources and B-owned plan/insight files. Verify main/branch lease before publishing and tell integrator exact SHA/checks. Never merge legacy #37/#43.
