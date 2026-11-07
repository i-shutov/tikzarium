# Independent evidence design: Windows Server GUI is not headless JSONL

Prior W0 native release/portable CLI and W1 actual personal Server CLI→external XeLaTeX→PDF do **not** prove a usable server egui desktop. PR113's virtual JSONL production-Session QA also does not create real Windows dialogs, IME focus or 200%-DPI desktop behavior.

## New observable physical boundary

A PowerShell 5.1 harness runs the actual freshly built native GUI PE2 from the exact approved main source. It independently records verified SHA, existing admin token/session, WTS session connection state and unlocked input desktop, current window station/thread desktop, actual process/window PID/title, visibility, on-screen rectangle, DPI, and original window PNG SHA. It captures only while its own PID's window is foreground, tries one real F1 press, and captures again if focus is retained. It then terminates only its own app process. It does not invoke XeLaTeX, modify accounts, install anything or create a new user.

The hosted PS5.1 selftest rejects Session0, service window stations, Winlogon desktops and unknown tokens; a separate uploaded-original audit rejects forged Windows10/W2 PASS, wrong source, wrong window PID, tampered screenshots and unexplained \`BLOCKED_*\` states. All tests are QA logic, **not** physical GUI PASS. Potential outcome \`PARTIAL_W2_REAL_VISIBLE_WINDOW_EVIDENCE_NOT_FULL_ACCEPTANCE\` requires independent visual inspection of the actual screenshot before even considering a true rendered-window claim.

The prior personal runner's Session 2 alone never established an actual desktop. Report concrete \`BLOCKED_SESSION0\`, \`BLOCKED_NONINTERACTIVE_WINDOW_STATION\`, \`BLOCKED_NONINPUT_DESKTOP\`, \`BLOCKED_NO_VISIBLE_OWNED_WINDOW\`, \`BLOCKED_WINDOW_OFF_SCREEN\` or \`BLOCKED_FOREGROUND_NOT_OWNED\` rather than a generic GUI/Windows defect. Do not 'fix' those by installing another Rust/MiKTeX or creating another Windows account.

Next qualification: actual native six TikZ mouse gestures, ordinary editable .tex/Properties/Libraries/RU F1, minimal source patches and Undo/Save/Open, real Windows Save/Open dialogs, IME, DPI100/200 and GUI-created MiKTeX Unicode PDF. These cannot be automatically assumed from one screenshot. Physical Windows10 and installer/stable remain distinct blocked release gates.