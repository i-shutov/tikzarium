# B01 — Engineering evidence and limits (2026-10-31)

W01 app exists only in integration feature branch while main has architecture docs. B is a **stacked PR** targeting `feat/w01-xelatex-egui-core`, never a commit directly to main.

- Baseline app SHA: `eb8b1a10278dd3572ea8e6ca90430372678d2b19`.
- Original split-only UI exposed raw log and optional page-one bitmap; no distinct Source/Canvas mode or native Save As.
- `BuildArtifact.diagnostics` is used directly after successful build. Failed builds return `BuildError` with no structured log; B surfaces an unlocated error row, not a fictitious line number.
- egui character cursors use Unicode character positions, not UTF-8 byte offsets. Added tests for Cyrillic, CRLF and line boundaries.
- Dirty source or failed build makes previously successful PDF explicitly stale; exact PDF bytes remain authoritative.
- `rfd` is already a Win/macOS dependency. Linux manual path remains a fallback. No new dependency or core API change.
- **Local QA:** sandbox has no cargo/rustc/rustfmt or native desktop session; no Rust build, physical Win10/Mac UI or screenshot PASS may be asserted.
- At baseline review, #6 CI hosted Windows Server and macOS format jobs were failing; this is inherited, not B-specific evidence. Inspect current CI SHA and jobs after PR creation.
- Follow-up: source-linked compile failure lines need A's typed core failure data; PDF page navigation requires a reviewed PDF rendering contract. Wrapped-line scroll alignment and HiDPI imagery require real GUI review.
