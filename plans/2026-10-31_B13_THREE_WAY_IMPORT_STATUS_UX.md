# B13 — honest project-load status in the TikZ authoring inspector

Date: 2026-10-31. Owner: B (egui), repository `i-shutov/tikzarium` only.

## Baseline and scope

Fresh main was `6d15d86344ab1281391d3ea1b458dc18ae443985` (N1 #44 merged). Continue existing isolated B10+B11+B12 branch/PR #50 rather than opening another micro-PR. C #55 is an unmerged read-only import-provenance proposal and is **not** consumed; no changes to C public APIs. Read AGENTS, N1/B09 plans and insights, open PRs before modification.

## Reproducible UX ambiguity

The Split inspector collapsed C/N2 `Absent` and `Unknown` to the same `UNKNOWN/ABSENT` label for top-level TikZ load status. This loses actionable information: an absent direct import may admit an explicit C/N2 patch, whereas an opaque preamble must fail closed without guessing.

## B implementation and acceptance

- Feed `Capabilities.loaded` from the **existing C/N2** `ProjectImports::status(ImportKind::Package, "tikz")` — not B's own parser.
- Render `CONFIRMED`, `ABSENT`, `UNKNOWN` separately in the Split inspector and the selected tool's C-derived requirements.
- Give different Russian explanations for absent direct imports and unknown opaque preambles. Source editor remains available in both.
- Keep installed, external XeLaTeX availability, tool implementation, help and figure/GUI fonts separate; never infer installed packages from a direct import.
- Add regression coverage with confirmed literal TikZ, absent literal TikZ and opaque macro preamble. Existing real egui six-tool events, Alt capture, F1, undo-after-edit and save/reopen tests remain unchanged.
- No new TeX/CAS engine, no PDF inverse map; provisional coordinate grid remains explicitly unregistered to the authoritative external XeLaTeX PDF.

## QA gates

For the final exact branch HEAD run native Rust fmt/check/test/Clippy, D matrix, N1 actual-source XeLaTeX, hosted MiKTeX proof and font integrity; report each separately. Prior parent B12 HEAD `99cff2e19e87274590156cda2c1d3c43c5b97bee` passed five workflows (N1 41206405621; hosted MiKTeX 41206405622; fonts 41206405593; Rust 41206405619; D QA 41206405607). **Those results are not proof of B13.**

Physical Windows 10 x64 (independent MiKTeX) and Mac M1/M4 GUI screenshots, actual native dialogs and 1366x768/Retina, IME: **NOT_RUN**. UNIT_EVENT is not physical GUI. Do not merge until final exact-head CI results and integrator review.
