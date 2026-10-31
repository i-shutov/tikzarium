# B07 evidence and handoff (2026-10-31)

Baseline main: c5c8c1576b6288e1d125d558d0d4872b321efb86. Checked AGENTS, main, open PRs, C registry, B06 plans/insights. B PR scope: only crates/tikzarium-app, B07 plans/insights. No FlowBridge/WhereIsIt or other lanes.

## Executable work
- App-owned Rust model generates six native TikZ path/node forms and exact-tagged source lines, performs narrow patch/undo, rereads saved source tags, rejects changed/duplicate ownership and ambiguous pictures, and offers explicit package diff.
- Egui canvas contains separate approximate quarter-grid pad above existing exact XeLaTeX PDF, with toolbar and inspector, parameter Apply, generated code, Russian help and F1/hover. Source editor jump highlights selected generated line. Theme controls remain app-only.
- C provides existing installation/engine data. C does NOT yet provide a versioned primitive catalogue; its visual_features remains empty and compilation not verified. A separate C schema handoff was posted to issue #4; no C mutation.

## Evidence ledger
| Gate | Status |
| --- | --- |
| GitHub main SHA and AGENTS/open PR preflight | VERIFIED |
| Source code/docs/fixture committed to isolated B branch | COMMITTED, Rust quality not yet verified |
| cargo fmt / cargo test / cargo clippy locally | NOT_RUN: no Rust toolchain in execution container |
| Hosted exact-head GitHub workflows | PENDING until PR |
| Real fixture XeLaTeX/Poppler execution | NOT_RUN |
| Windows 10 x64 MiKTeX native GUI | NOT_RUN |
| Physical macOS M1/M4 GUI | NOT_RUN |
| Screenshots, PDF SHA, exact help section audit | NOT_RUN |
| C-owned primitive generator integration | BLOCKED by missing C schema, interim B table documented |

## Risks
Egui 0.33 APIs and fmt/clippy must be verified on CI, not asserted. Literal usepackage detection intentionally conservative; classes, aliases, dynamic source and multiple scopes remain source-first. The pad assumes 1cm vectors at origin but transformations/options can invalidate any PDF alignment; the label explicitly forbids interpreting it as exact. Source undo covers session-generated patches only; source edited manually after a patch may force refusal. Reopen selects exact generated tagged lines, not arbitrary TikZ.

Integrator handoff: review B draft after exact SHA CI and C issue coordination. D must distinguish hosted Windows Server/macOS CI from physical Win10/M1/M4 acceptance. Source-saving conflict protections are in integration PR #33, not B07.
