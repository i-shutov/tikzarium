# B24 QA — source revision and pointer capture
2026-11-01 · i-shutov/tikzarium B · existing draft PR #62.

Root cause: an egui click is not a drag; after guide-origin primary press, a manual TextEdit change calls Session::note_manual_source_edit() → sync(), which used to clear the Esc/cancellation guard. On mouse-up the production Response::clicked() could issue a new TikZ source command that the user had not intended. A mid-gesture tool switch similarly discarded the guard.

Correction: remember a primary press on the provisional guide independently of drag_start; source revision changes/tool switching preserve a cancelled capture until actual primary release. No source rewriting during cancellation, no changes to C catalogue, core, D QA or renderer.

Tests implemented: `b24_manual_utf8_source_edit_cancels_held_click_and_drag_before_mouse_up` (6×2×2 = 24 real egui RawInput pointer timelines, UTF-8 outside-command mutation, no ghost insertion, fresh insertion + Undo, macro preservation and Save/Reopen); `b24_switching_tool_during_armed_pointer_keeps_release_inert` (armed Line → Cubic, inert mouse-up, fresh Cubic insertion + Undo). Both exercise the real widget handler and Session change hook, UNIT_EVENT only.

Exact-head hosted CI: PENDING until final SHA checks complete. Independent actual Linux/X11 I19 #66 is run on B23 source and must not be reported as B24. Hosted Windows Server MiKTeX is not user Win10. Physical Win10/M1/M4 + IME/Retina/native dialog/screenshot NOT_RUN. PDF geometry not inferred from provisional guide.