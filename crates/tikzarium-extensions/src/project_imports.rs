//! N2 targeted literal preamble imports for source-first TikZ authoring.
//!
//! This is deliberately NOT a TeX parser: macros, conditionals, indirect imports,
//! mixed line endings and opaque preambles produce UNKNOWN and refuse automatic edits.
//! A proposed insertion is a visible source diff, never an installation operation.

use crate::{
    primitive_edit::SourceTarget,
    primitives::{Capabilities, Catalog, Evidence, PrimitiveError, SourcePatch},
};
use std::{collections::BTreeSet, ops::Range};

const BEGIN_DOCUMENT: &str = "\\begin{document}";
const SUPPORTED_LIBRARIES: [&str; 4] = ["arrows.meta", "positioning", "calc", "fit"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImportKind {
    Package,
    TikzLibrary,
}

/// Facts from the current source buffer only. No kpsewhich or package installation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectImports {
    packages: BTreeSet<String>,
    libraries: BTreeSet<String>,
    pub uncertain_reason: Option<&'static str>,
    pub begin_document: Option<Range<usize>>,
    pub class_declared: bool,
    pub newline: &'static str,
    insertion_offset: Option<usize>,
}

impl ProjectImports {
    /// Confirmed means an unambiguous literal preamble declaration, NOT installed.
    /// Absent means no such declaration in a safely recognized preamble.
    /// UNKNOWN is mandatory for macro/conditional/indirect or malformed imports.
    pub fn status(&self, kind: ImportKind, name: &str) -> Evidence {
        if self.uncertain_reason.is_some()
            || !self.class_declared
            || self.begin_document.is_none()
        {
            return Evidence::Unknown;
        }
        let names = match kind {
            ImportKind::Package => &self.packages,
            ImportKind::TikzLibrary => &self.libraries,
        };
        if names.contains(name) {
            Evidence::Confirmed
        } else {
            Evidence::Absent
        }
    }

    pub fn begin_document_target(&self, revision: u64) -> Option<SourceTarget> {
        if self.uncertain_reason.is_none() && self.class_declared {
            self.begin_document
                .clone()
                .map(|range| SourceTarget::new(range, revision))
        } else {
            None
        }
    }
}

fn first_reason(slot: &mut Option<&'static str>, reason: &'static str) {
    if slot.is_none() {
        *slot = Some(reason);
    }
}

fn uncommented(line: &str) -> &str {
    let mut slashes = 0usize;
    for (index, ch) in line.char_indices() {
        if ch == '%' && slashes % 2 == 0 {
            return &line[..index];
        }
        if ch == '\\' {
            slashes += 1;
        } else {
            slashes = 0;
        }
    }
    line
}

fn literal_names(line: &str, command: &str, options_allowed: bool) -> Option<Vec<String>> {
    let rest = line.strip_prefix(command)?;
    if !rest
        .chars()
        .next()
        .is_some_and(|c| c == '{' || c == '[' || c == ' ' || c == '\t')
    {
        return None;
    }
    let mut rest = rest.trim_start();
    if rest.starts_with('[') {
        if !options_allowed {
            return None;
        }
        let end = rest.find(']')?;
        let options = &rest[1..end];
        if !options.bytes().all(|b| {
            b.is_ascii_alphanumeric() || b" .,=_:-/".contains(&b)
        }) {
            return None;
        }
        rest = rest[end + 1..].trim_start();
    }
    let body = rest.strip_prefix('{')?;
    let end = body.find('}')?;
    if !body[end + 1..].trim().is_empty() {
        return None;
    }
    let names: Vec<String> = body[..end]
        .split(',')
        .map(str::trim)
        .map(str::to_owned)
        .collect();
    if names.is_empty()
        || names.iter().any(|n| {
            n.is_empty()
                || !n
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"._-/".contains(&b))
                || n.starts_with('.')
                || n.contains("..")
                || n.contains('/')
        })
    {
        return None;
    }
    Some(names)
}

