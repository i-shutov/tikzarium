# A/W04 — conflict-free XeLaTeX runner + typed font evidence

Date: 2026-10-31. Owner: A / issue #2 and #14.
Merged base: \`main\` 0220e3117d850c18d1016db39389d7c90bd73900.
Previous A/W02/W03 PR #10: 3af867cfcd3228fa2ad8bad30af2bf41d809288c.
F01/U01 PR #16 and F02 PR #18 are **already merged**, not copied or reimplemented.

## The integration defect

A/W02 introduced a fourth \`BuildDiagnostic.source\` field, while the
already-integrated egui GUI constructs the original three-field type. Directly
merging #10 would break the GUI. F02 also introduced a separate typed
\`FontIssue\` parser, while A/W02's log parser replaced the older font warning
rules. This branch reconciles both **without modifying GUI, workflows or
another stream's files**.

## Delivered A-only vertical slice

- [x] Merge original PR #10 (XeLaTeX process, log persistence, failure logs,
      safe CLI PDF output, .fls recorder, cancellation) with current \`main\`.
- [x] Retain \`BuildDiagnostic {severity,message,line}\` for B compatibility.
- [x] Introduce \`LocatedBuildDiagnostic\` plus \`extract_located_diagnostics\`
      as a separate typed source-path companion, including Windows drive paths.
- [x] Delegate wrapped missing glyph/fontspec error parsing to F02; avoid
      truncated generic duplicates and preserve font-specific severity.
- [x] Attach typed \`FontIssue\` lists to successful \`BuildArtifact\` and
      failed \`BuildError::TeXFailure\`; expose \`BuildError::font_issues()\`.
- [x] Preserve original source bytes; tests for successful missing-glyph
      build and failed missing-family build using fake engine on Unix.
- [ ] Verify **exact merge HEAD** Rust fmt/check/tests/Clippy across hosted
      Linux, macOS ARM64 and Windows Server; inspect real XeLaTeX fixtures.
- [ ] Native physical Windows 10 x64, Mac M1 and M4: NOT_RUN.

## Contract and evidence limitations

The \`font_issues\` values are derived from a bounded in-memory TeX log;
a caller-requested persisted .log is the fuller record. A missing glyph may
coexist with zero exit and a PDF, hence engine success is not a clean-font
verdict. PDF text extraction and embedded-font proof require separate Poppler
QA. The app remains free to ignore new typed fields until B wires a UI
experience; no claim that the GUI exposes every issue yet.

\`-no-shell-escape\` is not an OS sandbox; child kill does not prove process
tree termination. Physical Win10/M1/M4 tests remain release blockers.
