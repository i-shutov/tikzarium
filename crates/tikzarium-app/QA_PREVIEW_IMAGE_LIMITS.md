# B06 — native screenshot & hostile PNG preview QA
`STATUS: NOT_RUN` on actual Windows 10 x64 and physical macOS ARM64.

Record before each run: B06 exact HEAD SHA, OS name/build and CPU, GPU/backend, display resolution and DPI/Retina scaling, XeLaTeX/Poppler versions, app hash, source TeX SHA-256, generated PDF SHA-256, UI theme/density, timestamp, screenshots and screenshot SHA-256. **Do not substitute Windows Server CI or hosted macOS compilation for physical interactive tests.**

| Case | Procedure | Acceptance criteria (not observations) |
| --- | --- | --- |
| B06-01 | Build valid 2-page `fixtures/two_pages.tex` with XeLaTeX; switch page 1→2→1 at different zooms | Both distinct pages render; no wrong-page stale epoch; TeX/PDF hashes unchanged |
| B06-02 | Generate small valid RGBA PNG fixture and feed to page-one, page-two, and font-proof preview paths in controlled test harness | Image pixels preserved, no spurious rejection; native GUI updates |
| B06-03 | Inject PNG with valid signature/IHDR dimensions 8192×8192 but tiny compressed payload into controlled preview test | Immediate rejection before decode; text error visible, old page retained |
| B06-04 | Inject truncated header, wrong IHDR type, zero dimension, oversized compressed PNG | Explicit failure with no panic, crash, phantom PASS or source/PDF mutation |
| B06-05 | Repeat Light/Dark/Midnight/Paper × compact/comfortable, switch back and restart | Preferences persist locally, PDF and TikZ content/colors never change |
| B06-06 | On Windows 10 use real Open/Save As dialogs, Cyrillic input/IME; on Mac ARM test Retina scaling and Unicode | Dialogs functional, error panel reachable; no overflow at 1366×768 |
| B06-07 | Render accepted large bitmap near 8,388,608 pixels; inspect process memory and UI responsiveness | No unbounded growth or freeze; capture measured RAM/VRAM, not inferred limits |

Use isolated/test-only renderer injection: never modify user TeX installation or persistent system PATH. Avoid saving hostile PNG as an accepted work product. For each case record PASS/FAIL/NOT_RUN with actual observation, precise build SHA and hashes. No B06 platform acceptance until physical screenshots and logs are attached.

Guard details: compressed PNG <=64 MiB, width/height 1..=8192, pixel count <=8,388,608, image-rs decode max_alloc hint 96 MiB (best effort). PNG dimensions are checked before decompression, but egui GPU and CPU copies can exceed a single bitmap's size; no total RSS guarantee.
