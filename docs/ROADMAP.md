# Roadmap — TikZ-native visual authoring

**LATEST RELEASE STATUS (2026-11-07):** Windows 1.0 first. Current main 4b79d71a has W0 hosted native/ZIP PASS, W1 personal Server current-user MiKTeX PDF PASS, W2 actual RDP visible native HWND @125% but foreground/F1/PNG BLOCKED, physical Windows10 W3 NOT_RUN, installer/stable W4 BLOCKED. Existing HIGH Administrator is supported with visible trusted-document warning; old non-admin/HIGH restrictions below are historical, not release gates. [Canonical W0–W4](WINDOWS_1_0_RELEASE_CONTROL_RU.md) · [79 problems/solutions](TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md).


**Owner release override — 2026-11-06: local Windows ADMINISTRATORS accounts supported.** This is not equivalent to an elevated process. Test asInvoker filtered/medium and explicitly elevated/high GUI separately under the SAME administrator account, including the built-in Administrator; record token elevation, integrity, UAC linked-token availability and session. Direct TeX under high/elevated token is forbidden until a narrow same-account child launcher passes real review and native smoke. An unavailable linked token does NOT authorize an unproven restricted-token workaround. No new non-admin account, UAC or MiKTeX change. [Authoritative owner correction](https://github.com/i-shutov/tikzarium/issues/108#issuecomment-6676540344). [Token safety plan](../insights/2026-11-06_WINDOWS_ADMIN_TOKEN_RELEASE.md). Both normal/elevated physical GUI/PDF gates remain NOT_RUN.

## Current active release gate — Windows 10 x64 (owner 2026-11-05)\n\nFREEZE FEATURES: Windows x64 native PE2/PE3+ZIP/SHA, then genuine product CLI→existing MiKTeX PDF with Unicode/embedded-font proof under the current owner Administrator on personal Server (W1), real interactive Server GUI (W2) and separate physical Windows10 GUI/IME/DPI (W3). The 2026-11-06 owner correction authorizes elevated/current-user tools with a visible trusted-document / NOT-A-SANDBOX warning; the former blanket HIGH-token ban/mandatory restricted-child launcher was superseded. Do not change privileges/UAC/accounts, disable shell escape, install packages or hide warnings. No installer/stable before W1–W3. Linux RC and Linux/macOS hosted CI retained. See plans/2026-11-06_OWNER_ADMIN_BLOCKER_CORRECTION.md.\\n\\n
## L4 Linux packaged first-use source-to-PDF (candidate, 2026-11-05)

Accepted main `ddf018a7d57f963fd8491c82ef303e9223e3f41c` passed Linux-hosted N5 extracted release **window** launch, I61 source-build full X11, N1, Rust and D QA independently. Missing evidence is the complete **packaged release launcher** GUI→source→XeLaTeX PDF vertical. Resolve launcher/CWD defect and invoke full existing native I61 and N2/N3 mouse/keyboard tests on the extracted release launcher in the N5 workflow, rather than treating the source-built/debug GUI proof as packaged release proof. New PR-head CI/manual PNG/source/PDF SHA review PENDING, physical Linux/HiDPI/native dialogs/Wayland NOT_RUN. See `plans/2026-11-05_LINUX_N5_PACKAGED_FIRST_USE.md`.


## N5 Linux packaged-desktop candidate — 2026-11-05

After seven exact PR-head success workflows and source/PDF/PNG SHA review, B43 Linux UX was squash-merged as main `26abc5461bba06d610394080ffe23bbbf92cc6bb`. The next substantial first-release vertical is a **real Linux x86_64 portable bundle**: locked release Rust binaries, architecture/manifest checks, reproducible archive and an *extracted* native GUI launch under X11, not merely a synthetically assembled zip. See `plans/2026-11-05_LINUX_N5_PORTABLE_RELEASE.md`. That CI and original screenshot assessment remain **PENDING** until observed; physical Linux desktop, DPI/Wayland and native installer remain NOT_RUN. Windows/Mac paths continue to be tested but do not block Linux-first release.


## L2 B43 candidate — workspace proportions and soft-wrapped editable TeX

A source TextEdit pointer click also dismisses the floating geometry group palette, avoiding a popup obscuring the central canvas after users return to their document. A production egui pointer event regression is added; **real X11 capture and exact-head CI remain unaccepted** because the previous HEAD had pre-step CI failures without job logs. This is a behavior fix inside the same PR, not a new N1/N2 feature.

The first ergonomic improvement after accepted F1 PR #99 reserves the central canvas from the actual space remaining *after* inspector and icon rail, rather than from an estimate that ignores the rail. Editable source shows a short filename with full path on hover, dirty marker and a persisted, reversible visual-only ↵ Перенос switch. Long source lines can wrap without altering TeX/CRLF/opaque content; manual horizontal scrolling remains available. Strict Rust, genuine X11 and screenshot/PDF/source SHA acceptance are pending. See plans/2026-11-04_LINUX_B43_WORKSPACE_ERGONOMICS.md.

## Current decision: Linux-first complete editor (2026-11-04)

**Linux x86_64 is the FIRST FULL RELEASE; Windows 10/MiKTeX and macOS ARM/XeLaTeX remain cross-platform architecture/hosted CI targets but physical GUI acceptance and release follow later.** The first release is gated by actual usable Linux GUI/ergonomics, not by physical Windows Server/Windows 10 tests or signed macOS installers. Iterate compact workspace, tool groups/icons, code/preview proportions, legible Russian F1/property panels, source editing, native dialogs/keyboard, all six gestures, library states and external XeLaTeX PDF using real X11 screenshot/artifact evidence. Older dated Windows-first or multi-platform N5 entries below are historical snapshots. See `plans/2026-11-04_LINUX_FIRST_CROSS_PLATFORM_RELEASE.md`.


Owner-corrected scope, 2026-10-31. Replaces the earlier S0–S7 universal-CAD plan and its unsupported calendar forecast. Existing useful runtime/GUI/font/QA work is retained.

**Product loop:** TikZ primitive or library tool → properties and explanations → ordinary editable code shown beside the figure → independently installed XeLaTeX → exact PDF. Windows uses external MiKTeX; macOS ARM uses the user's external XeLaTeX. No new TeX interpreter, general geometry solver or PDF decompiler is on the critical path.

## Large delivery blocks

| Block | Delivered user workflow | Exit criterion |
| --- | --- | --- |
| N1 — Native primitive authoring | Draw line/arrow/rectangle/circle/node/Bézier, edit parameters, immediately see the changed TikZ command and its explanation, compile via external XeLaTeX | Six real tool workflows: canvas/input → source → PDF → save/reopen/undo; no unrelated source damage |
| N2 — Connected libraries | Project library panel; positioning/calc/arrows.meta/fit/shapes.geometric/shapes.misc catalogue and source adapters; explicit preamble changes; installed/loaded/compatible/tool/help states | Connect and disconnect a library with visible diff/undo; correct tool state; raw code remains usable without an adapter |
| N3 — Full authoring assistance | F1/hover, parameter explanations, syntax hints, completion, examples and manual navigation from the same catalogue used by tools | Every exposed control has verified semantic help, requirement and example; no invented defaults; works offline for shipped help |
| N4 — Domain tool packs | PGFPlots axes/series, CircuitikZ components, tikz-cd arrows/grids; then geometry/graphs/Petri/trees/physics/chemistry packages using their native commands | Each pack has a concrete end-to-end drawing workflow, generated-source tests and real XeLaTeX fixtures, with explicit limits |
| N5 — Everyday-use acceptance | Compact Linux desktop layout, typography/themes, project recovery, safe exports, package diagnostics, native packaging, R4 regression where licensed | Real Linux x86_64 X11 source-to-PDF and usability/ergonomics acceptance, original exact-SHA evidence, reproducible native Linux artifact, no critical defects; Windows 10/Mac ARM follow-on |

N1 includes basic help from the first tool; N3 deepens assistance, it is not permission to postpone explanations. Native prerequisite work and QA proceed in parallel with N1. Broader package adapters need not wait for a generic WASM SDK. Version labels are assigned to accepted functional slices, not used to delay basic authoring until a speculative architecture is complete.

## Parallel ownership

- A: core/CLI, MiKTeX detection and invocation, project/prelude configuration, diagnostics and dependency freshness.
- B: egui tools and gestures, permanent code pane, properties/help UI, exact preview and native interaction.
- C: one command/parameter/help catalogue, generators, declared source-edit contracts and package requirements.
- D: independent generated-source/MiKTeX/TeX/GUI regression evidence and physical-target runbooks.
- Integrator: shared contract review, source compatibility, substantial vertical merges and plans/insights synchronization.

Do not replace this with four independent incompatible prototypes. C publishes the small shared contract; B uses it, A remains the compiler host and D checks actual outcomes. Read active branches before editing and group commits to avoid redundant full CI for each file.

## Accepted/next boundary — 2026-11-03

N1 passed hosted real Linux/X11 on merged main `3fb25ca7`; physical Windows 10/MiKTeX and Mac ARM remain NOT_RUN. N2/N3 now target real Studio library Connect/Undo/Save/Open/XeLaTeX plus independently observed installed/loaded/compatible/tool/help and one offline Russian C catalogue. The PGF umbrella `shapes` is compatibility-only; prefer explicit `shapes.geometric`/`shapes.misc`. An installed library does not imply a GUI adapter.

## N5 packaging checkpoint — 2026-11-03

N1 and the first N2 library workflow are accepted on hosted Linux/X11 on merged main bbcc2504 (99/99 source/artifact SHA). Full N3 control/completion coverage remains PENDING. The N5 offline native packaging candidate makes independently hash-checked Windows x64 portable ZIP and Mac ARM64 Finder .app (unsigned) from existing CI binaries, with CRLF/Unicode fixture, provenance and a physical QA runbook. This is user-facing packaging preparation, NOT signed installers and NOT proof of physical Win10/M1/M4 GUI. The current main-push hosted MiKTeX failure occurs at the external pinned installer download before product tests; distinguish network/setup FAIL from regression and avoid blind reruns. Native launch, actual external MiKTeX on Windows 10, Mac XeLaTeX, Retina/IME, themes, signing/notarization and full N5 remain NOT_RUN. N4 stays off the first release critical path.

## N3 source-caret C completion candidate — 2026-11-03

The first scoped source-editor F1 assistance path offers canonical C-catalogue suggestions for one literal preamble library name and uses an ordinary revision-checked Undoable SourcePatch. This is a candidate, NOT full N3 or an accepted real GUI result: source completion for arbitrary keys/parameters and real Studio X11/physical platform acceptance remain PENDING/NOT_RUN. N4 stays off the release critical path.

## Progress vocabulary

The existing XeLaTeX source workbench, PDF navigation, font/theme support and package audits are reusable infrastructure. The six-primitives mouse-authoring workflow, library-driven tool palette and integrated explanatory UI are new acceptance targets, not already accepted functionality. Code in a PR, green hosted CI and physical desktop acceptance are separate states.

## Forecast correction

The earlier 2–4 weeks / 4–7 months / 9–15 months forecast is **withdrawn**, not a schedule for this corrected product. Initial PR lead-time measurements are not development-effort benchmarks for these workflows. Re-estimation must use actual completion of N1/N2 and shared catalogue reuse; do not manufacture a new calendar from PR count.

Detailed execution contract: `plans/2026-10-31_FULL_SCOPE_ROADMAP.md`. Research and correction log: `insights/2026-10-31_DELIVERY_VELOCITY_BENCHMARK.md`.
