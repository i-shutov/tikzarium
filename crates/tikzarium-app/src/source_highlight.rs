//! Source-only TeX/TikZ syntax presentation for the real editable egui TextEdit.
//!
//! The lexer never changes source text, TeX catcodes, ownership annotations,
//! byte offsets, caret positions or the build contract. Unrecognized input is
//! deliberately ordinary editable text, not a parser error or disabled control.
use std::sync::Arc;

use crate::ui_theme::UiTheme;
use eframe::egui::{self, Color32, FontId};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Kind {
    Plain,
    Command,
    Comment,
    Metadata,
    Option,
    Number,
    Delimiter,
    Math,
    Operator,
    Environment,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Span {
    pub start: usize,
    pub end: usize,
    pub kind: Kind,
}

fn span(out: &mut Vec<Span>, start: usize, end: usize, kind: Kind) {
    if start >= end {
        return;
    }
    if let Some(last) = out.last_mut()
        && last.kind == kind
        && last.end == start
    {
        last.end = end;
        return;
    }
    out.push(Span { start, end, kind });
}

fn char_end(text: &str, start: usize) -> usize {
    start + text[start..].chars().next().expect("in source").len_utf8()
}

fn tex_command_end(text: &str, start: usize) -> usize {
    let mut end = start + 1;
    if end == text.len() {
        return end;
    }
    let ch = text[end..].chars().next().expect("after slash");
    if !ch.is_ascii_alphabetic() && ch != '@' {
        return end + ch.len_utf8();
    }
    while end < text.len() {
        let c = text[end..].chars().next().expect("valid UTF-8");
        if c.is_ascii_alphabetic() || c == '@' {
            end += c.len_utf8();
        } else {
            break;
        }
    }
    if text[end..].starts_with('*') {
        end += 1;
    }
    end
}

fn number_end(source: &str, start: usize) -> usize {
    let bytes = source.as_bytes();
    let mut end = start;
    if matches!(bytes[end], b'+' | b'-') {
        end += 1;
    }
    while end < bytes.len() && bytes[end].is_ascii_digit() {
        end += 1;
    }
    if end < bytes.len() && bytes[end] == b'.' && !source[end..].starts_with("..") {
        end += 1;
        while end < bytes.len() && bytes[end].is_ascii_digit() {
            end += 1;
        }
    }
    // Literal units are presentation only; macro-valued dimensions are left
    // to the following control sequence instead of being interpreted here.
    while end < bytes.len() && bytes[end].is_ascii_alphabetic() {
        end += 1;
    }
    end
}

fn is_owned_marker(line_before: &str, comment: &str) -> bool {
    if !comment.starts_with("% tikzarium:n1:") {
        return false;
    }
    // Presentation must use the same recognition as authoring. A plausible
    // schema/id/tool tuple alone does not prove ownership of the actual command.
    let line = format!("{line_before}{}", comment.trim_end_matches(['\r', '\n']));
    !crate::tikz_authoring::owned(&line).is_empty()
}

/// Recognize literal environment names only. Macro-computed arguments remain
/// ordinary editable TeX; this is neither expansion nor environment validation.
fn environment_argument(source: &str, after_command: usize) -> Option<(usize, usize, usize)> {
    let whitespace = source[after_command..].find(|c: char| !c.is_whitespace())?;
    let open = after_command + whitespace;
    let body = source[open..].strip_prefix('{')?;
    // Stop at the first non-name byte instead of searching arbitrarily far
    // ahead for a closing brace on every incomplete \begin in a large edit.
    let length = body
        .bytes()
        .position(|byte| !byte.is_ascii_alphanumeric() && !matches!(byte, b'*' | b'@' | b'-'))?;
    if length == 0 || body.as_bytes()[length] != b'}' {
        return None;
    }
    let close = open + 1 + length;
    Some((open, open + 1, close))
}

fn verbatim_ending(environment: &str) -> Option<&'static str> {
    match environment {
        "verbatim" => Some("\\end{verbatim}"),
        "verbatim*" => Some("\\end{verbatim*}"),
        "Verbatim" => Some("\\end{Verbatim}"),
        "Verbatim*" => Some("\\end{Verbatim*}"),
        "lstlisting" => Some("\\end{lstlisting}"),
        "minted" => Some("\\end{minted}"),
        _ => None,
    }
}

