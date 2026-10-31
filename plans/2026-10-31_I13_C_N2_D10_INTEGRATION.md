# I13 — combined C/N2 + D10 integration acceptance (2026-10-31)

Scope: `i-shutov/tikzarium` only. Owner requirements: native TikZ/PGF syntax, single C catalogue and contextual Russian help, editable source alongside exact external XeLaTeX PDF, independent installed/project-loaded/compatible/tool/help evidence. No TeX/CAS implementation or opaque source rewrite.

## Delivered and merged

- C/N2 PR #58, exact HEAD `7114d2d9bb3ce622dd7f1523e53f72082557d446`; main merge `8a33b2f67f7e72202e8abbe31f74ec21d22ac889`. One catalogue holds 6 native primitives and 4 documented libraries; source-safe import scanner detects late/opaque imports as UNKNOWN instead of treating absent as confirmed; exact source-location patches remain revision checked and reversible.
- D10 PR #63, exact HEAD `606fd4b3b3472acc8ea78b9d45dde37c7c4ee6d5`; main merge `aa6d1d08caee984d5f31ac13396e346fc451c8fe`. Existing actual MiKTeX Windows Server CI audits sixth positive baseline PDF and real engine identity of both negative errors. No new separate fixture-only proof or relaxation of required package setup.
- Each PR included its own code, unit regressions, lane plans/insights and five/four complete CI families, respectively. This I13 document updates global integration evidence and CHANGELOG without modifying production source or duplicate legacy #37/#39/#43.

## Acceptance checklist (evidence, not promises)

- [x] C exact-head Rust/D QA/N1 XeLaTeX/hosted MiKTeX/font workflows PASS.
- [x] C versioned catalogue includes 4 library requirements/help records, linked manual, verified example; `UNKNOWN` for nonliteral document-body/imported declarations.
- [x] Independent local external TeX Live XeLaTeX compilation of four documented examples (four one-page PDFs); **not GUI or MiKTeX evidence**.
- [x] D exact-head Rust/D QA/hosted genuine MiKTeX/font PASS; six positive PDFs inspected for Unicode/embedded fonts, negative errors/no PDFs and unchanged 9130 package inventory.
- [x] Combined main `aa6d1d08caee984d5f31ac13396e346fc451c8fe`: post-merge Rust [41217239643](https://github.com/i-shutov/tikzarium/actions/runs/41217239643) 3/3; D [41217239580](https://github.com/i-shutov/tikzarium/actions/runs/41217239580) 7/7; real hosted MiKTeX [41217239682](https://github.com/i-shutov/tikzarium/actions/runs/41217239682) 1/1, audited artifact `13048052949`.
- [ ] B16 #62 independent integration: headless real-toolbar Response 12 UNIT_EVENT cycles passed, draft remains; ensure combined-main re-test when integrating.
- [ ] Actual Linux/X11 #48: 6/6 saved native pointer gestures, F1 visible-state inspection and GUI XeLaTeX Build/Export source/PDF. Current 5/6; obsolete hardcoded Cubic coordinate, **FAIL**, no full PASS.
- [ ] Physical Windows 10 x64 with separately installed MiKTeX and physical Mac M1/M4 external XeLaTeX native GUI/HiDPI/IME/theme/font verification — **NOT_RUN**.

Historical C-only post-merge MiKTeX run 41217225528 failed before PDF on a network timeout in the *private* package index refresh; this remains an observed transient external setup failure, not accepted PDF evidence. Later exact main run 41217239682 succeeded without relaxing requirements. Lua-only graphdrawing remains not XeLaTeX-native. No release.
