# Linux B43 workspace integration: checkpoint before exact-head QA

Reviewed main 7cd2eb4d0c2f93445a9d3b492febcaeaaa3aaa84 and docs AGENTS/PRODUCT_SPEC/ARCHITECTURE/ROADMAP/full-plan and latest Linux-first decision. PR #98 and #99 already merged; no open PR at this checkpoint. Accepted N1/N2/N3 are not reimplemented.

Postmerge evidence: run [41852227017](https://github.com/i-shutov/tikzarium/actions/runs/41852227017) real I61 X11 SUCCESS, original artifact 13336352407 digest sha256:ded492d1bc07bc957ff5f1f2e02bbe18294bd36b17437bf24d600194f9835c68, but **individual archive PNG/PDF/SHA bytes not independently opened in this cycle**. Postmerge main Rust CI [41852227074](https://github.com/i-shutov/tikzarium/actions/runs/41852227074) and D QA [41852227261](https://github.com/i-shutov/tikzarium/actions/runs/41852227261) show FAILURE due to CANCELLED macOS jobs, while Linux and Windows matrix jobs passed. Never call entire postmerge matrix green; inspect concurrency and provenance before any merge. Optional Windows Server MiKTeX [41852227804](https://github.com/i-shutov/tikzarium/actions/runs/41852227804) failed in user MiKTeX step; this is not Linux GUI/physical Win10 evidence.

B43 code and tests authored; no new actual Rust or X11 testing before new PR CI. Confirm visual source/center/right proportions, wrap toggle/long Cyrillic line and F1 after X11 screenshots, original .tex/PDF/SHA, and Mac hosted jobs. N4/FlowBridge untouched.


## Same-PR native layout observation

Extended existing B42 actual X11 screenshot bootstrap with an **additional real clipboard paste** of an overlong Cyrillic/unknown TeX specimen and a third PNG. The existing 01/02 reference screenshot capture remains; B43 new PNG is candidate visual evidence only, not exact source/F1/Undo/PDF PASS. The ↵ Перенос checkbox is not clicked until coordinates are reviewed in the actual screenshot. Existing I61 source tree remains fail-closed on altered app source: re-pin only after visual comparison and real coordinate acceptance, never disable the gate. No extra CI-only PR.
