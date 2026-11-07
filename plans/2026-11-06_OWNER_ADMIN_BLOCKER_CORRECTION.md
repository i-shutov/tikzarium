# Latest owner correction: Windows Administrator works, fix our false blockers

Owner decision in foreground, 2026-11-06: support ordinary operation in the existing Administrator account, including a HIGH/elevated process. The prior unconditional elevated-token refusal was a project policy, not an operating-system or MiKTeX prohibition. This decision supersedes earlier same-user-filtered-child release requirements in AGENTS.md, issue108 and old automation prompts. No new user, UAC/registry/account change, MiKTeX reinstall, font installation or privilege escalation. Preserve actual warnings, disabled shell escape/offline package policy and bounded children. This is current-user execution, NOT an OS sandbox; untrusted documents should not be compiled as Administrator.

## Original evidence that changes the diagnosis

Personal-server run 42284584069 artifact13538772119, outer SHA256 51a84cd83d637508911a4264c6f03f0fd080cede9e5557fe037c4e7148da76fc: Rust tests and release build actually PASS. Independent objdump on original server-built GUI f0dc667d7de79b456f2e83c3b125933ac523d321e03b34b680a4cd1e51995a10 and CLI 5d4d51754e891aaacd34781f93920305c3ac6fa7b7407e39191dd63e4f719ee8 confirms AMD64, GUI2/CLI3, no VCRUNTIME/MSVCP imports. The old script calls an unverified python.exe and converts every nonzero status to a CRT error; the job log contains only Python before this error. This does NOT establish an actual CRT defect or broken Cargo installation.

## Correction and proof

1. Keep read-only token measurement. Support current-user LOW/MEDIUM/HIGH in product; warn for HIGH/elevated instead of blocking. Unknown/SYSTEM remain distinct unsupported states. Do not alter the OS token or security settings.
2. Replace personal-server Python-dependent PE check with bounded PowerShell/.NET PE32+ import inspection, including delay-import descriptors and negative fixtures. Native Rust/test/build, PE audit and actual CLI execution have independent evidence. Native archive uses built-in Compress-Archive.
3. Use existing native_process.ps1 for native version/inventory/build calls: stdout/stderr are data, retain original native exit status. No PowerShell5.1 2>&1 warning-as-exception regression.
4. Compile a checked-in Cyrillic/Arial TikZ fixture through the actual freshly built TikZarium CLI, using existing system MiKTeX, no package installation. Validate source and executable SHA; save original PDF/logs and before/after inventory.
5. Independently audit uploaded original PDF on disposable Linux: SHA, one page, every font embedded with Unicode mapping, Cyrillic extraction. This does not qualify desktop GUI or physical Windows10.

Branch base: f2767555ee5d501f6f8ed207e3d5cb89f0ce1685 (PR113 merged). Hosted tests before reviewed expected-head merge; persistent runner executes only trusted main. FlowBridge and other repositories excluded. No blind reruns, new features, installer or stable release. Do not claim this block resolved until actual trusted-main server evidence and uploaded PDF audit complete.
