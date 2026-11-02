# I59 — Offline MiKTeX policy parity across direct Python XeLaTeX QA

Date: 2026-11-02. Repo: **i-shutov/tikzarium only**. Base accepted main: `2b129873ce278e5fd9ec1b26ddc13bccdc67a1b6`.

## User-visible safety vertical

Production Rust BuildService already detects MiKTeX and invokes the selected external XeLaTeX with `--disable-installer` to prohibit hidden MiKTeX automatic package installation for a build. Two **independent** Python QA flows bypassed BuildService by calling `xelatex` directly:

- `scripts/tools/qa_smoke.py::check_missing_glyphs` reruns a Cyrillic/font fixture directly without the MiKTeX no-installer option.
- `extensions/qa/run_smoke.py` runs five fixed C/extension XeLaTeX fixtures directly without the MiKTeX no-installer option.

These are real gaps for a user executing the QA harness with separately installed MiKTeX, regardless of successful TeX Live CI. They do **not** establish that an unwanted download occurred.

## Scoped correction

One small common read-only `scripts/tools/qa_engine_policy.py` checks the actually selected XeLaTeX `--version` transcript. TeX Live uses its normal invocation. MiKTeX must successfully accept `--disable-installer --version` on that very executable and every subsequent direct fixture call gets `--disable-installer` before the existing `-no-shell-escape`. Unknown/ambiguous engine identity or unsupported switch stops QA before compiling. No engine substitution, global settings changes, TeX distribution installation, macro interpretation, visual adapter, or separate TikZ help catalogue.

Negative stdlib tests cover ambiguous engine, flag refusal, command-line propagation in both direct QA flows, no compilation on refusal, and source-input preservation. CI checks the same code on hosted OS and, independently, against real hosted MiKTeX. Source control, QA, plans, insights, CHANGELOG stay synchronized in one PR.

## Mandatory gates

1. Exact PR HEAD: Python harness tests and full D QA on Linux, macOS hosted ARM and Windows Server; real TeX Live fixture smoke and distinct hosted MiKTeX probe/PDF, log and source audit.
2. Inspect critical failed/passed test logs, selected engine arguments, source/PDF artifacts and hashes before any merge with `expected_head_sha`. Green unit tests alone are not a distribution proof.
3. Post-merge `main` CI is an independent separate gate.
4. Physical Windows 10 x64 with **user-installed** MiKTeX and Mac ARM M1/M4 with external XeLaTeX: **NOT_RUN** until executed on those machines.

Production GUI/egui, C catalogue, TeX engine and user source semantics are unchanged. I59 is a scoped compiler-safety QA vertical, not evidence of first-party package installation or physical host acceptance.
