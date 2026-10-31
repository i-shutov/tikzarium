# B15 — TikZ dependency evidence → focused editable source

2026-10-31. Lane B egui, continuing the single draft PR #50. Fresh main at start of this integration: `b7c8e993b9da64060dfd3261833e4be3a1d280ba`, merged C/N2 #55. B branch parent `54ad68749f91d549cd0911d3ae1afb5d4059ed4f` already reconciles this main via two-parent merge with no overlapping paths; previous #37/#43 are historical and must not be merged separately. Read AGENTS, C #55 public source provenance contract, B14 QA, current open PRs and plans/insights.

## User-visible objective

When the selected TikZ tool has explicitly loaded dependencies, the compact Split inspector must show each *verified direct literal* package/library line as a clickable Russian source-focus link. Clicking uses the already existing source-editor `jump_to_line` and line-highlighting contract. This makes the package/library evidence visible next to code, C-generated command, properties and F1.

## B-only implementation

- Use C/N2 `ProjectImports::declaration_sites(ImportKind,name)` and `status`; do not duplicate scanning or generate TikZ in B.
- Validate the exact original UTF-8 token and line range, translate C byte offsets to 1-based physical line index; support BOM, CRLF, Cyrillic comments, comma lists/options, and multiple direct declaration sites.
- Show source links only when C says CONFIRMED and supplies an actual token span; UNKNOWN/ABSENT never get fabricated source locations. Highlight whole source line, **not** claim token-specific navigation or that an installed package/compiler is proven.
- Keep source untouched on selection and preserve existing explicit diff + approval + undo for any suggested addition. Retain all six gesture and UNIT_EVENT tests, F1, manual edit/Undo, Save/Reopen, external XeLaTeX PDF. No TeX parser/CAS/PDF inverse geometry.
- New B app tests for Unicode/CRLF/comma lists, opaque conditional uncertainty and duplicate literal locations; no core/C/D files changed.

## Evidence and acceptance

New branch SHA needs exact-head Rust formatting/tests/Clippy, D QA, N1 actual source→XeLaTeX, hosted Windows Server MiKTeX and font integrity. Earlier B14 CI failures (first rustfmt; then test expecting ABSENT instead of correct UNKNOWN) are recorded, not hidden. Tests of the helper are UNIT/SOURCE and the existing egui pointer frames are UNIT_EVENT; they are NOT a native GUI screenshot. Physical Windows 10 with independently installed MiKTeX and physical Mac M1/M4 pointer/native-dialog/IME/Retina QA are NOT_RUN.

Integrator: PR #50, exact HEAD, actual check URL/results, and any remaining BLOCKER. Do not merge before CI + independent review.
