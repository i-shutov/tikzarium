//! One literal preamble library-name completion backed by the shared C catalogue.
//! No TeX parsing, macro expansion, installation, or implicit preamble insertion.
use std::ops::Range;
use crate::primitives::{Catalog, SourcePatch};

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
    if [r"\catcode", r"\begin{verbatim}", r"\begin{lstlisting}", r"\begin{minted}"]
        .iter().any(|s| source.contains(s)) {
        return None;
    }
    let byte = source.char_indices().nth(caret_chars).map(|(i, _)| i)
        .or_else(|| (caret_chars == source.chars().count()).then_some(source.len()))?;
    let start = source[..byte].rfind('\n').map_or(0, |i| i + 1);
    if source[..start].contains(r"\begin{document}") { return None; }
    let end = source[byte..].find('\n').map_or(source.len(), |i| byte + i);
    let line = source.get(start..end)?.trim_end_matches('\r');
    let trimmed = line.trim_start_matches([' ', '\t']);
    const OPEN: &str = r"\usetikzlibrary{";
    if !trimmed.starts_with(OPEN) { return None; }
    let a = start + line.len() - trimmed.len() + OPEN.len();
    let b = a + source.get(a..start + line.len())?.find('}')?;
    let after = source.get(b + 1..start + line.len())?.trim();
    if byte != b || (!after.is_empty() && !after.starts_with('%')) { return None; }
    let typed = source.get(a..b)?;
    if typed.len() > 32 || !typed.bytes().all(|b|
        b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'.' || b == b'-'
    ) { return None; }
    let mut candidates = catalog.libraries.iter().filter(|l| l.name.starts_with(typed))
        .map(|l| l.name.clone()).collect::<Vec<_>>();
    candidates.sort();
    if candidates.is_empty() { return None; }
    Some(LibraryCaret { range: a..b, typed: typed.to_owned(), candidates })
}

/// A SourcePatch carries old bytes and revision; egui must not bypass apply().
#[must_use]
pub fn completion_patch(source: &str, caret_chars: usize, name: &str,
                        revision: u64, catalog: &Catalog) -> Option<SourcePatch> {
    let context = library_caret(source, caret_chars, catalog)?;
    if context.typed == name || !context.candidates.iter().any(|c| c == name) { return None; }
    Some(SourcePatch {
        range: context.range, expected_old: context.typed,
        replacement: name.to_owned(), source_revision: revision,
    })
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
            "% \\usetikzlibrary{arro}", r"\def\x{\usetikzlibrary{arro}}",
            r"\usetikzlibrary{arro,calc}", r"\usetikzlibrary{\foo}",
            r"\usetikzlibrary{arro} \input{outside}"
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
