# Windows W2b — real physical input and source authority, stage 1

## Evidence progression

W2a PASS at trusted main ef95c1c9, original personal Server #42460198175: real own RDP HWND, physical 1475×850 at 125%, Russian F1 and independent original screenshot audit. It **does not** constitute the six-input/PDF vertical.

This W2b stage adds a **real Windows OS input** candidate in the same verified PID-owned RDP foreground window, with no desktop pixel capture, no foreign HWND input, no registry/UAC/account/system MiKTeX or driver modification. Both source and screenshots must come from the running application, never a fake test-generated output. It runs after W2a captured two original F1 PNGs and before the app process is terminated. Failures of W2b are reported separately and cannot be promoted to W2a or full W2b PASS.

Physical 125% screenshot was independently reviewed for coordinate selection; input mapping is explicitly **leased to client 1450..1510 × 825..880 at DPI120** and must reject other geometry or focus loss. OS mouse down/move/up has actual pointer frames. The real toolbar Save must create figure.tex in the app's new, isolated working directory. We require exactly one C-owned TikZ source marker, a real \draw, and unchanged original preamble, and save original before/after PNGs and source bytes. First line passing is **stage1 only**.

## Implementation and CI gates

- scripts/tools/qa_windows_w2b_stage1.ps1: six negative/positive layout-guard selftests in Windows PowerShell5.1; owned PID/foreground/session/Default desktop checks before every OS pointer step and exact per-thread PMv2 DPI restoration.
- Existing W2a real personal GUI harness gains -ProbeRealW2bStage1. Early artifact uploads w2-interactive/w2b-stage1/ JSON, screenshots and saved TeX. Run only reviewed trusted main after hosted exact-head CI; any error stays BLOCKED_STAGE1, not W2b PASS.
- Exact PR-head hosted Windows/macOS/Linux CI and PowerShell native selftests, no need to execute untrusted PR binary on persistent owner Server.
- Independent audit must require exact source SHA, original native GUI PID/HWND, plausible PNG geometry and restored DPI context, original source physical bytes with exactly one native C-owned line, and manual palette screenshot review. Never treat a green workflow or unreviewed PNG as physical PASS.

## Remaining work after stage1

1. Validate actual original stage1 palette screenshot and saved source (the popup selection coordinates are **provisional**, not established yet).
2. Expand the reviewed coordinates to all six native pointer tools, preserving comments, macros and CRLF.
3. Add real Inspector Apply/Undo, TextEdit Ctrl+Z, source Save/Open/dirty-close and file pickers, IME, DPI100/125/200.
4. Trigger XeLaTeX using the **GUI Build button** on trusted source; capture PDF through GUI Export and independently verify actual PDF, logs, page count, Cyrillic and fonts.
5. Only after entire physical W2b and separate real Win10 W3 can clean-install W4 and stable v1.0.0 be considered.

No claim of full W2b at this candidate stage.