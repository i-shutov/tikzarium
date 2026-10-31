# C/N2 — One schema for four source-backed PGF/TikZ libraries

2026-10-31. Scope strictly stream C in i-shutov/tikzarium. Base main `b7c8e993b9da64060dfd3261833e4be3a1d280ba` (#44/#49/#51/#55 already merged), no replay of #39.

## End-to-end delivery
1. Existing six generators and 28 Russian parameter help records stay unchanged. Extend the existing versioned `catalog-v1.toml` with exactly four declarative library descriptions: arrows.meta, positioning, calc, fit, with native TikZ syntax, requirements, accurate primary-manual pointers, effects, examples and warnings. Missing real PGF minimum version remains UNKNOWN. Library metadata cannot execute code.
2. Add a small additive C API for B's future library panel: `Catalog::library`, `Catalog::libraries`, `capabilities_for_library` and existing read-only declaration sites. Keep installation external/caller-provided and independent from project-loaded, XeLaTeX compatibility, tool existence and help. No visual-edit PASS from a catalogue entry.
3. Share the four stable names with existing literal connect/disconnect planners, preserving source byte ranges/revisions, CRLF, comments, user macros and reversible SourcePatch. On UNKNOWN, refuse with reason. No full CST, TeX/PGF solver, PDF inversion or package installation.
4. Provide generated full TeX examples for D via `n2-library-fixture` and independent Rust tests for status separation, library metadata, four connect/disconnect paths, roundtrip inverse, stale revision and N1 source fixture identity.
5. Coordination: contract comment on B #50 before editing shared types. No B app/A build/D/E/F files changed. Publish code+tests+docs+plans/insights as ONE C PR.
6. Evidence gate: exact HEAD cargo fmt/check/test/clippy + hosted XeLaTeX integration to be verified from workflow logs. Physical Windows 10/MiKTeX and macOS M1/M4 GUI NOT_RUN; no release claim.

## Rollout
B can read `Catalog::libraries` with non-fabricated statuses, show the actual package/library source link, then call C planners after explicit user choice. D can execute example fixture generator and negative cases. Visual library-specific tooling remains an N2 follow-up outside this C metadata slice.

## Consolidated integration checkpoint

The C/N2 library metadata and safe late-import evidence were independently developed in C draft PR #58 and PR #61. The consolidated C branch includes both without carrying A/B/D/E/F file changes into the PR diff. One extra public-API regression asserts that the library panel retains five independent states when a real XeLaTeX document imports `calc` after `\\begin{document}`, and refuses a stale/unsafe source proposal. B still owns visible diff/confirmation/Undo; D/E/F still own independent validation. No parser, installation, engine fallback or implicit GUI capability is introduced.
