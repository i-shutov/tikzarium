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
