# Owner decision 2026-11-04 — Linux-first full release; cross-platform development from day one

## Status and precedence

**CURRENT RELEASE PRIORITY.** This owner decision supersedes the platform-order portions of prior Windows-first plans, including `plans/2026-11-04_WINDOWS_SERVER_AUTOMATED_QA.md`. It does **not** revoke the cross-platform architecture, accepted N1/N2 workflows or the need for later physical Windows/macOS testing. Earlier dated acceptance reports remain historical evidence only.

## Target product and platform sequence

1. **First full release: Linux desktop x86_64.** Reference validation: Ubuntu 24.04 with a real X11 desktop session and an independent, user-installed external XeLaTeX (TeX Live where available). Hosted X11 real event/screenshot CI is our fastest regression environment; real packaged desktop acceptance is a separate gate. Native Wayland and other distributions must be marked **NOT_RUN** unless actually observed.
2. **Windows 10 x64 / MiKTeX: subsequent release.** Preserve Windows-compatible Rust/egui source, dependency and engine paths, PDF/font handling, hosted Windows compilation/tests, and the already configured *private* `tikzarium-winserver` Windows Server 2025 runner for **secondary** regression. It is not a first-Linux-release gate and is never a physical Windows 10 PASS.
3. **macOS ARM64 / external XeLaTeX: subsequent release.** Keep macOS CI/build and architecture intact; no first-release requirement for signed/notarized `.app` or physical M1/M4 UX.
4. N4 domain packs are **not** on the first-release critical path. Cross-platform source contracts remain invariant across all three.

## Native user workflow: first-release requirements

- Native Rust/egui, real compact visual TikZ/PGF editor — never a CAD/solver/CAS/TeX interpreter.
- Six original TikZ tools: line, arrow, rectangle, circle, node/text/math, cubic Bézier. Real mouse gestures and keyboard flows, not snippet-only demos.
- Default layout keeps **actual editable ordinary `.tex` beside the figure**. Selecting and editing a tool reveals its exact source and properties. Preview/PDF is produced only by the **external** XeLaTeX, with Cyrillic/math text and font embedding independently checked.
- Revision-checked minimal SourcePatch, undo/redo as supported, Save/Open/reopen, preservation of opaque macros, comments, unknown commands, CRLF and unrelated bytes. Unsupported parsing returns UNKNOWN rather than destructively guessing.
- One versioned C catalogue feeds tools, Property inspector, contextual Russian F1/hover and source-caret parameter help: syntax; type/units/choices; documented TikZ default **or UNKNOWN**; example; effect; package/library; manual anchor and provenance. Independently report installed / project-loaded / engine-compatible / tool-implemented / help-available.
- No silent TeX installation/package downloads, shell escape or fallback compiler. Clear external prerequisites, diagnostic failures and safe source recovery.

## UX/ergonomics are release gates, not polish

Iterate using *original screenshots from the running application*, never image-only mockups as acceptance. Compare normal tasks across 1366×768 and 1920×1080, DPI changes where observable; verify compact balanced columns and vertical alignment; legible Russian help and code typography; icon-grouped palettes with clear hover names; focused Property/Library/Help navigation; adequate usable canvas area; no rows of long repetitive buttons; predictable keyboard/focus/caret F1 and native file dialogs; preview zoom and visible errors/logs. Assess interaction density, navigation effort, readability and modal/undo behavior on actual GUI, not only cargo tests or CI status. User feedback drives design revisions before final release. Keep old screenshots with commit/environment provenance to compare iterations.

## Delivery sequence and evidence

**Exact-head obstacle observed 2026-11-04:** real I61 job 126558081488 passed six gestures, external XeLaTeX/fonts and two-file CRLF Save but failed on Ctrl+O disk reload before reaching N3 caret F1. Treat keyboard handling and real Open as separate observed axes; instrument source TextEdit clipboard and non-suppressing visible-toolbar recovery so downstream F1 is still exercised while release remains red on broken Ctrl+O. Do not call screenshot-only F1 a completed gate.

