# Windows Administrator: preserve successful XeLaTeX stderr evidence (2026-11-07)

## Baseline and user objective

The owner-requested Cargo/PE and Administrator XeLaTeX blockers are already fixed in reviewed main `57f002f7bd7e2cb0f2369af18cdc75fe90ad78f8` by PR #121. Original personal Windows Server [run #42327186873](https://github.com/i-shutov/tikzarium/actions/runs/42327186873) and cross-platform hosted regression suite on the same main SHA are **SUCCESS**. Reapplying the older offline fix archive would regress the current token contract and is explicitly excluded from this change.

## Residual evidence gap

In `BuildService::run`, external XeLaTeX stdout/TeX `.log` is retained, and stderr is read into a bounded buffer. The failure branch included stderr in the failure report, but the success branch dropped stderr. On Windows an elevated Administrator's working MiKTeX may compile successfully while emitting `security risk: running with elevated privileges`. That text must be visible, without being mistaken for a failed process.

## Change (narrow, cross-platform)

- Only after the real child exited successfully, append bounded stderr to the returned `BuildArtifact.log` with an explicit **process succeeded** label; emit the same evidence to CLI stderr. Actual subprocess `status.success()` continues to decide outcome; a nonzero exit uses the unmodified failure branch.
- Preserve existing persisted native TeX `.log` unchanged. No privilege probing, token bypass, MiKTeX settings, UAC, user account, environment, package downloads, shell escape, timeouts, or process launching behavior changes.
- New Rust tests cover the common successful process warning including Unicode and empty-stderr log-byte preservation.

## Qualification

This PR is a traceability fix, **not a replacement for W2** native interactive Windows Server GUI tests in PR #122, nor physical Windows10 W3. It does not request self-hosted PR execution. Require exact-head Windows/macOS/Linux Rust CI and a manual review before merge, then trusted-main W1 validation through the existing guarded workflow. No installer or release tag.
