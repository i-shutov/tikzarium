# TikZarium

> **ACTIVE FIRST RELEASE — Windows 10 x64 (owner decision, 2026-11-05):** Native Rust/egui with independently user-installed MiKTeX/XeLaTeX, starting with exact-SHA portable Windows ZIP + real PE GUI/CLI role, then non-admin interactive Windows Server QA and separately a physical Windows 10 six-gesture GUI→TeX→PDF smoke. The Windows hosted build does not prove a Win10 GUI. FREEZE FEATURES, no TeX/font installs, no premature installer. [Current acceptance plan](plans/2026-11-05_WINDOWS_X64_RELEASE.md).

> **Historical Linux release progress (retained, not today's platform priority):** R1 safe close, R2 200%-DPI bounds and R3 genuine GTK/XDG Open/Save/Export are accepted on main 4f3a2ebb using hosted X11. The versioned **1.0.0-rc.1** portable candidate uses the identical GUI-tested ELF and its own manifest/SHA256 and Russian first-use guide. **NOT stable 1.0**: physical Ubuntu24/x86_64/X11 desktop R4 remains NOT_RUN. See [issue #103](https://github.com/i-shutov/tikzarium/issues/103), [R4 runbook](docs/LINUX_1_0_PHYSICAL_QA_RU.md), and [R5 plan](plans/2026-11-05_LINUX_1_0_R5_RC.md). Old N5 Preview instructions below refer to the previous, not versioned RC.


**Cross-platform-by-design native TikZ/PGF visual editor** written in Rust/egui. The user's ordinary editable `.tex` is authoritative; **only an external XeLaTeX** produces the exact PDF. No account, web service, proprietary document format or bundled TeX distribution.

**Status (2026-11-05):** the six native TikZ primitives, source/canvas/inspector Studio UI, Russian help/catalogue, libraries, CRLF-preserving source actions and B43 responsive/long-line editing have passed hosted **real Linux/X11** QA on the accepted main branch. The Linux 1.0.0-rc.1 is retained as a versioned release candidate, **not a physically qualified/stable Linux desktop release**. The reproducible native package and its extracted X11 startup passed on main. The active first-release gate is now Windows 10 x64 + the user's independently installed MiKTeX; physical Windows GUI, DPI/dialogs/usability, six gestures and Unicode/embedded-font PDF remain to be observed. Linux physical R4 stays NOT_RUN. Wayland/other distributions and physical Windows 10/Mac M1/M4 remain `NOT_RUN` unless separately evidenced.

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

- [Current owner decision — Linux first](plans/2026-11-04_LINUX_FIRST_CROSS_PLATFORM_RELEASE.md)
- [Product requirements](docs/PRODUCT_SPEC.md), [architecture](docs/ARCHITECTURE.md) and [roadmap](docs/ROADMAP.md)
- [N5 native portable plan](plans/2026-11-05_LINUX_N5_PORTABLE_RELEASE.md), [packaging QA/evidence](insights/2026-11-05_LINUX_N5_PORTABLE_QA.md)
- [Developer prerequisites](docs/DEV_SETUP.md), [QA acceptance](docs/QA_ACCEPTANCE.md), [extensions](docs/EXTENSIONS.md), [contributor instructions](AGENTS.md)
- [Full source history](CHANGELOG.md), [GitHub Actions](https://github.com/i-shutov/tikzarium/actions)

A passing hosted Rust build is not native desktop acceptance. Record source commit SHA, environment and actual original screenshot/source/PDF/font/SHA artifacts independently; never replace a failed UI gate with a screenshot-only mockup.

Project: [i-shutov/tikzarium](https://github.com/i-shutov/tikzarium).
