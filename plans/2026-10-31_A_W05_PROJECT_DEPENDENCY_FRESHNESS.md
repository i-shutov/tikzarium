# A / W05 — project dependency freshness after I05

Date: 2026-10-31. Own branch `feat/a-w05-project-dependency-freshness`.
Base `main`: `8764a732b9a846a6ba1f111c9b656781195a6412` (I05 #24 merged).
A #10 is closed unmerged; do not force-merge it. F01 #16 and F02 font warnings are already integrated.
Open independent B #25, C #26 and D #27 are out of scope.

## Vertical workpack

1. Consume successful runner `.fls` dependencies without changing original TeX sources or compiler arguments.
2. Record SHA-256 of the original source and each distinct local project input (scoped by the source directory). Preserve Unicode/space filenames and normalize resolved path identities.
3. Expose `BuildArtifact.project_dependencies` with `is_project_fresh()`, `invalidated_project_paths()` and `ignored_external_paths()`. The GUI may debounce these checks and label stale previews in a follow-up B-owned integration.
4. Detect byte changes even when file size is unchanged, missing/deleted inputs and initially unverifiable files. Keep local hashing bounded to 64 MiB per input; reject a freshness claim above that cap.
5. Ignore TeX installation paths and files outside the selected root **explicitly**. Never assert globally fresh from a project-only snapshot. Out-of-root includes are reported for later project-root configuration.
6. No shell, network or source modification; no new external runtime program. The compile-time Rust `sha2` dependency calculates deterministic SHA-256.
7. Add portable unit tests plus a Unix end-to-end fake XeLaTeX `.fls` integration test. Test same-byte-length edits, deletion, missing and huge files, Unicode and external paths.
8. Run exact-head Rust fmt/check/tests/Clippy and the existing 3+6+font GitHub Actions matrix, inspect results. Physical Win10 and physical Mac M1/M4 remain separate release gates.

## Boundaries and explicit next block

This is **project-scope post-build freshness**, not a global TeX cache, file watcher, or provenance attestation. Outside-root files and symlinks to external targets are listed but are not hashed; changing them does not invalidate `is_project_fresh()`. Build-time changes (TOCTOU) and font/TeX-installation drift are not yet verified. SHA-256 hashing on a UI thread should be debounced or moved to a worker by lane B; lane A does not alter GUI files. Next A-owned workpack: explicitly select a project root and record external includes, or pre/post source fingerprint reconciliation to reject a PDF compiled from a concurrently changed source.

No declaration of PASS until exact-head CI is observed.

## Recorder completeness: fail-closed extension

A successful engine exit plus PDF is insufficient if `.fls` is absent, unreadable or contains no `INPUT`. The runner now passes an explicit `recorder_complete` flag to the snapshot. Its `is_project_fresh` returns false with no usable recorder, but the PDF remains accessible to avoid incorrectly failing the build itself. A fake engine test covers this failure mode.

## Platform path canonicalization gate

macOS `/var` → `/private/var` alias demonstrated a dangerous false-fresh classification when a missing input is under an aliased project root. Missing paths now resolve through the nearest existing canonical ancestor before root-boundary checks. Regression tests require macOS and Unix symlink-root parity.


## 2026-10-31 · A-only integration after accepted #38/#44/#51/#56

Existing PR #28 reconciled with main `b2a1299d5660d04614c78ca696189dfab10e4f43`. Keep native MiKTeX `--disable-installer`, explicit XeLaTeX, source diagnostics and B/C/D work unchanged. Add source-boundary fail-closed: if the mandatory TeX author source resolves outside the project root (including symlink escapes), `is_project_fresh` is false even if no local inputs remain. External dependencies remain explicitly unverified and do not form a global TeX cache guarantee. Portable Unicode/CRLF/opaque source and Unix source-symlink regressions accompany existing file-recorder tests.

Require fresh exact-head fmt/check/test/clippy, D QA and hosted real MiKTeX CI; all PENDING at commit. Physical Win10/M1/M4 and GUI NOT_RUN.


### Recorder source-membership gate

A nonempty `.fls` with only external/foreign `INPUT` lines cannot certify full project inputs. Freshness now requires the XeLaTeX recorder to contain the canonical original author source; a source-omitting file yields `recorder_complete=false` and `is_project_fresh=false` while preserving the successfully produced PDF. Added a real fake-engine integration test with a foreign-only recorder and untouched CRLF/opaque TeX. This extends the existing missing-recorder test and closes the integrator's second false-fresh scenario. Exact new-head CI pending; no host PASS inherited.


## 2026-10-31 — current main integration after C/N2 #58 and D10 #63

At integration, current main was **`aa6d1d08caee984d5f31ac13396e346fc451c8fe`**. PR #38 MiKTeX doctor/build is already merged (merge `013720ee6f0e1dc29f487124499ed9469d86b089`); this existing #28 is still **OPEN**, not merged. Verified current AGENTS and open PRs before updating. From W05's previous merge base `b2a1299d5660d04614c78ca696189dfab10e4f43` to this main, **no files in A core/CLI or A plans/insights have changed**. Merge current main into the existing A branch, retaining precisely five production/test blob contents and only appending these two A docs. Other B/C/D/I source files are inherited unchanged from main.

Previous exact A source `bd18d1b94ca2c76516f3bb3d85ef3ebe87ce9c63` completed its five hosted workflow families (Rust, D QA, real Windows Server MiKTeX, fonts and N1 authoring). Their SUCCESS is historical, **not** evidence for the new combined merge commit; demand new exact-HEAD CI. This merge does not add another TeX engine, geometry solver, shell invocation or package installer; the build/source/undo API surface is unchanged from W05's pre-merge head.

- [ ] Exact merged-head Rust fmt/check/test/Clippy and D QA complete.
- [ ] Exact merged-head real MiKTeX build and native primitives/Unicode/fonts checks complete.
- [ ] Integrator reviews core `BuildArtifact.project_dependencies` compatibility with B UI and freshness semantics; no automatic GUI stale marker claimed.
- [ ] Genuine CLI `doctor` using actual MiKTeX sibling `findtexmf.exe` remains a separately identified D evidence gap, **NOT_RUN**; hosted MiKTeX build cannot certify it.
- [ ] Physical Windows 10 x64 user/shared MiKTeX and physical Mac M1/M4 and full GUI acceptance: **NOT_RUN**.

## 2026-10-31 — W05 symlink identity and D11 reconciliation

Integrator reproduced a remaining false-fresh after symlink replacement: `asset.tex -> a.tex` at compile time, then `asset.tex -> b.tex`, while the old target `a.tex` remains unchanged. Canonical paths in the old `.fls` public output erased the recorded alias. Fix in this existing PR: retain the original `.fls` INPUT spelling for snapshot hashing and link-target checks; keep public `BuildArtifact.dependencies` canonical and unchanged. Also retain an explicitly chosen source path before the runner canonicalizes its compiler operand. Unit, parser and end-to-end fake-engine regressions cover retarget, Unicode/spaces, opaque macro, CRLF and preserved source bytes.

At branch reconciliation main `5f5a805005430ff26d3e3dd9c17c3ca3d7af9fa3` includes D11 #64 and GUI/integrator changes. Those main changes are all outside A core/CLI and A-specific docs; preserve them byte-for-byte. Physical Win10/M1/M4 remain NOT_RUN. Require exact new SHA CI (fmt/check/test/clippy), QA and true MiKTeX build; no PASS inherited from old `de114ea5`. D owns MiKTeX workflow, so do not edit it. Integration review must verify source/undo API unchanged and confirm no symlink-retarget false-fresh.

### W05 cross-host root spelling correction

The first full regression pass on head `aaea74074c2272fed100268a8879e00ba148e456` exposed macOS `/var` → `/private/var` alias duplication: original source retained `/var` spelling but relative `.fls` INPUT was joined to already canonical `/private/var` root, yielding two tracked paths for the same author source. Preserve the caller's original absolute project root spelling when joining relative recorder inputs, while continuing to use the canonical root for security boundary checks. Add a deterministic Unix symlink-root dedup regression. This does not weaken per-input symlink-retarget detection. Exact corrected-head CI mandatory; no old PASS inherited.

### Exact source-symlink vs macOS root-alias selection

Use canonical compiler source spelling for an ordinary author file to avoid duplicate project inputs across /var and /private/var, but retain the original author path when the file itself is a symlink (its retargeting changes the requested document). Added two Unix fake-engine regressions: symlinked project-root creates only source+asset fingerprints, and changing a symlinked author file invalidates freshness. This is an A-only runner change; does not affect canonical public dependencies, source bytes, CLI output or GUI undo contract. New exact-head CI required.
