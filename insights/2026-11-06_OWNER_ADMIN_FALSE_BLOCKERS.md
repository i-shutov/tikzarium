# Foreground owner correction: two false blocker diagnoses

Latest owner instruction is recorded in issue108 comment6695354140 and plans/2026-11-06_OWNER_ADMIN_BLOCKER_CORRECTION.md. It supersedes the older blanket elevated-TeX refusal in historical release plans. Running the user's explicit trusted document workflow under their current Administrator account is supported; no forced elevation or OS security change is involved. Preserve visible warning and actual compiler result; do not call this a sandbox.

Original personal server artifact13538772119 (run42284584069) was downloaded and CRC/SHA checked. It contains successful Rust test/build JSON and actual EXEs. Independent objdump shows no VCRUNTIME/MSVCP imports in either server-built EXE. The error text was manufactured by a PowerShell wrapper on any nonzero python.exe exit. That wrapper never established a real Python interpreter or identified an imported DLL. Therefore neither reinstalling Cargo nor changing CRT flags addresses the observed defect.

Implemented correction: direct bounded PowerShell/.NET PE32+ and delayed-import inspection, runtime DLL rejection with actual names, original binary SHA, executable help invocation and native ZIP without Python. Negative tests reject malformed MZ/RVA/truncation, wrong subsystem and dynamic VC runtime. Actual hosted Rust CLI imports are checked independently.

The personal-server XeLaTeX check now invokes the freshly built exact-source TikZarium CLI, instead of merely proving a disconnected fixed-engine command. Existing native_process.ps1 keeps stdout, stderr and exit code separate, avoiding the PowerShell5.1 warning-as-error regression. Source/CLI/PDF SHA and unchanged installed-package inventory are recorded. PDF fonts and Unicode are audited from uploaded original bytes by a separate Linux job; physical GUI and Win10 remain NOT_RUN.

Acceptance is pending until hosted exact-head tests, review, trusted-main personal-server native proof and original uploaded PDF audit complete. No completed claim from writing this file; no account/UAC/registry/MiKTeX/font changes or FlowBridge operations.
