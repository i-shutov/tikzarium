# B06 — preview decode QA evidence and integration handoff
Date: 2026-10-31. Base `main` SHA `8764a732b9a846a6ba1f111c9b656781195a6412`; own branch `feat/b06-bounded-png-decode`.

## Starting observations
- B05 draft [PR #25](https://github.com/i-shutov/tikzarium/pull/25) HEAD `f1fae6633ba71fdc005b3e8b9cdae54560152fb6`: three exact-head hosted workflows showed `completed/success` on 2026-10-31, [CI 41180141533](https://github.com/i-shutov/tikzarium/actions/runs/41180141533), [D 41180141552](https://github.com/i-shutov/tikzarium/actions/runs/41180141552), [font gate 41180141517](https://github.com/i-shutov/tikzarium/actions/runs/41180141517). Physical Win10/Mac GUI remains NOT_RUN. This does not constitute B06 QA.
- B05's 64 MiB compressed file cap does not prevent dimension-based decompression bombs. Existing main decoded PNG via `image::load_from_memory` in three GUI flows without preflight.
- Rust toolchain (`cargo`, `rustc`) and physical Windows/macOS desktop sessions are unavailable in this executor. Local Rust runtime/GUI screenshots: **NOT_RUN**.

## B06 source-level implementation
- New `preview_image.rs`: PNG signature and IHDR length/type validation; size/edge/pixel guards; image-rs reader with strict image dimension caps plus best-effort `max_alloc`; returns RGBA8 only on success.
- `main.rs` routes initial XeLaTeX page, navigated page and font proof through the same guard. No change to figure contents, theme, UI persistence, page numbers or core API.
- Four unit tests added for valid pixel preservation, giant-dimension/zero-dimension rejection, malformed/truncated headers, compressed and pixel limit boundaries.

## Evidence ledger (update only on observed exact-head checks)
| Gate | Status | Evidence |
| --- | --- | --- |
| GitHub Rust cargo fmt/test/clippy | PENDING | inspect exact branch SHA Actions |
| GitHub D QA multi-host | PENDING | inspect exact branch SHA Actions |
| GitHub font/figure integrity | PENDING | inspect exact branch SHA Actions |
| Local cargo/rustc | NOT_RUN | toolchain unavailable |
| Physical Windows 10 x64 egui/dialog/IME/screenshot | NOT_RUN | no native session |
| Physical macOS M1/M4 Retina/egui/dialog/screenshot | NOT_RUN | no native session |
| Malformed PNG injection into real GUI | NOT_RUN | only unit fixtures prepared |
| TeX/PDF hash invariance in live GUI | NOT_RUN | QA protocol supplied |

## Known limitations and handoff
A valid 8M-pixel image can still use multiple RGBA copies and GPU memory; these checks **bound image dimensions**, not entire process RSS, rendering time or GPU memory. The image decoder's `max_alloc` is non-strict. Future worker-side decoding or tiling requires a separate review. No physical platform PASS is inferred from Windows Server 2022 or hosted Mac ARM runners.
