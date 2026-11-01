# B32 QA — preventing destructive Save-and-open and cross-file native Undo

Date: 2026-11-01. B egui-only candidate based on accepted main `bef820ecc6565280d3381486239117092d16334d`.

**Source-level defect:** The old dirty-scratch `Open path` modal called `self.save()` for Save-and-open. On an unbound scratch document that method used toolbar `file_field` (already holding the requested *open* file path). Thus the existing open target could be overwritten *before* load. This is a deterministic data-loss path in source flow, not a speculative geometry issue. Separately, `load_path` preserved native TextEdit history tied to the stable widget ID, allowing cross-file Undo state leakage.

**Bounded patch:** pre-open explicit save path with guard for empty/same-next-open/third-file collisions (including canonical aliases); disable background toolbar file actions during modal; isolate native undo state after successful Open/Reopen. No C generator, TeX executor, macros or PDF output rewritten.

**Tests authored:** real tempfile victim file and Unicode opaque macro, path alias, existing-current-file save; actual egui RawInput Save-and-open button with rejected and accepted destinations; native TextEdit event frames typing old content, switch, Ctrl+Z without restoring old bytes. Existing N1 six-pointer and source regression suites unchanged.

**Evidence at authoring:** code and tests committed together; fresh exact-SHA CI and independent real Linux/X11 acceptance required. No physical Windows 10/MiKTeX or Mac M1/M4. Keep `UNIT_EVENT`, hosted CI and real GUI/physical target claims separate. Legacy #37/#43 not reused.


## B33 QA extension — additional implicit Save/Build overwrite route

Re-review of `TikzariumApp::save` against `Document::save_to` identified an **independent unguarded write** left after B32. An unbound scratch document routed `Save` / `Ctrl+S` / `Build` directly to `file_field` if nonempty, even though that same field is used by `Open path`. The core intentionally allows explicit Save As replacement, so an unrelated existing TeX could be overwritten. Linux typed `Save As…` likewise lacked any overwrite confirmation. This is a verified source-code path, not a claimed real-desktop reproduction.

B-only correction: unbound saves route through native Save As dialog (Windows/macOS) or a validated typed destination (Linux). The shared guard checks `symlink_metadata`, denies occupied non-current files and dangling symlinks, and preserves normal save of the active file. It also centralizes protection for the B32 dirty-Open modal. New regression uses actual temporary UTF-8/CRLF files, opaque commands and alias/symlink cases; no fake XeLaTeX/PDF assertions. The guard is a UI preflight, **not an OS atomic lock** against races; do not claim more.

As of patch authorship: GitHub commit SHA and automated check outcomes must be read from the **final HEAD**, not from the earlier B32 PASS. Independent real X11 screenshot/modal/Save/Build acceptance still required; physical Win10 and ARM macOS remain NOT_RUN.


## B34 QA extension — modal event capture

Reproduced by reading the B-owned production handler: a plain
egui::Window does not block pointer events to background widgets,
and global visual Undo/F1 were handled before the window. B34 uses
egui 0.33.3 native Modal plus keyboard gating; Escape cancels without
dropping edits. New test b34_dirty_open_modal_blocks_background_pointer_and_escape_cancels
exercises Context::run(RawInput) on the production modal, a live
background button, pointer press/release and Escape, checking no
background click and byte-preserved UTF-8/CRLF target. This is
UNIT_EVENT only; do not claim real X11 or Win10/M1/M4 tests before
independent evidence. Source-level defect and test added together.


Additional B34 UNIT_EVENT: a previously focused production
TextEdit with active native history receives a raw Text event
while the pending Open modal is visible. All underlying
production Ui panels are explicitly disabled during the modal.
The test checks unchanged source and UTF-8/CRLF open target,
then re-enables the editor and confirms ordinary typing works.
No claim of physical GUI acceptance until independent evidence.

B34 exact-head QA note: macOS hosted log on `2e047938dd3799fe29161851c04b5e9d903d34f1` showed 81/81 app and 55/55 core tests passing but a strict Clippy `too_many_arguments` rejection in the new test helper. Grouped arguments in follow-up and merged fresh main N3 without touching its files; check the **new** exact final SHA for fresh CI, do not cite the old passing tests as final.
