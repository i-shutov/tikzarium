# D06 — independent QA, exact SHA and MiKTeX provenance

Date 2026-10-31. Starting main c5c8c1576b6288e1d125d558d0d4872b321efb86; checked main again before work, branched from 08c376523e133ad1fa7994203a6442955740c64a after merged B05 #25. Read AGENTS.md, plans, insights, CI/target-host documents and open PRs (#27/#28/#31/#32/#33/#34/#36/#37). Changes exclusively D-owned paths.

## Verified previous D05 — NOT evidence for D06

D05 #31 exact head e6a3e3db93c97667be8b8dffdec0625bd2760a1f had Rust CI https://github.com/i-shutov/tikzarium/actions/runs/41185834712 3/3, D QA https://github.com/i-shutov/tikzarium/actions/runs/41185834802 7/7, and F01 https://github.com/i-shutov/tikzarium/actions/runs/41185834709 1/1. Actually downloaded and reviewed crosshost artifact 13036784027; its accepted=true verifies six fixtures, five extension cases, PDF text/font checks on Linux, Windows Server and hosted macOS ARM. Also downloaded actual host QA ZIPs: Linux 13036627532, Windows Server 13036878252, macOS ARM 13037095015; checked reports and five extension observation artifacts per host. Windows XeLaTeX executable was C:\Users\runneradmin/texlive/bin/windows\xelatex.EXE, therefore **TeX Live**, not MiKTeX. Cannot transfer these PASS results to MiKTeX or physical Win10/M1/M4.

## D06 executed local results — NOT MiKTeX

D06 stdlib negative tests: 5/5 PASS. Local engine XeTeX 3.141592653-2.6-0.999996, TeX Live 2025/dev/Debian, compiled the authored native-primitive source into real one-page PDF. Poppler pdftotext extracted Cyrillic and Greek; pdffonts recorded embedded DejaVuSerif and LatinModernMath; no Missing character warnings. Source SHA-256 bca344c361a0e62f0191a0d62ad20c5bf1145c40e83177f3c14c0c3841314e67.

**Separate D06 hosted Windows MiKTeX test is NOT_RUN/PENDING until new exact SHA CI plus artifacts are reviewed.** Installer is private and SHA-pinned, automatic package installation explicitly disabled and verified. TeX is independently installed on user Windows 10, never shipped or installed by TikZarium.

Physical Win10, native Mac M1/M4 GUI screenshots, mouse authoring six primitives, permanent code pane and shared help, Save/Reopen/Undo, GUI theme source/PDF invariance remain NOT_RUN. Hand-written fixture does not prove mouse authoring. R4 corpus source-only and no unverified licenses/assets imported; O027/O028/O030/O047 open.

## D06 first live failure and repair (2026-10-31)

Fresh main 0aa78ae22df0ae84705ba461f017fce256325875, open PR #37/#38/#39/#40 reviewed; AGENTS, plans and insights reread. Actual hosted MiKTeX run https://github.com/i-shutov/tikzarium/actions/runs/41187294741 SHA 4fbe401e4dfdbf9531b620ffa2effd5ad285e60e FAIL, job 124496695332: setup installed MiKTeX 25.12 in runner temp; `initexmf --set-config-value=[MPM]AutoInstall=0` exited 0. The subsequent readback emitted standalone numeric `0` plus MiKTeX 25.12 INFO and elevation-warning lines; setup compared the **entire** output string to `0`, thus falsely rejected a successful readback. No package provisioning/PDF/glyph proof executed and the uploaded artifact path did not exist, so **MiKTeX end-to-end remains NOT_RUN**. F01 and basic Rust CI passed at that original SHA; do not transfer those verdicts to MiKTeX.

Repair is in D-only PowerShell helper plus live parser tests, persisted preflight stage record and this plan/insight update. Exact-head CI for revised D06 must prove actual MiKTeX provisioning, compiler identity/flags, PDF and negative TeX behavior. Physical Win10/M1/M4 and GUI mouse Save/Reopen/Undo remain NOT_RUN. Source: exact job logs fetched via GitHub API, not inferred from a green summary.

## D06.2 observed MiKTeX package metadata drift (2026-10-31)

Full logs from GitHub Actions [41188398041](https://github.com/i-shutov/tikzarium/actions/runs/41188398041), job 124499916389, show Windows Server build 20348, real private MiKTeX 25.12, verified isolated AutoInstall readback 0, then `The requested package is unknown` with `name="miktex-xetex-bin-x64-2.9"`. The official package exists (XeTeX x64 executable, packaged 2026-05-14): https://miktex.org/packages/miktex-xetex-bin-x64-2.9 . The initial 25.12 index was inadequate for that 2026 package; use the documented `update-package-database` subcommand, but don't claim resolution without the new live run. New D setup records refresh and metadata failures in archived artifacts; the user-installed MiKTeX is untouched. Engine run, Unicode, fonts, PDF and source/GUI scenarios remain NOT_RUN in MiKTeX.

## D06.3 — package repair succeeded, but package writes escaped CI temp

At [41189694149](https://github.com/i-shutov/tikzarium/actions/runs/41189694149) the stale-package problem from D06.2 is **resolved experimentally**: refreshed MiKTeX 25.12 metadata recognized all 9 packages; the `miktex-xetex-bin-x64-2.9` binary package was actually downloaded/extracted. New failure is `miktex fontmaps configure` exit 1 during explicit provisioning. More importantly, setup's private `--user-*` paths did not carry through to package operations: printed user package root was `C:\Users\runneradmin\AppData\Roaming\MiKTeX\2.9`, not runner temp. Treat as isolation breach in the CI process (ephemeral runner), and reject before further mutation. `initexmf --report` exposes user TEXMF roots; new preflight and postflight checks enforce exact root ownership. Do not interpret environment variable presence as verification: the effective root report at the next exact SHA decides. The application itself does not install packages. MiKTeX PDF/Unicode/glyph and negatives still NOT_RUN; physical target hosts NOT_RUN.
