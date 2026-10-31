# B05 native Poppler worker smoke — independent physical platforms

**NOT_RUN:** no attached Windows 10 x64 or physical macOS ARM64 GUI session. Fill this matrix separately per OS; do not use hosted Windows Server/macOS compile as proof of native GUI interaction.

Preflight: record exact B05 commit SHA; OS build and CPU; app build hash; XeLaTeX / `pdfinfo` / `pdftoppm` versions; display scale (Windows 1366×768, Mac Retina); source and PDF SHA-256. Test Light/Dark/Midnight/Paper at compact/comfortable: themes affect only egui, never the PDF/TikZ drawing.

| Case | Steps | Expected (not observed) |
| --- | --- | --- |
| P05-01 | Build `fixtures/two_pages.tex` via XeLaTeX; switch 1→2→1; take screenshots | Both pages distinct, exact preview, correct page count |
| P05-02 | Temporarily configure a fake `pdfinfo` executable that never exits; build PDF | After ~12s, navigation NOT_CHECKED, no false Page 1/1; app responsive |
| P05-03 | Temporarily configure a fake `pdftoppm` that never exits; request page 2 | After ~45s, previous page remains visible, error shown, new requests possible |
| P05-04 | Trigger a renderer that returns no PNG, corrupt PNG and PNG >64 MiB | Explicit errors; no replacement of last-good bitmap |
| P05-05 | Edit TeX after successful build; navigate old PDF; try Export | Old PDF marked STALE, export disabled, original files unchanged |
| P05-06 | Repeat 4 themes × 2 densities with font inspector and navigation visible | All controls reachable; PDF and TeX SHA-256 unchanged |

For each case capture: PASS / FAIL / NOT_RUN + concrete observation; timestamp; app SHA; physical host; screenshot filenames and hashes; source/PDF hashes; stderr excerpt (redacted). Windows commands require independent native verification of process termination and native file dialogs. Mock tools must never modify the system TeX installation or a real user's PATH permanently.

Known limitation: this guard caps **PNG disk-file size**, not decoded pixel dimensions. No guarantee of safe handling for small compressed PNGs with enormous image dimensions; record that as an unresolved QA gate.
