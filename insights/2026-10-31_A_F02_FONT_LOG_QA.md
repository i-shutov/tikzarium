# A/F02 — observed font-log QA and limitations

Date: 2026-10-31; issue #14; base main
f2a55fa13fd9a1e0af2718bc328ed16786975184; branch
feat/a-f02-font-log-audit.

## Code and independent baseline

Read F01/U01 merged PR #16 (base code) and open A PR #10 before
editing. A/F02 adds the typed log audit to the **core** only.
Existing GUI font proof invokes missing_glyph_messages (now using the
same parser), so wrapped glyph warnings are retained. No files belonging
to B, C, D or integration were edited, and no user TeX source is rewritten.

## Real TeX experiments (observed, local Debian container)

Engine: XeTeX 3.141592653-2.6-0.999996 (TeX Live 2025/dev/Debian),
with fontspec, DejaVu Serif, Poppler pdftotext/pdffonts.
Both test .tex source files exactly match the newly committed A fixtures.
XeLaTeX invoked directly with -interaction=nonstopmode -halt-on-error
-file-line-error -no-shell-escape in a disposable directory.

**Missing family:**
- a-font-missing-family.tex exit status **1** (EXPECTED FAILURE).
- No PDF emitted.
- Real log: ./a-font-missing-family.tex:4: Package fontspec Error:
  The font "Definitely Nonexistent Font 424242" cannot be found.
- Fixture SHA-256:
  94aa4121b6d7933c56b9119ce7bcf88bfa7a6850823bf90fddcdc1e80c29f821.

**Missing glyph despite successful engine exit:**
- a-font-missing-glyph.tex exit status **0**, PDF emitted.
- Real log wraps a single glyph record mid-token:
  Missing character: There is no ͸ (U+0378) in font DejaVu Serif/OT:script=latn;l
  anguage=dflt;mapping=tex-text;!
- pdffonts lists an embedded subset DejaVuSerif (emb=yes).
- pdftotext recovers the literal Cyrillic text "Привет!", but *not*
  the U+0378 character; this is an INTENTIONALLY FAILING GLYPH fixture.
- Fixture SHA-256:
  6502be12f0df5719c8117d01a8ccf134fc756871531c1cab43f8aaa997d59b68.

Original fixture SHA-256 values were the same **before and after**
both XeLaTeX invocations; generated artifacts were written separately.
No actual user's document was opened or modified.

## Status matrix (do not conflate QA levels)

| Check | Observed status |
|---|---|
| Direct Linux missing-font TeX fixture | EXPECTED FAILURE reproduced (exit 1) |
| Direct Linux missing-glyph TeX fixture | EXPECTED LOG WARNING reproduced (exit 0) |
| Direct Linux PDF Cyrillic extraction of failing glyph fixture | Text "Привет!" present; intentionally missing glyph |
| Rust unit tests / fmt / Clippy (local) | NOT_RUN; cargo and rustc are unavailable |
| GitHub exact-head CI | PENDING; inspect Actions after commit/PR |
| Windows Server 2022 hosted checks | PENDING, never Windows 10 physical PASS |
| macOS 15 hosted ARM64 checks | PENDING, never M1/M4 physical PASS |
| Windows 10 x64 physical font + GUI smoke | NOT_RUN |
| Mac M1/M4 physical font + GUI smoke | NOT_RUN |

The parser regression tests use excerpts taken from real XeLaTeX log
shapes. They are **not** a substitute for a full multi-platform proof of
font discovery, PDF Unicode text extraction, embedded math fonts, or GUI
rendering. No host-side font installed/not-installed probe was added.

## Integration handoff

A PR #10 modifies runner/error diagnostics and is currently separate.
After integration, core runner can attach FontIssue to failed-run results
while retaining TeX log evidence. GUI (B) can display font name and source
line. D controls matrix CI and independent native hardware smoke.
Do not classify a passing cargo test as a completed release validation.
