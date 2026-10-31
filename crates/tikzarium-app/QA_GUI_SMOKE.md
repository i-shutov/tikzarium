# TikZarium native egui GUI smoke — human-operated protocol

**Status: NOT_RUN**. Run separately on physical Windows 10 22H2 x64 and Apple Silicon macOS ARM64. Hosted Windows Server and hosted macOS CI prove compilation/tests, not interactive GUI correctness. Do not mark any row PASS without observed evidence.

Record: Git SHA; OS build and CPU; Rust app version; XeLaTeX/TeX Live or MiKTeX version; `pdftoppm -v` if present; display resolution and scaling; keyboard layout; screenshots and a one-line PASS/FAIL/NOT_RUN reason for each scenario. Keep the TeX fixtures and generated PDFs for reproducibility. Screenshots must not contain private directories/credentials.

| Case | Operator steps | Expected evidence |
| --- | --- | --- |
| WIN10-01 / MAC-01 | Launch at 1366×768 (Win10) / Retina 2x (Mac), inspect Source, Split, Canvas | Toolbar/panels readable, code editor scrolls, PDF page-one canvas explicitly read-only; three screenshots |
| WIN10-02 / MAC-02 | Open `examples/quickstart.tex` using Ctrl+O / Cmd+O; edit and save with Ctrl+S / Cmd+S | OS-native picker, nonempty Unicode input, Save touches intended path |
| WIN10-03 / MAC-03 | Build with Ctrl+Enter / Cmd+Enter using XeLaTeX; view and zoom exact preview | XeLaTeX diagnostics/job status, page-one image if Poppler present; if missing, PDF export available but preview correctly reports renderer absent |
| WIN10-04 / MAC-04 | Build `a.tex` to valid PDF, then Save As `b.tex` without altering source via Ctrl+Shift+S / Cmd+Shift+S | Stale warning remains visible; **Export PDF disabled**; old PDF retained in canvas; screenshot |
| WIN10-05 / MAC-05 | Edit the compiled source before rebuilding; then introduce invalid TeX and rebuild | Stale banner on edit; failed build preserves previous PDF, exposes failure row without fictional coordinates; screenshot; record error source-line limitation |
| WIN10-06 / MAC-06 | Build a valid PDF, then start a long rebuild; try Open, Open path, Save, Save As, Discover TeX and Export PDF | Actions and old-PDF export disabled while rebuilding; Cancel terminates active job; no file identity switch |
| WIN10-07 / MAC-07 | Trigger unsaved changes via Open of another file, test Save and open / Discard and open / Cancel | Modal protects current edits; no source loss in cancel path |
| WIN10-08 / MAC-08 | Type Cyrillic and compose Unicode input with OS IME, check CRLF source diagnostic navigation if available | No broken UTF-8 caret positioning; document reproducibility; no imaginary PASS while #10 not integrated |
| WIN10-09 / MAC-09 | Build the B03 two-page TeX fixture; navigate Page 1/2 → 2/2 → 1/2; edit source and browse the stale last-good PDF | Each page differs; bounds disable invalid Next/Prev; old-page render results cannot replace a newer build; stale export blocked; screenshots of both pages, SHA of PDF and original source; explicit NOT_CHECKED if pdfinfo missing |
| WIN10-10 / MAC-10 | Switch Light/Dark/Midnight/Paper and compact/comfortable at 1366×768/Retina; restart after each theme | Saved theme/density restored; UI legible, source and output-PDF SHA-256 unchanged; eight screenshots per platform (4 themes × 2 densities) |
| WIN10-11 / MAC-11 | Open Figure typography panel, choose installed and nonexistent XeLaTeX family, run independent font proof | Missing font visibly fails, no silent substitute; proof screenshot and report; active document source/PDF remains byte-identical; source-aware inspector still pending |

Manual evidence template:
```text
Case:
Result: PASS / FAIL / NOT_RUN
Platform + version:
Physical machine / hosted VM:
App commit SHA:
XeLaTeX version:
Renderer (pdftoppm) version:
Resolution / DPI:
Screenshot file + SHA-256:
Source .tex SHA-256 before/after UI appearance changes:
Compiled PDF SHA-256 before/after UI appearance changes:
PDF page count verification (pdfinfo version and output):
Observed result and exception:
```

A missing PDF rasterizer is **not** proof of failed TeX compilation; retain and inspect actual PDF separately. One-page preview is not multi-page navigation. Check open PRs and do not attach screenshots from a different SHA as proof for the present head.
