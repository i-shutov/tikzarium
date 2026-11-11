# User-run Codex junior workers for TikZarium Scientific Studio

This PowerShell 5.1 script is a launch mechanism, not proof of an active
session. It needs an existing clean TikZarium Git checkout and installed,
authenticated Codex CLI. It does not install tools or change OS/RDP/UAC,
MiKTeX, drivers, PATH or FlowBridge.

Two bounded batches, two independent agents each, model gpt-6.1-sol by
default (use an available model from your account; availability not assumed):
UX2 batch: real tool rail and independent I61/N2 QA.
SCI batch: PGFPlots source-scanner tests and bounded G3 memory research.
Each batch fetches exact base SHA, makes two local Git worktrees, runs two
Codex processes concurrently, saves logs/final message and leaves local
branches unpushed. No false hosted/physical acceptance.

On Win10 Pro in the existing user PowerShell, from a local repo checkout:

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\windows\Start-TikZarium-Codex-Workers.ps1 -RepoPath 'C:\src\tikzarium' -Batch UX2 -Model gpt-6.1-sol
~~~

Only after the first batch is finished, run Batch SCI the same way. A machine
with about 4 GB RAM should not run both batches simultaneously. Replace the
sample RepoPath with your actual path. If Codex CLI is missing the script
stops; no automatic installation. Paste the logs/commit SHAs back for
independent review and integration. This script itself has not been physically
executed on Win10 in this ChatGPT session.
