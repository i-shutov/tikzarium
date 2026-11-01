# I54 · B39 native GUI reaccept

Parent production B draft #81: `d998f21c62c070dac3e7d0768f287f3e1b3248cd`. Exact app/src tree `0ebdd9e123dda4ea18024150cf284c905badcdb6`. QA-only edits; no Rust production code.

- Real I46 X11 dirty Open with distinct scratch, CRLF/opaque source and external XeLaTeX PDF/font proof. B37 modal coordinates provisional on B39 until screenshot-reviewed.
- Real I47 X11 six native TikZ gestures, held-pointer Undo, saved ordinary .tex, external XeLaTeX PDF/compact focus. Previous pointer positions provisional until GUI screenshot reviewed.
- Real I53 Connect positioning → saved source → XeLaTeX PDF → Disconnect → Undo → GUI Ctrl+O separate file/reopen original. Then open N3 right-inspector help, type Russian query `смещение и якоря`, screenshot result, exact X11 clipboard query, unchanged saved TeX/PDF. Manual reviewer must see positioning search result from the *same C catalogue*, not only a Rust unit test.
- Three QA workflows pin exact checkout and tree. Require full source/PDF hashes, screenshot inspection and exact HEAD CI before merging into #81; then new #81 full CI, main expected-head lease, separate postmerge CI. Any red or ambiguous visual blocks acceptance.
- New I54 exact CI **NOT_RUN** at authoring; physical Win10/MiKTeX and Mac M1/M4/XeLaTeX NOT_RUN. Linux TeXLive != MiKTeX. No TeX rewrite, silent installation or solver.
