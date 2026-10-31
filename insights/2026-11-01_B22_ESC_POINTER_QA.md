# B22 QA — pointer cancellation, no ghost TeX insertion

2026-11-01 · i-shutov/tikzarium B · continuing draft PR #62.

The pre-fix production handler called `response.clicked()` after a conditional Esc check requiring `session.drag_start.is_some()`. egui short clicks have no drag start, creating an observable escape/click release race. B22 now captures Esc across the entire pointer-down lifecycle and stops both click and drag-stop source insertion. Alt-selection cancellation remains non-authoring. A normal following gesture must still work.

The new `UNIT_EVENT` tests run the real guide handler at two widths, all six C-backed tools, three Esc timings each, then real insertion/Undo. A second test covers Esc with an Alt-selected existing marker. Existing B16–B21 F1, selection, source focus, Save/Reopen and manual-edit tests remain part of the suite. No assumption of TeX/PDF coordinate correspondence.

At authoring time **exact-HEAD CI is NOT_YET_RUN**. The intended evidence is Rust CI (Windows Server/macOS/Linux), D QA (Rust/Clippy/XeLaTeX), N1 external XeLaTeX, isolated MiKTeX Windows Server, and glyph/font QA. Record observed run IDs and results only after they are actually available. Physical Windows 10 x64 with independent MiKTeX and Mac M1/M4 GUI/screenshot/IME/Retina/native-dialog smoke remain NOT_RUN. Independent Linux/X11 six-gesture+Build/Export (#48) is a separate release gate.
