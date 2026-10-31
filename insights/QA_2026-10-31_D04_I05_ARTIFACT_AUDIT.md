# D04 — Independent I05 PR #24 artifact audit (2026-10-31)

## Immutable Git references and source of evidence

- Base `main` at inspection: `e3a78ae5646ef24994161c8ebe7bfaaf7a7d2ab6`.
- I05 PR #24 **source head**: `1db951c02d7aa7a896a661d7f2c17bd7de91c973`.
- GitHub Actions **PR synthetic merge**: `d8b2885a86eeabefa8ccefd954e1e8a0c587505e`. This is not the PR source head. Every downloaded `qa-report.json` explicitly has both.
- [Main Rust+XeLaTeX CI 41180076263](https://github.com/i-shutov/tikzarium/actions/runs/41180076263): 3/3 jobs completed successfully, exact PR head.
- [Figure font proof 41180076278](https://github.com/i-shutov/tikzarium/actions/runs/41180076278): 1/1 Linux job successful, exact PR head.
- [D six-job QA 41180076260](https://github.com/i-shutov/tikzarium/actions/runs/41180076260): 5/6 successful, **Windows Server XeLaTeX failed**. No overall PASS.
- Follow-up triage added to [PR #24](https://github.com/i-shutov/tikzarium/pull/24#issuecomment-6540672462). No A/B/C source was edited by D04.

## Downloaded and actually unpacked three CI archives

Files were obtained from GitHub Actions artifact download endpoint, opened using Python `zipfile`, and parsed using Python `json` + stdlib `tomllib`. Archive byte SHA-256 independently computed in local runtime:

| Hosted CI OS | GitHub artifact | ZIP bytes | SHA-256 |
|---|---|---:|---|
| Ubuntu 24.04 x64 | [13034562992](https://github.com/i-shutov/tikzarium/actions/runs/41180076260/artifacts/13034562992) | 104037 | `88adb72d5cf64c8d44287c3c9acf95e2a6366dc464c1b37bdbeb2b94ecf3bf43` |
| macOS 15.8.2 ARM64 hosted | [13034647150](https://github.com/i-shutov/tikzarium/actions/runs/41180076260/artifacts/13034647150) | 96045 | `1754889b12ef41c3ea5639fb815595ba08263aca4fedcf87c826ce44adbe6d84` |
| Windows Server 2022 x64 | [13035155032](https://github.com/i-shutov/tikzarium/actions/runs/41180076260/artifacts/13035155032) | 4910 | `b11be43a22c279ef39fba3881de94649a1e211c553067b5ea805f4c2f8b78b23` |

### Actual extension evidence on Linux and hosted Mac ARM

Both ZIPs contained:
- An `extensions/audit.json`: `accepted=true`, `complete_suite=true`, `verified_fixtures=5`, `errors=[]`.
- Five **distinct parsed** `observation.toml` files, for `core`, `pgfplots`, `circuitikz`, `tikz-cd`, `graphdrawing-lua`, plus `extensions/summary.json`.
- For each of all five: source SHA-256 recomputed from the corresponding **actual repository source file** fetched from GitHub and compared; `console.log` and TeX `.log` SHA-256 recomputed from ZIP bytes and compared to observation records. All matches exact.
- For each of four positive cases: real PDF exists, %PDF header / EOF, independently recomputed PDF SHA-256 matches observation, return code 0, observed page count 1, `Missing character:` absent from TeX log. Independently reran local Poppler `pdfinfo` on all eight extracted PDFs: **all exactly 1 page**.
- `graphdrawing-lua` negative on each: exit 1, `verdict=expected_engine_error`, **no PDF member at all**. The actual TeX log contains the **full** canonical requirement `You need to run LuaTeX to use the graph drawing library.`; TeX Live 2026 split `graph` as `grap\nh` (Linux) and `gra\nph` (Mac). Only whitespace due to TeX line wraps was normalized for the independent comparison. This is an **engine incompatibility**, not supported XeLaTeX graphdrawing.
- G02 in each `qa-report.json`: `PASS`, extracted `Оптика и квантовая яма` and `Греческие символы αβγ`; `glyph_audit=PASS`. Independently ran local `pdftotext -enc UTF-8` on each extracted G02 PDF: both required strings present. Independently ran `pdffonts`: `PJEHMQ+DejaVuSerif` + `NJGQOY+LatinModernMath-Regular-Identity-H` (Linux), `KYCTMN+DejaVuSerif` + `ZFEHUV+LatinModernMath-Regular-Identity-H` (Mac); all `emb=yes`.
- Six-case D fixture summary per host: `5 PASS, 0 FAIL, 1 KNOWN_LIMITATION`. The old OS-registered `DejaVu Serif` example is **not** a glyph/render PASS on hosted Mac, even though G02 passes. Source mutation flags `true` (meaning source unchanged) for every case.

**Boundary:** This is an independent downloaded-artifact consistency check. SHA-256 bindings do not attest that runner binaries/fixtures are trustworthy or that the screenshots/visual edit behavior was exercised. Hosted Linux and macOS ARM results are **CI_ONLY**. No physical Windows 10/M1/M4 QA is implied.

### Real Windows Server failure (five positives)

The downloaded Windows `qa-report.json` records exactly:
- `g00-quickstart`, `g00-legacy-cyrillic-pdf-only`, `g00-cyrillic-glyph-audit`, `g01-multifile-unicode-path`, `g02-tikz-fonts`: all **FAIL**, exit 3, no PDF, untouched inputs.
- CLI stderr: `! Undefined control sequence.`, then `<*> .\\quickstart` and `.tex` (similarly `<*> .\\main` / `.tex`). A Windows backslash in a TeX input operand was treated as a TeX control sequence. The TeX Live 2026 installer, `xelatex --version`, `kpsewhich` and Chocolatey Poppler checks had passed, and Rust CLI built successfully. The defect is **runner argv portability**, not a missing TeX package.
- `g08-intentional-tex-error`: **FALSE PASS** with exit 3 / no PDF, because existing D harness only searched the generic `XeLaTeX exited`. Its log did **not** contain `\\TikzariumIntentionallyUndefinedCommand`; the intentional invalid macro was never executed. This is a separate D QA harness defect fixed in this D04 branch.
- Windows extension smoke step was **skipped** due to earlier fixture step failure; there are **zero Windows extension observation TOMLs** in the ZIP. Do not invent five Windows extension passes.

## Independently checked three F01/U01 hosted Rust unit-contract archives

Also downloaded all three `qa-ui-unit-contract-*` artifact ZIPs for **the same I05 source SHA** and read `ui-unit-contract.json`, rather than relying on the green job icon:

| Runner | Artifact ID | ZIP SHA-256 | Result |
|---|---:|---|---|
| Linux x64 | [13034099832](https://github.com/i-shutov/tikzarium/actions/runs/41180076260/artifacts/13034099832) | `e87e395ae412ffdd21982ac3701ed868084d3b14d5febb8b028f36613952a4e5` | 3/3 theme tests + 2/2 font-proof tests `PASS_UNIT` |
| Windows **Server 2022** x64 | [13034926146](https://github.com/i-shutov/tikzarium/actions/runs/41180076260/artifacts/13034926146) | `96acddbb4b97466412e5b63745c89f0fd9426c91d0c0547523c6a1d2a21100b1` | 3/3 + 2/2 `PASS_UNIT` |
| Hosted macOS 15 ARM64 | [13034697032](https://github.com/i-shutov/tikzarium/actions/runs/41180076260/artifacts/13034697032) | `2d5b8772f3c58bf668659caf92a527558fff74de2bd16a858e174f0cc2521a15` | 3/3 + 2/2 `PASS_UNIT` |

All three JSONs have `sha=d8b2885...` (checked-out synthetic PR merge), `source_head_sha=1db951c...`, `status=PASS_UNIT`, no missing registered tests, and explicitly **`gui_restart_persistence=NOT_RUN`, `gui_visual_theme_invariance=NOT_RUN`, `physical_win10_smoke=NOT_RUN`, `physical_m1_m4_smoke=NOT_RUN`**. These checks confirm Rust unit behavior for default/legacy partial preferences, theme distinctions and figure-source invariance *in memory*; they do **not** prove that settings were saved and restored after closing/reopening the real egui application.

## Work delivered in D04

Added required source-specific `error_expect` manifest metadata and an exact-match negative diagnostic gate (including no PDF), with nine offline tamper tests. D04 is separate from the integrator's A-owned Windows operand repair. At initial D04 commit, **fresh exact-head CI is pending**, no PASS inherited from PR #24's SHA.

## Open limits and handoff

- Windows Server I05 must be rerun at a fixed exact SHA after correcting TeX operand `./main.tex`. The PR #24 current 3-job/main+font successes cannot override the red D matrix.
- C-owned `extensions/qa/run_smoke.py` currently checks `not pdf_valid` for negative tests; an invalid but existing `.pdf` could hypothetically evade an **absence-of-PDF** contract. This review found **no PDF** in either negative ZIP. Owner C should tighten to `not pdf.exists()` in its own branch, then test and rerun exact head. D04 does not edit C files.
- GUI four-theme persistence after actual relaunch, actual Windows 10 and physical Mac M1/M4 remain **NOT_RUN**.
- R4 sources and licenses remain unreviewed/not imported; do not redistribute reference material, and keep O027/O028/O030/O047 unresolved.
