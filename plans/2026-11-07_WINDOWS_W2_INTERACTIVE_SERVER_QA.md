# Windows W2 — actual interactive personal Server GUI evidence (2026-11-07)

Owner scope remains Windows-first x64, features frozen. W0 and W1 product CLI XeLaTeX PDF on personal Windows Server 2025 are accepted from independently checked original-byte evidence; **W2 interactive GUI and physical Windows 10 W3 remain NOT_RUN** until verified. This plan adds a cautious first *physical desktop probe*, not a substitution for six gestures and complete end-to-end UI acceptance.

## Trusted machine and execution boundary

- The persistent Windows Server executes **only exact-current-main** after successful hosted push \`TikZarium CI\`; never PR/fork code. Existing \`qa-selfhosted-winserver.yml\` enforces exact SHA, source CI run, branch and serial-run gates. Never touch FlowBridge, other runners or Windows UAC/registry/accounts/global PATH.
- Use the original freshly built GUI PE2 from \`qa_windows_server_rust.ps1\`; match SHA with \`windows-server-rust.json\`. Do not install software, packages, fonts or run TeX in this probe.
- Require an actual user session, WinSta0/Default, actual owned app PID, visible titled window, geometry, DPI and screen bounds. Session0, service desktop, locked/disconnected or foreign foreground desktop, wrong PID or off-screen geometry fail with \`BLOCKED_*\` evidence.
- Launch **only** the already-qualified current-main app into a temporary directory. Capture only after confirming foreground ownership, send actual F1 when focus remains, retain original cropped window PNG and SHA. Terminate only the launched PID. Restore prior foreground when available. A screenshot is not a manual help-quality review.
- Keep W2 independent from W1 product-PDF success: a blocked desktop cannot rewrite previously accepted W1 evidence. Independent step failure remains visible and original JSON/logs uploaded; \`continue-on-error\` merely preserves aggregate W1 workflow.
- A disposable Linux audit independently recomputes uploaded PNG/SHA, geometry, source lease and rejects claims of full W2 or physical Win10 PASS. Hosted Win32 preflight and negative tests are synthetic logic-only evidence.

## Next W2 and W3 acceptance

\`PARTIAL_W2_REAL_VISIBLE_WINDOW_EVIDENCE_NOT_FULL_ACCEPTANCE\` proves at most a real visible native Server window owned by the correct exact-main process with a cropped screenshot. It does **not** prove the six gestures, editor/inspector/Libraries/RU F1 correctness, SourcePatch/Undo/Save/Open, CRLF/opaque macros, native dialogs, IME, DPI200 or GUI XeLaTeX PDF. Those require separate original interactive desktop event, source, PNG, PDF/font/Unicode and logs. Physical Windows10 x64 W3 repeats a distinct full GUI qualification. Stable/installer W4 remains BLOCKED.

Current owner correction allows current-user elevated Administrator XeLaTeX with visible trusted-document warning, no shell escape/auto packages, no token/UAC modification. This *non-TeX* GUI probe does not alter that contract.