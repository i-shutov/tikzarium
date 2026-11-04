# N5 Windows Server automated QA — first Windows-first release lane

Decision: 2026-11-04, owner-directed. Main delivery is native Windows x64, externally user-installed MiKTeX, editable .tex beside native egui figure and shared offline Russian C help. Do **not** claim physical Windows 10 certification from Windows Server 2025. macOS ARM/Linux physical qualification and release packaging are deferred; cross-platform source/hosted regression must remain healthy. N4 domain packs are off the first-release critical path.

## Dedicated runner / separation

- Repository: private `i-shutov/tikzarium`; self-hosted runner `tikzarium-winserver` with labels `self-hosted, Windows, X64, tikzarium-winserver`.
- Machine: user's VDSina Windows Server 2025. The FlowBridge runner and its workspaces must never be reconfigured or shared with this runner.
- Registered/started by owner in an interactive Windows session. The screenshot shows Online/Idle at registration time only; session locking/RDP disconnect, real GUI input and on-host capabilities are **NOT_RUN**.
- Never execute untrusted `pull_request`, `pull_request_target`, or arbitrary fork code on this persistent host. The workflow uses trusted `main` only.

## Trigger / SHA / concurrency

- Automatic: `push` to `main` only on application/Cargo/fixture/QA-script/workflow changes. No scheduled polling or CI-only micro-PR flood.
- Manual: `workflow_dispatch` on `main` requiring the reviewed 40-character SHA. The worktree SHA must match both that input and the event SHA.
- Both paths: verify `git rev-parse HEAD == EXPECTED_SHA == github.sha` before running the MiKTeX script. Checkout action SHA is pinned and `persist-credentials: false`.
- `concurrency` serializes jobs; `cancel-in-progress: false` protects running evidence.
- Permissions `contents: read` only. No automatic package installs, no shell escape, no compiler fallback.

## Current proof vs future desktop proof

`.github/workflows/qa-selfhosted-winserver.yml` invokes `scripts/tools/qa_windows_server_user.ps1 -CheckRust`. It checks real external MiKTeX XeLaTeX with `--disable-installer`, unchanged package inventory, XeLaTeX PDF, all font records embedded, extracted Cyrillic text, raster if available, and locked Rust tests. Reports/artifacts are uploaded on failures too. A missing font-audit/text tool or Cargo, or any negative result, must not be advertised as PASS. Exact workflow run ID and original `windows-server-qa.json`, PDF/PNG/.tex/log/SHA are the proof; registration screenshots are connectivity only.

A **separate next vertical** is actual visible GUI egui on this Windows Server session: six pointer gestures, continuously editable CRLF/opaque .tex, parameter F1 and inspector, Connect/Disconnect, Undo/Save/Open/native dialogs/IME/DPI, externally compiled XeLaTeX PDF/fonts. This must capture original Windows Server screenshots/logs, enforce source/CRLF preservation, and report `WINDOWS_SERVER_GUI_PASS` only when observed. Service/Session 0, headless cargo and hosted Windows runners cannot satisfy GUI acceptance. Physical Windows 10 remains `NOT_RUN` until separately observed.

Known QA honesty blocker: hosted MiKTeX workflow 41618563210 showed Python 1/16 FAIL behind green PowerShell job; do not treat any such workflow as a complete QA PASS until its exit handling is fixed and observed.
