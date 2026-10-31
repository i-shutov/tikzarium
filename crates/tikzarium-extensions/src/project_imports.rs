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

/// Byte-accurate attribution for one directly authored, trusted literal import.
/// The name_range highlights only the package/library name (not the command).
/// line_range covers the physical line without its LF/CRLF terminator.
/// It is read-only evidence, never an authorization for an arbitrary source edit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeclarationSite {
    pub kind: ImportKind,
    pub name: String,
    pub name_range: Range<usize>,
    pub line_range: Range<usize>,
}

/// Facts from the current source buffer only. No kpsewhich or package installation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectImports {
    packages: BTreeSet<String>,
    libraries: BTreeSet<String>,
    declaration_sites: Vec<DeclarationSite>,
    pub uncertain_reason: Option<&'static str>,
    pub begin_document: Option<Range<usize>>,
    pub class_declared: bool,
    pub newline: &'static str,
    insertion_offset: Option<usize>,
}

impl ProjectImports {
    /// Confirmed means a direct literal declaration in a trusted preamble
    /// prefix, NOT installation or a TeX execution result. Unknown commands
    /// *after* that declaration cannot erase the textual positive evidence.
    /// Absent requires a fully recognized preamble; opaque macros or imports
    /// encountered earlier prevent later declarations being called confirmed.
    pub fn status(&self, kind: ImportKind, name: &str) -> Evidence {
        if !self.class_declared || self.begin_document.is_none() {
            return Evidence::Unknown;
        }
        let names = match kind {
            ImportKind::Package => &self.packages,
            ImportKind::TikzLibrary => &self.libraries,
        };
        if names.contains(name) {
            Evidence::Confirmed
        } else if self.uncertain_reason.is_some() {
            Evidence::Unknown
        } else {
            Evidence::Absent
        }
    }

