# Linux N5 packaged GUI first-use evidence ledger — candidate

Recorded 2026-11-05, before new exact-head checks. This is NOT a release acceptance report.

| Evidence gate | Current honest state |
| --- | --- |
| Main postmerge hosted Rust/N5 X11 boot/I61/N1/D QA | PASS at `ddf018a7` (separate workflows and executables) |
| Correct portable launch project CWD + spaces/Cyrillic/args/PATH | CODE+TEST; exact-head CI PENDING |
| Real extracted release ELF from manifest and X11 viewport | New HEAD PENDING |
| Extracted launcher six pointer gestures→source/save/undo/open/CRLF | NOT_RUN at new HEAD |
| Extracted launcher external XeLaTeX PDF, Unicode, all embedded fonts | NOT_RUN at new HEAD |
| Extracted launcher N2/N3 library F1/Complete/PDF | NOT_RUN at new HEAD |
| Original exact-head PNG/.tex/PDF/font/log/SHA independent image review | NOT_RUN |
| Hosted Windows/macOS exact-head compatibility | NOT_RUN |
| Physical Linux, native dialogs, HiDPI, Wayland/distro portability | NOT_RUN |

Evidence procedure: inspect each new run conclusion, job steps and ORIGINAL artifact SHA ledger and screenshots, not historical PR body. Do not infer real user desktop PASS from hosted Xvfb, or bundled-PDF PASS from source-built I61. On FAIL capture exact failing step and original artifacts. The separate trusted Windows Server failure at [41952959005](https://github.com/i-shutov/tikzarium/actions/runs/41952959005) is nonblocking for Linux-first.
## First exact-head cross-platform diagnostic (PR #102, 2026-11-05)

At `151e5bb41adbe66a195f760347211a1acef8aba7`, D QA [41958474342](https://github.com/i-shutov/tikzarium/actions/runs/41958474342) immediately exposed **two test-harness portability defects**, not Rust regressions. Windows attempted to execute a POSIX shell launcher, which Windows cannot execute; macOS exposes temporary paths canonically as `/private/var` while Python's supplied directory may be `/var`. Keep meaningful packaged launcher execution on Linux/macOS (POSIX), skip only this shell-execution test on Windows while retaining PE/Mach-O/ELF packaging validations there, and assert canonical `project.resolve()` on macOS. Full new-head CI and original packaged GUI PDF remain unaccepted until rerun.
