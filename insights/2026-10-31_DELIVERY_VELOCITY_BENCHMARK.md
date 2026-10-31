# TikZarium — initial throughput and forecast provenance

Date: 2026-10-31. Source: connected GitHub REST for i-shutov/tikzarium. Snapshot main = \`8764a732b9a846a6ba1f111c9b656781195a6412\`.

## Observed, not projected

- First PR #1 opened **04:18:52 UTC**. Latest merged baseline PR #24 merged **07:57:49 UTC**. Observed elapsed window: **3 h 38 min 57 s**.
- 17 PRs merged during this window: #1, #6–#9, #11–#13, #16–#24. PR #10 was closed unmerged because its beneficial changes were reconciled into #24; do not include it in accepted throughput. After #24, PRs #25–#30 remain open.
- **Median merge lead time: 36.3 minutes**, arithmetic mean 41.3 min. This is elapsed **PR open-to-merge time**, not solo labor time or reproducible 24-hour production rate. Merges run in parallel and are not independent observations.
- **Median accepted PR added 444 lines and touched 7 files**. Sum of reported additions = 10,331 across 17 merged PRs. This is NOT 10,331 unique net new code lines: docs/tests and overlapping stacked branches contribute and refactorings count as additions.
- Working tree at SHA above: 18 Rust files (~162,373 bytes), 13 Python files (~83,077 bytes), 54 Markdown files (~198,313 bytes), 15 TeX files (~4 KB). No full CST/TikZ scene parser/geometry DAG yet. There is a working source editor, actual XeLaTeX PDF generator and read-only PDF browser, font proof/themes, extension metadata and CI.
- **CI evidence:** at this main SHA, GitHub Actions 41182646016 (TikZarium CI) and 41182646018 (six-job D QA matrix) are completed-success. Windows Server 2022 and GitHub-hosted macOS ARM64 are **not** the user's physical Windows 10/M1/M4 acceptance.
- Automation scheduling: four engineering tasks A/B/C/D and an integration watchdog are enabled hourly, but hourly runs are NOT equivalent to four full-time human engineers and their output cannot be multiplied by 24 without measuring actual usage and QA latency.

## How estimates were made

The first hours establish a **bounded small-workpack throughput benchmark**, not the complexity of visual TeX semantics. They favor parallel infrastructure/CLI/QA and document-heavy PRs. Later stages require design commitments and serial gates. A conservative capacity model assumes a 5–12× lower sustained completion velocity for semantic or visual units than the initial short PR burst, **further limited by actual agent run availability and native review**.

Planning units: small PRs (one tested bounded feature), larger PRs (multiple independent fixtures with cross-platform QA), and full vertical release slices. The large-block schedule sizes S0–S7 as 144–249 such PR units combined, overlapping across 4 streams. This is an engineering estimate, not a statistical confidence interval or regression inferred from the initial time series.

Assumed sustainable throughput for later stages is approximately **4–8 accepted substantive PRs per calendar week**, with large variability; the effective rate should be recalibrated after S1/S2. If agents can sustain >8 useful accepted PRs/week *with zero regressions and physical QA*, pull milestone windows forward. If source model fail or testing cannot run, slow down and update forecast. Do not equate raw PR counts with functionality or mean PR sizes with software quality.

The central 9–15-month ecosystem forecast reflects 144–249 planned PR-equivalent workpacks, overlap of A/B/C/D, dependency order, QA and physical target-host delays; v1.0 high-tail extends to Q1/Q2 2028. The first v0.1 estimate (2–4 weeks) is primarily packaging + actual host validation rather than writing a new compiler.

## Quantifiable recalibration at each checkpoint

- Accepted bounded PR per week, mean/median lead time, review/CI rework frequency and abandoned drafts.
- Unique feature test cases, source round-trip fidelity, and regression failures after merge.
- Cross-platform CI wall time, queue time and reproducible artifact hashes.
- Number of *actually verified* installed/compiled/visually editable libraries, separately.
- Physical Windows 10 / M1 / M4 launch+GUI+font+PDF smoke counts with screenshots and exact SHA.
- Feedback from user figure workflows, not only synthetic fixtures; complexity-weighted defect backlog.
- R4 135 source fixture and 18 semantic tests after provenance/licensing gate; four original warning anomalies remain documented.

## Claim limitations

- **Not valid:** "17 PR / 3.65 hours implies we can build an arbitrary TikZ visual interpreter in days."
- **Not valid:** "All packages found by kpsewhich are visually editable."
- **Not valid:** "successful Windows Server CI proves physical Windows 10 compatibility."
- **Not valid:** "a successful XeLaTeX PDF means correct Cyrillic glyphs."
- **Valid:** "short, well-specified integration and infrastructure tasks reached three-host CI rapidly; major remaining semantic and physical-UX tasks have not yet been benchmarked."

Updated milestone plan: \`plans/2026-10-31_FULL_SCOPE_ROADMAP.md\`.
