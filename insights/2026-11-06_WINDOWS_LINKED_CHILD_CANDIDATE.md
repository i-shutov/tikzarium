# Windows UAC linked-token suspended-child capability research — 2026-11-06

Baseline main c39f9990195e9d3a3d913e5da187e4b65bcc46b8: hosted postmerge CI #42184285569 SUCCESS. Trusted main personal Server #42189672211 uploaded original W1 portable PE/ZIP/CLI PASS but local Cargo NOT_RUN and MiKTeX/PDF ENVIRONMENT_BLOCKED_ELEVATED. Its full HIGH DEFAULT token has NO_UAC_LINKED_TOKEN; W2 interactive GUI and physical Win10 W3 NOT_RUN. Hosted D QA/MiKTeX refused elevated process early, correct blocked rather than PDF pass.

Microsoft APIs: GetTokenInformation(TokenElevation, TokenElevationType, TokenIntegrityLevel, TokenLinkedToken) and CreateProcessWithTokenW. The latter may fail without SeImpersonatePrivilege. Only an actual linked token at limited/non-elevated/medium integrity, belonging to the SAME user, is considered for an experiment. The actual child is created suspended and its token inspected. It is always terminated without resuming, so this is not a XeLaTeX process-launch implementation. In particular CreateRestrictedToken alone did not lower elevation/HIGH in prior original hosted research.

Result of this new candidate: PENDING fresh exact-head hosted Windows JSON and original job logs. No claim of TeX/PDF/GUI PASS or secure sandbox. No changes to personal Server or any Windows accounts, UAC, system-wide MiKTeX, FlowBridge, Linux RC/macOS CI. No installer/stable tag.
