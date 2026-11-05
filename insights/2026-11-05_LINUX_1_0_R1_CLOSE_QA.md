# R1 independent finding and implementation checkpoint — 2026-11-05

**Authority:** Linux-first decision and finite release blocker register [#103](https://github.com/i-shutov/tikzarium/issues/103).

- Old main `cd774515`: native X11 WM_DELETE_WINDOW of a dirty packaged release exited 0 and discarded source. `app.ron` only persisted UI/window settings, not a recovery buffer. The existing dirty-Open modal was not a close guard. Original pre/post PNG and real Xlib event recorded with exact artifact 13384249831.
- Correction in `crates/tikzarium-app/src/main.rs`: native close intercept, explicit Save/Discard/Cancel modal, safe typed destination for scratch and existing source, error preservation, UI shortcut blocking while modal. No TeX or cross-platform engine changes.
- Headless Rust event test injects egui `ViewportEvent::Close` and checks `CancelClose`; additional Unicode/occupied-path test prevents unauthorized overwrite.
- `scripts/qa_r1_dirty_close_x11.py` exercises real extracted launcher, inserts source canary by xdotool, checks copied source, sends WM close, verifies process alive, cancels with Escape, verifies exact bytes, saves and verifies normal clean close. It writes report, PNG and SHA256 ledger (the bash workflow runs on disposable hosted Ubuntu). In case of red tests use its original evidence, not unreviewed assertions.
- **Current acceptance = PENDING** until exact PR-head jobs, original screenshots and PDF/TeX SHA review. R2/R3/R4/R5 are separate live blockers, not covered by this R1 candidate. Physical Linux remains NOT_RUN.

## Exact-head CI finding: unsupported close command (2026-11-05)

- [N5 run 41966459231](https://github.com/i-shutov/tikzarium/actions/runs/41966459231) at `4a211ade` passed Rust/Linux/Windows/macOS, I61, N1, B42, fonts and the packaged six-tool/N2/N3/PDF integration. Its isolated **R1 packaged step failed before reaching the close handler** because Ubuntu 24.04 `xdotool` does not expose `windowquit`. The previously attempted `windowclose` destroys the X11 window and may crash winit; it is not a valid test of native save confirmation.
- Use `wmctrl -i -c` in the same Xvfb+Openbox step. It sends an EWMH `_NET_CLOSE_WINDOW` request to the window manager, which performs the normal `WM_DELETE_WINDOW` protocol, giving the application a chance to cancel. Install **wmctrl only on disposable CI host**, not as a product dependency. Keep Alt+F4 keyboard verification separate. New exact-head CI and genuine screenshots are **PENDING**.
