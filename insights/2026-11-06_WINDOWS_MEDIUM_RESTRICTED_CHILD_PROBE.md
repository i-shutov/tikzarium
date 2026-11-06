# Restricted MEDIUM child-process feasibility — hosted Windows ONLY (2026-11-06)

Owner's Windows ADMIN-account policy remains authoritative; existing built-in Administrator on the personal Windows Server has HIGH/DEFAULT token and no UAC linked token. The preceding exact-main research (#115, `6402361dfc9e54ccd49b607d5f757daf00caa564`) established only that a third temporary LUA restricted token could be lowered to MEDIUM. That token alone is NOT a safe external TeX launcher.

## Independent experiment

New disposable-hosted Windows QA does a **narrow non-TeX process-feasibility experiment**. It derives a NEW temporary `CreateRestrictedToken(DISABLE_MAX_PRIVILEGE|LUA_TOKEN)` from the same account, turns its integrity to MEDIUM, independently remeasures elevation, SID, session, enabled Administrators role, and `IsTokenRestricted`. Only if all match does it call `CreateProcessAsUserW` on the fixed Windows System32 `whoami.exe`, using `CREATE_SUSPENDED|CREATE_NO_WINDOW`, `bInheritHandles=false`, and `lpDesktop=null`; it never resumes the primary thread. It then opens the genuine child process token, checks actual security facts, calls `TerminateProcess`, waits for termination and closes handles. It does not request an interactive desktop or modify workstation/desktop DACLs, UAC, registry, accounts, MiKTeX or fonts.

The validator rejects fabricated green states, unsafe privilege/integrity, mismatched users/sessions, unconfirmed termination and every attempt to claim PDF, ACL proof or desktop isolation. If Windows denies `CreateProcessAsUserW` (e.g. privilege 1314) the proper result is BLOCKED, not a fallback to elevated launch or a new logon.

**Critical boundary:** even if the suspended child can be created and inspected, this is not evidence of running a live process safely, isolation from privileged desktop messages, access to user project/temp paths, filtered token suitability for MiKTeX, font embedding, or physical Win10/Server GUI. `DesktopIsolationVerified=false` and `ApprovedLauncher=false` are immutable. No TeX/Poppler is run.

Production design must separately qualify a dedicated desktop/window-station ACL, narrowly granted project/temp access, safe environment and handle inheritance, offline XeLaTeX execution, process-tree cancellation, and true interactive user QA on both physical Windows 10 and personal Server. Until then W1 TeX is BLOCKED_ELEVATED; W2/W3 GUI/PDF NOT_RUN; Cargo under server runner is an independent ENVIRONMENT_BLOCKED. The accepted Linux 1.0.0-rc.1 and Linux/macOS CI remain unchanged; no stable/installer/FlowBridge impact.

Microsoft references: https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessasuserw and https://learn.microsoft.com/en-us/windows/win32/secauthz/restricted-tokens .
