# B06 — fail-closed bounded PNG decode for all egui preview surfaces
Date: 2026-10-31. Independent lane B. Exact base main: `8764a732b9a846a6ba1f111c9b656781195a6412`.

## Background and ownership
At start of work, draft PRs #25 (B05 Poppler timeout/PNG **compressed** size), #26 (C), #27 (D), #28 (A) were open. PR #24 integration is merged; source-accurate log navigation was already delivered. #16 themes, #19 pagination, #20 font hints and #23 I04 multipage are already in main. Do not duplicate them.

This B06 patch changes only `crates/tikzarium-app/src/main.rs`, new `src/preview_image.rs` and B06-specific `plans/`, `insights/`, `QA_PREVIEW_IMAGE_LIMITS.md`. **No change to `tikzarium-core`, PDF data, source TeX, GUI themes or extensions.** It can merge independently of #25 because it touches neither `pdf_navigation.rs` nor B05 documents.

## Threat / acceptance contract
A 64 MiB PNG on disk can describe enormous image dimensions and exhaust memory in egui. All three preview decode entry points previously called `image::load_from_memory` with no explicit pixel bound:
1. First page from XeLaTeX build artifact.
2. Navigated PDF page from Poppler worker.
3. Figure-font proof bitmap.

- [x] One PNG-only decode helper used by all three paths.
- [x] Reject malformed/truncated PNG signature/IHDR, dimensions 0, edge > 8192, or > 8,388,608 pixels before handing data to the image decoder.
- [x] Bound compressed preview bytes at 64 MiB even for page-one and font-proof paths, independent of #25.
- [x] Configure image-rs strict width/height limits and best-effort allocation limit (96 MiB).
- [x] Preserve last-good navigated page/texture and visible explicit errors on rejection. No mutation of PDF/TeX.
- [x] Regression unit tests for valid RGBA bytes, fake high-compression-bomb header, bad/truncated headers, width/height/pixel/byte boundaries.
- [ ] Exact-head Rust fmt, Clippy and tests on GitHub Actions — **pending** until checked.
- [ ] Live Windows 10 22H2 x64 and physical macOS ARM64 GUI, native dialogs, scaling, IME and screenshots — **NOT_RUN**.

**Limits:** 8,388,608 pixels implies at most 32 MiB for one RGBA8 bitmap; peak app memory is larger because decoder intermediates, egui CPU image, GPU texture, existing cached previews and allocator overhead are separate. `max_alloc` is non-strict and not a process-memory cap. Accepted high-resolution figures exceeding policy show a clear error instead of rendering; original PDF remains exportable and unmodified.

## Next small workpack
After exact SHA CI succeeds, request platform-actual QA using `crates/tikzarium-app/QA_PREVIEW_IMAGE_LIMITS.md` with hashes, screenshots and precise host facts. If large-document workflows need >8M pixels, design an opt-in downscaling/tiled renderer using worker-side memory accounting; do **not** silently lift caps. If B05 merges, separately check any new image-decoding path uses this helper.
