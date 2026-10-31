# A/W06 — External XeLaTeX / MiKTeX offline doctor and primitive build

**Owner scope:** A only: core discovery/runner, CLI, A-only tests/fixture, plans/insights. **Base:** main c5c8c1576b6288e1d125d558d0d4872b321efb86. **Integration:** I05 #24 merged; W05 #28 remains independent and untouched. Follow repo AGENTS.md. Do not conflate hosted Windows Server + TeX Live with Windows 10 + MiKTeX.

## Accepted product contract

1. Native TikZ/PGF primitives and enabled TikZ libraries are the drawing engine; original TeX is the editable source, preview is XeLaTeX-produced PDF. No Rust geometry solver, TeX reimplementation, or mandatory CST/CAS/DAG.
2. Windows 10 x64: independently installed **MiKTeX**, from user or shared installation. Mac M1/M4: independently installed XeLaTeX. Never bundle TeX, install missing packages, modify MiKTeX settings, or turn on shell escape.
3. The CLI doctor must report actual executable path, actual version/distribution, read-only status of required files and uncertainty. Missing fonts/glyphs are diagnosed by a real build and XeLaTeX log; presence of fontspec.sty alone is not a font coverage test.
4. The build service must pass MiKTeX's documented **--disable-installer** on each compilation, overriding "always install" and "ask first" for that process without writing configuration. Unknown engine versions fail closed; TeX Live retains its regular argument syntax.
5. Safe MiKTeX package discovery uses native **findtexmf** *without --must-exist*. Do not call MiKTeX kpsewhich for missing packages: its past behavior included on-the-fly install. Prefer findtexmf alongside the selected xelatex, then PATH. TeX Live uses kpsewhich. Missing and NOT_CHECKED are distinct.
6. Source Unicode and spaces are handled as path arguments, never shell strings. Known macros, raw TeX bytes, user preambles and packages stay untouched. GUI package/library additions will be user-visible undoable source changes in lane B, not modifications to MiKTeX.

## Vertical implementation and gates

- [x] Recheck base SHA, open PRs, AGENTS.md, previous A and integration work.
- [x] Introduce distribution-aware engine probe, conservative package lookup and CLI doctor exit codes (0 requirements present, 2 unknown/unavailable, 3 missing file).
- [x] Runner: known TeX Live/ MiKTeX identity before compilation, MiKTeX --disable-installer, no shell, existing cancellation/logs/diagnostics intact.
- [x] Regression tests: unknown distribution fail closed, fake MiKTeX argv contains --disable-installer, source SHA unchanged, Unicode/spaces, sibling findtexmf never receives --must-exist.
- [x] New actual TeX primitive fixture with owner-controlled preamble, fontspec, unicode-math and TikZ calc/positioning/arrows.meta.
- [x] Linux TeX Live real fixture compile; inspect pdfinfo, pdftotext and pdffonts (record evidence in insights).
- [ ] **Exact PR HEAD CI:** Rust fmt/check/test/Clippy and real XeLaTeX hosted matrix; record exact Actions runs and amend this plan after completion.
- [ ] **Physical Windows 10/MiKTeX user install** and **shared install**, Unicode+spaces, offline/no-network monitored; record xelatex --version, doctor output, build logs, source/PDF hashes and network observations.
- [ ] **Physical macOS ARM64 M1/M4**, native external XeLaTeX, PDF, actual GUI screenshots and font proof.

## Reproduce on actual Windows 10 (PowerShell)

User manually installs MiKTeX independently; no automated package installation by TikZarium. In a normal, **non-admin** terminal:

~~~powershell
$env:TIKZARIUM_XELATEX = "C:\Program Files\MiKTeX\miktex\bin\x64\xelatex.exe" # replace with actual user/shared path
cargo run -p tikzarium-cli -- doctor
$project = Join-Path $env:TEMP "TikZarium Юникод project"
New-Item -ItemType Directory -Force $project | Out-Null
Copy-Item crates/tikzarium-core/tests/fixtures/a-miktex-offline-primitives.tex (Join-Path $project "тест фигуры.tex")
cargo run -p tikzarium-cli -- build (Join-Path $project "тест фигуры.tex") (Join-Path $project "тест фигуры.pdf") --log (Join-Path $project "тест фигуры.log")
Get-FileHash (Join-Path $project "тест фигуры.tex") -Algorithm SHA256
~~~

Repeat with *genuine user and shared MiKTeX installations*, capturing both engine paths; manually provide missing packages/fonts outside TikZarium if required. Use an offline network monitor / disconnected host to prove **zero package downloads**. Do not mark PASS merely because --disable-installer was passed in a fake test.

## Reproduce on macOS ARM64

~~~sh
cargo run -p tikzarium-cli -- doctor
mkdir -p "/tmp/TikZarium кириллица with spaces"
cp crates/tikzarium-core/tests/fixtures/a-miktex-offline-primitives.tex "/tmp/TikZarium кириллица with spaces/main.tex"
cargo run -p tikzarium-cli -- build "/tmp/TikZarium кириллица with spaces/main.tex" "/tmp/TikZarium кириллица with spaces/output.pdf" --log "/tmp/TikZarium кириллица with spaces/compile.log"
~~~

Inspect PDF text/font embedding with external Poppler (separately installed). If DejaVuSerif.ttf/latinmodern-math.otf is absent, report a missing font explicitly; do not substitute silently, or auto-install TeX packages.

## External MiKTeX semantics verified from vendor docs (not native smoke)

- https://docs.miktex.org/manual/miktex-xetex.html — XeTeX --disable-installer documented.
- https://docs.miktex.org/manual/texfeatures.html — installer override takes precedence over persisted settings.
- https://docs.miktex.org/manual/findtexmf.html — --must-exist permits installation; omit it.
- https://docs.miktex.org/manual/autoinstall.html — on-the-fly install may be auto-approved by stored user preference.

## Remaining design limits

The engine --version probe currently uses ordinary process output without its own timeout. MiKTeX cannot guarantee strict OS-level offline isolation: the no-installer flag disables MiKTeX's package installer, not every conceivable TeX macro or executable, and -no-shell-escape is not an OS sandbox. A network-isolated physical-host smoke remains mandatory. An external font file may be absent even when .sty files are present. No automatic GUI preamble patching, no TeX distribution mutation, no physical-host PASS in this PR.