/// Recognize only complete, literal preamble lines. Never expand arbitrary macros.
/// Text after begin(document) is left entirely opaque to this scanner.
#[must_use]
pub fn inspect(source: &str) -> ProjectImports {
    let has_crlf = source.contains("\r\n");
    let remainder = source.replace("\r\n", "");
    let mixed = remainder.contains('\r') || (has_crlf && remainder.contains('\n'));
    let mut result = ProjectImports {
        packages: BTreeSet::new(),
        libraries: BTreeSet::new(),
        uncertain_reason: None,
        begin_document: None,
        class_declared: false,
        newline: if has_crlf { "\r\n" } else { "\n" },
        insertion_offset: None,
    };
    if mixed {
        first_reason(
            &mut result.uncertain_reason,
            "mixed or unsupported line endings",
        );
    }
    let mut offset = 0usize;
    for raw in source.split_inclusive('\n') {
        if result.begin_document.is_some() {
            break;
        }
        let line = raw.trim_end_matches(|c| c == '\r' || c == '\n');
        let active = uncommented(line);
        let active = if offset == 0 {
            active.strip_prefix('\u{feff}').unwrap_or(active)
        } else {
            active
        };
        let trimmed = active.trim();
        if trimmed.is_empty() {
            offset += raw.len();
            continue;
        }
        if trimmed == BEGIN_DOCUMENT {
            let local = line.find(BEGIN_DOCUMENT).expect("literal begin token");
            let start = offset + local;
            result.begin_document = Some(start..start + BEGIN_DOCUMENT.len());
            result.insertion_offset = Some(offset);
            break;
        }
        if trimmed.starts_with(BEGIN_DOCUMENT) {
            first_reason(
                &mut result.uncertain_reason,
                "begin-document line is not a standalone literal",
            );
        } else if trimmed.starts_with("\\documentclass") {
            match literal_names(trimmed, "\\documentclass", true) {
                Some(names) if names.len() == 1 && !result.class_declared => {
                    result.class_declared = true;
                }
                _ => first_reason(
                    &mut result.uncertain_reason,
                    "opaque or duplicate documentclass declaration",
                ),
            }
        } else if trimmed.starts_with("\\pagestyle")
            && literal_names(trimmed, "\\pagestyle", false).is_some()
        {
            // A literal page-style setting cannot inject package imports.
        } else if trimmed.starts_with("\\usepackage") {
            match literal_names(trimmed, "\\usepackage", true) {
                Some(names) => result.packages.extend(names),
                None => first_reason(
                    &mut result.uncertain_reason,
                    "opaque usepackage declaration",
                ),
            }
        } else if trimmed.starts_with("\\usetikzlibrary") {
            match literal_names(trimmed, "\\usetikzlibrary", false) {
                Some(names) => {
                    if !result.packages.contains("tikz") {
                        first_reason(
                            &mut result.uncertain_reason,
                            "usetikzlibrary precedes explicit tikz package",
                        );
                    }
                    result.libraries.extend(names);
                }
                None => first_reason(
                    &mut result.uncertain_reason,
                    "opaque usetikzlibrary declaration",
                ),
            }
        } else {
            // An unknown preamble macro can hide imports or alter their meaning.
            // Fail closed instead of making an unfounded NOT_LOADED assertion.
            first_reason(
                &mut result.uncertain_reason,
                "opaque preamble command or conditional",
            );
        }
        offset += raw.len();
    }
    if result.begin_document.is_none() {
        first_reason(
            &mut result.uncertain_reason,
            "no unambiguous begin-document preamble anchor",
        );
    }
    if !result.class_declared {
        first_reason(
            &mut result.uncertain_reason,
            "no unambiguous documentclass declaration",
        );
    }
    result
}

