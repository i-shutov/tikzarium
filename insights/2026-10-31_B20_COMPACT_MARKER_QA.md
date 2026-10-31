# B20 — QA/evidence for source-readable marker

2026-10-31. Independent D observation: [PR #62 comment](https://github.com/i-shutov/tikzarium/pull/62#issuecomment-6547444422) and [PR #48 actual X11 artifact](https://github.com/i-shutov/tikzarium/actions/runs/41193713529) show the long hex metadata overwhelming always-visible TeX. That is a source usability defect, distinct from the known #48 Cubic click-coordinate 5/6 issue (not fixed here).

**Before:** a circle's 114-byte JSON ownership blob becomes 228 ASCII hex characters, plus the fixed TeX-comment marker. **After:** the same fields in a compact 74-byte plain UTF-8 JSON tuple, ~68% smaller metadata and human-readable names/values, without changing the generated TikZ command. For other primitives, byte lengths are asserted in Rust tests rather than guessed here.

Safety model: unchanged N1 prefix; legacy exact line recognized; compact exact line recognized; both must regenerate identical C catalogue command and metadata. Changed marker or unknown schema fails closed. No-op legacy Apply does nothing; actual legacy edit upgrades only its own verified line and Undo restores byte-exact legacy line. Source Save/Reopen uses the real Document API. Existing gesture event-frame tests are reused and strengthened.

**Evidence classification at creation:** source review and implementation, not a Rust PASS. No local Rust toolchain or physical GUI environment in this workspace. New exact-head CI is required; actual statuses and links will follow in PR/QA notes. Linux/X11, physical Windows10 and M1/M4 acceptance NOT_RUN, no screenshots invented.
