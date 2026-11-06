# Windows x64 admin-account and personal Server release gate — 2026-11-06

**Owner override:** only built-in Administrator exists on the personal Windows Server. TikZarium must support this and other local Administrators-group logons; a separate non-admin account is not required. MiKTeX is installed for all users. Do not disable UAC, edit registry/account policy, reinstall Rust/TeX/fonts, or touch FlowBridge runner/workspaces.

## Separate observables: account, process, child

1. **Admin group membership**, **actual process elevation** and **session type** are distinct. Windows may give an admin account a medium-integrity linked UAC token, or the built-in Administrator may have an elevated default token with **no linked limited token**. The new `qa_windows_admin_token_probe.ps1` queries current token ElevationType, TokenElevation, Integrity RID and the linked limited token (if any), plus process session. No account names/SIDs or secrets are written, no child spawned and no privileges altered.
2. Having a limited linked token is only a candidate. No production restricted-token or impersonation launch is accepted yet. It requires a separate reviewed, tested same-account, low-privilege external XeLaTeX child, source/working-directory/stdout/stderr/lifecycle handling and real MiKTeX PDF/Unicode/font acceptance. Explicitly elevated TeX remains blocked; never bypass MiKTeX warnings or silently change all of TikZarium's privileges. Built-in Administrator with no linked token must report `NO_VERIFIED_LINKED_LIMITED_TOKEN`, not request another account.
3. Administrator login normal/explicit elevated launches require separate visual first-use acceptance on personal Server then physical Windows 10. This transfer proof does NOT replace W2/W3 GUI/PDF gates.

## Cargo-free Windows artifact verification on dedicated user Server

- The only automatic self-hosted event is `workflow_run` **completed** `TikZarium CI`, filtered to successful **push** on `main`. Pull requests/forks do not schedule a self-hosted job. Manual trigger requires explicit reviewed main SHA and successful source CI run ID.
- Re-check current GitHub `main` head, local checked-out Git commit, and hosted `workflow_run` metadata via read-only API. Any stale SHA, PR trigger, failed job or unexpected workflow name refuses to stage. Workflow permissions remain read-only `contents:read, actions:read`, and runners keep serialized concurrency.
- Download two official artifacts **from that same exact run ID**: `tikzarium-windows-server-build` (original `target/release/tikzarium-app.exe` and `tikzarium-cli.exe`) and `tikzarium-windows-x64-portable-candidate` (portable ZIP and original UTF-8 audit).
- Independent Windows PowerShell verifier checks expected x64 PE32+ (GUI subsystem2, CLI subsystem3), original hosted audit and SHA, 6 exact ZIP entries, SHA256 for 5 manifest members, binary identity, no TeX/fonts bundled, exact source SHA, pinned CI run ID and native **CLI help** with TeX disabled. Staging is **not** local Cargo compilation, interactive GUI, MiKTeX/Unicode PDF or physical Windows 10 qualification. No executables downloaded from PRs.
- Retain separate local `cargo.exe` check for genuine native compilation; if absent report `NOT_RUN_CARGO_NOT_VISIBLE`, not build PASS. Preserve existing MiKTeX security gate; if runner is elevated then external user-installed XeLaTeX stays `ENVIRONMENT_BLOCKED_ELEVATED` pending reviewed same-admin child isolation.
- Save original SHA/JSON reports and server OS/session/token diagnosis. Product release, MSI, stable tag and Windows10 GUI remain blocked until real W1–W3. Linux 1.0.0-rc.1 and macOS/Linux hosted source/regressions retained.

Sources: issue #108, Microsoft's GetTokenInformation TokenLinkedToken, User Account Control split tokens and CreateRestrictedToken documentation. A restricted token is **not** assumed equivalent to a UAC filtered linked token.

No new product features, CI-only flood or unattended security-policy changes.
