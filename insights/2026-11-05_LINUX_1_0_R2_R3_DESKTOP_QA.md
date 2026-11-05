# R2 real Linux/X11 1.0 geometry QA

Baseline exact main: 8d6ddd5dacf10276292d8e97d93121ce2023b641. R1 accepted #104 remains unchanged.
FAIL before candidate: 1920x1080 scale2.0 client y22+height1120 => bottom1142; 62 physical px cropped.
Candidate code: 850x440pt minimum + monitor-aware egui viewport clamp. Tests and extracted package screenshots MUST be reviewed on exact HEAD; no PASS asserted by this document.
Required N5 candidates: 1366x768/1.0, 1920x1080/1.25, 1920x1080/2.0, real PNG+geometry+SHA; regression R1/i61/n2/PDF/font/Windows/Mac. R3 native XDG picker and R4 physical desktop NOT_RUN. R5 tag PENDING.

R3 new production candidate: explicit Linux XDG Open/Save/PDF picker menu controls; native PathBuf safety, atomic new PDF export. Portal-less virtual display cannot verify picker. Real backend GUI screenshots/keyboard/Unicode required. A Cargo dependency shift from target-gated to cross-platform rfd requires exact-head --locked CI.
