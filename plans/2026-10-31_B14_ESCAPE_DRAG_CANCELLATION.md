# B14 — Escape cancellation and exact-head Clippy repair in the TikZ-native egui vertical

Date: 2026-10-31. Lane B only; continue the single existing draft PR #50 instead of a micro-PR. Branch `feat/b10-egui-c-n2-verified-import-ui-20261031`. Exact fresh main reviewed: `b2a1299d5660d04614c78ca696189dfab10e4f43` (#44 merged, #37/#43 historical); branch parent `7b62d725cb11c0722fa7cab1f65aa122d1d0b47e`. Read `AGENTS.md`, B12/B13 plans and QA, open PRs and the C/N2 catalogue. No changes to A/core, C catalogue/API, D, E or F.

## Observed failures and user-facing defect

1. Exact B13 parent `7b62d725cb11c0722fa7cab1f65aa122d1d0b47e` has real hosted Rust CI and D QA **FAIL** in Clippy across Windows Server, macOS and Linux, despite passing the relevant Rust tests and actual N1 XeLaTeX proof: `tikz_authoring::tikz_loaded` is only referenced from tests and triggers `-D dead-code` in the production binary. Remove the redundant B wrapper and have existing tests assert the public C-backed `requirements_status/requirements_loaded` behavior instead. No duplicate preamble scanner or suppressing lint.
2. Existing pointer handler has no Escape cancellation. An in-progress provisional egui drag can be abandoned only by mouse release (which creates a TikZ command). Make Esc discard the pending drag without editing source, preserve the following normal drag, and retain Alt-selection behavior. This is an app-owned interaction change only, not TeX interpretation.

## Acceptance

- Real `egui::Context::run(RawInput)` event frames for all six C-native tools: press → move → Escape → release yields **no patch**; next ordinary drag inserts exactly one C-generated command; Undo returns the original opaque source.
- Existing gesture, F1, Alt select/drag, manual TextEdit, parameter/source focus and Save/Reopen tests stay intact.
- Exact-head rustfmt, Clippy, unit/event, N1 generated source to real XeLaTeX, hosted MiKTeX and fonts must be checked separately. No PASS inferred from earlier SHAs.
- Source authority: no ad-hoc geometry or TeX engine, no writes to unknown macros/scopes, PDF remains XeLaTeX authoritative and guide unregistered.
- Physical Win10 x64 + independent MiKTeX and Mac M1/M4 GUI, screenshots/IME/native dialogs: **NOT_RUN**. UNIT_EVENT and hosted Windows Server/macOS CI do not substitute.

## Integration

Do not merge #37/#43, do not copy a generator, and do not consume C #55 until it is integrated. Hand off the exact B14 head, CI links and remaining limits to the integrator on PR #50 and integration PR once available.
