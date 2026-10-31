# D / QA workpack: executable CI matrix and XeLaTeX smoke

Owner: D, issue #5. Created 2026-10-31. Target base: W01 feature PR #6,
with no changes to crates or GUI-owned sources.

## Scope and design

Deliver an independent GitHub Actions check on Ubuntu 24.04 x64,
Windows Server 2022 x64 and macos-15 ARM64, rather than rewriting
the integrator's W01 workflow. Run Rust formatting, full workspace tests,
Clippy warnings-as-errors and Python harness unit tests on each runner.

Install TeX Live 2026 via a cross-platform installer for a separately
reported three-host XeLaTeX job. Compile the real Rust CLI and exercise:
- G00: existing W01 quickstart PDF, one page;
- G00: existing W01 Cyrillic source PDF, page check only (known missing-glyph risk);
- G00: project-authored DejaVu Serif Cyrillic fixture, explicit no-missing-glyph
  TeX log audit and PDF text extraction when pdftotext is installed;
- G01: nested TeX input from a source directory containing spaces and Unicode;
- G08: intentionally invalid TeX, requiring a TeX-specific error and no PDF.

Collect qa-report.json (Git source/head SHA, CLI executable SHA-256, input
source checksums, host architecture, XeTeX version, per-case status,
PDF checksums, stdout/stderr tails). Enforce no original source-file mutation.
Preserve fixture logs and installer failure logs as Actions artifacts
even when tests fail. Failure must make the job red, never yield a false PASS.

## Acceptance gates

- [x] Independent Python harness unit tests: 3/3 on local Linux Python 3.13.
- [x] Fixture TeX: 5/5 using a **test-only direct XeLaTeX mock adapter**,
  Linux TeX Live 2025/dev; this is NOT Rust CLI verification.
- [x] Local Cyrillic PDF visual/text investigation: W01's legacy example
  omits Cyrillic glyphs with default Latin Modern (19 missing-character
  diagnostics in Linux TeX Live 2025/dev); recorded, not silently waived.
- [ ] Actual GitHub Rust fmt/clippy/test for Linux/Windows/macOS ARM64.
- [ ] Real compiled Rust CLI → XeLaTeX on all three hosted CI runners.
- [ ] Windows 10 x64 real-machine source/UI/preview and file-path smoke.
- [ ] M1/M4 physical macOS ARM source/UI/Retina and PDF smoke.
- [ ] R4 135-case corpus provenance and license review, then vetted import.

No build/release acceptance on the strength of a Windows Server runner.
The macos-15 job must assert ARM64, and source-to-PDF CI is not visual QA.

## Failure triage

Read exact GitHub job and artifact report; log issue against fixture ID,
head SHA, host, TeX version and exit code. Distinguish installer/network
failure, Rust compilation failure, true TeX incompatibility, Unicode path
failure, PDF byte check, and optional pdfinfo page-count verification.
Do not change reference source to suppress TeX warnings.

## Next bounded block

After this PR runs, repair action/package setup failures **only in D files**.
Coordinate core Rust issues with A (no changes to crates). Pin external
Actions to reviewed commit SHAs and Cargo.lock with the integrator;
then add bad-font and missing-package negative cases with retained
TeX diagnostic bundles.

## CI follow-up (same D workpack)

- Resolved all third-party action tags to SHA values observed in successful
  GitHub Actions jobs (2026-10-31), and limited triggering to pull requests
  or manual invocation; push and PR double-runs were wasting runners.
- TeX Live `texlive_version: 2026` freezes a **major version**, not the
  rolling CTAN package revisions. Do NOT claim bit-reproducibility.
- A hosted Windows TeX Live installer failed from an inconsistent CTAN mirror
  (`ctan.katoptra.org`: `texlive-scripts.tar.xz does not verify`): this was
  an installer/network integrity failure, **not** a XeLaTeX fixture failure.
  Switch to mirrors already observed successful (RIT Windows / Princeton Mac),
  still fail closed on invalid checksums; archive install-tl.log on failure.
- Runner actions/checkout@v4 and setup-python@v5 emitted Node20 EOL warnings
  under forced Node24. Their pinned revisions work, but migration to newer
  Node24-native major versions must be evaluated separately.


## Second QA cycle — regression gate F01, 2026-10-31

