# C07 — TikZ-native six-primitive contract and first real generators

Date: 2026-10-31. Independent lane C, owner decision same date **overrides** the superseded long universal-CAD / full-CST / solver / PDF-decompiler plan and PR #32 forecast.

## Read-first baseline and non-overlap
- main SHA read before starting: `c5c8c1576b6288e1d125d558d0d4872b321efb86` (B06 merge). Open PRs read, including #25/#26/#27/#28/#31/#32/#33/#34. C04 #26 and C06 #34 are independent and retain their own QA ownership; C07 does not change their files.
- Read AGENTS.md, current extension Rust registry, C01/C05 plans+insights, docs/EXTENSIONS.md, PACKAGE_MATRIX.csv, and current source fixture structure. No changes to A core, B app, D QA workflows, old C04 static catalogue scripts, or PACKAGE_MATRIX.csv (C04 check assumes exactly 14 rows).
- B contract requested before writing through issue #35. No B types are changed here. B must review before connecting to egui.

## Specific vertical result
1. One C-owned versioned TOML schema `extensions/primitives/catalog-v1.toml` contains **six** stable tool IDs, 28 typed parameter entries, native command syntax templates, requirements, default+provenance, explicit allowed units/choices, Russian explanations, warnings and interactions, and manual sections/URLs. Composite parameter identity = tool ID plus local parameter ID.
2. `primitives.rs` deserializes and validates that bundled schema, exposes metadata for toolbar/inspector/completion/help, and emits only native TikZ commands. No Lua/CAS/PGF reimplementation. All six require package tikz; arrow additionally requires `arrows.meta`. Minimum proven PGF version is UNKNOWN; manual target v3.1.12.
3. Only editor-generated coordinate literals are bounded/validated (signed decimal with pt/mm/cm/in, radius positive, arrow tip and node mode enum). Plain node text is escaped. Mathematical node content remains user-authored raw math TeX; no claim of sandboxing or compilation of arbitrary macros.
4. `SourcePatch` accepts an explicitly known byte range, exact old text and source revision, replaces that range only, returns inverse patch for undo. No scene model, full-document reserialization or PDF decompilation. B owns range discovery and revision integration.
5. Three sets of evidence: canonical six-tool fixture and stdout generator binary, declarative negative input cases, and Rust tests for schema/help completeness, actual syntax equality, text/math handling, statuses and revision/undo conflicts. D can compile the generated source with external XeLaTeX and add hosted/physical smoke matrix in its own files.

## Capability semantics and platform acceptance
- INSTALLED: a separate TeX file search (or UNKNOWN).
- PROJECT_LOADED: observed `\\usepackage` / `\\usetikzlibrary` in the current source; unknown macros => UNKNOWN, never invented NOT_LOADED.
- ENGINE_COMPATIBLE: stated native XeLaTeX requirement, distinct from actual fixture build outcome.
- TOOL_IMPLEMENTED: source emission tested. This does not mean GUI drag interactions are implemented.
- HELP_AVAILABLE: schema completeness, distinct from tool implementation.
- VISUAL_EDITABLE remains false until B binds controls and revision-checked source ranges.

External XeLaTeX is essential: Windows 10 x64 uses independently installed MiKTeX, Mac ARM64 uses user-installed XeLaTeX. Hosted CI Windows Server is not physical Windows 10; hosted Mac is not real user's M1/M4. No TeX engine switching to mask Lua-only graphdrawing.

## Verification gate / handoff
1. `cargo fmt --all -- --check`, `cargo test -p tikzarium-extensions`, `cargo clippy -p tikzarium-extensions --all-targets -- -D warnings` on **exact PR HEAD**; fix all failures before PASS.
2. `cargo run -p tikzarium-extensions --bin primitive-fixtures > all-six.tex` and compare with committed fixture. XeLaTeX compile under `-no-shell-escape`; ensure one-page PDF with pdfinfo. No dependency on standalone.cls. Negative values must be rejected by the generator and never invoked in TeX.
3. B accepts or requests adjustments to issue #35; leave their code untouched. D receives fixture generator and negative cases, and performs cross-host XeLaTeX checks with preserved logs, hashes and manuals.
4. Inspect PR diff and QA outputs. Do not merge until exact-head code checks green. Physical Win10 and physical M1/M4 GUI remain NOT_RUN, so release acceptance stays blocked regardless of CI.

## Current bounded follow-on (not universal architecture)
B: connect one generator end-to-end to inspector+visible code+minimal source patch; preserve unknown source. D: compile actual generated six-tool fixture on hosted Linux/macOS ARM64/Windows Server, then independent Windows 10 and M1/M4 smoke. C: incorporate B integration feedback without changing B-owned type definitions and add package-specific adapters only on evidence.

## C07 completion pass — actual semantic help and visual-QA gallery

Adopt the N1 integration contract (`SourceTarget`: exact byte range plus source revision) in C, preserve revision-checked minimal edits and undo, and correct the two U+0024 Rust character literals with explicit Unicode escapes. Fix `tikz.node.mode` documentation: `text/math` is an editor output selector, never a TikZ key. Preserve `all-six.tex` compiler regression; add a second six-panel labelled gallery generated by the same catalogue, with exact snapshot, XeLaTeX compile and rendered visual inspection. This is a single continuation of C07 PR #39, not a new micro-PR. Require exact-head hosted rustfmt/test/clippy and distinct physical Win10/M1/M4 checks before acceptance. Do not alter A/B/D source.
