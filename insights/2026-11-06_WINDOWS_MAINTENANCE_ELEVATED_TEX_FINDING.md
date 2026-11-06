# Windows Server elevated MiKTeX maintenance incident and containment — 2026-11-06

Authoritative owner requirement: no elevated XeLaTeX, including fixed trusted fixtures, no MiKTeX warning suppression, no silent toolchain installation. Existing Administrator account remains supported; a normal admin account with a genuine non-elevated MEDIUM token is eligible. No new Windows account is required.

## Original evidence
Trusted-main personal Windows Server maintenance [run #42270086656](https://github.com/i-shutov/tikzarium/actions/runs/42270086656), SHA `aaae685970b6b59772efe7978ac8ea168c6428a6`, [artifact #13527814610](https://github.com/i-shutov/tikzarium/actions/runs/42270086656/artifacts/13527814610), outer ZIP SHA-256 `65c78c8e0c468372d6a499a70fcd9584a3755dfa82999b6501f4a18d9eab6b43`.

- Genuine Cargo/rustc 1.91.0 native offline compile/link/run on personal Windows Server 2025: PASS. A prior maintenance step provisioned private Rust; this PR never installs Rust/MSVC or requests further provisioning.
- Fixed XeLaTeX produced PDF SHA-256 `fe18fe9b403c689d1e43d38797953a851dfe30985b9ac2f3288674aa5bf123b4`. Its *original* `fixed-xelatex.json` explicitly contains `xelatex: security risk: running with elevated privileges` and `miktex-dvipdfmx: security risk: running with elevated privileges`. Warnings were not suppressed, but a TeX process DID execute elevated. This contravenes the owner safety gate, regardless of the trusted input hash, and cannot count as approved GUI/TeX/PDF.
- Physical Windows 10 and actual interactive Server GUI remain NOT_RUN.

## Correction (only after exact-head CI/review)
The shared PowerShell maintenance gate queries the **current process token**, using the already committed read-only token inspector. Under HIGH/elevated/Session0/ambiguous state it blocks both the maintenance `xelatex --version` path and the fixed PDF path *before invoking* TeX or MiKTeX inventory tools. Synthetic PS5.1 tests check filtered admin MEDIUM eligibility, HIGH DEFAULT Administrator blocking, type coercion, Session0 and unknown facts. No auto-elevation/de-elevation, alternate logon, UAC changes, warning bypass, or TeX/installer downloads. The workflow no longer passes `-ProvisionRust` or `-ProvisionMsvc`; existing Cargo can be tested in the dedicated runner cache.

Expected on present built-in Administrator with HIGH integrity: Cargo can PASS separately; MiKTeX returns ENVIRONMENT_BLOCKED_ELEVATED_OR_UNKNOWN; no PDF PASS. Project release gate stays blocked pending a separately approved same-user child launcher and real Server/Win10 interactive GUI verification.
