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
