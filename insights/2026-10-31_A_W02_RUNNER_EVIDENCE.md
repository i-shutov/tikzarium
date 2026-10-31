# Lane A — W02 engineering evidence and handoff

Date: 2026-10-31. Scope: core and CLI only. Issue #2.

## Findings and fixes implemented

- W01 mistakenly replaced the final extension of the stem of a multi-dot TeX filename. In a real local Linux TeX Live 2025/dev experiment, figure.v2.tex produced figure.v2.aux, figure.v2.fls, figure.v2.log and figure.v2.pdf. W02 reads these exact names.
- An input named -shell-escape.tex must not arrive as a bare option-like argument: use an explicit ./ (or platform equivalent) relative filename. Command remains direct, no shell.
- Earlier error paths returned a short stderr/tail and deleted build logs. W02 adds a requested persistent .log, retains the TeX error summary plus stderr and log tail, and keeps partial logs when cancellation/timeout occurs if write succeeds.
- The recorder's PWD and relative INPUT records must be resolved; generated .aux files from the disposable output directory are not external dependencies.
- CLI output target should not overwrite a source file or be partially published. PDF publication now uses a temporary file in the target directory; extension restriction is deliberately conservative.
- TeX file-line-error diagnostics require support for Windows drive letters, filenames with dots and spaces, plus l.N fallback markers.

## Evidence available at authoring time

- GitHub W01 branch format automation completed successfully: https://github.com/i-shutov/tikzarium/actions/runs/41169197653
- W01 older commit Rust native jobs failed at formatting; check and test were skipped, not PASS: https://github.com/i-shutov/tikzarium/actions/runs/41169201065
- W01 initial Linux XeLaTeX fixture CI succeeded before this W02 code: https://github.com/i-shutov/tikzarium/actions/runs/41169131617
- Local environment is Linux x86_64, XeTeX 3.141592653-2.6-0.999996 (TeX Live 2025/dev/Debian). A local direct XeLaTeX multi-dot-name output test completed. This does not test the new Rust runner.
- Rust compiler and cargo are absent in this execution sandbox. Neither W02 cargo compilation nor its new tests can be declared PASS until GitHub CI completes.
- Physical Windows 10 x64 and Apple Silicon M1/M4 acceptance remain OPEN.

## Open technical risks

- Cannot currently cancel or time-limit external PDF rasterization. Requires a separate future bounded runner.
- A user-supplied TeX document is not sandboxed merely because shell escape is disabled.
- On cancellation and timeout, failure to write an optional retained log is best effort and does not replace the original cancellation/timeout error.
- Recorder captures dependencies it observes; dynamic generation, shell commands disabled by policy and runtime external tooling remain outside this small workpack.
- Desktop GUI still uses transient logs unless B independently opts in to BuildOptions.log_path. This PR intentionally does not modify B files.

## Handoff

Integrator should review the stacked diff, inspect actual W02 GitHub Actions by exact SHA and merge W01 first. Rebase/cherry-pick only after checking B/C/D branch overlaps. Do not report Windows 10 or physical Mac smoke from hosted CI alone.
