# LUA_TOKEN restricted-token security research — 2026-11-06

Owner decision: administrator account supported, no new non-admin account/logon; no UAC/registry/TeX/fonts changes. Baseline main `1f585a5228c68bf79c25ae035939e505912cde98`, FREEZE FEATURES.

## Evidence and motivation

Personal Windows Server trusted-main #42214182011: exact SHA checkout, native hosted EXE/ZIP download and SHA/PE/CLI stage PASS. Dedicated runner Cargo NOT_RUN (not visible), elevated MiKTeX BLOCKED; GUI W2 and physical Windows 10 W3 NOT_RUN. Previous `CreateRestrictedToken(DISABLE_MAX_PRIVILEGE)` disabled Administrators SID but retained HIGH/inherited elevation. No UAC linked token on server built-in Administrator.

Microsoft documents LUA_TOKEN=0x4 as a distinct CreateRestrictedToken flag; we must inspect real values, not equate API success with secure execution. See https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-createrestrictedtoken and https://learn.microsoft.com/en-us/windows/win32/secauthz/restricted-tokens .

## Review scope

On a disposable hosted Windows only: create and close two temporary restricted-token handles, previous `DISABLE_MAX_PRIVILEGE` and `DISABLE_MAX_PRIVILEGE | LUA_TOKEN`, with Administrators SID deny-only. Query TokenElevation (20), TokenElevationType (18), integrity (25), session (12), enabled admin SID using temporary query-only impersonation token, and TokenUser same-account SID with EqualSid. Record both candidates distinctly, including creation-error codes; no permanent token, process spawn, thread impersonation, desktop or registry change.

Research classification `lua_token_is_non_elevated` requires no elevation, low/medium integrity, disabled admin SID, matching user SID and session. An independent JSON verifier and negative/tamper tests fail if a child or TeX is spuriously marked PASS. Even satisfying this classification is `LUA_TOKEN_INSPECTED_NO_CHILD_NO_TEX`, **not a qualified secure TeX launcher**.

Before any actual process experiment, separately review Microsoft warning about desktop message attacks, restricted desktop/window station, privilege requirements of CreateProcessAsUser, exact target binary/cwd/profile/env/handle inheritance, sandbox insufficiency, cleanup, and empirical process-level token. No trusted-main execution of this candidate on persistent personal Windows Server prior to reviewed merge. No XeLaTeX under elevated token; no installer or stable tag; Linux RC and macOS/Linux CI preserved.
