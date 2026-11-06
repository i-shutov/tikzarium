# Windows x64 portable CRT dependency — original PE audit, 2026-11-06

## Genuine W0 binary finding

Independently parsed PE import descriptors from the original postmerge main `34fab66f60564608fb4c05ab9746d724180f9ef9` Windows GUI and CLI in portable ZIP SHA256 `f528fa8c57765c4113bffe54a7366b805ea88952414d2220e40808710b3a364b`. Both GUI SHA256 `81d25f197619938f8e035b9b5bf98a12d2de6c39cd2eaf0edf328386ca667bd8` and CLI SHA256 `3374e66e6b4223879b827f6047b0757bd5e509b148ba5fb28916293325534046` **import VCRUNTIME140.dll**. The ZIP does not bundle it. Thus the original W0 hosted PE/ZIP/extracted-CLI PASS cannot imply first-use on clean physical Windows 10. Availability of the runtime on the user's personal Windows Server/Win10 is **UNKNOWN**, not a confirmed failure.

## One release-hardening integration candidate

Set `-C target-feature=+crt-static` for Windows x64 MSVC only. The Rust Reference documents this CRT choice: https://doc.rust-lang.org/stable/reference/linkage.html . Add direct PE import-descriptor parser (RVA-to-file mapping, real DLL names) and negative malformed/VC runtime import tests. Gate actual hosted Windows **release** GUI and CLI imports before ZIP; audit native trusted-main self-hosted binaries when Python is present. No redistributable bundling, automatic installs, TeX/Poppler changes, Linux/macOS flag changes or new feature.

**CANDIDATE / exact-head CI and original rebuilt PE imports pending.** Negative synthetic PE tests are not real OS or GUI evidence. Do not merge on code review alone: require Windows Rust build/test/PE roles/ZIP/CLI, cross-platform hosted CI, original artifacts/manual review and expected-head lease, then postmerge trusted-main. Physical W1–W3 remain NOT_RUN. Personal server Cargo absent and MiKTeX elevated-token blocks are independent and unchanged; FlowBridge untouched.
