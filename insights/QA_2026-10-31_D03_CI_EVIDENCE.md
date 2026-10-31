# D03 QA execution evidence — 2026-10-31

## Initial state (source verified, not assumed)

- `main` before D03: `f2a55fa13fd9a1e0af2718bc328ed16786975184`.
- Merged D #9 and GUI F01/U01 #16; active downstream PRs #10/#17/#18/#19/#20/#21.
- Pre-D03 main's standard Rust+Linux fixture CI: [run 41174818905](https://github.com/i-shutov/tikzarium/actions/runs/41174818905), completed success on main SHA above. This workflow is NOT the full six-job D matrix.
- Independent D-matrix reference: [run 41176433758](https://github.com/i-shutov/tikzarium/actions/runs/41176433758), 6/6 hosted jobs success at PR SHA `37773b4250c2be55ab67c7fd20965428a1edeeac`. Different SHA from D03. Linux, Windows Server and macOS ARM results are CI_ONLY.
- Current C03 PR #21 D matrix [run 41177061828](https://github.com/i-shutov/tikzarium/actions/runs/41177061828) was QUEUED on initial inspection; no inherited PASS claims.

## New negative controls

Existing `qa_smoke.py` used `family.casefold() in line.casefold()` over the
ENTIRE raw `pdffonts` output row. In particular, an embedded
`ABCDEF+DejaVuSerifFake` or `NotDejaVuSerif` would have satisfied a
`DejaVuSerif` requirement; a table column can be misinterpreted as a
font name. D03 restricts matching to the first PDF font name token with
real subset prefix/variant boundaries and independently checks `emb=yes`.
Controlled mock regression fixtures cover legitimate prefixed regular
and variant fonts, nonembedded font, lookalike names, malformed rows
and nonzero Poppler exit code. Offline tests alone do NOT prove actual
XeLaTeX output or hosted environments.

GUI `UiPreferences` and `UiTheme` already have Rust unit tests in
`crates/tikzarium-app/src/ui_theme.rs`; these cover defaults,
legacy partial settings and theme/source separation *in memory*.
They do NOT exercise real eframe persistence to disk after app restart,
corrupt preferences across relaunch, source/PDF invariant after UI
interaction, Windows file dialogs or Retina font rendering. D03 checks
presence and execution of these unit tests in each hosted Rust job and
records `UNIT_TEST_ONLY`, `gui_restart_persistence=NOT_RUN` and native
host smoke `NOT_RUN`. A separate physical test protocol is in
`plans/QA_2026-10-31_D03_UI_FONT_GATES.md`.

## Pending exact-head gate

At document creation the new PR head had not yet executed its 6-job
matrix. Status = PENDING until job and artifact verification; do not
report cross-platform PASS or native Windows 10/M1/M4 PASS.

R4 external reference remains NOT_IMPORTED and not license-verified;
four strict-warning outliers O027/O028/O030/O047 unresolved.

## Checked historic D03 artifacts, exact source SHA c79beed0 (not current head)

[Six-job run 41177386955](https://github.com/i-shutov/tikzarium/actions/runs/41177386955)
at GitHub PR source SHA `c79beed03473efdfda3003b6dc8ebd0c0f9997e4`
was checked by jobs **and actual JSON in artifact ZIPs**:

- Ubuntu 24.04 x64: `qa-evidence-linux-x64`, artifact 13033158975,
  `source_head_sha=c79beed0...`, XeTeX 2026, 5 fixture PASS,
  0 FAIL, 1 KNOWN_LIMITATION. For G02 real TikZ typography,
  `pdftotext` extracted required Cyrillic/Greek strings,
  `glyph_audit=PASS`, `pdffonts` recorded
  `VEAAFU+DejaVuSerif` and
  `LNJKZB+LatinModernMath-Regular-Identity-H` both `embedded=true`.
  Original source hashes stayed unchanged.
- Windows **Server 2022**, not Win10: artifact 13032824798,
  same exact `source_head_sha`, 5 PASS / 0 FAIL / 1 KNOWN_LIMITATION.
  G02 Cyrillic/Greek text extraction, zero missed glyphs and `pdffonts`
  two embedded fonts were checked in the artifact. Original source
  hashes unchanged. Does **not** prove physical Windows 10.
- Rust/UI unit artifacts Ubuntu 13033542242, Windows Server 13033327642,
  hosted macOS ARM64 13032937875: each has explicit `status=PASS_UNIT`,
  3/3 named theme tests and 2/2 named font-proof tests, with
  `gui_restart_persistence=NOT_RUN`,
  `gui_visual_theme_invariance=NOT_RUN`,
  `physical_win10_smoke=NOT_RUN`,
  `physical_m1_m4_smoke=NOT_RUN`.
  Unit-only PASS is not native GUI persistence acceptance.
- The unit-contract artifact initially exposed a SHA audit ambiguity:
  `sha=4cd681a...` is the GitHub PR's synthetic **merge SHA**,
  unlike the PR source head `c79beed0...`. D03 subsequently added
  `source_head_sha` separately and passed the environment
  `TIKZARIUM_SOURCE_SHA` to all Rust unit jobs. This change needs
  **its own exact-head rerun**. Do not conflate merge vs source SHA.
- The initial `12dcd6f...` job failed 1/26 Python tests due an
  invalid old mocked three-letter PDF subset prefix (`XYZ+`).
  Changed D-owned test fixture to conformant six-letter prefixes
  (`ABCDEF+`, `GHIJKL+`); at `c79beed0...` Python tests succeeded
  on Ubuntu/Windows/macOS. No production font check was relaxed.

MacOS XeLaTeX fixture job was still in progress at this observation;
cross-platform 6/6 was **NOT** declared at `c79beed0...` here.
Later branches add source-reference docs and explicit UI source-head
metadata; current D03 PR head must be checked afresh before acceptance.

## Located R4 provenance, reference-only

Read the owner's 2026-10-29 R4 archive
[release folder](https://drive.google.com/drive/folders/1wZ9CmzWz4OmrZzwDeWibve27O3REvImn),
[QA report](https://drive.google.com/file/d/1JTsIwjQZoowrtdSd1BR1JW9WwHpgPTOe/view),
[readback receipt](https://drive.google.com/file/d/1xnOb_ZUJa15ligtJNgrCOP_Gth0T6jw0/view)
and [SHA256SUMS](https://drive.google.com/file/d/10-DSgaCXm0Y9dBHSJzEdsyenrtlJTKkK/view).
Published clean R4 ZIP digest:
`8211cfed9120695e38f39b341aea07cf28e6482fc0f33144eaf1aa34b18998b0`;
the owner's receipt reports 25,639,804 bytes, 959 archive entries,
957 checked manifest entries and remote readback/ZIP CRC PASS on
2026-10-29. These are **prior R4 release claims**, not independently
revalidated downloaded bytes in TikZarium CI.

No R4 sources, PDFs, images or fonts copied into public repository.
Authenticity/provenance at individual fragment level and redistribution
licenses remain unreviewed. R4's own 135/135, 158 pages, 18/18
semantic tests and 131/135 strict-warning gate do not upgrade
TikZarium acceptance, and four warning outliers remain unresolved.
Full reference policy updated in `fixtures/qa/R4_REFERENCE.md`.
