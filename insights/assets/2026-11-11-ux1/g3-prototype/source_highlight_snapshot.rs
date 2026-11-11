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
pub(crate) fn layout_job(
    source: &str,
    font: FontId,
    colors: Palette,
    max_width: f32,
) -> egui::text::LayoutJob {
    layout_spans(source, &tokenize(source), font, colors, max_width)
}

pub(crate) fn layout_spans(
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
    lexer_passes: usize,
}

impl SourceHighlightCache {
    fn prepare(&mut self, source: &str, font: FontId, colors: Palette, max_width: f32) {
        if self.source != source {
            self.spans = tokenize(source);
            self.source.clear();
            self.source.push_str(source);
            self.presentation = None;
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
