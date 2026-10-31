# B08 GUI verification matrix — evidence pending

Code scope: C07 generator + B08 egui adapter; external XeLaTeX exact-PDF rendering; no independent PGF/CAS engine. Record exact SHA, OS version, screen DPI, MiKTeX or TeX Live version/executable, package versions, screenshot and PDF SHA-256 for every physical run.

| Scenario | Hosted CI | Physical Win10 + MiKTeX | Physical Mac M1 | Physical Mac M4 |
| --- | --- | --- | --- | --- |
| Source left, approximate guide + exact PDF center, C help/properties right at 1366×768 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| All six C-native tools click/drag → ordinary TikZ code beside guide | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| C-only parameter schema and Russian F1/hover help, units/default provenance/manual | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| Arrow blocked before arrows.meta; explicit library diff → enable → undo | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| Node plain Unicode text escaping and raw user math mode | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| C-generated command select, edit parameters, save/reopen, exact PDF/build | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| Unknown macro/comment/CRLF preservation; tampered marker edit refusal | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| Light/Dark/Midnight/Paper × Compact/Comfortable: figure/PDF unchanged | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| Font inspector independent of GUI theme; actual unicode-math/fontspec glyphs | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| Native open/save dialogs, Windows IME/macOS input, 100%/HiDPI scaling | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |

Automated unit tests are separate evidence: `c07_catalog_controls_six_generators_and_math_reopening`, `c07_plain_node_escapes_tex_characters_and_preserves_parentheses`, `library_and_package_declarations_are_explicit_and_undoable`, `undo_refuses_external_changes_without_mutation`, plus inherited tests. An actual GUI screenshot is not fabricated from unit tests. Hosted macOS runners and Windows Server are not physical acceptance.
