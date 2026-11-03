# N5 physically testable, provenance-locked preview bundles — candidate 2026-11-03

Baseline: main bbcc25044d327bca30b363b6e68c91190cf96002 (PR #94 merged); N1 and N2 hosted Linux/X11 accepted, 99/99 original artifact SHA. No active PR. Post-merge 4/5 workflow SUCCESS, hosted MiKTeX Windows Server FAIL during external installer download, before package baseline or TeX execution (run 41576724038, job 125721833022). This is a setup/network blocker, not a product regression. No rerun is justified without a changed download cause.

## User-facing N5 slice

Ship reproducible **unsigned preview packaging**, not fake installers. Consume only prebuilt official CI binaries with separately supplied exact SHA-256, inspect PE32+ AMD64 vs Mach-O ARM64, reject mismatches. Package native Windows 10 portable .zip, and real macOS Finder .app directory with Info.plist + executable permissions inside .tar.gz. Include the same ordinary .tex CRLF/opaque-macro Unicode fixture, Russian offline acceptance directions and per-file SHA manifest, exact source/CI provenance, and NOT_RUN for physical Win10/M1/M4/installer/notarization. NEVER include TeX, user fonts or silent downloads.

## Acceptance and nonclaims

1. Python negative packaging tests: truncated and cross-architecture executable rejection, exact upstream SHA mismatch before any archive output, manifest fidelity, deterministic ZIP/TAR, .app Info.plist/permission, no bogus installer/Gatekeeper PASS. The existing D QA matrix now invokes these tests on hosted Linux/Windows/macOS; an actual exact-head PASS is required.
2. Verify original exact-head main CI source/provenance, outer archive hashes, internal binaries against independently recorded CI hashes; manually inspect both produced package trees.
3. Compile source fixture with external Linux TeX Live XeLaTeX and audit Cyrillic/font embedding **as a fixture-only check**; does NOT establish MiKTeX, app UI or user hardware acceptance.
4. GitHub PR requires exact-head CI and manual evidence audit before merge; postmerge separate CI. No workflow modifications/dispatch; only one meaningful code+tests+plan+insight+changelog slice.
5. N5 physical Win10 with user-installed MiKTeX, physical M1/M4 with external XeLaTeX, native Open/Save, Retina/IME, PDF/font/theme invariance, package launch, installer signing and notarization all remain NOT_RUN until actual observed host runs. Never infer these from binary headers or GitHub macOS hosts.

N3 full contextual controls/completion remain PENDING, N4 deferred. The N5 package may be tried on physical hosts but is not a release label.
