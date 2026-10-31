# Independent engineering lanes + integration watchdog
Date: 2026-10-31

Distinct autonomous scheduled work tasks have been created and assigned non-overlapping GitHub issues. Scheduling is **hourly**, not a claim of four simultaneous process workers.

A (XeLaTeX Core), issue #2: task `6ae56e7c79f48191b4eec06e62edd2f9`, minutes :07.
B (egui GUI), issue #3: task `6ae56e7ebfd4819194ae5c30d375b9bb`, minutes :17.
C (extensions), issue #4: task `6ae56e8125548191a31acf9524294ab2`, minutes :27.
D (CI/QA), issue #5: task `6ae56e834b788191ba7f050b1724ec9d`, minutes :33.
Integration/watchdog: task `6ae56d67790081919db4c6765ddc09eb`, minutes :52.

All tasks operate in `i-shutov/tikzarium` only, on isolated branches/PRs, respecting the source-of-truth and release QA contracts. An automation reports its own execution in the scheduled chat. The integrator is responsible for evaluating and merging qualified PRs, reconciling insights and avoiding SHA conflicts.

### Handoff rule
1. Read `main` SHA and all open PRs before making a change.
2. Select a bounded vertical workpack and avoid overlapping file ownership.
3. Implement code + tests + docs + `plans/` + `insights/` together.
4. Record actual QA: CI job URL/status, fixture data, platform limits.
5. Create/revise PR and communicate exact SHA and blockers. Do not silently merge unverified changes.
6. If task tools lack a compiler or desktop access, do not claim Rust or GUI PASS.
