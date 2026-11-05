# N5 Linux portable candidate — independent QA notebook

Date: 2026-11-05. Priority Linux-first. Existing B43 baseline was merged as squash main SHA `26abc5461bba06d610394080ffe23bbbf92cc6bb` after PR head `7ac089aaa9f3bcdaa18d89ad600b132561cf0cb6` reached seven successful workflows; original PR artifact review is [in PR #100](https://github.com/i-shutov/tikzarium/pull/100#issuecomment-6643388036). The accepted main X11 evidence covers B43 but **not** this new native portable bundle.

## What is independently observed now

- A `linux-x86_64` target was introduced in the existing reproducible N5 offline packager without deleting Win/Mac paths.
- Package contents intended: executable release ELF64 app+CLI+portable launcher, UTF-8 CRLF test source, Russian usage, SHA ledger/provenance. No fonts/TeX shipped or installed.
- The new dedicated hosted job builds the actual *release* ELF, extracts tarball, runs hash checks, invokes the installed packaged CLI offline, and performs a real extracted-binary X11 boot/window screenshot. Synthetic Python tests remain only *contract* tests.
- Source provenance must use exact-head checkout. Windows 10/MiKTeX and Mac ARM tests must retain their older compatible binary paths.

## Evidence ledger (MUST replace after run)

| Gate | Current truthful status |
| --- | --- |
| Rust locked release build, ELF64 x86_64 | PENDING |
| Deterministic archive and all manifest hashes | PENDING |
| Real extracted release GUI on Ubuntu hosted X11 | PENDING |
| Original exact-head PNG / desktop geometry / log review | PENDING |
| Full I61 source-to-PDF at this PR HEAD | PENDING |
| PR-head Windows/macOS Rust compatibility | PENDING |
| Physical Linux desktop application/package launch | NOT_RUN |
| Physical Linux DPI >1, dialogs/Wayland/other distros | NOT_RUN |
| Win10/Mac physical GUI | NOT_RUN |

Do not infer any PASS before actual jobs/artifact review. A merely green archive test cannot pass physical release. Next update must record run ids, completed job conclusions, original PNG dimensions and pixels, extracted runtime stdout, SHA256 hashes, and any failures with exact step names.

## Original artifact independent audit and desktop-fit issue (2026-11-05)

- Four triggered workflows for exact head `f0a305b54d722cf4192c92b6d1a8efd223f20b0e`: N5 41930413745, D QA 41930413451, Rust CI 41930413503, fonts 41930413579 — all SUCCESS. I61 did not trigger for packaging-only paths: **not an exact-head PASS** for that version.
- Original GitHub artifact 13371821446: archive.sha256 PASS, native-evidence.sha256 PASS, extracted MANIFEST.sha256 7/7 PASS. Real release ELF64 x86_64 PIE executables, GUI original PNG 1366×768, native CLI verified by hosted job. 0-byte launch log is normal for successful quiet start.
- **Real UX defect discovered despite GREEN CI:** X=2,Y=40,WIDTH=1366,HEIGHT=768 on 1366×768 Xvfb. Client overflow of 40px clips the bottom status bar; initial .with_inner_size(1366,768) did not reserve titlebar/window-manager chrome.
- Corrected default client to 1180×680, added test and fail-closed N5 package X11 geometry assertions. Updated independent I61 source tree lease to permit new source while still demanding real N1/N2/N3 GUI/XeLaTeX acceptance. New HEAD tests and original screenshot review **PENDING**. Physical target Linux/HiDPI/dialogs/Wayland still NOT_RUN. README previously called PR source commit “main”; corrected to source commit SHA.

## Independent exact-head N5/GUI/QA audit — 2026-11-05

- Downloaded original N5 artifact [13374334141](https://github.com/i-shutov/tikzarium/actions/runs/41937982111/artifacts/13374334141), original I61 failed evidence [13374538630](https://github.com/i-shutov/tikzarium/actions/runs/41937982066/artifacts/13374538630), and B42 [13375228528](https://github.com/i-shutov/tikzarium/actions/runs/41937982088/artifacts/13375228528).
- Exact PR HEAD `3708d02d`: N5 packaged-release X11, native CI, B42, N1, fonts and D06 workflows SUCCESS. N5 actual `window-geometry.txt` has X=94,Y=71,WIDTH=1180,HEIGHT=680 on 1366×768. Opened original PNG: bottom status bar is entirely on-screen, source/canvas/inspector legible. This is a hosted extracted release app, not physical Linux acceptance.
- **I61 FAIL** at first gesture: original `01-line-group-popup.png` shows left popup x≈500, Line center≈532, Rectangle≈585, Circle≈639, Cubic≈693. The outdated x=599 coordinate selected Rectangle; saved `figure.tex` contains real `rectangle` owned command, not desired `line`. The failure is actionable GUI acceptance drift, not generic CI outage. Update all selected root-pixel tool coordinates and seventh-tool click while maintaining fail-closed source SHA lease; new I61 source→PDF and N2/N3 evidence must run.
- **D QA FAIL**: Linux Rust 115/116 app tests PASS, `poppler_worker_kills_hung_process_and_reports_not_checked` did not produce `timed out`; the busy-loop fixture may cause resource contention. Use sleeping `exec sleep 10` instead, retain strict deadline and unexpected-error output. Windows/macOS Rust matrix succeeded; hosted Windows Poppler Chocolatey lookup failed before external XeLaTeX suite. No merge while exact-head red. Windows Server secondary trusted main only; FlowBridge unaffected.

## Cross-platform product blocker from complete N5 exact-head CI (2026-11-05)

On PR #101 exact HEAD `837c4ce653f58bef434d03183d3b932f6cc4c38b`, the packaged release X11 [N5 41945682598](https://github.com/i-shutov/tikzarium/actions/runs/41945682598), real full six-gesture [I61 41945682551](https://github.com/i-shutov/tikzarium/actions/runs/41945682551), B42, fonts and D06 all concluded SUCCESS; hosted Windows Rust likewise succeeded. **But** Rust CI [41945682571](https://github.com/i-shutov/tikzarium/actions/runs/41945682571), D QA [41945683171](https://github.com/i-shutov/tikzarium/actions/runs/41945683171) on Linux/macOS and N1 [41945682531](https://github.com/i-shutov/tikzarium/actions/runs/41945682531) failed before app event tests. Logs all identify the same *real* Rust E0423 in `crates/tikzarium-app/src/pdf_navigation.rs:241`: `Command::new(path)` references a nonexistent value. The sleep-based Unix process-kill test was mistakenly inserted with **literal escaped backslash-n sequences inside one `//` comment**, so the `let (_dir, path)` declaration was commented out. Windows did not see it because the affected test is `#[cfg(unix)]`. This was a product source/test compilation error, **not** hosted Actions minutes or apt mirrors.

Correction: restore physical Rust newline breaks between the two comments and Unix fixture declaration, leaving the production time-budget/kill implementation untouched. Keep the real POSIX `exec sleep 10` child test; do not suppress the test with cfg or bypass the timeout assertion. Synchronize Python and YAML fail-closed I61 leases to the exact new `app/src` git-tree SHA `f531bae82b804dd3bb921c712dbe4f3dbda4c537`. All exact-head CI, screenshot, source/PDF/font and Linux package evidence are **PENDING on the new HEAD**; do not merge simply because older N5/I61 jobs passed. Native physical Linux/DPI/Wayland remain NOT_RUN.
