//! Conservative, byte-preserving split of complete TeX documents into
//! preamble and body. This is structural navigation only, not a TeX parser.

use std::ops::Range;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SectionKind {
    /// One standalone document opening line was found in the supported syntax.
    Document,
    /// No standalone document opening line exists in the supported syntax.
    Fragment,
    /// The source was ambiguous or structurally unbalanced, so it stays whole.
    Unsplit,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceSections {
    pub kind: SectionKind,
    pub preamble_range: Range<usize>,
    pub body_range: Range<usize>,
    pub boundary_byte_offset: Option<usize>,
    pub boundary_char_offset: Option<usize>,
    /// One-based physical line number at which the body starts.
    pub first_body_line: usize,
}

impl SourceSections {
    /// Reassemble the original ranges exactly. This helper is intended for
    /// integrity checks; editing code should still patch the authoritative
    /// source buffer using its normal revision/undo path.
    #[cfg(test)]
    #[must_use]
    pub fn recombine_exact(&self, source: &str) -> Option<String> {
        let preamble = source.get(self.preamble_range.clone())?;
        let body = source.get(self.body_range.clone())?;
        Some(format!("{preamble}{body}"))
    }
}

/// Analyze a source buffer without rewriting or normalizing any bytes.
///
/// Recognition intentionally requires the whole active line to contain only
/// optional whitespace, `\begin{document}`, and optional trailing whitespace
/// or a TeX comment. Comments and markers inside brace groups are ignored.
/// Multiple starts, unmatched braces, an opening line without a line terminator,
/// bare CR line endings, and recognized opaque syntax stay unsplit. Opaque syntax
/// includes literal text, unsupported macro-definition forms, conditionals,
/// expansion controls and catcode changes. Parameterless primitive definitions
/// with literal command names and braced replacement text are supported.
/// This deliberately accepts only a small navigation subset: it assumes ordinary
/// TeX catcodes and does not expand commands, load included files or infer the
/// semantics of user-defined commands. An `Unsplit` result is an ordinary editable
/// whole-source view, not an error.
#[must_use]
pub fn analyze_source(source: &str) -> SourceSections {
    let mut line_start = 0;
    let mut line_number = 1;
    let mut brace_depth = 0_i64;
    let mut candidate: Option<(usize, usize)> = None;
    // The editor's diagnostic/cursor line contract counts LF, including CRLF.
    // A bare CR has different physical-line semantics, so keep it whole.
    let mut ambiguous = source
        .as_bytes()
        .iter()
        .enumerate()
        .any(|(i, byte)| *byte == b'\r' && source.as_bytes().get(i + 1) != Some(&b'\n'))
        || contains_opaque_syntax(source);

    while line_start < source.len() {
        let line_end = physical_line_end(source, line_start);
        let line = &source[line_start..line_end];
        let code_end = active_code_end(line);
        let code = &line[..code_end];
        if brace_depth == 0 && is_standalone_document_start(code) {
            // A body insertion after an unterminated opening line would erase
            // the standalone-line boundary on the next analysis.
            if !line.ends_with(['\r', '\n']) || candidate.is_some() {
                ambiguous = true;
            } else {
                candidate = Some((line_end, line_number + 1));
            }
        }
        match brace_depth_after(code, brace_depth) {
            Some(depth) => brace_depth = depth,
            None => ambiguous = true,
        }
        if line_end == source.len() {
            break;
        }
        line_number += 1;
        line_start = line_end;
    }

    if brace_depth != 0 {
        ambiguous = true;
    }
    if !ambiguous && let Some((boundary, first_body_line)) = candidate {
        let char_offset = source[..boundary].chars().count();
        return SourceSections {
            kind: SectionKind::Document,
            preamble_range: 0..boundary,
            body_range: boundary..source.len(),
            boundary_byte_offset: Some(boundary),
            boundary_char_offset: Some(char_offset),
            first_body_line,
        };
    }

    let kind = if ambiguous {
        SectionKind::Unsplit
    } else {
        SectionKind::Fragment
    };
    SourceSections {
        kind,
        preamble_range: 0..0,
        body_range: 0..source.len(),
        boundary_byte_offset: None,
        boundary_char_offset: None,
        first_body_line: 1,
    }
}

fn physical_line_end(source: &str, start: usize) -> usize {
    let bytes = source.as_bytes();
    let mut i = start;
    while i < bytes.len() {
        match bytes[i] {
            b'\n' => return i + 1,
            b'\r' if bytes.get(i + 1) == Some(&b'\n') => return i + 2,
            b'\r' => return i + 1,
            _ => i += 1,
        }
    }
    bytes.len()
}

/// Return the byte offset where an unescaped `%` starts the TeX comment.
fn active_code_end(line: &str) -> usize {
    let bytes = line.as_bytes();
    let mut slash_count = 0_usize;
    for (index, byte) in bytes.iter().copied().enumerate() {
        match byte {
            b'\\' => slash_count += 1,
            b'%' if slash_count.is_multiple_of(2) => return index,
            _ => slash_count = 0,
        }
    }
    line.len()
}

fn is_standalone_document_start(code: &str) -> bool {
    let trimmed = code.trim_matches([' ', '\t', '\r', '\n']);
    trimmed == r"\begin{document}"
}

/// Recognize syntax whose tokenization or expansion cannot be established by
/// this deliberately shallow scanner. Do this before inspecting line markers:
/// a percent sign or brace in literal text is not ordinary TeX syntax.
fn contains_opaque_syntax(source: &str) -> bool {
    let bytes = source.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'%' => {
                while i < bytes.len() && !matches!(bytes[i], b'\r' | b'\n') {
                    i += 1;
                }
            }
            // TeX's ^^ notation can manufacture a backslash, comment or brace
            // before tokenization. Treat all active occurrences as opaque.
            b'^' if bytes.get(i + 1) == Some(&b'^') => return true,
            b'\\' => {
                i += 1;
                let start = i;
                // Include @ conservatively, including under makeatletter.
                while i < bytes.len() && (bytes[i].is_ascii_alphabetic() || bytes[i] == b'@') {
                    i += 1;
                }
                if i == start {
                    // One control symbol. In particular, \% is not a comment,
                    // and \\ does not escape a following percent or brace.
                    if i < bytes.len() {
                        i += source[i..].chars().next().unwrap().len_utf8();
                    }
                    continue;
                }
                let name = &source[start..i];
                if matches!(name, "def" | "gdef" | "edef" | "xdef") {
                    if !is_simple_braced_definition(source, i) {
                        return true;
                    }
                    continue;
                }
                if opaque_control(name) || matches!(bytes.get(i), Some(b'_' | b':')) {
                    return true;
                }
                if name == "begin" {
                    let argument = skip_space_and_comments(source, i);
                    if bytes.get(argument) == Some(&b'{') {
                        // A bounded literal name avoids rescanning the rest of
                        // a large malformed document for every \begin token.
                        let name_start = argument + 1;
                        let mut end = name_start;
                        while let Some(byte) = bytes.get(end) {
                            if *byte == b'}' {
                                break;
                            }
                            if end - name_start >= 256
                                || !(byte.is_ascii_alphanumeric()
                                    || byte.is_ascii_whitespace()
                                    || b"*-_@:".contains(byte))
                            {
                                return true;
                            }
                            end += 1;
                        }
                        if bytes.get(end) != Some(&b'}') {
                            return true;
                        }
                        // Spaces in environment names disappear in TeX's
                        // csname lookup, including those produced by newlines.
                        let environment: String = source[name_start..end]
                            .chars()
                            .filter(|c| !c.is_ascii_whitespace())
                            .collect();
                        if matches!(
                            environment.as_str(),
                            "verbatim"
                                | "verbatim*"
                                | "Verbatim"
                                | "Verbatim*"
                                | "BVerbatim"
                                | "BVerbatim*"
                                | "LVerbatim"
                                | "LVerbatim*"
                                | "SaveVerbatim"
                                | "lstlisting"
                                | "minted"
                                | "comment"
                                | "filecontents"
                                | "filecontents*"
                                | "luacode"
                                | "luacode*"
                        ) {
                            return true;
                        }
                    } else {
                        // Unbraced or computed environment names cannot be
                        // established without expanding TeX tokens.
                        return true;
                    }
                }
            }
            _ => i += 1,
        }
    }
    false
}

