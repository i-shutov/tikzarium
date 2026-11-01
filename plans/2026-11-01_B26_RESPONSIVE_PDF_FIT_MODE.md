# B26 — Persistent whole-page XeLaTeX PDF fit across resize and page switch

2026-11-01 · Owner B egui · add to existing draft PR #67 on top of B25, no separate micro-PR. Base main `bb96abccea86835977e2608887f7470ba83a1167`.

## Repro and user-visible fix

B25 introduced «Вся страница» but wrote a single scalar `zoom` only on button click. Resizing the Split or navigating to another PDF page with a different aspect ratio then reused the stale zoom and clipped the page again. Treat «Вся страница» as a selected view mode. Re-evaluate the *rasterized XeLaTeX page texture* against actual post-guide viewport on every frame. Explicit manual -/+ /100% /Fit width actions exit auto-fit. Opening a different TeX project clears the view mode; re-rendering the same project and navigating pages preserve it. Preserve previous zoom and display a visible warning when even 20% cannot fit.

## Evidence contract

- Production egui button and pointer events through `Context::run(RawInput)`; changing logical viewport 1366×740→850×560 and changing raster 720×480→720×1200 must re-fit without a second click.
- Manual zoom exits selected mode. Invalid/too-small viewport fails closed without rewriting source or lying about full-page visibility.
- Same C catalogue, source panel, F1, Undo and six tools; no new TeX generator, no PDF coordinate inference, no edits in C/A/D/E/F files.
- B25 96 pointer/focus-loss scenarios and B16–B24 gesture/Save/Reopen tests retained; CI outcomes recorded on final exact HEAD. Physical Windows10 MiKTeX and Mac M1/M4: NOT_RUN.
