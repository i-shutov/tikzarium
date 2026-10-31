# Development and runtime prerequisites — owner-corrected

Updated 2026-10-31. TikZarium uses TeX; it does not include or reimplement it.

## Runtime on Windows 10 x64

**MiKTeX is installed and maintained independently by the user.** Use its XeLaTeX executable; configure PATH or `TIKZARIUM_XELATEX` with the full executable path. The current environment detector and future prerequisite UI must report the selected executable and distribution/version rather than silently picking another TeX installation.

Install the packages required by the actual project through MiKTeX Console. The basic drawing workflow needs TikZ; standalone examples additionally need their document class, and font examples need fontspec/unicode-math plus the chosen fonts. Package inventory and project `\usepackage`/`\usetikzlibrary` declarations are different states.

MiKTeX may automatically install missing packages depending on its settings. **Required new behavior, to be verified:** ordinary offline TikZarium builds must suppress hidden automatic package downloads using supported invocation-specific MiKTeX options, without modifying global user settings. The MiKTeX XeTeX manual documents `--disable-installer`; verify it with the configured XeLaTeX launcher and distribution. Do not claim this guard is implemented merely because it is documented here.

For the currently external PDF utilities, `pdftoppm` provides raster preview, `pdfinfo` page metadata/navigation, and `pdftotext`/`pdffonts` support glyph and embedded-font QA. Missing tools need explicit diagnostics; PDF production and raster preview are different capabilities. Do not bundle unreviewed binary dependencies.

## Building the application from source

End users of a packaged build do not need Rust or Visual Studio. Developers building Windows binaries need the native MSVC build prerequisites and the Rust toolchain pinned by `rust-toolchain.toml`.

```powershell
xelatex --version
cargo run -p tikzarium-cli -- doctor
cargo run -p tikzarium-cli -- build examples/quickstart.tex quickstart.pdf
cargo run -p tikzarium-app
```

These commands illustrate development use; they are not a report that the user's Win10/MiKTeX host has been tested. Before offline package tests, verify the configured MiKTeX automatic-install policy and the app's invocation guard.

## macOS Apple Silicon

Use an ARM64 application and the user's independently installed XeLaTeX (for example an existing MacTeX/TeX Live environment). Do not replace that installation. Source builds require the native Rust toolchain and Apple developer command-line tools. Configure the executable explicitly when a GUI launch has a different PATH from a terminal.

```sh
rustc -vV
xelatex --version
cargo run -p tikzarium-cli -- doctor
cargo run -p tikzarium-cli -- build examples/quickstart.tex quickstart.pdf
cargo run -p tikzarium-app
```

## Acceptance and troubleshooting

Wrong/missing engine: show selected path and distribution. Missing package: identify the requirement and direct the user to the external manager. Installed-but-unloaded library: offer an explicit undoable preamble edit, not installation. Missing glyph: report it even if XeLaTeX exited zero. Keep the exact PDF and source unchanged when switching GUI themes. Full `.tex` and fragment `.tikz` project/preamble handling must be tested separately; do not imply an arbitrary fragment compiles without a wrapper.

Real Windows 10 + MiKTeX and physical Mac M1/M4 GUI checks remain separate from hosted Windows Server or TeX Live CI. Record versions, exact SHA, actual interaction and screenshots. No TeX download, package mutation or physical acceptance has been performed by this documentation change.

References: https://miktex.org/howto/install-miktex ; https://miktex.org/howto/miktex-console ; https://docs.miktex.org/manual/miktex-xetex.html .
