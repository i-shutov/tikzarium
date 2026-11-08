# Personal Windows Server W2 transport recovery — 2026-11-08

**Scope:** TikZarium only. Trusted `main` on the existing Windows Server runner; no TeX/OS/user/registry/UAC/FlowBridge mutation.

## Proven facts

- Exact `main` `26cf786d` and native hosted CI were successful.
- Personal Windows Server run [#42453220928](https://github.com/i-shutov/tikzarium/actions/runs/42453220928) ended **CANCELLED**, after the own-GUI/F1 probe reported step success.
- Two uploads of original evidence failed, as did subsequent Rust and MiKTeX jobs; GitHub's original job log returned BlobNotFound and artifacts were unavailable. **The root cause is unknown**. A successful GUI step is not full W2a acceptance without original full 125%-DPI client PNGs and JSON.
- Earlier personal run at `9c721242` established foreground/F1, but original 125% PNGs were truncated; PR #133's physical-pixel correction still requires actual personal-server evidence.

## New non-invasive diagnostic

- Emit a bounded JSON status of only TikZarium W2 report fields, without screenshot contents, credentials, environment secrets or arbitrary user paths; saves a copy beside the existing W2 report.
- Record local fixed-drive available/total GiB, DNS and TCP:443 reachability of github.com, api.github.com and results-receiver.actions.githubusercontent.com, with 3.5-second bounded connects. A failed DNS/TCP check is **diagnostic**, not permission to change firewall or assert the cause of past failures.
- Write the small sanitized summary to the job log and GitHub step summary, *before* the early artifact upload and again *after* native W1 steps even if they fail. Original PNG upload remains mandatory.
- Hosted Windows PowerShell5.1 parses the script and runs a synthetic, network-free negative/safe-output selftest before merge. No PR code executes on the persistent server.

## Gates / decision

1. Exact-head hosted Windows/macOS/Linux CI, QA matrix, PS5.1 selftest and original GUI evidence pass; inspect diff before expected-head merge.
2. On trusted main, read personal diagnostic output. If the artifact upload fails and transport cannot reach the required results-receiver endpoint, investigate network restrictions with the administrator; **do not silently weaken network policy**. If transport passes, inspect runner diagnostics / file service and storage/quota before changing anything.
3. Re-run only a trustworthy `main` and validate original complete 125% PNGs with physical geometry, PNG pixel audit, F1 visual review, owner HWND and source/binary SHA. Do not accept W2a from green workflow.
4. Full W2b six gestures / source edits / Undo / Save/Open / IME / GUI→MiKTeX and separate physical Win10 W3 are still required. No `1.0.0` stable tag before these tests.

GitHub's self-hosted runner documentation explicitly lists `results-receiver.actions.githubusercontent.com` and `*.blob.core.windows.net` as required for uploading logs and artifacts; these public facts motivate the read-only probe but do not establish this runner's root cause.
