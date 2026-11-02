# N5 release integration — reproducible native portable preview, not installer

2026-11-02. Source-of-truth parent main: \`3fb25ca70ce94ad9a5b1cd63606ad45390f1f68b\`.
This is one substantive release engineering block on an isolated integration branch.
No B/C/A production edits, no TeX distribution or GUI adapter, no extra workflow.

## User-visible delivery

Existing native Rust CI already builds and uploads genuine Win x64 PE32+ and macOS
ARM64 Mach-O app and CLI binaries. Convert them into **portable preview ZIPs**
inside the SAME existing \`.github/workflows/ci.yml\` native matrix:

- Windows: \`TikZarium/tikzarium-app.exe\` and \`tikzarium-cli.exe\`.
- macOS ARM: unsigned \`TikZarium.app\` with minimal valid \`Info.plist\` and
  \`Contents/MacOS/tikzarium-app\`, plus CLI.
- \`PROVENANCE.json\` pins exact Git SHA, audited Cargo.lock report,
  binary hashes, external XeLaTeX prerequisite and explicit NOT_RUN.
- \`SHA256SUMS.txt\` plus ZIP CRC + roundtrip byte checks; reproducible ZIP
  metadata and tests for wrong SHA, PE/Mach-O architecture and fake host evidence.
- No TeX packages, user font binaries, silent installation, automatic engine
  fallback, claimed digital signature or fake physical GUI test.

This is **not** Windows MSI/MSIX, signed macOS DMG/pkg or a distributable
stable release. Bundle construction is automated in hosted CI, while real
Windows 10 + MiKTeX and Mac M1/M4 + XeLaTeX remain NOT_RUN until physical
screenshots, sources, PDF, logs and manual review exist. Do not bypass OS
security protections to run an unsigned Mac preview.

## One important CI truth correction in the same release block

A postmerge hosted MiKTeX job returned SUCCESS even while
\`test_qa_smoke.FixtureHarnessTests.test_direct_glyph_audit_includes_miktex_offline_flag\`
FAILED on Windows: the test expected literal \`xelatex\` but the runner
correctly supplied a private absolute \`TIKZARIUM_XELATEX\`. PowerShell then
executed a successful Python probe and masked the failed unittest exit code.

- Isolate the selected engine environment in the test; separately test a
  fully qualified MiKTeX executable and \`--disable-installer\`.
- Add an immediate \`$LASTEXITCODE\` throw after EACH Python unittest/probe.
- Preserve actual hosted MiKTeX PDF/font audit and its no-install policy.
- Neither count the previous test as PASS nor infer a product MiKTeX failure:
  this is a **masked CI-gate failure + test environment defect**.

## Acceptance / next critical path

1. **This branch:** exact branch CI must succeed on Windows/macOS native
   packaging and hosted MiKTeX, with original preview ZIP and negative test
   reports reviewed; explicitly verify no masked test failure.
2. Recheck app and CLI binaries against source SHA; physical OS is NOT_RUN.
3. N2: real *new Studio dock* Connect/Disconnect/Undo for libraries plus
   installed/loaded/compatible/tool/help, saved ordinary source and XeLaTeX
   PDF. Old B41-tree I53/I57 is historical, not B42 proof.
4. N3: offline Russian help/syntax/parameter/default provenance from the
   single shared C catalogue in toolbar, inspector, help/F1 and completion.
5. N5 final: Windows 10 x64 MiKTeX and Mac ARM (M1/M4) real GUI smoke,
   fonts/themes, native launch/installed XeLaTeX diagnostics, recovery,
   signed/appropriate installer/notarization, SHA-manifest and handoff.

Never merge for a green workflow name alone. Require exact-head CI, review
of original ZIPs/reports, expected_head_sha and separate postmerge CI.
N4 domain tool packs must not displace N2/N3/N5 release acceptance.
