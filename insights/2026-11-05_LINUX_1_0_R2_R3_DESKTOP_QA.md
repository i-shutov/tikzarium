# R2 real Linux/X11 1.0 geometry QA

Baseline exact main: 8d6ddd5dacf10276292d8e97d93121ce2023b641. R1 accepted #104 remains unchanged.
FAIL before candidate: 1920x1080 scale2.0 client y22+height1120 => bottom1142; 62 physical px cropped.
Candidate code: 850x440pt minimum + monitor-aware egui viewport clamp. Tests and extracted package screenshots MUST be reviewed on exact HEAD; no PASS asserted by this document.
Required N5 candidates: 1366x768/1.0, 1920x1080/1.25, 1920x1080/2.0, real PNG+geometry+SHA; regression R1/i61/n2/PDF/font/Windows/Mac. R3 native XDG picker and R4 physical desktop NOT_RUN. R5 tag PENDING.

R3 new production candidate: explicit Linux XDG Open/Save/PDF picker menu controls; native PathBuf safety, atomic new PDF export. Portal-less virtual display cannot verify picker. Real backend GUI screenshots/keyboard/Unicode required. A Cargo dependency shift from target-gated to cross-platform rfd requires exact-head --locked CI.


## Independent exact-head assessment and further R3 safety fix

Reviewed the authentic PR head `1df3697818e623fb162b71b1d37f3c01c19a4c72`. Eight exact-head hosted workflows succeeded. Downloaded original N5 artifact 13390653515, whose ZIP SHA256 is `fa054edc1254766f878aadfae2a1b1706cf25182169478d3ce98191cc3fc977e`, and original I61 artifact 13390867228 SHA256 `484ed5a8ee6704e509bfce29675bac8938bd8ed31b7cff83b4fffbd9f00922e9`. Independent R2 desktop SHA256SUMS verification: 6/6. Client geometry:
- 1366×768 @1.0: (94,71;1180×680) — fully visible
- 1920×1080 @1.25: (223,142;1475×850) — fully visible
- 1920×1080 @2.0: (2,40;1886×1023) — bottom 1063, fully visible

Original 200% screenshot shows source/canvas/Properties/Help/status simultaneously, with no status clipping. Independently viewed `packaged-i61/figure.pdf`, `pdffonts` shows embedded DejaVuSerif and `pdftotext` gives Cyrillic «Не менять». Original report indicates all six tools/F1/Undo/Open/CRLF; those prove hosted X11 only.

Independent *actual UI click* test using release ELF, Debian Xvfb/Openbox without portal, found the File menu's «Выбрать файл…» entry. After clicking, the app stayed responsive and displayed «Выбор открытия отменён или XDG file portal недоступен; можно ввести путь вручную». This is a **pass for portal-less fallback**, not evidence of a real portal dialog. Real Linux desktop/XDG file-selection with Cancel/Unicode/Open/Save/Export remains NOT_RUN.

Further R3 hardening in the same PR: stage complete PDF in same destination folder, sync, publish via `persist_noclobber`. Tests preserve occupied target bytes, Unicode filename and clean error behavior. Current code commit has no accepted exact-head tests yet. Do not merge PR #105 until new full CI and actual native portal visual acceptance; R4 physical machine and R5 final tag remain outstanding.
