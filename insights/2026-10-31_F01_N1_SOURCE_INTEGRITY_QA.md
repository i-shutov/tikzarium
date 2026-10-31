# F01 — merged N1 source safety independent review and CI ledger

Date 2026-10-31. Fresh main `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49`, PR #44 merged; old PR #41 head `b610e0d32a9f9001b64f721058c6aa1b78bcb007` inherited the obsolete C07 #39 branch. Its existing 11 tests were useful but did **not** exercise the new typed `SourceTarget` planning API. The new F revision retains them, updates reload semantics, and adds six distinct public-API integration cases (17 total); no production file changes.

## Reviewed contracts (not a live GUI PASS)

- `SourcePatch::apply` checks exact revision and exact bytes in a validated UTF-8 byte range before replacing; its inverse is valid only for the next revision. `checked_add` protects revision and range overflows. The source's arbitrary other bytes remain opaque.
- `plan_parameter_edit` receives `SourceTarget { range, revision }`, checks exact regenerated command at that span, computes the smallest UTF-8-boundary subrange, and returns a patch. A stale *revision number alone* is not rejected during planning: the actual authority check is `apply`; the F tests distinguish these stages.
- Two equal generated commands may both be textually identical. Only a caller-authenticated span can pick the intended command. A manually moved command inside an unrelated macro must not be deleted by globally matching its text during Undo.
- On reopening a raw .tex, only source bytes exist. The C API does not persist owner metadata or edit history. The original F test applied a pre-save inverse to reopened text with a reused in-memory revision and thus risked implying persistent history. It now asserts a freshly initialized revision refuses that stale inverse, then demonstrates a **manual explicit source-range** edit can still restore the original file byte-for-byte.
- Merged B `Session::reset` clears undo state. B `owned` requires an exact regenerated command/marker match; manually edited owned commands fall out of visual management. B `Session::undo` checks observed whole-source bytes and uses inverse range, not global string search. Those facts come from source review / existing N1 app proof, **not** this F test's live invocation of Session.

## Adversarial cases and limitations

- Cyrillic UTF-8 with actual CRLF and unknown macros; prefix/suffix; six native catalog generators and six parameter edits through `SourceTarget`; stale/manual conflicts; byte offsets including the middle of a Cyrillic code point, reversed ranges, huge offsets and revision overflow.
- Duplicate identical commands and moving a generated fragment to a different TeX context must not make the old inverse delete unrelated user text. A revision-only rebase cannot confer new ownership.
- Consecutive edits and LIFO inverse revision rebasing still require exact-text validation. Automatic CST/solver/reverse-PDF mapping is neither offered nor tested.
- F tests call C's public API. They do not test pointer gesture coordinate mapping, F1/hover widgets, real app process save/reopen or exact PDF render. Existing app N1 proof is separate; Windows Server/TeX Live and Linux CI are not physical Windows 10/MiKTeX or M1/M4 GUI.

## Execution ledger

**Before this run:** F #41 test SHA `b610e0d32a9f9001b64f721058c6aa1b78bcb007`, base obsolete `feat/c07-tikz-native-six-primitives-20261031`. Rust unavailable in the current execution container. Previous old-head Actions failed with unformatted C Rust and failed prior to F test run; do not reuse old CI as a PASS.

**New branch:** one clean F-only commit parented directly to merged `main` (see updated PR #41 for exact new SHA). CI at the exact new HEAD determines PASS/FAIL/NOT_RUN; never infer green from #44. No production changes and no workflow modifications.

## Handoff

If exact-head F suite is green, stop F at this bounded gate, hand SHA + check URLs to the N1 integrator. Separate physical Win10/MiKTeX and macOS M1/M4 acceptance stays NOT_RUN. A red regression in managed history must be sent to B with original fixture, exact test and expected/actual behavior; do not weaken expectations or silently patch B.
## Later main/ancestry observation

Before final F handoff, main changed from merged #44 `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49` to docs-only #45 `ca90c2ee685e0c997d2d90a3ac60dab9e31fdb87`; no F-owned or shared generator/runtime files changed in this delta. Rebase the F-only six-file tree onto that updated main. This observation is not an F Rust PASS; CI of the final exact commit is authoritative.
