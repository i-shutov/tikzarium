# B32 — Safe Open/Reopen and isolated egui text history

Date: 2026-11-01. Owner: B egui; repository i-shutov/tikzarium only. Base main `bef820ecc6565280d3381486239117092d16334d` (B31 and I45 X11 accepted). Do not replay #37/#43 or #44; leave A/C/D/E/F-owned files untouched.

## Reproduced source-level safety defect

In the prior app, typing a path in the toolbar to **open** an existing TeX file while the current scratch document was dirty caused `pending_open` to be set, but the modal's **Save and open** called `save()`. With no scratch `document.path`, `save()` fell back to the same `file_field` (the *open target*) and used `Document::save_to`, atomically replacing the file about to be opened. This could destroy unrelated TeX, macros and UTF-8 comments. Independently, a successful `load_path` reset the C-owned source-authoring session but not egui's native `TextEdit` Undoer, whose widget ID survives a document replacement.

## B-only remedy

- A distinct pre-open **save destination** is explicit in the modal. For existing bound files it defaults to their own path; for scratch it starts empty. Never derive this save destination from the path to be opened.
- Reject empty destination, the file being opened (unless it **is** the already-loaded current document) and overwriting a third existing file. Compare canonical existing paths to catch `..` aliases. Keep native `Document::save_to` atomic/changed-disk protection; no new filesystem engine.
- Disable toolbar Open/Save/Save As/Build while the unsaved-open decision is visible (shortcuts were already gated). The modal handles Save/Discard/Cancel explicitly and preserves the current scratch on rejection.
- Clear the existing egui `TextEdit` Undoer on a successful document replacement, using the same authoritative history fence already required after a visual inverse patch. Keep normal manual-text Undo inside one document.
- Preserve the six C-catalogue TikZ tools, visible editable code, Russian parameters/F1, pointer cancellation, source-highlight, and external XeLaTeX PDF; no own TeX, CAS, coordinate solver or macro rewriting.

## Acceptance and evidence

Headless UNIT_EVENT uses actual `egui::Context::run(RawInput)` and production modal/Save-button pointer handler in 850×560, plus actual source TextEdit typing/Ctrl+Z through the shared production undo-history fence. Real `tempfile` source Save/Reopen checks target and unrelated UTF-8 bytes remain intact; alias and same-current-file cases covered. Existing six-tool pointer, selection, parameters, source/F1/Undo/Save-Reopen tests retained. Run exact SHA `cargo test --locked`, strict Clippy, rustfmt, hosted Rust/D/N1/MiKTeX/fonts, then independent real X11 workflow after D repins its app-tree pin. UNIT_EVENT is not physical Windows 10/MiKTeX or M1/M4; both remain NOT_RUN. External XeLaTeX PDF is authoritative and guide overlay provisional.
