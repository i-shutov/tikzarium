# Extension XeLaTeX fixture QA

The five small original TeX sources in ../fixtures/ are **engine-level** probes, not adapters or proof of visual editing. Four are positive XeLaTeX probes (core TikZ, PGFPlots, circuitikz, tikz-cd). The fifth intentionally invokes Lua-driven automatic graph drawing under XeLaTeX and must fail with an explicit LuaTeX requirement diagnostic.

On Linux/macOS with XeLaTeX and Poppler pdfinfo on PATH:

~~~sh
sh extensions/qa/run-smoke.sh ./artifacts/extension-smoke
~~~

The argument is an optional output directory; full logs are preserved on success and failure. The script uses -no-shell-escape and never silently changes engine or installs packages. Run only audited source fixtures, not arbitrary downloaded TeX.

Illustrative Windows 10 PowerShell commands (NOT smoke-tested on Windows 10):

~~~powershell
New-Item -ItemType Directory -Force .\artifacts\extension-smoke | Out-Null
xelatex -interaction=nonstopmode -halt-on-error -file-line-error -recorder -no-shell-escape "-output-directory=.\artifacts\extension-smoke" .\extensions\fixtures\core.tex
pdfinfo .\artifacts\extension-smoke\core.pdf
~~~

Run from a working directory where TeX can locate the source; use an absolute output directory for paths with spaces. Verify all positive fixtures individually and the expected nonzero/explicit LuaTeX diagnostic for the negative test.

Record source SHA-256, xelatex and package versions, OS/architecture, exact args, exit code, warnings/errors, pages, and PDF hash. See [local Debian evidence](2026-10-31_DEBIAN_LOCAL.csv). These PDF hashes are observations, not golden cross-platform hashes. Hosted CI is not physical Windows 10 or Apple Silicon acceptance.
