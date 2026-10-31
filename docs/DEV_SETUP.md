# Local developer setup (W01)
Prerequisites: Rust via rustup (toolchain 1.91.0 pinned by rust-toolchain.toml) and **existing local XeLaTeX** (MiKTeX or TeX Live). For exact in-app first-page PDF images, also install the optional Poppler command-line tool `pdftoppm`.

## Windows 10 x64
Use a native MSVC toolchain, not an emulated Unix GUI. Install Visual Studio Build Tools C++ and rustup, and configure your existing TeX Live/MiKTeX binaries in PATH. If needed, set `TIKZARIUM_XELATEX` to the full path of `xelatex.exe`. Check:
```powershell
xelatex --version
cargo run -p tikzarium-cli -- doctor
cargo run -p tikzarium-cli -- build examples/quickstart.tex quickstart.pdf
cargo run -p tikzarium-app
```
For inline preview, install `pdftoppm.exe` and include it in PATH; the PDF builds/exports without Poppler. Verify the user TeX tree contains `standalone.cls`, `fontspec.sty`, `tikz.sty`.

## macOS Apple Silicon
Install native aarch64 Rust toolchain, Apple developer command line tools and your XeLaTeX distribution (e.g., MacTeX/BasicTeX with required packages). Optional viewport rasterizer: `brew install poppler`.
```bash
rustc -vV
xelatex --version
cargo run -p tikzarium-cli -- doctor
cargo run -p tikzarium-cli -- build examples/quickstart.tex quickstart.pdf
cargo run -p tikzarium-app
```

## Source and status
W01 editor handles ordinary full `.tex` documents. Raw fragment-only `.tikz` requires project/preamble support in later increments; no implicit wrapping is promised here. The preview is page 1 and does not yet implement PDF page navigation. The package panel reports presence, NOT verified compilation or safe visual editing. TeX execution defaults to `-no-shell-escape` but is not a full OS sandbox.

## Troubleshooting
- `XeLaTeX missing`: verify path and the optional env override.
- `standalone.cls not found`: install its TeX distribution package, or use a document with available class.
- PDF exports but canvas blank: install Poppler `pdftoppm`; restart and choose Discover TeX.
- Fonts missing: install desired system fonts; XeLaTeX uses local system font configuration.
- Failing compilation: read TeX log, don't change compiler behind user's back.

Acceptance on actual Windows 10 and physical M1/M4 is mandatory prior to v1.0; CI hosted Windows Server/macOS binaries do not satisfy this alone.
