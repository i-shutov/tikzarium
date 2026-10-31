# F01/U01 — Figure fonts and desktop visual themes

## Contract

Figure typography belongs to the user's XeLaTeX document. GUI appearance belongs to egui. Switching the UI from Light to Midnight MUST NOT change any TikZ stroke/fill, document text, image hashes or PDF font embedding.

The compiled PDF is the authoritative rendering for all text, Cyrillic, Unicode, symbols and mathematical formulas. Neither the Rust canvas nor egui system fonts may silently replace the author-specified TeX fonts.

## Implemented first slice

- Figure typography panel with user-selectable text, sans and Unicode math families.
- Safe font-name validation; copy standalone proof source, local-font TikZ node, or fontspec/unicode-math preamble. No implicit source rewrite.
- Independent XeLaTeX worker compiles a font proof WITHOUT modifying the active document.
- When installed, Poppler pdftotext proves Unicode Cyrillic extraction and pdffonts checks embedding. Missing-character messages reject a PASS even after a zero exit code.
- A missing dependency yields NOT_RUN or FAIL, never an invented fallback.
- Four independent GUI themes: Light, Dark, Midnight, Paper. Compact/comfortable spacing, immediate switching and eframe persistence across restarts.
- The stored font family names are merely last-used GUI suggestions. They do not override existing project preambles.

The reference proof fixture uses DejaVu Serif, DejaVu Sans and latinmodern-math.otf. The latter is a TeX-distributed filename: Linux XeTeX in the reference environment rejected the friendly name "Latin Modern Math" while accepting the filename. Font availability must be tested on every operating system and TeX distribution.

## Engineering and safety

Do not embed font binaries in the GitHub repo or copy proprietary fonts. Font licenses determine whether fonts may be embedded and redistributed. Font discovery via operating-system APIs and indexed font coverage comes in later releases; first slice accepts validated family strings and proves them by compiling.

Do not infer absence of glyph omissions solely from successful PDF creation. Check Missing character diagnostics, pdftotext Cyrillic phrases, pdffonts emb=yes, and visual mathematical glyph review. A PDF extractor is optional in local use but mandatory in the CI font fixture. Math text extraction can differ by renderer and is not used as the only math correctness oracle.

Node-local fontspec commands require fontspec loaded in the source preamble. Insert such commands only into documents the user controls. Unknown TeX macros remain opaque.

The GUI should preserve Cyrillic input and readable layout at 1366x768 and Retina. GUI typeface selection and custom icons are a separate UX stage; do not bundle licensed font assets as shortcuts.

## Remaining work

- Native installed-font discovery and glyph coverage maps on Win10 and Mac ARM64.
- Per-project font profiles, source-span-safe edits, fallback diagnostics and font metric inspection.
- Named scientific style profiles independent of GUI palette: print mono, journal, presentation.
- Actual Windows 10 and M1/M4 launch, theme persistence and font proof checks.
- Visual acceptance screenshots for all four themes; ensure accessibility and contrast.
