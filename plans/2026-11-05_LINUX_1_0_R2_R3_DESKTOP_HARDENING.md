# Linux 1.0 — R2/R3 desktop release hardening

Canonical register: https://github.com/i-shutov/tikzarium/issues/103. Freeze features, Linux x86_64/X11 first, Windows/Mac hosted CI retained.

## R2 release blocker
On an *extracted* release ELF at X11/1920x1080, WINIT_X11_SCALE_FACTOR=2.0 previously produced client (1,22;1920x1120) with bottom at 1142 >1080. 850×560 logical minimum imposed >=1120 physical height. R1 close protection in accepted main 8d6ddd5dacf10276292d8e97d93121ce2023b641 is not modified.

New candidate: lower ONLY minimum height to 440 egui points, keep 850pt width and all user DPI/theme settings. On actual viewport information, resize only oversize outer windows using logical monitor and measured decoration size with 16pt margin; do not rewrite source, reset scale, or replace PDF. Pure Rust examples for 1366x768/1, 1920x1080/1.25, 1920x1080/2 plus nonfinite values.

The N5 workflow executes the *packaged release launcher* under Xvfb/Openbox separately at each scale. Record original PNG and X11 geometry and fail if off-screen. Inspect output visually and verify source/canvas/inspector/status. This qualifies hosted virtual X11, **not** physical Linux.

## R3 release blocker
Linux native Open/Save/Export dialogs remain necessary. Preserve typed-path fallback and safe overwrite/dirty-source protections. Native portal proof needed before R3 PASS. R4 physical X11 and R5 final 1.0 release remain NOT_RUN/PENDING.
