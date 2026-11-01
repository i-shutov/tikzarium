# B16 QA ledger — palette click and six native TikZ primitives

**Baseline main:** `ab5705d4dd7e3dcefd3ef6ddfd695f6d0ee4dfd1`. **Lane:** B only. Pre-change AGENTS, B14/B15 plans and insights, N1 plan, currently open PRs and I06 #48 real desktop failure reviewed. #50 is merged; #37/#43 must not merge independently.

## Evidence at submission
- Source review: production `show_guide_frame` iterates six tools from `tikz_authoring::TOOLS` / C `ToolSpec`; previous event tests call `session.select_tool(tool)` directly, so they do not test palette hit rectangles.
- Observed I06 X11 artifact: genuine 5/6 gestures and saved TeX, sixth tool not selected by integration fixture; cubic failure is **not attributed to app code**. Exact root cause and screenshot review: [I06 #48 comment](https://github.com/i-shutov/tikzarium/pull/48#issuecomment-6544972716).
- B16 changes: visible selected-tool label; `Context::run(RawInput)` production UI toolbar press/release → F1 → guide drag → generated command and source line → disk readback → known C parameter patch and Undo, twice per tool at 820/1366 viewport widths. This is test *implementation* until CI executes.
- Local sandbox: `rustc` / `cargo` **NOT INSTALLED**, GitHub network clone unavailable; no local Rust PASS. No external XeLaTeX or PDF asserted for the new SHA.
- Native Win10 x64+independent MiKTeX and Mac M1/M4 GUI/screenshot/IME/dialogs **NOT_RUN**. Linux X11 #48 is separate integration evidence, not B physical QA.

## Run procedure / disposition
Read the exact PR head and all workflow outcomes on that SHA. If Rust fmt, Clippy or tests fail, extract actual job logs, correct in B branch and rerun; do not relabel stale-parent greens. D independent MiKTeX on hosted Windows Server is not target Win10 acceptance. Integration handoff must quote exact SHA and checks.
