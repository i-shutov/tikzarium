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
