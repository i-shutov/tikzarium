# B29 — True GUI I30 Undo/source-editor race (B-owned)

2026-11-01 · Parent main `529217b89e83ffb93393eefb99a2a6ff07967c13`, same draft PR #69 (no micro-PR).

## Reproduced failure and constrained correction

Independent [I29 actual Linux/X11 workflow](https://github.com/i-shutov/tikzarium/actions/runs/41271432298) on B28 `f2dfbd0bb073e6152146a151eca138af8fc030e1`: source entered and saved by GUI, native Line created/saved, Ctrl+Z delivered under held guide pointer; inspector reported «Отменена точная правка исходника», yet one Line persisted in source/GUI/file after release and GUI Save. I30 QA #70 correctly treats this as FAIL; this is not a unit-test-only failure or an old stale-pin preflight.

Native egui TextEdit has its own source-content undo snapshots, distinct from C revision-checked inverse patches. The B28 helper never rendered the source *before* inserting the first line and did not simulate auto-focus on the Undo frame, so it missed possible native history re-entry. This block closes that integration boundary: guide pointer-down takes keyboard focus from the auto-highlighted TextEdit; successful visual Ctrl/Cmd+Z removes only its raw key event before later TextEdit rendering; source navigation/galley scrolling still runs, but does not re-focus TextEdit during the same cancelled pointer event; native undo snapshots are cleared only after a successful app-level visual inverse patch. No arbitrary macro/TeX rewriting or PDF geometry changes.

## Acceptance

- Run production `handle_visual_undo_shortcut` and `show_guide_frame` in `egui::Context::run(RawInput)` with real code_editor before and after C source insertion; 6 primitives × two widths × click/drag; programmatic jump, held Ctrl/Cmd+Z, release, repaint, saved bytes and reopened source; verify no owner command / opaque UTF-8 changes.
- Ensure no visual Undo stealing ordinary native TextEdit undo when guide capture is absent; inspect existing regression suite. Do not turn UNIT_EVENT into a claim of actual X11/Windows/macOS acceptance.
- Request independent #70 real X11 run on exact updated B app-tree pin, same strict source+image+PDF assertions, including held click and drag; inspect artifacts before considering merge. Do not touch QA-owned files or old #48.
- External XeLaTeX PDF authoritative, provisional guide not calibrated. Windows 10 MiKTeX and Mac M1/M4 remain NOT_RUN.
