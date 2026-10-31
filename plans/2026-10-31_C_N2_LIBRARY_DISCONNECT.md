# C/N2 — literal library disconnect, completing source transaction half of N2

Date 2026-10-31. Base main 97c4b44eeee7ac84ba85f789269c3e15a9f528e4 (#49 C/N2 imports merged). Reviewed AGENTS.md, live PRs (#50 B integration, #48 GUI process), C/N2 plan/insights and the six-tool N1 shared catalogue. Old #39 not transplanted.

## Rationale and bounded vertical

N2 project-library acceptance explicitly requires **connecting and disconnecting** libraries with visible diffs and reversible Undo. Merged C #49 only offered connection; B #50 integrates its visible connect UI. This C-owned change adds the *other source half*, without editing B UI, A build, E help or F source tests.

1. Keep project_imports::{inspect, plan_import, ImportPlan} and five independent capability states unchanged. Share only its already-tested targeted literal token helpers internally within the C crate.
2. Add project_disconnect::{plan_library_disconnect, DisconnectDecision, DisconnectPlan} for arrows.meta, positioning, calc, fit. No implicit plugin/package removal.
3. A confirmed, unambiguous direct declaration may be removed. Standalone one-item physical line is deleted with its existing newline. Shared literal comma-list edits only the target token and necessary delimiter; other entries survive intact.
4. Refuse duplicate active declarations, inline comments on the selected declaration, unknown macro/conditional preamble, malformed or mixed line endings and wrong source anchor. Source remains authoritative; the reason belongs in B's UI.
5. Require exact caller source revision and original bytes on apply. Return shared SourcePatch inverse for undo. Do not attempt TeX macro expansion, CST, geometry solver, PDF decompilation or compiler changes.
6. Test source snapshots, LF/CRLF, Cyrillic/unknown body, all four libraries, duplicate/opaque refusal, middle-of-list byte minimality, stale revision/anchor and undo conflict.
7. Give B an additive contract in PR #50; B owns visible disconnect diff/approval/undo, not C. D can generate XeLaTeX fixtures and independently validate the source transaction. No physical Win10/MiKTeX or Mac ARM result claimed.

## Gates

- Exact-head Rust fmt/check/test/clippy and existing N1 XeLaTeX regression: consult GitHub Actions, record real outcome in insights.
- B PR #50 remains independent; merge only after its own review and CI. This branch changes no B code.
- N2 UI disconnect acceptance remains NOT_RUN until B implements a visible user action.
- Physical Win10 x64/MiKTeX, M1/M4 XeLaTeX GUI: NOT_RUN.
- Source without safe literal range must show reason and stay unchanged.


## Integration correction: C literal positive evidence (N1 → N2)

B #50 exposed an actual N1 authoring regression: a source containing explicit TikZ imports, fontspec/unicode-math font declarations and a later user \`\\newcommand\` was globally UNKNOWN, blocking all six tools. This is not a TeX compilation failure. On this same C PR, refine only C's literal observation contract: safe flat font-setting lines are import-neutral; direct imports in a trusted prefix are CONFIRMED despite opaque commands later; missing imports remain UNKNOWN, and all automatic patches continue to refuse if there is any uncertainty. An earlier conditional/opaque macro must not cause later imports to be called confirmed. Add LF/CRLF real N1-shape and negative conditional tests. Re-run exact-head Rust and genuine N1 app→XeLaTeX CI before merge. B consumes C public statuses; no app/core/CI/help-source-test changes.
