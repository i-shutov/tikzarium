# B08 — catalog-driven authoring integration QA and evidence

Date: 2026-10-31. Baseline main observed 0aa78ae22df0ae84705ba461f017fce256325875. Read AGENTS.md, corrected full-scope plan and benchmark insight, and open PRs #26/#27/#28/#34/#36/#37/#38/#39/#40/#41/#42. C07 head f5e31c54604d567bcfd8c84eb84cbc7c1ad821ac; B07 head 12bdd0840f197d3c46ba8817887fe1a8b6c196c2.

## Implemented in B branch

- Replaced B07's six-source-generator/help table with C07's existing one-schema Catalog. Palette labels/hover, F1/inspector, parameter typing/units/default provenance/manual reference and generated-source commands all refer to C data.
- B-owned gestures and approximate guide retained, but native TikZ code now generated with explicit cm units and C arrow/node modes. Only app-owned generated source commands are recognized for re-edit; unknown source remains untouched.
- Minimal, version-checked C SourcePatch for insert, parameter edit, explicit preamble activation and undo. Undo refuses direct Source edits; deterministic reopen recognition for supported commands.
- Corrected B07 rustfmt radius line. Separate B08 regression tests cover all six commands/catalog parity, math/text Unicode, explicit arrows.meta, direct Source conflicts and unrelated bytes.

## Real external TeX fixture result (not GUI)

Local Debian host: /usr/bin/xelatex with -no-shell-escape, -interaction=nonstopmode -halt-on-error -file-line-error.
One-page manually assembled B08-compatible TeX under DejaVu Serif and fontspec, including six primitives, arrows.meta Stealth, Cyrillic escaped underscore and a user-defined TikZ style.
**XeLaTeX process: PASS exit 0; PDF produced and rasterized (pdftoppm); visually inspected**. Input SHA-256 6fe3a8c198fc5b9e178506b9ba34bccd11ec8b5e538b709dd533bce71c240d8e; PDF SHA-256 f781c316debb0b1b4505e31bfc6cb65107bf6a6dbb653b2970725bb9eafced0. The independent B08 fixture stored in the PR is portable ASCII and must be tested separately in CI; hashes refer only to the local proof, not to that repository fixture.

Earlier local trial erroneously used a control sequence as a TikZ key and failed; it was replaced by a valid \tikzset style and is NOT counted as a product defect. Local TeX proof does not prove compiler execution from GUI, C Rust output parity, or physical Win10/M1/M4 behavior.

## CI evidence and blockers

B07 PR #37 on SHA 12bdd084: Rust CI FAIL because cargo fmt --check found a radius assignment reflow in tikz_canvas.rs; fixed in B08. B07 font workflow PASS, D QA still queued at preflight. C07 PR #39 generated source has suspicious raw source text for math mode/escape ('$' char missing in the fetched source); exact Rust CI pending and must be diagnosed by C owner.

B08 final SHA: Rust fmt / cargo check / tests / clippy / generated-source parity / hosted Windows/macOS / native physical GUI = PENDING or NOT_RUN until independent workflows complete. Do not mark PASS on a queued job or claim hosted Windows Server means Windows 10 with MiKTeX.

Open QA: verify source edit cursor/focus/undo after typing, native Save/Open with Unicode path, theme Light/Dark/Midnight/Paper at compact/comfortable, precise PDF not aligned with provisional guide, missing arrows.meta workflow, node text math/Unicode, control points, external builds after parameter Apply. Physical screenshots and screenshots at 1366x768 and Retina are NOT_RUN.

## Next gate

Review final B08 exact-head CI logs, fix only B app ownership failures, request C fixes for C07 compilation faults, then integrator cherry-pick/merge chain without duplicating B07. Keep app's own plans/insights in this PR.
