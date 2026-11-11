# Scientific Studio 1.0 — SC1 core integration

Owner-approved release target: Scientific Studio 1.0. This imports the independently CI-tested SC1 from https://github.com/i-shutov/tikzarium/pull/146 onto the current main, not its outdated post-1.0 priority.

Base provenance: PR146 base 46fa3aa012514ec7eb886be88744ec61234304d1, head 179c7f525bcaaf3d6a4dc67793a3f776c7a9bb85; original 25 successful and 2 skipped hosted checks. Source files core dependencies.rs and lib.rs on new main matched PR146 base Git blob SHA exactly. Core changes and two tests are copied using PR146 head Git blob SHAs. No manual rewrite of scientific source, no filename changes and no new figure-format claims.

Implemented SC1 candidate: figure session/source revision, optimistic source edits/inverse Undo, build epochs, dependency origin/sha ledger, source/corpus immutable SHA and tamper-negative validation. It supports ONE figure at a time; Studio 1.0 still requires a higher-level multi-document project with per-document views/history. No second authority over source.

NOT ACCEPTED: project tabs; native GUI; shared scientific SC2 scanner, PGFPlots/SC3/AT4 Inspector; L3/L4; 142/103 scientific acceptance; native Win10 W2b/W3/DPI/IME. L0 corpus passes do not imply editable scientific figures. No personal Server/FlowBridge/shell escape/system changes.

Acceptance of integration: locked cargo fmt, strict clippy all targets, workspace tests and SCI L0 workflow on exact new branch. Keep original evidence and review independently, then integrate scientific SC2/3 (#148/#149/#151) separately after merging core. Stable Scientific 1.0 remains NO-GO.
