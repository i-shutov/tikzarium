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
