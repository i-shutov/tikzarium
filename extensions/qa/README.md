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


## Portable, machine-readable C02 runner

Requires Python 3.11+, XeLaTeX and Poppler pdfinfo. Run from anywhere; choose a NEW output path for each run. The runner never falls back to LuaLaTeX and never uses a shell to launch TeX.

~~~sh
python extensions/qa/run_smoke.py --output ./artifacts/c02-run-001
python -m unittest discover -s extensions/qa -p 'test_run_smoke.py' -v
~~~

For Windows 10 PowerShell, use python.exe with the same script and --output path. Windows 10 execution is NOT YET TESTED. Output has one directory per fixture with console.log, TeX .log, PDF (if any), observation.toml and a top-level summary.json. The output must be outside extensions/, and an existing per-fixture output directory is rejected rather than reused. Store logs as artifacts and cite hashes; do not commit mutable compiler-produced PDFs as golden files.

Positive result = XeLaTeX exit 0 + unchanged source + PDF header/EOF + exactly one PDF page + TeX log present + no Missing character diagnostic. Negative graphdrawing-lua result = nonzero exit + exact LuaTeX requirement diagnostic (allow wrapped log lines) + no PDF. Any other outcome is FAIL. A recorded observation is NOT a global package status, hosted CI is not physical desktop acceptance, and successful rendering is not visual editing.
