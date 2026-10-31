# Changelog

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
