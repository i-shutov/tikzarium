# I07 physical first-page PDF preview QA (NOT_RUN)

Use exact Rust app SHA, OS details, user-owned XeLaTeX/Poppler versions, TeX source SHA, compiled PDF SHA, screenshots and timestamps. Do not run destructive tests on real documents; duplicate sources first.

1. Valid 2-page XeLaTeX source: render first page automatically then navigate to page 2. Confirm distinct content, embedded fonts, original TeX and exact PDF untouched.
2. Test harness only: replace pdftoppm path with controlled mock that loops forever. Build should complete with a preview error after ≤45s, not indefinitely block; real PDF remains exportable. Verify no orphaned renderer child.
3. Test harness only: mock returns >64MiB compressed PNG; verify explicit size error, PDF intact and no huge Rust read into memory.
4. Missing pdftoppm: PDF still compiles/exports and missing renderer diagnosed.
5. Repeat on physical Win10 22H2 x64 and Mac M1/M4. Evaluate UI responsiveness, Ctrl/Cmd actions, error/status visibility, Retina scaling and Windows Unicode source names. B06 pixel limits and B05 page-navigation limits are independent.

Native case statuses all NOT_RUN until actual screenshot/log/hash evidence. Hosted Windows Server and hosted macOS ARM can only attest compile/unit/CLI contracts.
