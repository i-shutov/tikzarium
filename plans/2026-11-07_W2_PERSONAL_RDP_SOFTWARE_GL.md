# TikZarium W2: active RDP but no OpenGL 2.0 — scoped proof (2026-11-07)

## Independently reproduced root cause

Original personal Windows Server run [#42365691563, attempt 2](https://github.com/i-shutov/tikzarium/actions/runs/42365691563), original [artifact #13575141109](https://github.com/i-shutov/tikzarium/actions/runs/42365691563/artifacts/13575141109), reviewed main `d91773b8bc7a13ae782a6463b1c2a552bd7ec3de`:

- Windows Server 2025 Standard, existing HIGH Administrator Session 2, `WTSActive=0`, `WinSta0/Default` and input desktop `Default` — **RDP is no longer disconnected**.
- Original native Rust Cargo/PE/CLI and external MiKTeX proof passed. The GUI process PID6936 exited before a visible HWND. Original file `w2-interactive/gui-stderr.txt` contains: `Error: OpenGL(PainterError("egui_glow requires opengl 2.0+. "))`.
- Therefore status `BLOCKED_NO_VISIBLE_OWNED_WINDOW`, no PNG, F1 NOT_RUN. Workflow overall SUCCESS does NOT count as W2.

## Private per-application Mesa test

This branch introduces a narrow test-only software OpenGL fallback, **not a product feature or driver**:

1. Execute only from verified current `main` and successful exact-main hosted CI on existing labeled `tikzarium-winserver` personal runner.
2. After independent native W1 build, copy the same SHA-checked `tikzarium-app.exe` into a dedicated `RUNNER_TEMP/tikzarium-w2-gl-$GITHUB_RUN_ID/bin` folder.
3. Download public Mesa3D **26.2.6 MinGW x64** release and pin SHA256 `da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388` before extraction. Copy only the verified x64 DLLs alongside the private EXE. No global system OpenGL, PATH, UAC, account, MiKTeX, package, service, registry or FlowBridge changes.
4. Verify byte-exact application SHA against original native Rust report, and write SHA+DLL evidence `w2-mesa-software-gl-provenance.json` in the usual uploaded W2 output directory. Stage and child environment are strictly job-local.
5. Attempt the same real foreground/PID-owned native window and fail-closed `PrintWindow(PW_CLIENTONLY|PW_RENDERFULLCONTENT)` client PNG and F1. W2 is at most **PARTIAL** after original evidence review; six gestures, Save/Open/native dialogs/IME/DPI/GUI→PDF and physical Win10 remain separate.
6. Remove **every** temporary DLL and copied binary on success, failure or cancellation via an unconditional cleanup step before evidence upload. No Mesa DLL shipped in the Windows x64 portable ZIP.

Safety: No unreviewed PR code on personal runner; no fake W2 status from green GitHub Actions. Any download/archiver/OpenGL/desktop error remains explicitly blocked and must be investigated from original JSON/stderr. Offline existing external XeLaTeX and cargo acceptance run independently. A D3D12/wgpu product rendering fallback would be separate, reviewed architectural work.

## Required gate

Exact-head Windows/macOS/Linux CI and D QA; Rust/GUI regression + negative W2 original-evidence tests; README/PROVENANCE review; SHA-leased merge before personal execution. Inspect the resulting WTS, HWND/PID, actual original client PNG CRC/SHA, screenshot visual F1 transition. Do not claim complete W2 or Windows10 W3 from this proof.
