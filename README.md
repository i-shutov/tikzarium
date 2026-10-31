# TikZarium

Native scientific graphics workbench: **Rust + egui + XeLaTeX**.

**Main targets:** Windows 10 x64 and macOS Apple Silicon. No browser, sign-in or cloud service required. The source of truth is the user's ordinary `.tex` or `.tikz` source. Exact rendering comes from XeLaTeX, never a guessed Rust reconstruction.

## Work in progress: W01 XeLaTeX workbench

An initial workspace is being implemented:
- `tikzarium-core`: UTF-8 source I/O, cancellable XeLaTeX builds, TeX tool discovery, .fls dependencies, log diagnostics and PDF/PNG preview.
- `tikzarium-cli`: `doctor` and `build source.tex output.pdf`.
- `tikzarium-app`: egui desktop shell with text editor, local build, preview, zoom, log and PDF export.
- `tikzarium-extensions`: declarative packages catalogue; presence does not imply validated compilation or visual editing.

**Not yet production-ready.** Core GUI visual object editing, robust arbitrary TikZ fragment preambles and packaged multi-page PDF rendering are future stages. For now the GUI's preview needs optional Poppler `pdftoppm` installed locally.

Start at [Developer setup](docs/DEV_SETUP.md), [W01 workpack](plans/2026-10-31_W01_WORKBENCH.md) and [W01 evidence](insights/2026-10-31_W01_EVIDENCE.md).

### Local commands

```sh
cargo run -p tikzarium-cli -- doctor
cargo run -p tikzarium-cli -- build examples/quickstart.tex quickstart.pdf
cargo run -p tikzarium-app
```

## Figure fonts and GUI themes (F01/U01, experimental)

New figure typography panel: validated fontspec/unicode-math text and math families, isolated XeLaTeX proof, optional Poppler pdftotext/pdffonts glyph and embedding audits. Theme menu: Light, Dark, Midnight, Paper and compact/comfortable density; settings persist locally. This feature is implemented on a stacked **draft** PR and is not yet a Windows 10/M1/M4 release claim. GUI theme selection never changes the exported TikZ figure.

See [Figure typography and GUI appearance](docs/FONTS_THEMES.md), [plan](plans/2026-10-31_F01_U01_FONTS_THEMES.md), [QA evidence](insights/2026-10-31_F01_U01_FONT_THEME_QA.md).

## Product direction and contracts

- [Requirements](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Extensibility and TeX package compatibility](docs/EXTENSIONS.md)
- [Progressive releases](docs/ROADMAP.md)
- [QA acceptance](docs/QA_ACCEPTANCE.md)
- [CI matrix](docs/CI_MATRIX.md)
- [Agent and contributor instructions](AGENTS.md)

**Compatibility:** every installed XeLaTeX-compatible TeX package is accessible via the canonical compiler, but GUI recognition and safe visual editing require explicit adapters. LuaTeX-only code is not advertised as XeLaTeX-native. We intend to grow capabilities release by release, not rewrite TeX in Rust.

Research reference corpus: user's R4 TikZ/PGF graphics skills (2026-10-29), with 135 active fixture builds in its original environment; these tests are not yet run on this repository's targets.

Project owner: [i-shutov/tikzarium](https://github.com/i-shutov/tikzarium).
