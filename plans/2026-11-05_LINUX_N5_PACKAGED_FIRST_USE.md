# N5 Linux portable first use — real package GUI → source → XeLaTeX → PDF

Owner: Linux-first foreground product integration, not a CI-only PR. Windows/macOS remain cross-platform compile targets; FlowBridge and the trusted Windows Server runner remain untouched.

## Baseline and observed gap

On 2026-11-05 merged `main` at `ddf018a7d57f963fd8491c82ef303e9223e3f41c`: [Rust CI 41952958940](https://github.com/i-shutov/tikzarium/actions/runs/41952958940), [N5 extracted release X11 41952958962](https://github.com/i-shutov/tikzarium/actions/runs/41952958962), [I61 source GUI 41952958966](https://github.com/i-shutov/tikzarium/actions/runs/41952958966), N1, D QA and D06 all SUCCESS. The distinct self-hosted Windows run 41952959005 failed; no Linux implication. Existing Linux N5 proved only real ELF extraction/window, while the complete GUI-to-PDF acceptance operated a **different, source-built debug binary**.

Production problem: portable `launch.sh` changed cwd to the extracted bundle. Ordinary relative `.tex` and exported PDF could be saved beside the app, not in the user's intended working directory, and fail with read-only bundles. Preserve caller cwd, locate app using launcher location, and test spaces/Cyrillic/arguments including PATH invocation.

## Substantial user-facing integration

1. Rebuild deterministic native ELF bundle with revised launcher. Keep manifest SHA256, binary architecture and proven source provenance gates.
2. Use the **extracted portable launcher** (not debug binary or direct in-process simulation) under X11 and run all six mouse tools, source Save, F1, Inspector/Undo, CRLF, real Open and external XeLaTeX PDF/Unicode/font proof.
3. In the same extracted launcher, run N2/N3 source and library Connect/Undo/Save/Open, F1 source-caret completion and a second external XeLaTeX PDF.
4. Fail-closed on changed app/src tree, cross-check launcher and actual ELF against manifest, original source HEAD and I61/N2 report. Upload all original PNG, .tex, PDF, fonts, log, SHA on failure as well as PASS.
5. Independent original screenshot/PDF/content review **required** before expected-head merge, then postmerge checks. Native physical Linux desktop, scaling/DPI 1/1.25/2, XDG native file dialogs, Wayland and broader distros are separate NOT_RUN gates.
6. Do not install TeX from the application; test-only XeLaTeX comes from disposable hosted Ubuntu. Do not touch Windows Server/FlowBridge or change Windows/macOS source contracts.

Do not label this complete before exact-head run and human artifact review.