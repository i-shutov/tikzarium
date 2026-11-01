# I54 · B39 native GUI reaccept

Parent production B draft #81: `d998f21c62c070dac3e7d0768f287f3e1b3248cd`. Exact app/src tree `0ebdd9e123dda4ea18024150cf284c905badcdb6`. QA-only edits; no Rust production code.

- Real I46 X11 dirty Open with distinct scratch, CRLF/opaque source and external XeLaTeX PDF/font proof. B37 modal coordinates provisional on B39 until screenshot-reviewed.
- Real I47 X11 six native TikZ gestures, held-pointer Undo, saved ordinary .tex, external XeLaTeX PDF/compact focus. Previous pointer positions provisional until GUI screenshot reviewed.
- Real I53 Connect positioning → saved source → XeLaTeX PDF → Disconnect → Undo → GUI Ctrl+O separate file/reopen original. Then open N3 right-inspector help, type Russian query `смещение и якоря`, screenshot result, exact X11 clipboard query, unchanged saved TeX/PDF. Manual reviewer must see positioning search result from the *same C catalogue*, not only a Rust unit test.
- First exact SHA QA found I47 stale B38 test assertion before GUI and N3 wrong y159 TextEdit click below true screenshot y130–148. Corrected to B39 unit test and screenshot-informed y138. Both still require fresh real-X11 test and visual review; I46 exact first SHA success and 21/21 artifact hashes independently accepted.
- Second I54 exact `9adbbde` I46/I47/I53 all automated PASS; I47 artifact 46/46 and I53 27/27 SHA-256 independently verified with real native .tex and XeLaTeX output, and screenshot of N3 `Найдено: 1 · tikz.library.positioning`. Add one actual click on the returned search result to screenshot full syntax/requirements/Russian help; new exact HEAD CI and screenshot acceptance NOT_RUN when authored.
- Three QA workflows pin exact checkout and tree. Require full source/PDF hashes, screenshot inspection and exact HEAD CI before merging into #81; then new #81 full CI, main expected-head lease, separate postmerge CI. Any red or ambiguous visual blocks acceptance.
- New I54 exact CI **NOT_RUN** at authoring; physical Win10/MiKTeX and Mac M1/M4/XeLaTeX NOT_RUN. Linux TeXLive != MiKTeX. No TeX rewrite, silent installation or solver.
