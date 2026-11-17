//! Bounded, read-only source references to external scientific resources.
//!
//! References are lexical observations only: this module does not resolve
//! paths, inspect files, expand macros, execute TeX, or establish `.fls` input.

use crate::scientific_scan::{
    MAX_SCIENTIFIC_SOURCE_BYTES, RecognizedInstance, ScientificKind, SourceView,
    scan_scientific_source,
};
use sha2::{Digest, Sha256};
use std::ops::Range;
use thiserror::Error;

pub const MAX_SCIENTIFIC_RESOURCE_REFERENCES: usize = 512;
const MAX_GROUP_DEPTH: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScientificResourceKind {
    TikzPlotFile,
    TexInput,
    TexInclude,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScientificResourceStatus {
    UnresolvedLiteral,
    MacroContaining,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScientificResourceReference {
    pub kind: ScientificResourceKind,
    /// Exact path source bytes, without the outer braces.
    pub path: String,
    pub path_range: Range<usize>,
    pub line: usize,
    pub status: ScientificResourceStatus,
    pub revision: u64,
    pub source_sha256: [u8; 32],
}

#[derive(Debug, Error, Clone, Copy, PartialEq, Eq)]
pub enum ScientificResourceScanRefusal {
    #[error("source exceeds the bounded scientific scanner size")]
    SourceTooLarge,
    #[error("too many lexical scientific resource references")]
    TooManyReferences,
    #[error("malformed or ambiguous external resource syntax")]
    MalformedReference,
    #[error("unbalanced or excessively nested source grouping")]
    UnbalancedSource,
}

#[derive(Clone)]
struct Group {
    inside: Range<usize>,
    next: usize,
}

fn skip_space_comments(bytes: &[u8], mut i: usize) -> usize {
    while i < bytes.len() {
        if bytes[i].is_ascii_whitespace() {
            i += 1;
        } else if bytes[i] == b'%' {
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
        } else {
            break;
        }
    }
    i
}

fn command_at(text: &str, pos: usize) -> (&str, usize) {
    let bytes = text.as_bytes();
    let mut i = pos + 1;
    if i >= bytes.len() {
        return ("", bytes.len());
    }
    if !bytes[i].is_ascii_alphabetic() && bytes[i] != b'@' {
        return ("", (i + 1).min(bytes.len()));
    }
    let start = i;
    while i < bytes.len() && (bytes[i].is_ascii_alphabetic() || bytes[i] == b'@') {
        i += 1;
    }
    (&text[start..i], i)
}

fn group_at(text: &str, pos: usize) -> Result<Option<Group>, ScientificResourceScanRefusal> {
    let bytes = text.as_bytes();
    if bytes.get(pos) != Some(&b'{') {
        return Ok(None);
    }
    let mut depth = 1usize;
    let mut i = pos + 1;
    while i < bytes.len() {
        match bytes[i] {
            b'\\' => i = (i + 2).min(bytes.len()),
            b'%' => {
                while i < bytes.len() && bytes[i] != b'\n' {
                    i += 1;
                }
            }
            b'{' => {
                depth += 1;
                if depth > MAX_GROUP_DEPTH {
                    return Err(ScientificResourceScanRefusal::UnbalancedSource);
                }
                i += 1;
            }
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    return Ok(Some(Group {
                        inside: pos + 1..i,
                        next: i + 1,
                    }));
                }
                i += 1;
            }
            _ => i += 1,
        }
    }
    Err(ScientificResourceScanRefusal::UnbalancedSource)
}

fn required_group(text: &str, pos: usize) -> Result<Group, ScientificResourceScanRefusal> {
    group_at(text, pos)?.ok_or(ScientificResourceScanRefusal::MalformedReference)
}

fn bracket_group(text: &str, pos: usize) -> Result<Option<Group>, ScientificResourceScanRefusal> {
    let bytes = text.as_bytes();
    if bytes.get(pos) != Some(&b'[') {
        return Ok(None);
    }
    let mut stack = vec![b']'];
    let mut i = pos + 1;
    while i < bytes.len() {
        match bytes[i] {
            b'\\' => i = (i + 2).min(bytes.len()),
            b'%' => {
                while i < bytes.len() && bytes[i] != b'\n' {
                    i += 1;
                }
            }
            b'[' => {
                stack.push(b']');
                if stack.len() > MAX_GROUP_DEPTH {
                    return Err(ScientificResourceScanRefusal::UnbalancedSource);
                }
                i += 1;
            }
            b'{' => {
                stack.push(b'}');
                if stack.len() > MAX_GROUP_DEPTH {
                    return Err(ScientificResourceScanRefusal::UnbalancedSource);
                }
                i += 1;
            }
            b']' | b'}' => {
                if stack.pop() != Some(bytes[i]) {
                    return Err(ScientificResourceScanRefusal::UnbalancedSource);
                }
                if stack.is_empty() {
                    return Ok(Some(Group {
                        inside: pos + 1..i,
                        next: i + 1,
                    }));
                }
                i += 1;
            }
            _ => i += 1,
        }
    }
    Err(ScientificResourceScanRefusal::UnbalancedSource)
}

