# Integrated desktop chain: W01 → B01 → B02 → F01/U01

## Latest I08 checkpoint — 2026-10-31, supersedes historical stage labels below
- Repository `i-shutov/tikzarium` main `013720ee6f0e1dc29f487124499ed9469d86b089`; A/W06 PR #38 merged via exact expected-head lease `74ca61c6aff408d92286f91e0b49143e9b7e72b1`, the 16/16 exact-head checks and independently validated real MiKTeX-hosted PDF/JSON artifact. Post-merge Rust CI 41198781494 and D QA 41198781586 SUCCESS. The source-first six-primitive N1 #44, its shared C help, fonts/themes and existing merged #24+ PRs remain intact.
- Immediate complete vertical gate: I06 #48 Linux/X11 real egui process 5/6 pointer gestures saved; cubic FAIL due obsolete tool coordinate (actual Cubic button ~[585,229] vs selected Node at [798,204]). Correct test profile, rerun actual six + F1 + GUI XeLaTeX PDF, review screenshots/text/fonts/source; no coordinate-only bootstrap PASS.
- B10 #50 has actual Rust/D QA PASS but N1 source->PDF FAIL: C N2 project import scanner invalidates explicit loaded `tikz`/`arrows.meta` on unrelated fontspec/`newcommand`. C #51 asked to correct source-owned evidence without optimistic Absent and without a B duplicate parser; complete B disconnect UI after C revised API. #51 remains draft and currently has no accepted GUI disconnect.
- D07 #52 must extend real MiKTeX PR filters to app/C source changes and run on actual post-merge main; latest draft run 41197737467 FAILED before TeX at external pinned installer download. One targeted failed-job retry is in progress; no acceptance relaxation and no code edits on D branch by integrator.
- Keep a common Russian TikZ command/parameter catalogue with verified manual provenance, normal Split with editable code beside true PDF, preservation of arbitrary TeX/CRLF, and five separate installed/loaded/compatible/tool/help states. Externally installed MiKTeX is mandatory on Windows 10; physical Windows 10 and Mac ARM GUI tests NOT_RUN. No Lua-only XeLaTeX claim.
- This checkpoint is evidence, **not** a release; old W01/B01 stages and old #10 conflict notes below are historical and are not current blockers. Refer to issue #35 for SHA-evidence ledger and PR-specific reviews.


Date: 2026-10-31. Scope: `i-shutov/tikzarium` ONLY.

## Integrated Git ancestry

Initial `main`: `4ceca871fc2c3b661f92d64f9c6b39b473cebd0a`.

| Gate | PR | Merged main SHA | Branch CI verification |
| --- | --- | --- | --- |
| W01: Rust workspace + CLI + XeLaTeX + PDF | #6 | `436ad98b8c4019ce965426c214c3d51bbe4fdbbd` | Run 41170859719, three jobs PASS |
| B01: egui source/split/canvas, diagnostics, save | #8 | `2eb97502ea9a0177e5afc2cec6bf2e170d52aec4` | Run 41172724695, three jobs PASS |
| B02: source-path-bound PDF freshness/export | #12 | `ee1ce4da41ee77f55ab06875565816904cddf8a4` | Run 41172768564, three jobs PASS |
| F01/U01: XeLaTeX font proof + GUI appearance | #16 | `3f71681a4d0febe143f0777d635867e9287e82eb` | Run 41173782947 three jobs PASS; font proof 41173786603 PASS |
| D: independent three-OS real-XeLaTeX QA | #9 | `2848697cb8c1d374bcbfd5e651a2319cf48ea830` | Run 41173898838, six jobs PASS incl. native-host XeLaTeX |
| C01: declarative extension registry | #7 | `f2a87c0c27c07ef423f33dd60435adaac1fa3284` | Run 41169642087, three jobs PASS |
| C02: observed fixture evidence parser | #13 | `f2a55fa13fd9a1e0af2718bc328ed16786975184` | Run 41172913142, three jobs PASS |

Each PR was merged with `expected_head_sha` and a merge commit (no forced ref replacement), only after its exact head received successful hosted CI checks. The post-merge `main` runs are independent checks and must be recorded before declaring integrated CI green.

## Functional contract

- XeLaTeX produces the authoritative PDF; egui rasterizes PDF page 1 through Poppler if available. Canvas is read-only, NOT an arbitrary direct TikZ geometry editor. Unknown macros stay in source.
- B02 treats a Save As pathname change and an in-flight rebuild as stale; it retains last-good PDF but blocks misleading export.
- F01 creates copyable `fontspec`/`unicode-math` snippets and an isolated XeLaTeX figure-font probe. It does **not** edit an existing TeX preamble/source.
- U01 persists only app preferences (four palettes, density, font suggestions). It must never alter document colors, fonts, bytes or PDF content.
- Package discovery does not imply verified build compatibility or visual editing. LuaTeX-only graphdrawing is NOT XeLaTeX-native.

## Integration order after this chain

1. Verify completed `main` Actions on latest post-C02 SHA `f2a55fa13fd9a1e0af2718bc328ed16786975184`; investigate any red checks before further merges. Previously green branch-head runs alone do NOT prove integrated main.
2. Integrate A runner diagnostics #10 only after resolving its **actual merge conflict** with F01's font-warning changes in `crates/tikzarium-core/src/diagnostics.rs`. Retargeted #10 to main: `mergeable_state=dirty` on 2026-10-31. Preserve both A's source/line attribution and F01's missing-glyph detection; rerun all impacted CI jobs before merge.
3. Extend the now-merged C01 `extensions/PACKAGE_MATRIX.csv` and C02 fixture observation pipeline with per-OS package version, source and generated artifact hashes, engine, real compilation and separate source-inspection/visual-edit statuses. Do not upgrade metadata discovery to a PASS.
4. On **physical** Win10 22H2 x64 and M1/M4 macOS, run `crates/tikzarium-app/QA_GUI_SMOKE.md` and font/theme checks: 1366x768 vs Retina, Ctrl/Cmd shortcuts, native dialogs, save/open/reopen, Unicode IME, stale PDF export block, theme persistence, literal glyph extraction/embedding, user TeX byte preservation. Record OS/TeX/tool SHA and screenshots.
5. Only after integrated CI + physical acceptance + blockers audited consider an internal beta. No production v1.0 acceptance yet.

## Release blockers

No physical Win10 or user M1/M4 GUI acceptance, no verified cross-platform XeLaTeX installation smoke, no source-safe visual TikZ editing, no arbitrary PDF page navigation, no full PGF extension compiler/visual-compatibility matrix. Windows Server 2022 CI is not Windows 10.
