# B37 QA — I51 PDF preview fidelity blocker

I51 independent native Linux/X11 artifact #13092913019 was downloaded and reviewed directly. The actual 1180×680 PDF-focus screenshot shows missing rectangle edges and dotted/stippled circle/Bézier, unlike the same-run exact exported XeLaTeX PDF reference. At the same time top status incorrectly retains the previous “page cannot fit even at 2%” although the user successfully switched to PDF focus (~26% reported). These are reproducible preview/feedback bugs, not evidence that XeLaTeX generated invalid PDF.

B37 maintains two distinct claims: authoritative PDF bytes are from external XeLaTeX; the egui texture is a downsampled bitmap approximation. New asynchronous Lanczos minification removes the single-sample GPU minification source of discarded subpixel strokes, but **visual fidelity is NOT yet proven** by a Rust unit test. Full original PNG remains the geometric reference; prefilter is display-only. Warning follows current fit state and can no longer leak into persistent top status.

At authoring: production source + bounded async worker and event tests committed together in existing B draft PR #79. Exact-head CI and independent reviewed X11 PNG evidence are pending until returned; do not label hosted PASS as physical Win10/M1/M4. Distinct provisional guide stays uncalibrated against exact PDF.
