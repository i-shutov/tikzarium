# First current-layout hosted native attempt — run 43367842268

- Repository: i-shutov/tikzarium; PR #189.
- Exact head: `cc25f815248215f7f4d4e50656cc91545e1c01d0`.
- Root tree: `4646f361e8d1b0bd1d87be30e88981d056de1cc3`; app tree: `865b883c508faf647dea5011dcff09b88f26c131`.
- [Original run](https://github.com/i-shutov/tikzarium/actions/runs/43367842268): completed **failure**, job 131696363228.
- [Original artifact 14011655382](https://github.com/i-shutov/tikzarium/actions/runs/43367842268/artifacts/14011655382): 1,694,753 bytes; preserved ZIP SHA256 `d1247de9e5b32a5d212dad85746b1213aad73ee9f7be804a595a480e6386f8bb`, matching the upload log.
- Production app SHA256: `f82087379867d32ef7e6ff1ce62318bbf686bffdc16bb03caf74828c04f5e715`.

## Observed result

Dependency installation, formatting, collector contracts, mixed-history tests and locked production app/CLI build passed. Actual production PID8782 created owned X11 window6291459. The original 1366×768 images show compact Studio and the SV001-derived source loaded in the editor.

Stage `opened` passed saved-source and actual full-editor clipboard comparisons. Both match expected input SHA256 `978ccbef1c5b61156f129d52a3ca47b0d4cff23f45c3b46cafdca2a1139c9bab`. The original stage metadata and source/clipboard files are preserved.

Stage `typed` failed **before marker paste**: `xdotool mousemove --sync --window 6291459 200 230 click 1` timed out after15 seconds. The preceding copy-editor action had already targeted that same source coordinate. The opened and failure PNGs are identical SHA256 `81868c6f27d2e801b8497783b4e1fb5e0bb54fb5d9fac1f7935b24c07b382305`. This supports a no-motion `mousemove --sync` harness stall, not a source mutation failure. Driver owner was notified to remove the unnecessary motion wait while retaining owned-window/focus guards.

No typed, draft, Apply, Undo, Reopen, GUI Build or PDF export result was reached. This attempt supplies **HOSTED_GUI partial evidence**, not a successful scientific vertical or physical-platform acceptance.

## Retained originals

The untouched ZIP and extracted47 original files are alongside this note. The extractor root is `original-artifact/`; relevant paths:

- `sci-compact-native/observed/opened/stage.json`
- `sci-compact-native/observed/opened/{saved-source.tex,visible-source.txt,screenshot.original.png}`
- `sci-compact-native/raw/010-opened.png`
- `sci-compact-native/raw/failure-original-desktop.png`
- `sci-compact-native/{driver-report.json,native-actions.log,app.log}`
- `sci-build-provenance.json`
- `sci-compact-native-logs/`

Original full job log, run/job/artifact metadata and exact-head run snapshots are also saved.

## Exact-head Actions scope after this attempt

Generic GET `/repos/i-shutov/tikzarium/actions/runs?head_sha=cc25f815248215f7f4d4e50656cc91545e1c01d0&per_page=100&page=1` returned **total_count16 and all16 runs**, with no event filter:14 pull_request and2 push. Snapshot after native completion:10 success,3 failure,3 in_progress. The other two failures are I61/N5 historical source-tree leases. This is a current snapshot, not a declaration that every associated run has finished.

No remote mutation or rerun was performed by this audit task.