fn skip_space_and_comments(source: &str, mut i: usize) -> usize {
    let bytes = source.as_bytes();
    loop {
        while i < bytes.len() && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        if bytes.get(i) != Some(&b'%') {
            return i;
        }
        while i < bytes.len() && !matches!(bytes[i], b'\r' | b'\n') {
            i += 1;
        }
    }
}

/// Permit the common parameterless `\def\name{...}` form, whose replacement
/// text is protected by a brace group. TeX's parameter/delimiter forms require
/// token parsing and stay opaque. The main scanner still visits the entire body.
fn is_simple_braced_definition(source: &str, after_command: usize) -> bool {
    let bytes = source.as_bytes();
    let mut i = skip_space_and_comments(source, after_command);
    if bytes.get(i) != Some(&b'\\') {
        return false;
    }
    i += 1;
    let start = i;
    while i < bytes.len() && (bytes[i].is_ascii_alphabetic() || bytes[i] == b'@') {
        i += 1;
    }
    // Control symbols, computed names and changes to structural commands are
    // deliberately outside the accepted definition subset.
    if i == start {
        return false;
    }
    let target = &source[start..i];
    if opaque_control(target) || matches!(target, "begin" | "end") {
        return false;
    }
    bytes.get(skip_space_and_comments(source, i)) == Some(&b'{')
}

