# I04 — observed baseline and honest acceptance ledger

Date: 2026-10-31. Repository i-shutov/tikzarium only.

## Starting SHA / merged dependencies

Main before I04 branch: \`0220e3117d850c18d1016db39389d7c90bd73900\`
(after integration #17 \`eeb074f3\`, B03 #19 \`12bb0969\`,
D03 #22 \`e9fe78d4\`, F02 #18 \`0220e311\`).
All four merges used GitHub PRs with exact expected head SHA;
their PR head checks passed. Post-merge main Actions from these successive
SHAs may still be queued/in progress and MUST NOT be called PASS prematurely.

## Independent actual TeX/Poppler smoke before I04 CI

Checked-in B03 fixture blob:
\`3561301afbfc406133612166b230f9ce116ca2af\`
matched local \`git hash-object\` exactly. Source SHA-256 before/after:
\`c185c916d04a404e403b67380ef82a74b953d58d8aecc09e610158fac81a5bd5\`.

Actual local environment: Debian XeTeX (TeX Live 2025/dev),
Poppler \`pdftoppm 25.06.0\`, DejaVu Serif available.

- Direct XeLaTeX fixture: PASS, \`pdfinfo Pages: 2\`.
- Per-page \`pdftotext\`: page 1 contains Привет; page 2 contains Геометрия.
- Per-page Poppler 120 dpi:
  page-1 SHA256 \`589ebf04fca55c4cd24dd0cc7b3958d44baf00d6d7f98e9d444da848590db2b9\`;
  page-2 SHA256 \`aa98849e32599a0317de834b5170fa44c7ec8a4fcc49533568720b0a337b6387\`.
- PDF SHA256 \`aea62fe1e9237729d0076b359ae13efb0feb2eb444804540cdae183c6895098b\`.

This experiment used direct \`xelatex\`, **not the actual Rust CLI**.
The new GitHub job must independently validate CLI→XeLaTeX→PDF→Poppler.
It also did not run the Rust/egui page worker or test GUI navigation.

## Current I04 verification statuses

| Gate | Status |
| --- | --- |
| B03 branch-head 13 hosted CI check entries at SHA \`37773b4250c2be55ab67c7fd20965428a1edeeac\` | PASS (GitHub reported) |
| Local direct XeLaTeX + two-page text and distinct PNGs | PASS (observed) |
| New I04 Python unit tests on exact PR head | PENDING CI |
| New I04 Rust CLI → XeLaTeX → PDF → Poppler integration | PENDING CI |
| Uploaded I04 JSON/artifact digest review | PENDING CI |
| Windows 10 x64 egui Page 1→2→1 smoke | NOT_RUN |
| User Mac M1 egui Page 1→2→1 smoke | NOT_RUN |
| User Mac M4 egui Page 1→2→1 smoke | NOT_RUN |
| Visual TikZ geometric editing | NOT_IMPLEMENTED |

If the new job fails, do not repair the test by weakening Unicode/page
assertions; preserve logs, fix actual CLI/fixture/renderer incompatibility,
and rerun at a fresh exact SHA. No release acceptance is claimed.
