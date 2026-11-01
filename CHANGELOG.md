## Unreleased — I54 third QA SHA 234efdb · real Open focus ambiguity (next exact CI NOT_RUN)

- I46 [41362909390](https://github.com/i-shutov/tikzarium/actions/runs/41362909390) and I47 [41362909481](https://github.com/i-shutov/tikzarium/actions/runs/41362909481) real-X11 workflows PASS on `234efdbb17a98cae72f4320ce8e1b2c8f177494f`. I53 [41362909420](https://github.com/i-shutov/tikzarium/actions/runs/41362909420) real Connect/Disconnect/Undo/PDF PASS but *fails at two-file GUI Reopen BEFORE N3 detail click*: screenshot `13-control-opened.png` still displays selected path and prior source after Ctrl+O. This is a GUI-input focus/shortcut uncertainty (one previous Ctrl+O run passed), not demonstrated file corruption.
- Replace I53 uncertain keyboard shortcut with **actual visible Open path toolbar click**, while still validating two separate in-app GUI source buffers, source hashes, and PDF. New exact CI and final N3 details screenshot NOT_RUN at commit. Track Ctrl+O shortcut reliability separately rather than claiming it always passes.

## Unreleased — I54 second real QA accepted (details expansion next HEAD NOT_RUN)

- Exact I54 `9adbbde4ae1dbf0bacac3279605db852889ccfbe`: I46 X11 [41362471144](https://github.com/i-shutov/tikzarium/actions/runs/41362471144) SUCCESS, I47 six real gestures and held-pointer Undo [41362471218](https://github.com/i-shutov/tikzarium/actions/runs/41362471218) SUCCESS, I53 N2+N3 search [41362471344](https://github.com/i-shutov/tikzarium/actions/runs/41362471344) SUCCESS. Downloaded original artifacts: I46 21/21 previous HEAD verified; I47 **46/46** and I53 **27/27** report SHA-256 match. Manually compared saved native source and XeLaTeX PDF to screenshots; screenshot of actual N3 entered query shows exactly one shared-C result `tikz.library.positioning` with "Найдено: 1". No host hardware claim.
- Extend actual N3 search by clicking returned positioning help entry and screenshotting syntax/requirements/Russian explanation; coordinate [1150,175] from real 9adb screenshot. Its new exact HEAD CI/visual evidence NOT_RUN when committed. Source/PDF must remain unchanged.

## Unreleased — I54 review of first real QA (CI first HEAD FAILED, repair NOT_RUN)

- First exact B39 I46 actual dirty-Open [41362016898](https://github.com/i-shutov/tikzarium/actions/runs/41362016898) SUCCESS; downloaded ZIP 13105683167 and verified 21/21 report hashes; manually inspected modal rejection/acceptance/GUI PDF frames, original UTF-8/CRLF source preserved, PDF Cyrillic and embedded DejaVuSerif. I46 accepted on first QA HEAD 3b9af78, no physical Win/Mac implication.
- First I47 [41362017043](https://github.com/i-shutov/tikzarium/actions/runs/41362017043) failed at stale B38 unit assertion before opening egui. Update unit assertion to exact B39 tree and candidate-only profile; real six-gesture proof still NOT_RUN.
- First N3 [41362016972](https://github.com/i-shutov/tikzarium/actions/runs/41362016972) full N2 Connect/Disconnect/Undo/two-file Reopen/PDF passed but N3 TextEdit copy timed out: screenshot shows prior [1200,159] click below actual input y130–148, accidentally selecting explanatory help. Correct target [1200,138] based on *real* failed X11 screenshot; new N3 search result/visual review NOT_RUN.

## Unreleased — I54 B39 N2/N3 real desktop QA (CI NOT_RUN)

- Exact-tree re-pin I46/I47 for actual B39 X11 reaccept; old modal/gesture coordinates remain provisional until manual screenshot/PDF/source validation.
- New actual N3 Russian search TextEdit interaction added to I53 full Connect/Disconnect/Undo/two-file Reopen/GUI PDF proof; user source and PDF invariant. No production Rust changes; physical Win10/Mac NOT_RUN.

## Unreleased — I53 B39 real-X11 N2 libraries / two-file GUI Reopen (CI NOT_RUN)

- I53 B39 run 41359783212 reached real GUI but failed at initial Save before Connect: X11 `xdotool type --delay 3` submitted `library-connect.t`, not requested `.tex` (verified in screenshot/file report). QA driver now pastes the UTF-8 Path through X11 clipboard and checks full in-app field with Ctrl+A/C before Save or GUI Open. Negative tests reject missing filename suffix/extra bytes. New CI NOT_RUN at authoring; production unchanged.

- New full-window positioning Connect → saved TeX → externally compiled XeLaTeX PDF → Disconnect → Undo QA, with failure screenshots, hashes and negative tests; B39 stable-row ID in scope and actual two-file GUI Open source checks added; Disconnect candidate [1190,584] requires fresh B39 screenshot before GUI PASS.

## Unreleased — B38 library connect/disconnect + N3 help inspector (DRAFT: QA NOT_RUN)

- Re-pinned I46/I47 real Linux/X11 workflows and their screenshot-coordinate profiles to the exact B38 app/src Git tree, preserving full pointer/Save/Open/PDF checks. Inherited B37 coordinates remain provisional pending fresh screenshot review; this does NOT silently promote bootstrap to PASS.

- The native egui inspector now exposes four C-owned TikZ library entries and displays installation/project loading/engine target/tool implementation/help independently without promoting UNKNOWN to installed/compiled.
- Shows byte-local before/after source proposals before explicit user Connect/Disconnect; revision-checked C plans append inverse to existing N1 Undo, preserve CRLF/unknown macros and cancel in-flight pointer. No implicit package install, TeX substitution, solver or full-source rewrite.
- Adds Russian offline search in egui over the same C catalogue used by CLI/authoring; syntax/examples/parameter units/default provenance/manual sections remain unified.
- All new unit/egui layout tests, detailed plans and QA insight included. Exact-head CI, real GUI-PDF artifacts, postmerge and physical Win10/Mac remain NOT_RUN at authoring.

## Unreleased — I51 B36 actual-X11 automated PASS / PDF-focus manual visual FAIL (block main merge)

- QA `6eea588f`: genuine Linux/X11 I47 `41330287961` SUCCESS, ZIP `13092913019` CRC and 45/45 hashes, real PDF/guide selected states and six native gestures with byte-preserved source. Separate I46 real safe Open SUCCESS. Manual comparison with same-run GUI-exported PDF reference exposes **missing rectangle strokes, stippled circle/Bézier and tiny text in the compact PDF-focus viewport**, plus stale prior `2% cannot fit` warning while focused PDF fits; **B36 visual fidelity FAIL**. No B/main merge pending correction, exact next QA CI NOT_RUN, physical Win10/Mac NOT_RUN.

## Unreleased — I51 B36 two-line diagnostic layout X11 strict selection (fresh CI NOT_RUN)

- Real I47 `41329734338` reached six native gesture+actual GUI PDF but exposed a wrapped Fit Page error banner shifting control y-coordinates by 16px; no B36 production fault demonstrated. Independently inspected screenshot `05a`; QA now tests exactly one selected-button layout among reviewed single-/two-line cases using real PNG RGB, with negative ambiguous/none tests. No edits to production Rust. New exact-head GUI and whole-page manual QA NOT_RUN at authoring; physical Win10/Mac NOT_RUN.

## Unreleased — I51 real B36 X11 screenshot calibration (second QA HEAD pending)

- First exact-I51 genuine X11 I46 PASS, independently verified 21/21 uploaded hashes and foreground modal + real XeLaTeX PDF. I47 first run failed after six persisted native TikZ gestures, XTest held Undo, F1 and PDF because B35 fit coordinates were now wrong: Zoom Out clicked B36 PDF focus and compact Fit Page missed. Corrected all zoom/fit and focus click positions from B36 screenshot 04d/04e2, added actual selected-button blue-pixel predicates in both modes. No production Rust touched. Fresh exact-SHA rerun and new visual acceptance **NOT_RUN** at correction authorship; physical Windows 10 / Mac ARM NOT_RUN.

## Unreleased — I51 B36 independent X11 PDF-focus integration (NOT_RUN; QA source head)

- QA-only source-tree rebase of I46 dirty-Open and I47 full six-gesture native-X11 workflows onto B36 #79 `af75b0402bdf9c99dd18999fc5a4f6eb4c974e23` (app/src `276ad1525db4ef3d3aab4624808453a897ad5b6a`), preserving existing Save/Undo/CRLF/opaque macro, external XeLaTeX PDF and F1 checks. Adds provisional 1180×680 real pointer PDF-focus/guide-return screenshots and no-TeX-mutation hash gates. Old B35 coordinates expressly NOT calibrated on B36; no visual acceptance inferred from mere differing screenshots.
- Exact-head hosted X11, screenshot and PDF manual review, PR merge and post-merge CI **NOT_RUN** at authoring. Physical Windows 10/MiKTeX and Mac M1/M4/XeLaTeX **NOT_RUN**. No production Rust, catalogue or TeX behavior changed.

## Unreleased — I50 D06 MiKTeX rerun artifact provenance (CI pending)

- Closed a demonstrated GitHub Actions evidence-routing defect: [D06 #41315329378](https://github.com/i-shutov/tikzarium/actions/runs/41315329378) attempt 4 actually built six PDFs with privately installed MiKTeX 25.12 on hosted Windows Server (47-file ZIP, package inventory unchanged), but the independent Ubuntu auditor fetched the stale 265-byte ZIP from attempt 1 by nonunique artifact name and failed before PDF audit.
- Bind Windows evidence, lock and independent report to the same `github.run_id` and explicitly replace prior attempts with `actions/upload-artifact overwrite: true`; Ubuntu downloads the exact same-run Windows name. The naming does not use `run_attempt`, so a failed-audit-only rerun can read the last successful Windows producer without changing source provenance.
- New stdlib negative regression checks execute in both Windows and Ubuntu jobs, rejecting absent overwrite, stale/nonunique names, attempt-based naming and consumer mismatch. Workflow, tests, plan and research/QA insight committed together; no B/egui/C catalogue edits, no TeX auto-installs or GUI-font coupling.
- New exact-HEAD CI, independent uploaded-PDF/Unicode/font audit and post-merge CI: **NOT_RUN at authoring**. Physical Windows 10 x64 with external MiKTeX and Mac ARM M1/M4 with external XeLaTeX: **NOT_RUN**.

# Changelog

## Unreleased — I46/I47 B34 real-X11 acceptance (verified tested SHA 4e31346; final evidence HEAD CI pending)

- I46 now exercises same exact B34 dirty-Open source preservation on the merged B branch, PR #75 targeting main, and main push (paths limited, app-tree SHA guarded), not just stacked PR #77. This preserves independent **post-merge** desktop safety CI instead of dropping the gate on merge; fresh exact-head CI required.

- Independent Linux/X11 B34 GUI verification at exact SHA `4e31346`: [I46 41309725726](https://github.com/i-shutov/tikzarium/actions/runs/41309725726) PASS source-safe dirty Open, 21/21 hashes, Cyrillic/CRLF/opaque macro preserved, GUI PDF; [I47 41309725695](https://github.com/i-shutov/tikzarium/actions/runs/41309725695) PASS six native source-generating gestures, held-pointer Ctrl+Z and fresh redraw, F1 Russian help, GUI XeLaTeX PDF, fit/zoom, 42/42 hashes. Critical real frames visually inspected. 100% I46 preview is cropped; full page verified separately in I47 25% restored and 7% compact. These are hosted Linux tests, NOT physical Win10/M1/M4. Added docs paths to I47 workflow for final exact-head rerun after acceptance ledger update.

- **I47 B34 six-tool true-X11 gate:** repinned existing N1 desktop smoke workflow, 1366px source-tree profile and offline predicate from historical B31 tree to exact B34 tree ecc6d40668fd6edddc97c682f8ddcca5fe615c99; enables on QA #77 and B #75. This is independent of I46 dirty-Open and must prove six real pointer gestures, held Ctrl+Z, source bytes, GUI XeLaTeX PDF and fit/zoom screenshots. New exact-head run and manual review PENDING, do not infer from B31 historical PASS; physical Win10/Mac NOT_RUN.

- Independent I46 artifact review: [real-X11 run 41308995293](https://github.com/i-shutov/tikzarium/actions/runs/41308995293) PASS on `d2c67a8`, 21/21 reported file SHA-256 values match, source victim/occupied unchanged, separately saved scratch matches input, GUI Ctrl+Z fenced, GUI XeLaTeX PDF verified (Cyrillic `Не менять`, embedded DejaVuSerif), screenshots 06/07/09/10/12 manually viewed. PDF page is visually cropped at 100% in app; **not a full-page visual PASS**. Physical Win10/M1/M4 NOT_RUN. This docs-only source head must still pass fresh CI.

- **I46 QA coordinate correction:** independently downloaded and visually inspected real [run 41307868676](https://github.com/i-shutov/tikzarium/actions/runs/41307868676) screenshot; former (506,458) missed the actual Save-and-open button (x465–603,y416–441). Calibrated (536,429), added bounds-checked offline regression. Hosted run reached actual B34 modal but its Save/Reject click paths and PDF are **NOT PASS** until exact-head rerun+manual artifact review. No B production change or physical Win10/Mac claim.

- Integrator QA branch carries latest B #75 SHA f9a4838c8e3a2ea2e2adf58efc152a016c41f09a and current app/src tree ecc6d40668fd6edddc97c682f8ddcca5fe615c99, preserving N3 shared help merged into main. QA-only paths, no production edit. Real modal/XeLaTeX evidence still NOT_RUN pending exact-head workflow and screenshot review. Physical Win10/Mac NOT_RUN.

 — N3 Russian contextual help semantic correction (CI pending)

- Fixed the shared C-catalogue offline help search and CLI detail to include full existing Russian `help_ru` for native tools, parameters and TikZ libraries, not just a short title. Tests exercise exact IDs and description-only Cyrillic search; no second data source, TeX parser, auto-install, or changes to app GUI/figure fonts.
- New exact-HEAD CI, real CLI output, post-merge CI and physical Win10/M1/M4 acceptance: NOT_RUN at authoring. Do not mark accepted until verified.

# Changelog

## Unreleased — N3 offline search and CLI from ONE Russian TikZ catalogue (CI PENDING)

- Added read-only C-owned search over the exact primitive/parameter/library specifications already consumed by egui; CLI `help` exposes full Russian syntax, type/units/values, examples and PGF/TikZ provenance. No duplicate help database, parser, TeX substitute, or speculative package support.
- CLI `help [--all|query|exact-id]` works without an installed XeLaTeX, distinguishes editor presets from documented TikZ defaults and reports package/project installation as NOT_CHECKED. Rust unit tests and an offline real-CLI CI smoke are mandatory.
- Exact-head CI and post-merge CI NOT_RUN when authored. Physical Windows 10/MiKTeX and Mac M1/M4/XeLaTeX NOT_RUN; no release.


## Unreleased — I45 corrected-B31 genuine-X11 zoom-readout reacceptance (PENDING)

- QA-only integration on B-owned PR #72 corrected SHA `8f20359f2118660e27a28ecb773c32f8676f56c0`: repin real-X11 workflow, physical-pointer profile and tests to app tree `af316d5e5452d74186b92d65c95c448253d0e61c`. No production Rust/source/TeX edits and no old PR #48 replay.
- Preserve two authentic restored-size screenshots at 1366×740 to independently verify that the visible zoom toolbar no longer reads stale 7% when raster refits to roughly 25%; screenshot frame changes alone **NOT** a numerical correctness PASS. All six native pointer tools, held-click/drag Undo, byte-preserved source, Russian F1 and actual GUI XeLaTeX PDF remain mandatory.
- Corrected-head hosted Rust/D QA/N1/font workflows SUCCESS. Hosted MiKTeX installer initial network timeout then rerun + independent PDF audit SUCCESS; this is **not** physical Windows 10. Exact I45 GUI artifact/visual acceptance **NOT_RUN**, physical Win10/M1/M4 **NOT_RUN** at changelog authoring; no merge/release.

## Unreleased — I43 independent B31 compact real Linux/X11 acceptance (NOT_RUN)

- Accepted I40 main `8640c2cf`, B31 draft `174207d0`, Git-tree-confirmed B31 app `3aea076697daef8572d24694995a4e2ef24bbcaa`. Five hosted B31 exact-head locked CI families succeeded; old I33 X11 failed B30 tree fence before GUI launch.
- QA-only: strict six native TikZ gestures, XTest held-click/drag Undo, source restoration, F1, GUI XeLaTeX PDF; 1180×680 Fit Page/Fit width candidate screenshots, restored window, source-byte checks. Manual PDF/image review required; frame changes alone are not PASS; compact Fit width coordinate is provisional.
- Production, C catalogue, Cargo.lock and user TeX newline policy unchanged; physical Win10/MiKTeX, Mac M1/M4 XeLaTeX NOT_RUN; no release.

## Unreleased — I40 tracked Rust 1.91 Cargo.lock across all hosted build/GUI/MiKTeX QA (CI pending)

- Tracked the real `Cargo.lock` from accepted post-merge X11 main `06b62eea`: source artifact `13072954180` ZIP SHA-256 `48cb9ddffed42ccb71531eb75b7f9d7b59e64ddf375de5a9269fc8cfdef3018d`, lock SHA-256 `4713fd0c29ef8718ff71316f68e5dffe43335b77857e5c7eff9771d087310503` (370 packages, 366 registry). Exact one-time [Rust 1.91 import/check](https://github.com/i-shutov/tikzarium/actions/runs/41282413609) SUCCESS; its temporary workflow removed.
- CI Rust check/test/clippy/build/run now uses `--locked` across native Windows Server / macOS ARM, D three-host matrix, actual Linux/X11 egui, hosted private MiKTeX and N1 generated TeX/PDF. Shared Python audit + seven offline negative tests record tracked lock SHA, checked Cargo metadata and host provenance; archive JSON with build evidence. No TeX/package auto-install change.
- I40 first-HEAD three-host lock audit found a real cross-platform byte divergence: Windows Server checkout auto-CRLF changed `Cargo.lock` SHA to `a88dd89468c3b215fd8fd608115ef41a574c7aa9c50a3806871edf1a0ec041ad` while Linux/macOS remained `4713...`. Git diff had silently normalized it. Added scoped `.gitattributes: Cargo.lock text eol=lf` and raw Git blob versus worktree byte comparison, plus CRLF negative tests. No normalization of user .tex/.tikz. First Windows report's logical Cargo PASS does **not** count as byte-provenance PASS; full exact-HEAD recheck required.
- Final branch exact-head CI and post-merge main checks **NOT_RUN** at changelog authoring time. Physical Windows 10 x64 with separately installed MiKTeX and physical Mac ARM M1/M4 with user-installed XeLaTeX **NOT_RUN**; deterministic binary reproducibility **NOT_VERIFIED**. Real PDF and GUI proof remain separate requirements. No release.

## Unreleased — I36 B30 X11 held-button AND keyboard receipt desktop acceptance (NOT_RUN pending artifacts)

- I35 [actual Linux/X11 41279880858](https://github.com/i-shutov/tikzarium/actions/runs/41279880858) held **Button1Mask=256** across key-only XTest Ctrl+Z but source Undo still failed and later release inserted Line #2. I36 adds 80ms XTest key dwell/XSync, native XQueryKeymap proof of Ctrl/z down/up, XGetInputFocus snapshot, server Button1Mask check each key step, preserving strict source rollback. This disambiguates too-fast synthetic key events from B30 production routing. QA-only; actual I36 GUI acceptance NOT_RUN until complete, physical OS NOT_RUN, no release.

## Unreleased — I35 B30 true XTest held Ctrl+Z and GUI acceptance (HISTORICAL FAIL)

- [I34 real X11 41279540150](https://github.com/i-shutov/tikzarium/actions/runs/41279540150) correctly failed closed: X11 Button1Mask **256→0** across `xdotool key --clearmodifiers` before QA mouseup, so old “held” ghost tests used invalid input. I35 replaces that key with genuine XTestFakeKeyEvent key-only Ctrl+Z, demonstrated under isolated Xvfb to preserve Button1Mask=256, and keeps server mask/byte-exact/no-ghost tests. No B production edits; actual I35 acceptance and physical Win10/M1/M4 NOT_RUN, no merge/release.

## Unreleased — I34 B30 real held-pointer XQueryPointer forensic acceptance (QA_HARNESS FAIL)

- I33 actual [X11 41279059557](https://github.com/i-shutov/tikzarium/actions/runs/41279059557) **FAIL**: before explicit driver mouseup, Ctrl+Z screenshot reveals ghost Line #2; saved .tex contains Line IDs 1+2, matching previous B29 source SHA exactly. QA now queries actual X11 Button1Mask before/after key to distinguish XTest-button release from application early insertion. Fail closed on absent held button; source-rollback assertions unchanged. B30 production and C catalogue untouched, physical Win10/M1/M4 NOT_RUN; no release.

## Unreleased — I33 B30 real X11 pointer Undo QA (historical FAIL)

- First exact B30 QA [41278805656](https://github.com/i-shutov/tikzarium/actions/runs/41278805656) failed **offline fixture-key consistency** before launching the executable; corrected the test reference to the unchanged B30 fixture marker. This is a QA preflight correction, **not** a real GUI FAIL/PASS; strict live test unchanged.

- QA-only integration at B30 #69 exact `750fb6b743a516f44a362f2f568ce1b92c69e6f4` and source tree `965933b3f70504f2f4082bc22795bab67fad5d44`; real X11 six-tool/held-click and held-drag Undo, exact source restoration without ghosts, Russian F1, GUI XeLaTeX PDF, fit/resize screenshot evidence. Historical B29 GUI [41274957152](https://github.com/i-shutov/tikzarium/actions/runs/41274957152) FAIL. B30 hosted CI 5/5 workflow families PASS does not prove actual GUI; B30 X11 NOT_RUN at commit. Physical Win10/MiKTeX and M1/M4 XeLaTeX NOT_RUN; no release.

## Unreleased — I31 B29 source-history actual GUI re-acceptance (NOT_RUN)

- Independently pinned QA source to B29 draft PR #69 HEAD `133cab9eff2da0e2ab2ae9574e5328f2dad3ee62`, app tree `d7a487e91614c7b607ce92f53275e10e2a5ee911`. Previous B28 real X11 [41271432298](https://github.com/i-shutov/tikzarium/actions/runs/41271432298) failed despite apparent Undo success. Re-run real held-click and held-drag Undo plus 6 native tools, GUI Save/Build/Export and F1/PDF screenshot audit without weakening test predicates; no B production changes, old #48 untouched. Hosted B29 CI does not replace actual X11; physical Win10/Mac NOT_RUN. No release.

## Unreleased — I29 B28 X11 initial source-save gate: explicit GUI Save (pending rerun)

- [I28 run 41271124460](https://github.com/i-shutov/tikzarium/actions/runs/41271124460) failed before held-pointer tests: actual source editor displayed original Unicode and path but Ctrl+S did not persist the file. Real pointer/PDF NOT_RUN. QA now records shortcut failure separately and uses the visible GUI Save button to test the required source-persistence vertical; no TeX is fabricated and shortcut is not called PASS. Corrected exact-head CI/visual evidence pending.

## Unreleased — I28 B28 focus-safe pointer Undo real X11 gate (NOT_RUN)

- QA-only integration onto exact B28 `f2dfbd0bb073e6152146a151eca138af8fc030e1`, source tree `4be7a5aebbdd77a820abc08ea37d349dcab6bcec`. Existing B27 real-X11 FAIL retained. Requires actual Ctrl+Z during a held guide pointer despite TextEdit focus, byte-exact Save rollback, no ghost, 6 native tools, Russian F1, GUI XeLaTeX PDF and independent visual review. Real B28 X11 / physical OS NOT_RUN pending new exact-head evidence.

## Unreleased — 2026-11-01: I26 B27 physical-input Linux/X11 Undo + six native tools (QA PENDING)

- QA-only branch based on [#69 B27](https://github.com/i-shutov/tikzarium/pull/69) exact source HEAD `1805a46cbca2985c4b4798ccf4b0e22171107297`, app source tree `5274ea9c12a3a9f25cea3b47c0fa504c1b5fff1b`. No edits to B-owned Rust or the old independent #48 branch. Updated X11 driver sends **real Ctrl+Z while holding a mouse press/drag on the provisional guide**, releases, GUI-saves and checks exact restored source bytes and zero ghost commands; then creates a fresh line, verifies Save and proceeds with all six native TikZ gestures, contextual Russian F1 and actual GUI XeLaTeX PDF/fitting.
- This is **NOT_RUN until exact-head hosted workflow plus independent saved-source/PDF/screenshot artifact review**. Unit-event B27 proof cannot substitute. Hosted X11 is not physical Windows10/MiKTeX or Mac M1/M4/XeLaTeX acceptance; no release. Cargo.lock remains untracked.


## Unreleased — 2026-11-01: I24 B26 actual X11 sticky whole-page resize QA (NOT_RUN)

- Non-production I23 QA bridge merged with **B26 #67** exact source `73878df418dd6343bbca9dd94a2e5daf979ed7fc`, src tree `47c4c86be10471a5f56f7019ad63a77e7f4480f5`; actual egui six-tool + GUI-save/build/export + Russian F1 and full-PDF visual evidence must be regenerated on B26. Driver now captures a genuine selected Fit Page resize/restore (1180×680 ↔ 1366×740); screenshot difference is **not** a visual PASS, and desktop new-page raster still NOT_RUN. Track exact Cargo.lock resolution separately, do not claim physical Win10/MiKTeX/M1/M4 QA. No release.


## Unreleased — 2026-11-01: I23 B25 real GUI whole-page QA bridge (B25 ACCEPTED, B26 NOT_RUN)

- Subsequent independent I23 B25 run [41258646232](https://github.com/i-shutov/tikzarium/actions/runs/41258646232) SUCCESS: artifact `13064825120`, 29/29 report hashes, six actual native pointer gestures, GUI-save original macro, XeLaTeX PDF with embedded font/Cyrillic and original full PDF with six shapes + bottom-left text visually reviewed in «Вся страница». This does **not** transfer to B26 persistent fit-page. Physical Win10/Mac NOT_RUN.
- QA branch based on B25 [#67](https://github.com/i-shutov/tikzarium/pull/67) exact `0174bab2fdc9b6f47f8680f01fbbfba93858f877`, app-src tree `033ece8a178c5c7d315fb95267e348975fe4b5d5`, original active I06 #48 untouched. Actual Linux/X11 six native gestures, GUI Save/Build/Export, Russian F1 and new **«Вся страница»** candidate screenshots will be inspected before QA is called PASS; frame change alone is insufficient. Proposed coordinates require recalibration, and B24 PASS is not inherited. Physical Win10 x64/MiKTeX and Mac M1/M4 XeLaTeX NOT_RUN. No release.


## Unreleased — 2026-11-01: I21 B24 real egui GUI re-acceptance (NOT_RUN until exact-head evidence)

- B24 production [#62](https://github.com/i-shutov/tikzarium/pull/62) exact `33f5ef5cc0f5dbb955d7979497a291845b9f6130` is now included in QA [#66](https://github.com/i-shutov/tikzarium/pull/66) alongside the seven original I19 QA-only files. The real-window test tree pin is updated from B23 `0fbea02a14a08e568da831d78c562cd20dedb8d9` to B24 `e00089592b23219df58adf6cc9550ecaefd7414b` without replaying older I06 branch or overwriting B-owned files. Actual B23 6/6 gestures, GUI PDF, Russian F1, and full-page 32% acceptance are **historical B23 evidence**, not B24 PASS. Pending fresh exact-head hosted X11 run, source/PDF/screenshot review, lease-controlled QA merge into #62 and separate B/main CI. No physical Windows10 or macOS tests, no release.

## Unreleased — 2026-11-01: I19 independent B23 Linux/X11 real GUI acceptance (PASS, not physical OS)

- **Exact QA source HEAD `519c288fb34d48e4354ce292681cec495cc00246`**, [actual GUI CI 41251681392](https://github.com/i-shutov/tikzarium/actions/runs/41251681392) **SUCCESS**. Independently downloaded [artifact 13061293588](https://github.com/i-shutov/tikzarium/actions/runs/41251681392/artifacts/13061293588), ZIP SHA-256 `852ef10b43ee7217c98f8f4cbcdef9b5aa7e64c378a39f52a1fd57de25ebef63`: 29/29 CRC-clean members, 27/27 JSON manifest hashes match uploaded files, including generated Cargo.lock for transparency. Actual B23 egui executable X11/Xvfb performed **6/6 GUI pointer gestures and GUI Save**, distinct native TikZ commands, v2 owner IDs 1–6, unchanged original Cyrillic opaque macro; true GUI Build/Export generated one-page external XeLaTeX PDF SHA-256 `955138a162998731acdc9093e91ca18d7b353cd607c7efc5807c71533c3d7795` with embedded DejaVuSerif, extractable `A` and `Не менять`.
- **Independent screenshot review PASS for contextual F1 and complete PDF:** original full-page raster compared with actual [`04b-entire-page-candidate.png`](https://github.com/i-shutov/tikzarium/actions/runs/41251681392/artifacts/13061293588) SHA-256 `34da9712032e4fb94696dd22bc572be45ab7856442dc7de84b6f9bc8c1806a2c`: full page includes **all six shapes and the lower-left Cyrillic `Не менять`** beside the always-visible TeX source, and real F1 screenshots visibly toggle Russian C-catalogue Bézier help. At 1366×740 **Fit width alone** is vertically clipped; one existing **Zoom Out** click after Fit width (38%→32%) shows the complete page. This is a verified user path, **not** a newly implemented Fit-page button or pixel-calibrated authoring overlay.
- These live results prove **hosted Linux X11 egui B23**, not physical Win10 x64 with independently installed MiKTeX or physical Mac M1/M4 external XeLaTeX, both **NOT_RUN**. B23 PDF fonts independent from GUI theme; source macros untouched; no release. QA PR #66 still requires exact final documentation HEAD CI, integration into B23 and separate main post-merge checks.


## Unreleased — 2026-11-01: I19 proposed B23 real Linux/X11 desktop acceptance (NOT MERGED)

- This QA integration branch is cut **from exact B23 #62** `fb8908adff8b993670ae0a69f3f65d413318515a`, not from diverged I06 #48 or the superseded #37/#43. Transplants only I06 desktop driver/tests/profile/workflow, alongside I19 docs and this record. It does not modify B-owned app, C catalogue, A/D core or independent active QA branch. The initial profile is tied to the B23 `crates/tikzarium-app/src` Git tree `0fbea02a14a08e568da831d78c562cd20dedb8d9`; stale application edits fail instead of silently reusing coordinates.
- Accepted predecessor D04 [#27](https://github.com/i-shutov/tikzarium/pull/27), main `e28a3a4fb067a0a752d720cea484043d52beab00`, adds source-specific negative XeLaTeX diagnostics; accepted A/W05 [#28](https://github.com/i-shutov/tikzarium/pull/28), main `9b4cd26b5b73f8011b975f9922cb208e36e12564`, adds fail-closed SHA-256 `.fls` dependency freshness. Both are already included in the B23 ancestry. Prior actual B22 X11 run [41247531372](https://github.com/i-shutov/tikzarium/actions/runs/41247531372) produced six saved source commands and real GUI-exported PDF, but its visible PDF viewport was cropped and F1 had not been visually checked.
- I19 updates the X11 profile toward screenshot-observed Fit width, enforces F1/fit frame changes without calling them a visual content PASS, adds external-PDF reference PNG and the previously omitted `clipboard-input.txt` to artifacts. Actual B23 desktop execution, whole-page screenshot comparison, exact-head PR CI, and post-merge CI are **NOT_RUN** until new GitHub workflow evidence is reviewed. First QA HEAD `0739e81a` failed at an unintended extra `cargo build --locked` gate: Cargo 1.91 wanted to update tracked Cargo.lock; no GUI started. Corrected QA uses the same non-locked Cargo build as preexisting B23 hosted CI and now captures `cargo-lock.diff` plus a visible warning, for later shared lock review. A green driver only means automated predicates, not independent visual acceptance.
- Physical **Windows 10 x64 with separately installed MiKTeX** and actual **Mac ARM M1/M4 with external XeLaTeX** remain **NOT_RUN**. Hosted Server ≠ Win10; Xvfb ≠ native Mac; figure fonts independent of GUI theme; no silent TeX/package install, no release.


## Unreleased — 2026-10-31: I13 accepted C/N2 library catalogue and D10 MiKTeX evidence

- **C/N2 [#58](https://github.com/i-shutov/tikzarium/pull/58)** merged from exactly tested source HEAD `7114d2d9bb3ce622dd7f1523e53f72082557d446` at main `8a33b2f67f7e72202e8abbe31f74ec21d22ac889`. Four native PGF/TikZ libraries (`arrows.meta`, `positioning`, `calc`, `fit`) now share the original six-primitives C schema, Russian contextual help, verified manual sections and separate installed/project-loaded/XeLaTeX-compatible/tool/help status. A targeted document-body import scanner returns UNKNOWN for late/imported dependencies, preserving confirmed preamble source locations while refusing uncertain source edits; no opaque macro expansion, automatic package install or new Rust TeX interpreter.
- C/N2 exact-head five workflow families PASS: [Rust 3/3](https://github.com/i-shutov/tikzarium/actions/runs/41215112434), [D QA 7/7](https://github.com/i-shutov/tikzarium/actions/runs/41215112467), [N1 app state → actual XeLaTeX](https://github.com/i-shutov/tikzarium/actions/runs/41215112448), [MiKTeX on hosted Windows Server](https://github.com/i-shutov/tikzarium/actions/runs/41215112465), [fonts](https://github.com/i-shutov/tikzarium/actions/runs/41215112411). Independently checked N1 ZIP `13047845621`, SHA-256 `56ae8b5a49cf5304155dd42153b672445336135e871bc346f25c210a1e34cb1c` and hosted MiKTeX ZIP `13048101044`, SHA-256 `5e913f820283e8345a68717f8345d1c65c9f74d8dbcbd038b6a10aadd0edf639`. Independently compiled all four documented N2 library examples via external local **TeX Live XeLaTeX** with shell escape disabled: four one-page PDFs, not a GUI or MiKTeX claim.
- **D10 [#63](https://github.com/i-shutov/tikzarium/pull/63)** merged from exact source HEAD `606fd4b3b3472acc8ea78b9d45dde37c7c4ee6d5` at main `aa6d1d08caee984d5f31ac13396e346fc451c8fe`. The direct handwritten baseline PDF now receives the *same* Unicode/font/page audit as all five other positive PDFs, and strict negative TeX logs must begin with the actual MiKTeX XeTeX engine identity. Source-head real hosted MiKTeX [41215828555](https://github.com/i-shutov/tikzarium/actions/runs/41215828555), Rust [41215828562](https://github.com/i-shutov/tikzarium/actions/runs/41215828562), D QA [41215828566](https://github.com/i-shutov/tikzarium/actions/runs/41215828566), fonts [41215828554](https://github.com/i-shutov/tikzarium/actions/runs/41215828554) PASS. Audited 45-file MiKTeX ZIP `13047761760` SHA-256 `fc3c225fa9a608b6465539f2537d2bc234a247ea1665dd6757e3ef8cb793bea6`.
- **Post-merge actual main `aa6d1d08caee984d5f31ac13396e346fc451c8fe` is independently checked:** [Rust 3/3](https://github.com/i-shutov/tikzarium/actions/runs/41217239643), [D QA 7/7](https://github.com/i-shutov/tikzarium/actions/runs/41217239580), [real hosted MiKTeX 1/1](https://github.com/i-shutov/tikzarium/actions/runs/41217239682) COMPLETE SUCCESS. Re-downloaded the hosted MiKTeX artifact `13048052949`, SHA-256 `e1dcee9294e83705011733fa29ac95918326ed0249ee080246c6f171f5522163`, CRC-valid 45 files; `miktex-qa.json` commit/source SHA matches main, `accepted=true`; independent Poppler checked **6/6 actual one-page PDFs**, Unicode/Cyrillic+math and embedded DejaVuSerif/LatinModernMath; 9130/9130 package-list hashes identical. Historical intermediate C-only main `8a33b2f6` hosted MiKTeX [41217225528](https://github.com/i-shutov/tikzarium/actions/runs/41217225528) FAILED *before* compilation on external private package index refresh timeout: do not call that job a PDF PASS or weaken offline gate. Latest main new run succeeded.
- Remaining real GUI gate: draft [B16 #62](https://github.com/i-shutov/tikzarium/pull/62) headless egui Response-event six-tool PASS but not merged; [I06 #48](https://github.com/i-shutov/tikzarium/pull/48) actual Linux X11 remains 5/6 mouse gestures and **FAIL** Bézier tool selection due to obsolete fixture coordinate; real GUI Build/Export PDF **NOT_RUN**. Physical Windows 10 x64 with user MiKTeX and physical Mac M1/M4 with user XeLaTeX **NOT_RUN**. Hosted Windows Server 2022 is not Win10. Lua-only `graphdrawing` incompatible with XeLaTeX. No release.

## Unreleased — 2026-10-31: I12 verified B15 egui/TikZ source-first integration

- [PR #50](https://github.com/i-shutov/tikzarium/pull/50) merged at `8c77976ec6c5698904cdd15a2d45a310a34dca33` from exact head `6a1f3f9c5d7ed060e53c072b6ee36bb115dd23d7`. Source visible alongside external XeLaTeX PDF, six C-native TikZ tools, Russian context F1/help, explicit C/N2 import preview and undo, source-line focus, Alt-selection, Esc-cancel and stale-Undo invalidation. User macros and CRLF not replaced. No private TeX parser or hidden installation.
- All five exact-head workflow families SUCCESS: [Rust](https://github.com/i-shutov/tikzarium/actions/runs/41210626857), [D QA](https://github.com/i-shutov/tikzarium/actions/runs/41210626845), [N1 source to XeLaTeX](https://github.com/i-shutov/tikzarium/actions/runs/41210626866), [hosted MiKTeX](https://github.com/i-shutov/tikzarium/actions/runs/41210626859), [font gate](https://github.com/i-shutov/tikzarium/actions/runs/41210626838). Independently inspected real N1 PDF PNG and SHA-256 audited artifacts (details in I12 insight).
- Main post-merge jobs [Rust](https://github.com/i-shutov/tikzarium/actions/runs/41212000216), [D QA](https://github.com/i-shutov/tikzarium/actions/runs/41212000320), [MiKTeX](https://github.com/i-shutov/tikzarium/actions/runs/41212000199) require separate completion. Linux/X11 actual egui #48 remains 5/6 gestures PASS, cubic FAIL; GUI PDF export and native Windows10/M1/M4 acceptance NOT_RUN. Lua-only is not XeLaTeX compatible. NO RELEASE.

## Unreleased — 2026-10-31: I11 C04/C06 catalogue gate restoration and C/N2 integration

- Merged C/N2 source attribution [#55](https://github.com/i-shutov/tikzarium/pull/55) at main `b7c8e993b9da64060dfd3261833e4be3a1d280ba`, exact head `0cc7427cbbdee8b5ffe5fa63dcc8737ae5781cba`; seven new provenance tests and no opaque source changes. All five source-head workflow families SUCCESS. Independently inspected hosted real MiKTeX artifact `13045161386` (SHA-256 `6970bdfb252bc07d854d544bbf801db6b24285ed672345108d0995b0692d9368`; 44 ZIP members, six PDFs, 9,130 identical package rows) and Linux N1 PDF artifact `13044543886` (SHA-256 `0ed343667fc89acf2967193d2dcc6f0f2fa1a3e2dc5cfdf7cc145a0d59707191`, 9/9 manifest hashes, embedded fonts and Unicode text). No physical GUI claim.
- Recover **previously unmerged** C04/C06 #26/#34 code: static `verify_catalog.py`, 14 tamper tests, bounded input validation and machine-readable JSON on Linux XeLaTeX fixture CI plus three hosted QA Rust jobs. Source old head `2fad1ab90b56a749ceceeb1725e82804c2b0597d`; adapt workflow steps without replacing modern workflows. Metadata is not installation, compilation of all packages or visual-edit evidence. Lua-only remains incompatible with XeLaTeX.
- This I11 branch CI is PENDING until exact-HEAD jobs plus artifact inspection. Post-merge main CI required. Physical Windows 10 x64/MiKTeX and Mac M1/M4 native GUI remain NOT_RUN. No release.


## Unreleased — 2026-10-31: I10 D07 exact-main MiKTeX proof and C/N2 reversible library imports

- Integrated [D07 #52](https://github.com/i-shutov/tikzarium/pull/52) into main at `1e3a1e7131bd6e8d9c9d9d9c93ae5c9203c0f455` from exact C-independent D head `69387a230d746a0af16bc46593ca21b1dfe882d5`. Real MiKTeX Windows Server 2022 CI now covers BOTH pull requests and filtered pushes to main, including changes confined to the N1 app, extension library, catalogue, fixtures and Cargo manifests. A structural Python regression checks the trigger contract.
- D07 source-head workflows completed SUCCESS: real MiKTeX [41201660165](https://github.com/i-shutov/tikzarium/actions/runs/41201660165), Rust [41201660163](https://github.com/i-shutov/tikzarium/actions/runs/41201660163), D QA [41201660229](https://github.com/i-shutov/tikzarium/actions/runs/41201660229), font gate [41201660208](https://github.com/i-shutov/tikzarium/actions/runs/41201660208). Re-downloaded artifact `13043002420`, ZIP SHA-256 `78e0f3aa6d514251cb079cfa5fa3b80886d690fee6caf6736e4b749129437112`; 44 CRC-valid members, six independently inspected one-page PDFs, correct extracted Cyrillic/math and embedded DejaVuSerif/LatinModernMath. The 9,130 before/after MiKTeX package records are byte-identical; AutoInstall=0 and explicit per-process `--disable-installer`. This is hosted Windows **Server**, not physical Windows 10.
- Integrated [C/N2 #51](https://github.com/i-shutov/tikzarium/pull/51) at main `6d15d86344ab1281391d3ea1b458dc18ae443985` from exact source head `3d64c60815f7980df67394ce6fd2541f80b75c43`. Additive C-owned Rust code proposes a revision-checked, reversible, source-visible removal of literal `\usetikzlibrary` imports for arrows.meta/positioning/calc/fit; refuses opaque/macro/conditional, comment-bearing, duplicated or mixed-EOL edits. The shared inspector now retains explicit literal import evidence from a trusted preamble prefix, without claiming TeX package installation or expanding unknown user macros.
- C/N2 exact-head checks SUCCESS: Rust [41202090696](https://github.com/i-shutov/tikzarium/actions/runs/41202090696), D QA [41202090692](https://github.com/i-shutov/tikzarium/actions/runs/41202090692), N1 actual app-state → external XeLaTeX [41202090704](https://github.com/i-shutov/tikzarium/actions/runs/41202090704), font gate [41202090693](https://github.com/i-shutov/tikzarium/actions/runs/41202090693). Independent `n1-app-authoring-linux` archive `13043022726`: ZIP SHA-256 `bd957348fb67e965565cc19eb626d6587a476e8deda08c7c2f944dc58bb3af3e`, 34 CRC-valid members, 9/9 file hashes, three one-page PDFs, actual Cyrillic/math extraction and embedded fonts. This is programmatic app state, **not** an egui pointer acceptance.
- **Post-merge main `6d15d86344ab1281391d3ea1b458dc18ae443985` complete hosted PASS:** Rust [41203529736](https://github.com/i-shutov/tikzarium/actions/runs/41203529736) 3/3, D QA [41203529679](https://github.com/i-shutov/tikzarium/actions/runs/41203529679) 7/7, genuine MiKTeX [41203529698](https://github.com/i-shutov/tikzarium/actions/runs/41203529698) 1/1. Independently downloaded main-push MiKTeX artifact `13044230534` SHA-256 `0c6f7a1af3871ab7078d104272c6a1fe221f1bb095747f5468abd58776430eb1`, 44 CRC-clean files; report `commit_sha=source_head_sha=6d15d863...`, six correct PDFs, 9130 unchanged package records, source-specific strict negatives without PDFs. This is hosted Windows Server 2022 CI, not Windows 10.
- GUI B10/B11 [#50](https://github.com/i-shutov/tikzarium/pull/50) remains draft: previous N1 full-run FAIL on `75e5cb04` against old C scanner; B needs a fresh rebase and exact-head rerun. Real Linux X11 desktop #48 remains 5/6 mouse gestures, sixth Bézier coordinate FAIL, GUI PDF/export not accepted. Physical Windows 10 x64 MiKTeX and Mac M1/M4 remain **NOT_RUN**. Lua-only graphdrawing remains incompatible with XeLaTeX. No release declared.

## Unreleased — 2026-10-31: A/W06 external MiKTeX offline build integrated (#38)
- Merged verified core/CLI code at main `013720ee6f0e1dc29f487124499ed9469d86b089` from PR head `74ca61c6aff408d92286f91e0b49143e9b7e72b1`: read-only `doctor` package lookup with explicit PRESENT/MISSING/NOT_CHECKED; selected XeLaTeX identity validation and fail-closed invalid user path; per-process MiKTeX `--disable-installer` without persistent package/settings mutation; no embedded TeX distro or implicit fallback.
- Changed nine A-owned code/test/fixture/plan/insight files. Branch-head 16/16 checks SUCCESS including actual hosted Windows Server MiKTeX 25.12; independently audited artifact [13041745718](https://github.com/i-shutov/tikzarium/actions/runs/41197706754/artifacts/13041745718), ZIP SHA-256 `59debcf6045fcc1d4cfba8c221712a602412eb3c8023f1a3994a5be702e0bb2a`, 6 PDFs with extractable Cyrillic/math and embedded fonts, Lua-only/missing-library negative results, and byte-identical package inventory. Main Rust CI [41198781494](https://github.com/i-shutov/tikzarium/actions/runs/41198781494) plus D QA [41198781586](https://github.com/i-shutov/tikzarium/actions/runs/41198781586) both SUCCESS on exact merge SHA.
- Physical Win10 x64 MiKTeX and Mac M1/M4 GUI acceptance remain NOT_RUN. D07 real MiKTeX **post-main** job is not automatically proven by branch-head checks; #52 follow-up triggered and its initial external installer download failed. Linux/X11 desktop gestures 5/6 on #48 but cubic + GUI PDF/export still FAIL/NOT_RUN. B10 #50 still fails actual N1 generated-authoring proof because C imports scanner mistakes unrelated font/user macro lines for unknown loaded status; no unsafe workaround. No release declared.


## Unreleased — 2026-10-31: I07 bounded initial XeLaTeX PDF preview

- Protect the **first-page** Poppler renderer (`tikzarium-core::preview`), previously missing time and allocation budgets despite B05 navigation and B06 PNG decoding protections: 45-second subprocess deadline with kill/wait; 64MiB compressed PNG read cap.
- Source and canonical compiled PDF are never modified by the guard. On missing/stalled/oversized raster, retain the valid PDF and report a preview-specific error instead of hanging indefinitely.
- Add five small Rust tests (portable and Unix mock-tool paths), separate physical Windows 10 and M1/M4 QA protocol, plan, insight. Existing full workspace CI exercises the tests; exact new-head results PENDING at authoring. No package capability changes.

## Unreleased — 2026-10-31: N1 native TikZ visual authoring merged (#44)

- **Implemented and merged**, not merely proposed: six Rust/egui TikZ-native input tools (line, arrow with explicit `arrows.meta`, rectangle, circle, text/math node, cubic Bézier). Main after [PR #44](https://github.com/i-shutov/tikzarium/pull/44): `6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49`; validated source HEAD `1a274485ca8e728643bc0cf0ed79a18c6b4d5c34`.
- A single C-owned declarative schema drives six code generators, 28 editable parameters and Russian syntax/unit/allowed values/editor preset warnings/help/manual links, shared by toolbar, inspector and F1/hover. The normal Split workspace shows editable TeX adjacent to PDF and visually separate, approximate input guide; the authoritative figure is rendered by external XeLaTeX, **not Rust**.
- Generated commands use owned metadata in TeX comments, source-range + monotone revision preconditions and undo; unknown author TeX is not parsed/rewritten. Visible `\\usepackage` / `\usetikzlibrary` patches require an explicit user action; no automatic MiKTeX or package installs. Figure fonts and four persisted egui themes remain independent.
- Independent exact-source-head CI: [Rust CI 3/3](https://github.com/i-shutov/tikzarium/actions/runs/41190945419), [D QA 7/7 incl. 3 hosted OS](https://github.com/i-shutov/tikzarium/actions/runs/41190945357), [real N1 app-state → XeLaTeX/PDF 1/1](https://github.com/i-shutov/tikzarium/actions/runs/41190945352), [Cyrillic+math+embedded fonts 1/1](https://github.com/i-shutov/tikzarium/actions/runs/41190945413). The N1 artifact `13037984941` ZIP SHA-256 `a86d8bf24338105f6b9519323b761dab4d55c9a24ef0798abef307d33ff0d800` was downloaded: 34 CRC-clean members, 9 manifest hashes, actual 3 PDF pages (3 one-page PDFs), embedded fonts and extractable Cyrillic/math. Crosshost verification artifact `13038961920` ZIP SHA-256 `22863f21bae9472f6ff19ceeccd32f54d416a6c35da22ae209150c504d302b12`, accepted for hosted Linux/Windows Server/macOS ARM.
- **Remaining NOT_RUN**: true GUI mouse/drag/restart screenshot acceptance on Windows 10 x64 MiKTeX and physical Mac M1/M4. Separate MiKTeX-specific Windows Server D06 #40 is not included or claimed PASS. PGF Lua-only graphdrawing is not XeLaTeX compatible. Post-merge main CI still pending on initial integration ledger; N1 is not a release.

## Unreleased — 2026-10-31: I06 source-saving integrity (draft until CI)

- Normal Build/Save of an **unchanged** TeX buffer now checks the bound file's bytes, then performs a **true no-op**: preserves file identity, symlink/hardlink relationship, timestamps and user content rather than replacing it with a temporary file.
- Reject externally changed/deleted open files instead of silently overwriting the external edits; dirty save of symlink and read-only file fails with a descriptive error and leaves original bytes unchanged. Explicit Save As to a new regular path remains possible.
- Added 6 source integrity tests (including Unix symlink and inode regression); both hosted Rust workflows now run the source-integrity subset explicitly, in addition to workspace tests. **PR exact-head CI PENDING**, physical Windows 10 and M1/M4 GUI NOT_RUN.
- This is a preflight protection, not an inter-process lock or race-free compare-and-swap. No editable TikZ capabilities or XeLaTeX package statuses are promoted; `extensions/PACKAGE_MATRIX.csv` deliberately unchanged.

## Unreleased — 2026-10-31: I05 hardened XeLaTeX runner and extension evidence

- Correct the Windows-hosted XeLaTeX `./filename.tex` source operand: never construct it using Windows-native `Path::join` (`.\\filename.tex` is a TeX control-sequence hazard). Use an `OsString` literal `./` prefix and regression-test ordinary, leading-dash and Cyrillic filenames. Re-run cross-host CI against the exact new SHA; no Win10 acceptance claim.

- Reconciled former A #10 runner improvements with F02 font-warning detection: XeLaTeX retains structured file+line diagnostics, optional durable logs, source-safe atomic output and recorder paths.
- GUI error panel uses structured failures and refuses current-buffer line jumps for diagnostics belonging to a different included TeX file.
- C03 verifier now runs after real five-fixture extension XeLaTeX observation in Linux CI and on each hosted Windows Server/macOS ARM/Linux D QA job. Stored artifact hashes and Lua-only negative are audited, not merely reported.
- Exact-head CI and uploaded evidence are PENDING at initial integration. Native Windows 10 and M1/M4 GUI remain NOT_RUN. No v0.1 release claim.


## Unreleased — 2026-10-31: I04 two-page PDF integration gate

- Added `scripts/qa_multipage_pdf.py` for actual Rust CLI → XeLaTeX → Poppler two-page evidence, including page-specific Cyrillic text and distinct 120-dpi PNG hashes.
- Added nine offline negative-control unit tests for invalid page counts, Unicode cross-page leakage, fake/identical PNGs, source mutation and unsafe output paths.
- Wired Linux real-tool GitHub Actions and artifact upload; new checks are **PENDING exact-head CI**, never predeclared PASS.
- Original TeX source is not passed to the CLI: the harness copies it and checks SHA-256 before/after. No GUI theme, figure font or Lua-only engine claims are expanded.
- B03 first-page/multi-page GUI clickthrough on physical Windows 10 and Mac M1/M4 remains **NOT_RUN**, as does geometric visual editing.

Unreleased development state; no production release.

## Unreleased — 2026-10-31: W01 → B01 → B02 → F01/U01 merged to main

- Integrated four **real, previously tested** PRs in dependency order: #6, #8, #12, #16. Main after #16: `3f71681a4d0febe143f0777d635867e9287e82eb`.
- W01: Rust workspace, source-preserving XeLaTeX runner and exact PDF/first-page raster preview, Linux real-compiler fixture, hosted Windows/macOS Rust checks.
- B01: egui Source/Split/Canvas, native Save As, clickable diagnostics, last-good PDF; Canvas remains read-only.
- B02: path-aware stale PDF guard, safe export gating, Ctrl/Cmd open/save/build shortcuts and in-flight file identity protection.
- F01: validated `fontspec`/`unicode-math` figure family recipes, isolated XeLaTeX glyph/embedding PDF proof, no mutation of author TeX source.
- U01: independent persistent egui Light/Dark/Midnight/Paper themes and compact density. UI appearance is not a TikZ style or TeX font.
- Added integration `plans/` and `insights/` SHA/run/artifact ledger; branch-head CI green, **post-merge main CI pending when ledger authored**.
- D QA #9 merged at `2848697cb8c1d374bcbfd5e651a2319cf48ea830`: 3 hosted OS real XeLaTeX jobs plus Rust/QA harness matrix; not equivalent to Win10 GUI smoke.
- C01 registry #7 merged at `f2a87c0c27c07ef423f33dd60435adaac1fa3284`; C02 auditable fixture observations #13 merged at `f2a55fa13fd9a1e0af2718bc328ed16786975184`. Extension matrix keeps package installation, compilation, inspection and editability separate. Lua-only statuses remain incompatible with XeLaTeX.
- A #10 source-file diagnostic parser remains unmerged due a real conflict with font-warning handling. No artificial success flag.
- Release blockers remain: physical Windows 10 x64 and M1/M4 acceptance, full extension family testing, reliable multi-page PDF UI, visual editing. LuaTeX-only packages are not promised under XeLaTeX.

## Unreleased — 2026-10-31: integration W01 Unicode gate

- Require DejaVu Serif for the W01 Cyrillic sample rather than the implicit Latin Modern font that dropped 19 characters.
- Gate compiled Rust CLI → XeLaTeX PDFs on real Poppler Unicode text extraction; page count alone is insufficient.
- Preserve source hashes and save PDF/CLI SHA-256, tool versions and extracted text; upload partial artifacts on smoke failures.
- Add seven standard-library Python tests for text audit and failure behavior.
- Native Win10 22H2 GUI, physical M1/M4 Retina GUI and production release are **not** accepted. Lua-only graphdrawing is **not** supported by XeLaTeX.

## W01 baseline

- Four-crate Rust workspace, egui shell, XeLaTeX core/CLI, package catalogue and hosted CI in draft PR #6.
- Independent QA PR #9 documented the missing-Cyrillic-glyph false positive.

- I05 QA found TeX Live 2026/PGF 3.1.12 wraps the required LuaTeX graphdrawing diagnostic **inside the word graph**; narrowed negative-control matching to the full phrase with allowed TeX line wraps, with targeted regression tests. Previous TeX Live 2023 five-fixture artifact audit remained green. Fresh head CI pending.

- **I19 lockfile diagnosis correction:** checked B23 Git root tree and `.gitignore`: the repository does **not** contain `Cargo.lock` at all; `--locked` failed because no lockfile existed, not because a tracked file changed. The X11 workflow now captures generated `Cargo.lock` in its evidence and warns that exact dependency resolution is not yet version-controlled. This is separate from all TeX package offline guarantees and a reproducibility item for release acceptance.

- **I19 actual CI preparation correction:** [run 41250983388](https://github.com/i-shutov/tikzarium/actions/runs/41250983388) compiled B23 and passed 7/7 offline predicates but failed **before X11 launch** because generated lockfile evidence was mistakenly put in the GUI driver's must-be-empty output directory. The lock evidence now uses a distinct sibling directory, uploaded with the GUI artifacts; the unmodified driver still refuses stale/nonempty GUI evidence. No production source changes and no real GUI PASS inherited from this preparation failure.

- **Independent I19 B23 real GUI proof:** [PR #66 exact 79b5859](https://github.com/i-shutov/tikzarium/pull/66), [X11 run 41251332807](https://github.com/i-shutov/tikzarium/actions/runs/41251332807) **SUCCESS**, independently downloaded artifact `13060884416`, SHA-256 `a72ebdf179a479555318160436de67f441fffd9142422120a1f95311a6f4f9d3`, all 28 entries CRC-clean. Actual B23 process performed 6/6 native gesture→GUI Save; 26 manifest-listed files SHA-256 match, Unicode source original and v2 owners 1–6 correct; real GUI Build/Export produced 1-page PDF SHA `b6434b5e76adcf180e8a2a8751d4b5342ae3b3bf02f9cac851edb2eb6b962c19`, embedded DejaVuSerif and text `A`, `Не менять`. F1 Russian contextual help was independently visually verified in the true X11 screenshots. **Remaining visual defect:** Fit width displays all six native shapes but crops the original bottom-left `Не менять` label in the 1366x740 Split viewport (PDF raster independently proves it exists); this is not FULL_PAGE_PASS. I19 QA now additionally tests one real Zoom Out action and uploads a separate candidate whole-page screenshot; fresh exact-head CI/screenshot review is required before merging. No B production edits.

- I46 QA expanded to actual unbound-scratch GUI Save/Ctrl+S/Build negative paths before dirty Open, with exact victim-byte retention and independent screenshots. Fixed driver-only Openbox activation race using verified direct X11 focus fallback after a documented run failure (41307305009), not a product GUI failure. No manual visual acceptance yet.


### I48 B35 independent desktop QA checkpoint (2026-11-01)

- Integrated existing I46 dirty-Open and I47 six-native-gesture real-X11 QA onto B35 source `8b4f25bc827b264f10083f038e0f7bd55f8dfe69` / app tree `46aced2dbe1b66ba10d8cc92292024625e73936b`; updated two exact-tree workflows, source profiles and offline regression, preserving all QA-only assets. No changes to authored TikZ, Rust production code or dependencies.
- Prior B34 actual-X11 PASS does not prove the B35 in-modal error. B35 actual GUI/screenshot/PDF evidence NOT_RUN until new exact-head workflow and manual review; physical Windows 10/MiKTeX and M1/M4 remain NOT_RUN.


## I49 B35 actual modal reflow bug in independent X11 driver — 2026-11-01

The first exact QA `94a081559f280acda0fe6718982f98b5866caf31` B35 real egui/X11 I46 run [41313976782](https://github.com/i-shutov/tikzarium/actions/runs/41313976782) **FAILED** at "Production modal never saved scratch to separate file", despite successful app launch, Cargo build, offline predicates, and verified original victim/occupied SHA256 byte preservation. Downloaded artifact [13085569228](https://github.com/i-shutov/tikzarium/actions/runs/41313976782/artifacts/13085569228) (ZIP CRC PASS) and independently reviewed screenshots 05/06/07/08. B35 product's requested fix **IS confirmed in real foreground modal**: 06 displays bright-red "Файл уже существует. Автоматическая перезапись чужого TeX запрещена; выберите новое имя." The live modal layout **re-centers** when this new red error line is shown. Before error the save TextEdit is at approx x465–875, y381–401 (driver click [675,398]); after error it moves to x465–875, y366–387. The old subsequent click [675,398] selected the explanatory text, not the TextEdit. Screenshots 06 and 07 have identical SHA-256; 08 still displays victim.tex, not the intended new scratch destination. Consequently the first X11 red run diagnoses a **QA mouse coordinate defect**, *not* a demonstrated B35 application failure. Do **not** claim the full safe Save/Open, cross-document Undo or GUI PDF PASS from I46 yet.

QA-only correction introduces screenshot-reviewed `modal_input_with_error=[675,376]` and bounds [465,366,875,387], separate from no-error `modal_input=[675,398]`. Driver uses error-state click after each rejected Save, offline tests reject stale y398 and missing bounds; B production Rust/source tree unchanged. New exact-head workflow, saved-scratch exact byte hash, original victim/occupied hashes, cross-buffer Undo, PDF glyph/font, and screenshot 07/08/09 must be independently reviewed before PASS. B35 I47 six actual pointer gestures/held-button Undo/PDF [41313976739](https://github.com/i-shutov/tikzarium/actions/runs/41313976739) **PASS exact previous QA SHA** with B35 app tree, downloaded ZIP artifact [13086785731](https://github.com/i-shutov/tikzarium/actions/runs/41313976739/artifacts/13086785731), ZIP CRC and 42/42 file SHA256 verified and visual sample/manual PDF inspected; this proves that unchanged B35 production tree, not the as-yet-unrun new I46 QA. It does not replace the I46 source-safety gate. Physical Win10+MiKTeX and macOS ARM remain NOT_RUN.

- QA I52 (B37 candidate, **not yet accepted**): source-tree-pinned independent Linux/X11 replay of I46/I47 and two real PDF-focus raster snapshots; PDF stroke fidelity and stale-fit-status remain manual NOT_RUN pending exact-head evidence. No production TeX/GUI changes in QA branch.