/// A deliberately small non-expanding lexer. Every token is an exact slice of
/// the original input and the spans partition the buffer without gaps.
///
/// Scope: default TeX control/comment/group characters, literal environment
/// names, inline verb/verbatim bodies and the four symbolic TikZ path operators.
/// Unknown macros are never expanded. After an explicit catcode/table change,
/// the rest of the buffer is opaque plain text, even if a group later ends: a
/// non-expanding lexer cannot safely infer which characters are controls again.
pub(crate) fn tokenize(source: &str) -> Vec<Span> {
    let mut spans = Vec::new();
    let mut i = 0;
    let mut line_start = 0;
    let mut options = 0usize;
    let mut verbatim_end: Option<&'static str> = None;
    while i < source.len() {
        if let Some(ending) = verbatim_end {
            if let Some(offset) = source[i..].find(ending) {
                let end = i + offset;
                span(&mut spans, i, end, Kind::Plain);
                if let Some(last_newline) = source[i..end].rfind('\n') {
                    line_start = i + last_newline + 1;
                }
                i = end;
                verbatim_end = None;
            } else {
                span(&mut spans, i, source.len(), Kind::Plain);
                break;
            }
        }

        if source.as_bytes()[i] == b'\\' {
            let end = tex_command_end(source, i);
            let command = &source[i..end];
            // \verb consumes its delimiter literally. An unterminated body
            // ends at CR/LF, so later physical lines stay independently editable.
            if matches!(command, "\\verb" | "\\verb*") && end < source.len() {
                let delimiter = source[end..].chars().next().expect("UTF-8");
                if !delimiter.is_whitespace() && !delimiter.is_ascii_alphabetic() {
                    let after = end + delimiter.len_utf8();
                    let body_end = source[after..]
                        .find([delimiter, '\r', '\n'])
                        .map(|position| {
                            let at = after + position;
                            if source[at..].starts_with(delimiter) {
                                at + delimiter.len_utf8()
                            } else {
                                at
                            }
                        })
                        .unwrap_or(source.len());
                    span(&mut spans, i, body_end, Kind::Plain);
                    i = body_end;
                    continue;
                }
            }

            let kind = if matches!(command, "\\(" | "\\)" | "\\[" | "\\]") {
                Kind::Math
            } else {
                Kind::Command
            };
            span(&mut spans, i, end, kind);
            i = end;
            if matches!(
                command,
                "\\catcode" | "\\catcodetable" | "\\setcatcodetable"
            ) {
                span(&mut spans, i, source.len(), Kind::Plain);
                break;
            }
            if matches!(command, "\\begin" | "\\end")
                && let Some((open, name_start, close)) = environment_argument(source, end)
            {
                span(&mut spans, end, open, Kind::Plain);
                span(&mut spans, open, name_start, Kind::Delimiter);
                span(&mut spans, name_start, close, Kind::Environment);
                span(&mut spans, close, close + 1, Kind::Delimiter);
                if command == "\\begin" {
                    verbatim_end = verbatim_ending(&source[name_start..close]);
                }
                if let Some(newline) = source[end..close + 1].rfind('\n') {
                    line_start = end + newline + 1;
                }
                i = close + 1;
            }
            continue;
        }

        if ["--", "..", "|-", "-|"]
            .iter()
            .any(|operator| source[i..].starts_with(operator))
        {
            span(&mut spans, i, i + 2, Kind::Operator);
            i += 2;
            continue;
        }

        match source.as_bytes()[i] {
            b'%' => {
                let mut backslashes = 0usize;
                let mut before = i;
                while before > 0 && source.as_bytes()[before - 1] == b'\\' {
                    backslashes += 1;
                    before -= 1;
                }
                if backslashes % 2 == 1 {
                    span(&mut spans, i, i + 1, Kind::Plain);
                    i += 1;
                    continue;
                }
                let end = source[i..]
                    .find('\n')
                    .map_or(source.len(), |offset| i + offset);
                let color = if is_owned_marker(&source[line_start..i], &source[i..end]) {
                    Kind::Metadata
                } else {
                    Kind::Comment
                };
                span(&mut spans, i, end, color);
                i = end;
            }
            b'\n' => {
                span(&mut spans, i, i + 1, Kind::Plain);
                i += 1;
                line_start = i;
            }
            b'[' => {
                options += 1;
                span(&mut spans, i, i + 1, Kind::Delimiter);
                i += 1;
            }
            b']' => {
                options = options.saturating_sub(1);
                span(&mut spans, i, i + 1, Kind::Delimiter);
                i += 1;
            }
            b'{' | b'}' | b'(' | b')' => {
                span(&mut spans, i, i + 1, Kind::Delimiter);
                i += 1;
            }
            b'$' => {
                let end = if source[i..].starts_with("$$") {
                    i + 2
                } else {
                    i + 1
                };
                span(&mut spans, i, end, Kind::Math);
                i = end;
            }
            b'0'..=b'9' => {
                let end = number_end(source, i);
                span(&mut spans, i, end, Kind::Number);
                i = end;
            }
            b'+' | b'-' | b'.'
                if source.as_bytes().get(i + 1).is_some_and(u8::is_ascii_digit)
                    || (matches!(source.as_bytes()[i], b'+' | b'-')
                        && source.as_bytes().get(i + 1) == Some(&b'.')
                        && source.as_bytes().get(i + 2).is_some_and(u8::is_ascii_digit)) =>
            {
                let end = number_end(source, i);
                span(&mut spans, i, end, Kind::Number);
                i = end;
            }
            b'a'..=b'z' | b'A'..=b'Z' if options > 0 => {
                let mut end = i;
                while end < source.len() {
                    match source.as_bytes()[end] {
                        b'a'..=b'z' | b'A'..=b'Z' | b'-' | b'.' | b'_' => end += 1,
                        _ => break,
                    }
                }
                span(&mut spans, i, end, Kind::Option);
                i = end;
            }
            _ => {
                let end = char_end(source, i);
                span(&mut spans, i, end, Kind::Plain);
                i = end;
            }
        }
    }
    spans
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) struct Palette {
    plain: Color32,
    command: Color32,
    comment: Color32,
    metadata: Color32,
    option: Color32,
    number: Color32,
    delimiter: Color32,
    math: Color32,
}

