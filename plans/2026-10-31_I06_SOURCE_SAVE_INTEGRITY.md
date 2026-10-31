# I06 — source-safe Save / Build with external modification conflict

Date: 2026-10-31. Independent integration lane. Base `main` SHA `2da3a298b9c323951a64a5ba2c878b2448821d09` (C05 #30 integrated). Open branches #25–#29, #31–#32 remain independent. Changes restricted to core Document source saving, existing hosted CI, CHANGELOG, plans and insights; no preview, font, theme, XeLaTeX runner, TeX sources, extensions or extension matrix changes.

## User-visible defect

The app's Build method calls Save even for a clean document. Previously Document::save_to always replaced the loaded file with NamedTempFile::persist. This mutates inode, timestamps and hard links; in a symlink document, atomic rename replaces the link itself rather than its target even when source content is unchanged. A second process editing the source after it was opened could have its newer content silently overwritten.

## Implemented workpack

1. Before writing to an already-open logical file, compare raw disk bytes to the originally loaded/saved raw UTF-8 text; external alteration or disappearance returns an explicit error. Reproducible on Windows and macOS file systems, not dependent on file size/mtime equality.
2. When saved buffer is unchanged and actual on-disk bytes match, return without opening or renaming a tempfile. GUI Build's unconditional save now does not change an existing clean TeX source.
3. If buffer is dirty, reject symlink or read-only destination before replacement; explicit Save As to a different safe regular path still works. Saving identical content through symlink is a no-op.
4. Add six tests: CRLF-byte/inode no-op, clean/dirty external modification, deleted source, explicit Save As, Unix symlink alias, read-only path. Integrate a named Rust test step on hosted CI and D QA matrix.
5. Prepare separate physical Win10 22H2, M1/M4 smoke protocol; exact source SHA and evidence must be recorded before acceptance.

## Acceptance gates

- [x] Isolated branch, no original TeX changes, dedicated tests and workflow wiring authored.
- [ ] Exact-HEAD cargo fmt, full workspace tests, Clippy on Windows Server/Linux/macOS ARM CI.
- [ ] Actual XeLaTeX and PDF/Unicode/extension audit for same exact head.
- [ ] Native Win10 real egui Open/Build/Save As with source bytes, inode/symlink, IME.
- [ ] Physical Mac M1/M4 egui Open/Build and Retina.
- [ ] Post-merge composite main CI (only after exact-head green and lease merge).

## Explicit remaining limits

The byte comparison happens **before** NamedTempFile::persist, so an independent concurrent writer can still race after preflight. This is not race-free CAS or file locking. GUI open-source text editor currently uses UTF-8 Strings only; a malformed/non-UTF8 .tex is not auto-converted. In a no-op source save, a separate external .sty, image, or TeX installation change is not covered by this document check; A/W05's project dependency tracking has separate policy and its PR #28 remains unmerged pending a source-symlink false-fresh fix. Font families and themes remain independent, and Lua-only packages are not XeLaTeX-native.

Refs issue #14 #15 (font/theme independent), #24 I05, #28 A/W05, #30 C05, pending B05/B06 #25/#29.
