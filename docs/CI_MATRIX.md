# CI evidence matrix (W01)

| Job | Environment | What it can prove | What it cannot prove |
| --- | --- | --- | --- |
| rust-native / windows-2022 | GitHub-hosted Windows Server x64 | Cargo compilation, unit tests, Clippy and build artifact | That an unsigned GUI binary launches reliably on Windows **10** |
| rust-native / macos-15 | GitHub-hosted Apple Silicon arm64 (host verified) | Cargo compilation, unit tests and ARM64 binary artifact | Correct fonts, file picker, retina preview on user's **M1/M4** hardware |
| xelatex-linux-smoke | Ubuntu 24.04 with TeX Live installed in workflow | Rust CLI invokes XeLaTeX and generates real PDFs from fixtures | Reproducible equality of TeX environment across OSes or full PGF package support |

Artifact names are deliberately not called releases. CI installs TeX only on Linux; Windows/macOS workflow jobs are **build checks** with independent real-user TeX smoke pending.

After first successful CI, pin Cargo.lock and record actual dependency and compiler versions in a release manifest. Do not mark `cargo fmt --check` green until actual CI confirms it.

## Correction: Cyrillic glyph gate (2026-10-31)

The W01 one-page Cyrillic PDF smoke at SHA `aae15fb9f425921aa0f37fc39ba6354eabc4fefa` was a **false positive**: independent QA PR #9 observed 19 missing-glyph warnings. PDF page count alone did not detect this.

The integration workpack selects DejaVu Serif, installs it on the Linux runner and uses Poppler `pdftotext` to require `Тест`, `Кириллица.`, `Точка` from the compiled CLI's PDF. It also checks input source SHA preservation, output hashes and real tool versions. This validates **one fixture on Linux**, not every Unicode glyph, all PGF extensions, visual fidelity, Windows 10 or physical M1/M4 GUI.