Re-read before modifications: \`main\` = \`4ceca871fc2c3b661f92d64f9c6b39b473cebd0a\`,
W01 PR #6 = \`3e3de6a1eeb5a268f296cf9aa6a4e93b2d215f7e\`,
D PR #9 pre-fix head = \`116ccc3f6779dbdaa15bbf4fbbfb550619b74008\`.
No A/B/C, GUI or core files modified.

**Exact failed CI evidence:** [D run 41169926128](https://github.com/i-shutov/tikzarium/actions/runs/41169926128)
on D head \`116ccc3f\` finished 5/6 jobs green: Rust quality on Linux,
Windows Server and macOS ARM64 all green, XeLaTeX fixtures Linux/macOS green
under the *old permissive harness*, Windows Server red on G00 glyph-audit.
On Windows, CLI returned 0, emitted a valid 10,020-byte PDF, independent TeX
log had **0 missing glyphs**, but the Python \`pdftotext\` result was false.
Downloaded CI PDF was independently inspected with \`pdftotext -enc UTF-8\`
on Linux and contains the exact Cyrillic text. The earlier Python
\`subprocess.run(text=True)\` decoded Poppler UTF-8 according to Windows
default ANSI codepage, corrupting the comparison: **test harness defect**.
This does not prove Windows 10 behavior (Windows Server runner only).

On Linux and hosted Mac, previous **5/5 fixture PASS was insufficient**:
their reports explicitly said \`pdftotext unavailable / NOT_CHECKED\`.
The new harness fails closed for fixtures declaring required \`text_expect\`.
Workflow now installs Poppler on Linux and macOS and requires extraction
tool presence before fixtures run. \`pdfinfo\` and \`pdffonts\` give separate
\`checked\` evidence; unavailable optional checks are **NOT_CHECKED**, never
silently promoted to full release acceptance.

Added in this workpack:
- G02 real TikZ-node typography fixture: UTF-8 Russian, Greek and
  \`unicode-math\` formulas using \`fontspec\` (DejaVu Serif)
  and Latin Modern Math. Verify required extracted Cyrillic/Greek strings,
  no missing-glyph log diagnostics, and actual embedding when \`pdffonts\`
  exists. Do not bundle font binaries.
- Five additional Python unit cases, including raw UTF-8 extraction
  under mocked Windows locale behavior, missing Poppler, invalid UTF-8,
  embedded font probe and invalid fixture metadata.
- Structured evidence for Poppler paths, UTF-8 decoding, glyph checks
  and font embedding. No claims of automated GUI theme acceptance.

**Local evidence (environment-specific):** direct XeLaTeX 2025/dev on
Linux compiled G02 (exit 0), no Missing character diagnostics; extracted
both expected Russian/Greek phrases and \`pdffonts\` showed DejaVuSerif and
LatinModernMath embedded (\`emb=yes\`). It is NOT real TikZarium CLI
integration, nor a Win10/macOS acceptance.

Outstanding release gates:
- [ ] CI rerun for exact new D branch head: all 6 jobs, verify reports
  rather than carrying old green results.
- [ ] Decide whether \`pdffonts\` and \`pdfinfo\` become mandatory on every
  platform; do not mask absent utilities as validated checks.
- [ ] Real Windows 10 x64 GUI+TeX and M1/M4 physical GUI+TeX smoke,
  including font availability, Unicode file paths and PDF extraction.
- [ ] GUI theme persistence and source/PDF invariance in real GUI once
  B/U01 implements themes; D must not implement B code.
- [ ] Curated R4 provenance/license gate before importing any assets.

**Small next block:** examine the current Actions run, classify every
failure by step and tool; patch *only* D-owned files, rerun and record
exact SHA + artifacts. Track any Windows font package/Poppler issues as
reproducible D fixtures; escalate non-D code to A/B owners.

## Fail-closed PDF proof (supersedes optional-tool paragraph above)

By exact D head \`eceb20ca7f\`, all three PDF inspectors
(\`pdfinfo\`, \`pdftotext\`, \`pdffonts\`) are required for QA CI on each host.
Install Poppler from Ubuntu packages, Homebrew on macOS ARM and
Chocolatey \`poppler 26.9.0\` on hosted Windows Server. A required page
count, Unicode string or embedded-font check without its tool makes the
fixture **FAIL**, while the report still identifies the subcheck as
\`NOT_CHECKED\`; never promote a missing check to PASS. TeX Live package
versions remain rolling (major version 2026), despite pinned tool versions.

The upstream W01 \`examples/cyrillic.tex\` uses
\`\\setmainfont{DejaVu Serif}\`, an OS-registered family. Hosted macOS
reported \`fontspec: The font "DejaVu Serif" cannot be found\`
([run 41173646446](https://github.com/i-shutov/tikzarium/actions/runs/41173646446)),
although TeX Live provides \`DejaVuSerif.ttf\` by filename. This case
is **KNOWN_LIMITATION** only when its PDF checks succeed or the exact
font-not-found error occurs, source inputs unchanged; all unrelated
failures stay red. It is not counted as a Unicode PASS or release
acceptance. Upstream PR #6 was notified. On the same hosted Mac,
the new G02 figure-font fixture passed extracted Russian/Greek strings,
no missing glyphs, and both embedded font checks. This is **CI_ONLY**
and remains distinct from physical M1/M4 acceptance.
