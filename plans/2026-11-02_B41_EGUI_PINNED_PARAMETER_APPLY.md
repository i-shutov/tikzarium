# B41 — pinned inspector Apply for native TikZ parameter authoring

Date: 2026-11-02. Base main: 48447d5916fa190b3ca7312130bde45d695ffd16 (I59 MiKTeX policy already merged); B lane only.

## User-visible gap and scope

The regular inspector puts "Apply parameters" after every dimension/text/choice row, a command preview, requirements and help. For a cubic Bézier inspector the primary commit action sits below the fold of a compact 210–300 pt right sidebar, although source and a code patch must stay in view. The existing pinned action bar exposes Undo/F1 but not Apply; draft changes are not explicitly identified as **uncommitted**.

B41 keeps a compact **pinned Apply** next to Undo whenever a C-owned command is selected; the action is enabled only when a uniquely verified selected command has different draft parameters. A clear Russian warning distinguishes the pending inspector draft from committed TeX/PDF. The legacy lower Apply button remains for discovery but is disabled for no-op clicks. Both use the one existing B Session/C catalogue generator and minimal revision-checked source patch. No TeX parser, geometry solver, PDF overlay calibration or C-owned file changes.

## Acceptance

1. Actual egui RawInput event frames must click the *real parameter TextEdit*, Ctrl+A/type a radius, observe unchanged source before Apply, and click pinned Apply to commit one C patch.
2. Disabled/no-change clicks must leave the source revision unchanged; visual Undo restores byte-exact pre-Apply and pre-insert source.
3. Save/Reopen preserves ordinary UTF-8, opaque foreign macro and validated selected C metadata.
4. Existing N1 pointer primitives, source Ctrl+Z, F1, library Connect/Disconnect, external XeLaTeX and hosted Windows MiKTeX CI remain green on exact SHA.
5. UNIT_EVENT is not real Linux/X11 nor physical Win10/M1/M4. D owns independent GUI runner; only external XeLaTeX PDF is authoritative.

Ownership: B may touch tikz_canvas.rs, plans/, insights/. A/C/D/E/F production code is excluded. Do not merge old #37/#43 or #44. One PR only; integrate after exact-head checks and independent X11 parameter + source Undo.

## B41 compact production-handler hardening (2026-11-02)

Independent integrator review identified that the original wide 680pt UNIT_EVENT called a pinned Apply helper directly, whereas the real desktop invokes the `horizontal_wrapped` action bar above a separate scrollable inspector. The B-owned follow-up adds a narrow 260pt real egui SidePanel + ScrollArea frame targeting that **production action-bar handler**, checking visible button geometry, disabled no-op, one C patch, revised line jump, no duplicate Apply and exact Undo. This remains UNIT_EVENT, NOT real X11 acceptance. The separate radius TextEdit pointer test is retained; end-to-end inspector field + native source Ctrl+Z + GUI Save/Open requires independent D/integrator X11 verification. Also record the B41 changelog entry requested by integration; no A/C/D/E/F edits.
