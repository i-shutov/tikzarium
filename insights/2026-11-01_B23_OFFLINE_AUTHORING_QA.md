# B23 QA — offline native TikZ source authoring vs external PDF gate

Date: 2026-11-01. Owner: B. Same [draft PR #62](https://github.com/i-shutov/tikzarium/pull/62); baseline merged main `e28a3a4fb067a0a752d720cea484043d52beab00`.

## Bug rationale

Earlier B UI connected native **source write authorization** to the *runtime installation/discovery* predicate. The common C generator does not invoke XeLaTeX; a source editor should remain useful without a successful renderer check. Exact PDF cannot be claimed unless external XeLaTeX and its dependencies are actually available, but absence of these prerequisites must not force visual authoring into a dead end.

## Reproduction and verification

1. Load `EVENT_SOURCE` with a direct `\\usepackage{tikz}` and `\\usetikzlibrary{arrows.meta}`; set runtime evidence to a missing TeX engine, missing `tikz.sty`, or both.
2. Choose line, arrow, rectangle, circle, node or cubic Bézier; primary-press and release over the real guide widget; verify one C-authored command, valid owned marker and unchanged foreign `\\myOpaqueMacro{a_b}`.
3. Undo and demand a byte-exact match of the original source.
4. Under `implemented=false`, no primitive can be inserted. Under C/N2 library `ABSENT`, arrow cannot be authored—even when both external runtime checks are absent.
5. For each check, drive **real `egui::Context::run(RawInput)` frames and production `Response` code**, not mocks of `drag_started` or direct source-only generator calls.

Expected new coverage: 6×2×3=36 successful `UNIT_EVENT` source-authoring scenarios, plus blocked-path event tests. The earlier six-tool palette/source selection/F1/Undo/manual typing/Save-Reopen tests must remain green.

## Evidence status before exact-head CI

- Static source review and real-handler tests **IMPLEMENTED** in B-owned `tikz_canvas.rs`.
- Hosted Linux/Windows/macOS Rust tests and CI: **PENDING** until final commit checks complete; do not inherit B22's PASS.
- External MiKTeX on hosted Windows Server and real XeLaTeX PDF: **PENDING** on B23 HEAD.
- Actual Linux/X11 screenshot six-gesture + GUI Build/Export: **NOT_RUN** for B23; separate independent #48.
- Physical Windows 10 x64 + independently installed MiKTeX; physical M1/M4; IME/Retina/native dialogs/screenshots: **NOT_RUN**.
- Provisional guide coordinates and drawn overlays are **not** verified against XeLaTeX PDF; no TeX/CAS source interpreter.

Update PR #62 and integrator #48 with final exact SHA, named tests, CI links and any CI failures before labeling this block passed.