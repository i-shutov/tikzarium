# B22 — Esc pointer-capture cancellation across native TikZ tools

2026-11-01 · Stream B egui · existing draft PR #62 · source base: `5547f166b33e98be5f8c811afae2b9de24812a41`; merged main observed: `e28a3a4fb067a0a752d720cea484043d52beab00`.

## Reproducible UX defect

Before B22, Esc cancellation occurred only when `Session.drag_start` existed. A click without drag never sets it: an `egui::Response::clicked()` on a release in the same frame as Esc could still call `Session::insert`. Likewise pressing Esc while a primary click is held (before any drag threshold) followed by a later mouse-up could author an unwanted command. Alt-selection on an Esc release could still choose a marker. This violates the user's explicit cancellation intent, especially when the source remains editable.

## B-owned implementation contract

- Preserve a short-lived `cancelled_pointer_capture` flag in the existing source-owned session, from Esc until primary pointer release. Handle Esc before `clicked()` and `drag_stopped()` paths, including a single combined event frame. Do not reset the flag merely because the Esc/Alt modifier is released. Cancel Alt-selection too without creating a command.
- Clear the flag after mouse-up, on deliberate tool switch and on source reset/manual edit. Do not mask the following normal gesture.
- Keep real TikZ generation/help in the C catalogue; no new TeX parser, macro rewrite, coordinate solver or tool schema. Exact PDF remains external XeLaTeX; guide overlay is provisional.
- Test actual production guide handler with `egui::Context::run(RawInput)`, six tools and 820/1366 logical widths, three cancellation timing sequences each, normal next-click insert, Undo and preservation of the original opaque TeX. Separate event test for Alt-selection Esc.
- Require exact-SHA Rust fmt/test/Clippy, N1 XeLaTeX, D QA, Windows Server MiKTeX and font gates. These are UNIT_EVENT/hosted tests, not physical Windows10 or M1/M4 GUI acceptance.
- Do not alter C/D/E/F/A files, replay #37/#43 or merge draft PR #62 without independent GUI acceptance.
