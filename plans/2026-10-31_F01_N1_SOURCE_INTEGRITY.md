# F01 — independent N1 source-preservation integration block

Date 2026-10-31. Scope: ONLY i-shutov/tikzarium, new C extension integration test, two source fixtures and F-owned plan/insights. **Do not merge other workers' branches.**

## Exact provenance and coordination
- Current main read: 0aa78ae22df0ae84705ba461f017fce256325875. It diverges from C07; comparison: C07 is two commits ahead and main 21 behind, merge-base c5c8c1576b6288e1d125d558d0d4872b321efb86.
- Test branch qa/f01-n1-source-integrity-20261031 starts at the exact C07 PR #39 HEAD cc0e478d055824aecaa89a3b7b2d3b9ae4d51228; C07 tree e2da3c0ab70855d079c6ff3fc5535b83a1851201. PR #39 provides public Catalog::generate and SourcePatch::apply, no mocks.
- Read current main AGENTS, corrected TikZ-native roadmap, PR #37 B07 source editor, PR #38 A/W06 MiKTeX, PR #40 D06 fixtures and C07 plans/insights. This is a test-only dependent PR to the C07 branch; integrator decides how to cherry-pick/merge after C07.
- No changes to production crates, B/C generators, A build, D workflows or test expectations.

## Bounded integration suite
Run: cargo test -p tikzarium-extensions --test n1_source_integrity.
The 11 tests exercise six real generated commands, UTF-8/Cyrillic CRLF with untouched prefix and suffix, opaque comments/macros, inserted command at a zero-length range, stale revisions, same-span user modifications, invalid/out-of-bounds/inside-codepoint ranges, revision overflow, two identical paths with a targeted second occurrence, repeated source edits and undo LIFO with explicit revision rebasing, literal text escaping vs intentional math, and actual .tex fs::write/read_to_string/reopen + byte-exact undo.

SourcePatch checks the *caller-supplied byte range*, original substring and u64 revision. This is a source-edit kernel, not a parser or locator. A bad/ambiguous locator must be refused by the higher layer. Multi-step undo requires updating revision and possibly offsets: inverse from a prior edit MUST NOT be blindly applied after an intervening change. Tests explicitly verify refusal and safe rebasing only when the target text is confirmed.

## Exit gate
- Exact-head Rust cargo test, cargo fmt --all -- --check, clippy for crate; GitHub CI/Actions commit SHA, no inferred PASS.
- Fixture originals exact bytes, no preamble rewriting or XeLaTeX macros interpretation.
- Independent GUI pointer tests, MiKTeX/Windows 10, M1/M4 and PDF visual review are NOT_RUN in this lane.
- When tests pass, handoff the bounded suite to integration; do not turn this lane into speculative CST/DAG/solver development.
