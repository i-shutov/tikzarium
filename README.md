# TikZarium

**Linux-first, cross-platform-by-design native TikZ/PGF visual editor** written in Rust/egui. The user's ordinary editable `.tex` is authoritative; **only an external XeLaTeX** produces the exact PDF. No account, web service, proprietary document format or bundled TeX distribution.

**Status (2026-11-05):** the six native TikZ primitives, source/canvas/inspector Studio UI, Russian help/catalogue, libraries, CRLF-preserving source actions and B43 responsive/long-line editing have passed hosted **real Linux/X11** QA on the accepted main branch. This **is not a finished or physically qualified Linux desktop release**. The reproducible native package and its extracted X11 startup passed on main. Full *packaged* GUI→editable TeX→XeLaTeX PDF, DPI/dialogs/usability review and an observed real target desktop still gate the first complete release. Wayland/other distributions and physical Windows 10/Mac M1/M4 remain `NOT_RUN` unless separately evidenced.

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
| **Linux desktop x86_64, X11** | First release target. External user-installed XeLaTeX/TeX Live and TikZ packages, compatible X11/graphics system libraries; Poppler utilities for PDF preview/QA |
| **Linux Wayland and other distributions** | Cross-platform architecture retained; **not physically qualified** |
| **Windows 10 x64** | Later release target; independently installed **MiKTeX/XeLaTeX**, hosted Windows Rust/MiKTeX CI is **not** a physical Win10 GUI PASS |
| **macOS ARM64 M1/M4** | Later release target; user's external XeLaTeX, hosted ARM64 build is **not** physical GUI or notarization PASS |

### Linux portable candidate (N5, work in progress)

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
