# N1 integration — one native TikZ catalogue from gesture to source/help/PDF

Date: 2026-10-31. Owner: main-thread integrator. Repository: i-shutov/tikzarium only.

## Exact inputs

- C07 #39 head f5e31c54604d567bcfd8c84eb84cbc7c1ad821ac: catalogue, generators, revision-checked SourcePatch and property-edit API.
- B07 #37 head 12bdd0840f197d3c46ba8817887fe1a8b6c196c2: egui desktop plumbing, selection/highlighting, source/preview panels, initial drawing interaction.
- Isolated integration/n1-tikz-native-authoring branch; do NOT overwrite either lane. Main moved after these snapshots; merge current main and any later B/C fixes only with reviewed diffs and fresh exact-head tests.
- Owner correction #32 is authoritative: no CAD/TeX/PGF interpreter, native TikZ commands, externally installed MiKTeX on Windows, code always beside drawing, required explanations.

## Delivered source changes

1. Remove the provisional duplicated B ToolSpec/code templates. Both app gesture and property inputs call C Catalog::generate; toolbar/help/parameter widgets read the identical C ToolSpec/ParameterSpec.
2. Six tools: line, arrow, rectangle, circle, text/math node and cubic Bézier. All parameter inputs come from the catalogue, including units, choices, editor preset vs TeX default, warning, example and manual section.
3. Explicit package/library checks at source level; arrow requires arrows.meta. Missing explicit declarations produce a visible preamble proposal and undo, NOT an implicit install or a claim that an installed file is loaded.
4. Source-owned commands store input metadata in a TeX comment; metadata is encoded to keep TeX special characters and comment separators out of it. On reopen, a marker grants authority only when the command regenerates byte-identically. Hand-edited commands and unknown macros remain opaque/source-only. Earlier B07 markers are preserved, not silently migrated.
5. Apply changes with C revision/old-text checked SourcePatch and a verified LIFO undo sequence. A manual buffer edit invalidates pending visual history instead of overwriting new source.
6. New n1-authoring-proof executable invokes the SAME Session code used by egui: six gesture inputs, source generation, save/reopen, circle parameter edit/undo, node text/math edit/undo and external-buffer conflict refusal.
7. New N1 CI compiles those actual generated files with external Linux XeLaTeX and checks PDF/text/fonts/source hashes. Static C fixture parity is verified using its compiled Rust generator, not a handwritten approximation.

## Six independent execution lanes

A: MiKTeX/core (#38); B: egui/source visibility (#37); C: shared catalogue/generator (#39); D: isolated real MiKTeX Windows QA (#40). New E: primary-source/help audit in separate help/qa and scripts/help_qa files. New F: additional source integrity tests in separate tests/fixtures files. Coordinator joins actual implementations. Six immediate task runs were requested; a request is not a completed run or proof of worker liveness.

## Acceptance gates — INITIAL STATE

- Code submitted: YES; local cargo/rustfmt: NOT_RUN (not installed in current sandbox).
- Exact-head fmt/check/test/clippy and N1 generated-source CI: PENDING.
- N1 artifact JSON/PDF/PNG readback inspection: PENDING.
- App source pane visible during every authoring operation: B #37 follow-up requested; do not accept read-only Canvas without code as drawing mode.
- Independent real Windows MiKTeX build of this integrated SHA: PENDING #38/#40 integration.
- Physical Win10/M1/M4, native pointer gestures, F1/hover, restart/themes and screenshots: NOT_RUN.

## Boundaries

The cm guide is not registered to a PDF coordinate system and does not interpret TikZ transformations. Other legal units remain source/property editable and are rendered by XeLaTeX. Literal preamble recognition is not macro expansion; absence of confirmation means UNKNOWN. Arbitrary existing TeX remains editable in the source pane and compileable. The product does not install or replace TeX, fonts or packages. New work must be a user-visible vertical result, not an indefinite series of defensive micro-PRs.

## Exact-head integration gate update

PR #44 provides the full N1 code to main via one draft integration PR. The first actual D matrix detected a deterministic *test harness selection* regression because N1 adds another Cargo binary. The narrowly scoped fix targets only `--bin tikzarium-app` while retaining every mandatory theme/font unit test. Previous checks for PR #44 at `1ffa195f8ca54805e021e87028fa91c117b7bf63` are not reused as post-fix PASS. The one-shot formatter workflow is removed from the integration branch after its completed formatting commit; regular fmt/check/test/clippy and real XeLaTeX workflows remain mandatory. No merge until **new** exact-head CI, N1 artifacts and main reconciliation are checked.
