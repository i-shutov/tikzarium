# QA D09 — compiler identity acceptance gap in the existing real MiKTeX/N1 chain

2026-10-31. Re-read `AGENTS.md`, D06/D08 plans/insights, latest `main` `b7c8e993b9da64060dfd3261833e4be3a1d280ba`, open PRs and fresh hosted CI jobs before changes. #40/#52/#56 are merged, so D09 uses a separate D-only branch; no changes to A/B/C files.

## Directly inspected source evidence

- GitHub run [41209928956](https://github.com/i-shutov/tikzarium/actions/runs/41209928956), head `b7c8e993b9da64060dfd3261833e4be3a1d280ba`, 1/1 hosted Windows Server 2022 MiKTeX job SUCCESS. Downloaded [artifact 13046355773](https://github.com/i-shutov/tikzarium/actions/runs/41209928956/artifacts/13046355773); 44 files, SHA-256 `05e9346ebe33777d8adebae845abfb2cec6f6e8df3afab383b57c96dede7d59a`.
- Extracted six actual PDFs; `pdfinfo` confirms one page each, `pdftotext -enc UTF-8` finds `Примитивы TikZ`, `Кривая Безье`, `Геометрия`, `оптика`, `𝛼`, `𝛽` on their respective PDFs, `pdffonts` confirms embedded fonts on every PDF. Archived PDF SHA-256 and N1 `.tex` SHA-256 match metadata; two strict negatives have exact errors with zero PDFs.
- Private MiKTeX 25.12 setup record `AutoInstall=0`; `SETUP_COMPLETE` matches installer hash/engine, nine explicit packages, 9130 identical package inventory lines before/after. CLI/direct TeX logs themselves open with `This is XeTeX, Version 3.141592653-2.6-0.999997 (MiKTeX 25.12)`.
- [CI Rust 41209928939](https://github.com/i-shutov/tikzarium/actions/runs/41209928939) 3/3 and [D QA 41209928966](https://github.com/i-shutov/tikzarium/actions/runs/41209928966) 7/7: SUCCESS **for the exact historical main SHA**, not for the D09 changes.

## QA finding / correction

D06's engine `--version` and CLI environment controls are necessary but not sufficient to attest which engine actually wrote each **CLI** PDF. The missing assertion is demonstrated by inspection of code. D09 adds strict first-line TeX-log identity checking to both positive routes (handwritten baseline and actual merged N1 Session-generated source), including a captured baseline CLI TeX log, per-PDF identity flags and negative unit tests. Does not weaken MiKTeX offline protections, negative TeX tests, or font checks.

Local regex exercise against **five actual archived MiKTeX logs** and spoofed TeX Live/pdfTeX/wrong-version/log-later-diagnostic samples behaved as expected; this is not a substitute for exact-SHA hosted CI. D09 modified SHA, Rust/QA/MiKTeX outcomes: **PENDING** until new jobs and evidence are checked.

Physical Windows 10 external MiKTeX, macOS M1/M4, pointer authoring, F1/hover, live code pane and GUI theme semantics: `NOT_RUN`.

## 2026-10-31 D09 post-merge audit and D10 newly found gap

The original D09 `PENDING` statement above is historical. Exact `main` `ab5705d4dd7e3dcefd3ef6ddfd695f6d0ee4dfd1` has 3/3 Rust, 7/7 D QA and 1/1 [hosted MiKTeX CI](https://github.com/i-shutov/tikzarium/actions/runs/41212533893) SUCCESS. Independently unpacked [44-file artifact 13046926819](https://github.com/i-shutov/tikzarium/actions/runs/41212533893/artifacts/13046926819), ZIP SHA-256 `a9c5a1b59ba448923a01caa89d95a852c21ff98f359db2bd75059fab54a9c4da`; all six one-page PDF files extracted correct Cyrillic/math Unicode and showed required embedded fonts with Poppler. 9130/9130 package rows identical; N1 source hashes unchanged, two true errors without PDF, actual positive TeX logs identify MiKTeX 25.12.

**New independent code-review finding, not an observed bad PDF:** current `positive()` audits handwritten baseline CLI output but direct baseline only by file existence and engine return code. The latter can hide a PDF text/font failure; negative cases also lack a real-log MiKTeX banner gate. Manually extracted direct baseline PDF does contain `Примитивы TikZ`, `Кривая Безье αβγ` and embedded DejaVuSerif + LatinModernMath, so historical result is not invalidated. D10 makes automatic acceptance as strict as the manual evidence, plus new regressions rejecting corrupt baseline direct PDF and foreign-engine negative logs. D10 exact new commit CI remains UNVERIFIED until run/artifact inspection.

Windows Server CI does not constitute physical Win10 x64 MiKTeX or Mac M1/M4 acceptance. Mouse authoring, F1/hover, themes, target-host screenshots: `NOT_RUN`.