fn definition_end(
    text: &str,
    name: &str,
    after: usize,
) -> Result<Option<usize>, ScientificResourceScanRefusal> {
    let bytes = text.as_bytes();
    let mut i = skip_space_comments(bytes, after);
    match name {
        "def" | "gdef" | "edef" | "xdef" => {
            if bytes.get(i) != Some(&b'\\') {
                return Err(ScientificResourceScanRefusal::MalformedReference);
            }
            let (_, next) = command_at(text, i);
            if next == i + 1 {
                return Err(ScientificResourceScanRefusal::MalformedReference);
            }
            i = next;
            while i < bytes.len() && bytes[i] != b'{' {
                if bytes[i] == b'%' {
                    i = skip_space_comments(bytes, i);
                } else {
                    i += 1;
                }
            }
        }
        "newcommand" | "renewcommand" | "providecommand" | "DeclareRobustCommand" => {
            if bytes.get(i) == Some(&b'*') {
                i = skip_space_comments(bytes, i + 1);
            }
            if bytes.get(i) == Some(&b'{') {
                i = required_group(text, i)?.next;
            } else if bytes.get(i) == Some(&b'\\') {
                i = command_at(text, i).1;
            } else {
                return Err(ScientificResourceScanRefusal::MalformedReference);
            }
            for _ in 0..2 {
                i = skip_space_comments(bytes, i);
                if bytes.get(i) == Some(&b'[') {
                    i = bracket_group(text, i)?
                        .ok_or(ScientificResourceScanRefusal::MalformedReference)?
                        .next;
                }
            }
        }
        "newenvironment" | "renewenvironment" => {
            if bytes.get(i) == Some(&b'*') {
                i += 1;
            }
            i = required_group(text, skip_space_comments(bytes, i))?.next;
            for _ in 0..2 {
                i = skip_space_comments(bytes, i);
                if bytes.get(i) == Some(&b'[') {
                    i = bracket_group(text, i)?
                        .ok_or(ScientificResourceScanRefusal::MalformedReference)?
                        .next;
                }
            }
            i = required_group(text, skip_space_comments(bytes, i))?.next;
            i = required_group(text, skip_space_comments(bytes, i))?.next;
            return Ok(Some(i));
        }
        _ => return Ok(None),
    }
    Ok(Some(required_group(text, i)?.next))
}

fn foreach_end(text: &str, after: usize) -> Result<usize, ScientificResourceScanRefusal> {
    let bytes = text.as_bytes();
    let mut i = skip_space_comments(bytes, after);
    let mut has_token = false;
    while i < bytes.len() {
        if bytes[i] == b'{' {
            let values = required_group(text, i)?;
            if !has_token {
                return Err(ScientificResourceScanRefusal::MalformedReference);
            }
            let body = skip_space_comments(bytes, values.next);
            return Ok(required_group(text, body)?.next);
        }
        if bytes[i] == b'\\' {
            i = (i + 2).min(bytes.len());
        } else if bytes[i] == b'%' {
            i = skip_space_comments(bytes, i);
        } else {
            has_token |= bytes[i].is_ascii_alphabetic();
            i += 1;
        }
    }
    Err(ScientificResourceScanRefusal::MalformedReference)
}

fn inline_literal_end(
    text: &str,
    after: usize,
    listing: bool,
) -> Result<usize, ScientificResourceScanRefusal> {
    let bytes = text.as_bytes();
    let mut i = after;
    if bytes.get(i) == Some(&b'*') {
        i += 1;
    }
    if listing && bytes.get(i) == Some(&b'[') {
        i = bracket_group(text, i)?
            .ok_or(ScientificResourceScanRefusal::MalformedReference)?
            .next;
    }
    let delimiter = *bytes
        .get(i)
        .ok_or(ScientificResourceScanRefusal::MalformedReference)?;
    if matches!(delimiter, b'\r' | b'\n' | b'{' | b'}' | b'[' | b']') {
        return Err(ScientificResourceScanRefusal::MalformedReference);
    }
    i += 1;
    while i < bytes.len() && !matches!(bytes[i], b'\r' | b'\n') {
        if bytes[i] == delimiter {
            return Ok(i + 1);
        }
        i += 1;
    }
    Err(ScientificResourceScanRefusal::MalformedReference)
}

