# D11 — independent post-upload MiKTeX evidence gate

Date 2026-10-31. Base main aa6d1d08caee984d5f31ac13396e346fc451c8fe, merge of D10 #63. #40/#52/#56/#59/#63 are merged: do not reopen old PR #40. Read AGENTS.md, main, open PRs and prior D plans/insights. D owns workflow/tools/tests/docs only; production A/B/C/E/F not modified.

## Purpose / exact gate

The existing hosted Windows Server 2022 MiKTeX job compiles actual N1 app Session-generated text/math and the handwritten six-primitive baseline, runs the real Rust CLI and direct MiKTeX XeLaTeX, uploads logs/sources/PDF and two negatives. Its self-reported PASS was strong but still a same-host, same-process claim. D11 adds **a dependent second Linux job** to the SAME actual MiKTeX workflow: download the uploaded ZIP through actions/download-artifact, independently inspect bytes with Linux Poppler, cross-check source/PDF/log SHA, require the genuine TeX-log MiKTeX identity, private effective roots, hash-pinned official installer and terminal setup state, AutoInstall=0, identical package inventories, genuine N1 source/Session evidence, and two strict negative errors with no PDFs. No TeX or new fixture is installed by this job.

Fail closed when any of the six PDFs lacks Cyrillic/math glyphs, one-page structure or embedded required fonts. No acceptance from a mere JSON flag or Windows job result; second-host result is its own job and retained JSON. Regression tests actively tamper with an actual uploaded PDF, N1 source, MiKTeX negative banner, package inventory, setup state and unexpected negative PDF, and require rejection. Test expectations are unchanged. Workflow paths include the new D-owned scripts.

## Baseline post-merge independent evidence

- Exact main: aa6d1d08caee984d5f31ac13396e346fc451c8fe.
- Hosted separate real MiKTeX: https://github.com/i-shutov/tikzarium/actions/runs/41217239682 SUCCESS, 1/1; uploaded artifact 13048052949, zip SHA-256 e1dcee9294e83705011733fa29ac95918326ed0249ee080246c6f171f5522163, **45 files independently unpacked**.
- Rust CI 41217239643 = 3/3 SUCCESS; D QA 41217239580 = 7/7 SUCCESS, not mislabeled MiKTeX.
- Independent offline auditor against this real extracted artifact: 6/6 PDF Poppler page/text/embedded-font checks, 2/2 negatives, unchanged 9130/9130 package rows, N1 source hashes and actual CLI/direct engine log banners; 8/8 local negative/mutation tests PASS. This validates the audit implementation locally, **not** the new hosted D11 job.

## Acceptance boundary

The new PR's exact-head Windows-hosted and Linux post-upload jobs are PENDING until they complete on that SHA and the published artifacts are reviewed. None of this proves physical Windows 10 MiKTeX, Mac M1/M4, actual egui pointer and help, or GUI theme/output equivalence; all remain NOT_RUN. App never installs MiKTeX; user separately installs MiKTeX/XeLaTeX. Do not infer physical host from Windows Server kernel version. No R4 license imports.
