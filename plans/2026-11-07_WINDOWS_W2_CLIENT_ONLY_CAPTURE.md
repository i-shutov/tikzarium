# Windows W2 original GUI screenshot: owned client-area capture (2026-11-07)

## Exact baseline

Main `8a79fb0a2c9a0e4ed1f4aad19042d86f916c11e5` passed reviewed hosted real Windows GUI and F1 in PR #124 under hash-pinned disposable Mesa llvmpipe; screenshots proved the feature but included narrow *desktop/taskbar* pixels at DWM non-client margins because the prior code used `GetWindowRect + CopyFromScreen`. This is recorded as issue #126. Owner's trusted-main Windows Server W1 Rust/Cargo/native CLI→existing MiKTeX PDF is independently PASS; the real owner GUI W2 remains BLOCKED by WTS session 2 disconnected/input desktop unavailable. W3 real physical Windows10 remains NOT_RUN.

## Repair and minimal authority

Add `qa_windows_owned_client_capture.ps1` to request **only the specific owned HWND's client area** using Win32 `GetClientRect`, `ClientToScreen`, and `PrintWindow(PW_CLIENTONLY | PW_RENDERFULLCONTENT)` into a private memory bitmap. Recheck process PID, foreground, window visibility and unlocked Default input desktop immediately before every frame. Never read pixels from the desktop DC, use `BitBlt`, `CopyFromScreen` or silently fall back to capturing the screen.

Because GPU/OpenGL applications may not implement usable WM_PRINTCLIENT rendering, treat a failed `PrintWindow`, unpainted magenta sentinel, flat/blank frame or invalid client dimensions as a **blocked/failed QA proof**, not a GUI pass. Add independent original PNG size/CRC/SHA and client-only method checks; reject old outer-window screenshots falsely labeled as privacy safe, physical Win10 PASS, foreign process/locked desktop and fabricated F1 screenshot deltas. Need original hosted real GUI before/after F1 PNG inspected visually. Do not claim proof merely because `PrintWindow` returns nonzero.

## Integration gates

First validate candidate only on disposable GitHub-hosted Windows 2022, with its test-only hash-pinned Mesa software OpenGL; preserve actual app executable hash and no bundled DLLs in release. Do not run PR code on owner's persistent runner. Once real client-only capture works and exact-head Windows/macOS/Linux CI is green, integrate the same helper into trusted-main-only Server W2 script and its independent uploaded-evidence validator. If PrintWindow cannot capture real egui/OpenGL, do not expose personal desktop through a screen-copy fallback; investigate Windows.Graphics.Capture scoped to a verified HWND or a native in-app diagnostic export under a separate proof. No change to release GUI renderer, user accounts, registry, UAC, MiKTeX, Cargo or FlowBridge.

**Acceptance**: exact reviewed SHA; original nonblank client PNG before/after F1; screenshot rectangle strictly smaller than outer HWND bounds; original F1 Help-tab visual transition; no desktop/taskbar pixels; independent upload SHA/PNG checks; no personal W2/Win10 PASS until genuine physical desktop acceptance. A failed hosted PrintWindow test is a valid research result, not permission to weaken the gate.
