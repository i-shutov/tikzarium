# A/W04 — QA and merge-resolution evidence

Date: 2026-10-31. Lane A. PR #10.
Starting \`main\`: 0220e3117d850c18d1016db39389d7c90bd73900.
Original A head: 3af867cfcd3228fa2ad8bad30af2bf41d809288c.

## Independently reviewed sources

- Current B egui \`main.rs\` creates three-field \`BuildDiagnostic\` directly,
  and B page navigation / themes were already integrated before this merge.
- F02 \`font_audit.rs\` is present on main and handles wrapped missing-glyph
  lines, full fontspec messages and explicit missing-family names.
- PR #10 on its old base had a real \`diagnostics.rs\` conflict and would
  remove the F02 exports if blindly accepted.
- No B/C/D/CI file is rewritten. Main tree is the starting point with
  precisely A-owned paths overlaid.

## Regressions to verify

1. \`cargo fmt --all -- --check\`, workspace \`cargo check\`, unit/integration
   tests and strict Clippy, all on exact new HEAD.
2. Existing B GUI compile works with the stable three-field diagnostic.
3. Generic TeX errors, l.N, Windows drive-path error and warning parsing
   preserved, while fontspec errors remain complete and not duplicated.
4. Failed fake XeLaTeX with missing font: typed family, source line, full
   persisted log and source byte identity.
5. Zero-exit fake XeLaTeX with a wrapped Cyrillic glyph warning: one complete
   Warning and typed MissingGlyph, source byte identity.
6. Real XeLaTeX and Poppler glyph/text/font embedding suites still pass.
7. For physical Win10 x64 / Mac M1/M4, separate native GUI smoke evidence
   is mandatory; hosted CI never upgrades those statuses.

## Verdicts at commit preparation

Static source inspection / merge-boundary audit: PERFORMED.
Local cargo/rustfmt/Clippy: NOT_RUN (no Rust toolchain in executor).
GitHub exact-head CI: PENDING until verified on the merge SHA.
Windows Server hosted != Windows 10 physical; Mac hosted != user's M1/M4.
No native physical smoke or GUI screenshots were performed here.

## Next step after hosted CI

If CI reports a regression, change only A-owned paths and rerun the exact
SHA. Then request integrator independent review/merge of PR #10; B may wire
diagnostic source navigation in its own future PR. Do not mark v0.1 accepted.

## First exact-head CI and bounded correction

Initial merge SHA `f9f67ab8927f37ffc180993525f372d0010b4578`:
GitHub Actions main CI [41179264969](https://github.com/i-shutov/tikzarium/actions/runs/41179264969)
and 3-OS QA [41179265027](https://github.com/i-shutov/tikzarium/actions/runs/41179265027)
reported cargo fmt --check FAIL on A-owned diagnostics.rs, lib.rs and
runner_unix.rs. The actual rustfmt diff from macOS hosted job 124473126086
was applied verbatim. This is a **formatting failure**, not a proven Rust
compile or runtime failure; a new exact-head run is required for any PASS.
