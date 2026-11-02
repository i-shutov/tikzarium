# I61 · independent B42 real-egui Studio source/PDF acceptance

Baseline B42 PR #91 HEAD `dadd05b16c0c917f28a57f233b12931fbbcb98cd`; app/src tree `64df229392c03a99ca29238bcc2e5f422c4d7409`. Independent D/integrator QA **stacked on B42**, not production B code, main, or qa/i06-n1-desktop-pointer.

## User-visible vertical

Real Linux/X11 `tikzarium-app` launches with isolated XDG folders and the selected external TeX Live XeLaTeX. It clicks **File → path TextEdit**, pastes the original Unicode/opaque-macro source into the actual editable source pane, presses the **GUI Save icon**, clicks grouped TikZ icons and six individual native C tools, sends six physical XTest pointer drags/clicks, and demands one additional real GUI-persisted command after each gesture. Every step asserts the original source's bytes outside validated authored C commands. The grouped popups, selected tool, pointer, saved source, F1 open/close and PDF viewport are screenshoted separately. GUI Build → PDF tab → Export must yield an external XeLaTeX one-page PDF with Cyrillic extracted and DejaVu embedded; Poppler PNG is retained.

The tested 1366×768 control coordinates come from independently reviewed B42 bootstrap screenshot SHA `b5f717856087c397b9a87a98965f581a180e6f055256724072a240f413538cad` and group SHA `d3be3595ba89bed353a8af1a7c11a81c173ac4140722c2e1edc213e92a1e3c77`. **File-menu, individual tool and Undo coordinates are provisional until output screenshots are independently checked**, and failures must not be retried by silently accepting another UI element.

## Remaining gates and evidence classifications

- New exact-head GitHub Actions, actual screenshot/source/PDF and independent SHA review are **NOT_RUN at authoring**, not PASS.
- This initial full six-tool path does **not** assert two-file dirty Open, CRLF on-disk loaded-file preservation, inspector pinned Apply, visual Undo or native Ctrl+Z in the actual B42 window; report marks each NOT_RUN. They are still required for B42 merge acceptance using further independent tests, not removed requirements.
- Hosted real X11 is not physical Win10/MiKTeX or macOS ARM M1/M4. Both are **NOT_RUN**. Hosted Server MiKTeX is not physical Win10; the user Windows Server self-hosted runner remains unverified.
- No engine substitutions, TeX parser/CAS, package installer, second TikZ catalogue, source regeneration or B/C/A/F production changes.
- QA branch targets B42, never merge into main independently. Require full exact-head CI, manual screenshot/PDF/SHA review, and then exact-head merge into B42 and separate B42-to-main checks.

First artifact review: prior QA run 41425235038 failed *inside QA driver* before native gestures. Fix X11 root/client coordinate origin and background xclip pipe inheritance in next QA HEAD. Do not mark a B42 production failure; new exact-head real process CI and screenshot calibration required.

Second inspected artifact 13131254633: real File menu and source Ctrl+V visually PASS, path TextEdit hit at y101 failed and Save properly refused; reaccept on calibrated y93. PDF audit strengthened to require embedding for ALL records, not a single DejaVu yes. Actual six tools and exact PDF remain NOT_RUN.

Third reviewed run 41426644654: custom-path popup TextEdit failed again despite visible real menu; no product Save defect proved. Use isolated app cwd and the GUI's visible default figure.tex, via actual toolbar Save. Custom path TextEdit NOT_RUN; new exact-head source/PDF evidence pending.


### Integration re-lease to frozen B42 (2026-11-02 UTC)

Production HEAD #91 is `91e2d8201cd0c016e00d52618e4024fedb66424e`, app/src tree `64df229392c03a99ca29238bcc2e5f422c4d7409`; independent I61 QA remains a stacked PR targeting the B branch. Latest B42 bootstrap [41445054318](https://github.com/i-shutov/tikzarium/actions/runs/41445054318) reports two PNG hashes `4367ce5d798befaf2a3a157089db23df4cc5540b2d83814d94bacb15bb9f5766` and `df7cdc32f345f4988bad8de5029ababd396fb5f720f80d464945cb90f06ee1df`, identical to already manually reviewed B42 layout. Thus button coordinates are **candidate only**, not a gesture PASS. New font parser checks ALL `pdffonts` embedding flags from the right with four positive/negative offline tests, not an exit-code proxy.

I61 still requires actual original GUI saved-source, six pointer gestures, help, XeLaTeX PDF and independent artifact SHA/manual review. Older I51/I57 B41-tree FAILs occur before GUI and are stale gates; no smoke or synthetic event-frame is a substitute. Physical Win10 MiKTeX/Mac ARM remain NOT_RUN.


## CI ownership migration — 2026-11-02

