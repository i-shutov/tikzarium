# QA D09 — verify the MiKTeX compiler behind each real Rust CLI PDF

Date: 2026-10-31. Independent D scope only: `scripts/tools/qa_miktex_vertical.py`, its stdlib tests and these D plan/insight records. Base main `b7c8e993b9da64060dfd3261833e4be3a1d280ba`; #40, #52 and #56 are already **merged**. No A/B/C production code changes.

## Real merged-main evidence consulted

- [MiKTeX post-merge run 41209928956](https://github.com/i-shutov/tikzarium/actions/runs/41209928956) SUCCESS on exact `b7c8e993b9da64060dfd3261833e4be3a1d280ba`, [44-file artifact 13046355773](https://github.com/i-shutov/tikzarium/actions/runs/41209928956/artifacts/13046355773), downloaded ZIP SHA-256 `05e9346ebe33777d8adebae845abfb2cec6f6e8df3afab383b57c96dede7d59a`.
- Independently extracted/verified all six PDF files: one page each, Cyrillic text and Unicode mathematical Greek extracted by Poppler, embedded font records; six PDF files match recorded hashes where supplied. Verified both N1 authored source hashes, Lua-only and missing-library diagnostics with **no PDF**, 9130/9130 package inventory byte-identical. `setup-stage.json` is terminal `SETUP_COMPLETE`; effective roots/private installer and `AutoInstall=0` are captured.
- [Rust CI 41209928939](https://github.com/i-shutov/tikzarium/actions/runs/41209928939) 3/3 SUCCESS; [D QA 41209928966](https://github.com/i-shutov/tikzarium/actions/runs/41209928966) 7/7 SUCCESS on the same `main`.

## Newly found independent acceptance gap

The existing script verifies selected `--xelatex` is MiKTeX and that `TIKZARIUM_XELATEX` matches, then accepts PDFs from `tikzarium-cli build` without **checking the compiler banner in the CLI-produced TeX log**. A regression in engine-selection code could invoke another XeLaTeX (e.g. TeX Live) and still satisfy PDF/font/source gates. Actual archived N1 CLI `text.log` and `math.log` do contain the expected opening `This is XeTeX, Version ... (MiKTeX 25.12)` banner; the assertion simply was missing.

D09 closes this on the **existing real MiKTeX/N1 pipeline**, not a new standalone fixture: require opening MiKTeX 25.12 XeTeX banner on the real CLI and direct-engine TeX logs for the hand-authored baseline and both actual N1-generated PDFs. Emit per-route `cli_tex_identity`, `direct_tex_identity`, and the previously absent baseline CLI TeX log SHA. Fail closed when a log is missing, TeX Live, pdfTeX, another MiKTeX version, or includes the correct string only in later diagnostics. Keep all prior glyph/embedding/source/negative/package checks.

## Acceptance sequence

1. Run offline stdlib tests and compare banner pattern against *actual archived* MiKTeX log first lines (tested locally). This is a contract check, **not** new Windows CI PASS.
2. One grouped D09 commit + Draft PR triggers the **existing** hosted MiKTeX workflow, Rust CI, D QA. Wait for the exact source HEAD and inspect the uploaded new 44-plus-file artifact, including new `cli-main.log` and report identity fields; do not transfer earlier main PASS to the new PR.
3. Keep external MiKTeX an independent Windows 10 user prerequisite. Physical Win10, Mac M1/M4, pointer gestures/code pane/F1/help/themes remain `NOT_RUN`. No R4 redistribution.

Hand off the PR exact SHA, report and run/artifact links to the integrator.

## D09 merged-main verification and D10 baseline-PDF parity (2026-10-31)

Historical PENDING above is superseded for D09 by exact merged `main` `ab5705d4dd7e3dcefd3ef6ddfd695f6d0ee4dfd1`: hosted Windows Server 2022 [MiKTeX run 41212533893](https://github.com/i-shutov/tikzarium/actions/runs/41212533893) SUCCESS, [44-file artifact 13046926819](https://github.com/i-shutov/tikzarium/actions/runs/41212533893/artifacts/13046926819) downloaded and unpacked, ZIP SHA-256 `a9c5a1b59ba448923a01caa89d95a852c21ff98f359db2bd75059fab54a9c4da`. Rust [41212533878](https://github.com/i-shutov/tikzarium/actions/runs/41212533878) 3/3 and D QA [41212533853](https://github.com/i-shutov/tikzarium/actions/runs/41212533853) 7/7 SUCCESS at the same source SHA.

All six archived real PDFs were independently inspected using Poppler on Linux: one page each, Cyrillic and Greek extraction, embedded DejaVuSerif/LatinModernMath where required. Positive compiler logs report MiKTeX 25.12 on line one; negative cases have intended errors and no PDF. Package inventory 9130/9130 byte-identical; private roots, pinned installer SHA, `AutoInstall=0`, `SETUP_COMPLETE` recorded. None is physical Windows 10 or M1/M4 evidence.

**D10 independent acceptance gap:** N1 CLI and direct PDFs each pass `inspect_pdf`, but the hand-authored baseline direct-engine PDF previously only required existence and exit zero. This permits blank/wrong-glyph or non-embedded direct output to pass. Also the two negative engine logs were not themselves identity-gated. D10 modifies the existing real MiKTeX vertical: same text/page/embedded-font audit for baseline direct PDF as CLI, explicit SHA and PDF records, first-line pinned MiKTeX banner for both true negative TeX logs; add hermetic failure regressions. No separate fixture, no A/B/C files, no global/user TeX changes.

**D10 exact-HEAD CI and new archive: PENDING** until checks and uploaded bytes are audited. Target physical Win10/M1/M4, pointer events and screenshots remain `NOT_RUN`.
