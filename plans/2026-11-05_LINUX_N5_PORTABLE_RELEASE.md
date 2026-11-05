# N5 Linux-first: native x86_64 portable candidate and extracted-GUI proof

**Owner direction (2026-11-05):** first full desktop release is Linux, not Windows; cross-platform Rust/egui architecture and hosted Win/macOS CI remain intact. N4 adapters are out of the initial release critical path. PR #100 B43 was squash-merged at main `26abc5461bba06d610394080ffe23bbbf92cc6bb` after seven exact-head SUCCESS workflows and original B42/I61 PNG/.tex/PDF/font/SHA audit. This is the first packaging/launch block **after** B43, not another CI-only patch.

## User deliverable

A `Tikzarium-linux-x86_64-preview.tar.gz` made from **real locked release Rust binaries**, not source mockups; executable `launch.sh` and `tikzarium-cli`; one canonical UTF-8/CRLF/opaque example, a truthful Russian README, `PROVENANCE.json` and file `MANIFEST.sha256`. The archive is self-contained **as a portable directory layout**, NOT statically linked or guaranteed on an unrelated Linux distro; it does not include TeX/PGF/font files, external Poppler, or system libraries. No .deb/AppImage or production release announcement is implied.

## Implementation/QA scope

1. Add ELF64 little-endian x86_64 executable/PIE architecture validation to the existing N5 offline provenance packager; preserve Windows PE and macOS Mach-O packaging untouched. Exact source SHA and CI URL required, immutable source binaries checked by SHA256. Tar/gzip metadata must be reproducible for the same inputs; executable mode bits and paths are fixed.
2. Extend offline Python packaging tests: wrong architecture (ARM64/32-bit), truncated ELF/ET_REL rejection; manifest hash coverage; deterministic archives; executable modes; no embedded TeX/fonts; status `linux_packaged_desktop=NOT_RUN`.
3. New *purpose-specific* Linux hosted workflow builds release binaries on Ubuntu 24.04 from the **actual PR head or main SHA**, not GitHub's synthesized PR merge commit. It tests packaging, extracts the produced archive, validates every file's SHA and executable mode, and launches the **EXTRACTED release GUI** with Xvfb/Openbox/xdotool. An actual 1366×768 PNG, window id/geometry, app log and artifacts are mandatory; failure to find a live window fails the job. This covers a real packaged hosted-X11 boot, not whole GUI acceptance.
4. Run the existing **full** I61 real six-gesture/N2/N3/XeLaTeX proof and Windows/macOS regression separately; do not equate an X11 boot with original end-to-end PDF.
5. Manually review exact-head original screenshots for titlebar, code/canvas/inspector, font/legibility, launch errors and correct source. Verify archive digest against GitHub's reported digest, file SHA ledger, ELF headers and user documentation.
6. After exact-head green acceptance merge with expected SHA and independently inspect main postmerge. Then target real portable execution **outside** hosted Xvfb (actual desktop/distro), DPI 1/1.25/2 where observed, native dialogs, real external XeLaTeX PDF/embedded fonts, file picker and persistence. Record separate `NOT_RUN` for Wayland and physical hosts not tested.

## Rejection and security gates

- No privileged runner, no FlowBridge runner, no Windows self-hosted PR execution.
- No implicit XeLaTeX downloads/TeX installation, no bundled private fonts, no shell escape, no substitute compiler, no N4.
- Wrong architecture, tampered binary SHA, malformed archive contents or manifest must fail closed before showing success.
- A synthetic ELF header in unit tests is **not** a real application; real release ELF and actual X11 window are separate CI steps.
- A released archive without physical desktop/manual GUI acceptance remains **candidate**, not 1.0.

## Checkpoints

- **PR code staged:** Linux packager + tests + portable-run workflow + README and plan. Implementation is not CI acceptance.
- **Exact-head CI:** pending until new PR submits, jobs complete and original artifacts are inspected. Use GH run/CI URLs, SHA and digest, don't repeat an unrelated old PASS.
- **Postmerge:** required separately; Windows Server secondary trusted-main QA and Wayland/physical Windows/Mac are not Linux release gates.

## Compact desktop real X11 correction — 2026-11-05

