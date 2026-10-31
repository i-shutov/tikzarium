# N1 integration findings and evidence ledger

2026-10-31. This is implementation/review evidence, not native GUI acceptance.

## Why a bridge was necessary

B07 #37 had real mouse/parameter-to-source code but its own temporary ToolSpec table and generators. C07 #39 supplied a different declarative generator/help schema. Merging both unchanged would leave two sources of truth. The integration deliberately replaces B's temporary command/help tables with calls to C Catalog and uses C SourcePatch for the app transaction boundary.

Observed important semantic differences: B arrow was bare -> with no extra library; C arrow uses arrows.meta and a named tip. B accepted only safe plain node strings, C supports escaped literal text plus explicitly raw mathematical TeX. B had one synthetic cubic bend, C exposes both real control points. The new inspector reads C parameters directly rather than silently losing these differences.

## Source preservation approach

An N1 source line contains the ordinary C-generated TikZ command plus a comment with input metadata. Hex encoding avoids newlines, TeX comment delimiters and embedded marker strings inside metadata. Reload checks exact regeneration, schema and ID. A hand edit to the command does not retain visual write authority merely because its comment survived. Unknown/custom TeX is never normalized or regenerated.

SourcePatch requires current revision and old bytes. The app additionally compares its last observed full source before applying or undoing a visual transaction. Monotone revisions are rebased only for a verified LIFO inverse after exact source equality. Tests distinguish C pure patch mechanics from app-level source history and mixed manual edits.

## Test scope

New headless n1-authoring-proof uses the production app Session and C generator. It creates all six primitives, edits/undoes a circle, saves/reopens, edits text to math/undoes and rejects a stale manual buffer. A separate CI phase compiles its actual .tex outputs, audits glyphs and embedded fonts, and retains PDFs, PNGs, source checksums and JSON.

These tests do not move an OS pointer, render egui widgets, prove F1 interaction, or exercise the user's Windows 10 / M1 / M4. No such PASS may be inferred. The guide is approximate and intentionally separate from exact XeLaTeX PDF. Installed/loaded/compiled/GUI-editable statuses are independent.

## Execution environment at creation

Current container has git, XeLaTeX and Poppler, but no cargo/rustc/rustfmt; outbound git clone failed DNS. Existing repository source was read through the authorized GitHub connector. Consequently Rust execution is delegated to exact-head hosted CI, not simulated locally. Only tool-confirmed dispatch of six independent autonomous tasks is claimed; progress requires their actual results.

## Pending review items

- B37 main.rs must enforce code visibility when tools are active; requested in issue #35 and #37 comment. The catalogue bridge does not pretend a hidden-code Canvas is accepted.
- Merge A38 offline MiKTeX invocation and D40 genuine MiKTeX workflow with this integrated source, then inspect actual returned evidence.
- E verifies semantic help against primary manuals; F independently attacks source round-trip/undo/conflict cases without editing production lane files.
- Existing B07 comments remain preserved opaque source; migration is not silently performed.
- Literal preamble checks are bounded and not a full TeX parser. Macro-defined/conditional requirements are not proven loaded.
- Continuous DPI, keyboard, native dialog, theme persistence and physical desktop checks remain NOT_RUN.
