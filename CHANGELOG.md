# Changelog

## Unreleased — I18 real X11 B22 GUI acceptance (QA candidate, NOT MERGED)

- Integrator-owned [#48](https://github.com/i-shutov/tikzarium/pull/48) now builds independently pinned B22 [#62](https://github.com/i-shutov/tikzarium/pull/62) source `3c6d76894b23397d252d771d985baa933d00723a` in a separate Git worktree, rather than silently testing old N1. B production files are unchanged. Exact B source SHA and QA source SHA are logged separately. A reviewed-source mismatch fails closed.
- Native-source QA now recognizes legacy hex v1 and compact UTF-8 JSON v2 with a single shared strict predicate, unique positive integer IDs, known six tools, string parameters, first marker parsing and byte-for-byte preservation of unrelated original TeX. Offline predicate tests passed (6/6), but they are not GUI proof. Full six gestures, source save, exact XeLaTeX GUI Build/Export and independent raster inspection required before merge. Physical Win10/MiKTeX and Mac M1/M4 remain NOT_RUN.
- Actual [I18-B X11 run 41246572973](https://github.com/i-shutov/tikzarium/actions/runs/41246572973): exact B22 GUI built, but Ctrl+S with Path input still focused failed to create file. Screenshot independently examined (ZIP `13059354386`, SHA-256 `ac16f2c4240d7f3fef5c4baa85ad448f1825e98419f3e7a1bd5a17ed5ac0c6d5`). Driver now records path-field screenshot and refocuses source before keyboard Save; no file fabricated by QA. New exact-head real GUI gate PENDING, not PASS.
- Actual [B22 X11 run 41246209257](https://github.com/i-shutov/tikzarium/actions/runs/41246209257) built, launched and saved original Unicode source successfully, but real first pointer selected Arrow instead of Line from obsolete toolbar coordinates. Inspected screenshot/source artifact `13058913292` and recalibrated all six button positions from the new B22 layout. Next SHA-specific CI currently NOT_RUN/PENDING; no release or #62 merge.

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
