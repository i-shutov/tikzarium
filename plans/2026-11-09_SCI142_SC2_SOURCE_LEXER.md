# Scientific-142 SC2 — bounded source recognizer + source-authoritative literal edits

Date: 2026-11-09. Stack: SC2 branch atop SC1 PR #146, **not** merged into frozen Windows 1.0 main.

## Implemented candidate, deliberately not a complete adapter

- New `tikzarium-extensions::scientific_scan` reads immutable UTF-8 source and returns byte-accurate `RecognizedInstance` with revision, full SHA-256 source fingerprint, kind, lexical range, optional `[options]` range and parent-axis index.
- Scope: inside one `tikzpicture` only. Recognizes `axis`, `addplot`, `draw`, `path`, `fill`, `clip`, `node`, `coordinate`, `pic`, `dimline` as **lexical only**; no TeX/CAD/PDF geometry interpretation or invented defaults.
- Explicit `Opaque`: `foreach` body skipped as a repeated construction (the one-to-many source issue), macro-definition bodies skipped, comments including CRLF ignored. Unknown catcode/csname and malformed groups fail closed.
- Bounded 2 MiB source / 2048 instances / 64 nesting / 8 option-style recursion. Run on source changes or explicit requests; never on each egui frame.
- `LiteralEditRequest` supports a tiny, auditable whitelist of PGFPlots literals: `samples` positive integer 2..4096; numeric `domain=x:y`. Nested `every axis plot post/.append style={...}` options are parsed as balanced byte groups, preserving everything outside exactly one literal value.
- Edits are planned as existing `SourcePatch`, using exact source SHA, revision and expected old bytes; only that existing transactional API applies patches and produces Undo. Duplicate keys, macros, invalid values, changed source, unsupported keys and bad ranges refuse changes.

## Real owner examples and QA boundaries

- `SV-001`: `axis` nested `samples=150` to `180` with source SHA restored after SourcePatch inverse; preserve `compat=1.17`, `gauss`, all surrounding source.
- `SV-003`: `foreach` body with its `addplot` not promoted to a single independent source edit; four outside `addplot` remain visible.
- `SV-009`: `addplot` literal `domain=0:1.5` to `0:1.4`, Undo exact bytes.
- Negative tests: CRLF/Unicode, generated comments, nested node group, macro definitions, fake draw in foreach, duplicated options, stale revision and SHA, opaque `\\myRange`, invalid numeric literals, malformed groups, catcode and bounded oversized files.

This is **SC2-01 + SC2-02 plus initial SC2-03/04 code**. The new classic/Studio **Inspector candidate** is actually wired to the existing production egui app: explicit “Распознать axis / addplot”, selected source-instance list, source-backed `samples` and `domain` values, verified `SourcePatch` and the existing one-step source Undo. It reuses the current authoring source revision and cancels stale manual edits. Native egui state/real Sarov unit tests are included. **F1 catalogue descriptions, physical GUI input and L3, full 142-source L2, and all other PGFPlots options are NOT completed or accepted.** Development base is the unmerged SC1 branch and must be revalidated when SC1 base advances.

## Required checks

1. Exact-head Rust formatting, Clippy warnings-as-errors, tests and Windows/Linux/macOS CI.
2. Cross-platform real corpus L0 unchanged; all TeX data remain SHA-pinned.
3. Independent review of source-only recognition, no unsafe macro inference, active scope logic, source equality/Undo, and negative cases.
4. Verify actual GUI integration and external XeLaTeX on edited original Sarov figures in a separate SC3/SC7 acceptance step. Never claim that unit tests simulate physical GUI.
5. Do not run PR code on the owner personal Windows Server; only reviewed trusted current main with original native evidence. Windows W2b, physical Win10 W3 and stable 1.0 W4 remain NO-GO.

Next: review actual Inspector integration and provenance end-to-end, add catalogue-backed Russian F1 guidance for `samples/domain` without invented defaults, then prove original external XeLaTeX build and Undo on edited Sarov copies. Keep source authority and no second renderer, Gnuplot, TeX bundle or multi-figure GUI.

## 2026-11-09 GUI/CI integration checkpoint

A trial hosted CI proved Rust formatting and locked Cargo dependencies; `egui` must be imported from the actual `eframe::egui` dependency rather than a nonexistent direct crate. The compile blocker was fixed in SC2. Next CI exposed Clippy `collapsible_if`, also corrected. A subsequent independent code review found a more important false-positive case: `\\begin{tikzpicture}` inside an unexecuted preamble `\\newcommand` or verbatim environment must not create a false editable figure. The scanner now skips global macro bodies / verbatim and rejects catcode changes, with exact-source negative tests. Rustfmt refinements were applied to these edits. CI status remains bound to **exact head SHA**; only a genuine green run can promote implementation acceptance. Stable Windows 1.0 W2b/W3/W4 remain NO-GO.
