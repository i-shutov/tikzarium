//! Revision-checked, source-preserving edits for previously generated TikZ commands.
//!
//! No TeX parsing is attempted. A caller must supply the current literal values
//! and the exact byte span of a command that it previously generated. If either
//! has drifted (including user edits), editing fails closed to the source editor.
use crate::primitives::{Catalog, PrimitiveError, SourcePatch};
use std::{collections::BTreeMap, ops::Range};

/// Caller-confirmed source command span and monotone revision belong together.
/// The caller-verified byte span and monotone revision are one source snapshot.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceTarget {
    pub range: Range<usize>,
    pub revision: u64,
}

impl SourceTarget {
    pub fn new(range: Range<usize>, revision: u64) -> Self {
        Self { range, revision }
    }
}

/// Plan one property change without modifying the source.
///
/// The full document, unknown user macros, comments, and adjacent commands are
/// never regenerated. The returned patch changes only the shortest differing
/// UTF-8 span inside an exactly matched, generated command. The caller applies
/// this patch through SourcePatch::apply with the authoritative revision.
pub fn plan_parameter_edit(
    catalog: &Catalog,
    tool_id: &str,
    current_values: &BTreeMap<String, String>,
    parameter_id: &str,
    new_value: &str,
    source: &str,
    target: SourceTarget,
) -> Result<SourcePatch, PrimitiveError> {
    let SourceTarget {
        range: command_range,
        revision: source_revision,
    } = target;
    let tool = catalog
        .tool(tool_id)
        .ok_or_else(|| PrimitiveError::UnknownTool(tool_id.to_owned()))?;
    if !tool.parameter.iter().any(|p| p.id == parameter_id) {
        return Err(PrimitiveError::UnknownParameter(parameter_id.to_owned()));
    }

    // Both snapshots use the same validated, versioned native TikZ generator.
    let before = catalog.generate(tool_id, current_values)?;
    if source.get(command_range.clone()) != Some(before.source.as_str()) {
        return Err(PrimitiveError::SourceConflict);
    }
    let mut updated = current_values.clone();
    updated.insert(parameter_id.to_owned(), new_value.to_owned());
    let after = catalog.generate(tool_id, &updated)?;
    if before.source == after.source {
        return Err(PrimitiveError::SourceConflict);
    }

    // UTF-8 character boundaries are critical for Cyrillic node contents.
    let prefix: usize = before
        .source
        .chars()
        .zip(after.source.chars())
        .take_while(|(old, new)| old == new)
        .map(|(ch, _)| ch.len_utf8())
        .sum();
    let mut old_end = before.source.len();
    let mut new_end = after.source.len();
    while old_end > prefix && new_end > prefix {
        let old = before.source[..old_end]
            .chars()
            .next_back()
            .expect("nonempty UTF-8 suffix");
        let new = after.source[..new_end]
            .chars()
            .next_back()
            .expect("nonempty UTF-8 suffix");
        if old != new {
            break;
        }
        old_end -= old.len_utf8();
        new_end -= new.len_utf8();
    }

    let start = command_range
        .start
        .checked_add(prefix)
        .ok_or(PrimitiveError::SourceConflict)?;
    let end = command_range
        .start
        .checked_add(old_end)
        .ok_or(PrimitiveError::SourceConflict)?;
    if source.get(start..end) != Some(&before.source[prefix..old_end]) {
        return Err(PrimitiveError::SourceConflict);
    }
    Ok(SourcePatch {
        range: start..end,
        expected_old: before.source[prefix..old_end].to_owned(),
        replacement: after.source[prefix..new_end].to_owned(),
        source_revision,
    })
}
