# B08 — C-catalogue-driven TikZ authoring (stacked on C07)

Date: 2026-10-31. Independent B owner: crates/tikzarium-app. Base: C07 draft PR #39 exact SHA f5e31c54604d567bcfd8c84eb84cbc7c1ad821ac; B07 prototype PR #37 exact SHA 12bdd0840f197d3c46ba8817887fe1a8b6c196c2. The B08 branch intentionally transplants only B07 files over C07 so integration has one reproducible contract. This does not merge C07 or B07 into main.

## Scope and source authority

- Use C's Catalog::bundled(), C ToolSpec/ParameterSpec, Catalog::generate and SourcePatch, not an independent B syntax/help table. The six B gestures map to C stable IDs tikz.line, tikz.arrow, tikz.rectangle, tikz.circle, tikz.node and tikz.bezier-cubic.
- The permanent Split mode keeps source, *separately labelled approximate* pointer guide and exact XeLaTeX PDF simultaneously visible, plus a compact C-backed inspector/help (F1 and hover). Only generated B08-marked commands can be reselected for visual editing. Unknown TeX/macros remain source-editable, never normalized.
- Generated coordinates are explicit cm literals. Arrow tips come from C's verified allowed choices and require project \usetikzlibrary{arrows.meta}; node content offers C text escaping and explicit raw TeX math. Cubic curve controls are generated through C from the B pointer bend preset; no independent TeX/geometry engine.
- Installed PGF/TikZ, loaded source preamble, engine compatibility, B visual support, and library loaded are distinct states. Display the explicit \usepackage{tikz} / \usetikzlibrary{arrows.meta} proposed diff and let the user apply/Undo; no MiKTeX global settings change or package installation.
- Application records source fingerprint and source revision, applies minimal UTF-8-safe C SourcePatch, refuses unexpected changes and invalidates transient undo on direct Source edits. Code from unfamiliar transformations is not reverse mapped. C-owned parameters keep editor preset provenance (not PGF defaults).

## Integration limits

This is a **stacked draft on C07**, not safe to merge independently before the C Rust generator passes CI. B07 #37 is superseded only after an integrator checks B08's source parity and exact-head CI. A owns MiKTeX/XeLaTeX runner and no core API was modified. D owns independent physical-host QA.

## Acceptance — code vs evidence

1. For all six tools: mouse gesture/pointer draft -> C generator -> immediate selected source command -> parameter inspector -> source-range patch/Undo -> save/reopen, without changed unrelated macros/comments.
2. For arrow: installed package alone does not imply project-loaded arrows.meta; offer a visible reversible preamble change before enabling insertion. Text/math node parameter controls and help are C-owned.
3. F1/hover/inspector obtain all six tool descriptions, 28 parameter explanations/default provenance/units/sections from one catalogue.
4. Actual local Linux XeLaTeX compilation of a **manually assembled matching syntax fixture** passed (2026-10-31), but generated-output byte parity, GUI interaction and physical desktop acceptance are NOT_RUN. Refer to B08 insights.
5. Rust formatting/compile/test/Clippy and CI on the **final B08 SHA** are required before merge; successful CI on C, B07, or a different SHA does not establish B08 PASS.
6. Physical Windows 10 x64 with separately installed MiKTeX and physical macOS ARM64 M1/M4 are separate NOT_RUN gates. Hosted Windows Server/macOS builds do not replace screenshot, DPI/Retina/IME/dialog checks.

## Blocking/recovery

C07 must be exact-head CI green; C source currently has suspicious malformed math escaping in the fetched primitive generator. B does not patch C-owned code. If B08 CI diagnoses C failure, report to C PR #39 with exact lines instead of hiding it; do not alter C code in this B branch. Preserve original B07 until the stacked approach is independently accepted.
