# I56 — N2 four-library source-to-PDF acceptance (2026-11-02)

Main baseline: df590b196969e4e8a98b3403dae64c69028c9189. Scope only i-shutov/tikzarium. AGENTS, product spec and current N1–N5 roadmap remain authoritative.

## Scope and measurable vertical

The native egui panel has four C-owned library imports: arrows.meta, positioning, calc and fit. Prior real-X11 proof covered positioning only. Expand actual production-handler UNIT_EVENT exercises to all four, plus independent compilation of the unmodified C-owned source examples via the external Linux XeLaTeX. Do not claim source compilation implements a missing visual tool adapter.

* B native handler: real egui Context::run pointer press/release events, each collapsed panel → specific row → Connect → stable expanded row → Disconnect → Undo twice, with source-preserving CRLF, Unicode and opaque macro checks and disk readback.
* C: existing n2-library-fixture binary emits a full original C catalogue example for every library. No duplicate templates.
* D: Linux TeX Live XeLaTeX with shell escape disabled; four PDFs, fonts when applicable, extracted A/B from positioning/fit, raster PNG, source hash before/after and engine provenance; existing N1 artifact upload.
* Status axes installed / project-loaded / compatible / implemented-tool / help-available remain independent. No automatic TeX installation or compiler fallback.

## Integration gates

1. Exact-HEAD Windows/macOS/Linux Rust CI and real egui UNIT_EVENT tests PASS.
2. Real hosted Linux TeX Live XeLaTeX four-example compilation, PDF/text/font/raster audit and source hashes PASS; independent artifact inspection mandatory.
3. Separate existing hosted X11 positioning/Undo/Open/F1 and six-primitive smoke unaffected; test the GUI in real windows before claiming any new X11 result.
4. Hosted Windows Server/MiKTeX remains separate; physical Windows 10 x64/MiKTeX and Mac M1/M4/XeLaTeX remain NOT_RUN until executed.
5. Before any merge check current main/head, every required CI gate, manual artifact review and expected_head_sha; run new postmerge CI on main.

At authorship all new evidence gates NOT_RUN. This block expands N2 acceptance, does not implement N4 packs.
