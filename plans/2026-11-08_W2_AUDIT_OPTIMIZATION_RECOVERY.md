# W2 recovery and independently enforceable uploaded-evidence gates

## Recovered baseline and scope

Upstream `main`: `26cf786d96fe34e809dd263824e9fee6309cadfb`; complete tree `233fe4cad2640b2e879b9f16bf49d364c804a465`. Recovery used original preparation artifact13605619053 (SHA2565154d31128efb6ff732053ef2f2706a7284e72fbf6cf9e24f5f3667f2fd1f6f3), the final native-scope workflow step, and the original executable bit. Every tracked byte/path/mode was independently matched by the complete Git tree hash, not by trusting the preparation commit label.

This patch is LOCAL and NOT merged or deployed. The current GitHub tool surface provides reads/downloads, not branch/file writes, cancellation or re-runs. Preserve that distinction in all status reports. Product Rust, Cargo.lock, TeX settings, Administrator support, capture privacy and other repositories remain unchanged.

## Reproduced defects

1. Under `python -O`, 16 of19 original server-evidence regressions failed because invalid evidence no longer raised an error. Nine of10 original DPI-geometry regressions also failed. These are reproducible flaws in the exact recovered main, not host prerequisites.
2. PNG auditors checked CRC/chunk dimensions but did not decode pixels. A genuinely black screenshot with a fabricated color-count field passed the original positive fixture. F1 was inferred from different compressed-file hashes: metadata-only PNG changes could pass without any rendered change.
3. Full scripts/tests discovery on unchanged main produced2 failures in80 tests: historical I53/I57 tests still demanded automatic main triggers, contrary to the intentionally retired B41 coordinate profiles and the current I61 gate. Do not re-enable historical geometry on main merely to satisfy obsolete literals.

## Implemented local repair

- Replace105 optimization-sensitive `assert` gates in both upload auditors and shared DPI validation with explicitly raised `EvidenceError`. Preserve `AssertionError` compatibility for existing negative tests; no validation disappears under `-O`/`-OO`.
- Independently decode original8-bit RGB/RGBA non-interlaced PNGs with stdlib only, CRC and chunk-order validation, bounded compressed/decompressed sizes, exact zlib termination and all5 PNG filters. Reject actual blank/nonopaque frames and unknown critical chunks; do not trust reported sample colors alone.
- Compare canonical visible-pixel hashes for F1, not encoded PNG hashes alone. Preserve original file SHA checks. Require human visual review and keep fullW2/physicalWin10 NOT_RUN.
- Validate original source SHA, known report schema and F1 state. Reject original cropped125% evidence even under optimized Python.
- Retain I53/I57 historical tree leases and manual dispatch; tests independently require the current I61 main/PR gate instead. No workflow scheduling change.
- Add22 regressions, including real PNG mutations, optimization subprocesses, opaque RGB/RGBA equivalence, all filters and metadata-only F1 false positives.

## Executed validation

Normal: scripts/tools193 tests (9 existing skips), scripts/tests80 tests, extensions/qa29 tests: total302,293 successful,9 skipped. All98 Windows Python evidence tests pass under `-O` and separately `-OO`. The22 new tests include subprocess execution of all existing server/hosted/geometry gate suites under both optimization levels. Four original real PNGs decode successfully; original personal125% report9c721242 is correctly rejected for missing physical-pixel provenance. Windows native PowerShell, fresh Rust builds and real personal W2 were NOT run for this local patch.

Original exact-main portable artifact13606935199 and native artifact13605918759 were separately downloaded, SHA/ZIP verified, and compared. All6 ZIP members/five manifest entries, exact source binding, both original EXEs, GUI subsystem2/CLI3 and absence of VCRUNTIME/MSVCP imports passed. No local Windows EXE execution. Candidate ZIP SHA256c6baf04912fcdcc8f0bbb33cca8e5812b4108a119fbf04160f8f7157cac43708. This package is upstream main, NOT a rebuild of this auditor-only patch.

## Unresolved infrastructure state; next steps

Personal run42453220928/job128646666435 at26cf786d completed the early GUI step and Mesa cleanup, then failed early upload, Rust/W1, MiKTeX/W1 and final upload. Checkout post step remained in_progress from2026-11-08T06:08:26Z; original archive list empty; log retrieval returned404 BlobNotFound through06:39:09Z. This is not proof of W2a and does not establish the infrastructure root cause. Do not label it Cargo, Administrator, disk capacity or network failure without original diagnostic evidence.

First preserve the existing per-run JSON/PNGs on the personal runner before rerunning an entire job (the shared temp evidence path may be cleaned/overwritten). Obtain runner/upload errors, then diagnose the actual resource/transport failure. Apply this patch through a reviewed exact-head PR and run hosted Windows/PowerShell plus full current CI. Revalidate complete personal125% geometry+original screenshots, then full W2b six gestures/source/Undo/Save/Open/IME/DPI/GUI→XeLaTeX, then separate physical Windows10W3. No stable1.0 tag or installer until those gates actually pass.
