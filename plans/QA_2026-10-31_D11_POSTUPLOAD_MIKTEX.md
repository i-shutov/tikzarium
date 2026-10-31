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

## D11.1 real PR integration correction

Exact D11 initial source `b3da1ae762688ec7229431274153c22ca10cc26f` [run 41221115547](https://github.com/i-shutov/tikzarium/actions/runs/41221115547) completed the real hosted MiKTeX Windows job successfully, but the new Linux verifier correctly refused to accept the uploaded evidence because its first draft incorrectly required `commit_sha == source_head_sha`. On a PR checkout, GitHub supplies a synthetic merge `GITHUB_SHA` (`2e687e7c77c05d375d21de6852fe980944ef3828`) distinct from the actual source PR head `b3da...`; the producer correctly records **both** separately. This is a D11 auditor contract error, not proof of a MiKTeX engine failure. No PASS for first D11 workflow. Corrected D11 verifier receives and checks **both trusted GitHub context values** independently; a ninth negative regression rejects forged checkout SHA. Independently downloaded new 45-file Windows artifact [13050181872](https://github.com/i-shutov/tikzarium/actions/runs/41221115547/artifacts/13050181872), ZIP SHA-256 `f86d4385df511658bb1c4af1397f18b9f30b059ae248405de91aee6761f84bef`. Fixed verifier on this actual extracted ZIP PASS, 6 PDFs/2 negatives/9130 package entries, 9/9 local regression tests. Updated exact-SHA hosted CI remains PENDING until actual post-upload Linux gate succeeds; do not weaken source binding.
