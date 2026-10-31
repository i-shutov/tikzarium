# B12 — reconcile B10/B11 with corrected C/N2 and Alt gesture capture

Date: 2026-10-31. B-only work in PR #50; exact main input `6d15d86344ab1281391d3ea1b458dc18ae443985`. Main includes #44 N1, #52 real hosted MiKTeX and #51 C/N2 import-evidence correction. B branch historical parent `75e5cb046370ed7fbd67a24bf3ba96664bbb98d3`. No #37/#43 remerge, no changes to C/A/D/E/F or core API.

## User-facing vertical

Preserve the B10/B11 consolidated three-pane Split: editable TeX, approximate pointer guide plus exact XeLaTeX PDF, compact C-catalogue inspector and Russian F1. Six primitives use C generators and source-revision-checked, undoable patches. Rebase only B-owned sources and B10/B11 plans/insights onto current main.

Fix a reproducible gesture design defect: an Alt-initiated pointer drag used to fall through the click-only Alt selection branch and insert a new primitive on drag-stop. Capture selection intent through mouse release even when the Alt modifier is released first; preserve normal non-Alt gesture afterward. Never confuse guide geometry with the authoritative PDF.

Regression gate for merged C/N2: six Session inserts must work in an explicitly imported document with fontspec/unicode-math font settings and a later opaque `\\newcommand`, with byte-exact undo. An opaque command before the imports remains UNKNOWN and cannot be rewritten. Keep C as the only import scanner/catalogue.

## Acceptance/evidence

Run exact HEAD cargo fmt, app tests (including UNIT_EVENT pointer frames and C/N2 regression), Clippy, actual N1 Session→XeLaTeX PDF, and D matrix. Inspect individual job logs before PASS; old #50 SHA N1 FAIL does not count against the new source head, nor does a green older SHA prove the new commit.

Physical Windows 10 x64 independent MiKTeX and Mac ARM64 M1/M4 screenshots/dialogs/IME/Retina: NOT_RUN. Hosted Windows Server MiKTeX and macOS CI are separate evidence classes. External XeLaTeX remains the only exact renderer.

Integrator handoff: PR #50 head SHA, check URLs, status by workflow, changed-file list and any blockers; no automatic merge or release claim.
