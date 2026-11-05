# Linux 1.0 release freeze — R1 native close safety (2026-11-05)

Owner: TikZarium foreground integrator. Scope is fixed by [issue #103](https://github.com/i-shutov/tikzarium/issues/103), AGENTS.md and Linux-first owner decision. This is a production safety repair, **not a new feature**. Baseline main `cd7745157f7ed5553577410fc7b82736f65fb74f`; exact PR candidate subject to fresh CI and original visual review.

## Reproducible release failure

The original **packaged** Linux ELF under Debian 13 + Xvfb/Openbox accepted a real XTest source edit `releasecanary`, showed a dirty indicator, but exited 0 after normal X11 WM_DELETE_WINDOW without confirmation. A same-XDG relaunch lost the source and no `.tex` was saved. Previous successful N5/dirty-Open checks do not protect native application close. Original evidence and checksum ledger are in the 2026-11-05 release-blocker archive and issue #103.

## R1 corrective contract

- Detect `egui::ViewportInfo::close_requested()` at the root viewport during normal `eframe::App::update`; send `ViewportCommand::CancelClose` before returning if the TeX buffer is dirty.
- Offer a **modal** in Russian with explicit Save, Discard, Cancel. Cancel and Escape retain the window, source and Undo. Discard alone approves unsaved close.
- Save resolves a current document path or safe scratch candidate; the *File/Open* field never grants overwrite permission. Existing unrelated destination, invalid/empty path and write errors keep the modal and document open with a visible error. A valid save invokes the existing source-safe `Document::save_to` path, **then** closes.
- Block underlying editing/keyboard shortcuts while the close modal is active; do not mutate TeX as a side effect of showing the dialog. An already active dirty-Open dialog is never a replacement for dirty-Close protection.
- Clean documents close immediately. Preserve Windows/macOS Rust/GUI contracts; this shared egui logic is not Linux-specific.
- Test pure validation, actual egui viewport Close event -> CancelClose output, and packaged native X11 WM close/Cancel/Save -> clean close with original PNG, copied source bytes, source `.tex` and SHA. Hosted X11 evidence is **not** physical Linux acceptance.

## Exact-head acceptance and remaining gates

- New app tree must match pinned SHA in both the existing I61 script and workflow; do not weaken the lease.
- The N5 workflow must run `scripts/qa_r1_dirty_close_x11.py` on the **extracted release launcher**, and upload original PNG/bytes/report even when the acceptance fails.
- Run Rust/Linux/Windows/macOS, D QA, I61, N2/N3, XeLaTeX/fonts, B42 and the packaged R1 scenario on the same PR SHA; independently inspect originals, don't conflate previous-head green.
- This PR is **candidate** until the above steps succeed. R2 HiDPI clip, R3 Linux native pickers, R4 desktop hardware and R5 release publication remain open in issue #103. No tag or 1.0 claim.
