# Exact-head CI and original-evidence audit — 2026-11-13

Repository: i-shutov/tikzarium. Read-only remote audit. Task: /root/sci_ci_audit_1113. Parent reports requested spawn model gpt-6.1-sol, reasoning high, fork none; this records requested metadata, not an independently verified backend identity.

## Fresh source and complete run scope

- Main remains `0a9831404687296a5467f89e77e873de8cdc5137`.
- [PR #189](https://github.com/i-shutov/tikzarium/pull/189) is open and draft, head `0eee418ca4d4869b2a4b9fb6ea1462d53df84e1d`, base main above.
- App tree is `6c3208dc309a4c31ba36c4cf3ccda63b85083bd9`; root tree `15bcbb4c34fef32755e3d7fc704aa19dccb3d927`.
- Read remote AGENTS.md at that exact head before audit decisions.
- Generic GET `/repos/i-shutov/tikzarium/actions/runs?head_sha=0eee418ca4d4869b2a4b9fb6ea1462d53df84e1d&per_page=100&page=1` returned total_count 15 and all 15 runs: 13 pull_request plus 2 push, 13 success plus 2 failure, all completed/attempt 1. No PR-only wrapper used. No page 2 is needed because returned count equals total.
- Inventoried artifacts for all 15 runs using generic GET, per_page=100: 38 total, none expired. Raw JSON inventories are preserved.

## Final D QA matrix result

[D QA matrix run 43293210950](https://github.com/i-shutov/tikzarium/actions/runs/43293210950) finished **success**, updated 2026-11-12T19:54:27Z. All seven jobs succeeded: Rust fmt/clippy/test/harness and actual XeLaTeX CLI on hosted Windows Server 2022, Ubuntu 24.04 and macOS 15, plus independent uploaded-evidence check. It has 13 original artifacts.

Downloaded original Linux and Windows CLI evidence ZIPs. Each qa-report has 5 PASS, 0 FAIL, 0 SKIP, 1 KNOWN_LIMITATION. They identify source_head_sha as the requested head but checkout commit_sha as `fed3bd1bb2f3ab8a0489fa99ab665c1be97674fa` (PR merge checkout); keep both identities. These CLI tests include original PDFs, Unicode/glyph/font checks and PGFPlots extension PDF. The legacy Cyrillic case is explicitly a known limitation, not Unicode acceptance. These do not establish the native PGFPlots Inspector pipeline.

## Two failures are intentional lease stops

| Run | Failed step | Original artifact count |
| --- | --- | --- |
| [I61 43293211071](https://github.com/i-shutov/tikzarium/actions/runs/43293211071) | Exact B42 app source-tree lease (fail closed before GUI) | 0 |
| [N5 43293211149](https://github.com/i-shutov/tikzarium/actions/runs/43293211149) | Fail-closed reviewed Studio source-tree lease for packaged proof | 0 |

Original job logs 131444568784 and 131444569135 are saved. I61 compares app tree to `bf8ec7532f7c3f11d32567722828b43c83c17a7d`; N5 checks current app tree against the same APP_TREE in scripts/qa_i61_b42_studio_x11.py. Both stop before their native scenario. The script contains coordinates and assertions tied to the former layout, including a TikZ Node x Inspector transaction rather than PGFPlots. A simple pin replacement would not be valid new review.

## Original native-window and app-state evidence

- [Win32 HWND/F1 run 43293210938](https://github.com/i-shutov/tikzarium/actions/runs/43293210938), artifact 13979146225: exact source head, Windows Server 2022 build20348, HIGH Administrator token, 96 DPI, actual native HWND and PrintWindow PNGs. I visually inspected original before/after F1 PNGs: compact five-menu toolbar, collapsed preamble and PGFPlots sidebar appear; F1 changes actual right pane to Help. This is HOSTED_GUI, partial. Original JSON explicitly marks source_patch, save_open, gui_xelatex_pdf, native_dialogs, real IME, 200% DPI, physical_win10 and W2 qualification NOT_RUN. The separate slow-startup proof uses a synthetic readonly-tool fixture.
- [N1 run 43293211022](https://github.com/i-shutov/tikzarium/actions/runs/43293211022), artifact 13979001009: original state, .tex, PDF, PNG, build/font/extraction logs. Status PASS_AUTHORING_STATE_ONLY; gui_pointer_clicks NOT_RUN. It covers six TikZ primitives, minimal patch/Undo/Save-Reopen state paths plus separate XeLaTeX CI compile. This is not a PGFPlots native interaction proof.
- [B42 bootstrap run 43293210876](https://github.com/i-shutov/tikzarium/actions/runs/43293210876), artifact 13978985830: preserved original X11 screenshots, source clipboard and report. Original kind B42_ACTUAL_EGUI_BOOTSTRAP; six_native_gestures and actual_xelatex_pdf NOT_RUN; coordinate/palette/wrap candidates require review. Report contains no source SHA; association to this head comes from exact-head Actions listing. Downloaded for current-layout reference, no added interaction acceptance claim.

Five original ZIPs and extracted contents are present beside this report; original-artifact-checksums.json records ZIP sizes and SHA256. Original metadata and logs remain untouched. No remote mutation, rerun or lease bypass occurred.

## One next executable task

Run a current-layout native PGFPlots fixture through **Inspector Apply → minimal revision-checked SourcePatch → Undo → byte-exact Save/Open → XeLaTeX → PDF**, preserving original source, screenshots, logs and build provenance. Independently review new selectors and assertions before renewing I61/N5 exact-tree leases. Hosted success remains separate from physical Windows 10 W0–W4, real IME and 96/120/192 DPI acceptance.