fn environment_group(
    text: &str,
    after: usize,
) -> Result<Option<(String, usize)>, ScientificResourceScanRefusal> {
    let start = skip_space_comments(text.as_bytes(), after);
    let Some(group) = group_at(text, start)? else {
        return Ok(None);
    };
    Ok(Some((
        text[group.inside.clone()].trim().to_owned(),
        group.next,
    )))
}

fn verbatim_end(
    text: &str,
    after: usize,
    env: &str,
) -> Result<usize, ScientificResourceScanRefusal> {
    let body = environment_group(text, after)?
        .ok_or(ScientificResourceScanRefusal::MalformedReference)?
        .1;
    let closing = format!("\\end{{{env}}}");
    let mut search = body;
    while let Some(relative) = text.get(search..).and_then(|rest| rest.find(&closing)) {
        let close = search + relative;
        let line_start = text[..close].rfind('\n').map_or(0, |newline| newline + 1);
        let line_end = text[close..]
            .find('\n')
            .map_or(text.len(), |newline| close + newline);
        let horizontal_space = |bytes: &[u8]| {
            bytes
                .iter()
                .all(|byte| byte.is_ascii_whitespace() && !matches!(byte, b'\n'))
        };
        if horizontal_space(&text.as_bytes()[line_start..close])
            && horizontal_space(&text.as_bytes()[close + closing.len()..line_end])
        {
            return Ok(close + closing.len());
        }
        search = close + 1;
    }
    Err(ScientificResourceScanRefusal::UnbalancedSource)
}

fn literal_regions(text: &str) -> Result<Vec<Range<usize>>, ScientificResourceScanRefusal> {
    let bytes = text.as_bytes();
    let mut result = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }
        if bytes[i] != b'\\' {
            i += 1;
            continue;
        }
        let start = i;
        let (name, after) = command_at(text, i);
        if name.is_empty() {
            i = after;
            continue;
        }
        if matches!(name, "newenvironment" | "renewenvironment") {
            let end = definition_end(text, name, after)?
                .ok_or(ScientificResourceScanRefusal::MalformedReference)?;
            result.push(start..end);
            i = end;
            continue;
        }
        if let Some(end) = definition_end(text, name, after)? {
            i = end;
            continue;
        }
        if name == "foreach" {
            i = foreach_end(text, after)?;
            continue;
        }
        if name == "string" {
            let token_start = skip_space_comments(bytes, after);
            let token_end = if bytes.get(token_start) == Some(&b'\\') {
                command_at(text, token_start).1
            } else {
                let tail = text
                    .get(token_start..)
                    .ok_or(ScientificResourceScanRefusal::MalformedReference)?;
                token_start
                    + tail
                        .chars()
                        .next()
                        .ok_or(ScientificResourceScanRefusal::MalformedReference)?
                        .len_utf8()
            };
            if token_end <= token_start || token_end > bytes.len() {
                return Err(ScientificResourceScanRefusal::MalformedReference);
            }
            result.push(start..token_end);
            i = token_end;
            continue;
        }
        if name == "detokenize" {
            let group = required_group(text, skip_space_comments(bytes, after))?;
            result.push(start..group.next);
            i = group.next;
            continue;
        }
        if name == "verb" || name == "lstinline" {
            i = inline_literal_end(text, after, name == "lstinline")?;
            result.push(start..i);
            continue;
        }
        if name == "begin"
            && let Some((env, _)) = environment_group(text, after)?
            && matches!(
                env.as_str(),
                "verbatim" | "Verbatim" | "lstlisting" | "minted"
            )
        {
            i = verbatim_end(text, after, &env)?;
            result.push(start..i);
            continue;
        }
        i = after;
    }
    Ok(result)
}

