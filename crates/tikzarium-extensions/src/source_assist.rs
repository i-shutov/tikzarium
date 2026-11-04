//! One literal preamble library-name completion backed by the shared C catalogue.
//! No TeX parsing, macro expansion, installation, or implicit preamble insertion.
use crate::primitives::{Catalog, SourcePatch};
use std::ops::Range;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LibraryCaret {
    pub range: Range<usize>,
    pub typed: String,
    pub candidates: Vec<String>,
}

/// Match only the caret immediately before the closing brace on an explicit
/// single-name \usetikzlibrary{...} preamble line. Fail closed otherwise.
#[must_use]
pub fn library_caret(source: &str, caret_chars: usize, catalog: &Catalog) -> Option<LibraryCaret> {
    if [
        r"\catcode",
        r"\begin{verbatim}",
        r"\begin{lstlisting}",
        r"\begin{minted}",
    ]
    .iter()
    .any(|s| source.contains(s))
    {
        return None;
    }
    let byte = source
        .char_indices()
        .nth(caret_chars)
        .map(|(i, _)| i)
        .or_else(|| (caret_chars == source.chars().count()).then_some(source.len()))?;
    let start = source[..byte].rfind('\n').map_or(0, |i| i + 1);
    if source[..start].contains(r"\begin{document}") {
        return None;
    }
    let end = source[byte..].find('\n').map_or(source.len(), |i| byte + i);
    let line = source.get(start..end)?.trim_end_matches('\r');
    let trimmed = line.trim_start_matches([' ', '\t']);
    const OPEN: &str = r"\usetikzlibrary{";
    if !trimmed.starts_with(OPEN) {
        return None;
    }
    let a = start + line.len() - trimmed.len() + OPEN.len();
    let b = a + source.get(a..start + line.len())?.find('}')?;
    let after = source.get(b + 1..start + line.len())?.trim();
    if byte != b || (!after.is_empty() && !after.starts_with('%')) {
        return None;
    }
    let typed = source.get(a..b)?;
    if typed.len() > 32
        || !typed
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'.' || b == b'-')
    {
        return None;
    }
    let mut candidates = catalog
        .libraries
        .iter()
        .filter(|l| l.name.starts_with(typed))
        .map(|l| l.name.clone())
        .collect::<Vec<_>>();
    candidates.sort();
    if candidates.is_empty() {
        return None;
    }
    Some(LibraryCaret {
        range: a..b,
        typed: typed.to_owned(),
        candidates,
    })
}

/// A SourcePatch carries old bytes and revision; egui must not bypass apply().
#[must_use]
pub fn completion_patch(
    source: &str,
    caret_chars: usize,
    name: &str,
    revision: u64,
    catalog: &Catalog,
) -> Option<SourcePatch> {
    let context = library_caret(source, caret_chars, catalog)?;
    if context.typed == name || !context.candidates.iter().any(|c| c == name) {
        return None;
    }
    Some(SourcePatch {
        range: context.range,
        expected_old: context.typed,
        replacement: name.to_owned(),
        source_revision: revision,
    })
}

/// Read-only recognition of literal C-template parameters, not a TeX parser.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParameterCaret {
    pub tool_id: String,
    pub parameter_id: String,
    pub range: Range<usize>,
}

fn literal_template_spans(template: &str, line: &str) -> Option<Vec<(String, Range<usize>)>> {
    const OPEN: &str = concat!("$", "{");
    let mut at_template = 0;
    let mut at_source = 0;
    let mut spans = Vec::new();
    while let Some(relative) = template.get(at_template..)?.find(OPEN) {
        let open = at_template + relative;
        let literal = template.get(at_template..open)?;
        if !line.get(at_source..)?.starts_with(literal) {
            return None;
        }
        at_source += literal.len();
        let key_start = open + OPEN.len();
        let key_end = key_start + template.get(key_start..)?.find('}')?;
        let id = template.get(key_start..key_end)?;
        let next_start = key_end + 1;
        let next = template
            .get(next_start..)?
            .find(OPEN)
            .map_or(template.len(), |pos| next_start + pos);
        let delimiter = template.get(next_start..next)?;
        if delimiter.is_empty() {
            return None;
        }
        let value_end = at_source + line.get(at_source..)?.find(delimiter)?;
        let value = line.get(at_source..value_end)?;
        if value.is_empty()
            || value.len() > 256
            || value
                .chars()
                .any(|c| matches!(c, '\\' | '%' | '{' | '}' | ';' | '\r' | '\n'))
        {
            return None;
        }
        spans.push((id.to_owned(), at_source..value_end));
        at_source = value_end;
        at_template = next_start;
    }
    (line.get(at_source..)? == template.get(at_template..)?).then_some(spans)
}

