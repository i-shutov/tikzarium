# W2: foreground resolved; physical-pixel capture correction

## Exact original personal evidence

Main9c72124257415daace327ceff5c3da59bdd497d4, PR132, Server run42450616810, early artifact13606185205, ZIP SHA25631fd68814124f2d4254c3ff34d42fba3579e0bc27090fe760a21b9fa18718434. Original distributed EXE SHA256b6366e958399c5b47a09f902772020983dd7b571ce19e7975b17445ff3a37ffa matches exact-main CI42450216354 portable. Windows Server2025 build26100, existing HIGH Administrator, active Session2/WinSta0/Default. Owned PID1652/HWND4128904 responsive/stable foreground on first attempt705ms; no queue attachment; F1 images differ and owned child terminated. This resolves the old foreground blocker, not full W2.

Visual review of original1180x680 PNGs atDPI120 exposed truncated right Inspector/Help and bottom status. Before SHA256c47d9bb69fb30a2c6eebf1949237a8a1c2c9eba8a05859c82fe1feb53cefc534; after SHA2563a4bda4149846d90085831df01a77d9c1bc13e9c909644883af4a6562b017099. Existing CRC/hash checks passed because both declared and allocated geometry were DPI-virtualized. Preserve originals unchanged; no full-W2a visual acceptance yet.

## Narrow fix, not product expansion

Use native C# SetThreadDpiAwarenessContext(PER_MONITOR_AWARE_V2) with finally restoring and verifying the prior context. Measure own HWND/client/origin/monitor and render PrintWindow in the same physical-pixel scope. No hardcoded1.25 multiplication, screenshot upscaling, global DPI, new app windows or account/UAC/MiKTeX/RDP changes. Every capture rechecks own PID/session/foreground/unlocked Default and unchanged geometry. Hosted-only own-window reposition stays constrained to disposable GitHub-hosted runners; personal window is never moved.

Schema3 records native window DPI, physical bounds, actual HWND/PID and scope-restored proof for initial measurement and both captures. Independent auditor rejects non100%-DPI legacy reports without physical proof, inconsistent client/window/monitor bounds, scope leaks and cropped image dimensions. Native PS5.1 tests exercise unaware/system/PMv2 caller contexts, both success and rejected HWND, and always restore the original caller context.

## Acceptance

1. Python negative regressions; explicit rejection of the original cropped125% JSON.
2. Real PowerShell5.1 C# compilation and six native context-restoration cases; genuine hosted Windows/F1 and slow-discovery GUI still pass.
3. Expected-head squash merge only after exact-head checks and previous personal run finishes. Product Rust/app tree unchanged.
4. Exact-main CI, then personal125% original schema3 JSON+two full client PNGs. Inspect right Help/Properties and bottom status, actual foreground, no attachment, all CRC/SHA and original EXE binding. No acceptance from metadata alone.
5. Full personal W2b, physical Windows10 W3, installer/stable W4 remain required separately.

## Primary references

Microsoft high-DPI development, virtualization and raw pixels: https://learn.microsoft.com/en-us/windows/win32/hidpi/high-dpi-desktop-application-development-on-windows
Microsoft SetThreadDpiAwarenessContext and restoration of returned prior context: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setthreaddpiawarenesscontext
