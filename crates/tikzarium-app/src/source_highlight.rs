//! Source-only TeX/TikZ syntax presentation for the real editable egui TextEdit.
//!
//! The lexer never changes source text, TeX catcodes, ownership annotations,
//! byte offsets, caret positions or the build contract. Unrecognized input is
//! deliberately ordinary editable text, not a parser error or disabled control.
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

fn is_owned_marker(line_before: &str, comment: &str) -> bool {
    let prefix = line_before.trim();
    if !prefix.ends_with(';') {
        return false;
    }
    let starts_with_owned_command = ["\\draw", "\\path", "\\node"].iter().any(|command| {
        prefix.strip_prefix(command).is_some_and(|tail| {
            tail.chars()
                .next()
                .is_some_and(|c| matches!(c, ' ' | '[' | '('))
        })
    });
    if !starts_with_owned_command {
        return false;
    }
    let Some(payload) = comment
        .trim_end_matches(|c| c == '\r' || c == '\n')
        .strip_prefix("% tikzarium:n1:")
    else {
        return false;
    };
    let Ok(serde_json::Value::Array(items)) = serde_json::from_str::<serde_json::Value>(payload)
    else {
        return false;
    };
    items.len() == 4
        && items[0].as_u64() == Some(2)
        && items[1].as_u64().is_some_and(|id| id > 0)
        && items[2].as_str().is_some_and(|kind| {
            matches!(
                kind,
                "line" | "arrow" | "rectangle" | "circle" | "node" | "bezier"
            )
        })
        && items[3].is_object()
}

/// A deliberately small non-expanding lexer. Every token is an exact slice of
/// the original input and the spans partition the buffer without gaps.
pub(crate) fn tokenize(source: &str) -> Vec<Span> {
    let mut spans = Vec::new();
    let mut i = 0;
    let mut line_start = 0;
    let mut options = 0usize;
    let mut verbatim_end: Option<&'static str> = None;
    while i < source.len() {
        if let Some(ending) = verbatim_end {
            if let Some(offset) = source[i..].find(ending) {
                let end = i + offset + ending.len();
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
            continue;
        }

        if source.as_bytes()[i] == b'\\' {
            let blocks = [
                ("\\begin{verbatim}", "\\end{verbatim}"),
                ("\\begin{Verbatim}", "\\end{Verbatim}"),
                ("\\begin{lstlisting}", "\\end{lstlisting}"),
            ];
            if let Some((begin, end)) = blocks
                .iter()
                .find(|(begin, _)| source[i..].starts_with(begin))
            {
                span(&mut spans, i, i + begin.len(), Kind::Plain);
                verbatim_end = Some(end);
                i += begin.len();
                continue;
            }

            // \verb consumes its next delimiter literally; comments and TeX
            // controls inside it must never be interpreted as owner markers.
            if source[i..].starts_with("\\verb") {
                let mut offset = i + "\\verb".len();
                if source[offset..].starts_with('*') {
                    offset += 1;
                }
                if offset < source.len() {
                    let delimiter = source[offset..].chars().next().expect("UTF-8");
                    if !delimiter.is_ascii_alphabetic() && delimiter != '\n' && delimiter != '\r' {
                        let after = offset + delimiter.len_utf8();
                        let end = source[after..]
                            .find(|c| c == delimiter || c == '\n')
                            .map(|position| {
                                let at = after + position;
                                if source[at..].starts_with(delimiter) {
                                    at + delimiter.len_utf8()
                                } else {
                                    at
                                }
                            })
                            .unwrap_or(source.len());
                        if end > i {
                            span(&mut spans, i, end, Kind::Plain);
                            i = end;
                            continue;
                        }
                    }
                }
            }

            let end = tex_command_end(source, i);
            let kind = if matches!(&source[i..end], "\\(" | "\\)" | "\\[" | "\\]") {
                Kind::Math
            } else {
                Kind::Command
            };
            span(&mut spans, i, end, kind);
            i = end;
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
                let mut end = i;
                while end < source.len() {
                    match source.as_bytes()[end] {
                        b'0'..=b'9' | b'.' | b'+' | b'-' => end += 1,
                        b'a'..=b'z' | b'A'..=b'Z' => end += 1,
                        _ => break,
                    }
                }
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

#[derive(Clone, Copy)]
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
/// No hidden fold, normalization, source mapping or catcode assumption.
pub(crate) fn layout_job(
    source: &str,
    font: FontId,
    colors: Palette,
    max_width: f32,
) -> egui::text::LayoutJob {
    let mut job =
        egui::text::LayoutJob::simple(String::new(), font.clone(), colors.plain, max_width);
    for part in tokenize(source) {
        job.append(
            &source[part.start..part.end],
            0.0,
            egui::TextFormat {
                font_id: font.clone(),
                color: colors.color(part.kind),
                ..Default::default()
            },
        );
    }
    job
}

#[cfg(test)]
mod tests {
    use super::*;

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
        let text = "\\draw (0,0) -- (1,1); % tikzarium:n1:[2,1,\"line\",{\"end_x\":\"1cm\"}]\r\n% тикзарий\r\n";
        let tokens = tokenize(text);
        check_partition(text, &tokens);
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
        let lines = [
            "\\draw[thick] (1cm,2cm) -- (3cm,4cm); % tikzarium:n1:[2,1,\"line\",{}]",
            "\\draw[-{Stealth}] (0,0)--(1,1); % tikzarium:n1:[2,2,\"arrow\",{}]",
            "\\draw (0,0) rectangle (2,3); % tikzarium:n1:[2,3,\"rectangle\",{}]",
            "\\draw (1,1) circle[radius=1cm]; % tikzarium:n1:[2,4,\"circle\",{}]",
            "\\node at (0,0) {Test}; % tikzarium:n1:[2,5,\"node\",{}]",
            "\\draw (0,0)..controls(1,1)and(2,2)..(3,3); % tikzarium:n1:[2,6,\"bezier\",{}]",
        ]
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
}
