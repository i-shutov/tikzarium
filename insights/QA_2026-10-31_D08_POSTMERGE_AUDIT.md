# D08 — actual post-merge artifact audit and setup-stage discrepancy

Date: 2026-10-31. Base main `6d15d86344ab1281391d3ea1b458dc18ae443985`, open PRs and `AGENTS.md` reviewed. #40 (merge `a671ebc26bdde180602a8df3fa99f8651e1bced5`) and #52 (merge `1e3a1e7131bd6e8d9c9d9d9c93ae5c9203c0f455`) are closed/merged. Only D-owned paths modified.

## Independently executed readbacks (not inherited status)

- Directly downloaded `qa-miktex-windows-server` artifact 13044230534 for push-main run 41203529698, checked ZIP SHA-256 `0c6f7a1af3871ab7078d104272c6a1fe221f1bb095747f5468abd58776430eb1`, 44 files. `miktex-qa.json`: exact commit/source head `6d15d86344ab1281391d3ea1b458dc18ae443985`; four results PASS (hand-authored primitive baseline, strict missing-library, strict Lua-only, real N1 app Session-generated source). It explicitly says physical Win10/M1/M4, mouse, help, GUI themes: NOT_RUN.
- Real executable and installer from setup/QA: MiKTeX-XeTeX 4.16 (MiKTeX 25.12), official 25.12 installer SHA `14b42dd9f4b4a7813a8bfd69c8f99316c2888cc4ee26f631f397e163d85d6c62`, private TEXMF roots, `AutoInstall=0` readback, explicit disabled installer in direct XeLaTeX command. `packages-before.txt` and `packages-after.txt` **byte-identical**, exactly 9130 lines.
- Extracted all six actual PDFs and independently ran `pdfinfo`, `pdftotext -enc UTF-8`, `pdffonts`; every PDF is one page, Cyrillic `Примитивы TikZ` or `Геометрия_1 & оптика 25%` and math glyphs `𝛼`/`𝛽` are present, embedded DejaVuSerif/LatinModernMath recorded. All six reported PDF SHA-256 values match PDF bytes; all N1 source SHA-256 values match archived generated `.tex` bytes before/after. Missing-library and graphdrawing Lua-only log errors have exact source-specific diagnostics and `No pages of output`; no corresponding PDFs in ZIP.
- Detected benign copy nuance: top-level `proof with spaces Кириллица/direct-tex.log` is a **UTF-8 reserialization** of `direct/main.log`; SHA in QA correctly refers to original `direct/main.log`, not the normalized copy. Did not count this as a hash failure.
- Real defect: `setup-stage.json` remained `INCOMPLETE` at the earlier `package-metadata-validated` checkpoint after actual success. Unlike provenance/PDF checks, stage metadata is false/stale for completed setup. Need terminal stage and strict QA readback, plus installed-package postcondition, not a weakening of acceptance.

## D08 correction and proof status

The D08 branch updates `scripts/tools/qa_setup_miktex.ps1` terminal checkpoint after setup.json, verifies every declared package is now installed, adds `setup_stage_complete()` to the existing XeLaTeX QA report, and adds reject cases in Python stdlib tests. All changes grouped in one D-only commit with this insight and D08 plan. **Modified exact-head hosted MiKTeX, Rust and D QA are PENDING** until their respective workflow logs/artifacts complete. Do not transfer verified main SHA status to new D08 HEAD. No physical user-host or GUI acceptance claimed.
