//! C/N2 reversible *disconnection* of selected literal TikZ libraries.
//!
//! No TeX macro expansion or package removal is attempted. We only remove one
//! definitely active, directly authored \usetikzlibrary declaration (or one
//! token in its simple comma list). Ambiguity is a refusal, not a source edit.

use crate::{
    primitive_edit::SourceTarget,
    primitives::{Evidence, PrimitiveError, SourcePatch},
    project_imports::{ImportKind, inspect, literal_names, uncommented},
};
use std::ops::Range;

const BEGIN_DOCUMENT: &str = "\\begin{document}";
const SUPPORTED_LIBRARIES: [&str; 4] = ["arrows.meta", "positioning", "calc", "fit"];

/// A proposed, source-visible deletion. B owns confirmation and Undo UI.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DisconnectPlan {
    pub patch: SourcePatch,
    pub anchor: Range<usize>,
    pub requested_library: String,
    /// Other library names retained on a shared literal declaration line.
    pub remaining_on_line: Vec<String>,
}

impl DisconnectPlan {
    /// Recheck the begin-document anchor and existing SourcePatch revision/bytes.
    /// Returns an inverse SourcePatch to be recorded by the document's Undo stack.
    pub fn apply(
        &self,
        source: &mut String,
        revision: &mut u64,
    ) -> Result<SourcePatch, PrimitiveError> {
        if source.get(self.anchor.clone()) != Some(BEGIN_DOCUMENT) {
            return Err(PrimitiveError::SourceConflict);
        }
        self.patch.apply(source, revision)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DisconnectDecision {
    AlreadyAbsent,
    Proposed(DisconnectPlan),
    Refused { reason: &'static str },
}

struct Candidate {
    range: Range<usize>,
    remaining_on_line: Vec<String>,
}

/// Produce precisely one deletion inside a *complete* literal physical line.
/// Offsets and ranges count UTF-8 bytes, matching the shared SourcePatch API.
fn candidate_for_line(
    raw: &str,
    offset: usize,
    requested: &str,
) -> Result<Option<Candidate>, &'static str> {
    let line = raw.trim_end_matches(['\r', '\n']);
    let active = uncommented(line);
    let Some(names) = literal_names(active.trim(), "\\usetikzlibrary", false) else {
        return Ok(None);
    };
    if !names.iter().any(|item| item == requested) {
        return Ok(None);
    }
    // Never remove a note belonging to this declaration or move its comment.
    if active.len() != line.len() {
        return Err("library declaration has an inline comment; edit source manually");
    }

    let open = line
        .find('{')
        .ok_or("library declaration has no safe literal brace span")?;
    let close = line[open + 1..]
        .find('}')
        .map(|index| index + open + 1)
        .ok_or("library declaration has no safe closing brace")?;

    let mut entries: Vec<(String, Range<usize>)> = Vec::new();
    let mut cursor = open + 1;
    for field in line[open + 1..close].split(',') {
        let literal = field.trim();
        let leading = field.len() - field.trim_start().len();
        let start = cursor + leading;
        entries.push((literal.to_owned(), start..start + literal.len()));
        cursor += field.len() + 1;
    }
    if entries.iter().map(|(s, _)| s).ne(names.iter()) {
        return Err("library list differs from the inspected literal declaration");
    }
    let hits: Vec<usize> = entries
        .iter()
        .enumerate()
        .filter_map(|(index, (name, _))| (name == requested).then_some(index))
        .collect();
    if hits.len() != 1 {
        return Err("duplicate library names require a manual source edit");
    }
    let index = hits[0];
    let range = if entries.len() == 1 {
        // Entire declaration-only physical line: remove its own line ending.
        offset..offset + raw.len()
    } else if index == 0 {
        // Delete first token and its following comma and spaces.
        offset + open + 1..offset + entries[1].1.start
    } else {
        // Delete preceding comma/spaces plus just this token.
        offset + entries[index - 1].1.end..offset + entries[index].1.end
    };
    Ok(Some(Candidate {
        range,
        remaining_on_line: entries
            .into_iter()
            .filter_map(|(name, _)| (name != requested).then_some(name))
            .collect(),
    }))
}

/// Plan one literal, revision-checked library disconnect without mutation.
///
/// A documented library used through macros/conditionals, repeated across
/// declarations, or carrying a same-line comment is intentionally refused.
/// This is not TeX package uninstallation. No source rewrite or compilation.
#[must_use]
pub fn plan_library_disconnect(
    source: &str,
    target: SourceTarget,
    name: &str,
) -> DisconnectDecision {
    if !SUPPORTED_LIBRARIES.contains(&name) {
        return DisconnectDecision::Refused {
            reason: "library has no N2 disconnect adapter; use source",
        };
    }
    let project = inspect(source);
    if let Some(reason) = project.uncertain_reason {
        return DisconnectDecision::Refused { reason };
    }
    if Some(&target.range) != project.begin_document.as_ref() {
        return DisconnectDecision::Refused {
            reason: "source anchor range differs from the inspected preamble",
        };
    }
    match project.status(ImportKind::TikzLibrary, name) {
        Evidence::Absent => return DisconnectDecision::AlreadyAbsent,
        Evidence::Unknown => {
            return DisconnectDecision::Refused {
                reason: "cannot prove whether the library is loaded",
            };
        }
        Evidence::Confirmed => {}
    }

    let mut candidate = None;
    let mut offset = 0usize;
    // The source slice stops at the byte offset of the confirmed begin anchor.
    // A trailing indent from that line has no declaration and is not edited.
    for raw in source[..target.range.start].split_inclusive('\n') {
        match candidate_for_line(raw, offset, name) {
            Ok(Some(found)) if candidate.is_none() => candidate = Some(found),
            Ok(Some(_)) => {
                return DisconnectDecision::Refused {
                    reason: "multiple declarations load this library; edit source manually",
                };
            }
            Err(reason) => return DisconnectDecision::Refused { reason },
            Ok(None) => {}
        }
        offset += raw.len();
    }
    let Some(candidate) = candidate else {
        return DisconnectDecision::Refused {
            reason: "loaded library has no safely removable literal declaration",
        };
    };
    let Some(expected_old) = source.get(candidate.range.clone()) else {
        return DisconnectDecision::Refused {
            reason: "source byte range is not a valid UTF-8 boundary",
        };
    };
    DisconnectDecision::Proposed(DisconnectPlan {
        patch: SourcePatch {
            range: candidate.range,
            expected_old: expected_old.to_owned(),
            replacement: String::new(),
            source_revision: target.revision,
        },
        anchor: target.range,
        requested_library: name.to_owned(),
        remaining_on_line: candidate.remaining_on_line,
    })
}
