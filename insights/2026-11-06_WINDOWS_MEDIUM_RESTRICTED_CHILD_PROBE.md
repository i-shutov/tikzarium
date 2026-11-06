# Restricted MEDIUM child-process feasibility — hosted Windows ONLY (2026-11-06)

Owner's Windows ADMIN-account policy remains authoritative; existing built-in Administrator on the personal Windows Server has HIGH/DEFAULT token and no UAC linked token. The preceding exact-main research (#115, `6402361dfc9e54ccd49b607d5f757daf00caa564`) established only that a third temporary LUA restricted token could be lowered to MEDIUM. That token alone is NOT a safe external TeX launcher.

## Independent experiment

New disposable-hosted Windows QA does a **narrow non-TeX process-feasibility experiment**. It derives a NEW temporary `CreateRestrictedToken(DISABLE_MAX_PRIVILEGE|LUA_TOKEN)` from the same account, turns its integrity to MEDIUM, independently remeasures elevation, SID, session, enabled Administrators role, and `IsTokenRestricted`. Only if all match does it call `CreateProcessAsUserW` on the fixed Windows System32 `whoami.exe`, using `CREATE_SUSPENDED|CREATE_NO_WINDOW`, `bInheritHandles=false`, and `lpDesktop=null`; it never resumes the primary thread. It then opens the genuine child process token, checks actual security facts, calls `TerminateProcess`, waits for termination and closes handles. It does not request an interactive desktop or modify workstation/desktop DACLs, UAC, registry, accounts, MiKTeX or fonts.

The validator rejects fabricated green states, unsafe privilege/integrity, mismatched users/sessions, unconfirmed termination and every attempt to claim PDF, ACL proof or desktop isolation. If Windows denies `CreateProcessAsUserW` (e.g. privilege 1314) the proper result is BLOCKED, not a fallback to elevated launch or a new logon.

**Critical boundary:** even if the suspended child can be created and inspected, this is not evidence of running a live process safely, isolation from privileged desktop messages, access to user project/temp paths, filtered token suitability for MiKTeX, font embedding, or physical Win10/Server GUI. `DesktopIsolationVerified=false` and `ApprovedLauncher=false` are immutable. No TeX/Poppler is run.

Production design must separately qualify a dedicated desktop/window-station ACL, narrowly granted project/temp access, safe environment and handle inheritance, offline XeLaTeX execution, process-tree cancellation, and true interactive user QA on both physical Windows 10 and personal Server. Until then W1 TeX is BLOCKED_ELEVATED; W2/W3 GUI/PDF NOT_RUN; Cargo under server runner is an independent ENVIRONMENT_BLOCKED. The accepted Linux 1.0.0-rc.1 and Linux/macOS CI remain unchanged; no stable/installer/FlowBridge impact.

Microsoft references: https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessasuserw and https://learn.microsoft.com/en-us/windows/win32/secauthz/restricted-tokens .

## Original exact-head observation and correction

At PR #116 commit `63ebb761061dc1d3505996e8944b26b4168c0d91`, hosted Windows CI #42257640767 completed 3/3 but the original `windows-medium-child-candidate.json` recorded `BLOCKED_CANDIDATE_FACTS` with `CandidateIsRestricted=false`, `CandidateElevated=false`, integrity 8192, Administrators role disabled, same SID/session. The suspended-child API **was not reached**: `SuspendedCreated=false`.

Microsoft's `IsTokenRestricted` documentation says the API checks **only the restricting-SID list** and returns FALSE when that list is empty, even for a token produced by `CreateRestrictedToken`. This probe deliberately supplied `RestrictedSidCount=0` while disabling Administrators SID and removing privileges. Accordingly, `IsTokenRestricted=false` is expected and cannot be treated as proof of elevation or an absence of privilege reduction. The candidate gate now expects FALSE *in addition to* independently verified non-elevation, MEDIUM integrity, non-enabled Administrator SID, same user/session and a successful restricted-token derivation. The child-token gate independently applies the same measurements. The validator's positive-path fixture and negative tests encode these exact API semantics; it still forbids claims of desktop isolation or approved TeX execution.

This resolves a **false blocker in the research gate only**. It does not prove `CreateProcessAsUserW` succeeds, nor that a child can safely run, nor that the parent UAC/Admin security model is safe for TeX. Any subsequent Windows run must be read from its **new original JSON**, not inferred from CI success. Reference: https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-istokenrestricted .

## Follow-up original artifact on corrected semantics

The first corrected-gate run (head `cc881bb89d2300330ec8671c4be32b59b29bb927`, hosted CI #42266017364, original child research artifact `13526743435`, ZIP SHA-256 `8f9617b01686a3c94da83fe508633fa3ebcbc5165e19c074ed3b190b16498444`) passed the CI step but returned **`BLOCKED_PROBE_EXCEPTION`** with only the PowerShell wrapper type `MethodInvocationException`. This is not child-process feasibility evidence. We cannot assert child creation/termination, token facts or a native error from this artifact. The generic wrapper made the reported blocker unactionable.

The follow-up in this same draft PR unwraps nested PowerShell/C# exceptions and records the root error type, numeric Win32 code (when present) and a fixed non-sensitive probe stage. Parent/child cleanup paths preserve the original failure stage unless cleanup itself throws. The Python classifier rejects generic wrappers and missing diagnostic stage; new tests cover these negative paths. The next exact-head original JSON must still be inspected before any decision to merge. No TeX execution, approval, or personal Server PR execution.
