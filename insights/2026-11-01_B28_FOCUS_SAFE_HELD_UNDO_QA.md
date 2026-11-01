# B28 QA — I26 real X11 Ctrl+Z failure / egui focus contract

2026-11-01 · PR #69, extension of B27 (pending exact-head checks).

**Observed:** I26 [actual X11 run 41267001529](https://github.com/i-shutov/tikzarium/actions/runs/41267001529) compiled the app, opened a real window, pasted/saved UTF-8 source, created and saved a native line. Its first held-click Ctrl+Z failed: the saved line did not change, while the workflow aborted before the six-tool/Build/Export remainder. The previous 68/68 hosted application tests only exercised unfocused B27 event frames, so they cannot refute the GUI finding.

**Code review:** \`handle_visual_undo_shortcut\` previously rejected all shortcuts while \`ctx.wants_keyboard_input()\`, but the app automatically requests TextEdit focus for highlighted generated source. A guide capture represents a distinct visual action and must override that stale focus. When the global Undo succeeds, \`InputState::consume_key(COMMAND, Z)\` avoids a second TextEdit Ctrl/Cmd+Z after the source panel renders in that frame.

**Regression added:** \`b28_held_visual_undo_preempts_auto_focused_source_and_consumes_key\`, production egui source TextEdit + guide frames for 24 tool/width/gesture combinations; checks byte-exact UTF-8 + opaque macro preservation, Undo event consumption and inert mouse-up. No proprietary parser, generator or TeX substitute.

**Status at writing:** code and tests prepared; exact-head CI, rerun of I26 with an updated source-tree pin and any physical Win10/M1/M4 GUI acceptance remain PENDING/NOT_RUN until evidence is collected. Never substitute UNIT_EVENT or generic CI for the GUI run.
