# D05 — Independent cross-host audit of uploaded XeLaTeX artifacts

Date: 2026-10-31. D-only branch from main 8764a732b9a846a6ba1f111c9b656781195a6412 (I05 #24 merged). At inspection, open PRs #25–#30, including D04 #27 in a separate branch. No A/B/C code or C-owned runners changed. Related F01/U01: issues #14/#15; #16 merged.

## Execution / acceptance contract

1. Keep 3-job Rust CI, 6-job D matrix, independent figure-font proof. Add a *seventh* D job dependent on all six hosted QA jobs. It must download all three qa-evidence-* and all three qa-ui-unit-contract-* artifacts from that **same** workflow run. It cannot trust an upstream green job without independently inspecting the uploaded files.
2. Require exact PR source-head SHA; distinguish synthetic PR merge SHA and compare it across all three hosts. No host is optional: Linux Ubuntu 24.04 x64, Windows **Server** 2022 x64, macOS 15 **hosted** ARM64.
3. Independently inspect six D fixture records, source-manifest hash, source preservation, the real G02 fontspec+unicode-math PDF, pdftotext -enc UTF-8 Cyrillic and Greek, pdffonts both embedded DejaVuSerif/LatinModernMath, page count and G08's **exact original** undefined control sequence, exit 3 and absence of PDF. Preserve the one known legacy example as KNOWN_LIMITATION; do not promote it to pass.
4. Parse **all 5 original observation.toml per host** (15 records) and both extensions/summary.json and extensions/audit.json. Recompute the five original source, console, TeX-log and positive PDF SHA-256, requiring 4 PDFs per host, zero positive glyph warnings, exactly 1 PDF page, exit zero. Require the exact full LuaTeX engine-error message (allow TeX Live 2026 wrapping *inside* letters) **and no PDF, including malformed files**, for negative graphdrawing-lua.
5. Read all three F01/U01 UI-unit-contract JSONs. Verify 3 theme + 2 font proof PASS_UNIT tests; explicitly require NOT_RUN for real GUI restart/persistence, GUI visual theme invariance, physical Windows 10 and physical Apple M1/M4. The result is HOSTED_CI_ONLY, never native acceptance.
6. A normal Windows Git checkout converts some source files and manifest.json from LF to CRLF, which changes raw SHA-256. Accept **only exact** original bytes or the Windows-only LF-to-CRLF transformation. Reject all other mutation. Do not compare PDF SHA between hosts: TeX metadata and subset font names differ legitimately.
7. Upload qa-crosshost-integrity/crosshost-audit.json even if this seventh job fails. Require fresh exact PR-head 3+7+font result and inspect artifacts before readiness. Existing main PASS cannot be inherited by a PR's new SHA.

## Local validation, scope and follow-up

D downloaded and extracted six main-head QA/UI ZIPs from [D QA 41182646018](https://github.com/i-shutov/tikzarium/actions/runs/41182646018). The new verifier accepted all three hosted evidence bundles with independent Poppler checks, and 13/13 synthetic offline tamper unit tests passed under Python 3.13.5. This is **not** new-head GitHub CI: that remains PENDING until workflows complete.

R4 remains *reference only* (see fixtures/qa/R4_REFERENCE.md), no unaudited licenses or sources imported. O027/O028/O030/O047 unresolved. True Windows 10 x64 and physical Mac M1/M4 GUI/Retina/IME/theme-restart/preview smoke remain NOT_RUN. D has no physical target hosts in this run, so preserve blockers for integration rather than claiming acceptance or editing neighboring streams. After exact-head green checks, review uploaded cross-host JSON and hand off for merge alongside D04 #27.
