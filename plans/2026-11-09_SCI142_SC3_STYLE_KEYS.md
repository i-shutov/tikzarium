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

## Original hosted evidence — copied, hashed and visually inspected

- The earlier real edited-Sarov external XeLaTeX run [#42648357511](https://github.com/i-shutov/tikzarium/actions/runs/42648357511) completed SUCCESS. Original uploaded artifact **13689291328** (`sc3-edited-sarov-external-xelatex-42648357511`) was independently unpacked; it includes **two** edited TeX files, PDFs, `.fls`, TeX logs, console text, output SHA files and PNG screenshots.
- New style figure: the actual TeX contains precisely `xtick distance=2`, `height=0.75\\textwidth` and `mark=*,samples=150`. Reversing these three exact replacements reconstructs the owner R4 `SV-001` source SHA-256 **`d6f5f8ea1a5876b6ef191b07c8f7b35177fbe56ef152ed1ce564fbff66959301`**. Modified source SHA-256 **`2d4f141bd5546286846f43e5e8e16fac0160936e7cd3d85d9962ab3db9674786`**.
- The new original uploaded PDF SHA-256 is **`57b6b3073665fba77716a04bbfdfd115fd3fc590da84d53e215a3ac3f301a6c3`**: one page (327.92 × 257.34 pt), pdf producer xdvipdfmx, four embedded/subset Computer Modern math/text fonts with ToUnicode; **zero** `Missing character` log entries. Its actual PNG was examined and shows the expected Gaussian red series with individual red circular markers, modified geometry and intact math labels. This is a real external engine proof of the selected source edits, **not** physical GUI input.
- The other copy retains the earlier independently accepted `ymax` editing path: one-page PDF SHA-256 **`efbd0763d81b6fe713bd5fdf4dff4eb6804934178730f9b9dc027795af8848db`**; embedded fonts, no missing characters. Both figures use only ephemeral hosted Linux files, no owner Windows changes.
- During integration, the first two-copy workflow candidate was structurally malformed and therefore had no jobs; corrected from the previous accepted workflow before the successful proof. Later exact-head Rustfmt complaints were small formatting issues in the new tests and Inspector; these were corrected independently. Terminal CI on the *latest* branch head remains a distinct gate.

**QA boundary:** Successful original-source read/lexing (142/142), native egui/headless tests, and external XeLaTeX proof do not establish `L2=142/142`, real OS GUI `L3`, physical Win10 W3, or Windows 1.0 W4.
