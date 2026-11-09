# W2b 2026-11-09 — Active RDP, but owned foreground is not yet granted

## Exact-main physical evidence (not inferred from workflow success)

- Main: `46fa3aa012514ec7eb886be88744ec61234304d1`.
- Read-only WTS [#42581762561](https://github.com/i-shutov/tikzarium/actions/runs/42581762561), original JSON artifact `13656449896`: Session 2 `WTS_CONNECT_STATE=0`, candidate only.
- Personal Windows Server W2 [#42587137874](https://github.com/i-shutov/tikzarium/actions/runs/42587137874), **early original artifact `13659836688`**, independently unpacked:
  - `w2-session-readiness.json`: Active=0, Session2, Default desktop pending runtime checks.
  - `windows-server-w2-interactive.json`: `BLOCKED_FOREGROUND_NOT_OWNED` at 2026-11-09 08:37:46Z.
  - GUI `PID=9544`, own visible `HWND=5243436`, `WinSta0/Default`, `input_desktop=Default`, 2560×1080 screen, 1196×719 window, DPI=96.
  - All 20 `SetForegroundWindow` requests returned false, WM_NULL round trips processed, `GetForegroundWindow()=0` throughout. No client capture, F1, input, six gestures, Save/Open, IME, DPI200 or GUI→MiKTeX PDF. W2b NOT_RUN.
  - Original preflight and Mesa escrow passed; this is **not** the prior disconnected-session or GL transport blocker.
- Personal Server W1 Rust/MiKTeX rebuild was still in progress when this checkpoint was recorded; never infer its result here.

## Minimal owned-activation experiment, scoped to QA harness

The existing harness already declares `BringWindowToTop`, but `Request-W2OwnedForeground` only called `SetForegroundWindow`. The candidate adds **one** extra Win32 `BringWindowToTop` call for the *same owned* HWND only after the first failed handshake, with current PID, session, visible window, input desktop and WTS validations before and after. Each attempt still passes a bounded WM_NULL barrier, and **only a stable exact foreground HWND match** qualifies as confirmation.

No `AttachThreadInput`, keyboard/mouse injection, foreign HWND activation, session unlock, UAC/account/driver/registry changes, desktop read or silent focus promotion to success. A false API return and an API success without the actual foreground both remain blocked. The fallback is diagnostic, not proof that Windows will grant activation. Historical W2a at `ef95c1c9` is unchanged.

## Acceptance and next decisions

1. Exact-PR-head Windows PowerShell 5.1 native selftest (13 test scenarios, including unsafe-state rejection) and independent static QA; Linux/macOS/Windows standard CI.
2. Review source and check exact-main lease; **do not deploy PR code to the personal runner**. Never mutate existing running trusted-main run.
3. Only after accepted merge and a successful exact-main hosted CI may the already-authorized personal self-hosted workflow test the new foreground route, collecting an original early artifact.
4. If still `GetForegroundWindow=0`, preserve `BLOCKED` and investigate the Windows foreground eligibility/interactive launch design; do not fake user input, capture another desktop or label W2a/W2b PASS.
5. When a stable owned HWND is genuinely foreground, capture F1 and inspect original PNG; validate physical W2b stage1 `figure.tex` / native Save As, then full six gestures, SourcePatch/Undo, Save/Open, IME, DPI100/125/200 and GUI-origin external XeLaTeX PDF. Physical Windows 10 W3 and stable W4 remain independently NO-GO until their real acceptance.

Scientific-142 R4 corpus in `roadmap/Tikzarium_Scientific_142_R4` is a **separate post-freeze development track**; do not use its L0/L1 proof to accelerate W2/W3 or claim L2/L3.
