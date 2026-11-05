# Linux 1.0 — R2/R3 desktop release hardening

Canonical register: https://github.com/i-shutov/tikzarium/issues/103. Freeze features, Linux x86_64/X11 first, Windows/Mac hosted CI retained.

## R2 release blocker
On an *extracted* release ELF at X11/1920x1080, WINIT_X11_SCALE_FACTOR=2.0 previously produced client (1,22;1920x1120) with bottom at 1142 >1080. 850×560 logical minimum imposed >=1120 physical height. R1 close protection in accepted main 8d6ddd5dacf10276292d8e97d93121ce2023b641 is not modified.

New candidate: lower ONLY minimum height to 440 egui points, keep 850pt width and all user DPI/theme settings. On actual viewport information, resize only oversize outer windows using logical monitor and measured decoration size with 16pt margin; do not rewrite source, reset scale, or replace PDF. Pure Rust examples for 1366x768/1, 1920x1080/1.25, 1920x1080/2 plus nonfinite values.

The N5 workflow executes the *packaged release launcher* under Xvfb/Openbox separately at each scale. Record original PNG and X11 geometry and fail if off-screen. Inspect output visually and verify source/canvas/inspector/status. This qualifies hosted virtual X11, **not** physical Linux.

## R3 release blocker
Linux native Open/Save/Export dialogs remain necessary. Preserve typed-path fallback and safe overwrite/dirty-source protections. Native portal proof needed before R3 PASS. R4 physical X11 and R5 final 1.0 release remain NOT_RUN/PENDING.

## R3 code candidate added in the same PR
The File menu offers genuine OS file-pickers for Open, Save As, PDF export through rfd 0.15 default XDG portal on Linux. Portal-less Xvfb retains its existing manually validated typed-path controls. Native picker selection is *not* authorization to overwrite an unrelated document; PDF export uses `OpenOptions::create_new` atomically. No hidden downloads/TeX management. Actual native-dialog clicks, Cancel, Unicode path and overwrite protection remain **UNACCEPTED** until a real Linux/X11 portal backend is observed. Exact-head Rust build, Cargo.lock stability and N1/N2/R1 regressions required.


## Fixed-scope follow-through

R2 independent 1.0/1.25/2.0 hosted X11 original artifacts on head `1df36978` now show the exact extracted release fitting screen, with source, canvas, inspector and status. This is **hosted R2 candidate PASS**, not physical desktop qualification. PR #105 is still DRAFT because R3 native dialog is unqualified.

R3 native picker code is already in this substantive PR. Independent no-portal Linux X11 pointer test shows working menu and safe manual fallback. Add complete-then-publish PDF export: temp file in destination directory, `sync_all`, `persist_noclobber`, no target overwrite or visible truncated file. Retain the existing Linux XDG portal as explicit runtime prerequisite when using graphical Open/Save/Export. Need genuine real XDG dialog visual clicks for Open/Cancel/Unicode/Save/Export; do not equate absence-of-crash fallback with picker qualification. R4 physical Linux/X11 and R5 RC/tag remain separate required gates.
