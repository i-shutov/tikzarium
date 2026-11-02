# I56 N2 coverage research and QA checkpoint

Date: 2026-11-02. Source baseline main df590b196969e4e8a98b3403dae64c69028c9189. No production behavior changes.

## Concrete gap

B39 native egui source-transaction handler exercised only first catalogue row arrows.meta. Independently accepted actual Linux/X11 Connect/Disconnect/Undo/Save/Reopen + PDF concerned only positioning. Four exposed records do not equal four independently verified workflows; this is a coverage gap, NOT a demonstrated user-facing failure.

## Work

One substantive acceptance vertical: run the same production egui panel handler for all four isolated events with fresh contexts; check source byte-locality, CRLF, opaque macros, inverse Undo and file roundtrips. Generate four complete original C catalogue examples through n2-library-fixture and add real Linux XeLaTeX/PDF/raster/font/source audits to existing N1 CI and its artifact. Geometry-only arrows.meta and calc examples can legitimately contain zero embedded fonts; positioning and fit contain textual A/B nodes and must have embedded fonts. Preserve engine identity and avoid implying TeX Live equals MiKTeX.

## Explicit limits

UNIT_EVENT is not a host GUI test. Linux TeX Live is not Windows MiKTeX. The catalogue does not advertise positioning/calc/fit as implemented visual adapters; no solver, package installer, extra catalogue or substituted engine is introduced. Real-X11 clicks remain proven only for positioning; physical Win10 and Mac ARM NOT_RUN. No new exact-head CI or artifact had run at the time of writing; merge requires its own visual inspection and later distinct postmerge evidence.

## First exact-head CI and repair

The first PR #84 commit `2b73fdc` was **not accepted**: n1-authoring workflow invalid (zero jobs), Rust fmt failed on three OS, and two X11 jobs rejected obsolete exact app/src tree before opening egui. Distinguish CI schema and test-code tree mismatches from product failure. Next repair keeps the same PR, restores the entire workflow from known-good main with a simple script call, formats Rust, re-pins the three QA workflows and respective exact-tree profiles. All new head CI and manual artifact reviews NOT_RUN at repair authoring.