fn scope_mask_regions(
    text: &str,
    literals: &[Range<usize>],
) -> Result<Vec<Range<usize>>, ScientificResourceScanRefusal> {
    let bytes = text.as_bytes();
    let mut ranges = literals.to_vec();
    let mut region = 0;
    let mut i = 0;
    while i < bytes.len() {
        while literals.get(region).is_some_and(|r| r.end <= i) {
            region += 1;
        }
        if let Some(r) = literals.get(region)
            && r.start <= i
            && i < r.end
        {
            i = r.end;
            region += 1;
            continue;
        }
        if bytes[i] == b'%' {
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }
        if bytes[i] != b'\\' {
            i += 1;
            continue;
        }
        let (name, after) = command_at(text, i);
        if let Some(end) = definition_end(text, name, after)? {
            i = end;
            continue;
        }
        if name == "foreach" {
            i = foreach_end(text, after)?;
            continue;
        }
        if matches!(name, "input" | "include") {
            let group = required_group(text, skip_space_comments(bytes, after))?;
            ranges.push(i..group.next);
            i = group.next;
        } else {
            i = after;
        }
    }
    ranges.sort_by_key(|r| r.start);
    Ok(ranges)
}

fn masked_source(
    text: &str,
    ranges: &[Range<usize>],
) -> Result<String, ScientificResourceScanRefusal> {
    let mut bytes = text.as_bytes().to_vec();
    for range in ranges {
        for b in &mut bytes[range.clone()] {
            if !matches!(*b, b'\r' | b'\n') {
                *b = b' ';
            }
        }
    }
    String::from_utf8(bytes).map_err(|_| ScientificResourceScanRefusal::UnbalancedSource)
}

fn skip_quoted(
    text: &str,
    start: usize,
    limit: usize,
) -> Result<usize, ScientificResourceScanRefusal> {
    let bytes = text.as_bytes();
    let mut i = start + 1;
    while i < limit {
        match bytes[i] {
            b'\\' => i = (i + 2).min(limit),
            b'"' => return Ok(i + 1),
            b'\r' | b'\n' => return Err(ScientificResourceScanRefusal::MalformedReference),
            _ => i += 1,
        }
    }
    Err(ScientificResourceScanRefusal::MalformedReference)
}

fn word_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric() || matches!(b, b'_' | b'@')
}

fn plot_group_at(
    text: &str,
    start: usize,
    limit: usize,
) -> Result<Option<Group>, ScientificResourceScanRefusal> {
    let bytes = text.as_bytes();
    if !bytes[start..limit].starts_with(b"plot")
        || (start > 0 && word_byte(bytes[start - 1]))
        || bytes.get(start + 4).is_some_and(|b| word_byte(*b))
    {
        return Ok(None);
    }
    let file = skip_space_comments(bytes, start + 4);
    if file >= limit
        || !bytes[file..limit].starts_with(b"file")
        || bytes.get(file + 4).is_some_and(|b| word_byte(*b))
    {
        return Ok(None);
    }
    let brace = skip_space_comments(bytes, file + 4);
    if brace >= limit {
        return Err(ScientificResourceScanRefusal::MalformedReference);
    }
    let group = required_group(text, brace)?;
    if group.next > limit {
        return Err(ScientificResourceScanRefusal::MalformedReference);
    }
    Ok(Some(group))
}

fn line_number(line_starts: &[usize], pos: usize) -> usize {
    line_starts.partition_point(|&start| start <= pos)
}

fn push_reference(
    out: &mut Vec<ScientificResourceReference>,
    text: &str,
    group: &Group,
    kind: ScientificResourceKind,
    view: SourceView<'_>,
    digest: [u8; 32],
    line_starts: &[usize],
) -> Result<(), ScientificResourceScanRefusal> {
    if out.len() >= MAX_SCIENTIFIC_RESOURCE_REFERENCES {
        return Err(ScientificResourceScanRefusal::TooManyReferences);
    }
    let path = &text[group.inside.clone()];
    let status = if path.is_empty()
        || path
            .bytes()
            .any(|b| matches!(b, b'\\' | b'$' | b'#' | b'%' | b'{' | b'}'))
    {
        ScientificResourceStatus::MacroContaining
    } else {
        ScientificResourceStatus::UnresolvedLiteral
    };
    out.push(ScientificResourceReference {
        kind,
        path: path.to_owned(),
        path_range: group.inside.clone(),
        line: line_number(line_starts, group.inside.start),
        status,
        revision: view.revision,
        source_sha256: digest,
    });
    Ok(())
}

