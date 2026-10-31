# B04 — source font reference inspector: target-host screenshot smoke

**Results: NOT_RUN**. Execute separately on physical Windows 10 22H2 x64 and Apple Silicon macOS ARM64. Do not label hosted CI as interactive GUI acceptance.

Use current B04 HEAD SHA; capture OS build, architecture, XeLaTeX version, screen scale/Retina DPI, fontspec/TeX Live/MiKTeX versions, and SHA-256 hashes of source and output PDF both before/after merely opening the inspector.

| Case | Operator action | Expected observation |
| --- | --- | --- |
| BF01 | Put `\setmainfont{DejaVu Serif}` and `\setmathfont{latinmodern-math.otf}` in source, open Figure fonts | Two distinct source hints with original line locations; no suggestion they are installed |
| BF02 | Add `\node{\fontspec{DejaVu Sans} Привет}` inside the TikZ picture and click the font hint while in Canvas | Workspace switches to Split, source editor receives focus at the command's line; document is not rewritten |
| BF03 | Add `% \setsansfont{Fake}` and literal `\% \fontspec{Тест}`; repeat with CRLF | Commented declaration excluded; escaped-percent declaration shown; Cyrillic label and line navigation intact |
| BF04 | Switch themes Light, Dark, Midnight, Paper and compact/comfortable | All text remains legible; switching themes never changes source PDF hashes; preference survives restart |
| BF05 | Run independent XeLaTeX proof with a nonexistent family | Explicit failed/unknown font proof, never incorrectly promoted to source-hint PASS |
| BF06 | Check a conditional/macro-defined font not lexically detected | UI limitation explained; no claim of effective font evaluation |

For each screenshot: case, PASS/FAIL/NOT_RUN and reason, exact B04 SHA, physical host, image file and SHA-256, display DPI, source/PDF SHA-256. A source hint is a lexical detection only; its presence does not validate font existence or embedding.
