# Target-host acceptance: Windows 10 and Apple Silicon Mac

This is an execution checklist, **not** a record of passed tests.
GitHub windows-2022 CI runs on Windows Server, not Windows 10.
GitHub macos-15 ARM64 may compile an app but does not prove it launches
with correct HiDPI layout, fonts or PDF preview on a user's M1/M4.

## Record before testing

- Exact Git SHA / PR and binary SHA-256
- OS edition/build (Windows 10 22H2 x64, or macOS version and M1/M4)
- CPU architecture, native binary architecture and compiler version
- XeLaTeX executable, TeX distribution/year, font packages, kpsewhich
- PDF renderer executable/version (pdftoppm if used), effective DPI
- Display resolution, scale factor, tested locale and shell

## Repeatable headless smoke (both systems)

1. Open terminal in repo and build: cargo build -p tikzarium-cli
2. Run: cargo test --workspace --all-targets
3. Run: cargo fmt --all -- --check
4. Run: cargo clippy --workspace --all-targets -- -D warnings
5. Run the real CLI doctor command and record the discovered engine.
6. Run scripts/tools/qa_smoke.py with an explicit path to the native
   CLI binary and an empty output directory. The source path containing
   Unicode and spaces must pass; the broken TeX must exit as TeXFailure.
   Review the separately authored Cyrillic glyph-audit fixture's log for
   zero Missing character diagnostics. The legacy example is only a PDF
   compilation test and is not evidence that Cyrillic is rendered.
7. Inspect qa-report.json. A missing pdfinfo means expected PDF page
   count was NOT_CHECKED even when byte-integrity passed.

Example Windows PowerShell:
    python scripts/tools/qa_smoke.py --cli target/debug/tikzarium-cli.exe --output qa-win10

Example macOS terminal:
    python3 scripts/tools/qa_smoke.py --cli target/debug/tikzarium-cli --output qa-mac-arm

## Interactive GUI and visual checks (manual, currently pending)

Open/Save/Reopen an ordinary TeX project; compile with XeLaTeX; view
and export the actual PDF; deliberately introduce a compile error and
verify that last-good preview remains marked stale; cancel/timeout;
open nested includes and projects in a Unicode+space directory;
verify no unnoticed source mutation, clipboard and Cyrillic IME;
check display scaling on 1366x768 Windows and Retina macOS;
check file pickers, package discovery, denied TeX permissions and
missing PDF rasterizer. Preserve screenshots and error logs.

## Mandatory verdict vocabulary

PASS = evidence from that exact host and SHA; FAIL = verified defect;
NOT_RUN = no test executed; BLOCKED = explicit prerequisite absent.
Hosted Windows Server results are separately labeled CI_ONLY and
MUST NOT be transcribed as a Windows 10 PASS. Native M1/M4 GUI tests
remain NOT_RUN until screenshots, commands and host metadata exist.


## Font and theme acceptance extension — F01/U01

**Font support is a release gate for graphics**, not only for body text.
For each real target host, compile the new
\`fixtures/qa/g02-tikz-fonts/main.tex\` through the native TikZarium
Rust CLI. It contains Cyrillic/Greek text and mathematical expressions
*inside actual TikZ nodes*, with DejaVu Serif via \`fontspec\` and Latin
Modern Math via \`unicode-math\`. The test must verify:

1. XeLaTeX returns success without \`Missing character:\` warnings.
2. \`pdftotext -enc UTF-8 <pdf> -\` extracts both expected Cyrillic and
   literal Greek text strings. On Windows, compare decoded UTF-8 bytes;
   do not decode using the PowerShell/ANSI system codepage.
3. \`pdffonts <pdf>\` identifies both chosen families as **embedded**,
   not merely present on the host. If utility is unavailable, record
   font-embedding \`NOT_CHECKED\` and do not approve the release.
4. \`pdfinfo <pdf>\` confirms one page; if unavailable, page count is
   \`NOT_CHECKED\` rather than a passing page-count assertion.
5. Repeat with a project's explicitly selected nondefault fonts if
   available: capture family name, font file path/hash, fontconfig/OS
   discovery and PDF evidence. A missing user font must produce a
   visible diagnostic rather than silently substitute an unnoticed font.
6. Verify font selection survives Save/Reopen and does not rewrite
   unrelated TeX constructs. This step is \`NOT_RUN\` until the GUI/core
   typography controls are implemented.

Install Poppler utilities before running this gate. Linux/macOS CI
installs them explicitly; the exact user-machine installation is outside
the scope of a hosted build. Windows Server 2022 evidence is **CI_ONLY**,
not Windows 10 acceptance.

For user-interface themes (when implemented by GUI lane B), check
Dark/Light and other supplied themes, switching without restart,
persisting across restart, Cyrillic input/IME and menus in compact
1366×768 and Retina environments. Record GUI screenshots and compare
the TeX source SHA-256 and figure PDF semantics before/after changing
the GUI theme. GUI presentation MUST NOT alter the embedded fonts,
stroke colors, geometry or source of a TikZ figure. Until feature
availability and physical screenshots are recorded: **NOT_RUN**.
