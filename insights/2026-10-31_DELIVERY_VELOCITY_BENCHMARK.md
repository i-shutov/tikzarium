# Scope correction and delivery benchmark interpretation

Date: 2026-10-31. Project: i-shutov/tikzarium. This insight supersedes the original calendar projection in PR #32; it does not erase the existing implementation or historical QA evidence.

## What was wrong

The previous plan expanded a TikZ-focused editor into a general graphics/CAD product with a complete CST, independent scene semantics, a geometry DAG and constraint-solving engine as sequential prerequisites. That was not the owner's requested product. The owner explicitly requires drawing with TikZ primitives according to connected packages, showing code alongside the figure, explaining commands/parameters and using an external MiKTeX installation on Windows.

The earlier 2–4-week, 4–7-month and 9–15-month calendar projections are **withdrawn**. The additional 5–12x slowdown and 4–8-PR/week assumptions were planning guesses, not measurements. They must not be presented as a benchmark-derived delivery schedule. There is no replacement calendar promise in this correction.

## Historical data retained, with limits

The initial inspection used main 8764a732b9a846a6ba1f111c9b656781195a6412. It counted 17 merged PRs between 04:18:52 and 07:57:49 UTC on 2026-10-31, a median PR-open-to-merge interval of about 36.3 minutes and a median seven changed files. Those are elapsed repository events, not measured engineering effort, feature-equivalent samples or a sustained rate. Stacked PRs, documentation, concurrent work, pre-PR coding, CI waiting and integration inflate or overlap the observations. They cannot determine an end date for a different product scope.

## Corrected architecture lesson

Use the installed TeX/PGF implementations for layout, fonts, formula evaluation and drawing. Rust supplies UI, parameters, native command generation, targeted source edits, process management and exact-PDF presentation. A lightweight authored-command representation and explicit supported source ranges are useful; a universal TeX interpreter, PDF decompiler, CAS or solver is unnecessary for the first drawing tool.

The main authoring surface is code plus drawing plus help. A shared command catalogue connects tool identity, syntax, parameter metadata, package requirements and explanations. Exposed parameter documentation must distinguish a TikZ default from an editor preset; missing knowledge is UNKNOWN, not invented.

## Upstream facts checked for this correction

MiKTeX's Windows installer is independent of TikZarium. MiKTeX can install missing packages automatically under its settings; merely not calling its installer is therefore insufficient to promise offline non-mutating compilation. Its XeTeX manual documents `--disable-installer` as overriding automatic installation for an invocation. A must verify that behavior through the actual configured XeLaTeX command and retain correct distribution-specific options.

Sources: https://miktex.org/howto/install-miktex ; https://miktex.org/howto/miktex-console ; https://docs.miktex.org/manual/miktex-xetex.html .

TikZ path/shape operations are native language features; the editor should generate them rather than recreate their final rendering. Reference syntax: https://tikz.dev/tikz-paths ; https://tikz.dev/tikz-actions ; https://tikz.dev/tikz-shapes . These reference checks are not execution evidence for new TikZarium GUI tools.

## New evidence to measure

Use completed user workflows: pointer/input → known TikZ command → parameter help → external XeLaTeX PDF → edit/save/reopen/undo. Measure first authoring slice separately from additional catalogue-driven libraries. Record generator reuse, incorrect-source edits, real MiKTeX/TeX results, exact-SHA integration and native GUI observations. Do not turn more PRs or more scheduled tasks into a claim of proportional speedup.

## Execution handoff

A: MiKTeX/runtime; B: native authoring plus visible code/help UI; C: shared command/generator/help catalogue; D: independent end-to-end QA. Existing automation prompts were replaced with this scope and immediate runs were requested for all four. Requests confirm dispatch only; results require separate evidence. The integration watchdog was also corrected so it must not adopt the superseded CAD/forecast plan.

Detailed workplan: `plans/2026-10-31_FULL_SCOPE_ROADMAP.md`. Product and architecture changes are in the same PR. Physical Windows 10/MiKTeX and Mac M1/M4 acceptance remains a distinct NOT_RUN/PASS/FAIL record, never inferred from hosted CI.
