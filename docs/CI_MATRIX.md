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

## Integrated QA and extension evidence gates (2026-10-31)

- PR #9 added a separate D QA workflow with **real XeLaTeX compiler execution** on hosted Ubuntu 24.04, Windows Server 2022 x64, and macOS-15 ARM64; six jobs passed at branch SHA `14a6879a350b4647ed03215abc12dd2839cfe8ab`: https://github.com/i-shutov/tikzarium/actions/runs/41173898838. This is a stronger compiler gate than Rust-only native CI, but remains hosted infrastructure, not the user's Windows **10** or M1/M4 desktop GUI acceptance.
- PR #16 added an independent Linux `fontspec`/`unicode-math` proof, extracted Cyrillic phrases and `pdffonts` embedding checks: https://github.com/i-shutov/tikzarium/actions/runs/41173786603. That test does not prove comprehensive installed-font discovery or a physical GUI session.
- PRs #7/#13 added `extensions/PACKAGE_MATRIX.csv` and fixture observation parsing. Default `NOT_PROBED` / `NOT_TESTED` is intentional; the existence of a TOML manifest or local package does not prove XeLaTeX compilation or egui visual editing. LuaTeX-only graphdrawing remains `INCOMPATIBLE_ENGINE`.
- Integrated main after C02: `f2a55fa13fd9a1e0af2718bc328ed16786975184`. Verify post-merge workflow on **this exact SHA** before claiming integrated PASS. Missing physical smoke blocks release acceptance.

## I06 — source-preserving clean Save / Build (proposed, unmerged)

Both the native build CI and 3-host D Rust QA matrix explicitly run `cargo test -p tikzarium-core document::tests -- --nocapture`. Tests reject external source changes and deleted source, preserve clean source file bytes and Unix inode, reject replacing symlink and read-only paths, and allow explicit Save As to a new path. This does **not** attest an actual egui Save dialog, a real Windows 10 machine, or physical M1/M4; record native screenshots and hashes separately. Rust CI statuses are PENDING until exact I06 branch-head jobs complete. The tests do not assert race-free inter-process save semantics.


## I10 — exact-main MiKTeX / C/N2 integration ledger (2026-10-31)

| Gate | Positive evidence | Explicit limitation |
| --- | --- | --- |
| D07 real MiKTeX 25.12 on hosted Windows Server 2022 | Exact D head `69387a23`: [41201660165](https://github.com/i-shutov/tikzarium/actions/runs/41201660165), artifact `13043002420`, real installer, AutoInstall=0, 9,130 identical inventory rows, six real PDFs, Cyrillic/math/embedded fonts | Hosted Windows Server is NOT Windows 10 x64; no native GUI or physical hardware |
| C/N2 import/disconnect code | Exact C head `3d64c608`: [Rust 41202090696](https://github.com/i-shutov/tikzarium/actions/runs/41202090696), [D QA 41202090692](https://github.com/i-shutov/tikzarium/actions/runs/41202090692), reversible byte-range tests with unknown macros/CRLF | Removal is a proposed source edit, not TeX package uninstallation or executed GUI confirm/undo |
| N1 generated source + XeLaTeX | [41202090704](https://github.com/i-shutov/tikzarium/actions/runs/41202090704), artifact `13043022726`, original-source SHA and actual rendered PDF checked | App Session proof, not pointer actions or Windows 10/M1/M4 GUI |
| Post-merge main `6d15d86344ab1281391d3ea1b458dc18ae443985` | [Rust 41203529736](https://github.com/i-shutov/tikzarium/actions/runs/41203529736), [D QA 41203529679](https://github.com/i-shutov/tikzarium/actions/runs/41203529679), [real MiKTeX 41203529698](https://github.com/i-shutov/tikzarium/actions/runs/41203529698) | All three completed SUCCESS on exact merged SHA; reviewed artifact 13044230534 (SHA-256 0c6f7a1a...), six genuine MiKTeX PDFs, 9,130 identical packages. No physical GUI proof |
| Physical target desktop | None | Win10 x64 MiKTeX, Mac M1/M4 external XeLaTeX: NOT_RUN |

The five dimensions *package installed*, *project loaded*, *engine-compatible*, *tool implemented*, and *help available* must remain separately reported. External `\usetikzlibrary` changes must appear in a visible, undoable TeX diff. Figure fontspec/unicode-math is independent of persistent GUI themes. No Lua-only compatibility is inferred.

## I11 — missing C04/C06 catalogue gate restored (PENDING)

Main before I11 had `run_smoke.py` / `verify_smoke.py` but lacked `verify_catalog.py` and its 14 tamper tests, despite historical PR #26/#34. This additive integration runs the actual static manifest/matrix/fixture verifier in Linux XeLaTeX CI and 3 hosted D Rust-quality jobs; all three publish `qa-catalog-metadata-<OS>` JSON. An accepted static report does not prove package installation, XeLaTeX compilation of all extensions, GUI editability, physical Win10/MiKTeX or Mac M1/M4. Validate this branch's exact-HEAD CI and JSON before accepting, then main post-merge independently.
