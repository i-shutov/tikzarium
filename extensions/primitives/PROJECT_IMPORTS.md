# N2 — literal project imports (C public contract)

This composes with the **merged** N1 six-tool catalogue. It introduces no second generator or scene model.

## Public Rust contract

- project_imports::inspect(source: &str) -> ProjectImports: scans literal declarations only before the standalone begin-document token.
- ProjectImports::status(ImportKind::{Package,TikzLibrary}, name) -> Evidence: Confirmed = explicit literal import; Absent = safely recognizable preamble without such import; Unknown = macro/conditional/indirect/malformed import. No installation claim.
- ProjectImports::begin_document_target(revision) -> Option<SourceTarget>: exact byte-range anchor and caller revision; None if unsafe.
- project_imports::capabilities_for_tool(catalog, tool_id, project, installed, engine): INSTALLED, PROJECT_LOADED, ENGINE_COMPATIBLE, TOOL_IMPLEMENTED and HELP_AVAILABLE remain independent; no GUI claim.
- project_imports::plan_import(source, target, kind, name) -> ImportDecision::{AlreadyLoaded, Proposed(ImportPlan), Refused{reason}}. Planning never edits.
- ImportPlan.patch: ordinary N1 SourcePatch (zero-byte insertion); ImportPlan.anchor: exact original begin-document byte range; ImportPlan::apply verifies anchor and revision/old bytes, returns inverse SourcePatch for explicit Undo.

## Deliberately narrow imports

Supported proposed edits are \usepackage{tikz} plus \usetikzlibrary{arrows.meta}, {positioning}, {calc}, {fit}. If a library is requested, tikz package is included only when explicitly absent in a safely recognizable preamble. Duplicates are no-ops. A library declaration before a confirmed tikz package declaration is UNKNOWN and refused rather than repaired in an invalid order. Macro/conditional/indirect imports, unknown preamble commands and mixed line endings refuse patches with a reason; project source is left intact. No automatic package installation or silent XeLaTeX-to-LuaLaTeX switching. All other installed XeLaTeX-compatible packages remain available for user-authored source compilation without a visual adapter. Lua-only graphdrawing does not gain XeLaTeX compatibility.

The recognizer is not a TeX parser, CST, solver or PDF decompiler. Document body macros are never changed. Literal preamble declarations, comma lists and literal package options are recognized. Literal \pagestyle{...} is accepted as an inert page-style line for the existing N1 XeLaTeX fixture.

## B integration sketch

~~~rust
use tikzarium_extensions::project_imports::{inspect, plan_import, ImportKind, ImportDecision};
let observed = inspect(&document);
if let Some(target) = observed.begin_document_target(document_revision) {
    match plan_import(&document, target, ImportKind::TikzLibrary, "arrows.meta") {
        ImportDecision::Proposed(plan) => {
            // Show user the literal source insertion and its context first.
            // Only after explicit user confirmation:
            let inverse = plan.apply(&mut document, &mut document_revision)?;
            // B retains inverse for checked Undo.
        }
        ImportDecision::AlreadyLoaded => {}
        ImportDecision::Refused { reason } => {
            // Show the reason, leave source unchanged, offer source editing.
        }
    }
}
~~~

B owns UI diff/approval, document revision, full-buffer authority checks, saving and Undo. C's patch protects its exact anchor and expected local bytes; if B changes the buffer without incrementing revision, B must still invalidate its visual history.

## Independent QA

cargo test -p tikzarium-extensions --test project_imports exercises four libraries, tikz package insertion, literal lists/options, CRLF preservation and Undo, duplicates, wrong ranges/revisions, macro/conditional UNKNOWN, and the original six-tool fixture. cargo test -p tikzarium-extensions additionally runs the six generator and help regression tests. These are unit/source tests, **not** external XeLaTeX compilation or physical Windows 10/M1/M4 GUI acceptance. D owns compiled fixtures; E owns independent help; F owns source-integrity testing. No E/F-owned files changed.


## C/N2 disconnect vertical (additive API)

The merged #49 import API remains unchanged. The C-owned
project_disconnect module adds an explicit **library removal proposal**,
not an automatic TeX uninstall or a general-purpose preamble parser:

