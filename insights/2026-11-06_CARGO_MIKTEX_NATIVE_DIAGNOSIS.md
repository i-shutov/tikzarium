# Owner-directed Cargo / MiKTeX repair (2026-11-06)

The owner explicitly requested fixing Cargo/MiKTeX now on existing Administrator in dedicated tikzarium-winserver. Preserve system MiKTeX, UAC/accounts, and other runners.

## Actual personal-server evidence, not historical assumptions

Trusted main cceeade65527fd7cffc65d8d757bdd605cd16048 ran maintenance 42259190949 job 128034547535. Original artifact 13524336456, SHA256 c95dc17308366c4d3bcbd49f57037f82ce1cfe2dc13b5a806286720b8fd6b43d, CRC clean. Its native JSON proves `MiKTeX-XeTeX 4.18 (MiKTeX 26.5)` executes `--disable-installer --version` with EXIT CODE ZERO under built-in Administrator, Session2. The security warning stays in stderr, not suppressed. The previous claim that MiKTeX itself rejected execution was unsupported: PS5.1 stderr under ErrorActionPreference Stop produced a PowerShell exception before native exit capture. New ProcessStartInfo wrapper passes original PS5.1 warning0/warning7/timeout tests.

Cargo genuinely absent in actual PATH/profile/dedicated cache. First requested provision stopped before installation because PS5.1 Invoke-WebRequest.Content was Byte[] and `.Trim()` failed. Corrected by saving official SHA256 to a file and decoding text explicitly; added regression. findtexmf does not accept --disable-installer; use ordinary lookup without --must-exist (which would allow package installation).

## Bounded owner-directed repair continuation

Rust 1.91.0 stays isolated in dedicated runner cache with pinned rustup1.28.2, official SHA256 check and --no-modify-path. If the actual offline Cargo compile fails ONLY for missing MSVC/linker, allow signed official Microsoft C++ Build Tools and Windows SDK installation into a dedicated path, verify Microsoft Authenticode, free disk, no reboot and no machine PATH change. This is explicit requested development-tool maintenance, not a hidden app dependency installation. If Cargo compile fails for other reasons, do not install unrelated software.

MiKTeX itself must now be tested with ONE fixed reviewed maintenance source (SHA256 c281d346bc7f99abc205c337efff0215958fa1eba2affa5790b295a62f24a1a8), not a user document. Uses installed Arial, article/fontspec/tikz, no external source includes, no shell escape, --disable-installer, no warning suppression or security-setting changes, package inventory before/after and source/hash/PDF evidence. This explicitly bounded admin diagnostic does NOT relax the production guard for arbitrary elevated TeX/Poppler. Product sandbox/interactive GUI/physical Win10 remain NOT_RUN. No MiKTeX reinstall/font download, account creation, UAC or FlowBridge operation.

New native logs must prove both Cargo compilation/link/run and real fixed-source PDF before repair is called complete. The two steps are independent; final aggregate fails if either failed or was NOT_RUN. References: Microsoft PowerShell preference docs; official Rustup installation docs; official MiKTeX findtexmf/XeTeX/miktex-packages manuals; Microsoft VS Build Tools CLI documentation.
