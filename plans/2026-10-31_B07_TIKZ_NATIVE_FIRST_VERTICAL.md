# B07 — first native TikZ source-authoring vertical
Date 2026-10-31. Baseline main c5c8c1576b6288e1d125d558d0d4872b321efb86. B branch feat/b07-native-tikz-primitive-workbench-20261031.

## Owner priority and preflight
Read actual main SHA, AGENTS, app/core/extension APIs, B06 and C plans/insights and open PRs #25–#28, #31–#34. Prior B #16/#19/#20/#29 already integrated and not duplicated. Owner's new 2026-10-31 native-TikZ direction overrides old CAD/solver forecast in PR #32; #32 has NOT yet been revised. No TeX interpreter or independent geometry/CAS engine is being built.

## Scope
Permanent Split defaults to source left, exact XeLaTeX PDF plus separately identified approximate guide pad center, compact properties and Russian contextual help right. F1 and hover use one B-side ToolSpec table. Six real source generators: line, arrow, rectangle, circle, text node, cubic Bézier. Click/drag obtains a quarter-grid point (29 px/cm guide only), inserts one line into a single obvious tikzpicture, and selects its source line. Parameter Apply edits only a precisely recognized generated line. Save/reopen can reidentify tagged lines; undo verifies its exact source patch. Arbitrary macro code remains untouched and accessible.

C Registry supplies PGF/TikZ core installed status and XeLaTeX compatibility; a confirmed explicit usepackage is required. A missing package is NOT installed; when installed-but-not-loaded, user can inspect an explicit usepackage source diff, accept or undo. Single-page or arbitrary transformed PDF is never treated as a coordinate-calibrated canvas.

## C interface debt
Current C registry supports package metadata but no primitive generators; C04 audit deliberately forbids promoting manifest visual_features. B07 does not change C files or claim C adapter readiness. Via issue #4 requested a versioned C-owned primitive catalogue with syntax/type/unit/default provenance/primary section, package/library and build/load/edit states. The interim B-only table is a **single source** for toolbar/help/inspector and must be replaced once C delivers an accepted contract.

## Safety/architecture
External XeLaTeX remains source-of-truth renderer (Windows 10 x64 independently installed MiKTeX, Mac ARM external XeLaTeX). B07 no shell execution, core API change, font/theme coupling, universal parser or macro rewriting. Multiple pictures and changed/duplicated marker tags fail closed. Byte-exact source edits only on own inserted command or explicit preamble line. Unknown transformations can shift exact TeX coordinates relative to the crude guide and are not visually editable. Existing source can be viewed/edited as text even without an installed package.

## QA gates (not claims)
- Unit: six roundtrips, parameter edit and two-step undo, reopen, tampering, multiple-picture ambiguity, package diff and CRLF, unsafe parameter refusal.
- Rust fmt, tests, clippy on exact PR HEAD: PENDING/NOT_RUN until actual CI.
- Real XeLaTeX six-primitive fixture build, log and PDF hashes: NOT_RUN.
- Physical Win10/M1/M4 GUI screenshot, DPI/Retina, dialogs, keyboard/IME: NOT_RUN.
- PR #33 independent document external-edit conflict fix remains integration-owned. Check once merged.

## Next gate
Fix any exact-head CI failures in B branch without rewriting neighbor files. Then collect actual native screenshots and external XeLaTeX proof. Replace provisional B descriptors when C provides reviewed primitive catalogue/API; avoid recreating generic TikZ/CST semantics.
