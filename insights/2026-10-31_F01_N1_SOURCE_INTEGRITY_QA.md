# F01 — findings and acceptance evidence

Date 2026-10-31. Source basis: PR #39 exact head cc0e478d055824aecaa89a3b7b2d3b9ae4d51228, plus PR #37 B07 head 12bdd0840f197d3c46ba8817887fe1a8b6c196c2. Main read 0aa78ae22df0ae84705ba461f017fce256325875.

## Contract review
C07 SourcePatch::apply validates expected source revision and exact expected_old string within a caller-selected Rust UTF-8 byte range. str::get rejects out-of-bounds and non-codepoint-aligned ranges before replace_range, while checked_add protects revision overflow. It returns an inverse patch with the *next* revision. This is intentionally narrower than TeX parsing, not a guarantee of protection when a caller fails to increment its revision for an outside edit.

A critical integration rule follows: after intervening edits, previously returned inverses are stale. A safe undo stack must know how to rebase the source revision and range (or refuse); it must still check expected_old before applying. The F suite deliberately exercises both refusal and exact-text-verified rebasing. An editor must not simply treat a successful C unit test as proof that B's separate undo algorithm is source-safe.

## Separate B07 review finding for coordinator
B07 Session::undo() in PR #37 finds the unique occurrence of patch.after using source.match_indices and removes it from that global location. No stored source revision/range or structural ownership check is used at undo time. If a user removes the original generated line and moves an identical tagged fragment into an unrelated macro argument or comment, an undo can delete that unrelated occurrence. This is a source-authority risk; F does not change B production code. Send minimal reproduction to PR #37 and require undo to use an explicitly known range or fail closed. Avoid treating a comment marker elsewhere as ownership.

## Evidence vocabulary
Tests are independent compilation contracts for C public generator/patch API. They are not GUI tests and cannot certify direct mouse authoring, exact PDF or MiKTeX installation. Rust was not available in the execution container at authoring time, so no local Rust PASS is claimed. CI exact SHA must be inspected before acceptance. No Windows 10 / Apple M1 / M4 interactive session was conducted (NOT_RUN).

## F01 follow-up: hosted format check
GitHub Actions run 41188523198 on exact F commit 37ecaf06e06e00de155486ed5ffb271a011345e7: hosted macOS ARM64 and Windows Server fmt/check step FAILED because the original parent C07 at cc0e478 was unformatted and F test had six rustfmt differences. The independent C author formatted C07 in 5193f2, then added primitive_edit in f5e31; F adopted the C branch as a second Git parent without modifying its implementation. All six F-only formatting diffs are corrected according to the hosted rustfmt log. This is a format fix, **not** a Rust tests PASS; new exact SHA CI required.
