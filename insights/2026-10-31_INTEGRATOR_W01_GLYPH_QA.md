# Integrator W01-G — QA observations and evidence

2026-10-31.

- GitHub starting `main`: `4ceca871fc2c3b661f92d64f9c6b39b473cebd0a`; draft W01 PR #6: `aae15fb9f425921aa0f37fc39ba6354eabc4fefa`.
- [Actions run 41169414557](https://github.com/i-shutov/tikzarium/actions/runs/41169414557) succeeded for W01 SHA `aae15fb9f425921aa0f37fc39ba6354eabc4fefa`: Linux real XeLaTeX, hosted Windows Server 2022 x64 and hosted macOS-15 ARM64 build/test/Clippy. **The existing Cyrillic PDF page-count assertion is not a glyph acceptance.**
- Artifact IDs on that SHA: `13030950182` Windows-hosted archive digest SHA-256 `6f837286b03e34fd1f3db3bbbd4e5be4213a7f01ef3c3c29826e68df29c3d5da`; `13031010594` macOS archive digest `5f11a2736533980b4b8ec7885ffad7c3569c095c90ab2ca5f920dcdd21dc5f01`; `13030034261` Linux smoke digest `66c997222c366441e88a9a994a563190812e7bbdf9a0797e2975aa53480cf160`.
- Independent QA in PR #9 diagnosed **19 missing-character warnings**. The original PDF could be one page without complete Unicode glyph output.
- **Local offline Linux Python:** seven Unicode-audit unit tests passed and Python module syntax compiled. This is not a Rust check, real TeX recompile or Poppler integration check.
- **PENDING:** all new-head GitHub Rust/XeLaTeX CI verification and artifact checksums; no results invented.
- **NOT_RUN:** Win10 22H2 GUI, M1/M4 physical GUI, egui file-dialog/HiDPI screenshot acceptance.
- **OPEN:** R4 nullfont warnings O027/O028/O030/O047, font differences across platforms, missing arbitrary glyph coverage.
- TeX package installed/buildable/inspectable/visually-editable remain distinct capabilities. No extension matrix compatibility upgraded; Lua-only graphdrawing remains XeLaTeX-incompatible.

Only link a PASS to the exact commit and workflow that produced it. A new W01 merge must receive new checks before `main` integration.