Original artifact 13371821446 from N5 successful run [41930413745](https://github.com/i-shutov/tikzarium/actions/runs/41930413745) on PR head `f0a305b54d722cf4192c92b6d1a8efd223f20b0e` was independently downloaded and audited. ZIP native-evidence/archive checksums and all seven package manifest entries passed. **But** its actual xdotool client geometry was X=2,Y=40,WIDTH=1366,HEIGHT=768, on a 1366×768 screen. The bottom 40px of the application was outside the viewport, not a fully usable compact-screen app. Old SUCCESS only established visible startup, not complete ergonomics. Fix production default 1180×680pt (resizable; min 850×560) with a source-level test, and make the hosted N5 workflow reject any off-screen client via actual X11 geometry. I61 YAML/Python app-source SHA lease is updated atomically. New HEAD exact GUI/CI and screenshot review PENDING. Physical Linux display/DPI/native dialogs/Wayland still NOT_RUN. Existing Windows/Mac/TeX paths unchanged.

## Actual packaged viewport PASS, independent full vertical still blocked — 2026-11-05

At exact PR head `3708d02dde0447348f5168f0a756a7136271fc85`, [N5 41937982111](https://github.com/i-shutov/tikzarium/actions/runs/41937982111) succeeded with original extracted release ELF/CLI/PNG. Its `window-geometry.txt` is X=94,Y=71,WIDTH=1180,HEIGHT=680; bottom status and all three workspace panes are visible on the original 1366×768 screenshot. The previous 40px off-screen bug no longer reproduces in hosted X11. Physical distro, real desktop, HiDPI, native dialogs and Wayland remain NOT_RUN.

**Exact-head red gates are real and separate:** [I61 41937982066](https://github.com/i-shutov/tikzarium/actions/runs/41937982066) selected a Rectangle when asking for Line because N5 changed the starting layout while hard-coded popup coordinates remained from the B43 screenshot. Independently checked original PNG: the four geometry buttons center at x=532/585/639/693, not x=599/653/707/761. The harness now clicks observed centers with exact app/src tree lease; subsequent gestures, N2/N3 and PDF must pass on the new head before merge. [D QA 41937982165](https://github.com/i-shutov/tikzarium/actions/runs/41937982165) Linux timeout-worker test fails under parallel test load (115 passed, 1 failed). Its previous shell busy-loop is replaced with non-spinning `exec sleep 10`, still requiring real timeout and bounded child termination. Windows hosted Poppler package acquisition failed before external TeX regression, and must not be labeled product failure. All new-head gates and original artifacts remain PENDING until observed.


## Cross-platform product blocker from complete N5 exact-head CI (2026-11-05)

On PR #101 exact HEAD `837c4ce653f58bef434d03183d3b932f6cc4c38b`, the packaged release X11 [N5 41945682598](https://github.com/i-shutov/tikzarium/actions/runs/41945682598), real full six-gesture [I61 41945682551](https://github.com/i-shutov/tikzarium/actions/runs/41945682551), B42, fonts and D06 all concluded SUCCESS; hosted Windows Rust likewise succeeded. **But** Rust CI [41945682571](https://github.com/i-shutov/tikzarium/actions/runs/41945682571), D QA [41945683171](https://github.com/i-shutov/tikzarium/actions/runs/41945683171) on Linux/macOS and N1 [41945682531](https://github.com/i-shutov/tikzarium/actions/runs/41945682531) failed before app event tests. Logs all identify the same *real* Rust E0423 in `crates/tikzarium-app/src/pdf_navigation.rs:241`: `Command::new(path)` references a nonexistent value. The sleep-based Unix process-kill test was mistakenly inserted with **literal escaped backslash-n sequences inside one `//` comment**, so the `let (_dir, path)` declaration was commented out. Windows did not see it because the affected test is `#[cfg(unix)]`. This was a product source/test compilation error, **not** hosted Actions minutes or apt mirrors.

Correction: restore physical Rust newline breaks between the two comments and Unix fixture declaration, leaving the production time-budget/kill implementation untouched. Keep the real POSIX `exec sleep 10` child test; do not suppress the test with cfg or bypass the timeout assertion. Synchronize Python and YAML fail-closed I61 leases to the exact new `app/src` git-tree SHA `f531bae82b804dd3bb921c712dbe4f3dbda4c537`. All exact-head CI, screenshot, source/PDF/font and Linux package evidence are **PENDING on the new HEAD**; do not merge simply because older N5/I61 jobs passed. Native physical Linux/DPI/Wayland remain NOT_RUN.
