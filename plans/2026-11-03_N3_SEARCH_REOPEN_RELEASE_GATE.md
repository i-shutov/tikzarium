# N3 semantic offline search and observable real N2 reopen — 2026-11-03

Baseline main cc92441b28a784692faaf22c0361539c54b66c79. On entry #91/#92/#93 were merged and no PR was open. This single integration candidate touches the shared C search API and existing independent X11 acceptance script; it does NOT edit B app/src or D active branches, add a workflow, dispatch reruns, or reopen historic N1.

## User-visible feature

Studio Help already queries the common C catalogue. Searching by a parameter type (dimension, node_content), units (pt, cm), allowed choice or editor-preset provenance now resolves the parameter entry, including its Russian explanation, syntax, required library and upstream manual link. Do not infer a TikZ default from editor_preset; maintain offline behavior and the 256-byte query bound. This is a scoped N3 improvement; it is NOT complete control/tooltip/completion coverage.

## Real GUI acceptance regression and correction

Postmerge main Linux/X11 run 41560989884 failed only after successful real N2 Connect, inverse Disconnect and Undo. After an external CRLF .tex modification, Ctrl+O did not visibly reload the buffer: original 12/13 screenshots were byte-identical. TextEdit genuinely inserted a marker into the old buffer, while Document::save_to appropriately refused to overwrite a file changed by another writer. The same app executable SHA and tree passed premerge 41557979254; root is still undecided between shortcut/focus timing and product behavior, NOT a proved B regression.

Use actual File → Open path via the previously accepted GUI control and reassert window focus. Before touching TextEdit, capture a new source-area crop and require at least 350 changed pixels (heuristic only; no OCR claim). Then real TextEdit append, GUI Save, screenshot after Save, byte-exact external+GUI CRLF/opaque preservation, and external XeLaTeX PDF/Cyrillic/fonts. Preserve all original artifacts on FAIL. There is no fallback to a direct file write, no skipped gate and no disable of source-conflict safety.

## Completion gates

1. Same existing exact-head Rust fmt/Clippy/unit/negative tests and unchanged app/src lease.
2. Same real Linux/X11 Studio user path, original full-size PNG/.tex/PDF/log/SHA manual review, no false PASS from screenshot alone.
3. Merge only after full exact-head PASS plus evidence audit and expected_head_sha; then separate postmerge CI, independent checkpoint.
4. Physical Windows 10/MiKTeX and Mac M1/M4/XeLaTeX GUI, packaging/installer, and expanded N3 coverage remain NOT_RUN until observed. N4 domain packs are not on the first-release critical path.