/// Merge project import evidence with the four other independent capabilities.
/// No GUI visual editability is inferred from a package or a successful PDF.
pub fn capabilities_for_tool(
    catalog: &Catalog,
    tool_id: &str,
    project: &ProjectImports,
    installed: Evidence,
    engine: Option<&str>,
) -> Result<Capabilities, PrimitiveError> {
    let tool = catalog
        .tool(tool_id)
        .ok_or_else(|| PrimitiveError::UnknownTool(tool_id.to_owned()))?;
    let mut states = Vec::new();
    for package in &tool.requirements.packages {
        states.push(project.status(ImportKind::Package, package));
    }
    for library in &tool.requirements.libraries {
        states.push(project.status(ImportKind::TikzLibrary, library));
    }
    let loaded = if states.iter().all(|s| *s == Evidence::Confirmed) {
        Evidence::Confirmed
    } else if states.contains(&Evidence::Unknown) {
        Evidence::Unknown
    } else {
        Evidence::Absent
    };
    catalog.capabilities(tool_id, installed, loaded, engine)
}

/// An explicit source proposal; B must show the diff and request the user action.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportPlan {
    pub patch: SourcePatch,
    pub anchor: Range<usize>,
    pub expected_anchor: &'static str,
    pub declarations: Vec<String>,
}

impl ImportPlan {
    /// The anchor must still be the exact begin-document token at the same
    /// source byte range. The underlying patch checks revision and old bytes.
    pub fn apply(
        &self,
        source: &mut String,
        revision: &mut u64,
    ) -> Result<SourcePatch, PrimitiveError> {
        if source.get(self.anchor.clone()) != Some(self.expected_anchor) {
            return Err(PrimitiveError::SourceConflict);
        }
        self.patch.apply(source, revision)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ImportDecision {
    AlreadyLoaded,
    Proposed(ImportPlan),
    Refused { reason: &'static str },
}

/// A no-write planner. Supported automatic additions: tikz package and four
/// well-known TikZ libraries. All other valid packages remain usable via raw TeX.
#[must_use]
pub fn plan_import(
    source: &str,
    target: SourceTarget,
    kind: ImportKind,
    name: &str,
) -> ImportDecision {
    match kind {
        ImportKind::Package if name != "tikz" => {
            return ImportDecision::Refused {
                reason: "only the tikz package has an N2 automatic source adapter",
            };
        }
        ImportKind::TikzLibrary if !SUPPORTED_LIBRARIES.contains(&name) => {
            return ImportDecision::Refused {
                reason: "library has no N2 literal import adapter; use source",
            };
        }
        _ => {}
    }
    let project = inspect(source);
    if let Some(reason) = project.uncertain_reason {
        return ImportDecision::Refused { reason };
    }
    let declaration_exists = project.status(kind, name) == Evidence::Confirmed;
    let tikz_missing = kind == ImportKind::TikzLibrary
        && project.status(ImportKind::Package, "tikz") == Evidence::Absent;
    if declaration_exists && !tikz_missing {
        return ImportDecision::AlreadyLoaded;
    }
    if Some(&target.range) != project.begin_document.as_ref() {
        return ImportDecision::Refused {
            reason: "source anchor range differs from the inspected preamble",
        };
    }
    let mut declarations = Vec::new();
    if kind == ImportKind::TikzLibrary {
        match project.status(ImportKind::Package, "tikz") {
            Evidence::Absent => declarations.push("\\usepackage{tikz}".to_owned()),
            Evidence::Unknown => {
                return ImportDecision::Refused {
                    reason: "cannot establish whether tikz package is loaded",
                };
            }
            Evidence::Confirmed => {}
        }
        if !declaration_exists {
            declarations.push(format!("\\usetikzlibrary{{{name}}}"));
        }
    } else {
        declarations.push("\\usepackage{tikz}".to_owned());
    }
    let mut replacement = declarations.join(project.newline);
    replacement.push_str(project.newline);
    let insertion = project.insertion_offset.expect("known preamble insertion");
    ImportDecision::Proposed(ImportPlan {
        patch: SourcePatch {
            range: insertion..insertion,
            expected_old: String::new(),
            replacement,
            source_revision: target.revision,
        },
        anchor: target.range,
        expected_anchor: BEGIN_DOCUMENT,
        declarations,
    })
}
