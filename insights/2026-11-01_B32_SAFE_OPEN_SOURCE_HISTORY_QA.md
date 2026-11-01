# B32 QA — preventing destructive Save-and-open and cross-file native Undo

Date: 2026-11-01. B egui-only candidate based on accepted main `bef820ecc6565280d3381486239117092d16334d`.

**Source-level defect:** The old dirty-scratch `Open path` modal called `self.save()` for Save-and-open. On an unbound scratch document that method used toolbar `file_field` (already holding the requested *open* file path). Thus the existing open target could be overwritten *before* load. This is a deterministic data-loss path in source flow, not a speculative geometry issue. Separately, `load_path` preserved native TextEdit history tied to the stable widget ID, allowing cross-file Undo state leakage.

**Bounded patch:** pre-open explicit save path with guard for empty/same-next-open/third-file collisions (including canonical aliases); disable background toolbar file actions during modal; isolate native undo state after successful Open/Reopen. No C generator, TeX executor, macros or PDF output rewritten.

**Tests authored:** real tempfile victim file and Unicode opaque macro, path alias, existing-current-file save; actual egui RawInput Save-and-open button with rejected and accepted destinations; native TextEdit event frames typing old content, switch, Ctrl+Z without restoring old bytes. Existing N1 six-pointer and source regression suites unchanged.

**Evidence at authoring:** code and tests committed together; fresh exact-SHA CI and independent real Linux/X11 acceptance required. No physical Windows 10/MiKTeX or Mac M1/M4. Keep `UNIT_EVENT`, hosted CI and real GUI/physical target claims separate. Legacy #37/#43 not reused.
