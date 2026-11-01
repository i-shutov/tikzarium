# B18 — independent evidence ledger (B scope)

2026-10-31. Start main `5f5a805005430ff26d3e3dd9c17c3ca3d7af9fa3`, PR #62 previous head `6235be440913580034344661a6e838a1f7ab8856`. Compared `aa6d1d08…main`: intervening D11 and integration changes do not touch the three B app files or B16/B17 plans/insights. New B18 code/test/plan/insight are committed together; merge commit is non-forced, parented to old B head and exact fresh main.

**Observed UX defect by code review (not physical screenshot):** `show_inspector` places large F1 help after parameter widgets inside a ScrollArea; F1 can be out of sight. Pinned C-catalogue excerpt is now outside that ScrollArea, next to already pinned Undo. The user can reach syntax and source citation without navigating down the list. Old tool generation remains the shared C generator. A new keyboard Undo handler is conditioned on Split, Cmd/Ctrl+Z and *no* focused text input; it reuses revision-safe inverse source patch, never intercepts TeX TextEdit Undo.

**New exact-handler tests (UNIT_EVENT, assertions subject to CI):**
- `f1_pinned_c_help_is_visible_without_scrolling_and_never_edits_source`: frames at 320×260, genuine F1 down/up/down, measured visible help rect, source and visual history unchanged, shared C id.
- `keyboard_visual_undo_uses_real_frames_without_stealing_textedit_undo`: actual modifier Z frame undoes known circle radius with source-line focus; focused TextEdit retains shortcut; manual UTF-8 edit revokes old patch.
- Existing B16 six palette/gesture/F1/Save-Reopen and B17 live Undo tests stay in place.

**Initial status: NOT_RUN on new HEAD until hosted CI finishes.** No `cargo` or Rust compiler in this execution environment. Do not convert a branch-parent success to new-head PASS. Physical Win10 x64 + independent MiKTeX and real M1/M4 native GUI/screenshot, Retina, IME and file-dialog smoke remain NOT_RUN, hosted Windows Server is separate.