/// Matches exactly one literal source token under the Unicode TextEdit caret.
/// Unsupported, macro-dependent, partial or commented syntax is UNKNOWN.
#[must_use]
pub fn parameter_caret(
    source: &str,
    caret_chars: usize,
    catalog: &Catalog,
) -> Option<ParameterCaret> {
    if [
        r"\catcode",
        r"\begin{verbatim}",
        r"\begin{lstlisting}",
        r"\begin{minted}",
    ]
    .iter()
    .any(|marker| source.contains(marker))
    {
        return None;
    }
    let byte = source
        .char_indices()
        .nth(caret_chars)
        .map(|(i, _)| i)
        .or_else(|| (caret_chars == source.chars().count()).then_some(source.len()))?;
    let line_start = source.get(..byte)?.rfind('\n').map_or(0, |i| i + 1);
    let line_end = source
        .get(byte..)?
        .find('\n')
        .map_or(source.len(), |i| byte + i);
    let raw = source.get(line_start..line_end)?.trim_end_matches('\r');
    let line = raw.trim_start_matches(|c| c == ' ' || c == '\t');
    let leading = raw.len() - line.len();
    if line.contains('%')
        || !(line.starts_with(r"\draw ")
            || line.starts_with(r"\draw[")
            || line.starts_with(r"\node "))
    {
        return None;
    }
    let mut result = None;
    for tool in &catalog.tools {
        let Some(spans) = literal_template_spans(&tool.syntax, line) else {
            continue;
        };
        for (id, span) in spans {
            let Some(parameter) = tool.parameter.iter().find(|p| p.id == id) else {
                continue;
            };
            let value = line.get(span.clone())?;
            if parameter.kind == "dimension"
                && !value
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b".+-".contains(&b))
            {
                continue;
            }
            if parameter.kind == "choice" && !value.is_ascii() {
                continue;
            }
            let range = (line_start + leading + span.start)..(line_start + leading + span.end);
            if (range.start..=range.end).contains(&byte) {
                if result.is_some() {
                    return None;
                }
                result = Some(ParameterCaret {
                    tool_id: tool.id.clone(),
                    parameter_id: id,
                    range,
                });
            }
        }
    }
    result
}

#[cfg(test)]
mod parameter_tests {
    use super::*;
    use std::collections::BTreeSet;

    #[test]
    fn all_27_source_visible_c_parameters_are_recognized_without_editing_source() {
        let c = Catalog::bundled().unwrap();
        let mut expected = BTreeSet::new();
        let mut actual = BTreeSet::new();
        for tool in &c.tools {
            const OPEN: &str = concat!("$", "{");
            for part in tool.syntax.split(OPEN).skip(1) {
                expected.insert((tool.id.clone(), part.split('}').next().unwrap().to_owned()));
            }
            let source = format!(
                "\\documentclass{{standalone}}\r\n% русский\r\n\\begin{{tikzpicture}}\r\n  {}\r\n\\end{{tikzpicture}}\r\n\\myOpaque{{не трогать}}\r\n",
                tool.example
            );
            let original = source.clone();
            let prefix = source[..source.find(&tool.example).unwrap()]
                .chars()
                .count();
            for index in 0..tool.example.chars().count() {
                if let Some(hit) = parameter_caret(&source, prefix + index, &c) {
                    assert_eq!(hit.tool_id, tool.id);
                    assert!(!source.get(hit.range.clone()).unwrap().is_empty());
                    actual.insert((hit.tool_id, hit.parameter_id));
                }
            }
            assert_eq!(source, original);
            assert!(source.contains("\r\n\\myOpaque{не трогать}\r\n"));
        }
        assert_eq!(expected.len(), 27, "node mode is inspector-only");
        assert_eq!(actual, expected);
    }

