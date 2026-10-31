# I04 — end-to-end two-page PDF regression, not a GUI surrogate

Date: 2026-10-31. Scope: i-shutov/tikzarium, independent integration/QA lane.
Starting main: `0220e3117d850c18d1016db39389d7c90bd73900`.
B03 #19 is merged; B04 #20 is stacked/retargeted, source inspection independent.
D03 #22 and F02 #18 are merged. Existing B03 tests only exercised page count
parser and navigation bounds; they did not build the two-page fixture in CI.

## Committed implementation

- `scripts/qa_multipage_pdf.py`: launch the **actual tikzarium-cli**
  in a disposable copy of the B03 fixture, build with the installed XeLaTeX,
  inspect exactly two pages with `pdfinfo`, render each page with **the same
  Poppler `pdftoppm -f/-l/-singlefile/-png/-r 120` arguments used by B03**,
  extract UTF-8 text with `pdftotext` per page and require distinct markers
  (Привет, Геометрия) on their intended pages, not both on one.
- Fail if the PDF header, page count, PNG signatures, page differentiation,
  Unicode extraction, CLI/Poppler exit codes or source SHA-256 invariant fails.
  Bound subprocess timeouts; no shell invocation; write explicit JSON evidence.
- Never hand the Rust CLI the checked-in original: copy the source into a
  separate output directory and verify both original and copy before/after.
  Prevent source path/directory overlap with the output directory.
- `scripts/tests/test_qa_multipage_pdf.py`: offline negative controls for
  missing/ambiguous PDF pages, swapped/overlapping Unicode, fake/same PNGs,
  source mutation and unsafe output paths.
- `.github/workflows/ci.yml` Linux real-XeLaTeX job: run unit regressions,
  execute the compiled Rust CLI and real TeX+Poppler proof, and upload its
  fixture PDF, page-1/page-2 PNGs and JSON under the existing artifact path.

## CI/QA gates

1. PR exact-head GitHub Actions **must** pass Linux real tool proof and
   hosted Windows Server 2022/macOS-15 Rust jobs. Record exact SHA, run,
   artifact IDs/digests and potential errors; no synthetic PASS.
2. Inspect uploaded `multipage-evidence.json`: `PASS_CLI_POPPLER_ONLY`,
   2 pages, distinct PNG hashes, Unicode markers, original source hash and
   CLI/PDF hash. Report any missing/misplaced data as a defect.
3. Distinguish **CLI/PDF/Poppler correctness** from actual egui async worker
   and viewport navigation (these require an app session). Record GUI
   click-through, stale preview, resize/zoom, HiDPI and UI persistence as
   NOT_RUN, not implicitly covered.
4. Validate physical Windows 10 x64, Mac M1 and Mac M4 separately; do not use
   Windows Server or GitHub-hosted macOS as a substitute.
5. Reproducibility is text/page/PNG-difference within a single run, not
   byte-identical PDF generation across OS/font versions.

## Known limits

- The 120 dpi PNG proof is not pixel-to-pixel comparison with a golden master.
- Poppler invocation is bounded by the Python QA harness; B03 GUI's own
  background Poppler workers still lack cancellation/timeouts.
- Relative input asset dependencies and external file modification invalidation
  are not comprehensively tested. Source-safe direct editing remains textual;
  Canvas is read-only, not a geometric TikZ editor.
- No LuaTeX-only PGF library is declared XeLaTeX-compatible by this proof.
