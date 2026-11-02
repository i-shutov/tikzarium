# I58 — B40 source-history real X11 integration acceptance

Date: 2026-11-02. Repository: i-shutov/tikzarium only.

Source under test: PR #85 B40 exact head `45c3117aa4dc7edf307fd92cd78f3adb04d27202`, app/src tree `eefe044db4ea5dba41a02411ac4686aa557c31e1`; accepted main `3a1e18d39cd3c9e30a39b8bd7ce0891701cfadea`. This branch is **independent QA only**; no B-owned production source or any unrelated repo changes.

## User-visible end-to-end gate

Run the real egui executable under Linux/X11 using pinned I46 dirty Open, I47 six native primitive gestures / Undo, I53 positioning library Connect/Disconnect/Undo/Open, and I57 all four libraries + Russian C help + external XeLaTeX PDF. Re-pin each previously accepted **B39** app-source tree predicate to the exact **B40** tree; retain fail-closed checks and prior coordinate profiles as candidates, expressly NOT accepted calibration.

I47 additionally tests a specific B40 hazard: user source pasted through native egui TextEdit, a real GUI line gesture changes the document revision, then the editor is refocused and X11 Ctrl+Z is sent. GUI Save must preserve **byte-for-byte** the just-authored line, Unicode macros and unrelated source. This assertion runs before the existing held-pointer visual Undo and before completing all six TikZ tools. I46 independently tests Ctrl+Z after a genuine GUI Open of a different document.

## Proof and release gate

A green unit or CI alone is insufficient. Download every screenshot/source/PDF/report; audit their declared SHA-256; manually review source editor / inspector / generated command / PDF vs XeLaTeX, and verify the expected B40 Ctrl+Z screenshot. Before this review all desktop results are `NOT_ACCEPTED`. Existing screenshot coordinates were not silently declared calibrated.

This QA PR targets the **B40 branch**, not `main`. B40 PR #85 remains draft until its exact new HEAD runs, independent QA evidence and manual review pass. After merge to main, rerun separate post-merge CI. Physical Windows 10 x64 external MiKTeX and Mac ARM M1/M4 external XeLaTeX remain **NOT_RUN**.
