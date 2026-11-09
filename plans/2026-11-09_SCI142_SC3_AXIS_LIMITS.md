# TikZarium Scientific-142 SC3 — First numeric axis-bound adapter

Date: 2026-11-09. Based on SC2 PR #148 (stacked on SC1 PR #146), not Windows 1.0 main.

## Delivered candidate

- Four **literal** numeric axis bounds `xmin/xmax/ymin/ymax` added to source-only PGFPlots adapter, reusing existing source fingerprint, UTF-8 spans, revision gate and shared `SourcePatch` Undo.
- Only `ScientificKind::Axis` owns these bounds. Any `addplot` with similarly named key is refused rather than being misinterpreted as an axis.
- Accept only explicit finite decimal values with up to 32 bytes. Reject TeX expressions, control sequences, nonfinite values, commas, shell escapes, duplicates and unknown keys.
- Classic/Studio Inspector now offers four additional properties with source-backed Russian help and `UNKNOWN` for unverified PGFPlots defaults. It runs no new renderer.
- Original Sarov `SV-001`: `ymin=0`, `ymax=1.4`; `SV-003`: `xmin=0`, `xmax=1080`. Source-only tests patch each value and undo to **exact original source bytes and SHA** while retaining `compat=1.17` and function definitions.
- This is initial SC3-01/02; not complete PGFPlots feature support or physical GUI L3.

## Gate

- [ ] Exact-head hosted Windows/macOS/Linux cargo fmt, clippy and tests on this stack.
- [ ] Real external XeLaTeX after an actual Inspector-origin edit of the original Sarov copy (not just vanilla fixture compilation).
- [ ] Native GUI screenshots, physical mouse selection, actual Undo and PDF checked separately; existing Windows W2b/Win10 W3/stable W4 remain NO-GO.
- [ ] Expand PGFPlots domain/axis labels, ticks, size, markers and style only with explicit source grammar and negative tests; never invent default values.

SC1 and SC2 parent branches must be independently accepted before merging stack. Never deploy this unreviewed candidate to the owner's personal Windows Server.

## Additional source-level acceptance

The SC3 native Inspector model selects the actual original `SV-001` axis, refuses an axis-only property on an `addplot`, applies `ymax=1.4 → 1.2` through the shared authoring source transaction and undoes it to the original bytes. A second test applies `ymax` then `ymin` after an explicit rescan, and undoes the two inverse patches in LIFO order with monotonically increasing revisions and the original SHA restored. These are automated native-state tests, not physical pointer, PDF or L3 evidence.