impl Palette {
    fn color(self, kind: Kind) -> Color32 {
        match kind {
            Kind::Plain => self.plain,
            Kind::Command => self.command,
            Kind::Comment => self.comment,
            Kind::Metadata => self.metadata,
            Kind::Option => self.option,
            Kind::Number => self.number,
            Kind::Delimiter => self.delimiter,
            Kind::Math => self.math,
            Kind::Operator => self.delimiter,
            Kind::Environment => self.command,
        }
    }
}

pub(crate) fn palette(theme: UiTheme, plain: Color32) -> Palette {
    let rgb = Color32::from_rgb;
    match theme {
        UiTheme::Light => Palette {
            plain,
            command: rgb(29, 84, 166),
            comment: rgb(51, 102, 65),
            metadata: rgb(93, 102, 112),
            option: rgb(11, 103, 112),
            number: rgb(126, 63, 139),
            delimiter: rgb(107, 73, 145),
            math: rgb(137, 79, 35),
        },
        UiTheme::Paper => Palette {
            plain,
            command: rgb(24, 79, 146),
            comment: rgb(49, 99, 60),
            metadata: rgb(83, 92, 102),
            option: rgb(13, 96, 106),
            number: rgb(112, 60, 131),
            delimiter: rgb(100, 70, 133),
            math: rgb(121, 75, 35),
        },
        UiTheme::Dark => Palette {
            plain,
            command: rgb(125, 180, 245),
            comment: rgb(140, 193, 148),
            metadata: rgb(171, 179, 188),
            option: rgb(112, 203, 197),
            number: rgb(229, 180, 129),
            delimiter: rgb(189, 163, 233),
            math: rgb(229, 177, 126),
        },
        UiTheme::Midnight => Palette {
            plain,
            command: rgb(132, 196, 252),
            comment: rgb(140, 200, 153),
            metadata: rgb(177, 188, 197),
            option: rgb(119, 216, 211),
            number: rgb(237, 190, 135),
            delimiter: rgb(205, 176, 245),
            math: rgb(232, 188, 133),
        },
    }
}

/// The only text displayed in the editor is the original mutable buffer.
/// No hidden fold, normalization or source mapping is introduced.
#[cfg(test)]
pub(crate) fn layout_job(
    source: &str,
    font: FontId,
    colors: Palette,
    max_width: f32,
) -> egui::text::LayoutJob {
    layout_spans(source, &tokenize(source), font, colors, max_width)
}

fn layout_spans(
    source: &str,
    spans: &[Span],
    font: FontId,
    colors: Palette,
    max_width: f32,
) -> egui::text::LayoutJob {
    if spans.is_empty() {
        return egui::text::LayoutJob::simple(source.to_owned(), font, colors.plain, max_width);
    }
    let mut job = egui::text::LayoutJob {
        text: source.to_owned(),
        sections: Vec::with_capacity(spans.len()),
        wrap: egui::text::TextWrapping {
            max_width,
            ..Default::default()
        },
        ..Default::default()
    };
    for part in spans {
        let color = colors.color(part.kind);
        if let Some(last) = job.sections.last_mut()
            && last.format.color == color
            && last.byte_range.end == part.start
        {
            last.byte_range.end = part.end;
            continue;
        }
        job.sections.push(egui::text::LayoutSection {
            leading_space: 0.0,
            byte_range: part.start..part.end,
            format: egui::TextFormat {
                font_id: font.clone(),
                color,
                ..Default::default()
            },
        });
    }
    job
}

/// Tokenization and layout have separate invalidation. Exact source equality
/// catches edits made in place, document swaps and same-length UTF-8 changes;
/// neither a pointer nor a probabilistic hash can stand in for that check.
/// Production frames reuse an Arc<Galley>, avoiding a large LayoutJob clone/hash.
#[derive(Default)]
pub(crate) struct SourceHighlightCache {
    source: String,
    spans: Vec<Span>,
    presentation: Option<(FontId, Palette, u32)>,
    layout: Arc<egui::text::LayoutJob>,
    galley: Option<Arc<egui::Galley>>,
    font_witness: Option<Arc<egui::Galley>>,
    pixels_per_point: u32,
    #[cfg(test)]
    lexer_passes: usize,
}

impl SourceHighlightCache {
    fn prepare(&mut self, source: &str, font: FontId, colors: Palette, max_width: f32) {
        if self.source != source {
            self.spans = tokenize(source);
            self.source.clear();
            self.source.push_str(source);
            self.presentation = None;
            #[cfg(test)]
            {
                self.lexer_passes += 1;
            }
        }
        let presentation = (font.clone(), colors, max_width.to_bits());
        if self.presentation.as_ref() != Some(&presentation) {
            self.layout = Arc::new(layout_spans(source, &self.spans, font, colors, max_width));
            self.presentation = Some(presentation);
            self.galley = None;
        }
    }

    /// The owned job API is useful for source-integrity tests. The editor uses
    /// `galley` so an idle frame does not clone or hash all formatted sections.
    #[cfg(test)]
    pub(crate) fn layout_job(
        &mut self,
        source: &str,
        font: FontId,
        colors: Palette,
        max_width: f32,
    ) -> egui::text::LayoutJob {
        self.prepare(source, font, colors, max_width);
        self.layout.as_ref().clone()
    }

