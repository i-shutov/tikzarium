# B20 — readable compact ownership metadata without touching foreign TeX

2026-10-31. Scope **only** `i-shutov/tikzarium`, stream B egui. Initial current main `9b4cd26b5b73f8011b975f9922cb208e36e12564`; existing draft PR #62 HEAD `42233621deaf4f60d2b7920bb8ff1e4b58bdf414`. Read AGENTS and B07/B19 plans/insights; reviewed open #27/#48/#62. Do not replay old #37/#43 or change C/core/D/E/F files.

## Actual UX defect and objective
The independent Linux/X11 #48 artifact review documented visible `% tikzarium:n1:<hex JSON>` comments taking 216–286 characters, most of every authored TikZ line in the always-visible source pane. This is a serious readability regression even though the six primitive gestures, F1, source patches and hosted CI passed. We retain editable real TeX, not a fake scene buffer or destructive visual folding.

## Contract and implementation
The original `% tikzarium:n1:` comment prefix remains stable. New B-owned ownership **payload v2** is a compact UTF-8 JSON tuple `[2,id,"tool",{"parameter":"value"}]`, preserving readable keys and non-ASCII node text. The C catalogue still provides all generated commands and parameter names; B only records its own source ownership. V1 hex-encoded JSON is *read*, checked byte-for-byte against the C generated command, and retained unchanged on no-op Apply. A deliberate parameter change may replace **only that recognized owned line**, with source-patch Undo restoring legacy bytes. Malformed, altered, unrecognized schema and foreign TeX do not grant edit authority. No new TeX/CAS engine, dependency, migration pass, or hidden full-document rewrite.

## Acceptance
- Real egui `Context::run(RawInput)` palette→six gestures now asserts compact metadata alongside original source/inspector/Save-Reopen/Undo tests.
- Direct B tests: CRLF+Unicode document Save/Reopen, literal marker within node text, per-tool metadata shorter than legacy, compact parameter/Undo, backwards-compatible legacy no-op/real edit/Undo, tampering and unknown schema fail closed.
- Hosted Rust fmt/tests/Clippy, N1→external XeLaTeX, D QA, Windows Server MiKTeX and font QA must be evaluated on **exact new SHA**. Until they finish, these are PENDING, never inherited from B19.
- Native Linux/X11 #48 six-gesture + Build/Export, physical Win10 external MiKTeX and M1/M4 screenshots/dialogs/IME/Retina remain separately gated; UNIT_EVENT is not a physical GUI.

No public type/API changes to C or core. Exact SHA and CI to be handed off to #48.
