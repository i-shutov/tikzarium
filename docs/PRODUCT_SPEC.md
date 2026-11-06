# TikZarium — product requirements, owner-corrected scope

**LATEST owner correction — 2026-11-06 (supersedes the old HIGH-token prohibition):** TikZarium supports an existing Administrators-group account, including HIGH/elevated Administrator. External XeLaTeX/PDF helpers use the **current user's existing privileges**; no forced elevation, UAC/account changes or mandatory filtered-child launcher. The Windows GUI must visibly warn that elevated execution **is not a sandbox** and only trusted documents should be compiled; retain original MiKTeX warnings and exit codes, keep shell escape off, offline/no auto-package installation, bounded/cancellable processes. Unknown/SYSTEM tokens may remain unsupported. W1 needs actual product CLI→personal Server MiKTeX→Unicode/embedded PDF; W2 real Server GUI, W3 physical Win10 and W4 stable/installer are separate release gates. [Owner decision](https://github.com/i-shutov/tikzarium/issues/108#issuecomment-6695354140) · [Plan](../plans/2026-11-06_OWNER_ADMIN_BLOCKER_CORRECTION.md).

**Текущая платформа первого релиза (решение владельца 2026-11-05): Windows 10 x64 с установленным пользователем MiKTeX/XeLaTeX.** Заморозка функций; Windows portable ZIP и реальные GUI/TeX/PDF smoke до инсталлятора. Linux 1.0.0-rc.1 остаётся принятой кандидатной сборкой (без физической R4 и стабильного тега), Linux/macOS CI сохранены. Раздел 2026-11-04 ниже — исторический. Актуальные критерии: `plans/2026-11-05_WINDOWS_X64_RELEASE.md`.\n\n
## Current platform priority (owner, 2026-11-04)

**First full release: Linux desktop x86_64**, external independently installed XeLaTeX (TeX Live reference), real X11 GUI event/screenshot acceptance, with **iterative ergonomics/usability approval** before shipment. Preserve original cross-platform Rust/egui design, Windows 10 x64 external MiKTeX and macOS ARM external XeLaTeX compatibility and hosted tests from the outset; their **physical platform qualification and separate release packaging come after Linux**. Do not construe the older "Required environment" list as requiring all three physical platforms before the first Linux release. The editor must be usable at compact 1366×768, with balanced canvas/code/help, readable Cyrillic, grouped icon palettes, correct F1, safe editing, Undo, Save/Open, native dialogs and PDF. Source safety and external-engine constraints remain unchanged. See `plans/2026-11-04_LINUX_FIRST_CROSS_PLATFORM_RELEASE.md`.


Date: 2026-10-31. This replaces the earlier general graphics/CAD interpretation, not the implemented XeLaTeX workbench.

## Product

A local native Rust/egui **visual editor of TikZ commands**, with editable code permanently beside the drawing in the normal workflow and explanatory help for functions and parameters. The available tools follow the packages/libraries selected for the project. We use TeX; we do not rebuild it.

Canonical loop: **choose TikZ tool → enter/draw parameters → inspect ordinary generated TikZ code → run external XeLaTeX → view exact PDF**. Both code and form/canvas are authoring interfaces to the same source. The UI may draw temporary selection handles, grids and drag previews; they are not a substitute for TeX rendering.

## Required environment

- Windows 10 x64: **MiKTeX is installed independently by the user**. TikZarium locates its XeLaTeX or accepts an explicit executable path, records the distribution/version and checks requirements. It does not bundle TeX or manage a second distribution.
- macOS ARM64 M1/M4: external user-installed XeLaTeX, with explicit executable path and distribution identity.
- Missing packages/fonts are diagnosed. Package installation and updates remain in the external distribution manager. Do not silently trigger automatic MiKTeX installs, change global settings, or replace the compiler.
- Ordinary editing and installed-package compilation are offline; no account, telemetry or cloud service is required.

## First complete user workflow

Create a line, arrow, rectangle, circle, text/math node or cubic Bézier using its native TikZ construction. Set coordinates/size/style from a readable inspector; show the exact generated command immediately. Compile it with XeLaTeX, display the result, save/reopen and undo the edit without altering unrelated source. A button that only copies a snippet is an intermediate implementation, not acceptance of mouse authoring.

## Visible code and explanatory assistance

The default workspace keeps canvas, code and parameter help accessible together at compact desktop resolution and Retina scale. Selecting a known tool/command/key exposes:

| Field | Required content |
| --- | --- |
| Identity | Original TikZ/PGF/package command or key name, readable Russian label |
| Syntax | Exact command/key syntax and parameter roles |
| Values | Type, units, allowed values or limits; explicit UNKNOWN where not established |
| Default | Only a source-verified default; distinguish editor preset from TikZ default |
| Explanation | What changes in the figure; interactions and important limitations |
| Example | Small valid source example with necessary imports |
| Requirements | Package/library, engine compatibility and relevant version |
| Provenance | Manual title, section/anchor, URL or local texdoc target |

The same catalogue feeds toolbar, inspector, completion and contextual F1/hover. Help is not postponed until a later documentation release. User mathematical expressions remain TeX expressions; the editor must not substitute a home-grown solver.

## Package-aware editing

Separate installed, project-loaded, engine-compatible, tool-implemented and help-available states. When a package is installed but not loaded, offer a visible undoable preamble change. Missing/unimplemented tools explain their state. Unknown macros remain editable in source and compilable by XeLaTeX; they are not deleted or regenerated to fit a GUI model. An unsupported engine requirement is explicit, never a hidden compiler switch.

## Fonts, themes and exports

Keep figure typography through fontspec/unicode-math, Cyrillic and mathematical glyph checks, PDF font embedding, and the existing independent Light/Dark/Midnight/Paper GUI themes. Changing GUI appearance never changes the TeX figure. PDF export is canonical; other exports require a separately verified pipeline.

## Not mandatory for first drawing

A full TeX interpreter/parser, a general CST for arbitrary macros, a universal scene reconstruction from PDF, CAS/constraint solver, GeoGebra-like computation engine, generic CAD tools or executable WASM plugin host. Lightweight known-command recognition, coordinate conversion and source-span edits are sufficient initially. Later work is justified by concrete TikZ/package workflows, not by recreating Photoshop/Corel.

## Acceptance

Record exact Git SHA and actual environment for generated-source tests, external XeLaTeX builds, library activation, glyph checks, unknown-source preservation and undo. Separately record physical Windows 10 + MiKTeX and M1/M4 GUI tests, native dialogs, IME, scale and theme persistence. Hosted Windows Server/TeX Live success is not Windows 10/MiKTeX acceptance. See the revised roadmap and plans/insights pair.
