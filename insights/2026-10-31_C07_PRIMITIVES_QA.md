# C07 — six native TikZ primitives: QA evidence and limits

Date: 2026-10-31. Branch `feat/c07-tikz-native-six-primitives-20261031`. Baseline main `c5c8c1576b6288e1d125d558d0d4872b321efb86`. B API coordination issue #35.

## Primary manual validation
- Official PGF/TikZ manual target **3.1.12**, HTML update 2026-10-09: [14.2 line, 14.3 cubic controls, 14.4 rectangle, 14.6 circle](https://tikz.dev/tikz-paths); [16.2 arrows, 16.5 Stealth/Latex and arrows.meta](https://tikz.dev/tikz-arrows); [17.2 / 17.4 nodes](https://tikz.dev/tikz-shapes).
- Six literal templates use documented `\\draw` / `\\node` operations; **no guessed PGF package defaults or minimum version**. All declared defaults are explicit example/editor presets. The browser-readable manual is secondary HTML rendering of original PGF documentation; the source-of-truth is PGF/TikZ manuals.

## Actual C local XeLaTeX fixture probe
- On the execution environment (not the customer's target machines): XeTeX 3.141592653-2.6-0.999996, **TeX Live 2025/dev/Debian**, Debian GNU/Linux x86_64; `xelatex -no-shell-escape -halt-on-error -file-line-error -interaction=nonstopmode all-six.tex`.
- An exact text counterpart of the committed six-tool fixture was compiled manually in a scratch directory: exit **0**, **one page** by Poppler `pdfinfo`, without any additional macros.
- Input SHA-256: `e4aa854d86d4328276b774554c4c1c71e6f8bf38b952ecf0bd414f87200f3144`; PDF SHA-256: `42be15fd798d374985a3e5fdcafc3dbed2e58a9eaa07bb050b49be90d576c1d8`. Evidence applies to **these six source snippets only**, not to every PGF package/version or to visual manipulation.
- **Not yet proven end-to-end:** the compiled Rust `primitive-fixtures` executable actually emits the same bytes. The Rust snapshot test must PASS under CI. No local cargo/rustfmt/rustc installed. NO Rust PASS is claimed before exact-head Actions finish.
- No PDF appearance / GUI drag/restart was reviewed on physical Windows 10 / physical Apple Silicon. Status **NOT_RUN**.

## Test responsibilities
- Source code: serde TOML schema validation, enum/dimension literals, source-template equality, exact feature requirements, conservative unknown evidence, minimal edit with undo.
- `tests/primitives.rs`: all six tool IDs, nonempty help and manual data, generated-file snapshot, injection and radius negatives in `negative-cases.toml`, node escaping and raw math, source conflict+undo, capability separation.
- Potential remaining issue: arbitrary user-authored math is **untrusted TeX**, not security-filtered by C; no promise of shell/process isolation. The core runner must keep `-no-shell-escape` and use independent sandbox policy if needed. Raw TeX outside generated spans remains entirely untouched.

## Capability record (not a release certificate)
| Check | Result | Evidence |
| --- | --- | --- |
| Six static source templates + PGF references | IMPLEMENTED in C source | TOML and Rust generator |
| Literal parameter validation | IMPLEMENTED; CI execution pending | Rust tests and negative-cases TOML |
| XeLaTeX six-snippet minimal fixture | PASS, local Debian only | exit 0, one page, SHA above |
| Rust exact-head fmt/test/clippy | NOT_RUN / PENDING | no local toolchain, check Actions |
| B egui toolbar/inspector binding | NOT_IMPLEMENTED | separate issue #35 |
| Windows 10 MiKTeX native smoke | NOT_RUN | physical machine required |
| Physical Mac M1/M4 XeLaTeX + GUI | NOT_RUN | physical machine required |
| Lua-only graphdrawing under XeLaTeX | INCOMPATIBLE_ENGINE | existing suite, unchanged |
| Package inventory / MiKTeX installed = source loaded | FALSE | explicitly independent flags |

Integration watch: C04 #26 and C06 #34 remain independent pending changes; do not conflate C07 schema with the older 5-manifest / 14-family package matrix verifier. No B/A/D-owned code changed.

## C07 CI triage and correction
- Hosted exact-head Actions for cc0e478 (CI and D QA) **FAILED** at `cargo fmt --all -- --check` in newly added C-only Rust files; font and real TeX fixture workflows passed separately. Failure evidence: https://github.com/i-shutov/tikzarium/actions/runs/41187354708 and https://github.com/i-shutov/tikzarium/actions/runs/41187354705.
- Applied the **exact rustfmt patch produced by the failed hosted run** to C generator/tests, without changing A/B/D. Explicit non-XeLaTeX engine selection now records `Evidence::Absent`, not `Unknown`; unknown only means unobserved engine.
- New commit is **QA_PENDING** until all exact-SHA cargo fmt/test/clippy and Rust binary fixture parity run. No local rustfmt available; a mechanically recovered rustfmt diff is not itself an executed check.
