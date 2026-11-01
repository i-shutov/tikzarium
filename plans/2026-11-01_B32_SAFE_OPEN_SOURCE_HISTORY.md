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


## B33 extension — remaining scratch Save / Build overwrite path (B-owned)

The B32 modal fix did **not** cover a separate source-level destructive route: in a scratch document with no bound `Document.path`, typing an existing file into the toolbar's dual-purpose `Path` field, then pressing `Save`, `Ctrl+S`, or `Build`, still invoked `save()` → `save_to_path(file_field)`, overwriting unrelated source **without ever entering the Open modal**. On Linux, `Save As…` was also a direct write from the typed field, with no native confirmation. This follows directly from the previously live B-owned handler and core `Document::save_to` behavior.

B33 routes an unbound `save()` through `save_as()` instead of directly trusting `file_field`. On Windows/macOS this invokes the external OS Save As dialog; on Linux a shared `typed_save_destination` guard rejects occupied files (including symlinks and canonical aliases), accepts only unused destinations or the same currently bound document, and passes successful paths to the existing atomic document writer. B32's Save-before-Open uses this same typed-path protection. No core, C catalogue, TeX tools or D QA files changed. Intentional replacement of a *different* file on Linux has no non-dialog confirmation workflow yet and is intentionally **blocked**, not silently attempted.

Regression: real temp files with UTF-8/CRLF opaque TeX, existing target, `..` alias, symlink to occupied file, dangling symlink (Unix), unused destination and normal same-open-document save. Existing production egui `RawInput` modal clicks, TextEdit native Undo fences, six TikZ pointer event frames, F1 and Save/Reopen suites remain intact. Validate the final exact SHA on hosted CI and independently in Linux/X11; distinguish UNIT_EVENT from physical Win10/M1/M4 (NOT_RUN).


## B34 extension — real egui modal for dirty Open

B32 presented its destructive Save/Discard/Cancel choice in a plain
egui Window, not a modal. Background source/guide/inspector pointer
handlers could therefore still run while the choice was visible.
B34 replaces the production dialog with native egui 0.33.3 Modal,
with blocking backdrop, explicit Escape-to-Cancel and no implicit
Discard. It also gates global F1/visual Undo while the decision is
pending. Existing separate save destination and collision checks stay
unchanged; source macros and TeX scopes are never rewritten.

New UNIT_EVENT regression runs production modal through
egui::Context::run(RawInput), clicking a background button with real
pointer down/up, then Escape; verifies no background click, no
implicit discard and untouched UTF-8/CRLF opaque TeX. Preserve six
C-catalogue primitive/selection/parameter/F1/Undo/Save-Reopen tests.
Require exact-head CI and independent Linux/X11 modal acceptance;
physical Win10/M1/M4 NOT_RUN. External XeLaTeX PDF remains authoritative.
