# I61 B42 independent actual Studio acceptance — 2026-11-02

Main `93db2044b5b91f79c0e774be8806a3693ba7329b`; B42 `dadd05b16c0c917f28a57f233b12931fbbcb98cd` (snapshot). The previous I51/I57 source-tree profiles still target B41 and fail **before launching egui** on B42, so neither genuine PASS nor actual functionality FAIL can be inferred. The B42 bootstrap proves a real window and opening the *Geometry group popup*, **not** a selected command or PDF.

This QA commit adds a **separate full Studio X11 acceptance candidate**, source/PDF SHA ledger, all-six tool icon and pointer sequence and external XeLaTeX PDF predicates; no production code changes. It pins B42's exact app/src tree and captures screenshots and files on early failures for subsequent coordinate repair. Strictly no offscreen Session call masquerades as a real GUI interaction.

**Evidence at authoring:** code ready for hosted action; execution, artifact checks and manual screenshot interpretation **NOT_RUN**. Even a green automated run needs manual visual review and does not cover all Undo/Open/CRLF gates or physical OS acceptance. Do not merge this QA or B42 on this statement alone.

## First I61 actual-X11 run — failed, root cause and repair

Exact previous QA HEAD `0ca4f3c8a69b67c026b5ed142af2b4242e266e07`, real [PR workflow 41425235038](https://github.com/i-shutov/tikzarium/actions/runs/41425235038), original artifact **13131797362** independently downloaded and inspected. Strict exact app-tree lease PASSED; 24.04 hosted TeXLive/X11 prerequisites and locked production Rust build PASSED; actual Studio process started and produced screenshot `01-real-studio.png`. `02-file-menu.png` was **byte-identical** to the first image (SHA-256 `faada4760c84d33c85af0a15b8cac0ea3192bcb001a400a672e3b9bf7d95ccc2`) instead of showing the menu. Driver then blocked for 25 seconds in `xclip`, never reached a real GUI Save or TikZ pointer. Report correctly FAIL / remaining NOT_RUN. **No product source defect established.**

Independent analysis identified two QA-driver defects: X11 commands used `xdotool mousemove --window` with coordinates measured from the **root screenshot**, thereby adding WM titlebar y offset; and `run()` captured pipes of the intentionally backgrounded xclip owner, keeping `subprocess.run` open. Fix uses root pixel coordinates for click/gesture and noncapturing xclip consistent with previous I47 desktop QA. Also fixes a tautological source-hash comparison at PDF export. New exact-head run and manual visual acceptance remain NOT_RUN until CI completes.

## Second I61 run — real source input proved, File path click recalibrated

Exact QA HEAD `5a46488d6d201d91cc1879ae71f74580fed932bd` [run 41425938749](https://github.com/i-shutov/tikzarium/actions/runs/41425938749), original artifact **13131254633** independently downloaded and screenshots inspected. The previous client/root mismatch and xclip timeout are resolved: the **real Studio File menu opens** (screenshot `02-file-menu.png` differs from startup; field is visibly at x307..575 y83..103), and original user TeX with Russian `Не менять` and opaque `\\UserLabel` is **visibly pasted into the live editable source pane** (`04-source-pasted.png`). However `03-path-in-file-menu.png` equals the closed startup image: click at y101 hit the input's lower border and dismissed the menu; with no valid path, real Studio Save refused to create a file. This is a QA coordinate error, not proof of a product Save defect. No native tools/PDF touched, report correctly FAIL and NOT_RUN. Correct input click to center (420,93) on the next QA HEAD, add strict all-font per-row embedding predicate to the later PDF stage. Execution/artifact review for corrected HEAD NOT_RUN at commit.

## Third actual-X11 artifact review — custom File-path edit remains unresolved

Exact head `5f4c6c59e6dec776551aea32a32360fd5f8ddb97`, [run 41426644654](https://github.com/i-shutov/tikzarium/actions/runs/41426644654), original artifact **13132690797** downloaded. Real menu and manually pasted Unicode/opaque source are visually present, but candidate popup path click still dismissed the menu before input; GUI Save did not write a file. This is NOT a demonstrated product Save defect. Further coordinate nudges would obscure the main native-authoring vertical.

Revised independent driver starts the actual egui process with **isolated cwd=out**, relies on actual GUI File-menu default `figure.tex` shown in screenshot, pastes original .tex via X11 and uses actual toolbar Save to create the file. Then six grouped-icon TikZ gestures and external XeLaTeX PDF can be evaluated without fabricating input/output or touching product code. Custom-path menu editing explicitly stays NOT_RUN. Duplicate pull_request action trigger removed to avoid exact-commit run cancellation by the subsequent push event; QA branch push only. New exact-head CI NOT_RUN at commit.


### Integration re-lease to frozen B42 (2026-11-02 UTC)

Production HEAD #91 is `91e2d8201cd0c016e00d52618e4024fedb66424e`, app/src tree `64df229392c03a99ca29238bcc2e5f422c4d7409`; independent I61 QA remains a stacked PR targeting the B branch. Latest B42 bootstrap [41445054318](https://github.com/i-shutov/tikzarium/actions/runs/41445054318) reports two PNG hashes `4367ce5d798befaf2a3a157089db23df4cc5540b2d83814d94bacb15bb9f5766` and `df7cdc32f345f4988bad8de5029ababd396fb5f720f80d464945cb90f06ee1df`, identical to already manually reviewed B42 layout. Thus button coordinates are **candidate only**, not a gesture PASS. New font parser checks ALL `pdffonts` embedding flags from the right with four positive/negative offline tests, not an exit-code proxy.

I61 still requires actual original GUI saved-source, six pointer gestures, help, XeLaTeX PDF and independent artifact SHA/manual review. Older I51/I57 B41-tree FAILs occur before GUI and are stale gates; no smoke or synthetic event-frame is a substitute. Physical Win10 MiKTeX/Mac ARM remain NOT_RUN.


## CI ownership migration — 2026-11-02

B42 is frozen at `91e2d8201cd0c016e00d52618e4024fedb66424e`, app/src tree `64df229392c03a99ca29238bcc2e5f422c4d7409`. Current independent real-X11 six-tool → GUI saved native-source → external XeLaTeX PDF evidence: [I61 run 41449047973](https://github.com/i-shutov/tikzarium/actions/runs/41449047973), original artifact 13143756910, 40/40 SHA-256 rechecked. I61 now provides B42 six-tool regression on PR/main and push/main; if a future app/src tree changes, the exact source-tree and coordinate lease must be re-reviewed rather than silently passing stale pointer positions.

Four historical B41 fixed-tree GUI workflows (`n1-desktop-smoke` I51, `i46-b34-dirty-open` I51, `i53-b38-live-libraries` I53, and `i57-n2-four-live` I57) no longer run automatically against `main`. They retain explicit workflow_dispatch and their historical branch triggers, including the original B41 tree check: **actual tests were not removed**. Their B42 red runs failed on hardcoded tree `d290bdad...` **before any GUI**, not on a real B42 interaction. I61 does **not** substitute for their Open/Undo/library assertions.

**Still blocked, NOT_RUN at B42 real GUI level:** two-file Open/dirty Save-and-open with CRLF and opaque macro, source/native and visual Undo after manual changes, inspector pinned Apply, deterministic Help/F1 (I61 frames 20/21 ambiguous), connected libraries; physical Win10/MiKTeX and Mac ARM XeLaTeX. These are required release gates, not waived by a green six-gesture smoke. Merge #92 into frozen #91, then #91 into main only after full independent B42 evidence and exact-head CI with reviewed original artifacts; run separate post-merge CI.


## I62 correction: exact-head CI cancellation and real GUI I/O acceptance expansion

The new QA head f3aa1ea7 run 41458975300 job 125322826120 completed with GitHub `cancelled` during apt package downloads, not a Rust/TeX/product test FAIL. GitHub log: 76 packages/129MB via azure.archive.ubuntu.com, texlive-base 21.7MB from 14:18 to 14:36 UTC and texlive-pictures 16.7MB from 14:40 until cancellation at 14:53 UTC. Exact app-tree check and offline font-parser tests passed, but app compilation, real gestures and PDF were SKIPPED. The previously accepted cc339308 I61 run remains valid for its exact head only. New apt URL preference and HTTP inactivity/retry settings aim to avoid repeated 45-minute waste.

New QA-only probes target true Linux/X11 F1 two-state tab, native source undo, session visual Undo, two-file CRLF Open/Edit/Save/Reopen and dirty Open cancellation. All are NOT_RUN pending exact-head CI and original evidence review; any QA focus/coordinate miss must be investigated, not promoted to product FAIL or synthetic PASS. No B production/registry changes. Inspector Apply, dirty Save-and-open and physical targets stay NOT_RUN.


## I63 evidence boundary / integration lease — B42 File TextEdit popup repair, 2026-11-02

Independent integrator re-leased I61 on frozen B42 #91 `09a4df5baf0f7446bb02c68fbb126821d2a0ff9f`, verified `crates/tikzarium-app/src` Git tree `72499c6e31d4cf6a2a36d16fb7bc8b10a9d66acb` by GitHub Git tree API. Old B head `91e2d820…` and app tree `64df229392c03a99ca29238bcc2e5f422c4d7409` are historical; the QA workflow now pins the new tree and rejects any further B production drift. B only changed its File popup behavior (egui 0.33.3 CloseOnClickOutside) plus B plans/insights, preserving the C generator and all six tools. Exact B head hosted Rust CI, multi-OS D QA, generated-source XeLaTeX, hosted MiKTeX, font audits all passed; B test is `UNIT_EVENT`, not a successful real two-file X11 Open.

One stacked integration commit combines B's three-file change with the existing #92 QA-only workflow re-lease, this plan/insights and CHANGELOG. Do not rerun old B41 hard-coded SHA guards and do not create new QA micro-PRs. New D exact-head real Linux/X11 must prove File TextEdit focus→input→real Open of independent CRLF/opaque second file, edit/save/reopen, dirty Cancel and preserve six native gestures, F1/Undo, Unicode embedded-font XeLaTeX PDF. Inspector pinned Apply remains a separate explicit real GUI release gate unless this execution proves it. Manual source/PDF/screenshot/hash audit mandatory before either merge. Physical Win10/MiKTeX, M1/M4 XeLaTeX NOT_RUN.


## I63 QA double-lease correction — 2026-11-02

The integrator caught an additional historical B app-tree SHA hardcoded in the Python real-X11 driver (not only the workflow), which would reject the correct B42 executable before GUI. Both now bind exact `72499c6e31d4cf6a2a36d16fb7bc8b10a9d66acb`; lightweight CI preflight asserts equality BEFORE installing TeX Live. Added screenshots immediately after File TextEdit pointer focus and Ctrl+A to distinguish focus from clipboard paste if two-file Open fails. Same stacked QA #92 only, no B edits/new PR. Prior first I63 head is superseded on this exact issue; any CI failure from that old head is stale QA rather than demonstrated product regression. Complete Open/Undo/Apply and physical Win10/M1/M4 remain unaccepted until evidence.


## I64 exact B42 pinned Inspector Apply complete-vertical gate

I63 [real Linux/X11 41505873672](https://github.com/i-shutov/tikzarium/actions/runs/41505873672) completed SUCCESS on exact D QA HEAD `74b67c1b77a7071b2ea4ca6eae4e321e6a28f5d2` and frozen B app/source tree `72499c6e31d4cf6a2a36d16fb7bc8b10a9d66acb`: GUI File path TextEdit stayed open, loaded independent CRLF/opaque second .tex, GUI edit/save/reload, dirty Open cancellation, six native gestures, F1/Undo and external XeLaTeX PDF. Independent original artifact 13170508997 verified 64/64 SHA-256, full File/Open/dirty modal/F1 PNGs and PDF glyphs/font embedding visually reviewed. This is a concrete accepted hosted Linux/X11 subvertical, not physical Win10/M1/M4.

To finish the remaining N1 gap on the same frozen B production tree, existing I61 script now drives actual selected Node #6 `x` TextEdit with a different `10.50cm` value, asserts draft-only Save leaves source bytes unchanged, real pinned `Применить параметры` writes exactly one C-owned Node command/metadata source line, and real inspector visual Undo restores the saved file byte-exactly. New original screenshots and SHA ledger required, no direct Rust Session fixture or `UNIT_EVENT` accepted as replacement. New exact-head CI and independent artefact manual review are PENDING. No B production edits or additional PR/workflows; physical Win10/MiKTeX and Mac ARM XeLaTeX still NOT_RUN.
