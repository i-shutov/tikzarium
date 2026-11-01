# B39 — evidence and open acceptance gates

Repository: only `i-shutov/tikzarium`, B-owned egui lane, draft PR #81. Baseline main `72afff410f3159b0c86341222ee2dd73e2039773`. Initial B38 HEAD `628d48ea3ccf4e53f9ea95096803e52e1f531525`. Seven B38 hosted workflows previously reported SUCCESS on that exact SHA, but I46/I47 exercise inherited N1/B37 interactions, **not** the newly introduced Connect/Disconnect buttons.

## Static defect and correction

- The changing label `{library.title_ru} · {project_status}` was the default egui `CollapsingHeader` ID. On source mutation the header identity changed, resetting open state. The inverse action became hidden, a directly reproducible state-model defect without guessing TeX semantics.
- Added stable `id_salt(("tikz-library", library.name.as_str()))`; the visible status still changes. Shared C/N2 `ImportPlan`/`DisconnectPlan` unchanged.
- Added actual `Context::run(RawInput)` mouse press/release frames targeting observed `Response.rect`: panel → row → Connect → immediately available Disconnect. The test verifies C/N2 source, CRLF/UTF-8/opaque macro, two Undo steps and byte-equal Save/Reopen.
- New external library edits set `reset_source_editor_undo_history` before the same-frame source TextEdit; prevents stale native text-editor undo snapshots from racing revision-checked Session Undo.

## Evidence ladder

- Static analysis of egui 0.33.3 default header ID and reviewed B38 source: recorded, defect supported.
- New Rust `UNIT_EVENT` regression: code committed; result **NOT_RUN until exact HEAD CI completes**.
- Existing B38 N1/B37 real Linux/X11 suite: successful before B39, not proof of new library-row pointer sequence.
- New B39 real X11 Connect/Disconnect screenshot / exact XeLaTeX PDF comparison: **NOT_RUN**. Independent QA must click both actions, verify visible status and persistent expansion, Undo, Save/Reopen and source hash.
- Physical Windows 10 x64 MiKTeX and Mac M1/M4 XeLaTeX: **NOT_RUN**.
- Provisional guide coordinate overlay remains distinct from exact XeLaTeX PDF; no full TeX/CAS/solver implementation.

Do not mark B39 integrated/accepted or merge PR #81 until final exact SHA CI and independent GUI acceptance are reviewed. Record new CI URLs and SHA in issue #3 handoff after they complete.
