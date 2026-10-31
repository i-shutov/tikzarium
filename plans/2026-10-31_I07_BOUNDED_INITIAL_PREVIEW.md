# I07 — bounded first-page exact PDF rasterizer

2026-10-31. Independent narrow core fix on exact `main` `c5c8c1576b6288e1d125d558d0d4872b321efb86`. B05 #25 and B06 #29 use different code paths; B06 already merged. Core `render_first_page` still used blocking `Command::status()` with no timeout and `fs::read()` with no byte budget. Even though this rasterizer runs after successful XeLaTeX, an indefinitely hanging `pdftoppm` can keep the Build receiver unresolved, never allowing GUI cancel to complete. Large compressed PNG could exhaust process memory before B06 checks dimensions.

## Implementation
- Replace blocking command .status with direct child spawn + try_wait polling, 45s wall budget, kill+wait timeout, no shell, null input/stdout/stderr (no pipes).
- Reject PNG files above 64 MiB by metadata and bounded `Read::take` on actual bytes, preserving exact compiled PDF and original TeX. Preserve XeLaTeX as the source of truth; do not silently transform PDF.
- Keep public `render_first_page` signature; no A-owned `build.rs` or extension/GUI themes touched. On raster failure return PreviewError, which existing build logic stores in optional `artifact.preview` without invalidating valid PDF.
- Regression tests: portable size boundary, missing rasterizer, Unix successful mock preserving PDF, Unix failure, Unix hung worker killed promptly. Existing Rust workspace tests execute them on hosted Linux/macOS/Windows (Unix-only mock tests skip on Windows).
- Log exact PR head and hosted CI, do not claim physical Win10/M1/M4 GUI pass. Note B05 separately bounds page navigation and B06 limits pixel decode.

## Safety limit
This does not make cancellation instantaneous while previewing; a cancelled GUI build can still take up to 45s on the first-page renderer. A cancellation token/child-process registry belongs to a later A/B integration, after A/W05 source freshness semantics stabilize. No universal RSS cap; Poppler may consume its own memory before timeout. GPU/CPU preview image copies remain B06's partial policy. `extensions/PACKAGE_MATRIX.csv` is unchanged because no feature compatibility status changed.

Acceptance: exact-head CI Rust fmt/test/clippy, native host builds and real TeX/Poppler QA; physical Windows 10 and M1/M4 `NOT_RUN` pending native sessions. No release claim.


## Integration attempt on accepted N1 main

The standalone #36 source head `4de29eda59b89400b574d0cf8cf97a76d734d203` passed Rust CI 3/3 (41188004763), D QA 7/7 (41188004747) and figure-font 1/1 (41188004774). Direct merge of #36 against `ca90c2ee685e0c997d2d90a3ac60dab9e31fdb87` was rejected by GitHub with an actual merge conflict, not forced. This integration carries its complete `preview.rs`, five tests and QA runbook verbatim; main's preview.rs blob matched the #36 pre-change baseline, while the CHANGELOG is appended without discarding newer N1 evidence. The new integration branch's own exact-head CI and post-merge main CI remain PENDING. Physical Windows 10/M1/M4 = NOT_RUN.
