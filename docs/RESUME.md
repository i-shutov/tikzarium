# TikZarium — release resume, 2026-11-08

**Trusted main:** `ef95c1c9ef1ac2b311a654c1daac53c97c8d7ef9`. PR #132/#133/#134 merged, original hosted Windows/macOS/Linux exact-main workflows PASS. Existing personal native Rust/MiKTeX W1 was accepted on a prior trusted SHA; current-main W1 final build/PDF audit still in progress at [run #42460198175](https://github.com/i-shutov/tikzarium/actions/runs/42460198175). Do not infer its outcome from W2a.

## W2a genuine physical acceptance: PASS

Original personal Windows Server early artifact **13609526883** in [run #42460198175](https://github.com/i-shutov/tikzarium/actions/runs/42460198175), ZIP SHA256 `1a238945a8b9007d9be4b21198b1ebad9c8378a4ccda996d38e2ea3d797a6b1b`. Verified the original JSON and both PNGs with current independent geometry/decoded-pixel auditor and visual review: existing HIGH Administrator, RDP Session2 WTSActive0/WinSta0/Default, own GUI PID8440/HWND2294498, first-attempt stable foreground525ms, no AttachThreadInput. Complete **1475×850 physical client pixels at 125%/DPI120**, same dimensions before and after, restored per-monitor-v2 DPI context, zero unpainted pixels, right Properties/Help and bottom status fully visible, real F1 opens Russian Справка. Own client PrintWindow only, no desktop pixels. Earlier 1180×680 historical screenshot from 9c721242 was cropped and is intentionally rejected.

## Release gates

| Gate | State |
|---|---|
| W0 Windows x64 release candidate/PE/manifest | **PASS** (hosted exact main #42459875159) |
| W1 native personal Server Rust/MiKTeX PDF | Previously **PASS**, exact SHA current-run final **IN_PROGRESS** |
| W2a own HWND/F1 complete physical 125% screenshot | **PASS** (original artifact 13609526883) |
| W2b six true GUI gestures, source/Undo, Save/Open, native dialogs, IME, GUI→XeLaTeX PDF | **NOT_RUN** |
| W3 separate actual Windows 10 x64 native GPU/GUI/IME/DPI/full PDF | **NOT_RUN** |
| W4 clean installation/uninstall, signed-status disclosure, stable tag | **NO-GO** |

## Resolved historical defects

PR #132 removed synchronous TeX discovery from GUI loop, solving NO_FOREGROUND_WINDOW. PR #133 fixed virtualized 125% screenshot cropping via bounded native PMv2 and context restoration. PR #134 hardened 105 optimized-Python assertions, verified actual decoded opaque pixels and prevented metadata-only F1 false changes. The old [canceled #42453220928](https://github.com/i-shutov/tikzarium/actions/runs/42453220928) lost artifact uploads/logs; current early upload succeeds. Root cause of earlier intermittent transport issue **not established**, pending final W1 upload + read-only diagnostics.

## Boundaries and next steps

Do not change main during its personal exact-SHA run. Owner's HIGH Administrator is allowed for trusted TeX, not a sandbox; no UAC, registry, new accounts, automatic TeX/package/fonts or system drivers, nor FlowBridge modifications. Temporary pinned Mesa is QA-only, removed after test, never distributed.

Next: review personal final Rust/MiKTeX/transport evidence, then run full physical Server W2b and independent native Windows10 W3. Only release stable v1.0.0 after W2b+W3 and tested clean-install/uninstall/W4. See [canonical gate](WINDOWS_1_0_RELEASE_CONTROL_RU.md).
