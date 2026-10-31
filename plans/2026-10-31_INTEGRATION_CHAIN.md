# Integrated desktop chain: W01 → B01 → B02 → F01/U01

Date: 2026-10-31. Scope: `i-shutov/tikzarium` ONLY.

## Integrated Git ancestry

Initial `main`: `4ceca871fc2c3b661f92d64f9c6b39b473cebd0a`.

| Gate | PR | Merged main SHA | Branch CI verification |
| --- | --- | --- | --- |
| W01: Rust workspace + CLI + XeLaTeX + PDF | #6 | `436ad98b8c4019ce965426c214c3d51bbe4fdbbd` | Run 41170859719, three jobs PASS |
| B01: egui source/split/canvas, diagnostics, save | #8 | `2eb97502ea9a0177e5afc2cec6bf2e170d52aec4` | Run 41172724695, three jobs PASS |
| B02: source-path-bound PDF freshness/export | #12 | `ee1ce4da41ee77f55ab06875565816904cddf8a4` | Run 41172768564, three jobs PASS |
| F01/U01: XeLaTeX font proof + GUI appearance | #16 | `3f71681a4d0febe143f0777d635867e9287e82eb` | Run 41173782947 three jobs PASS; font proof 41173786603 PASS |

Each PR was merged with `expected_head_sha` and a merge commit (no forced ref replacement), only after its exact head received successful hosted CI checks. The post-merge `main` runs are independent checks and must be recorded before declaring integrated CI green.

## Functional contract

- XeLaTeX produces the authoritative PDF; egui rasterizes PDF page 1 through Poppler if available. Canvas is read-only, NOT an arbitrary direct TikZ geometry editor. Unknown macros stay in source.
- B02 treats a Save As pathname change and an in-flight rebuild as stale; it retains last-good PDF but blocks misleading export.
- F01 creates copyable `fontspec`/`unicode-math` snippets and an isolated XeLaTeX figure-font probe. It does **not** edit an existing TeX preamble/source.
- U01 persists only app preferences (four palettes, density, font suggestions). It must never alter document colors, fonts, bytes or PDF content.
- Package discovery does not imply verified build compatibility or visual editing. LuaTeX-only graphdrawing is NOT XeLaTeX-native.

## Integration order after this chain

1. Verify completed `main` Actions on the actual integrated SHA; investigate any red checks before further merges.
2. Rebase/retarget and individually review A runner diagnostics #10, C declarative registry #7 and D independent QA #9. C02 #13 remains stacked after C01. Check updated branches and changed-file scope; no blind merges.
3. Add evidence-driven XeLaTeX family/feature matrix with package version, fixture, engine, compilation evidence, source inspection and visual-edit statuses **separately**. Avoid upgrading metadata discovery to a PASS.
4. On **physical** Win10 22H2 x64 and M1/M4 macOS, run `crates/tikzarium-app/QA_GUI_SMOKE.md` and font/theme checks: 1366x768 vs Retina, Ctrl/Cmd shortcuts, native dialogs, save/open/reopen, Unicode IME, stale PDF export block, theme persistence, literal glyph extraction/embedding, user TeX byte preservation. Record OS/TeX/tool SHA and screenshots.
5. Only after integrated CI + physical acceptance + blockers audited consider an internal beta. No production v1.0 acceptance yet.

## Release blockers

No physical Win10 or user M1/M4 GUI acceptance, no verified cross-platform XeLaTeX installation smoke, no source-safe visual TikZ editing, no arbitrary PDF page navigation, no full PGF extension compiler/visual-compatibility matrix. Windows Server 2022 CI is not Windows 10.
