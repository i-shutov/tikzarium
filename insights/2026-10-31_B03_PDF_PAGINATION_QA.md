# B03 PDF navigation — engineering findings and evidence ledger

Date: 2026-10-31. Repository `i-shutov/tikzarium`; base main `f2a55fa13fd9a1e0af2718bc328ed16786975184`.

## Snapshot at start
- #16 F01/U01 merged; the GUI already has four persistent themes, density and an independent font proof. Reuse existing implementation without duplicating its files.
- Active integration #17, A XeLaTeX diagnostics #10 and A glyph audit #18 remain outside B ownership.
- Existing GUI has exact first-page PDF bitmap and last-good stale protection, but explicitly **no** page count/navigation.
- Core preview API is first-page only. B03 implements isolated optional Poppler workers in `crates/tikzarium-app` without changing core.

## Design decision
Use `pdfinfo` to read `Pages:` (one-based, positive only) and `pdftoppm -f N -l N -singlefile -png` to rasterize an individually selected page into a temporary directory. Both processes are spawned directly without a shell. All page controls operate on a known good `BuildArtifact.pdf`, **not** an on-disk PDF guessed from the current TeX pathname. A preview epoch increments whenever a new file opens or a new build completes; late outputs are ignored. Failure leaves the displayed image unchanged.

A stale last-good PDF is still browsable for comparison but cannot be exported. No evidence of freshness is inferred from unchanged TeX source if external includes changed: this pre-existing dependency limitation remains.

## Current QA (do not overclaim)
- Code and source-level tests submitted: page-count parser for valid/invalid fields; bounds/unknown total; invalid page 0.
- This executor has `git` but **no** `cargo`, `rustc` or `rustfmt`, and no network to clone source from GitHub. Hence local Rust fmt/check/test/clippy = **NOT_RUN**.
- No user-session Windows 10 or Mac M1/M4 display is attached; native dialogs, keyboard, Retina, IME, themes and page screenshots = **NOT_RUN**.
- No actual multi-page XeLaTeX fixture was compiled from this executor: functional page 2 verification = **NOT_RUN**. GitHub CI evidence must be pinned to this PR's exact HEAD before any hosted PASS claim.
- `pdfinfo` absence shows Page 1/? with disabled navigation and a NOT_CHECKED reason. `pdftoppm` failure preserves the previous image.

## Next executable QA blocks
1. Inspect PR B03 exact-SHA GitHub Actions jobs; fix any rustfmt/compilation/Clippy findings on B-only paths.
2. Add optional headless Poppler page-2 fixture to the B lane after an agreed CI executor is available; preserve first/second PNG and source hash.
3. Run physically on Windows 10 22H2 x64 and Apple Silicon macOS ARM64 at 1366x768 and Retina; attach dated screenshots, font/TeX versions and hash manifest. Never equate Windows Server CI with Windows 10.
