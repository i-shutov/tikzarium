# Hosted CI follow-up for code 1784a482

This follow-up is newer than the initial 37-file evidence archive. It preserves the earlier archive unchanged.

## Completed checks

The [retrieved check snapshot](hosted-checks-1784.json) contains **25 success, 3 failure, 1 skipped** check runs for exact code SHA `1784a48246cbdfd260fb80ce4731c7f165ad52c5` (push/PR duplicates are retained, not counted as separate product capabilities).

Rust native Windows/macOS, Rust/QA harness on Linux/Windows/macOS, source-owning Inspector on all three, actual XeLaTeX CLI on all three, corpus hashes, MiKTeX PDF audit and font checks succeeded. Hosted actual-studio and authoring jobs also report success; a green job alone does not close full native/physical acceptance.

Two failures are the unchanged APP_TREE leases documented in the original evidence archive. The third is [the hosted Win32 job](https://github.com/i-shutov/tikzarium/actions/runs/43181526405/job/131058409896), whose window/F1 subset passed before its slow-startup audit failed:

```text
No live slow probe overlapped actual GUI capture; responsiveness not demonstrated
```

Original timestamps explain the missing witness: version probe ended at `08:18:43.0961335Z`; before-F1 capture was recorded at `08:18:43.1477808Z`; lookup began at `08:18:43.1643788Z` and ended at `08:18:45.1743382Z`. The chosen capture timestamp falls in the gap. This does not establish a product hang, and it does not establish responsiveness during a probe. The existing assertion correctly refused to claim that proof.

## Independently retrieved and viewed originals

Downloaded [artifact 13927351150](https://github.com/i-shutov/tikzarium/actions/runs/43181526405/artifacts/13927351150), checked the original ZIP SHA-256 `54649abde3fff0a63c5dc7bb481cee47ad61ae7bd5242104717bb4e39c6b9a13`, verified screenshot hashes against the original JSON, and visually inspected the before/after F1 PNGs.

The ordinary capture shows six direct tools, editable source, the primary «Собрать PDF» action, PGFPlots section and elevated-context warning. After F1 the right dock visibly displays Russian help. This supports **HOSTED_WINDOWS_SERVER_2022 / 96 DPI / STARTUP+F1 PARTIAL**. It is separate from the unavailable local cloud desktop channel.

The [retained subset ZIP](hosted-win32-1784-originals.zip) preserves eight original PNG/JSON/probe-log files byte for byte; [manifest](hosted-win32-1784-manifest.json) records every hash. Synthetic probe executables are excluded. The original report remains unchanged with its original NOT_RUN fields.

Six gestures, source patch/Undo, save/open/native dialogs, GUI-origin XeLaTeX PDF, real Win10, IME, 120/192 DPI and native G3 are not accepted by these captures. The atlas remains a design mockup even though this separate native evidence is now available.

## QA-only correction submitted after this observation

The hosted capture script now records UTC start/end immediately around both original owned capture calls. The slow-probe audit accepts either capture only if its entire interval is contained in a completed probe: `probe.start <= capture.start` and `capture.end < probe.end`. The proof identifies the capture phase, probe PID/kind and both intervals. Sleep durations, HWND/foreground/source-SHA/no-console guards and physical exclusions are unchanged.

Self-tests cover before/after success, no overlap, equal-start acceptance, equal-end and partial-overlap rejection, invalid intervals, and invalid data after an earlier matching pair. Independent junior review caught an early-return validation gap; root corrected it to validate all intervals before returning the first proof. This changes QA scripts only; all Rust crate Git objects remain identical to the 512-test code snapshot.

PowerShell is unavailable in the local Linux workspace. At submission this QA correction was **IMPLEMENTED_NOT_VERIFIED** by native execution. The subsequent exact-head result is recorded below; it does not retroactively change the failed 1784 job or its original evidence.

## Verified correction on 8fa502c

The [exact-head Win32 job](https://github.com/i-shutov/tikzarium/actions/runs/43183582686/job/131065210740) completed **success** for source `8fa502c277920599f0ca8e43b49ef74b7bb31591`. The [complete check snapshot](hosted-checks-8fa502c.json) has **26 success, 2 failure, 1 skipped** (29 completed check runs, retaining push/PR duplicates). The two remaining failures are `linux-portable` and `studio-full-vertical`, stopped by the unchanged APP_TREE gates. Overall CI is not green.

Downloaded [original artifact 13927891825](https://github.com/i-shutov/tikzarium/actions/runs/43183582686/artifacts/13927891825), checked upstream ZIP SHA-256 `1d3f704ddcd2aa2b5e528bc3f748f1c4876d656693221a19323df9bb5554d893`, checked source SHA and four screenshot hashes against their original reports, and visually inspected both slow-startup PNGs. The retained [nine-file subset](hosted-win32-8fa502c-originals.zip) and [manifest](hosted-win32-8fa502c-manifest.json) preserve the original reports, screenshots, probe log and successful interval audit byte for byte; no probe executable is included.

The original audit status is **PASS_NATIVE_GUI_DURING_SLOW_READONLY_PROBE**. It records the actual `after_f1` capture from `08:33:30.9494318Z` to `08:33:30.9811363Z` wholly inside lookup probe PID 5528, from `08:33:30.1033379Z` to `08:33:32.1235088Z`. Source, HWND/foreground and no-probe-console guards remain active. The report retains `fixture=SYNTHETIC_NOT_REAL_TEX`, `physical_windows10=NOT_RUN` and `full_w2_qualification=NOT_RUN`.

This verifies the QA correction and **hosted Windows Server 2022 / 96 DPI startup, F1 and responsiveness during the synthetic read-only probe**. Rust crate and lock objects remain identical to the 512-test snapshot. It does not accept the complete scientific editing/build/export workflow, physical Win10, IME, other DPI modes or G3. This final follow-up changes documentation and retained evidence only.
