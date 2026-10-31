# I12 — B15 integrated source-first GUI; next acceptance gates

2026-10-31. Repository i-shutov/tikzarium. Main `8c77976ec6c5698904cdd15a2d45a310a34dca33`; merged #50 head `6a1f3f9c5d7ed060e53c072b6ee36bb115dd23d7`. This is an integrator checkpoint, not new source-generation code.

Integrated user vertical: editable ordinary TeX + PDF in Split; six C-catalogue native tools; C-owned project import status and visible source edits; F1/inspector Russian help; Alt-select owned markers; Esc cancel; invalidation of visual Undo after manual editor change. Figure fonts remain independent of Light/Dark/Midnight/Paper themes. Do not install TeX/packages automatically.

Release blockers:
1. Post-merge exact-main Rust/D QA/hosted-MiKTeX checks must all finish successful; no inherited branch-head green.
2. #48 real Linux/X11 process GUI: re-calibrate after B merge and establish six saved native gestures, help displayed and GUI Build/Export actual XeLaTeX PDF with source preservation. Current 5/6 is partial, full gate FAIL.
3. C #58 new library catalog: exact-head Rust/D QA/N1/hosted MiKTeX + artifact evidence. D #59 real MiKTeX compiler identity from actual CLI logs, not only version probe.
4. Real Windows 10 x64 + independently installed MiKTeX; physical macOS M1 and M4 with chosen external XeLaTeX: all NOT_RUN. Include file dialogs, fonts, CRLF/Unicode, IME, HiDPI and theme persistence.

No Photoshop/CAS/PDF reverse geometry; no physical release claim.
