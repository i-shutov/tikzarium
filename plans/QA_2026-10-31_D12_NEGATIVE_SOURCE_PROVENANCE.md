# D12 — byte-verifiable negative MiKTeX input evidence

Date: 2026-10-31. Exact base `main`: `9b4cd26b5b73f8011b975f9922cb208e36e12564`. Owner: independent D QA/CI. Existing #40/#52/#56/#59/#63/#64 are merged; do not reopen merged PRs. Scope is **only** `scripts/tools`, D plans and D insights. No production A/B/C/E/F edits.

## Failure mode and accepted fix

The prior real [B20 MiKTeX run 41234368515](https://github.com/i-shutov/tikzarium/actions/runs/41234368515) succeeded on source `2034960b9bc303d5ab2447e239325f954f82e0ed`, with two strict XeLaTeX negatives. However, its 45-file Windows artifact contains only their logs and **unverifiable before/after source hashes**; `missing-library.tex` and `graphdrawing-lua.tex` are absent. The dependent Linux auditor checked claimed equality but could not recompute negative source SHA from uploaded original bytes. An authenticated CI success is not equivalent to independent raw-source verification.

D12 changes the **existing real** hosted MiKTeX Windows producer to upload an exact read-only negative-input snapshot under each negative output directory, mark the source filename in the JSON record, and require its SHA to equal the original source hash during the compile. The existing dependent Linux post-upload verifier independently rehashes both uploaded TeX inputs, checks their causal TikZ library requests, existing strict TeX-log MiKTeX 25.12 identity, expected errors, and absence of PDFs. Existing positive N1 Session → Rust CLI/direct XeLaTeX remains unchanged. Two real-artifact tamper regressions mutate/remove those new negative-source bytes; neither can be accepted.

## Acceptance

- Separate official SHA-pinned private MiKTeX 25.12 installer, effective TEXMF roots, `AutoInstall=0` readback, `--disable-installer`, missing-only package install, package inventory before/after identical.
- Generated N1 app Session source, CLI and independent direct MiKTeX routes produce six actual PDFs; Poppler proves Cyrillic/math extraction, embedded fonts, page counts and source/log/PDF hashes.
- Both negatives contain original uploaded source bytes matching SHA, actual MiKTeX failure logs and no PDFs. Linux post-upload independently verifies bytes; deletion/corruption fails closed.
- Exact **new branch SHA** Windows MiKTeX + dependent Linux audit, Rust CI and D QA evidence must be observed, with artifacts downloaded/inspected; `PENDING` until then. Group commits before triggering PR CI.
- This validates hosted Windows Server 2022 only. Physical Win10 x64, Mac M1/M4, egui OS pointer/F1/help/screenshots, GUI theme-to-PDF invariance remain `NOT_RUN`; N1 Session programmatic authoring is not mouse authoring.

Handoff: link exact source and synthetic checkout SHAs plus current artifacts to integrator PR #48. Do not weaken any existing tests or replace MiKTeX with TeX Live.
