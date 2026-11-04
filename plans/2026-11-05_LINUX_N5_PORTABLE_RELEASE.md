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
