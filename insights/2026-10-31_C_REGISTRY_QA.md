# C01 — Registry implementation and QA evidence
Date: 2026-10-31 · issue #4

## Source-of-truth read
main: 4ceca871fc2c3b661f92d64f9c6b39b473cebd0a.
W01 PR #6 at assessment: head 48bcce1b042e972cb710cb8f182fc95a5f29e98d. Existing W01 manifests had no schema/version compatibility contract, permitted arbitrary simple ID punctuation and reported missing if kpsewhich was unavailable. They correctly did not claim successful compilation.

Read AGENTS.md, docs/ARCHITECTURE.md, docs/EXTENSIONS.md, docs/ROADMAP.md, docs/QA_ACCEPTANCE.md, and W01 plans/evidence/handoff. The original scope is deliberately narrower than arbitrary executable plugins.

## New invariants
- Versioned strict TOML schema, UTF-8 and size/count caps.
- No executable fields. A package name is constrained to a filename; user-provided paths cannot become kpsewhich traversal arguments.
- Directory load is atomic: any bad .toml causes zero entries to be committed.
- The application can distinguish lookup unavailable from a failed lookup.
- Even if all packages are located, compilation stays NotTested. Lua graphdrawing is IncompatibleEngine for XeLaTeX.
- Visual editing remains false independent of manifest visual_features declarations.

## Tests added (not yet claimed PASS)
Rust unit tests exercise built-in validation, malformed input, traversal, duplicate IDs, unknown executable-style keys, unknown schema, lookup states, Lua-only incompatibility, atomic rollback, overlarge input and Unix symlink rejection.

The current execution environment has xelatex and kpsewhich but **no rustc/cargo/rustfmt**, so the Rust tests have not been run locally. GitHub workflows must provide real Rust compile/format/clippy evidence; they cannot be replaced by a TeX compile. No Windows 10 or physical Apple Silicon smoke was executed in this lane.

## Evidence interpretation
On this particular Linux environment, kpsewhich resolves tikz.sty, pgf.sty, pgfplots.sty, circuitikz.sty, tikz-cd.sty and tikzlibrarygraphdrawing.code.tex. This is an unversioned presence observation only, not a compilation/adapter status for any user machine. The package matrix intentionally marks environments NOT_PROBED and compilation NOT_TESTED.

R4 original historical corpus (135 TeX build reports, 131 strict warning results) is not rerun. Preserve O027/O028/O030/O047 as unresolved, and do not upgrade to PASS without fixture evidence.

## Integration limitations
A/C can keep Registry::new/status(&TexEnvironment), ExtensionStatus.installed/missing_files/compilation_verified. B's existing UI only prints Installed/Missing from the compatibility bool; it cannot yet display Unknown. Request UI follow-up in B's own branch rather than editing B-owned files in this PR.


## Additional real engine smoke (2026-10-31, Linux only)

Executed XeTeX 3.141592653-2.6-0.999996 (TeX Live 2025/dev/Debian) on Debian GNU/Linux 13 x86_64, with -no-shell-escape, -recorder, -halt-on-error, -file-line-error and -interaction=nonstopmode against five minimal TeX sources. Four positive fixtures produced a **one-page PDF**, compiler exit 0: core, pgfplots, circuitikz and tikz-cd. The deliberate negative graphdrawing-lua fixture returned exit 1 with the message "Package pgf Error: You need to run LuaTeX to use the graph drawing library". This is not generic package-wide or visual-edit compatibility.

For source SHA-256, observed PDF SHA-256, exit codes and environment see extensions/qa/2026-10-31_DEBIAN_LOCAL.csv and reproducible extensions/qa/run-smoke.sh. The full TeX logs remain only in the local testing sandbox and are not claimed as GitHub artifacts. Rust QA still depends on actual GitHub Rust jobs. No Windows 10 or physical Mac smoke was performed.
