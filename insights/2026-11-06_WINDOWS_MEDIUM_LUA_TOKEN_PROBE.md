# Same-Administrator temporary MEDIUM LUA token — Windows security research, 2026-11-06

Baseline trusted main: `8dd09e8e13e82a7a34e7da4f9e29b14be77b3474`. Postmerge native hosted Windows/macOS/Linux CI #42229540371: three jobs SUCCESS. Earlier hosted LUA experiment demonstrated TokenElevation=false but HIGH integrity 12288. Neither baseline restricted-token variant was acceptable for XeLaTeX. Built-in Administrator on the personal Server has HIGH/DEFAULT and no linked UAC token.

## Research-only implementation

On disposable hosted Windows, independently open a new TOKEN_QUERY|TOKEN_DUPLICATE|TOKEN_ADJUST_DEFAULT handle, derive a *third* temporary CreateRestrictedToken(DISABLE_MAX_PRIVILEGE|LUA_TOKEN) token, attempt SetTokenInformation(TokenIntegrityLevel) using the MEDIUM integrity SID S-1-16-8192 and SE_GROUP_INTEGRITY, re-read actual elevation, RID, admin membership, user SID and session; close token handles. Prior restricted-token variants stay separate. Explicit JSON schema v2 records creation/set errors and all readback fields; negative tests reject inconsistent or forged approval claims. Neither parent process nor registry/UAC/accounts are modified.

**No child, TeX, Poppler or desktop is launched.** A potential MEDIUM/non-elevated token is *not* an approved safe launcher: Microsoft cautions against restricted processes on the default desktop. Require isolated-desktop, access-rights/ACL negative tests and real child security review on disposable Windows before even considering same-account production XeLaTeX. Do not run PR/fork code on personal Server. No PDF/GUI claim.

## Release status

W1 personal Server PE/ZIP/CLI PASS on trusted-main, Cargo ENVIRONMENT_BLOCKED (runner PATH), MiKTeX BLOCKED_ELEVATED. W2 interactive admin GUI/TeX/PDF NOT_RUN; W3 physical Win10 NOT_RUN; Windows stable/installer forbidden. Linux 1.0.0-rc.1 remains accepted, physical Linux R4 NOT_RUN; macOS CI and FlowBridge isolation preserved. Exact-head CI, native JSON/original ZIP and manual review are required before merge.

Primary references: https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-settokeninformation ; https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-createrestrictedtoken ; https://learn.microsoft.com/en-us/windows/win32/secauthz/restricted-tokens .
