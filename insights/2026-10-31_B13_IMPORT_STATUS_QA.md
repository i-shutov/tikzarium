# B13 QA ledger — distinct loaded/absent/unknown

Date: 2026-10-31. Independent B owner. Baseline main: `6d15d86344ab1281391d3ea1b458dc18ae443985`; parent B #50: `99cff2e19e87274590156cda2c1d3c43c5b97bee`.

## Observed defect and change

In the user-visible inspector, `Capabilities.loaded: bool` reduced C's three-way source evidence to `CONFIRMED` versus `UNKNOWN/ABSENT`. This obscures whether an explicit preamble patch can be safely proposed. B now stores C's `Evidence` directly and formats all three outcomes consistently. The installed status is still independent; no C API or TeX behavior was changed.

Source test cases: ordinary `\\usepackage{tikz}` -> CONFIRMED; valid `\\documentclass` with no import -> ABSENT; opaque command in preamble -> UNKNOWN. Test exercises `project_imports::inspect/status` through the UI's label/explanation contract; it is a Rust unit test, not an actual physical UI or source-to-PDF acceptance. Existing six gesture and document round-trip assertions are retained.

## Evidence discipline

Before B13, exact B12 `99cff2e19e87274590156cda2c1d3c43c5b97bee` had 5/5 workflows SUCCESS: Rust (3 jobs), D QA (7), N1 application-state→XeLaTeX (1), D06 real hosted Windows Server MiKTeX (1), font integrity (1). B13's exact-head checks must be read after the new code/docs commits; **PENDING** as recorded at authoring time, not inherited PASS. C #55 provenance API remains draft, not consumed.

Physical Win10/MiKTeX and Mac M1/M4, screenshots/IME/native dialogs: NOT_RUN. No claim of GUI integration PASS or PDF coordinate registration. Review C #55 after independent merge and decide whether to add source-token focus in a subsequent meaningful B vertical block.

## QA correction — exact initial HEAD failed formatter

Initial B13 source+docs HEAD `5fc2ebd1d48e5aa2f3564f745399d536131a12f2` **FAILED** `cargo fmt --all -- --check`, reproduced independently in [Windows Rust CI 41207631169](https://github.com/i-shutov/tikzarium/actions/runs/41207631169), job 124555857740, and [Ubuntu D QA 41207631067](https://github.com/i-shutov/tikzarium/actions/runs/41207631067), job 124555857559. Only diff: format `loaded: project_imports::inspect(...).status(...)` in app main.rs. No actual app Rust unit/event test or Clippy PASS is inferred from this failed job. Applied the exact four-line replacement requested by rustfmt at code commit `3673e3df9d3705292a92ea6c8a6f3e8447a8b99e`. The final docs HEAD after this note needs NEW exact-head workflows. Previous B12 PASS does not roll over.
