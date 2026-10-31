# C/N2 — source-attributed literal declaration evidence

Date: 2026-10-31. Base main: 6d15d86344ab1281391d3ea1b458dc18ae443985; N1 #44 and N2 import/disconnect #49/#51 are merged. Old C07 #39 must not be transplanted.

## One bounded user-facing vertical

Provide B with **read-only exact source provenance** for an explicitly loaded
TikZ package/library. An inspector can highlight the real \usepackage or
\usetikzlibrary member, rather than merely displaying CONFIRMED with no source
location. This is additive to N2 and preserves all six source-first generators,
one catalogue and the existing revision-checked connect/disconnect APIs.

1. Introduce C-owned \`DeclarationSite\` with name and physical-line UTF-8
   byte ranges; \`ProjectImports::declaration_sites(kind,name)\` has no side effects.
2. Attach only trusted literal declarations; support comma lists, package
   options, indentation, BOM, CRLF and UTF-8 comments. Sites after opaque
   commands or inside conditionals must not be invented.
3. Reject as UNKNOWN TeX package/library imports preceding documentclass,
   since pre-class \usepackage is not a valid project load. Unsafe import or
   removal proposals must still refuse and preserve the buffer.
4. Preserve SourceTarget/SourcePatch, ImportPlan/DisconnectPlan, five capability
   dimensions, six primitives and Russian help. No A/B/D/E/F file changes.
5. B handoff on PR #50 before edits: optional additive read-only source sites;
   B still owns visible diff/confirmation/undo. D/E/F independent QA untouched.
6. Exact-head CI Rust fmt/check/tests/Clippy and N1 compile workflow must be
   observed before PASS. Physical Win10 external MiKTeX and M1/M4 GUI are NOT_RUN.

No CST, TeX expansion, solver, PDF inversion, macro rewriting or package installation.