**L1 — Finish current N3 vertical.** Reuse the existing substantial PR #98; don't fork new B/QA micro-PRs. First resolve exact-head failing checks and assess original real X11 Source/F1 screenshots, CRLF/Undo/PDF; don't merge just because unit tests passed.

**Exact-head regression/fix candidate, 2026-11-04:** run 41833261353 isolated real Ctrl+O key handling as FAIL while visible Open/reopen, source byte safety, dirty-cancel and real source-caret F1 passed; implement event-local modifier resolution for cross-platform global file shortcuts and require an independent real X11 Ctrl+O rerun at the exact new app tree. Do not merge while red or hide a missing key path behind toolbar recovery.

**L2 — GUI usability cycles.** Review actual Linux workspace, tool palettes, source/preview balance, properties, contextual Help, library lifecycle and editing dialogs; implement coherent interface revisions with source and event tests, not cosmetic CI churn. Publish versioned screenshot atlases and annotated issues showing what changed, what remains wrong, and actual click/keyboard task results.

**L3 — Complete Linux vertical acceptance.** On an **exact source HEAD** run real X11 actions for all six tools → editable `.tex` → F1/inspector/Connect/Disconnect → Undo/Save/Open/CRLF/opaque → external XeLaTeX → original PDF/Unicode/all fonts/raster + PNG/.tex/log/SHA. Separately inspect whether an actual packaged Linux desktop launch works; do not equate hosted X11 with all distro/Wayland support.

**L4 — Deliver Linux release candidate and documentation.** Build reproducible native Linux x86_64 artifact, clearly document external XeLaTeX/TeX Live and fonts; verify archive provenance, launch and user-facing tasks on an appropriately observed Linux desktop. Fix critical GUI/ergonomics defects; accept only with original artifacts and reproducible checks, then release. No invented release date.

**L5 — Windows/macOS follow-ons.** Only after Linux workflow/ergonomics are stable, qualify Windows 10 MiKTeX with real Windows GUI, native dialogs and offline PDF; macOS M1/M4 XeLaTeX with actual GUI, Retina/IME, codesign/notarization as warranted. Hosted Windows/Mac build checks continue *now* but are not full physical PASS.

## Repository and task discipline

- The **current main and open PR HEAD** control truth, not older PR descriptions, screenshots, report banners or stale SHA leases. For each change, inspect exact CI jobs/logs and original artifacts; stop on unresolved FAIL.
- One substantial integration PR when appropriate: production code + event/unit tests + original GUI evidence + docs/plans/insights/CHANGELOG. Merge via `expected_head_sha` only after exact-head acceptance; then verify postmerge workflows.
- The independent 12-hour release controller checks delivery direction, ergonomics and top blockers; it must not make competing production edits.
- The VDSina Windows Server 2025 runner and FlowBridge's separate runner remain untouched. Optional Linux release-independent Windows Server QA may fail for environment prerequisites; record as such, never pass or conceal it.

### Snapshot at decision

At the decision, `main` was `4d3c580eedc3f8f1d1522bd9cafdd568109f85fa`, PR #98 had HEAD `97ec4d44a76b9447f6c07b8f2de4628a83157ac2`. PR #98 exact-head D QA matrix [41819923018](https://github.com/i-shutov/tikzarium/actions/runs/41819923018) and real X11 I61 [41819923672](https://github.com/i-shutov/tikzarium/actions/runs/41819923672) were FAIL; some other checks succeeded. The Windows Server manual run [41810809899](https://github.com/i-shutov/tikzarium/actions/runs/41810809899) attempt 2 got past Git and exact SHA but failed before TeX on PowerShell 5.1 UTF-8 Cyrillic parsing; the BOM fix was added to PR #98, not accepted as on-host PASS. **Recheck all SHAs and statuses each time**; this is not a release report.
