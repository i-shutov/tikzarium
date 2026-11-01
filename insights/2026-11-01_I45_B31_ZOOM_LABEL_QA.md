# I45 — evidence-sensitive B31 zoom-label live acceptance

Date: 2026-11-01. Source of truth: current main `8640c2cf`, draft PR #72 corrected HEAD `8f20359f`, app source tree `af316d5e5452d74186b92d65c95c448253d0e61c`, project AGENTS and I43 artifact, not the old I06/B30 screenshots.

## Confirmed finding

I43 live X11 [run 41290833137](https://github.com/i-shutov/tikzarium/actions/runs/41290833137) proved the PDF raster resized after 1180×680 → 1366×740, but toolbar readout remained **7%** despite estimated **~25%** image size. I43 proof for native pointer authoring remains valid for its old app SHA only; it cannot certify B31 correction. This is a UX synchronization bug, not a source mutation or external TeX raster bug.

The first corrected-B31 I43 replay [41293194516](https://github.com/i-shutov/tikzarium/actions/runs/41293194516) failed at preflight because QA workflow still pinned the old app tree `3aea076...`. Its actual GUI steps were SKIPPED; one must not report a corrected-branch GUI PASS or FAIL from that job. The same run's logs exposed the genuine corrected app tree `af316d5e...`.

## I45 QA-only changes

- Update exact app-tree pin in workflow/profile/unit test; preserve reviewed pointer coordinates and fail closed if a later production tree differs.
- Add delayed **second restored-size screenshot** `04g-b31-zoom-readout-settled.png`; give JSON evidence `zoom_readout_review=MANUAL_COMPARE_TOOLBAR_AND_PDF_SCALE_REQUIRED`. Two images and pixel variation alone cannot certify correct numerical toolbar zoom.
- Leave Rust production, user TeX, C catalogue, external XeLaTeX and the old #48 branch untouched.

## Distinguish test environments

Fresh corrected B31 [Rust 41293194473](https://github.com/i-shutov/tikzarium/actions/runs/41293194473), [D QA 41293194482](https://github.com/i-shutov/tikzarium/actions/runs/41293194482), [N1 41293194624](https://github.com/i-shutov/tikzarium/actions/runs/41293194624) and [fonts 41293194518](https://github.com/i-shutov/tikzarium/actions/runs/41293194518) passed on hosted infrastructure. [MiKTeX 41293194477](https://github.com/i-shutov/tikzarium/actions/runs/41293194477) originally failed in private installer download due to network timeout; subsequent rerun completed hosted MiKTeX compilation and independent artifact audit SUCCESS. Do not relabel its original transient error as a production defect. Hosted Windows Server 2022/MiKTeX is NOT physical Windows 10; macos-15 hosted CI is NOT physical M1/M4 GUI.

**I45 final exact-head X11, download, hash audit and screenshot inspection:** NOT_RUN at authoring time. **Physical Win10/M1/M4:** NOT_RUN. No merge.
