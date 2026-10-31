# F01 — bounded N1 source-integrity handoff on merged #44

2026-10-31. Repository **i-shutov/tikzarium** only. F owns ONLY `crates/tikzarium-extensions/tests/n1_source_integrity.rs`, `fixtures/n1-source-integrity/`, and this F-specific `plans/` + `insights/` pair. No A/B/C/D production code or workflows are changed.

## Exact ancestry and replaced contract

- Canonical main read: `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49`, which merged N1 shared source/help/app Session in #44.
- Old F PR #41 HEAD `b610e0d32a9f9001b64f721058c6aa1b78bcb007` descended from obsolete C07 #39, not independently mergeable to main. Replace its head **only with an explicitly leased ref move** to one commit whose **single parent is canonical merged main**; retarget #41 base to main. Do not merge #37/#39/#43 or their implementation again.
- Public dependencies in merged main: `primitives::Catalog::generate`, `SourcePatch::apply`, `primitive_edit::{SourceTarget, plan_parameter_edit}`. The typed `SourceTarget(range, revision)` replaces the former separate arguments. The app's `tikz_authoring::Session` remains B/integrator owned and is NOT compiled or altered by this F crate-level test.
- Read AGENTS, merged N1 plan/insights and actual A #38 / D #40 PRs. All six tools are **native TikZ/PGF command generators**; external XeLaTeX/MiKTeX renders the PDF. No CAD/TeX interpreter is introduced.

## Executable, bounded acceptance checks

Command: `cargo test -p tikzarium-extensions --test n1_source_integrity`. **17 independent integration cases**, grouped as:

1. Each of six literal primitive generators (line, arrow, rectangle, circle, node, Bézier) replaces only a caller-selected range in a real UTF-8 Cyrillic CRLF .tex fixture; inverse restores byte-exact original, including opaque comments/macros.
2. Typed `SourceTarget` + `plan_parameter_edit` change one declared parameter for **each of six primitives**. Confirm the patch remains within the command span, the generated target is the exact catalog output, prefix/suffix/CRLF/unknown source are unchanged and inverse restores bytes.
3. Stale revision, manual edit of the expected command, invalid/reversed/overflow/out-of-bounds UTF-8 ranges, zero-length insertion, and u64 revision overflow fail closed where applicable. Planning validates known current command bytes; **revision staleness is enforced by SourcePatch::apply** against the authoritative revision, not by an invented global revision manager.
4. Two identical command strings: the exact **second** byte span changes, not the first textual match; after a moved fragment is inserted into an unknown macro, a stale inverse and even a revision-only rebase fail at the old range. A global string search is explicitly forbidden.
5. Consecutive edits have LIFO undo with verified range/revision rebasing; text node escapes special characters, whereas explicit math mode intentionally keeps user math TeX.
6. Save/reopen of a real .tex with Cyrillic filename and CRLF preserves bytes. A **freshly loaded buffer does not inherit the previous process's undo revision/stack**. Only caller-confirmed byte-exact current ranges can be edited. F does not grant managed visual ownership to an arbitrary matching string.

Two pre-existing fixtures: `opaque-crlf.tex` and `duplicate-lf.tex`, retained as original Git blobs without checkout normalization in the test. Tests do not require a live TeX installation.

## Important layer boundary: source vs managed visual history

- C `SourcePatch` cannot identify a TikZ object. It only protects explicit UTF-8 byte range, expected_old bytes, and revision. Caller MUST manage ownership, full-buffer change observations and range provenance.
- B `Session::undo` in merged #44 uses a previously stored LIFO inverse, checks the full observed buffer and invokes C `SourcePatch::apply` at its original range. No global-string lookup should ever be used for undo.
- B `Session::reset` starts a new empty undo stack; B `owned()` only recognizes persisted markers after exact regeneration. This contract is **code-reviewed**, not claimed as independently executed B GUI by the F extension test. F may send an actionable red-test reproduction to the B lane if it finds a flaw, but must not modify B files.
- A source file containing arbitrary unknown macros is always source-editable but is not automatically a visual object. After reload, the F test's explicit user-selected byte span does not imply GUI ownership.

## Verification and stop condition

Accept only exact-head green hosted Rust checks: `cargo fmt --all -- --check`, `cargo test -p tikzarium-extensions --test n1_source_integrity`, crate tests and `cargo clippy -p tikzarium-extensions --all-targets -- -D warnings`, plus review of actual workflow conclusions and SHA. Current sandbox had no rustc/cargo; **LOCAL_RUST=NOT_RUN**, no fictitious PASS. Physical Windows 10/MiKTeX and Mac M1/M4 GUI pointer, F1 and PDF appearance remain **NOT_RUN**.

After bounded suite passes, hand off the exact commit/PR to the integrator and stop expanding F scope. Do not merge others' changes or declare a desktop release.
## Main advancement during F preparation

Main advanced after #44 to `ca90c2ee685e0c997d2d90a3ac60dab9e31fdb87` via docs-only #45 (CHANGELOG + N1 plans/insights; no C/B API changes). The F-only PR #41 commit is now parented to this **fresh** main via an expected-head force-with-lease; older C07 ancestry is not carried. `#44` remains the public API source. CI must use the new exact F HEAD, not an earlier intermediate commit.
