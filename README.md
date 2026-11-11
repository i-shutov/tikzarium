# TikZarium

> **CURRENT PRODUCT/RELEASE DECISION (2026-11-11):** owner approved TikZarium **v1.0.0 as the first complete Scientific Studio**, not an earlier narrow TikZ GUI. [Normative release scope](docs/RELEASE_SCOPE_SCIENTIFIC_STUDIO_1_0_RU.md) · [Science-first roadmap](docs/ROADMAP.md) · [execution plan](plans/2026-11-11_SCI_1_0_EXECUTION.md). Required: beautiful multi-document UI, all UX/G3; scientific TikZ/PGFPlots, SCI142 142 figures/103 requirements, scientific AI88, scoped Asymptote and Typst/CeTZ native scientific GUI source edits/build/export, W0–W4 actual Win10/Server/IME/96-120-192 DPI QA. UML/BPMN/engineering/chem-bio/animation/other/data are subsequent priorities. **STABLE 1.0 NO-GO** pending implementation and independent acceptance. The old dated status paragraphs below, including 96-DPI-only and "scientific-after-1.0", are retained as historical evidence, not the current v1.0 contract.


> **Релизный статус 2026-11-10 — Windows 1.0: PREPARATION, NOT STABLE.** Целевая конфигурация Windows 10 x64, **100% / 96 DPI**. Независимый аудит оригинального W3 GUI→XeLaTeX при 96 DPI: **45/45 проверок и визуальное ревью PASS** на `main` `488a9687` ([акт](docs/W3_WIN10_20261110_INDEPENDENT_ORIGINAL_REVIEW_RU.md)); это *частичная приёмка*, не полный W3/W4 GO. W2b full Server GUI, отдельное решение по IME composition, W4 clean deploy/rollback и exact-final-SHA контроль ещё открыты. Масштабы 125%/200% **перенесены после 1.0**, [#161](https://github.com/i-shutov/tikzarium/issues/161), а не испытаны. [План релиза](docs/RELEASE_PREP_WINDOWS_1_0_20261110_RU.md) · [Known issues](docs/KNOWN_ISSUES_WINDOWS_1_0_RU.md). GitHub `v1.0.0`/stable ещё не опубликован.

> **HISTORICAL CHECKPOINT (2026-11-08, main `ef95c1c9ef1ac2b311a654c1daac53c97c8d7ef9`):** Windows portable W0 hosted PASS, **W1 exact-current-main personal Rust/MiKTeX PDF + original font/Unicode audit PASS** (server #42460198175, final artifact #13609998582); **W2a real Server own HWND/125% physical-client PNG/F1 PASS** ([original run](https://github.com/i-shutov/tikzarium/actions/runs/42460198175), artifact 13609526883, independent decoded PNG and visual review). W2b physical six gestures/Save/Open/IME/GUI→XeLaTeX **NOT_RUN**; physical Win10 W3 **NOT_RUN**; stable W4 **NO-GO**. PR #132/#133/#134 merged. See [release control](docs/WINDOWS_1_0_RELEASE_CONTROL_RU.md), [resume](docs/RESUME.md), [79 incidents](docs/TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md). Administrator HIGH is for trusted TeX only (NOT sandbox); no system configuration/FlowBridge changes.

> **Historical Linux release progress (retained, not today's platform priority):** R1 safe close, R2 200%-DPI bounds and R3 genuine GTK/XDG Open/Save/Export are accepted on main 4f3a2ebb using hosted X11. The versioned **1.0.0-rc.1** portable candidate uses the identical GUI-tested ELF and its own manifest/SHA256 and Russian first-use guide. **NOT stable 1.0**: physical Ubuntu24/x86_64/X11 desktop R4 remains NOT_RUN. See [issue #103](https://github.com/i-shutov/tikzarium/issues/103), [R4 runbook](docs/LINUX_1_0_PHYSICAL_QA_RU.md), and [R5 plan](plans/2026-11-05_LINUX_1_0_R5_RC.md). Old N5 Preview instructions below refer to the previous, not versioned RC.


**Cross-platform-by-design native TikZ/PGF visual editor** written in Rust/egui. The user's ordinary editable `.tex` is authoritative; **only an external XeLaTeX** produces the exact PDF. No account, web service, proprietary document format or bundled TeX distribution.

**Status (2026-11-08):** W0 PASS, exact-current-main W1 independently audited PASS, W2a physical PASS at 125% with original full 1475×850 client pixels and F1, W2b/W3 NOT_RUN, W4 stable NO-GO.

## Current user workflow

- Draw **line, arrow, rectangle, circle, text/math node, cubic Bézier** with real pointer gestures.
- Keep **editable ordinary TikZ/TeX source visible beside the canvas**, with undo, save/open and minimal revision-checked patches. Unknown macros, comments and unrelated source remain authoritative.
- Use compact grouped icon palettes, Properties/Libraries and **Russian contextual F1** from one C catalogue. Package-installed, project-loaded, engine-compatible, tool-implemented and help-available are **five independent statuses**.
- Select a project library through a visible source patch; unavailable GUI adapters do not prevent supported plain TeX code from compiling.
- Compile with the **user's external XeLaTeX** and inspect the exact PDF, error diagnostics and embedded fonts. Interactive geometry overlays are provisional; no TeX parser, geometry solver or silent compiler substitution is used.
- Long Cyrillic/opaque source lines can be **visually wrapped** with the reversible `Перенос` control; the source bytes/CRLF/Undo and XeLaTeX result are unchanged. Horizontal navigation works when wrapping is off.

## Platforms and installation

| Target | Status / prerequisites |
|---|---|
| **Linux desktop x86_64, X11** | Preserved versioned 1.0.0-rc.1; physical Linux R4 NOT_RUN.  External user-installed XeLaTeX/TeX Live and TikZ packages, compatible X11/graphics system libraries; Poppler utilities for PDF preview/QA |
| **Linux Wayland and other distributions** | Cross-platform architecture retained; **not physically qualified** |
| **Windows 10 x64** | **Current first-release target**; independently installed **MiKTeX/XeLaTeX**, hosted Windows Rust/MiKTeX CI is **not** a physical Win10 GUI PASS |
| **macOS ARM64 M1/M4** | Future physical release target; user's external XeLaTeX, hosted ARM64 build is **not** physical GUI or notarization PASS |

### Windows x64 portable candidate (current priority)

The hosted Windows 2022 native CI builds **release** `tikzarium-app.exe` with GUI PE Subsystem 2 and `tikzarium-cli.exe` with Console Subsystem 3. It packages those exact binaries in `Tikzarium-Windows-x64-portable-candidate.zip`, with a CRLF specimen, `README_RU.md`, `PROVENANCE.json` and `MANIFEST.sha256`. Independent checks compare the ZIP against the original release EXEs and actually run the extracted CLI help from a Unicode/space path, without XeLaTeX. The [native CI workflow](https://github.com/i-shutov/tikzarium/actions/workflows/ci.yml) must be green at the **exact release source SHA**, and its original ZIP/audit artifacts manually inspected before adoption.

On a Windows 10 desktop with your **already installed** system-wide MiKTeX, extract the downloaded ZIP, verify every file's SHA256 against `MANIFEST.sha256`, run `tikzarium-cli.exe doctor`, then `tikzarium-app.exe`. Manually test six real mouse drawing operations → ordinary editable `.tex`/F1/Inspector/libraries → Undo/Save/Open → actual **offline MiKTeX XeLaTeX** PDF with Cyrillic and embedded fonts. Save original screenshots, source/PDF, MiKTeX logs and SHA. No downloads or TeX package/font auto-installs are allowed. **Hosted Windows and Windows Server acceptance are not physical Windows 10 acceptance.** Portable ZIP is not an installer; no MSI/Setup until this physical smoke passes.

### Linux portable candidate (accepted 1.0.0-rc.1, retained, not active platform priority)

The `N5 Linux x86_64 portable release and packaged X11 launch` CI workflow builds real **release** Rust binaries, verifies native ELF64/x86_64 headers and source SHA, and packages a deterministic `.tar.gz` containing `tikzarium-app`, `tikzarium-cli`, `launch.sh`, a CRLF/Unicode specimen, `README_RU.md`, `MANIFEST.sha256` and `PROVENANCE.json`. It does **not** bundle or download MiKTeX/TeX Live, fonts, installers or unreviewed shared libraries.

When the [workflow](https://github.com/i-shutov/tikzarium/actions/workflows/n5-linux-portable.yml) produces a successful artifact, extract it locally and verify the manifest **before launch**:

```sh
tar -xzf Tikzarium-linux-x86_64-preview.tar.gz
cd Tikzarium-preview
sha256sum -c MANIFEST.sha256
./tikzarium-cli doctor
./launch.sh
```

On Linux, `launch.sh` starts the bundled executable **without changing the caller's working directory**. To save `figure.tex` and PDFs in a writable project folder, use `cd /path/to/project && /path/to/Tikzarium-preview/launch.sh` (paths containing spaces/Cyrillic are supported).

The portable archive is **not** a `.deb`, AppImage, system-wide installer, or guarantee of ABI compatibility with every distribution. A synthetic-header unit test proves packaging contracts only; only the separately recorded X11 run of the **extracted real binary**, original screenshots and actual PDF evidence establish runtime behavior. At the time this description was committed, that new N5 gate remained **PENDING**.

### Building from source

Use the repo-pinned Rust toolchain and your independently installed external XeLaTeX:

```sh
cargo run --locked -p tikzarium-cli -- doctor
cargo run --locked -p tikzarium-cli -- build examples/quickstart.tex quickstart.pdf
cargo run --locked -p tikzarium-app
```

Do not let the app install packages silently or enable XeLaTeX `-shell-escape` by default. Explicitly configure external compilers and audit real PDF fonts/glyphs.

## Engineering, docs and evidence

- [**CURRENT Windows 1.0 release GO/NO-GO**](docs/WINDOWS_1_0_RELEASE_CONTROL_RU.md), [**79 incident/remediation classes**](docs/TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md)
- [Historic Linux-first owner decision (superseded)](plans/2026-11-04_LINUX_FIRST_CROSS_PLATFORM_RELEASE.md)
- [Product requirements](docs/PRODUCT_SPEC.md), [architecture](docs/ARCHITECTURE.md) and [roadmap](docs/ROADMAP.md)
- [N5 native portable plan](plans/2026-11-05_LINUX_N5_PORTABLE_RELEASE.md), [packaging QA/evidence](insights/2026-11-05_LINUX_N5_PORTABLE_QA.md)
- [Developer prerequisites](docs/DEV_SETUP.md), [QA acceptance](docs/QA_ACCEPTANCE.md), [extensions](docs/EXTENSIONS.md), [contributor instructions](AGENTS.md)
- [Full source history](CHANGELOG.md), [GitHub Actions](https://github.com/i-shutov/tikzarium/actions)

A passing hosted Rust build is not native desktop acceptance. Record source commit SHA, environment and actual original screenshot/source/PDF/font/SHA artifacts independently; never replace a failed UI gate with a screenshot-only mockup.

Project: [i-shutov/tikzarium](https://github.com/i-shutov/tikzarium).
