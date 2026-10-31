# C/N2 — reversible literal preamble imports

2026-10-31. i-shutov/tikzarium only. Base main SHA ca90c2ee685e0c997d2d90a3ac60dab9e31fdb87. N1 #44 merged at 6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49. Old C07 #39 is not a merge base.

## Concrete vertical

The merged N1 catalogue remains the only definition of line, arrow, rectangle, circle, text/math node, cubic Bézier and help metadata. N2 scans source for literal usepackage/usetikzlibrary declarations, keeps installation separate from project loading, proposes a minimal visible diff and uses the existing SourceTarget/SourcePatch inverse Undo contract. It does not install packages, auto-run TeX or modify a package manager.

1. C public API: inspect, status, capabilities_for_tool and plan_import/ImportPlan::apply.
2. Strict source guards: literal preamble only; comments ignored, macro/conditional/indirect import UNKNOWN; fail closed if ambiguous.
3. Initial adapters: tikz package; arrows.meta, positioning, calc and fit libraries. Support explicit CRLF and Unicode source preservation.
4. Tests: declarations, 4 libs, duplicate, no-op, macro UNKNOWN, wrong revision/range, anchor conflict, inverse Undo, six-tool fixture.
5. B receives compact contract on PR #46. B owns visible diff, confirmation and Undo UI. D receives test/fixture contract; E/F untouched.
6. Gate at exact PR SHA: Rust fmt, check, tests and Clippy. Physical Win10 x64+user MiKTeX and Mac ARM64+user XeLaTeX remain independent NOT_RUN.

Full TeX/CST/solver/CAD/PDF inversion is not a prerequisite. Unknown TeX remains source-editable. If safe insertion is unavailable, surface a reason and do not edit.