    /// Return source sites only for declarations confirmed in the trusted
    /// literal prefix. Missing, macro-derived and conditional imports have no
    /// fabricated source site; consult status() separately for UNKNOWN/Absent.
    /// Ranges use UTF-8 bytes in the source passed to inspect().
    #[must_use]
    pub fn declaration_sites(&self, kind: ImportKind, name: &str) -> Vec<DeclarationSite> {
        self.declaration_sites
            .iter()
            .filter(|site| site.kind == kind && site.name == name)
            .cloned()
            .collect()
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

pub(crate) fn uncommented(line: &str) -> &str {
    let mut slashes = 0usize;
    for (index, ch) in line.char_indices() {
        if ch == '%' && slashes.is_multiple_of(2) {
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

pub(crate) fn literal_names(
    line: &str,
    command: &str,
    options_allowed: bool,
) -> Option<Vec<String>> {
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
        if !options
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b" .,=_:-/".contains(&b))
        {
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

/// Obtain the exact UTF-8 token spans after validation by the existing,
/// deliberately narrow literal recognizer. Package options cannot contain
/// braces, so the first opening brace belongs to the name list.
fn literal_name_spans(
    line: &str,
    command: &str,
    options_allowed: bool,
) -> Option<Vec<(String, Range<usize>)>> {
    let names = literal_names(line, command, options_allowed)?;
    let opening = line.find('{')?;
    let body = &line[opening + 1..];
    let closing = body.find('}')?;
    let mut positions = Vec::new();
    let mut cursor = opening + 1;
    for field in body[..closing].split(',') {
        let name = field.trim();
        let leading = field.len() - field.trim_start().len();
        let start = cursor + leading;
        positions.push((name.to_owned(), start..start + name.len()));
        cursor += field.len() + 1;
    }
    if positions.len() != names.len()
        || positions
            .iter()
            .zip(&names)
            .any(|((observed, _), validated)| observed != validated)
    {
        return None;
    }
    Some(positions)
}

fn record_literal_sites(
    result: &mut ProjectImports,
    kind: ImportKind,
    trimmed: &str,
    command: &str,
    options_allowed: bool,
    line_start: usize,
    line_len: usize,
    token_start: usize,
) {
    if let Some(spans) = literal_name_spans(trimmed, command, options_allowed) {
        for (name, local) in spans {
            result.declaration_sites.push(DeclarationSite {
                kind,
                name,
                name_range: token_start + local.start..token_start + local.end,
                line_range: line_start..line_start + line_len,
            });
        }
    }
}

/// Only flat, literal fontspec/unicode-math font choices are import-neutral.
/// Options, TeX commands, nested braces and other opaque forms remain UNKNOWN.
/// This does not test font installation or override the XeLaTeX compiler.
fn literal_flat_font_assignment(line: &str, command: &str) -> bool {
    let Some(rest) = line.strip_prefix(command) else {
        return false;
    };
    let Some(font) = rest
        .trim_start()
        .strip_prefix('{')
        .and_then(|content| content.strip_suffix('}'))
    else {
        return false;
    };
    !font.trim().is_empty()
        && font
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b" ._+-".contains(&b))
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
        declaration_sites: Vec::new(),
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
    // Any opaque/conditional command before an import can hide its meaning.
    // Keep direct literal declarations observed *before* uncertainty, but
    // never report a later declaration as loaded through guessed control flow.
    let mut literal_prefix_trusted = true;
    for raw in source.split_inclusive('\n') {
        if result.begin_document.is_some() {
            break;
        }
        let line = raw.trim_end_matches(['\r', '\n']);
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
        let token_start = offset + line.find(trimmed).expect("trimmed literal is in source line");
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
            literal_prefix_trusted = false;
        } else if trimmed.starts_with("\\documentclass") {
            match literal_names(trimmed, "\\documentclass", true) {
                Some(names)
                    if names.len() == 1 && !result.class_declared && literal_prefix_trusted =>
                {
                    result.class_declared = true;
                }
                _ => {
                    first_reason(
                        &mut result.uncertain_reason,
                        "opaque or duplicate documentclass declaration",
                    );
                    literal_prefix_trusted = false;
                }
            }
        } else if trimmed.starts_with("\\pagestyle")
            && literal_names(trimmed, "\\pagestyle", false).is_some()
        {
            // A literal page-style setting cannot inject package imports.
        } else if literal_flat_font_assignment(trimmed, "\\setmainfont")
            || literal_flat_font_assignment(trimmed, "\\setmathfont")
        {
            // These exact forms only select fonts; they do not import TikZ.
        } else if trimmed.starts_with("\\usepackage") {
            match literal_names(trimmed, "\\usepackage", true) {
                Some(names) if literal_prefix_trusted && result.class_declared => {
                    result.packages.extend(names);
                    record_literal_sites(
                        &mut result,
                        ImportKind::Package,
                        trimmed,
                        "\\usepackage",
                        true,
                        offset,
                        line.len(),
                        token_start,
                    );
                }
                Some(_) if !result.class_declared => {
                    first_reason(
                        &mut result.uncertain_reason,
                        "package declaration precedes documentclass",
                    );
                    literal_prefix_trusted = false;
                }
                Some(_) => {}
                None => {
                    first_reason(
                        &mut result.uncertain_reason,
                        "opaque usepackage declaration",
                    );
                    literal_prefix_trusted = false;
                }
            }
        } else if trimmed.starts_with("\\usetikzlibrary") {
            match literal_names(trimmed, "\\usetikzlibrary", false) {
                Some(names) => {
                    if !result.class_declared {
                        first_reason(
                            &mut result.uncertain_reason,
                            "TikZ library declaration precedes documentclass",
                        );
                        literal_prefix_trusted = false;
                    }
                    if !result.packages.contains("tikz") {
                        first_reason(
                            &mut result.uncertain_reason,
                            "usetikzlibrary precedes explicit tikz package",
                        );
                        literal_prefix_trusted = false;
                    }
                    if literal_prefix_trusted {
                        result.libraries.extend(names);
                        record_literal_sites(
                            &mut result,
                            ImportKind::TikzLibrary,
                            trimmed,
                            "\\usetikzlibrary",
                            false,
                            offset,
                            line.len(),
                            token_start,
                        );
                    }
                }
                None => {
                    first_reason(
                        &mut result.uncertain_reason,
                        "opaque usetikzlibrary declaration",
                    );
                    literal_prefix_trusted = false;
                }
            }
        } else {
            // An unknown preamble macro can hide imports or alter their meaning.
            // Fail closed instead of making an unfounded NOT_LOADED assertion.
            first_reason(
                &mut result.uncertain_reason,
                "opaque preamble command or conditional",
            );
            literal_prefix_trusted = false;
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
