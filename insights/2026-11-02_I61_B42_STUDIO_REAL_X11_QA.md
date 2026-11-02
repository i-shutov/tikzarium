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
