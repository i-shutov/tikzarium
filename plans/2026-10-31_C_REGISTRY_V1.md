# C01 — Validated declarative extension registry
Date: 2026-10-31 · independent owner: lane C · issue #4

## Baseline and branch discipline
Observed main SHA 4ceca871fc2c3b661f92d64f9c6b39b473cebd0a. The only open PR at planning was #6, W01, head 48bcce1b042e972cb710cb8f182fc95a5f29e98d. W01 introduced the Rust workspace and the first extensions crate. This work branches **from that exact W01 head** and proposes a *stacked PR into feat/w01-xelatex-egui-core*; it does not copy or rewrite the neighboring build/UI/CI files.

Owned files: crates/tikzarium-extensions, extensions/, docs/EXTENSIONS.md, plans/2026-10-31_C_REGISTRY_V1.md, insights/2026-10-31_C_REGISTRY_QA.md.

## This bounded block
1. Version the metadata-only TOML schema; validate IDs, version triplets, file requirements, limits, unknown keys and Lua-only engine.
2. Load optional directory manifests deterministically and atomically; reject symlinks, malformed metadata, duplicate IDs and traversal.
3. Expose non-misleading installation/compilation/inspection/edit statuses while retaining W01 package panel compatibility.
4. Add bundled XeLaTeX package metadata, an explicit Lua-only graphdrawing feature, a machine-readable package matrix and in-crate tests.
5. Preserve the offline-only, non-executable manifest contract.

## Verification gates
- Test suite: cargo test -p tikzarium-extensions; cargo fmt --check; cargo clippy -p tikzarium-extensions --all-targets -- -D warnings.
- Hosted Rust CI Windows Server x64 and macOS ARM64: must actually finish and pass for supported CI claims.
- No native Windows 10 or physical Mac UI smoke is implied.
- No TeX build PASS, package installed PASS or visual-edit PASS is asserted by the metadata tests.
- Cross-lane integration: B may choose to display Unknown explicitly in its own PR; this C PR does not edit B UI code.

## Next bounded block
Persist machine-readable per-platform/per-package compilation evidence keyed by fixture and exact environment, then add a CLI report integration after coordination with A. Do not create a visual adapter API before two verified implementations.
