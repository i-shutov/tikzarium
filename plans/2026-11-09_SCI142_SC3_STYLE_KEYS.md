# TikZarium Scientific-142 — SC3 numeric ticks, axis sizes and plot marks

Date: 2026-11-09. Branch `feat/scientific-142-sc3-ticks-size-marker-20261109`; stacked on accepted-hosted SC3 axis-bound PR #149, in turn stacked on SC2/SC1. Stable Windows 1.0 is frozen separately.

## Engineering scope and source authority

- Added revision-checked `SourcePatch` support for explicit `xtick distance`, `ytick distance`, literal numeric `xtick/ytick` lists, `width/height` using existing unit spelling, and core `mark` choices. Bare `xlabel/ylabel` are edited only when already enclosed in braces and consisting of plain Unicode text (no TeX commands, math, interpolation or nested groups).
- Numeric tick distance changes are bounded to half-to-double the previously explicit literal to reduce risk of enormous unintended tick counts; dimension replacements keep the exact unit. Limits are **editor safety constraints**, not PGFPlots defaults.
- No new drawing model, TeX interpreter, package installer, Gnuplot, hidden value expansion or replacement of the user's mathematical labels.
- Preserve prior accepted SourcePatch ranges for existing SC2/SC3 numeric keys. New keys use shortest UTF-8 diff, with exact old bytes + revision + source hash.
- Classic/Studio Inspector uses a compact native parameter dropdown for 15 reviewed keys, selecting only keys that the actual source owner (axis vs series) supports. Russian help remains aligned with the native F1 overlay, recording `UNKNOWN` for defaults not proved in the user's actual TeX environment.

## Test gates

1. Original Sarov `SV-001` checks `xtick distance=1`, `ytick distance=0.5`, `width=1\\textwidth`, `height=0.62\\textwidth`, and nested `mark=none` with one precise SourcePatch + inverse. `SV-003` retains `xtick=\\empty` as OPAQUE; mathematical `xlabel`/`ylabel` are OPAQUE.
2. Synthetic minimal source proves supported Unicode plain-text labels, finite explicit numeric tick lists, and `addplot[mark=*]`; negative tests reject macro bodies, unit changes, duplicate markers and unsafe literals.
3. Native egui Inspector regression tests exact Sarov source + Undo for tick/dimension/mark, plus read-only mathematical F1.
4. Dedicated hosted Windows 2022, Ubuntu 24.04 and macOS 15 SC3 QA; original 142-file lexical audit remains read-only and distinguishes L2/L3 from syntactic success.
5. Independent hosted Linux external XeLaTeX experiment compiles **two** disposable `SV-001` copies: previously accepted one-value `ymax` proof and new three-value tick/dimension/mark `SourcePatch` proof. Collect original PDF, PNG, TeX, .fls, logs and SHA, then check full corpus unchanged.
6. Physical mouse-driven GUI → SourcePatch/Undo → PDF and physical Windows10 remain NOT_RUN. No stable release claims or automatic merge.

## Source references
- Owner roadmap: `roadmap/Tikzarium_Scientific_142_R4/docs/SCIENTIFIC_142_TRD_R4.md` SC3-02/03 and SC7.
- PGFPlots 1.18.2 manuals (for semantics, not local installed defaults): https://tikz.dev/pgfplots/reference-tickoptions, https://tikz.dev/pgfplots/reference-scaling, https://tikz.dev/pgfplots/reference-markers.