    pub(crate) fn galley(
        &mut self,
        ui: &egui::Ui,
        source: &str,
        font: FontId,
        colors: Palette,
        max_width: f32,
    ) -> Arc<egui::Galley> {
        self.prepare(source, font.clone(), colors, max_width);
        // egui 0.33 does not expose an atlas generation counter. Its tiny
        // memoized sentinel galley is a public-API generation witness instead:
        // set_fonts/atlas recreation replaces the internal GalleyCache, giving
        // this job a new Arc. Ordinary glyph additions keep the witness valid.
        // Touch it every frame so egui does not evict it as an unused galley.
        let witness =
            ui.fonts_mut(|fonts| fonts.layout_no_wrap("M".into(), font, Color32::TRANSPARENT));
        let pixels_per_point = ui.ctx().pixels_per_point().to_bits();
        if self.pixels_per_point == pixels_per_point
            && self
                .font_witness
                .as_ref()
                .is_some_and(|previous| Arc::ptr_eq(previous, &witness))
            && let Some(galley) = &self.galley
        {
            return Arc::clone(galley);
        }
        // A newly prepared job has one owner and can move directly into egui.
        // On font/DPI invalidation the prior Galley can still hold its job, so
        // only that exceptional path needs a full clone of the existing job.
        let job = Arc::try_unwrap(std::mem::take(&mut self.layout))
            .unwrap_or_else(|shared| shared.as_ref().clone());
        let galley = ui.fonts_mut(|fonts| fonts.layout_job(job));
        self.layout = Arc::clone(&galley.job);
        self.font_witness = Some(witness);
        self.pixels_per_point = pixels_per_point;
        self.galley = Some(Arc::clone(&galley));
        galley
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn generated(tool: crate::tikz_authoring::Tool, id: u64) -> String {
        crate::tikz_authoring::generate(tool, &crate::tikz_authoring::Draft::for_tool(tool), id)
            .expect("real authored primitive")
    }

    fn check_partition(source: &str, parts: &[Span]) {
        let mut at = 0usize;
        for token in parts {
            assert_eq!(token.start, at, "gap or overlap: {token:?}");
            assert!(source.is_char_boundary(token.start));
            assert!(source.is_char_boundary(token.end));
            assert!(token.end > token.start);
            at = token.end;
        }
        assert_eq!(at, source.len());
    }

    #[test]
    fn generated_marker_dimmed_but_user_comment_remains_user_comment() {
        let text = format!(
            "{}\r\n% тикзарий\r\n",
            generated(crate::tikz_authoring::Tool::Line, 1)
        );
        let tokens = tokenize(&text);
        check_partition(&text, &tokens);
        assert_eq!(
            tokens.iter().filter(|x| x.kind == Kind::Metadata).count(),
            1,
        );
        assert_eq!(tokens.iter().filter(|x| x.kind == Kind::Comment).count(), 1,);
    }

    #[test]
    fn lookalike_ownership_without_valid_command_or_json_is_not_metadata() {
        for text in [
            "% tikzarium:n1:[2,1,\"line\",{}]",
            "\\node{Text % tikzarium:n1:[2,1,\"node\",{}]};",
            "\\draw (0,0)--(1,1); % tikzarium:n1:fake",
            "\\draw (0,0)--(1,1); % tikzarium:n1:[2,1,\"opaque\",{}]",
        ] {
            assert!(
                tokenize(text)
                    .iter()
                    .all(|token| token.kind != Kind::Metadata),
                "{text}"
            );
        }
    }

    #[test]
    fn escape_percent_and_verbatim_never_turn_into_comments() {
        let samples = [
            "\\node {\\% tikzarium:n1:fake};",
            "\\node {\\verb|% tikzarium:n1:[2,1,\"node\",{}]|};",
            "\\begin{verbatim}\n\\draw ...; % tikzarium:n1:[2,1,\"line\",{}]\n\\end{verbatim}\n",
            "\\\\% regular TeX comment after double slash",
        ];
        for text in samples {
            let tokens = tokenize(text);
            check_partition(text, &tokens);
            assert!(
                tokens.iter().all(|token| token.kind != Kind::Metadata),
                "{text}"
            );
        }
    }

    #[test]
    fn source_bytes_offsets_and_layout_text_are_untouched() {
        let source = "\\documentclass{standalone}\r\n\\usepackage{tikz}\r\n\\begin{document}\n\\node[draw=blue,minimum width=2.5cm]{Тест 🇷🇺 e\u{301}}; % комментарий\n\\end{document}";
        let tokens = tokenize(source);
        check_partition(source, &tokens);
        for theme in UiTheme::ALL {
            let colors = palette(theme, Color32::WHITE);
            for width in [180.0, f32::INFINITY] {
                let job = layout_job(source, FontId::monospace(14.0), colors, width);
                assert_eq!(job.text.as_bytes(), source.as_bytes());
                assert_eq!(job.wrap.max_width, width);
                assert!(
                    job.sections
                        .iter()
                        .any(|s| s.format.color == colors.command)
                );
                assert!(
                    job.sections
                        .iter()
                        .any(|s| s.format.color == colors.comment)
                );
                assert!(job.sections.iter().any(|s| s.format.color == colors.option));
                assert!(job.sections.iter().any(|s| s.format.color == colors.number));
            }
        }
    }

    #[test]
    fn nested_unicode_math_and_incomplete_documents_are_all_editable() {
        for text in [
            "",
            "\\unknown@macro{привет}",
            "\\draw[fill=red!20,thick] (0,0) -- (2,3);\n",
            "$x^2 + \\alpha$ \\(\\frac{a}{b}\\) \\[y=1\\]",
            "\\node{ незакрытые {{ и $",
            "$🧪",
            "x\\r\n🧪\nбез конечной новой строки",
        ] {
            check_partition(text, &tokenize(text));
            let job = layout_job(
                text,
                FontId::monospace(14.0),
                palette(UiTheme::Midnight, Color32::LIGHT_GRAY),
                f32::INFINITY,
            );
            assert_eq!(job.text, text);
        }
    }

    #[test]
    fn original_6_geometry_metadata_stays_selectable_and_visible() {
        let lines = crate::tikz_authoring::TOOLS
            .into_iter()
            .enumerate()
            .map(|(id, tool)| generated(tool, id as u64 + 1))
            .collect::<Vec<_>>()
            .join("\n");
        let tokens = tokenize(&lines);
        check_partition(&lines, &tokens);
        assert_eq!(
            tokens.iter().filter(|t| t.kind == Kind::Metadata).count(),
            6
        );
        let job = layout_job(
            &lines,
            FontId::monospace(18.0),
            palette(UiTheme::Paper, Color32::BLACK),
            250.0,
        );
        assert_eq!(job.text, lines);
    }

    #[test]
    fn large_source_spans_do_not_multiply_per_character() {
        let text = "\\draw[red,thick] (1cm,2cm)--(3cm,4cm);\r\n".repeat(10_000);
        let tokens = tokenize(&text);
        check_partition(&text, &tokens);
        assert!(
            tokens.len() < text.len() / 2,
            "tokens should coalesce contiguous bytes"
        );
    }

    #[test]
    fn symbolic_paths_and_dimensions_have_distinct_exact_spans() {
        let source = r"\draw (1--2,3..4) 5|-6 7-|8 [-.5cm,+2.5pt,.25mm];";
        let tokens = tokenize(source);
        check_partition(source, &tokens);
        let slices = |kind| {
            tokens
                .iter()
                .filter(|part| part.kind == kind)
                .map(|part| &source[part.start..part.end])
                .collect::<Vec<_>>()
        };
        assert_eq!(slices(Kind::Operator), ["--", "..", "|-", "-|"]);
        assert!(slices(Kind::Number).contains(&"-.5cm"));
        assert!(slices(Kind::Number).contains(&"+2.5pt"));
        assert!(slices(Kind::Number).contains(&".25mm"));
    }

    #[test]
    fn environment_names_are_literal_utf8_slices_without_inventing_macro_expansion() {
        let source = "\\begin \r\n{align*}α\\end{align*} \\begin{\\custom} \\begin{unfinished";
        let tokens = tokenize(source);
        check_partition(source, &tokens);
        let names = tokens
            .iter()
            .filter(|part| part.kind == Kind::Environment)
            .map(|part| &source[part.start..part.end])
            .collect::<Vec<_>>();
        assert_eq!(names, ["align*", "align*"]);
        assert!(tokens.iter().any(|part| {
            part.kind == Kind::Command && &source[part.start..part.end] == "\\custom"
        }));
    }

    #[test]
    fn escaped_percent_parity_keeps_real_comment_boundaries_after_crlf() {
        let source = "\\% literal\r\n\\\\% comment two\r\n\\\\\\% literal three\r\n\\\\\\\\% comment four\r\n🧪";
        let tokens = tokenize(source);
        check_partition(source, &tokens);
        let comments = tokens
            .iter()
            .filter(|part| part.kind == Kind::Comment)
            .map(|part| &source[part.start..part.end])
            .collect::<Vec<_>>();
        assert_eq!(comments, ["% comment two\r", "% comment four\r"]);
    }

    #[test]
    fn inline_verb_is_opaque_with_unicode_delimiters_and_recovers_at_crlf() {
        for body in [
            "\\verb🧪% \\draw -- [123]🧪",
            "\\verb*|% \\catcode --|",
            "\\verb|unterminated % \\draw --",
        ] {
            let source = format!("{body}\r\n\\draw (0,0)--(1,1); % ordinary");
            let tokens = tokenize(&source);
            check_partition(&source, &tokens);
            assert_eq!(tokens[0].kind, Kind::Plain);
            assert_eq!(tokens[0].end, body.len() + 2);
            assert!(tokens.iter().any(|part| part.kind == Kind::Operator));
            assert_eq!(
                tokens
                    .iter()
                    .filter(|part| part.kind == Kind::Comment)
                    .count(),
                1
            );
        }
        let tokens = tokenize(r"\verbatim|% actual comment");
        assert!(tokens.iter().any(|part| part.kind == Kind::Comment));
    }

    #[test]
    fn literal_environments_keep_contents_opaque_and_resume_after_the_terminator() {
        for environment in [
            "verbatim",
            "verbatim*",
            "Verbatim",
            "Verbatim*",
            "lstlisting",
            "minted",
        ] {
            let opening = format!("\\begin{{{environment}}}");
            let body = "\r\n% lookalike \\catcode \\draw [1] -- 🧪\r\n";
            let source = format!("{opening}{body}\\end{{{environment}}}\r\n\\draw (1,2)--(3,4);");
            let tokens = tokenize(&source);
            check_partition(&source, &tokens);
            let content = tokens
                .iter()
                .find(|part| part.start == opening.len())
                .unwrap();
            assert_eq!(content.kind, Kind::Plain, "{environment}");
            assert_eq!(&source[content.start..content.end], body);
            assert!(
                !tokens
                    .iter()
                    .any(|part| matches!(part.kind, Kind::Comment | Kind::Metadata))
            );
            assert_eq!(
                tokens
                    .iter()
                    .filter(|part| part.kind == Kind::Operator)
                    .count(),
                1
            );
            let incomplete = format!("{opening}{body}");
            let tokens = tokenize(&incomplete);
            check_partition(&incomplete, &tokens);
            assert_eq!(tokens.last().unwrap().kind, Kind::Plain);
        }
    }

    #[test]
    fn explicit_catcode_changes_make_remaining_unknown_scope_plain_and_editable() {
        for command in ["\\catcode", "\\catcodetable", "\\setcatcodetable"] {
            let tail = "`\\%=12 }\r\n\\draw (0,0)--(1,1); % tikzarium:n1:[2,1,\"line\",{}]\r\n🧪";
            let source = format!("{{ {command}{tail}");
            let tokens = tokenize(&source);
            check_partition(&source, &tokens);
            let last = tokens.last().unwrap();
            assert_eq!(last.kind, Kind::Plain);
            assert_eq!(&source[last.start..last.end], tail);
            assert_eq!(
                layout_job(
                    &source,
                    FontId::monospace(14.0),
                    palette(UiTheme::Dark, Color32::WHITE),
                    80.0
                )
                .text,
                source
            );
        }
        for source in [
            "% \\catcode ignored\n\\draw (0,0)--(1,1);",
            "\\verb|\\catcode| \\draw (0,0)--(1,1);",
            "\\catcodeCustom \\draw (0,0)--(1,1);",
        ] {
            assert!(
                tokenize(source)
                    .iter()
                    .any(|part| part.kind == Kind::Operator)
            );
        }
    }

    #[test]
    fn ownership_requires_the_real_generated_command_and_string_values() {
        let real = generated(crate::tikz_authoring::Tool::Line, 17);
        let (command, payload) = real.split_once(crate::tikz_authoring::MARKER).unwrap();
        let mut invalid_json: serde_json::Value = serde_json::from_str(payload).unwrap();
        invalid_json[3] = serde_json::json!({"start_x": 99});
        let cases = [
            format!(
                "{}{}{}",
                command.replace("\\draw", "\\path"),
                crate::tikz_authoring::MARKER,
                payload
            ),
            format!("{command}{}{}", crate::tikz_authoring::MARKER, invalid_json),
            real.replace("[2,17,", "[99,17,"),
            real.replace("[2,17,", "[2,0,"),
            real.replace("\"line\"", "\"cubic\""),
            format!(
                "\\node{{{command}{}{}",
                crate::tikz_authoring::MARKER,
                payload
            ),
        ];
        for source in cases {
            let tokens = tokenize(&source);
            check_partition(&source, &tokens);
            assert!(
                !tokens.iter().any(|part| part.kind == Kind::Metadata),
                "{source}"
            );
            assert!(tokens.iter().any(|part| part.kind == Kind::Comment));
        }
        assert!(
            tokenize(&real)
                .iter()
                .any(|part| part.kind == Kind::Metadata)
        );
    }

    #[test]
    fn cache_reuses_tokens_for_idle_and_presentation_but_detects_same_allocation_edits() {
        let mut cache = SourceHighlightCache::default();
        let mut source = "\\draw[red] (1cm,2cm)--(3cm,4cm); % α\r\n".repeat(10_000);
        let first = cache.layout_job(
            &source,
            FontId::monospace(14.0),
            palette(UiTheme::Light, Color32::BLACK),
            500.0,
        );
        let token_allocation = cache.spans.as_ptr();
        assert_eq!(cache.lexer_passes, 1);
        for theme in UiTheme::ALL {
            for size in [12.0, 24.0] {
                for width in [180.0, f32::INFINITY] {
                    let job = cache.layout_job(
                        &source,
                        FontId::monospace(size),
                        palette(theme, Color32::GRAY),
                        width,
                    );
                    assert_eq!(job.text.as_bytes(), source.as_bytes());
                    assert_eq!(job.wrap.max_width, width);
                    assert!(
                        job.sections
                            .iter()
                            .all(|part| part.format.font_id.size == size)
                    );
                    assert_eq!(cache.spans.as_ptr(), token_allocation);
                    assert_eq!(cache.lexer_passes, 1);
                }
            }
        }
        let source_allocation = source.as_ptr();
        let at = source.find('α').unwrap();
        source.replace_range(at..at + 'α'.len_utf8(), "β");
        assert_eq!(source.as_ptr(), source_allocation);
        assert_eq!(source.len(), first.text.len());
        let changed = cache.layout_job(
            &source,
            FontId::monospace(14.0),
            palette(UiTheme::Light, Color32::BLACK),
            500.0,
        );
        assert_eq!(cache.lexer_passes, 2);
        assert_eq!(changed.text, source);
        assert_ne!(changed.text, first.text);
        let empty = cache.layout_job(
            "",
            FontId::monospace(14.0),
            palette(UiTheme::Light, Color32::BLACK),
            500.0,
        );
        assert!(empty.text.is_empty());
        assert!(cache.spans.is_empty());
        assert_eq!(cache.lexer_passes, 3);
    }

    #[test]
    fn all_syntax_and_metadata_colors_remain_readable_on_each_editor_theme() {
        fn luminance(color: Color32) -> f32 {
            let channel = |value: u8| {
                let value = f32::from(value) / 255.0;
                if value <= 0.04045 {
                    value / 12.92
                } else {
                    ((value + 0.055) / 1.055).powf(2.4)
                }
            };
            0.2126 * channel(color.r()) + 0.7152 * channel(color.g()) + 0.0722 * channel(color.b())
        }
        for theme in UiTheme::ALL {
            let ctx = egui::Context::default();
            theme.apply(&ctx, false);
            let style = ctx.style();
            let background = luminance(style.visuals.extreme_bg_color);
            let colors = palette(theme, style.visuals.widgets.inactive.text_color());
            for kind in [
                Kind::Command,
                Kind::Comment,
                Kind::Metadata,
                Kind::Option,
                Kind::Number,
                Kind::Delimiter,
                Kind::Math,
                Kind::Operator,
                Kind::Environment,
            ] {
                let foreground = luminance(colors.color(kind));
                let contrast =
                    (foreground.max(background) + 0.05) / (foreground.min(background) + 0.05);
                assert!(contrast >= 4.5, "{theme:?} {kind:?}: {contrast}");
            }
        }
    }

    fn cached_frame(
        ctx: &egui::Context,
        cache: &mut SourceHighlightCache,
        source: &str,
        font: FontId,
        colors: Palette,
        width: f32,
    ) -> Arc<egui::Galley> {
        let mut result = None;
        let _ = ctx.run(egui::RawInput::default(), |ctx| {
            egui::CentralPanel::default().show(ctx, |ui| {
                result = Some(cache.galley(ui, source, font.clone(), colors, width));
            });
        });
        result.unwrap()
    }

    #[test]
    fn galley_idle_reuses_arc_and_invalidates_source_presentation_dpi_and_font_atlas() {
        let ctx = egui::Context::default();
        let mut cache = SourceHighlightCache::default();
        let source = "\\draw[red] (1cm,2cm)--(3cm,4cm);\r\nЖ🧪";
        let colors = palette(UiTheme::Light, Color32::BLACK);
        let font = FontId::monospace(14.0);
        let first = cached_frame(&ctx, &mut cache, source, font.clone(), colors, 500.0);
        for _ in 0..5 {
            let idle = cached_frame(&ctx, &mut cache, source, font.clone(), colors, 500.0);
            assert!(Arc::ptr_eq(&first, &idle));
        }
        assert_eq!(cache.lexer_passes, 1);
        let recolored = cached_frame(
            &ctx,
            &mut cache,
            source,
            font.clone(),
            palette(UiTheme::Dark, Color32::WHITE),
            500.0,
        );
        assert!(!Arc::ptr_eq(&first, &recolored));
        let resized = cached_frame(
            &ctx,
            &mut cache,
            source,
            FontId::monospace(24.0),
            colors,
            500.0,
        );
        assert!(!Arc::ptr_eq(&recolored, &resized));
        let wrapped = cached_frame(&ctx, &mut cache, source, font.clone(), colors, 50.0);
        assert!(!Arc::ptr_eq(&resized, &wrapped));
        let baseline = cached_frame(&ctx, &mut cache, source, font.clone(), colors, 500.0);
        ctx.set_pixels_per_point(2.0);
        let scaled = cached_frame(&ctx, &mut cache, source, font.clone(), colors, 500.0);
        assert_eq!(ctx.pixels_per_point(), 2.0);
        assert!(!Arc::ptr_eq(&baseline, &scaled));
        assert_eq!(cache.lexer_passes, 1);
        let mut definitions = egui::FontDefinitions::default();
        let family = definitions.families[&egui::FontFamily::Monospace].clone();
        definitions
            .families
            .insert(egui::FontFamily::Name("generation-test".into()), family);
        ctx.set_fonts(definitions);
        let new_fonts = cached_frame(&ctx, &mut cache, source, font.clone(), colors, 500.0);
        assert!(!Arc::ptr_eq(&scaled, &new_fonts));
        assert_eq!(cache.lexer_passes, 1);
        let changed = source.replace('Ж', "Я");
        let edited = cached_frame(&ctx, &mut cache, &changed, font.clone(), colors, 500.0);
        assert!(!Arc::ptr_eq(&new_fonts, &edited));
        assert_eq!(edited.job.text.as_bytes(), changed.as_bytes());
        assert_eq!(cache.lexer_passes, 2);
        let empty = cached_frame(&ctx, &mut cache, "", FontId::monospace(24.0), colors, 500.0);
        assert!(empty.job.text.is_empty());
        assert_eq!(empty.job.sections[0].format.font_id.size, 24.0);
        assert_eq!(cache.lexer_passes, 3);
    }

    /// Reproducible local CPU timings, not a native key-to-frame G3 claim.
    /// Run an otherwise idle process with:
    /// cargo test -p tikzarium-app local_cpu_highlight_cost -- --ignored --nocapture
    /// The profile, CPU and renderer/native timings must be recorded separately.
    #[test]
    #[ignore = "manual local CPU benchmark; allocates 100k-line stress fixtures"]
    fn local_cpu_highlight_cost() {
        use std::{hint::black_box, mem::size_of, time::Instant};
        fn measure(label: &str, repetitions: usize, mut operation: impl FnMut()) {
            let mut times = Vec::new();
            for _ in 0..repetitions {
                let start = Instant::now();
                operation();
                times.push(start.elapsed().as_secs_f64() * 1000.0);
            }
            times.sort_by(f64::total_cmp);
            println!(
                "{label}: median_ms={:.3} min_ms={:.3} max_ms={:.3} n={repetitions}",
                times[times.len() / 2],
                times[0],
                times[times.len() - 1]
            );
        }
        let colors = palette(UiTheme::Midnight, Color32::WHITE);
        let font = FontId::monospace(14.0);
        let owned = generated(crate::tikz_authoring::Tool::Line, 1);
        let mut plain = String::from("\\draw[red,thick] (1cm,2cm)--(3cm,4cm); % preserved ");
        plain.push_str(&"x".repeat(80 - plain.len() - "α\r\n".len()));
        plain.push_str("α\r\n");
        println!(
            "profile_debug_assertions={} owned_line_bytes={} layout_section_bytes={} span_bytes={}",
            cfg!(debug_assertions),
            owned.len(),
            size_of::<egui::text::LayoutSection>(),
            size_of::<Span>()
        );
        for lines in [10_000, 100_000] {
            for mixed in [false, true] {
                let mut source = String::new();
                for number in 0..lines {
                    if mixed && number % 20 == 0 {
                        source.push_str(&owned);
                        source.push_str("\r\n");
                    } else {
                        source.push_str(&plain);
                    }
                }
                assert!(source.len() <= lines * 104);
                let label = format!("lines={lines} mixed={mixed} bytes={}", source.len());
                let repeats = if lines == 10_000 { 5 } else { 3 };
                measure(&format!("{label} tokenize"), repeats, || {
                    black_box(tokenize(black_box(&source)));
                });
                let mut cache = SourceHighlightCache::default();
                black_box(cache.layout_job(&source, font.clone(), colors, f32::INFINITY));
                println!(
                    "{label} spans={} sections={} owned_markers={} section_storage_bytes={}",
                    cache.spans.len(),
                    cache.layout.sections.len(),
                    cache
                        .spans
                        .iter()
                        .filter(|span| span.kind == Kind::Metadata)
                        .count(),
                    cache.layout.sections.len() * size_of::<egui::text::LayoutSection>()
                );
                measure(&format!("{label} idle_cached_clone"), repeats, || {
                    black_box(cache.layout_job(
                        black_box(&source),
                        font.clone(),
                        colors,
                        f32::INFINITY,
                    ));
                });
                let mut width = 500.0;
                measure(&format!("{label} presentation_width"), repeats, || {
                    width += 1.0;
                    black_box(cache.layout_job(&source, font.clone(), colors, width));
                });
                let mut alternate = false;
                let at = source.rfind('α').unwrap();
                measure(&format!("{label} one_character_edit"), repeats, || {
                    alternate = !alternate;
                    source.replace_range(at..at + 2, if alternate { "β" } else { "α" });
                    black_box(cache.layout_job(&source, font.clone(), colors, width));
                });
            }
        }
        for lines in [10_000, 100_000] {
            let mut source = plain.repeat(lines);
            let ctx = egui::Context::default();
            let mut cache = SourceHighlightCache::default();
            let label = format!("galley lines={lines} bytes={}", source.len());
            let start = Instant::now();
            black_box(cached_frame(
                &ctx,
                &mut cache,
                &source,
                font.clone(),
                colors,
                f32::INFINITY,
            ));
            println!(
                "{label} initial_ms={:.3}",
                start.elapsed().as_secs_f64() * 1000.0
            );
            measure(&format!("{label} idle"), 5, || {
                black_box(cached_frame(
                    &ctx,
                    &mut cache,
                    &source,
                    font.clone(),
                    colors,
                    f32::INFINITY,
                ));
            });
            let at = source.rfind('α').unwrap();
            source.replace_range(at..at + 2, "β");
            let start = Instant::now();
            black_box(cached_frame(
                &ctx,
                &mut cache,
                &source,
                font.clone(),
                colors,
                f32::INFINITY,
            ));
            println!(
                "{label} first_edit_after_idle_ms={:.3}",
                start.elapsed().as_secs_f64() * 1000.0
            );
            let mut alternate = false;
            measure(&format!("{label} sequential_edit"), 3, || {
                alternate = !alternate;
                source.replace_range(at..at + 2, if alternate { "α" } else { "β" });
                black_box(cached_frame(
                    &ctx,
                    &mut cache,
                    &source,
                    font.clone(),
                    colors,
                    f32::INFINITY,
                ));
            });
        }
        for count in [10_000, 100_000] {
            for line in [
                "\\begin{unfinished\r\n",
                "\\begin             \r\n",
                "\\begin{unfinished \\begin{unfinished\r\n",
            ] {
                let source = line.repeat(count);
                measure(
                    &format!("incomplete_begin count={count} line_bytes={}", line.len()),
                    3,
                    || {
                        black_box(tokenize(black_box(&source)));
                    },
                );
            }
        }
    }
}
