# Owner decision — 2026-11-04 (latest): Windows-first on self-hosted Windows Server, cross-platform by design

**Status: CURRENT platform sequence.** This decision supersedes only the release order and execution-host priorities in `plans/2026-11-04_LINUX_FIRST_CROSS_PLATFORM_RELEASE.md`, AGENTS.md and earlier Windows-first snapshots. It does not revoke accepted N1/N2/N3, Linux B43 ergonomics work in PR #100, the normal editable TeX/canvas workflow, external-engine safety, or cross-platform architecture.

## New priority and distinct evidence boundaries

1. **Primary development and integration acceptance: the existing dedicated `tikzarium-winserver` self-hosted runner on user Windows Server 2025, interactive logged-in desktop session.** Do not touch FlowBridge's runner, credentials, worktree or machine. Check runner connection, user session/desktop availability, RDP lock/disconnect, Windows PowerShell 5.1, Git, Cargo, existing system-wide MiKTeX and Poppler before claiming availability. A successful headless job is not a real GUI PASS.
2. **First product release target: Windows x64 with external user-installed MiKTeX/XeLaTeX.** Real Windows Server GUI testing is the initial iteration path; **Windows Server PASS is not Windows 10 PASS**. Windows 10 physical qualification remains a separate explicit release gate, never silently inferred. If the owner's first Windows release is explicitly scoped to Server only later, document that separately; do not silently relabel Windows 10.
3. **Linux desktop x86_64/X11 becomes the next release**, with code, Linux hosted tests and real X11 regression retained. Linux B43 UI work remains relevant and must not be discarded, but does not block a Windows-first candidate unless it breaks shared behavior.
4. **macOS ARM/XeLaTeX follows**, preserving compile/test pathways; physical Retina/IME/notarization remain NOT_RUN.
5. **GitHub repository visibility has been observed as `public` via API on 2026-11-04.** Verify fresh visibility and Actions billing/runner status before making cost assumptions; do not claim that public CI is blocked by private-minutes exhaustion without current evidence.

## Mandatory Windows desktop product vertical

- Six *real pointer gestures*: line, arrow, rectangle, circle, node/math and cubic Bézier; properties and Russian context F1 in the same C catalogue.
- Default desktop shows live canvas + permanently editable ordinary `.tex` + Properties/Libraries/Help; compact icon palettes, legible Cyrillic, useful 1366×768 and 1920×1080 proportions, no overlapping floating tool palette when source is active.
- Preserve revision-checked minimal SourcePatch, Undo/Save/Open, comments/opaque macros/CRLF; F1 under source caret with UNKNOWN for unsupported macros and five independent observed library statuses.
- External **existing** system MiKTeX XeLaTeX, no package autoinstall, no compiler fallback, no shell escape; verify actual PDF, Unicode, embedded fonts and source SHA.
- Real interactive Windows Server QA must exercise **actual GUI**, not only Cargo/XeLaTeX. Capture original PNG, .tex, PDF, log, machine/session/version and SHA manifests. Verify native file dialogs, keyboard shortcuts, Cyrillic IME, scaling/DPI and source/undo. Mark independent axes NOT_RUN when they are not exercised.
- Validate portable Windows ZIP only after real GUI smoke. Installer follows portable proof; do not bundle MiKTeX or download user fonts. Physical Windows 10 acceptance remains distinct.

## Security and runner workflow

- Persistent self-hosted Windows machine must **never execute arbitrary pull_request/fork code**. Keep trusted-`main` SHA gate for automatic Windows jobs. To qualify *unmerged* PR code, provision a disposable isolated Windows runner or explicitly reviewed/approved integration checkout with a separate trust design and no repository secrets. Do not weaken the existing trust boundary just to shorten CI.
- Current `.github/workflows/qa-selfhosted-winserver.yml` tests environment, external MiKTeX and Rust on trusted main only; it **does not implement interactive GUI gestures yet**. Expand it as part of a substantial product vertical with controlled session automation and real artifact assertions. No CI-only micro-PR.
- Do not use RDP passwords in chat or assert that a user session is unlocked merely because the runner reports online. MiKTeX elevated-user warnings are environmental, not a reason to bypass package safety; consider a dedicated non-admin logged-in account.
- PR #100 is the existing B43 integration branch. Preserve its UI work, document Windows-first handover there; no new PR solely to rename the historical Linux title. CI failure with missing job steps/logs is UNKNOWN infrastructure until verified, not rust PASS/FAIL.
- For every candidate: fresh main/HEAD/base; authoritative docs and newest decision; exact-head tests/logs; original screenshots/source/PDF/fonts/hashes; explicit manual UX review; merge using expected_head_sha only after gates; postmerge QA. Avoid blind workflow reruns.

## Immediate execution order

1. Refresh public/private status, PR #100 exact HEAD, actual GitHub Actions state and self-hosted runner availability; don't trust old screenshots.
2. In existing PR #100 finish B43 ergonomic source changes and tests, preserve Windows/macOS/Linux compatibility; prepare actual Windows Server GUI harness and fail-closed evidence. Do not merge a red/unknown PR.
3. Keep trusted-main Windows Server runtime checks as environment health, and perform **real user-session interactive GUI acceptance** before labeling Windows release progress.
4. Reduce repeated hosted CI matrices where justified, but retain exact-head cross-platform regression and real Linux X11 evidence. Do not run unsafe code on persistent runner or confuse Linux X11 with Windows.
5. Report committed code, actual jobs/artifacts, independent platform/evidence statuses, blocker and next concrete step, without ETA.