    #[test]
    fn opaque_comments_and_partial_source_fail_closed() {
        let c = Catalog::bundled().unwrap();
        for source in [
            "% \\draw (0cm,0cm) -- (2cm,1cm);\r\n",
            "\\draw (\\macro,0cm) -- (2cm,1cm);\r\n",
            "\\draw[red] (0cm,0cm) -- (2cm,1cm);\r\n",
            "\\node at (0cm,0cm) {\\unknown{слово}};\r\n",
            "\\draw (0cm,0cm) -- (2cm,1cm) % note\r\n",
            "\\begin{verbatim}\r\n\\draw (0cm,0cm) -- (2cm,1cm);\r\n",
            "\\catcode\\foo\r\n\\draw (0cm,0cm) -- (2cm,1cm);\r\n",
        ] {
            for i in 0..=source.chars().count() {
                assert!(parameter_caret(source, i, &c).is_none(), "{source:?} {i}");
            }
        }
        let truncated = "\\draw (0cm,0cm) -- (2cm,";
        assert!(parameter_caret(truncated, truncated.chars().count(), &c).is_none());
        assert!(parameter_caret(truncated, usize::MAX, &c).is_none());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn text() -> String {
        "\\documentclass{article}\r\n\\usepackage{tikz}\r\n% русский комментарий\r\n\\usetikzlibrary{arro}\r\n\\begin{document}\r\n\\myOpaque{Кириллица}\r\n\\end{document}\r\n".into()
    }
    fn caret(source: &str) -> usize {
        source[..source.find("arro}").unwrap() + 4].chars().count()
    }
    #[test]
    fn one_catalogue_patch_and_inverse_preserve_entire_opaque_crlf_document() {
        let c = Catalog::bundled().unwrap();
        let mut source = text();
        let before = source.clone();
        let hit = library_caret(&source, caret(&source), &c).unwrap();
        assert_eq!(hit.candidates, vec!["arrows.meta"]);
        let patch = completion_patch(&source, caret(&source), "arrows.meta", 7, &c).unwrap();
        let mut revision = 7;
        let inverse = patch.apply(&mut source, &mut revision).unwrap();
        assert!(source.contains("\\usetikzlibrary{arrows.meta}\r\n"));
        assert!(source.contains("\\myOpaque{Кириллица}\r\n"));
        assert_eq!(source.matches("\r\n").count(), 7);
        inverse.apply(&mut source, &mut revision).unwrap();
        assert_eq!(source, before);
    }
    #[test]
    fn refuse_comments_macros_multi_names_body_and_wrong_candidates() {
        let c = Catalog::bundled().unwrap();
        for line in [
            "% \\usetikzlibrary{arro}",
            r"\def\x{\usetikzlibrary{arro}}",
            r"\usetikzlibrary{arro,calc}",
            r"\usetikzlibrary{\foo}",
            r"\usetikzlibrary{arro} \input{outside}",
        ] {
            let src = format!("{line}\n");
            let index = src.find("arro}").map(|i| i + 4).unwrap_or(0);
            let cursor = src[..index].chars().count();
            assert!(library_caret(&src, cursor, &c).is_none(), "{line}");
        }
        let src = "\\begin{document}\n\\usetikzlibrary{arro}\n";
        assert!(library_caret(src, caret(src), &c).is_none());
        let src = text();
        assert!(completion_patch(&src, caret(&src), "fit", 0, &c).is_none());
        let patch = completion_patch(&src, caret(&src), "arrows.meta", 0, &c).unwrap();
        let mut changed = src.clone();
        let mut revision = 1;
        assert!(patch.apply(&mut changed, &mut revision).is_err());
        assert_eq!(changed, src);
    }
}
