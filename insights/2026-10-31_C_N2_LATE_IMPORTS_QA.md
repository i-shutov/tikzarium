# C/N2 late imports — exact evidence and QA ledger

Date 2026-10-31. Base main ab5705d4dd7e3dcefd3ef6ddfd695f6d0ee4dfd1. Independent C branch feat/c-n2-late-import-ambiguity-20261031. N1 #44, C #49/#51/#55 already merged; old #39 not replayed. Scope: C project-import recognizer, tests, own TeX fixture, C contract, plan and insight only.

## Observed bug before change

The C scanner recognized the preamble, stopped at begin-document, and assigned calc=Absent to a source where \usetikzlibrary{calc} appears after begin-document. This is a real executable case: TeX loads calc and then evaluates its "let \p1" coordinate syntax. The earlier planner could propose a duplicate import instead of acknowledging uncertain dependency provenance.

## Implementation and source contract

- Bounded read-only body scan after a recognized begin-document anchor detects targeted TeX control words: usetikzlibrary/usepackage/RequirePackage/input/include/csname. No macro expansion, TeX interpreter, CST or universal scene model.
- Whole-word boundary and escaped-backslash parity checks avoid obvious false positives; ordinary % comments are excluded. Verbatim-like occurrences may conservatively yield UNKNOWN; this is intentional rather than claiming Confirmed.
- Existing trusted preamble declarations remain Confirmed and keep the same read-only ranges. Missing dependencies become Unknown; begin_document_target=None and both connection/disconnection planners refuse with reason. No source mutation, package installation or compiler change.
- Same five independent capabilities; six TikZ primitives and their Russian help untouched. B can use existing three-way evidence and refusal UX with no type migration.

## Genuine local XeLaTeX proof

Fixture exact text committed under extensions/primitives/fixtures/late-library-in-body.tex. Local external Debian TeX Live 2025/dev XeLaTeX, command -no-shell-escape -interaction=nonstopmode -halt-on-error, exit 0; pdfinfo reports 1 page. Input SHA-256 d65e61f464b5afb5c1712a0c1143ff600a55a6bfca36dc55c6c1f8e80104e2ca; PDF SHA-256 e254a0655350494d2572ea68dfccd575110b97a0893aea5efc07abcdd969e1ce. This is a **local fixture compilation only**: not a Windows 10/MiKTeX or physical macOS M1/M4 test, nor visual egui editing.

## Rust tests and hosted gates

Added source regression tests for literal late library, external body input/include, dynamic csname, RequirePackage, commented/escaped/longer-control negatives, CRLF and existing positive preamble sites. Await exact-head cargo fmt/check/test/clippy and native N1 GitHub Actions. Local cargo/rustc unavailable; local Rust validation NOT_RUN. No hosted CI PASS asserted before actual job conclusion.

## Remaining limitation

Body-side arbitrary macro expansion cannot be resolved without executing TeX; unsupported cases remain source-only. The conservative scanner cannot distinguish runtime literal from verbatim text; it may refuse safe automatic edits rather than produce a false definite "not loaded". E help and F source tests belong to independent streams. B owns visible diff/confirmation/Undo; D owns independent native CI coverage.


## Initial exact-head CI failure and correction

PR #61 initial HEAD 9045b56d4f2c843454809606ac8531e624118236:
[Native Rust CI run 41212945414](https://github.com/i-shutov/tikzarium/actions/runs/41212945414) **FAILED** macOS and Windows Server at cargo fmt --check, before Rust tests. Retrieved job log 124571547263. Formatter requested only: remove one excess blank line ahead of the first new test, and wrap two long declaration_sites() assertions. Those exact changes were applied in C test code (commit 6e3173eca2896c3557c0e283b4e4ac9a78393d64). This is a correction, **not a PASS** until the subsequent exact-head CI is checked. TeX compilation evidence remains the independent local fixture proof, not the initial failed Rust CI.
