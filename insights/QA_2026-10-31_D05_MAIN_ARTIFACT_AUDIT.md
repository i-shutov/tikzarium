# D05 — Independent inspection of the merged I05 main artifacts (2026-10-31)

**Main baseline**: 8764a732b9a846a6ba1f111c9b656781195a6412, merged I05 PR #24. Open PRs at inspection: #25, #26, #27 (D04), #28, #29, #30. D05 is not stacked on or rewriting pending D04. Old Windows source-operand defect in PR #24's previous head was corrected in main, but each later head requires its own evidence.

[Main D QA 41182646018](https://github.com/i-shutov/tikzarium/actions/runs/41182646018) shows 6/6 hosted jobs success for Rust fmt/test/clippy and actual Rust CLI -> XeLaTeX on Linux, hosted Windows Server and hosted macOS ARM. [Main CI 41182646016](https://github.com/i-shutov/tikzarium/actions/runs/41182646016) passed. A separate *main-head* F01 font-workflow run was not identified here; no such PASS is claimed.

## Six artifacts actually downloaded, opened, hashed and inspected

GitHub ZIP bytes independently SHA-256-hashed. All six artifacts correspond to the same workflow run and source head. Every archive was extracted and JSON/TOML evidence parsed, not merely trusted by green CI jobs.

| Host | D fixture/extension artifact and ZIP SHA-256 | GUI-unit artifact and ZIP SHA-256 |
| --- | --- | --- |
| Ubuntu 24.04 x64 | [13035722292](https://github.com/i-shutov/tikzarium/actions/runs/41182646018/artifacts/13035722292): cf6606a6978de80c0ee7b263636f9533a11150c832350f67c1b544af42353e1c | [13035358563](https://github.com/i-shutov/tikzarium/actions/runs/41182646018/artifacts/13035358563): 13e33c0be17401fa6f454cf1789a163104fc7fee64a94843b69bed2172500670 |
| Windows **Server 2022** x64 | [13034679878](https://github.com/i-shutov/tikzarium/actions/runs/41182646018/artifacts/13034679878): 5cf249bc02479167089a15f86f7052dd2a900c132218f08dc21ea62c06ea2859 | [13034884125](https://github.com/i-shutov/tikzarium/actions/runs/41182646018/artifacts/13034884125): bd7211cbbb801b26b2d7baeff16f0fc2eb088cf219e424e50934693548f4c205 |
| Hosted macOS 15 ARM64 | [13035104577](https://github.com/i-shutov/tikzarium/actions/runs/41182646018/artifacts/13035104577): df5e0eb04ef9babdf33bbc1094e5b519a3adab97442d36b8fb26f2e85c7798c9 | [13035193780](https://github.com/i-shutov/tikzarium/actions/runs/41182646018/artifacts/13035193780): facc63cc0b0d76d76d9df28d17dbd395b72004f0c2221f8c9af46a9e5bd47594 |

Each C03 audit.json: accepted=true, complete_suite=true, verified_fixtures=5, errors=[]. Independently compared **15 observation TOMLs**, their 15 console and 15 TeX logs, all five original source files, and 12 genuine positive extension PDFs against SHA-256. Each host: 4 one-page PDFs and 1 graphdrawing-lua negative with the complete required LuaTeX message even when TeX Live 2026 wraps within 'graph'; there was **no PDF** for that negative. All three G02 PDF checks reconfirmed via local Poppler: Cyrillic 'Оптика и квантовая яма', Greek 'Греческие символы αβγ', embedded DejaVuSerif and LatinModernMath. All three six-case D fixture reports: 5 PASS, 0 FAIL, 1 legacy KNOWN_LIMITATION. The three UI unit-contract JSONs: 3/3 theme and 2/2 font unit tests PASS_UNIT; physical and real GUI tests remain NOT_RUN.

### New finding: Windows Git end-of-line conversion

Raw Windows QA manifest SHA was **dc9fc728cbae48c63a17f1022fa7f2181096f143c7b004256a7bca5cd5d936aa**, while Linux/macOS was **e1201b5aec8eaf39f57325cf28c1338076f752db777e12e64ce0ddd268c55778**. All five Windows extension input source hashes similarly differed from Linux/Mac. Independent byte hashing of each canonical source after the *exact LF-to-CRLF conversion* reproduced every Windows hash, including manifest; arbitrary mutations would not. This is native Git checkout behavior, **not** corruption, and a strict equality comparison of Windows versus Unix input hashes would be a false regression. D05 allows only exact checkout bytes or the precise Windows-specific conversion.

### Executed D05 QA (not a new PR-head CI declaration)

- Local Python 3.13.5: **13/13 offline tamper/unit tests PASS**, including missing host, wrong source/checkout SHA, incomplete catalogue, wrong G08 source error, malformed Lua-negative PDF existing, missing Lua-required error, fake UI restart acceptance, independent PDF font embedding guard.
- Full new D05 verifier executed against all six extracted main artifacts using Linux Poppler pdfinfo/pdftotext/pdffonts. Report: accepted=true, 3 hosted operating systems, 6 D fixtures + 5 extension observations each, 12 extension PDFs + 3 G02 PDFs, original source and TeX-log checks. It explicitly reports physical_win10_smoke=NOT_RUN, physical_m1_m4_smoke=NOT_RUN, gui_restart_persistence=NOT_RUN and R4 NOT_PERFORMED.
- The D execution sandbox did not run cargo/rustc or physical GUI. This verifies downloaded artifacts with real PDF inspectors, **not** a new Rust compile. New D05 PR exact-head CI **PENDING**, and must not inherit green main SHA or other PRs.

## Next bounded gate

On the new PR head require 3-job Rust CI, 7-job D QA including the *downloaded-artifact* integrity job, and independent F01 proof if triggered; download and inspect the new crosshost-audit.json. If any discrepancy occurs, isolate D-only fix and retest exact SHA. Real Windows 10 x64, physical M1/M4, four-theme visual restart/persistence and GPU preview acceptance remain NOT_RUN. R4 corpus remains reference-only without independently verified per-asset licenses; O027/O028/O030/O047 warnings remain outstanding, no content imported.
