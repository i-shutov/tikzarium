# B40 — code inspection and test provenance

Date: 2026-11-02. Baseline accepted main `81d35447711500399f44f11aecc34ac9ad3bd67a` with PR #81 and I56 already merged.

Observed code-level UX safety gap: `show_source_text_edit` resets egui native undo snapshots only when `reset_source_editor_undo_history` is true. The previous owner B handler set it for external library source patches, global shortcut Undo and a fallback guide Undo; *not* for ordinary guide insertion, the pinned inspector Undo button, or inspector source actions. With an already-focused text widget, stale native snapshots could reach a different revision of the same document. This is supported by source review; a physical reproduction was NOT_RUN at this checkpoint.

Patch intended: compare the B Session's source revision before/after three production handler boundaries; fence only on revision change, before the next source editor frame (or request a second frame for guide). Keep selection/F1/manual native typing unaffected. C/N2 imports, known opaque macros and all other owners unchanged.

New B40 `UNIT_EVENT` uses real `egui::Context::run(RawInput)` TextEdit frames to test Unicode/CRLF manual typing, one native TikZ primitive patch, source Undo, an attempted stale Ctrl+Z and byte-exact saved file with an unknown macro. It does not exercise the full native window or verify screen-space PDF coordinates. The prior I56 four-library `UNIT_EVENT`, I47 six-gesture real-X11, I46 dirty Open and I53 library/Help real-X11 remain separate evidence.

Exact-HEAD CI, independent GUI click/visual review and physical Windows 10 / Mac ARM: NOT_RUN at authoring. Do not claim PASS until observed.

## First exact-head CI correction

PR #85 first HEAD `bb1e753e7a676504dfae41fffd64e2c00a3c78d1`: rustfmt detected only formatting differences in the new B40 test; I46/I47 X11 legacy scripts rejected the intentionally changed app source tree before launching the GUI (not a user-facing gesture failure). Fix applied from rustfmt diff without modifying D-owned CI test fences. Full exact-head checks still pending.


## Fresh-main reconciliation (2026-11-02)
- Accepted I57 `main=3a1e18d39cd3c9e30a39b8bd7ce0891701cfadea`; adds independent four-library real X11 test and QA fixtures only, no production overlap with B40 `main.rs` / `tikz_authoring.rs`. Preserve exact I57 tree objects, no cherry-pick/replay of historical PRs.
- Main push real-X11 I46 `41375280798`, I47 `41375280761`, I53 `41375280757`, I57 `41375280804` succeeded on **pre-B40 app tree**, and Rust `41375280833` succeeded. D QA `41375280822` failed on hosted Windows setup: Chocolatey poppler 26.9.0 HTTP **503 Service Unavailable** at 2026-11-02 02:01 UTC, before PDF tests. This is an external dependency incident, NOT a demonstrated app failure; do not claim full main CI green.
- Once fresh main is included in B #85, the independent D-owned exact-app-tree guards for I46/I47/I53/I57 still need a new B40 QA lease/test runner. B does not edit those guards or grant itself desktop acceptance. UNIT_EVENT remains distinct from physical target OS testing.