fn opaque_control(name: &str) -> bool {
    name.starts_with("if")
        || matches!(
            name,
            "else"
                | "fi"
                | "or"
                | "unless"
                | "def"
                | "gdef"
                | "edef"
                | "xdef"
                | "let"
                | "futurelet"
                | "aftergroup"
                | "afterassignment"
                | "endinput"
                | "read"
                | "readline"
                | "newcommand"
                | "renewcommand"
                | "providecommand"
                | "DeclareRobustCommand"
                | "newenvironment"
                | "renewenvironment"
                | "NewEnviron"
                | "RenewEnviron"
                | "NewDocumentCommand"
                | "RenewDocumentCommand"
                | "ProvideDocumentCommand"
                | "DeclareDocumentCommand"
                | "NewDocumentEnvironment"
                | "RenewDocumentEnvironment"
                | "ProvideDocumentEnvironment"
                | "DeclareDocumentEnvironment"
                | "verb"
                | "Verb"
                | "lstinline"
                | "mintinline"
                | "SaveVerb"
                | "EscVerb"
                | "DefineVerbatimEnvironment"
                | "RecustomVerbatimEnvironment"
                | "lstnewenvironment"
                | "newminted"
                | "newmintinline"
                | "includecomment"
                | "excludecomment"
                | "specialcomment"
                | "catcode"
                | "endlinechar"
                | "scantokens"
                | "detokenize"
                | "obeylines"
                | "obeyspaces"
                | "ExplSyntaxOn"
                | "ExplSyntaxOff"
                | "csname"
                | "endcsname"
                | "expandafter"
                | "noexpand"
                | "string"
                | "meaning"
                | "show"
                | "unexpanded"
                | "expanded"
                | "bgroup"
                | "egroup"
                | "begingroup"
                | "endgroup"
                | "directlua"
                | "latelua"
        )
}

