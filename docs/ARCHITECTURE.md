# Architecture — TikZ-native authoring, external XeLaTeX

Owner correction: 2026-10-31. Supersedes the universal CAD/geometry-engine dependency chain. This is the target architecture, not a claim that all authoring tools are already implemented.

## 1. Responsibilities

```text
Project: ordinary .tex/.tikz + preamble + included resources
                         ↕ minimal revision-checked edits / undo
  egui: TikZ tools + parameter inspector | editable code | contextual help
                         ↓ native command generation
                  Existing source document
                         ↓ external build service
 Windows: separately installed MiKTeX/XeLaTeX | macOS: external XeLaTeX
                         ↓
             Exact PDF → preview / export / diagnostics
```

A shared catalogue supplies command syntax, parameter metadata, required packages/libraries, Russian explanations, examples and manual locators. It drives tool availability, inspector controls, source completion and help. Rust manages interaction, source edits and processes; TeX/PGF and their packages perform typesetting, expression evaluation, layout and final drawing.

## 2. Reuse the current workspace

Keep `tikzarium-app` (egui), `tikzarium-core` (documents/build/diagnostics/fonts), `tikzarium-cli` (doctor/build) and `tikzarium-extensions` (catalogue and requirements). Add a small authoring module only when needed; do not create empty crates for a speculative universal scene/CAS/geometry platform.

A typed authored-command instance needs a catalogue ID, parameter bindings, source range/revision and optional edit handles. Literal geometry for pointer interaction is allowed. TikZ expressions, anchors, transforms, loops and macro evaluation remain with TeX unless a specific safe edit is supported. No universal PDF reverse mapping is assumed.

## 3. Shared command contract

The catalogue owner C proposes a versioned serializable contract and B consumes it rather than maintaining competing schemas. Minimum fields: command ID and syntax; label/summary in Russian; package/library requirements and engine constraints; parameter type, units, allowed values, documented default versus editor preset; parameter explanation and examples; manual/version/section locator; source-generation rule; supported edit operations.

Help-only entries are permitted for constructs without a graphical adapter. Default values without a verified manual source must remain UNKNOWN. Explanations are authored summaries, not bulk redistribution of manuals. A later plugin adds tools/help/generation metadata without changing the TeX compiler.

## 4. Library activation and source editing

Keep independent states for installation, project loading, engine compatibility, graphical tool implementation and help availability. Scan explicit `\usepackage`/`\usetikzlibrary` declarations and includes conservatively; macro-dependent activation may be UNKNOWN. Compiler observations may provide additional evidence, not a universal static parser.

New commands are inserted at an explicit authoring location. Editing a recognized command checks its source revision, applies the smallest edit and creates one undo step. Connecting a library produces a visible, undoable preamble patch. Comments, unknown macros and unrelated bytes remain intact. Manual code edits invalidate stale handles and trigger targeted re-recognition, not whole-document regeneration.

The normal drawing mode always shows code beside the canvas. Highlight the affected source after an action. Unsupported scopes remain source-first; do not claim accurate coordinate mapping where the editor cannot establish it. Temporary interaction overlays are clearly different from the last exact compiled PDF.

## 5. External runtime and builds

Windows 10 uses the user's independently installed MiKTeX. Detect distribution/executable/version and permit explicit configuration; do not install another TeX distribution. MiKTeX documents `--disable-installer` for its XeTeX implementation; A must verify the actual XeLaTeX invocation and use distribution-specific options rather than assuming TeX Live compatibility. Package downloads/updates and global settings remain external.

Preserve direct process invocation, safe filenames, no shell escape by default, cancellation, time/resource bounds, optional persistent logs, `.fls` dependency tracking and structured source/line diagnostics. No-shell-escape is not an OS sandbox. Project profiles support full documents and fragments with explicit preambles, not implicit destructive wrapping.

Keep the last-good PDF stale/nonexportable after failure or dependency change. Only navigate a logged diagnostic when its file is established, never jump to an included file's line in the wrong buffer. Retain the existing typed font audit. A zero exit code does not prove complete glyph coverage.

## 6. Rendering, fonts and cache

XeLaTeX PDF is authoritative; Poppler or another reviewed PDF backend displays it. The Rust overlay is not a PGF replacement. Bound worker duration and image decoding. Record renderer/tool versions and cache keys containing source, project profile, dependencies and relevant environment. Figure fontspec/unicode-math choices are independent of egui fonts and theme palettes.

## 7. Platform and evidence boundaries

Native Windows 10 x64 + MiKTeX and physical Mac ARM64 M1/M4 remain acceptance targets. Hosted Windows Server and TeX Live checks are supplementary, not substitutes. Installable/portable application artifacts do not include a private TeX distribution or user font binaries. Offline runtime, unknown-source preservation, code visibility, contextual help and font/theme invariance must be tested as whole user workflows.

## Sources for runtime/language contracts

- PGF/TikZ path syntax: https://tikz.dev/tikz-paths
- Path actions: https://tikz.dev/tikz-actions
- Nodes/edges: https://tikz.dev/tikz-shapes
- MiKTeX independent Windows installation: https://miktex.org/howto/install-miktex
- MiKTeX XeTeX options: https://docs.miktex.org/manual/miktex-xetex.html

These sources explain upstream behavior. They do not establish that the corresponding TikZarium GUI implementation has passed testing.
