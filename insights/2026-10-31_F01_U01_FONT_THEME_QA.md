# F01/U01 — evidence, pitfalls, next gates

Direct Linux TeX Live 2025/dev reference proof:
1. Setting unicode-math font by friendly name "Latin Modern Math" failed to resolve, despite the TeX OTF file existing.
2. Selecting "latinmodern-math.otf" succeeded with XeLaTeX.
3. pdftotext -layout preserved "Привет, мир!", "Геометрия и оптика", "Научный рисунок", and Greek/math symbols.
4. pdffonts identified embedded DejaVuSerif, DejaVuSans and LatinModernMath, with emb=yes.
5. No Missing character warning observed in successful proof.

This evidence proves only the standalone TeX fixture in Linux. The Rust-integrated GUI proof, persistence and native Windows/macOS run require their own CI and manual evidence. Do not upgrade these findings to PASS until tested.

Pitfalls captured:
- Font family string must be validated because source snippets must never treat a family as arbitrary TeX code.
- The pdffonts Type column has internal spaces; emb status should be addressed from the end of each data row.
- A zero XeLaTeX return code may still mean missing glyphs.
- Egui default fonts render the UI, not TeX PDF artwork; UI theme changes must never influence source.
- Store font selections as suggested defaults; leave existing figure source unchanged.
- Named math-font aliases are not necessarily portable. Filename lookup can be more reliable within TeX distributions, but still needs proof.
- Font licenses prohibit arbitrary distribution of users' proprietary font binaries.

Pending: GitHub CI SHA validation, physical Win10 and Apple Silicon GUI smoke, font inspector with embedded font names, theme screenshots at standard+Retina scale.
