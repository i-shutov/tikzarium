# C07 integration continuation — param-specific source patch API

Owner scope: TikZ-native authoring, no TeX rewrite/CAS/scene solver. C-only change on existing C07 PR #39, not a new micro-PR.

## Real user workflow delivered to B
- Six schema-described commands already exist. Add C-owned plan_parameter_edit: choose command/property -> validate existing source and literal -> produce shortest byte-span patch -> revision-checked apply/undo.
- This avoids reserializing any existing .tex document and makes known-command property edits safe, even with unrelated macro text around the command.
- GUI keeps document revision and exact owned command range; C never discovers objects/gestures in unknown TeX. B binds this API after review.

## Acceptance
- Six tools: change a property, verify generated source and unchanged unrelated bytes, undo byte-for-byte.
- Stale revision, manually modified command, malformed dimension, unknown property, no-op and UTF-8 node content covered by tests.
- Full Rust fmt/test/clippy on exact PR SHA, generated fixture binary exact-byte check, real XeLaTeX fixture and negative cases in D CI. TeX Live local is not MiKTeX.
- Physical Win10+MiKTeX and Mac M1/M4 GUI acceptance remain NOT_RUN. No accidental promotion of package installation into source-loaded or visual support.

The source-bridge API is additive; no B/A/D files or shared ABI are modified. C07 CI red formatting corrected in preceding commit; new head QA_PENDING.
