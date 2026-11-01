# I40 QA — independent lock provenance and remaining acceptance

Date: 2026-11-01. Repository: `i-shutov/tikzarium` only.

## Evidence already verified

- Source of truth before integration: main `06b62eea47591c7cb64b0a0cd0026fce8834c9e8` and current `AGENTS.md` / `plans/` / `insights/`. No replay of obsolete #37/#39/#43, no production overlap with old active #48.
- Post-merge real egui X11 run [#41281154331](https://github.com/i-shutov/tikzarium/actions/runs/41281154331), artifact `13072954180`, CRC-clean ZIP SHA-256 `48cb9ddffed42ccb71531eb75b7f9d7b59e64ddf375de5a9269fc8cfdef3018d`, yielded generated `i19-build-evidence/Cargo.lock` SHA-256 `4713fd0c29ef8718ff71316f68e5dffe43335b77857e5c7eff9771d087310503`, 94,218 bytes, 370 packages, 366 registry checksums and four local crates.
- [Import job #41282413609](https://github.com/i-shutov/tikzarium/actions/runs/41282413609): **SUCCESS**. Authenticated GitHub artifact download from exact main, both SHA-256 matches, `cargo metadata --locked`, actual Rust 1.91.0 `cargo check --workspace --all-targets --locked`, commit to integrator-owned branch. Temporary bootstrap workflow deleted afterwards.
- Offline local preflight of Python lock validator: seven adversarial checks PASS before GitHub submission; **this is not hosted CI**. Live hosted cross-platform validation remains pending final exact-head runs.

## Independent three-host artifact audit: real Windows CRLF defect (found during I40)

At first PR #71 head `67a505bb13d3e054244d751cff65e70e4e953037`, downloaded D QA lock-provenance ZIP artifacts and verified CRC/JSON. Linux `13074291464` and macOS ARM `13073982288` reported accepted raw lock SHA-256 `4713fd0c29ef8718ff71316f68e5dffe43335b77857e5c7eff9771d087310503`; hosted Windows Server `13073997302` reported **`a88dd89468c3b215fd8fd608115ef41a574c7aa9c50a3806871edf1a0ec041ad`**, although Cargo 1.91 `--locked` passed on all three and the old audit said PASS. Reproduced exactly: converting 3,805 LF line breaks of the 94,218-byte canonical lock into CRLF yields 98,023 bytes and **the Windows SHA above**. Git's text normalization masked raw checkout drift from `git diff`. A successful logical dependency resolution was being misrepresented as byte-identical cross-platform provenance.

**Corrective hard gate:** new `.gitattributes` forces only `Cargo.lock text eol=lf` (not user `.tex`/`.tikz`, which must keep their CRLF/macros). The audit additionally reads raw `git show HEAD:Cargo.lock` bytes and fails unless worktree bytes are identical; records `git_blob_sha256` and `worktree_equals_git_blob_bytes=true` only after proof. Negative tests reject CRLF conversion explicitly. Previous pre-fix Windows PASS is **not accepted as byte-provenance PASS**. Rerun across exact revised HEAD and verify all hosts report the canonical `4713...` hash before merging.

## Failure-mode gates

- Absent untracked / modified lock: FAIL, no silent `cargo generate-lockfile` fallback.
- Invalid lock v3, corrupt UTF-8/TOML, missing local workspace crate, duplicate entries, broken registry checksum: FAIL.
- Cargo metadata requires lock update after manifest edits: FAIL under `--locked`, rather than resolving new versions silently.
- Rust 1.91.0 and OS/architecture reported separately; a CI-green hosted Windows Server 2022 is **not** physical Windows 10, hosted macOS ARM64 is **not** owner's physical M1/M4.
- Binary bit-reproducibility is explicitly **NOT_VERIFIED**, physical acceptance **NOT_RUN** even when dependencies match.
- Real MiKTeX `--disable-installer` and package inventory invariance remain separate, unaffected mandatory checks.
- Figure fonts, user macros/CRLF, source preservation, C-catalogue/F1, selected libraries and exact XeLaTeX PDF remain in their own accepted domain gates.

## Remaining

Once final PR head CI completes, inspect Windows/macOS binary artifacts' lock JSON, D matrix, real MiKTeX inventory/PDF, Linux actual egui saved-source/PDF/screenshot archive. Merge with expected-head lease only if accepted, then run separate post-merge CI. Record the final SHA/checks in issue #35.

No physical Win10/MiKTeX or Mac M1/M4/XeLaTeX acceptance was performed here; no release.