/// Count ordinary unescaped braces. A control symbol consumes exactly its
/// following character; runs of backslashes must not leak escape state past it.
fn brace_depth_after(code: &str, initial_depth: i64) -> Option<i64> {
    let mut chars = code.chars();
    let mut depth = initial_depth;
    while let Some(character) = chars.next() {
        match character {
            '\\' => {
                chars.next();
            }
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth < 0 {
                    return None;
                }
            }
            _ => {}
        }
    }
    Some(depth)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quickstart_and_complete_f14_document_split_at_the_opening_line() {
        let quickstart = include_str!("../../../examples/quickstart.tex");
        let f14 = include_str!(
            "../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/AK/F14_3/figure.tex"
        );
        for source in [quickstart, f14] {
            let sections = analyze_source(source);
            assert_eq!(sections.kind, SectionKind::Document);
            let boundary = sections.boundary_byte_offset.unwrap();
            assert!(
                source[..boundary].ends_with("\\begin{document}\r\n")
                    || source[..boundary].ends_with("\\begin{document}\n")
            );
            assert_eq!(sections.recombine_exact(source).as_deref(), Some(source));
            assert_eq!(
                source.as_bytes(),
                sections.recombine_exact(source).unwrap().as_bytes()
            );
        }
    }

    #[test]
    fn ignores_comments_escaped_percent_and_macro_group_markers() {
        let source = concat!(
            "% \\begin{document}\r\n",
            "\\somecommand{\r\n",
            "  \\begin{document}\r\n",
            "}\r\n",
            "\\% literal percent; not a comment\\\r\n",
            "  \\begin{document} % active opening\r\n",
            "body\r\n",
        );
        let sections = analyze_source(source);
        assert_eq!(sections.kind, SectionKind::Document);
        let preamble = &source[sections.preamble_range.clone()];
        assert!(!preamble.contains("\\begin{document}\r\nbody"));
        assert!(preamble.ends_with("  \\begin{document} % active opening\r\n"));
        assert_eq!(sections.first_body_line, 7);
        assert_eq!(sections.recombine_exact(source).as_deref(), Some(source));
    }

    #[test]
    fn fragments_duplicates_and_unbalanced_groups_stay_whole() {
        for (source, kind) in [
            ("\\draw (0,0)--(1,1);\r\n", SectionKind::Fragment),
            (
                "\\begin{document}\nA\n\\begin{document}\nB\n",
                SectionKind::Unsplit,
            ),
            (
                "\\newcommand{\\x}{\n\\begin{document}\n",
                SectionKind::Unsplit,
            ),
        ] {
            let sections = analyze_source(source);
            assert_eq!(sections.kind, kind);
            assert_eq!(sections.body_range, 0..source.len());
            assert_eq!(sections.recombine_exact(source).as_deref(), Some(source));
        }
    }

    #[test]
    fn byte_char_offsets_and_first_body_line_track_unicode_crlf_edits() {
        let source = "% график 🇷🇺\r\n\\documentclass{article}\r\n\\begin{document}\r\nтело\r\n";
        let original_bytes = source.as_bytes().to_vec();
        let sections = analyze_source(source);
        let byte = sections.boundary_byte_offset.unwrap();
        let chars = sections.boundary_char_offset.unwrap();
        assert_eq!(source[..byte].chars().count(), chars);
        assert_eq!(sections.first_body_line, 4);
        let mut edited = source.to_owned();
        edited.insert_str(byte, "% body marker\r\n");
        let reanalyzed = analyze_source(&edited);
        assert_eq!(&edited[reanalyzed.body_range], "% body marker\r\nтело\r\n");
        assert_eq!(source.as_bytes(), original_bytes);
    }

    #[test]
    fn literal_macro_conditional_and_tokenization_contexts_stay_whole() {
        for source in [
            "\\begin{verbatim}\n\\begin{document}\n\\end{verbatim}\n",
            "\\begin % skipped\n{verbatim*}\n\\begin{document}\n",
            "\\begin{ver batim}\n\\begin{document}\n",
            "\\begin{lstlisting}\n\\begin{document}\n\\end{lstlisting}\n",
            "\\begin{minted}{tex}\n\\begin{document}\n\\end{minted}\n",
            "\\begin{comment}\n\\begin{document}\n\\end{comment}\n",
            "\\begin{filecontents*}{file.tex}\n\\begin{document}\n",
            "\\verb|%\n\\begin{document}\n|\n",
            "\\lstinline!{\n\\begin{document}\n!\n",
            "\\mintinline{tex}|\n\\begin{document}\n|\n",
            "\\def\\literal#1\n\\begin{document}\n{#1}\n",
            "\\def\\begin{literal}\n\\begin{document}\n",
            "\\def\\literal\\begin{document}\n",
            "\\newcommand{\\literal}\n\\begin{document}\n",
            "\\newcommand{\\literal}{\n\\begin{document}\n}\n",
            "\\NewDocumentCommand{\\literal}{v}{#1}\n\\begin{document}\n",
            "\\newenvironment{literal}{}{}\n\\begin{document}\n",
            "\\iffalse\n\\begin{document}\n\\fi\n",
            "\\ifdefined\\foo\n\\begin{document}\n\\else\n\\fi\n",
            "\\catcode`\\%=12\n\\begin{document}\n",
            "\\string\n\\begin{document}\n",
            "\\let\\literal=\n\\begin{document}\n",
            "\\expandafter\n\\begin{document}\n",
            "\\aftergroup\n\\begin{document}\n",
            "\\endinput\n\\begin{document}\n",
            "\\csname begin\\endcsname{verbatim}\n\\begin{document}\n",
            "\\ExplSyntaxOn\n\\begin{document}\n",
            "\\cs_new:Npn \\literal #1\n\\begin{document}\n{#1}\n",
            "^^25 hidden percent\n\\begin{document}\n",
            "\\begin{\\computed}\n\\begin{document}\n",
            "\\begin{verbatim}\n{ unmatched literal\n\\begin{document}\n",
            // A recognized opening does not make later opaque syntax safe.
            "\\begin{document}\n\\verb|\\begin{document}|\n",
        ] {
            let sections = analyze_source(source);
            assert_eq!(sections.kind, SectionKind::Unsplit, "source: {source:?}");
            assert_eq!(sections.body_range, 0..source.len());
            assert_eq!(sections.recombine_exact(source).as_deref(), Some(source));
        }
    }

    #[test]
    fn comments_and_control_symbols_do_not_activate_opaque_commands() {
        let source = concat!(
            "% \\verb|fake| \\def\\fake{} ^^25\n",
            "\\\\verb literal control symbol\n",
            "\\{ \\} \\% escaped symbols\n",
            "\\begin{document}\n",
            "body",
        );
        let sections = analyze_source(source);
        assert_eq!(sections.kind, SectionKind::Document);
        assert_eq!(&source[sections.body_range.clone()], "body");
        assert_eq!(sections.recombine_exact(source).as_deref(), Some(source));
    }

    #[test]
    fn simple_braced_parameterless_definitions_are_navigable() {
        for definition in [
            "\\def\\literal{\n\\begin{document}\n}\n",
            "\\gdef\\literal % target comment\n{a}\n",
            "\\edef\\literal{word}\n",
            "\\xdef\\literal{слово🙂}\n",
        ] {
            let source = format!("{definition}\\begin{{document}}\nbody");
            let sections = analyze_source(&source);
            assert_eq!(sections.kind, SectionKind::Document, "{source:?}");
            assert_eq!(&source[sections.body_range.clone()], "body");
            assert_eq!(
                sections.recombine_exact(&source).as_deref(),
                Some(source.as_str())
            );
        }
    }

    #[test]
    fn escaped_brace_does_not_escape_subsequent_structural_braces() {
        let source = "\\{ {\n\\begin{document}\n}\n\\begin{document}\nbody\n";
        let sections = analyze_source(source);
        assert_eq!(sections.kind, SectionKind::Document);
        assert_eq!(sections.first_body_line, 5);
        assert_eq!(&source[sections.body_range], "body\n");
        let unbalanced = "\\{ {\n\\begin{document}\n";
        assert_eq!(analyze_source(unbalanced).kind, SectionKind::Unsplit);
    }

    #[test]
    fn opening_line_requires_a_terminator_and_lone_cr_stays_whole() {
        for source in [
            "\\begin{document}",
            "\\begin{document} % no newline",
            "\\begin{document}\rbody",
            "% comment\r\\begin{document}\nbody\n",
            "\\begin{document}\nbody\r",
        ] {
            let sections = analyze_source(source);
            assert_eq!(sections.kind, SectionKind::Unsplit, "source: {source:?}");
            assert_eq!(sections.first_body_line, 1);
            assert_eq!(sections.recombine_exact(source).as_deref(), Some(source));
        }
        for source in ["\\begin{document}\n", "\\begin{document}\r\n"] {
            let sections = analyze_source(source);
            assert_eq!(sections.kind, SectionKind::Document);
            assert_eq!(sections.body_range, source.len()..source.len());
            assert_eq!(sections.first_body_line, 2);
        }
    }

    #[test]
    fn non_standalone_markers_are_fragments() {
        for source in [
            "prefix \\begin{document}\n",
            "\\begin{document} suffix\n",
            "\\begin {document}\n",
            "\\begin{document}% only a final comment",
            "",
        ] {
            let sections = analyze_source(source);
            // The final commented opening is recognizable, but incomplete.
            let expected = if source.starts_with("\\begin{document}%") {
                SectionKind::Unsplit
            } else {
                SectionKind::Fragment
            };
            assert_eq!(sections.kind, expected, "source: {source:?}");
            assert_eq!(sections.recombine_exact(source).as_deref(), Some(source));
        }
    }

    #[test]
    fn unicode_crlf_section_edits_preserve_the_other_section_bytes() {
        let source = "% α🇷🇺\r\n\\begin{document} % начало\r\nтело🙂\r\n\\end{document}";
        let sections = analyze_source(source);
        let boundary = sections.boundary_byte_offset.unwrap();
        assert_eq!(
            sections.boundary_char_offset,
            Some(source[..boundary].chars().count())
        );
        assert_eq!(sections.first_body_line, 3);
        let mut body_edit = source.to_owned();
        body_edit.replace_range(
            sections.body_range.clone(),
            "другое тело🐈\r\n\\end{document}",
        );
        assert_eq!(
            &body_edit.as_bytes()[..boundary],
            &source.as_bytes()[..boundary]
        );
        let new_sections = analyze_source(&body_edit);
        assert_eq!(
            new_sections.recombine_exact(&body_edit).as_deref(),
            Some(body_edit.as_str())
        );

        let mut preamble_edit = source.to_owned();
        preamble_edit.replace_range(0..0, "% ещё одна строка\r\n");
        let new_sections = analyze_source(&preamble_edit);
        assert_eq!(
            &preamble_edit[new_sections.body_range],
            &source[sections.body_range]
        );
        assert_eq!(new_sections.first_body_line, 4);
    }

    #[test]
    fn malformed_and_unicode_combinations_never_lose_bytes() {
        let pieces = [
            "λ🙂",
            "\\",
            "\\%",
            "% comment\r\n",
            "{",
            "}",
            "\\begin{document}\r\n",
            "\\verb|",
            "^^",
            "\r",
            "\n",
        ];
        for first in pieces {
            for second in pieces {
                for third in pieces {
                    let source = format!("{first}{second}{third}");
                    let sections = analyze_source(&source);
                    assert_eq!(
                        sections.recombine_exact(&source).as_deref(),
                        Some(source.as_str())
                    );
                    assert_eq!(sections.preamble_range.start, 0);
                    assert_eq!(sections.preamble_range.end, sections.body_range.start);
                    assert_eq!(sections.body_range.end, source.len());
                    if let Some(boundary) = sections.boundary_byte_offset {
                        assert!(source.is_char_boundary(boundary));
                        assert_eq!(
                            sections.boundary_char_offset,
                            Some(source[..boundary].chars().count())
                        );
                    }
                }
            }
        }
    }
}
