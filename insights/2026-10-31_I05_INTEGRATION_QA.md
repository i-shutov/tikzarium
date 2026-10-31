# I05 — Independent integration QA and provenance
Date: 2026-10-31. Starting main: `e3a78ae5646ef24994161c8ebe7bfaaf7a7d2ab6`.

## Confirmed at start
- I04 #23 merged into main as `62fc517f5bd0b243cb44d092937d0685663e4b0b`: exact head `5adcc770cc03`, GitHub Actions 41178741632 (3/3), 41178741675 (6/6), 41178741644 (1/1) successful. This is real Rust CLI/2-page TeX/Poppler evidence, not GUI mouse clicks.
- B04 #20 merged as `1edbe7101204e728daeb775d6dcbecc79f094729`, exact head `154741e67d71`, hosted 41176482625 three jobs green. Source lexical font hints are **not** effective font evaluation.
- C03 #21 merged as `e3a78ae5646ef24994161c8ebe7bfaaf7a7d2ab6`, exact head `a9e5aa67baee`: hosted CI 41177061724, 41177061828, 41177061720 green. But audit script was **not itself invoked by existing workflows**; this I05 workpack adds the real call.
- A #10 remains draft/unmerged due conflict with F02 font messages. A head `3af867cfcd32` had independently green 41171585266 three jobs, but copying A's diagnostics wholesale would lose current main's font-warning behavior. I05 combines both, not forcing old PR.

## Implementation changes made in isolated I05 branch
- Copy A runner/CLI/tests and preserve current `font_audit` module.
- Add `BuildDiagnostic.source` while retaining explicit `LaTeX Font Warning` and `Missing character` diagnostics.
- Failures now surface structured source line/log, only eligible current-file diagnostics are clickable; included-file source is displayed but not deceptively navigated.
- Record and re-audit actual `extensions/fixtures` compilation in Linux and D matrix on all hosted OSes. Storing summary JSON is not independent verification without checking source/log/PDF hashes.

## QA evidence boundary
This document records submitted changes, **NOT** a passed integration until exact-head Actions jobs and audit JSON are read. No Rust binary was run in the assistant's local sandbox, which does not contain rustc/cargo. Hosted macOS ARM64 and Windows Server evidence are CI_ONLY; Win10 and physical M1/M4 are NOT_RUN.

## Known risks
- `BuildOptions.log_path` may point to a user-selected location; atomic persist, canonical source equality guard and tests are essential.
- TeX failure log parsing is bounded. `font_audit.rs` remains a separate typed semantic audit, not automatically equivalent to source-linked BuildDiagnostic.
- Main Egui preview's stale detection still ignores changes in included assets unless the top-level source changes.
- C03 audited results bind hashes to a checkout and host, not signatures or licensing. CTAN package coverage is not the entire extension universe.
- Lua-only graphdrawing must remain engine-incompatible and cannot be advertised as a XeLaTeX feature.