~~~rust
use tikzarium_extensions::project_disconnect::{
    plan_library_disconnect, DisconnectDecision,
};
let observed = inspect(&document);
if let Some(target) = observed.begin_document_target(document_revision) {
    match plan_library_disconnect(&document, target, "calc") {
        DisconnectDecision::Proposed(plan) => {
            // B first displays plan.patch.expected_old -> plan.patch.replacement.
            // Only after user consent:
            let undo = plan.apply(&mut document, &mut document_revision)?;
            // B stores undo as an ordinary SourcePatch, never a document rewrite.
        }
        DisconnectDecision::AlreadyAbsent => {}
        DisconnectDecision::Refused { reason } => {
            // Keep source unchanged; explain why and offer manual source editing.
        }
    }
}
~~~

Supported disconnects: **arrows.meta, positioning, calc, fit**.
Only a confirmed literal standalone \usetikzlibrary{...} preamble line may be
edited. In an ordinary comma list, precisely one library token plus its
separator is removed, preserving every other library and the remaining syntax.
Removing a single-item declaration removes its complete physical line,
including the original LF or CRLF ending. A same-line user comment, repeated
library import, macro/conditional/opaque declaration, mixed line endings or
stale source revision **refuses** the edit with a reason.

The independent installed, project_loaded, engine_compatible,
tool_implemented and help_available dimensions remain unchanged.
A disconnected library may still be installed and available to raw source;
an indirect or unknown import cannot safely be announced as disconnected.
A successful SourcePatch is not a GUI action until B shows the diff,
receives confirmation and records its inverse for Undo. D can compile the
four original generated import fixtures and test a disconnect/reconnect
transaction separately; neither proves physical Win10/MiKTeX or Mac ARM UI.


### N1 authoring interoperability: positive literal evidence versus UNKNOWN

A direct `\usepackage{tikz}` or `\usetikzlibrary{arrows.meta}` in the **trusted literal preamble prefix** is source-level **CONFIRMED** even if a later unrelated opaque user macro makes the rest of the preamble uncertain. This is textual declaration evidence, **not** a claim that a file is installed or that TeX compilation succeeded. Imports **absent** from an opaque preamble are **UNKNOWN**, never incorrectly NOT_LOADED. A conditional or unknown macro **before** an import taints subsequent literal observations, so neither conditional imports nor macro-dependent declarations become false positives.

Only flat literal `\setmainfont{DejaVu Serif}` / `\setmathfont{latinmodern-math.otf}` style assignments are recognized as import-neutral and passed over; opaque font options/macros remain UNKNOWN. This does not resolve or install fonts, expand TeX, or modify the editor source. All automatic additions and removals still refuse on any uncertain preamble, preserve CRLF and known source revisions, and leave manual raw TeX editable. This separation removes the real N1 authoring regression exposed by B #50 while retaining the conservative N2 source-patch contract.


## N2 literal declaration provenance (additive read-only API)

The source-first dependency inspector can display *why* a package/library is
`Confirmed` without implying installation or full TeX evaluation.
`ProjectImports::declaration_sites(ImportKind, name)` returns zero or more
`DeclarationSite { kind, name, name_range, line_range }` values. Both ranges
are **UTF-8 byte offsets in the exact inspected source buffer**:
`name_range` highlights only the literal member of a comma-separated list,
and `line_range` covers the physical source line without LF/CRLF.
Neither range is a new writable source target or a TeX expansion result.
All existing N2 import/disconnect planners and the five independent capability
dimensions retain their current contracts.

Only direct declarations after a recognized `\documentclass` and within a
trusted literal preamble prefix receive source sites. A line in a conditional,
macro-generated or opaque segment has **no fabricated site**. Positive sites
before a later opaque command remain available, whereas missing requirements
remain UNKNOWN. Even when there is a site, an uncertain preamble is still
ineligible for automatic import/disconnect. Invalid preamble ordering (a
`\usepackage` before `\documentclass`) is UNKNOWN, not project-loaded.

The B inspector may use these read-only ranges to focus/highlight package
evidence, but it must still show explicit diffs and obtain consent before
applying N2 `SourcePatch`. No automatic package download, engine change,
source rewrite or GUI implementation is implied. D/E/F remain responsible
for independent compiled fixtures/help/source-integrity tests respectively.
