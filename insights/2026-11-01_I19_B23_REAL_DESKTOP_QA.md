# I19 — precise evidence boundaries and source transplant

Current main e28a3a4fb067a0a752d720cea484043d52beab00. Draft B23 #62 exact source fb8908adff8b993670ae0a69f3f65d413318515a; existing I06 QA #48 exact source 37b724eb73f2d58c005633823d13779c35b84052 is dirty/diverged and remains untouched.

Prior I18 reviewed real B22 run 41247531372: 6/6 genuine pointer gestures persisted, GUI-export PDF valid, but Fit width profile [538,98] missed actual control (roughly [1027,72]), visible screen only displayed letter A; F1 was sent without Russian visual inspection and original clipboard byte file omitted from upload. These are not B23 PASS.

I19 isolates QA-only transplants on a fresh B23-based branch. Source build is exact checkout HEAD, not a stale separate B22 worktree. `git rev-parse HEAD:crates/tikzarium-app/src` must equal 0fbea02a14a08e568da831d78c562cd20dedb8d9 before running hard-coded screenshot coordinates; workflow and profile both reject source drift. Profile Fit width [1027,72] is hypothesis requiring new real evidence. Live F1 and fit screenshot differences are weak automated events, *not* Russian content or full-page visual acceptance. Canonical Poppler PDF raster is independent reference only, not a GUI replacement. JSON hashes and ZIP must include `clipboard-input.txt`.

First exact-head CI result: NOT_RUN. Whole-page preview and F1 content: NOT_RUN. Physical Win10 x64 user MiKTeX, Mac M1/M4 user XeLaTeX: NOT_RUN. No auto-install/fallback. Native TeX source and single C catalogue remain authoritative; PDF is rendered externally and interaction guide provisional.
