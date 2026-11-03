# N5 package provenance and physical-evidence boundary — 2026-11-03

Read fresh main bbcc2504, AGENTS, PRODUCT_SPEC, ARCHITECTURE, ROADMAP, full-scope plan, current C/search GUI code, recent N3 plans/insights/CHANGELOG, PR #91–#94 state and main-push jobs/log. No open PR. Existing accepted real Linux/X11 artifacts (N1 69/69 and N2 30/30 SHA) are historical main evidence and not physical platform tests.

The only main postmerge workflow failure is D06 hosted Windows Server [41576724038](https://github.com/i-shutov/tikzarium/actions/runs/41576724038), job 125721833022. Original job log has Invoke-WebRequest connection timeout at scripts/tools/qa_setup_miktex.ps1:25 to pinned upstream MiKTeX installer, before any package, XeLaTeX or product build. Classification: **external setup FAIL / product NOT_RUN**. Do not treat it as a code regression or blindly retry it. Do not mutate MiKTeX user settings or disable its safety gates.

User-owned extracted release binaries from original Rust native main CI run 41576723954:

| Target | App SHA256 | CLI SHA256 | Actual header |
|---|---|---|---|
| Windows 10 x64 | 1b2e7fa6f4c8563d26897d316e28522b5ec915e63f15e2b83829bf73444821ab | 6c5e8987e700f8b74344743e610ddf025717ff316cd2fa4b02d550f8b49c8dfb | PE32+ AMD64 |
| Mac ARM64 | 69b28ddccf074e2f9c53ee7c3055fab9f07535b71a28c9594c4a00a7a27847a0 | 7ac7f4b51b9254edf5eb61a61b5266d82d711e14420209eaa7d21ff195a8a7a2 | 64-bit little-endian ARM64 Mach-O |

The new packaging script requires caller-provided **expected** hashes so it cannot bless arbitrary mutated binaries just by hashing them; architecture detection remains header-only, not full OS execution or code-signature validation. The unsigned Mac .app is genuine Finder bundle structure (Info.plist and 0755 binary) but Gatekeeper launch is **NOT_RUN**. No claim of notarization, installer, or Mac GUI acceptance. ZIP/TAR internal SHA manifests independently audited. Earlier local self-contained Python tests: 3/3 PASS. Integration review found the new test file was absent from the existing D QA discovery pattern; the same N5 PR now explicitly invokes it on all three hosted OS and adds a real packager CLI tamper/rejection test. Fresh exact-head CI evidence is required, not inferred from the prior green jobs. The CRLF/opaque Unicode fixture compiled with external LOCAL Linux TeX Live (xelatex -no-shell-escape) into 1-page PDF; pdffonts: embedded/subset DejaVuSerif yes/yes. This is a fixture check, not the app's PDF build and not MiKTeX.

N3 remains incomplete in broader parameter/help/completion audit. Physical Windows 10/MiKTeX, Mac M1/M4/XeLaTeX remain NOT_RUN. This candidate does not alter B/C/D production or workflows and does not trigger extra CI by itself.
