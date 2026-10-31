# B14 QA — real Clippy failure, Escape gesture cancellation

Date: 2026-10-31. Target: i-shutov/tikzarium, lane B. Parent SHA `7b62d725cb11c0722fa7cab1f65aa122d1d0b47e`. Fresh main baseline `b2a1299d5660d04614c78ca696189dfab10e4f43`.

## Verified previous-head facts

- [Rust CI run 41207817946](https://github.com/i-shutov/tikzarium/actions/runs/41207817946): **FAIL** Windows Server and hosted macOS in `Clippy`, while Linux XeLaTeX fixtures succeeded.
- [D QA 41207817870](https://github.com/i-shutov/tikzarium/actions/runs/41207817870): **FAIL** Clippy on Linux, macOS, Windows Server; real XeLaTeX CLI jobs succeeded, post-job evidence aggregation skipped.
- Actual Ubuntu job `124556408086`: `error: function tikz_loaded is never used` at `crates/tikzarium-app/src/tikz_authoring.rs:238`, `-D dead-code`. This is not a formatting error, and B13 exact HEAD was **not** fully green.
- [N1 41207817988](https://github.com/i-shutov/tikzarium/actions/runs/41207817988), [hosted MiKTeX 41207817835](https://github.com/i-shutov/tikzarium/actions/runs/41207817835) and [fonts 41207817913](https://github.com/i-shutov/tikzarium/actions/runs/41207817913): success for parent SHA only. macOS/Windows app tests include the six-gesture and B13 evidence tests; Clippy still blocks acceptance.

## B14 implementation and proof classification

- Removed dead `tikz_loaded` adapter; tests now rely directly on C-backed `requirements_status` and `requirements_loaded`, preserving checked positive/negative cases.
- Escape cancellation added to the **production** egui pointer handler, with `drag_start.take()` after response drag-start bookkeeping and before event completion; cancelled gesture returns without a source patch.
- Added a headless real-`RawInput` test over all six tools covering press, move, Escape, release, next gesture, C generator and Undo. Classification **UNIT_EVENT, pending exact-head CI** — not a physical app screenshot and not an independently demonstrated XeLaTeX-rendered GUI gesture.
- No external TeX package installation, no C API changes or independent geometry engine.

## Next evidence gate

On new branch HEAD check Rust fmt/test/Clippy, D QA, N1 actual TeX/PDF, hosted Windows Server real MiKTeX, font integrity. Inspect log steps; record status by exact SHA in PR comment. Physical Win10/M1/M4, native dialogs, F1 screenshot UX, IME, Retina: **NOT_RUN**. B14 currently has **no claimed PASS**.

## Exact-head first run — actual rustfmt failure

Code HEAD `e79ea18b0536c37a33d23adb56bc82a5b207b2ee` **FAILED** `cargo fmt --all -- --check` in [D QA 41209544841](https://github.com/i-shutov/tikzarium/actions/runs/41209544841), Ubuntu job `124561457635`; hosted macOS Rust also flagged formatting. GitHub rustfmt reported exactly three differences: both `assert_eq!` expressions in `tikz_authoring.rs` must be multiline, and Escape condition in `tikz_canvas.rs` one line. Applied those three literal formatter changes without suppressions or test edits. New commit needs **fresh exact-HEAD** CI; do not inherit a PASS from the failed head. The previous Clippy failure `tikz_loaded` is independently repaired in B14 but remains subject to new CI.

## Second exact-head failure — C/N2 state is UNKNOWN, not ABSENT

The format-corrected B14 code HEAD `02251b92811ad8a2940e0e88ae10db95a7b3cd8a` **FAILED full workspace tests** in [D QA 41209673614](https://github.com/i-shutov/tikzarium/actions/runs/41209673614): [Ubuntu job 124561830235](https://github.com/i-shutov/tikzarium/actions/runs/41209673614/job/124561830235) and [Windows Server job 124561830265](https://github.com/i-shutov/tikzarium/actions/runs/41209673614/job/124561830265). Ten of eleven app-authoring proof tests passed; `library_activation_is_explicit_and_reversible` failed because a commented `\\usepackage{tikz}` **plus an explicit `\\usetikzlibrary{arrows.meta}`** yields C `Evidence::Unknown`, while the newly written assertion expected `Absent`. This is **not** permission to coerce UNKNOWN to ABSENT or change the C scanner. The existing source-first safety contract requires fail-closed. Changed only the test expectation to `Evidence::Unknown` and documented why. Source/protocol remains unchanged. New exact-head QA required; results on parent and merge HEADs are not inherited as PASS.
