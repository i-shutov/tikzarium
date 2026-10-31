# I07 — first-page Poppler bound QA ledger

Date 2026-10-31. Base `c5c8c1576b6288e1d125d558d0d4872b321efb86` after B06 #29 integration. Existing `crates/tikzarium-core/src/preview.rs` performed `Command::status()` then `fs::read(...png)` with neither timeout nor file-size cap. B05 #25 is not merged at this baseline and only changes separate GUI page navigation; it cannot guard first-page preview. B06 #29 bounds pixel decode **after PNG bytes were already materialized**; it cannot prevent the initial unbounded process lifetime/read.

New `render_first_page_with_limits` uses kill+wait and 25ms polling on a 45-second production deadline, no pipes, metadata preflight plus capped read for 64MiB. Public render_first_page signature unchanged; on preview failure real PDF stays exportable. Test suite includes portable resource budget and missing-tool tests, Unix fake executable success/error/hang and exact PDF byte invariance.

| Gate | Status at authoring | Evidence |
| --- | --- | --- |
| Source-level fix | IMPLEMENTED_DRAFT | New isolated branch, no TeX input touched |
| Rust fmt and full workspace tests | PENDING | Exact-head GitHub hosted CI to inspect |
| Real XeLaTeX → PDF and Poppler | PENDING | Existing hosted Linux CI |
| D QA 3-host real XeLaTeX | PENDING | Exact-head workflow |
| Native Win10 x64 egui | NOT_RUN | hosted Windows Server != physical Win10 |
| Physical M1/M4 egui / Retina | NOT_RUN | hosted macOS ARM != physical Mac |

Known limits: no kill of possible spawned grandchildren; no OOM guarantee for Poppler's own process; no synchronous cancellation token integration, so preview may continue to its 45s maximum. Release and all-packages visual compatibility remain unclaimed. LuaTeX graphdrawing is not XeLaTeX-native.
