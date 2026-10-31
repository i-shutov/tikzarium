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

## Exact-head CI finding and regression repair — 2026-10-31

On PR #44 head `1ffa195f8ca54805e021e87028fa91c117b7bf63`, the Ubuntu D QA matrix executed actual app/extension Rust tests successfully, but the existing `scripts/tools/qa_ui_contract.py` returned FAIL. N1 added a second binary (`n1-authoring-proof`), while the pre-existing theme/font proof used an unconstrained `cargo test -p tikzarium-app` and parsed only the first `test result` stanza. With multiple binary test harnesses this could record zero tests although the named GUI binary tests passed. The fix **does not weaken the required test names/count**: it scopes both listing and execution to `--bin tikzarium-app`; a dedicated Python negative/provenance test asserts this exact target selection. Repeat exact-head matrix and inspect uploaded JSON before PASS. This is NOT a physical GUI acceptance.

Removed the one-time autoformat workflow after its corrective commit to avoid redundant push-triggered formatting jobs. No code, compiler, TeX source or package behavior is silently relaxed.

## Independent downloaded CI artifact audit (old N1 head)

The authoring proof at exact SHA `1ffa195f8ca54805e021e87028fa91c117b7bf63` completed successfully in [run 41190253165](https://github.com/i-shutov/tikzarium/actions/runs/41190253165). Its uploaded artifact `n1-app-authoring-linux` (ID `13038372905`) was downloaded and independently checked in the integrator sandbox: original ZIP SHA-256 `68c89937d470061d50145607ccb99911a40f751a96b265aa75b66bc0c0222033`, matching the GitHub artifact digest. All 31 member files have valid ZIP CRC. JSON reports exactly six native catalog tools, save/reopen, circle property edit/undo, text-to-math edit/undo, opaque user macro preservation and stale manual-buffer rejection as PASS; GUI pointer actions and physical Win10/M1/M4 explicitly NOT_RUN.

The actual `authoring.pdf` was one XeTeX PDF page with extracted `Геометрия_1 & оптика 25%` and embedded DejaVu Serif; SHA-256 `54569a065ebfc0d49f9b8ba342257d1411170fe618da7eb45c273c2a567193c6`. The math-mode output PDF SHA `2c8ee51dd17df974014333939c93afa55283cf0ce15191ac2dd2b17f2ea47404` contains embedded Latin Modern Math and extractable Greek/math. The static catalog fixture PDF SHA `1f074641e92bc1a4154bcb34da8448426df637be5421d88073bf94a4f54e5f3c`. The PDF-to-PNG proof images were inspected directly, not treated as native egui screenshots. The uploaded `source-before.sha256` and `artifacts.sha256` manifest preserve input/result provenance. **This old-head proof is not final-head acceptance after the QA harness fix.**

## Real Windows/Clippy N1 defects found after shared integration

Exact-head QA of `8a2bedbe418848120d44b91188481d3191b8a1d5` (runs [Rust 41190462964](https://github.com/i-shutov/tikzarium/actions/runs/41190462964) and [D QA 41190462999](https://github.com/i-shutov/tikzarium/actions/runs/41190462999)) detected two genuine additional blockers. Windows Git checkout converts the **static example fixture** `extensions/primitives/fixtures/all-six.tex` to CRLF, while the programmatic fixture is emitted with LF; Rust test `six_commands_match_real_xelatex_fixture` falsely failed despite equal TeX contents. The independent CRLF/user-source roundtrip/undo checks remain unchanged. Compare only this static golden fixture after explicit CRLF→LF normalization, not a user's TeX buffer. The same run shows Rust Clippy 1.91.0 `too_many_arguments` (8/7) for C's `plan_parameter_edit` API. Rather than suppress `-D warnings`, combine the exact source span and revision into a typed `SourceTarget` precondition and migrate all 8 test callsites. This preserves fail-closed guards and further clarifies source-transaction semantics. Re-run the *entire exact-head* matrix; neither previous failing head is accepted.

## Final N1 hosted evidence and merge decision (2026-10-31)

Verified PR head `1a274485ca8e728643bc0cf0ed79a18c6b4d5c34`, main before merge `0aa78ae22df0ae84705ba461f017fce256325875`, merged PR #44 with exact-head lease to main `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49`. Hosted check IDs: Rust 41190945419 3/3 PASS; D 41190945357 7/7 PASS; N1 41190945352 PASS; font 41190945413 PASS. Actual GitHub release artifacts not inferred from mock fixtures.

Downloaded N1 artifact 13037984941: ZIP digest `a86d8bf24338105f6b9519323b761dab4d55c9a24ef0798abef307d33ff0d800` matched GitHub, ZIP 34 members CRC PASS, `artifacts.sha256` 9/9 source/result hashes PASS. JSON `source_head_sha` exact; six commands; save_reopen, parameter_undo, math_undo, manual_edit_conflict, opaque_source_preservation all PASS; pointer GUI and physical targets NOT_RUN. Three actual XeTeX PDFs with embedded fonts: authoring SHA `82e896f90e96aedd7c6ef3135f57381a858df9cc7fa0d1a2588ec263b48e34e3` with extracted `Геометрия_1 & оптика 25%`; math SHA `ffc4a678c18520e59b569f090191f6aece494c995a8289b521411d9a1e6d8f2d` with extracted `𝐸 = ℏ𝜔, 𝛼+𝛽 =𝛾`; catalog fixture SHA `d6ea3fa1b39fbe83ac98362e27751d3b26610f9fab1a2e8b9593d8197b7642af`, extracted A. All three 1 page and embedded fonts reported yes. Exact PDF code is authored by actual N1 application state, not visual pointer automation.

Downloaded D05 cross-host artifact 13038961920: ZIP `22863f21bae9472f6ff19ceeccd32f54d416a6c35da22ae209150c504d302b12`, CRC PASS, `crosshost-audit.json` accepted=true, source_head_sha exact, 3 OS each 6 fixtures/5 extensions/Unicode PDF checked, GUI `PASS_UNIT`, physical GUI `NOT_RUN`; PR checkouts share virtual merge SHA `0270dcfa02eb06eb5ad194a1755efbab994b5a85`. This supports source/head + CI, not physical target acceptance.

Next N1 followup should preserve these exact artefacts, update unresolved target physical smoke separately; do not claim installer, MiKTeX on actual Win10, screenshot review or v1.0. New unique C #39 gallery additions after #44 were not silently taken: review separately.