fn collect_plot_files(
    text: &str,
    instance: &RecognizedInstance,
    view: SourceView<'_>,
    digest: [u8; 32],
    out: &mut Vec<ScientificResourceReference>,
    line_starts: &[usize],
) -> Result<(), ScientificResourceScanRefusal> {
    let bytes = text.as_bytes();
    let (_, after_command) = command_at(text, instance.range.start);
    let mut i = instance
        .option_range
        .as_ref()
        .map_or(after_command, |r| r.end + 1);
    while i < instance.range.end {
        match bytes[i] {
            b'%' => {
                while i < instance.range.end && bytes[i] != b'\n' {
                    i += 1;
                }
            }
            b'\\' => {
                let (name, next) = command_at(text, i);
                if name == "verb" || name == "lstinline" {
                    i = inline_literal_end(text, next, name == "lstinline")?;
                } else {
                    i = next;
                }
            }
            b'{' => i = required_group(text, i)?.next,
            b'[' => {
                i = bracket_group(text, i)?
                    .ok_or(ScientificResourceScanRefusal::MalformedReference)?
                    .next
            }
            b'"' => i = skip_quoted(text, i, instance.range.end)?,
            _ => {
                if let Some(group) = plot_group_at(text, i, instance.range.end)? {
                    push_reference(
                        out,
                        text,
                        &group,
                        ScientificResourceKind::TikzPlotFile,
                        view,
                        digest,
                        line_starts,
                    )?;
                    i = group.next;
                } else {
                    i += 1;
                }
            }
        }
    }
    Ok(())
}

/// Lexically recognize braced `\input`, `\include`, and active TikZ
/// `plot file` paths. The latter is limited to primary-scanner Draw/Path/Fill/
/// Clip ranges, with nested groups, options, quoted labels, and verbatim text
/// treated as opaque.
pub fn scan_scientific_resources(
    view: SourceView<'_>,
) -> Result<Vec<ScientificResourceReference>, ScientificResourceScanRefusal> {
    let text = view.text;
    let bytes = text.as_bytes();
    if bytes.len() > MAX_SCIENTIFIC_SOURCE_BYTES {
        return Err(ScientificResourceScanRefusal::SourceTooLarge);
    }
    let digest: [u8; 32] = Sha256::digest(bytes).into();
    let literals = literal_regions(text)?;
    let masked = masked_source(text, &scope_mask_regions(text, &literals)?)?;
    let scopes = scan_scientific_source(SourceView {
        text: &masked,
        revision: view.revision,
    })
    .map_err(|_| ScientificResourceScanRefusal::MalformedReference)?;
    let line_starts = std::iter::once(0)
        .chain(
            bytes
                .iter()
                .enumerate()
                .filter_map(|(i, b)| (*b == b'\n').then_some(i + 1)),
        )
        .collect::<Vec<_>>();
    let mut result = Vec::new();

    let plot_commands = scopes
        .iter()
        .filter(|item| {
            matches!(
                item.kind,
                ScientificKind::Draw
                    | ScientificKind::Path
                    | ScientificKind::Fill
                    | ScientificKind::Clip
            )
        })
        .collect::<Vec<_>>();
    for (index, instance) in plot_commands.iter().enumerate() {
        if plot_commands
            .iter()
            .enumerate()
            .any(|(other_index, other)| {
                other_index != index
                    && other.range.start < instance.range.start
                    && other.range.end >= instance.range.end
            })
        {
            continue;
        }
        collect_plot_files(text, instance, view, digest, &mut result, &line_starts)?;
    }

    let mut literal_index = 0;
    let mut i = 0;
    while i < bytes.len() {
        while literals
            .get(literal_index)
            .is_some_and(|region| region.end <= i)
        {
            literal_index += 1;
        }
        if let Some(region) = literals.get(literal_index)
            && region.start <= i
            && i < region.end
        {
            i = region.end;
            literal_index += 1;
            continue;
        }
        if bytes[i] == b'%' {
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }
        if bytes[i] != b'\\' {
            i += 1;
            continue;
        }
        let (name, after) = command_at(text, i);
        if name.is_empty() {
            i = after;
            continue;
        }
        if let Some(end) = definition_end(text, name, after)? {
            i = end;
            continue;
        }
        if name == "foreach" {
            i = foreach_end(text, after)?;
            continue;
        }
        let kind = match name {
            "input" => Some(ScientificResourceKind::TexInput),
            "include" => Some(ScientificResourceKind::TexInclude),
            _ => None,
        };
        if let Some(kind) = kind {
            let group = required_group(text, skip_space_comments(bytes, after))?;
            push_reference(&mut result, text, &group, kind, view, digest, &line_starts)?;
            i = group.next;
        } else {
            i = after;
        }
    }
    result.sort_by_key(|reference| reference.path_range.start);
    Ok(result)
}
