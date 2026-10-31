# D / QA: font and glyph regression evidence (2026-10-31)

This is **observed evidence** with explicit source SHA and environment, not an
unverified PASS announcement. Main at cycle start:
\`4ceca871fc2c3b661f92d64f9c6b39b473cebd0a\`.
Previous D head: \`116ccc3f6779dbdaa15bbf4fbbfb550619b74008\`.
Relevant open PRs: #6 (bootstrap), #7/#13 (extensions), #8/#12 (GUI),
#10 (XeLaTeX core), #9 (this QA), and user requirements #14/#15.

## Defect: glyph-audit false negative and optional check false positive

Exact GitHub Actions run: https://github.com/i-shutov/tikzarium/actions/runs/41169926128

| Runner | QA quality job | XeLaTeX fixture job | Observed Unicode evidence |
| --- | --- | --- | --- |
| Ubuntu 24.04 x64 | PASS | PASS (old harness) | pdftotext unavailable: text NOT_CHECKED |
| Windows Server 2022 x64 | PASS | FAIL | CLI PDF 10,020 bytes; TeX missing characters 0; text_found false |
| macOS 15 ARM64 | PASS | PASS (old harness) | pdftotext unavailable: text NOT_CHECKED |

The reported Windows PDF was downloaded as artifact
\`qa-evidence-windows-server-x64\`, ID \`13030991212\`. Its
\`qa-report.json\` records \`source_head_sha=116ccc3f\`,
\`g00-cyrillic-glyph-audit\`: \`exit_code=0\`,
\`glyph_audit=PASS\`, \`missing_glyphs=0\`,
\`text_extraction_checked=true\`, \`text_found=false\`.
Independent \`pdftotext -enc UTF-8\` on the *same archived PDF* in Linux
recovers "Тест XeLaTeX и Unicode. Кириллица." exactly. This proves PDF content
exists but not that the original Windows runner Unicode extraction was
successful. The previous harness used implicit Python locale
\`subprocess.run(..., text=True)\` when decoding UTF-8 output; Windows ANSI
code page produces mojibake. Repair uses explicit \`pdftotext -enc UTF-8\`,
binary subprocess capture, strict UTF-8 decoding, Unicode NFC matching
and codepage-focused unit tests.

The macOS and Linux old statuses were unsafe as Unicode evidence:
their reports explicitly said pdftotext was missing. The previous
\`inspect_pdf\` simply omitted the text condition when the tool was absent.
Repair fails closed for every fixture with declared \`text_expect\`,
and CI installs Poppler for macOS ARM64 and Linux.

## Real in-figure font fixture (independent Linux experiment)

Authored \`fixtures/qa/g02-tikz-fonts/main.tex\` with
\`fontspec\`, \`unicode-math\`, \`tikz\` and nodes containing Cyrillic text,
Greek symbols and math:
- main text: \`DejaVuSerif.ttf\`;
- math: \`latinmodern-math.otf\`;
- Greek text literal \`αβγ\`, math \`\\alpha + \\beta = \\gamma\`.
Tested with direct XeLaTeX 2025/dev on Linux: exit code 0,
no \`Missing character:\` diagnostics, Cyrillic and Greek strings
retrieved by \`pdftotext -enc UTF-8\`, and
\`pdffonts\` listed both fonts with \`emb=yes\`.
No font binaries are imported into this repository, and the test is
**not yet verified through the repository's Rust CLI** on this branch.

## Separate scope and unverified targets

QA branch changes only \`.github/workflows/qa-matrix.yml\`,
\`scripts/tools/\`, \`fixtures/qa/\`,
\`plans/QA_*\`, \`insights/QA_*\` and allowed target-host QA docs.
No Rust core, GUI, extension implementation or primary CI workflow changed.
The GUI themes requirement #15 is assigned to the GUI lane; D will
test persistence and invariance only when it actually exists.

- Windows Server 2022 hosted build and tests are **CI_ONLY**.
- Physical Windows 10 22H2 x64 smoke: **NOT_RUN**.
- Hosted macOS arm64 is CI evidence, not physical M1/M4 Retina/IME smoke.
- Physical M1/M4 smoke: **NOT_RUN**.
- R4: 135 claimed source cases / 158 pages / 18 semantic tests **not
  imported**; O027/O028/O030/O047 four warning outliers **unresolved**.
- \`pdffonts\`/\`pdfinfo\` absent = individual inspection **NOT_CHECKED**,
  never a cross-platform font embedding release PASS.
- The new SHA's hosted CI verdict is **PENDING** until exact run results
  and evidence bundles have been inspected.

Next bounded block: confirm new Actions run, inspect all fixture artifacts
for exact commit and glyph/text/font results; fix CI/install failures only
within D-owned files. If tool installation is unavailable, record BLOCKED
with runner, tool, step and log and retain a runnable next action.