B42 is frozen at `91e2d8201cd0c016e00d52618e4024fedb66424e`, app/src tree `64df229392c03a99ca29238bcc2e5f422c4d7409`. Current independent real-X11 six-tool → GUI saved native-source → external XeLaTeX PDF evidence: [I61 run 41449047973](https://github.com/i-shutov/tikzarium/actions/runs/41449047973), original artifact 13143756910, 40/40 SHA-256 rechecked. I61 now provides B42 six-tool regression on PR/main and push/main; if a future app/src tree changes, the exact source-tree and coordinate lease must be re-reviewed rather than silently passing stale pointer positions.

Four historical B41 fixed-tree GUI workflows (`n1-desktop-smoke` I51, `i46-b34-dirty-open` I51, `i53-b38-live-libraries` I53, and `i57-n2-four-live` I57) no longer run automatically against `main`. They retain explicit workflow_dispatch and their historical branch triggers, including the original B41 tree check: **actual tests were not removed**. Their B42 red runs failed on hardcoded tree `d290bdad...` **before any GUI**, not on a real B42 interaction. I61 does **not** substitute for their Open/Undo/library assertions.

**Still blocked, NOT_RUN at B42 real GUI level:** two-file Open/dirty Save-and-open with CRLF and opaque macro, source/native and visual Undo after manual changes, inspector pinned Apply, deterministic Help/F1 (I61 frames 20/21 ambiguous), connected libraries; physical Win10/MiKTeX and Mac ARM XeLaTeX. These are required release gates, not waived by a green six-gesture smoke. Merge #92 into frozen #91, then #91 into main only after full independent B42 evidence and exact-head CI with reviewed original artifacts; run separate post-merge CI.


## I62 additional real GUI gates

QA head f3aa1ea7 run 41458975300 was CANCELLED at 45min while acquiring 129MB Ubuntu/TeX Live packages on the Azure apt mirror, after passing app-source SHA and four PDF font-audit tests. This is CI infrastructure, not an executed GUI regression; no new source/PDF proof on this head. Switch hosted CI to Ubuntu archive mirror with bounded HTTP timeouts, while retaining external TeX Live XeLaTeX identity. Previous accepted I61 real X11 six gestures/PDF (cc339308, run 41449047973, 40/40 SHA) remain separate evidence.

Extend the *same* I61 real-egui QA script after verified six primitive GUI Save/PDF with actual F1 Help tab two-state images, TextEdit Ctrl+Z, seventh native gesture and visual Undo, two-file CRLF/opaque macro GUI Open/Edit/Save, Ctrl+O Reopen after explicit external fixture modification, dirty Open -> Escape Cancel -> Save, and original SHA/image artifacts on failure. These new probes are NOT_RUN until exact-head CI and independent manual image/source/PDF inspection; unexpected focus/coordinate actions must remain FAIL. Inspector pinned Apply, dirty Save-and-open, project libraries, physical Win10 and Mac ARM remain NOT_RUN pending real tests.


## I63 integration lease — B42 File TextEdit popup repair, 2026-11-02

Independent integrator re-leased I61 on frozen B42 #91 `09a4df5baf0f7446bb02c68fbb126821d2a0ff9f`, verified `crates/tikzarium-app/src` Git tree `72499c6e31d4cf6a2a36d16fb7bc8b10a9d66acb` by GitHub Git tree API. Old B head `91e2d820…` and app tree `64df229392c03a99ca29238bcc2e5f422c4d7409` are historical; the QA workflow now pins the new tree and rejects any further B production drift. B only changed its File popup behavior (egui 0.33.3 CloseOnClickOutside) plus B plans/insights, preserving the C generator and all six tools. Exact B head hosted Rust CI, multi-OS D QA, generated-source XeLaTeX, hosted MiKTeX, font audits all passed; B test is `UNIT_EVENT`, not a successful real two-file X11 Open.

One stacked integration commit combines B's three-file change with the existing #92 QA-only workflow re-lease, this plan/insights and CHANGELOG. Do not rerun old B41 hard-coded SHA guards and do not create new QA micro-PRs. New D exact-head real Linux/X11 must prove File TextEdit focus→input→real Open of independent CRLF/opaque second file, edit/save/reopen, dirty Cancel and preserve six native gestures, F1/Undo, Unicode embedded-font XeLaTeX PDF. Inspector pinned Apply remains a separate explicit real GUI release gate unless this execution proves it. Manual source/PDF/screenshot/hash audit mandatory before either merge. Physical Win10/MiKTeX, M1/M4 XeLaTeX NOT_RUN.


## I63 QA double-lease correction — 2026-11-02

The integrator caught an additional historical B app-tree SHA hardcoded in the Python real-X11 driver (not only the workflow), which would reject the correct B42 executable before GUI. Both now bind exact `72499c6e31d4cf6a2a36d16fb7bc8b10a9d66acb`; lightweight CI preflight asserts equality BEFORE installing TeX Live. Added screenshots immediately after File TextEdit pointer focus and Ctrl+A to distinguish focus from clipboard paste if two-file Open fails. Same stacked QA #92 only, no B edits/new PR. Prior first I63 head is superseded on this exact issue; any CI failure from that old head is stale QA rather than demonstrated product regression. Complete Open/Undo/Apply and physical Win10/M1/M4 remain unaccepted until evidence.
