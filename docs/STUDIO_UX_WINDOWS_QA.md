# B42 — Studio UX and user's Windows Server QA

**LATEST RELEASE STATUS (2026-11-07):** Windows 1.0 first. Current main 4b79d71a has W0 hosted native/ZIP PASS, W1 personal Server current-user MiKTeX PDF PASS, W2 actual RDP visible native HWND @125% but foreground/F1/PNG BLOCKED, physical Windows10 W3 NOT_RUN, installer/stable W4 BLOCKED. Existing HIGH Administrator is supported with visible trusted-document warning; old non-admin/HIGH restrictions below are historical, not release gates. [Canonical W0–W4](WINDOWS_1_0_RELEASE_CONTROL_RU.md) · [79 problems/solutions](TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md).


## Owner feedback: icon groups, not walls of text buttons

TikZarium is **not** Photoshop/Corel and does not implement PGF's renderer.
The user rejected its current dense egui toolbar and supplied prior UI design
mockups. This B42 implementation responds with:

- Four **vector icon GROUPS** in a permanent 62pt left rail, one floating
  palette at a time. Geometry contains line/rectangle/circle/Bezier;
  connections contains arrow; annotation contains node. Extensions show
  PGFPlots/CircuitikZ/tikz-cd as explicitly **not-yet-implemented** GUI
  adapters, without hiding source-only package capabilities.
- Commands remain native C-catalogue TikZ generation with exactly the same
  revision-checked Undo/SourceTarget and actual egui pointer handlers.
  Icons are UI-only strokes, NOT a second geometry engine.
- An unobstructed editable TeX pane beside drawing/PDF, concise vector icon
  Open/Save/Build/Export, grouped File/View, a right dock with separate
  Properties/Libraries/Help tabs, persistent Light/Dark/Midnight/Paper and
  hidden-by-default diagnostics. Figure fonts remain independent.
- Popover tooltips and F1 use the ONE Russian catalogue, not duplicated
  descriptions or invented TikZ defaults.
- The old interface is temporarily retained under View for comparison.

## User Windows Server 2025 with independently installed MiKTeX

GitHub-hosted Windows Server 2022 ≠ user's persistent Windows Server 2025;
neither equals physical Windows 10 x64. The user says MiKTeX is installed,
but we have **not verified interactive access to the server or any self-hosted
runner registered with TikZarium**.

Added `scripts/tools/qa_windows_server_user.ps1`: selects only external
MiKTeX, checks identity and `--disable-installer`, records read-only
package inventory before and after, compiles a **copy** of Cyrillic TeX,
compares source hash, archives real PDF, log, optional Poppler evidence and
optionally `cargo test --locked` with one build job. It installs/updates
nothing, never alters MiKTeX AutoInstall settings, and no engine fallback is
permitted. Its JSON distinguishes full font verification from PARTIAL.

Manual GitHub workflow `qa-selfhosted-winserver.yml` requires a separately
registered non-admin runner with exact label `tikzarium-winserver`. It is
`workflow_dispatch` **only on main**, and refuses a mismatched expected
SHA. No pull_request-triggered persistent runner. Do not share GitHub runner
registration tokens in chat or put secrets in the repo. Ensure the public
repository cannot run arbitrary untrusted code on the self-hosted runner.
Restrict machine permissions and avoid using an Administrator runner.

Recommended setup on the server, in PowerShell:

```powershell
Get-Service | Where-Object Name -Like 'actions.runner*'
Get-Command xelatex,miktex,cargo,pdffonts,pdfinfo -ErrorAction SilentlyContinue |
    Select-Object Name,Source
xelatex --disable-installer --version | Select-Object -First 2
```

If a runner is currently attached to a different GitHub repository, do
not overwrite it. Set up another dedicated runner under GitHub
TikZarium → Settings → Actions → Runners → New self-hosted runner, and label
it `tikzarium-winserver`. Then after an accepted main merge, manually launch
the new workflow with exact main SHA.

Running GitHub Actions as Windows *service* is Session 0 and **does not
constitute GUI acceptance**. A separate interactive RDP/VNC desktop must
test real window pointer/keyboard, Save/Reopen, F1, actual PDF viewport and
screen DPI. Mark this **NOT_RUN** until actual screenshots/logs exist.

## Acceptance checkpoints

1. Exact PR SHA: cargo fmt/test/clippy, hosted Linux/Windows/macOS CI.
2. New studio Linux/X11 desktop proof at 1366x768 and 850x560, screenshot
   review; all 6 native tools, group picker, C help, source, Undo, libraries,
   and externally produced PDF. Old coordinate-based B41 X11 runs do not
   automatically count, and must fail closed if the app tree changes.
3. Self-hosted Windows Server MiKTeX code/fixture PDF test, real artifact.
4. Separate physical Win10 x64 and macOS M1/M4 acceptance (NOT_RUN).
5. No announcement of release from a concept render or a hosted server pass.

Current status on authoring: B42 source written; exact-head CI NOT_RUN,
new real B42 GUI NOT_RUN, user Windows Server runner NOT_CONNECTED/NOT_RUN,
physical Windows 10 and Mac M1/M4 NOT_RUN.
