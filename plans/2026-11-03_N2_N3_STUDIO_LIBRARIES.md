# N2/N3 Studio connected libraries — execution plan (2026-11-03)

Baseline main 3fb25ca7; N1 hosted Linux/X11 accepted, PR #91/#92 merged. No active PR existed on entry.

## One integrated user path

Open actual Rust/egui Studio → Libraries tab → see one C catalogue's Russian syntax/help and five independent axes → select library → inspect source diff → Connect → saved ordinary TikZ/TeX → Disconnect/Undo → GUI Save/Open → external XeLaTeX → PDF with Unicode and embedded fonts. Preserve CRLF and unknown-but-defined user macros. No interpreter/solver/CAD or background installation.

### Source and evidence

C TOML \`probe_files\` explicitly maps arrows.meta to \`pgflibraryarrows.meta.code.tex\`; positioning/calc/fit/shapes.geometric/shapes.misc to their own \`tikzlibrary*.code.tex\` names. No guessed filename constructor. Probes use core \`TexEnvironment::probe_package\` only on app startup or explicit TeX Refresh. TeX Live uses sibling kpsewhich; MiKTeX sibling findtexmf without installer flags; unknown distribution/helper => UNKNOWN. This is installation evidence only, separate from project preamble, engine target, real generator, help metadata.

PGF manual https://tikz.dev/library-shapes Section 71: umbrella shapes compatibility-only. Direct shapes.geometric (diamond) and shapes.misc (rounded rectangle) examples compile locally with external TeX Live, Cyrillic/DejaVu PDF, but there is no graphical shape editor.

### Acceptance

1. Exact-HEAD Rust fmt/Clippy/unit/negative tests and both TeX engine probes, C catalogue count and help syntax.
2. Hosted real Linux/X11 Studio Connect → source patch → Save/Open → Disconnect/Undo → external XeLaTeX PDF; original .tex, .pdf, PNG, logs and SHA reviewed manually. Unit egui pointer tests are not this proof.
3. Native Win10 x64 MiKTeX and Mac ARM M1/M4 XeLaTeX GUI smoke, package/font/theme invariance and installer remain NOT_RUN until real hardware. N4 domain packs cannot displace N2/N3/N5.

Merge only exact-head CI + evidence audit + expected_head_sha, then separate postmerge checks and checkpoint.
## Initial QA feedback and correction

PR #93 original GUI artifact `13187149288`: N1 subvertical passed again; N2 first click was blocked by an expected dirty-scratch modal on GUI Open, not by library logic. The driver now explicitly confirms discard before touching Libraries and validates a changed dock screenshot. Four→six C catalogue regression tests are updated; historically scoped I56 four-library test remains four. Rust formatting corrected to exact hosted diagnostics. All reacceptance evidence remains PENDING until new exact-head workflow and manual original review.
