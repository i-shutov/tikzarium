# E/N1 — actual main catalogue and independent primary-source semantic check

Date 2026-10-31. Project `i-shutov/tikzarium`. Main N1 accepted with merge SHA `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49` (#44) and documentation merge `ca90c2ee685e0c997d2d90a3ac60dab9e31fdb87` (#45). Current catalog Git blob `0ae93c9037a20aabdde089a90b94d8244def581c`, 26,662 UTF-8 bytes, SHA-256 `4e0fb99fa1f716ed44497a8c662b9ea21ceacb49878d104c04005b04249ad637` proved with independent Git hash calculation. No production catalog copied into E PR.

## Independent execution (separate from CI)

Python 3.13 stdlib `validate_primitives_help.py` directly executed against real C main TOML:
- `PASS`, tools=6, parameters=28, manual_references=36, errors=0, PGF v3.1.12.
- 28/28 `editor_preset` provenances, not assertions about TikZ's defaults; 6/6 `pgf_version_min=UNKNOWN`.
- Units `pt/mm/cm/in`, literal numeric bounds and enum `Stealth/Latex` are **editor schema limits**, not general TikZ constraints.
- Only arrow tool declares `arrows.meta`, other five require `tikz` core.
- Local unit-tests **26 PASS / 0 FAIL / 0 SKIP**, including synthetic negative cases and direct production catalog test. The final branch includes a further semantic test file; CI must execute it on its own exact source revision before claiming a hosted E Python PASS.
- Actual machine-readable reports: `help/qa/N1_HELP_ACTUAL_REPORT.json` and `help/qa/N1_SEMANTIC_ACTUAL_REPORT.json`. The latter is advisory (`REVIEW`) and never misrepresented as a green correctness proof.

## Three concrete primary-manual findings (not generic completeness errors)

1. `tikz.node.parameter.mode.interaction_ru` says the editor changes a “ключ TikZ”. **Incorrect**: there is no native text/math mode TikZ key in this node syntax. `text/math` selects literal escaping versus raw math in the editor's generator; see [PGF §17.4](https://tikz.dev/tikz-shapes).
2. The same parameter's per-field explanation does not explicitly include both literal values `text` and `math`, despite the `allowed_values` array. A tooltip must state them directly without suggesting they are TikZ options; see §17.4.
3. `tikz.circle.parameter.radius.warning_ru` requires positive radius but does not explicitly say the input restriction is the **inspector's literal preset** and not the full TikZ `circle` syntax, which supports richer expressions; [PGF §14.6](https://tikz.dev/tikz-paths).

Findings sent to C via [PR #39 comment](https://github.com/i-shutov/tikzarium/pull/39#issuecomment-6542188775); C production file unchanged. No backwards claim that the original structural validator caught semantic inaccuracies.

## One source for help — source-level inspection, not physical QA

`tikz_authoring::spec(tool)` returns a `ToolSpec` from shared `CATALOG`; `show_guide` hover, `show_inspector` and `parameter_help` use that object; keyboard F1 toggles help. Implementation paths were read at merged `main` SHA, but actual Windows 10 MiKTeX and macOS M1/M4 GUI keyboard/pointer tests remain `NOT_RUN`. Hosted Rust/TeX CI for old #42 head passed, but those jobs never ran this E Python suite. Do not claim full semantic equivalence or physical GUI PASS.

## Stop condition

One scoped PR #42 with actual-source QA, deterministic negative cases, local JSON evidence, and C editorial handoff. No duplicate catalog or speculative N2 pack.
