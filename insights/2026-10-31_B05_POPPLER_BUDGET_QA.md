# B05 — Poppler preview process QA ledger
Date 2026-10-31; branch `feat/b05-poppler-worker-budgets`, parent main `e3a78ae5646ef24994161c8ebe7bfaaf7a7d2ab6`.

## Reason
B03 invoked `Command::output()` for `pdfinfo` / `pdftoppm` with no duration budget. A tool stuck on corrupt/large input left a preview worker running indefinitely, suppressing further navigation. Captured output and PNG reading had no explicit size cap. The work is confined to `pdf_navigation.rs` to avoid integrator #24's concurrent changes to app `main.rs`.

## Implemented, source-level facts
- `run_poppler` spawns children directly, redirects stdout/stderr to scratch files, checks `try_wait` every 25ms, kills and waits on deadline.
- Budgets: `pdfinfo` 12s, `pdftoppm` 45s, captured stdout and stderr 64 KiB per stream, PNG 64 MiB compressed bytes.
- Timeouts surface explicit errors, preserving B03's fail-closed NOT_CHECKED / previous-page-retained behavior.
- A Unix mock process regression exercises capture and an infinite loop; existing parser/bounds tests stay intact.

## Test ledger
- Local Rust compiler, cargo, rustfmt: **NOT_RUN** (toolchain missing from this executor). Unit tests have been submitted, not yet asserted PASS.
- Exact PR head CI: **PENDING**, inspect Actions before asserting checks.
- Actual Windows 10 x64 GUI and physical Apple Silicon macOS GUI/screenshots: **NOT_RUN**.
- PDF page images, screenshots, PNG budget, runtime process kill with real Poppler: **NOT_RUN** until representative worker and native QA.
- Windows Server CI must not be recorded as Windows 10 GUI smoke.
- Timing is polling-granular (~25ms), not a hard real-time limit. If a child becomes unkillable in kernel I/O, `kill/wait` can still block. Raster output bytes are capped, but compressed PNG size does not bound decoded texture memory; this is a separate risk.

## Handoff
Open draft PR only on B branch; keep #10 and #24 unchanged. Integrator may merge after exact SHA CI. Request D QA on Windows 10 22H2 and macOS M1/M4 with versioned screenshots and no inferred PASS. 
