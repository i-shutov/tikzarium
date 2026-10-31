# B07 native TkZ GUI screenshot smoke · all NOT_RUN
For each OS record exact PR HEAD, source hash, OS version, CPU/GPU, DPI, MiKTeX/TeX Live engine path/version, Poppler version, PDF SHA and screenshots with SHA-256. Windows 10 x64 **physical** and Mac **physical** M1/M4 are required. Windows Server 2022 or hosted macOS CI does NOT substitute.

| Scenario | Check | Win10 | Mac M1 | Mac M4 |
| --- | --- | --- | --- | --- |
| Split 1366x768 | Source, exact PDF+guide and properties/help visible together | NOT_RUN | NOT_RUN | NOT_RUN |
| Create six primitives | Palette click/drag -> source selected -> TeX command | NOT_RUN | NOT_RUN | NOT_RUN |
| Parameters | x/y, circle radius, cubic bend, node text -> narrow undoable patch | NOT_RUN | NOT_RUN | NOT_RUN |
| Source-first | Opaque macros/comments/multiple pictures/tampered marker never overwritten | NOT_RUN | NOT_RUN | NOT_RUN |
| F1/hover help | Russian syntax, type/units, default/UNKNOWN, example, source section, prerequisites | NOT_RUN | NOT_RUN | NOT_RUN |
| Load diff | Installed-but-not-loaded offers explicit usepackage diff + undo, never automatic install | NOT_RUN | NOT_RUN | NOT_RUN |
| Build | Save -> external XeLaTeX -> exact PDF; verify different guide/PDF, log & checksum | NOT_RUN | NOT_RUN | NOT_RUN |
| Reopen/undo | Reopen generated .tex, select command, change, undo; preserve other bytes | NOT_RUN | NOT_RUN | NOT_RUN |
| Native UX | Open/Save As, Cyrillic IME, Light/Dark/Midnight/Paper, compact/comfortable | NOT_RUN | NOT_RUN | NOT_RUN |
| Scaling | Windows 100/125/150%, Retina, no collapsed controls | NOT_RUN | NOT_RUN | NOT_RUN |

Screenshots B07_<OS>_<HEAD>_<scenario>.png. Attach full command log, original/after diff, package statuses. No screenshot/host PASS is claimed by writing this protocol. The B07 guide is a separate rough pad, never an overlay precisely tied to arbitrary TikZ transforms.
