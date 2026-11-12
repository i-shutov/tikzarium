//! Conservative, bounded lexical recognition of existing scientific TikZ sources.
//! No TeX macro expansion, PDF inversion, scene graph, or compiler invocation.
//! "Lexical" identifies only a byte span; it does not certify visual editability.
use crate::primitive_edit::SourceTarget;
use crate::primitives::SourcePatch;
use sha2::{Digest, Sha256};
use std::ops::Range;
use thiserror::Error;

/// This is a private additive descriptor overlay; existing catalog-v1 tools
/// and their documented defaults are not modified.
pub const SCIENTIFIC_PROPERTY_SCHEMA: &str = "scientific.source-v1";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScientificPropertyHelp {
    pub key: &'static str,
    pub value_type: &'static str,
    pub effect: &'static str,
    pub editor_limit: &'static str,
    pub example: &'static str,
    pub package: &'static str,
    pub verified_tex_default: &'static str,
    pub manual_section: &'static str,
}

/// Exact semantics are limited to user-supplied literal keys, not theoretical
/// PGFPlots defaults. In particular the adapter's bound is not a TeX default.
#[must_use]
pub fn scientific_property_help(key: &str) -> Option<ScientificPropertyHelp> {
    match key {
        "samples" => Some(ScientificPropertyHelp {
            key: "samples",
            value_type: "Целое число",
            effect: "Число точек дискретизации вычисляемого графика PGFPlots.",
            editor_limit: "Адаптер принимает только целое значение от 2 до 4096; это не ограничение самого TeX.",
            example: "samples=150",
            package: "pgfplots",
            verified_tex_default: "UNKNOWN",
            manual_section: "UNKNOWN — конкретная редакция руководства не проверена",
        }),
        "domain" => Some(ScientificPropertyHelp {
            key: "domain",
            value_type: "Пара числовых границ x_min:x_max",
            effect: "Диапазон аргумента для выборки функций PGFPlots.",
            editor_limit: "Адаптер принимает две конечные числовые границы, без макросов и вычислений Rust.",
            example: "domain=-3:3",
            package: "pgfplots",
            verified_tex_default: "UNKNOWN",
            manual_section: "UNKNOWN — конкретная редакция руководства не проверена",
        }),
        "xmin" | "xmax" | "ymin" | "ymax" => {
            let (name, effect, example) = match key {
                "xmin" => ("xmin", "Левая граница оси x.", "xmin=0"),
                "xmax" => ("xmax", "Правая граница оси x.", "xmax=1080"),
                "ymin" => ("ymin", "Нижняя граница оси y.", "ymin=0"),
                "ymax" => ("ymax", "Верхняя граница оси y.", "ymax=1.4"),
                _ => unreachable!("axis-bound whitelist"),
            };
            Some(ScientificPropertyHelp {
                key: name,
                value_type: "Конечное десятичное число",
                effect,
                editor_limit: "Только явные десятичные литералы в axis; макросы, inf и выражения сохраняются без изменений.",
                example,
                package: "pgfplots",
                verified_tex_default: "UNKNOWN",
                manual_section: "UNKNOWN — редакция руководства PGFPlots не проверена",
            })
        }
        "xtick distance" | "ytick distance" => {
            let (description, example) = if key == "xtick distance" {
                (
                    "Шаг автоматически расставляемых делений оси x.",
                    "xtick distance=1",
                )
            } else {
                (
                    "Шаг автоматически расставляемых делений оси y.",
                    "ytick distance=0.5",
                )
            };
            Some(ScientificPropertyHelp {
                key: if key == "xtick distance" {
                    "xtick distance"
                } else {
                    "ytick distance"
                },
                value_type: "Положительное конечное число",
                effect: description,
                editor_limit: "Только явный положительный литерал; отклоняются макросы и слишком плотные шаги.",
                example,
                package: "pgfplots",
                verified_tex_default: "UNKNOWN",
                manual_section: "PGFPlots 1.18.2 §4.15.1 (версия окружения ещё не подтверждена)",
            })
        }
        "width" | "height" => Some(ScientificPropertyHelp {
            key: if key == "width" { "width" } else { "height" },
            value_type: "Число с явной размерностью",
            effect: "Физический размер области графика, не масштабирование шрифтов подписей.",
            editor_limit: "Остаётся неизменной исходная единица; поддерживаются pt, cm, mm, in, em, ex и множители \\textwidth/\\linewidth.",
            example: "height=0.62\\textwidth",
            package: "pgfplots",
            verified_tex_default: "UNKNOWN",
            manual_section: "PGFPlots 1.18.2 §4.10 (версия окружения ещё не подтверждена)",
        }),
        "mark" => Some(ScientificPropertyHelp {
            key: "mark",
            value_type: "Метка точки из проверенного списка",
            effect: "Изменяет вид маркеров ряда или явного стиля всех рядов.",
            editor_limit: "Только none, *, +, x и простые метки с уже подключенной plotmarks; внешние произвольные макросы OPAQUE.",
            example: "mark=none",
            package: "pgfplots",
            verified_tex_default: "UNKNOWN",
            manual_section: "PGFPlots 1.18.2 §4.7.1 (версия окружения ещё не подтверждена)",
        }),
        "xtick" | "ytick" => Some(ScientificPropertyHelp {
            key: if key == "xtick" { "xtick" } else { "ytick" },
            value_type: "Буквальный список числовых координат",
            effect: "Задаёт явно выбранные координаты делений соответствующей оси.",
            editor_limit: "Только {0,1,2} и подобные списки до 64 чисел; \\empty, data, макросы и выражения OPAQUE.",
            example: "xtick={0,1,2}",
            package: "pgfplots",
            verified_tex_default: "UNKNOWN",
            manual_section: "PGFPlots 1.18.2 §4.15.1 (версия окружения ещё не подтверждена)",
        }),
        "xlabel" | "ylabel" => Some(ScientificPropertyHelp {
            key: if key == "xlabel" { "xlabel" } else { "ylabel" },
            value_type: "Литеральная подпись оси",
            effect: "Только обычный текст, уже заключённый в фигурные скобки.",
            editor_limit: "Не раскрывает TeX math, кириллические макросы, $...$, комментарии или вложенные группы; такие подписи остаются OPAQUE.",
            example: "xlabel={Время}",
            package: "pgfplots",
            verified_tex_default: "UNKNOWN",
            manual_section: "UNKNOWN — точное руководство для текста/шрифтов не сверено",
        }),
        _ => None,
    }
}

pub const MAX_SCIENTIFIC_SOURCE_BYTES: usize = 2 * 1024 * 1024;
pub const MAX_SCIENTIFIC_INSTANCES: usize = 2048;
const MAX_GROUP_DEPTH: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScientificKind {
    Axis,
    AddPlot,
    Draw,
    Path,
    Fill,
    Clip,
    Node,
    Coordinate,
    Pic,
    Dimline,
    ForeachOpaque,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RecognitionConfidence {
    /// Exact lexical occurrence, NOT a guarantee that TeX macros can be edited.
    Lexical,
    /// A construct depends on a macro, loop, or grammar not proven editable.
    Opaque,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecognizedInstance {
    pub kind: ScientificKind,
    pub range: Range<usize>,
    /// Byte range excluding the outer [] of the literal option group.
    pub option_range: Option<Range<usize>>,
    /// Index of the parent axis in the returned instance collection.
    pub parent_axis: Option<usize>,
    pub confidence: RecognitionConfidence,
    pub revision: u64,
    source_sha256: [u8; 32],
}

impl RecognizedInstance {
    #[must_use]
    pub fn source_target(&self) -> SourceTarget {
        SourceTarget::new(self.range.clone(), self.revision)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct SourceView<'a> {
    pub text: &'a str,
    pub revision: u64,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ScanRefusal {
    #[error("source exceeds the bounded scanner size")]
    SourceTooLarge,
    #[error("too many recognized TikZ constructs")]
    TooManyInstances,
    #[error("opaque TeX catcode / csname control inside a picture")]
    UnsupportedTeXControl,
    #[error("unbalanced or unsupported TikZ source grouping")]
    UnbalancedSource,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum EditRefusal {
    #[error("source revision or original bytes changed")]
    SourceConflict,
    #[error("unrecognized or unverifiable key/value")]
    Opaque,
    #[error("this key is outside the reviewed literal editor")]
    UnsupportedKey,
    #[error("the selected option occurs more than once")]
    AmbiguousKey,
    #[error("replacement is not a safe supported literal")]
    InvalidLiteral,
}

pub struct LiteralEditRequest<'a> {
    pub view: SourceView<'a>,
    pub instance: &'a RecognizedInstance,
    pub key: &'a str,
    pub expected_old: &'a str,
    pub replacement: &'a str,
}

struct Group {
    inside: Range<usize>,
    next: usize,
}

fn fingerprint(text: &str) -> [u8; 32] {
    Sha256::digest(text.as_bytes()).into()
}

fn whitespace_and_comments(text: &str, mut i: usize) -> usize {
    let bytes = text.as_bytes();
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
    let b = text.as_bytes();
    let mut i = pos + 1;
    if i >= b.len() {
        return ("", b.len());
    }
    if !b[i].is_ascii_alphabetic() && b[i] != b'@' {
        return ("", (i + 1).min(b.len()));
    }
    let start = i;
    while i < b.len() && (b[i].is_ascii_alphabetic() || b[i] == b'@') {
        i += 1;
    }
    (&text[start..i], i)
}

/// Exact balanced braces/brackets; TeX escaped delimiters are ignored.
/// Other TeX catcodes are deliberately not interpreted.
fn group_at(text: &str, pos: usize) -> Option<Group> {
    let b = text.as_bytes();
    let outer = *b.get(pos)?;
    if outer != b'[' && outer != b'{' {
        return None;
    }
    let mut stack = vec![if outer == b'[' { b']' } else { b'}' }];
    let mut i = pos + 1;
    while i < b.len() {
        match b[i] {
            b'\\' => {
                i += if i + 1 < b.len() { 2 } else { 1 };
            }
            b'%' => {
                while i < b.len() && b[i] != b'\n' {
                    i += 1;
                }
            }
            b'{' | b'[' => {
                if stack.len() >= MAX_GROUP_DEPTH {
                    return None;
                }
                stack.push(if b[i] == b'{' { b'}' } else { b']' });
                i += 1;
            }
            b'}' | b']' => {
                if stack.pop()? != b[i] {
                    return None;
                }
                if stack.is_empty() {
                    return Some(Group {
                        inside: pos + 1..i,
                        next: i + 1,
                    });
                }
                i += 1;
            }
            _ => i += 1,
        }
    }
    None
}

fn environment_at(text: &str, from: usize) -> Option<(&str, usize)> {
    let p = whitespace_and_comments(text, from);
    let group = group_at(text, p)?;
    if text.as_bytes()[p] != b'{' {
        return None;
    }
    Some((text.get(group.inside)?.trim(), group.next))
}

fn trailing_options(text: &str, from: usize) -> Result<(Option<Range<usize>>, usize), ScanRefusal> {
    let p = whitespace_and_comments(text, from);
    if text.as_bytes().get(p) != Some(&b'[') {
        return Ok((None, from));
    }
    let group = group_at(text, p).ok_or(ScanRefusal::UnbalancedSource)?;
    Ok((Some(group.inside), group.next))
}

fn command_semicolon(text: &str, from: usize) -> Option<usize> {
    let b = text.as_bytes();
    let mut stack: Vec<u8> = Vec::new();
    let mut i = from;
    while i < b.len() {
        match b[i] {
            b'\\' => i += if i + 1 < b.len() { 2 } else { 1 },
            b'%' => {
                while i < b.len() && b[i] != b'\n' {
                    i += 1;
                }
            }
            b'{' | b'[' => {
                if stack.len() >= MAX_GROUP_DEPTH {
                    return None;
                }
                stack.push(if b[i] == b'{' { b'}' } else { b']' });
                i += 1;
            }
            b'}' | b']' => {
                if stack.pop()? != b[i] {
                    return None;
                }
                i += 1;
            }
            b';' if stack.is_empty() => return Some(i + 1),
            _ => i += 1,
        }
    }
    None
}

fn skip_macro_body(text: &str, from: usize, bodies: usize) -> Option<usize> {
    let b = text.as_bytes();
    let mut i = from;
    for _ in 0..bodies {
        let limit = (i + 4096).min(b.len());
        while i < limit && b[i] != b'{' {
            if b[i] == b'%' {
                while i < limit && b[i] != b'\n' {
                    i += 1;
                }
            } else if b[i] == b'\\' {
                i += if i + 1 < limit { 2 } else { 1 };
            } else {
                i += 1;
            }
        }
        if i >= limit {
            return None;
        }
        i = group_at(text, i)?.next;
    }
    Some(i)
}

/// A \newcommand may use either \foo or {\foo}, with optional [arity]
/// and [default] groups before its real definition body. Skip exactly that
/// body, never the next unrelated user command.
fn skip_newcommand_body(text: &str, from: usize) -> Option<usize> {
    let b = text.as_bytes();
    let mut i = whitespace_and_comments(text, from);
    if b.get(i) == Some(&b'*') {
        i += 1;
        i = whitespace_and_comments(text, i);
    }
    if b.get(i) == Some(&b'{') {
        i = group_at(text, i)?.next;
    } else if b.get(i) == Some(&b'\\') {
        i = command_at(text, i).1;
    } else {
        return None;
    }
    for _ in 0..2 {
        i = whitespace_and_comments(text, i);
        if b.get(i) == Some(&b'[') {
            i = group_at(text, i)?.next;
        }
    }
    i = whitespace_and_comments(text, i);
    if b.get(i) != Some(&b'{') {
        return None;
    }
    Some(group_at(text, i)?.next)
}

fn add(
    out: &mut Vec<RecognizedInstance>,
    instance: RecognizedInstance,
) -> Result<usize, ScanRefusal> {
    if out.len() >= MAX_SCIENTIFIC_INSTANCES {
        return Err(ScanRefusal::TooManyInstances);
    }
    let index = out.len();
    out.push(instance);
    Ok(index)
}

/// Only recognizes commands literally in one TikZ picture. Bodies of
/// \def/\foreach are skipped to avoid claiming one edit represents one
/// invocation of an opaque macro or repeated draw command.
pub fn scan_scientific_source(
    view: SourceView<'_>,
) -> Result<Vec<RecognizedInstance>, ScanRefusal> {
    let text = view.text;
    if text.len() > MAX_SCIENTIFIC_SOURCE_BYTES {
        return Err(ScanRefusal::SourceTooLarge);
    }
    let b = text.as_bytes();
    let sha = fingerprint(text);
    let mut out = Vec::new();
    let mut i = 0;
    let mut picture_depth = 0usize;
    let mut axis_stack: Vec<usize> = Vec::new();
    while i < b.len() {
        if b[i] == b'%' {
            while i < b.len() && b[i] != b'\n' {
                i += 1;
            }
            continue;
        }
        if b[i] != b'\\' {
            i += 1;
            continue;
        }
        let start = i;
        let (word, next) = command_at(text, i);
        i = next;
        // Scope and catcode safety apply to the preamble too. Otherwise a
        // macro definition containing a literal tikzpicture could fabricate
        // an editable picture even though it was never executed.
        if matches!(
            word,
            "catcode" | "csname" | "newenvironment" | "renewenvironment" | "string" | "detokenize"
        ) {
            // These controls can turn apparent picture/axis commands into
            // definition bodies or printed text. Until their source-editing
            // grammar is supported, never grant ownership of those spans.
            return Err(ScanRefusal::UnsupportedTeXControl);
        }
        if word == "verb" || word == "lstinline" {
            let delimiter = *b.get(i).ok_or(ScanRefusal::UnbalancedSource)?;
            i += 1;
            while i < b.len() && b[i] != delimiter {
                i += 1;
            }
            if i >= b.len() {
                return Err(ScanRefusal::UnbalancedSource);
            }
            i += 1;
            continue;
        }
        if matches!(word, "def" | "gdef" | "edef" | "xdef") {
            i = skip_macro_body(text, next, 1).ok_or(ScanRefusal::UnbalancedSource)?;
            continue;
        }
        if matches!(
            word,
            "newcommand" | "renewcommand" | "providecommand" | "DeclareRobustCommand"
        ) {
            i = skip_newcommand_body(text, next).ok_or(ScanRefusal::UnbalancedSource)?;
            continue;
        }
        if matches!(
            word,
            "tikzset" | "pgfplotsset" | "pgfkeys" | "pgfmathsetmacro"
        ) {
            i = skip_macro_body(text, next, 1).ok_or(ScanRefusal::UnbalancedSource)?;
            continue;
        }
        if word == "pgfmathdeclarefunction" {
            i = skip_macro_body(text, next, 3).ok_or(ScanRefusal::UnbalancedSource)?;
            continue;
        }
        if word == "foreach" && picture_depth == 0 {
            i = skip_macro_body(text, next, 2).ok_or(ScanRefusal::UnbalancedSource)?;
            continue;
        }
        if (word == "begin" || word == "end")
            && let Some((env, end)) = environment_at(text, next)
        {
            match (word, env) {
                ("begin", "tikzpicture") => {
                    picture_depth += 1;
                    i = end;
                    continue;
                }
                ("end", "tikzpicture") => {
                    picture_depth = picture_depth.saturating_sub(1);
                    axis_stack.clear();
                    i = end;
                    continue;
                }
                ("end", "axis") if picture_depth > 0 => {
                    axis_stack.pop();
                    i = end;
                    continue;
                }
                ("begin", "axis") if picture_depth > 0 => {
                    let (options, finish) = trailing_options(text, end)?;
                    let index = add(
                        &mut out,
                        RecognizedInstance {
                            kind: ScientificKind::Axis,
                            range: start..finish,
                            option_range: options,
                            parent_axis: axis_stack.last().copied(),
                            confidence: RecognitionConfidence::Lexical,
                            revision: view.revision,
                            source_sha256: sha,
                        },
                    )?;
                    axis_stack.push(index);
                    i = finish;
                    continue;
                }
                ("begin", "verbatim" | "lstlisting" | "minted") => {
                    let closing = format!("\\end{{{env}}}");
                    let rest = text.get(end..).ok_or(ScanRefusal::UnbalancedSource)?;
                    let delta = rest.find(&closing).ok_or(ScanRefusal::UnbalancedSource)?;
                    i = end + delta + closing.len();
                    continue;
                }
                _ => {}
            }
        }
        if picture_depth == 0 {
            continue;
        }
        if word == "foreach" {
            let finish = skip_macro_body(text, next, 2).ok_or(ScanRefusal::UnbalancedSource)?;
            add(
                &mut out,
                RecognizedInstance {
                    kind: ScientificKind::ForeachOpaque,
                    range: start..finish,
                    option_range: None,
                    parent_axis: axis_stack.last().copied(),
                    confidence: RecognitionConfidence::Opaque,
                    revision: view.revision,
                    source_sha256: sha,
                },
            )?;
            i = finish;
            continue;
        }
        let kind = match word {
            "addplot" if !axis_stack.is_empty() => ScientificKind::AddPlot,
            "draw" => ScientificKind::Draw,
            "path" => ScientificKind::Path,
            "fill" => ScientificKind::Fill,
            "clip" => ScientificKind::Clip,
            "node" => ScientificKind::Node,
            "coordinate" => ScientificKind::Coordinate,
            "pic" => ScientificKind::Pic,
            "dimline" => ScientificKind::Dimline,
            _ => continue,
        };
        let mut after = next;
        if kind == ScientificKind::AddPlot && b.get(after) == Some(&b'+') {
            after += 1;
        }
        let (options, _) = trailing_options(text, after)?;
        let finish = command_semicolon(text, after).ok_or(ScanRefusal::UnbalancedSource)?;
        add(
            &mut out,
            RecognizedInstance {
                kind,
                range: start..finish,
                option_range: options,
                parent_axis: axis_stack.last().copied(),
                confidence: RecognitionConfidence::Lexical,
                revision: view.revision,
                source_sha256: sha,
            },
        )?;
        i = finish;
    }
    if picture_depth != 0 || !axis_stack.is_empty() {
        return Err(ScanRefusal::UnbalancedSource);
    }
    Ok(out)
}

fn trimmed(text: &str, mut range: Range<usize>) -> Range<usize> {
    while range.start < range.end && text.as_bytes()[range.start].is_ascii_whitespace() {
        range.start += 1;
    }
    while range.end > range.start && text.as_bytes()[range.end - 1].is_ascii_whitespace() {
        range.end -= 1;
    }
    range
}

fn components(text: &str, content: Range<usize>) -> Result<Vec<Range<usize>>, EditRefusal> {
    let b = text.as_bytes();
    let mut parts = Vec::new();
    let mut start = content.start;
    let mut i = start;
    while i < content.end {
        match b[i] {
            b'\\' => i += if i + 1 < content.end { 2 } else { 1 },
            b'%' => {
                while i < content.end && b[i] != b'\n' {
                    i += 1;
                }
            }
            b'{' | b'[' => {
                i = group_at(text, i).ok_or(EditRefusal::Opaque)?.next;
                if i > content.end {
                    return Err(EditRefusal::Opaque);
                }
            }
            b',' => {
                parts.push(trimmed(text, start..i));
                start = i + 1;
                i += 1;
            }
            b'}' | b']' => return Err(EditRefusal::Opaque),
            _ => i += 1,
        }
    }
    parts.push(trimmed(text, start..content.end));
    Ok(parts)
}

fn locate_key(
    text: &str,
    content: Range<usize>,
    owner: ScientificKind,
    wanted: &str,
    depth: usize,
    hits: &mut Vec<Range<usize>>,
) -> Result<(), EditRefusal> {
    if depth > 8 {
        return Err(EditRefusal::Opaque);
    }
    for segment in components(text, content)? {
        let b = text.as_bytes();
        let mut p = segment.start;
        let mut equals = None;
        while p < segment.end {
            match b[p] {
                b'\\' => p += if p + 1 < segment.end { 2 } else { 1 },
                b'{' | b'[' => {
                    p = group_at(text, p).ok_or(EditRefusal::Opaque)?.next;
                }
                b'=' => {
                    equals = Some(p);
                    break;
                }
                _ => p += 1,
            }
        }
        let Some(eq) = equals else {
            continue;
        };
        let key = trimmed(text, segment.start..eq);
        let value = trimmed(text, eq + 1..segment.end);
        let actual_key = text.get(key).ok_or(EditRefusal::Opaque)?;
        if actual_key == wanted {
            hits.push(value);
            continue;
        }
        // Only these axis-owned plot styles have the reviewed plot-property
        // meaning. A legend/node/custom style can contain the same key with
        // a different owner; descending into it would silently edit another
        // object. Do not recurse further into styles nested inside a plot.
        if owner == ScientificKind::Axis
            && depth == 0
            && matches!(wanted, "samples" | "domain" | "mark")
            && matches!(
                actual_key,
                "every axis plot/.style"
                    | "every axis plot/.append style"
                    | "every axis plot post/.style"
                    | "every axis plot post/.append style"
            )
            && text.as_bytes().get(value.start) == Some(&b'{')
        {
            let nested = group_at(text, value.start).ok_or(EditRefusal::Opaque)?;
            if nested.next == value.end {
                locate_key(text, nested.inside, owner, wanted, depth + 1, hits)?;
            }
        }
    }
    Ok(())
}

fn finite_decimal_literal(value: &str) -> bool {
    // Reject macro syntax, comma decimal, arbitrary math and huge numbers.
    !value.is_empty()
        && value.len() <= 32
        && value
            .bytes()
            .all(|ch| ch.is_ascii_digit() || matches!(ch, b'.' | b'-' | b'+'))
        && value.parse::<f64>().is_ok_and(f64::is_finite)
}

fn positive_scalar(value: &str, max: f64) -> bool {
    finite_decimal_literal(value)
        && value
            .parse::<f64>()
            .is_ok_and(|number| number > 0.0 && number <= max)
}

fn dimension_parts(value: &str) -> Option<(&str, &'static str)> {
    // This is NOT a TeX dimension parser. Unknown units are OPAQUE.
    for suffix in [
        r"\textwidth",
        r"\linewidth",
        r"\columnwidth",
        "cm",
        "mm",
        "pt",
        "in",
        "em",
        "ex",
    ] {
        if let Some(scalar) = value.strip_suffix(suffix) {
            let relative = suffix.starts_with('\\');
            if positive_scalar(scalar, if relative { 10.0 } else { 50.0 }) {
                return Some((scalar, suffix));
            }
        }
    }
    None
}

fn literal_numeric_ticks(value: &str) -> bool {
    let Some(inner) = value.strip_prefix('{').and_then(|s| s.strip_suffix('}')) else {
        return false;
    };
    let mut count = 0;
    for part in inner.split(',') {
        count += 1;
        if count > 64 || !finite_decimal_literal(part.trim()) {
            return false;
        }
    }
    count > 0
}

fn plain_braced_label(value: &str) -> bool {
    let Some(inner) = value.strip_prefix('{').and_then(|s| s.strip_suffix('}')) else {
        return false;
    };
    !inner.is_empty()
        && inner.chars().count() <= 96
        && inner.chars().all(|ch| {
            ch.is_alphanumeric() || matches!(ch, ' ' | '-' | '.' | ',' | ':' | '(' | ')' | '\'')
        })
}

fn literal_is_safe(key: &str, value: &str) -> bool {
    match key {
        "samples" => {
            value.bytes().all(|ch| ch.is_ascii_digit())
                && value.parse::<u32>().is_ok_and(|n| (2..=4096).contains(&n))
        }
        "domain" => value
            .split_once(':')
            .is_some_and(|(a, b)| finite_decimal_literal(a) && finite_decimal_literal(b)),
        "xmin" | "xmax" | "ymin" | "ymax" => finite_decimal_literal(value),
        "xtick distance" | "ytick distance" => positive_scalar(value, 1_000_000.0),
        "width" | "height" => dimension_parts(value).is_some(),
        "xtick" | "ytick" => literal_numeric_ticks(value),
        "mark" => matches!(value, "none" | "*" | "+" | "x"),
        "xlabel" | "ylabel" => plain_braced_label(value),
        _ => false,
    }
}

fn allowed_property(kind: ScientificKind, key: &str) -> bool {
    match key {
        "samples" | "domain" | "mark" => {
            matches!(kind, ScientificKind::Axis | ScientificKind::AddPlot)
        }
        "xmin" | "xmax" | "ymin" | "ymax" | "xtick" | "ytick" | "xtick distance"
        | "ytick distance" | "width" | "height" | "xlabel" | "ylabel" => {
            kind == ScientificKind::Axis
        }
        _ => false,
    }
}

fn additional_edit_guards(key: &str, old: &str, new: &str) -> bool {
    if matches!(key, "width" | "height") {
        let Some((_, old_unit)) = dimension_parts(old) else {
            return false;
        };
        return dimension_parts(new).is_some_and(|(_, new_unit)| new_unit == old_unit);
    }
    if matches!(key, "xtick distance" | "ytick distance") {
        let Ok(a) = old.parse::<f64>() else {
            return false;
        };
        let Ok(b) = new.parse::<f64>() else {
            return false;
        };
        // A bounded change prevents accidental millions of ticks when a
        // user enters a very small spacing in a large existing diagram.
        return a > 0.0 && (a / 2.0..=a * 2.0).contains(&b);
    }
    true
}

/// A stable source+revision are mandatory even for read-only Inspector values.
fn literal_key_range(
    view: SourceView<'_>,
    instance: &RecognizedInstance,
    key: &str,
) -> Result<Range<usize>, EditRefusal> {
    if view.revision != instance.revision || fingerprint(view.text) != instance.source_sha256 {
        return Err(EditRefusal::SourceConflict);
    }
    // Public descriptor fields are useful for UI navigation but are not an
    // editing capability. Re-establish their ownership against the bounded
    // source scan before trusting a caller-supplied range or kind.
    if !scan_scientific_source(view)
        .map_err(|_| EditRefusal::SourceConflict)?
        .iter()
        .any(|recognized| recognized == instance)
    {
        return Err(EditRefusal::SourceConflict);
    }
    if instance.confidence != RecognitionConfidence::Lexical
        || !matches!(
            instance.kind,
            ScientificKind::Axis | ScientificKind::AddPlot
        )
    {
        return Err(EditRefusal::Opaque);
    }
    if !allowed_property(instance.kind, key) {
        return Err(EditRefusal::UnsupportedKey);
    }
    let options = instance.option_range.clone().ok_or(EditRefusal::Opaque)?;
    if !instance.range.contains(&options.start)
        || options.end > instance.range.end
        || view.text.get(options.clone()).is_none()
    {
        return Err(EditRefusal::SourceConflict);
    }
    let mut hits = Vec::new();
    locate_key(view.text, options, instance.kind, key, 0, &mut hits)?;
    if hits.len() != 1 {
        return Err(if hits.is_empty() {
            EditRefusal::Opaque
        } else {
            EditRefusal::AmbiguousKey
        });
    }
    hits.pop().ok_or(EditRefusal::Opaque)
}

/// Current user-supplied literal. This never invents a PGFPlots default.
pub fn literal_key_value(
    view: SourceView<'_>,
    instance: &RecognizedInstance,
    key: &str,
) -> Result<String, EditRefusal> {
    let range = literal_key_range(view, instance, key)?;
    let value = view.text.get(range).ok_or(EditRefusal::Opaque)?;
    if !literal_is_safe(key, value) {
        return Err(EditRefusal::Opaque);
    }
    Ok(value.to_owned())
}

/// Plan a *minimal* revision-checked SourcePatch for a verified literal key.
/// Nested PGFPlots style groups are supported; all other keys/macro expressions
/// remain OPAQUE, and no bytes are changed until SourcePatch::apply succeeds.
pub fn plan_literal_key_edit(request: LiteralEditRequest<'_>) -> Result<SourcePatch, EditRefusal> {
    let range = literal_key_range(request.view, request.instance, request.key)?;
    let previous = request
        .view
        .text
        .get(range.clone())
        .ok_or(EditRefusal::Opaque)?;
    if previous != request.expected_old {
        return Err(EditRefusal::SourceConflict);
    }
    if previous == request.replacement
        || !literal_is_safe(request.key, previous)
        || !literal_is_safe(request.key, request.replacement)
        || !additional_edit_guards(request.key, previous, request.replacement)
    {
        return Err(EditRefusal::InvalidLiteral);
    }

    // Existing SC2/SC3 property ranges are stable, already independently
    // accepted contracts. Only newly added keys use a shorter UTF-8 patch.
    if matches!(
        request.key,
        "samples" | "domain" | "xmin" | "xmax" | "ymin" | "ymax"
    ) {
        return Ok(SourcePatch {
            range,
            expected_old: previous.to_owned(),
            replacement: request.replacement.to_owned(),
            source_revision: request.instance.source_target().revision,
        });
    }

    // Shortest valid UTF-8 difference for new keys. Preserve dimension units
    // and outer braces without writing unrelated TeX bytes.
    let mut prefix = 0;
    for (old, new) in previous.chars().zip(request.replacement.chars()) {
        if old != new {
            break;
        }
        prefix += old.len_utf8();
    }
    let mut old_end = previous.len();
    let mut new_end = request.replacement.len();
    while old_end > prefix && new_end > prefix {
        let old = previous[..old_end]
            .chars()
            .next_back()
            .expect("suffix char");
        let new = request.replacement[..new_end]
            .chars()
            .next_back()
            .expect("suffix char");
        if old != new {
            break;
        }
        old_end -= old.len_utf8();
        new_end -= new.len_utf8();
    }
    Ok(SourcePatch {
        range: range.start + prefix..range.start + old_end,
        expected_old: previous[prefix..old_end].to_owned(),
        replacement: request.replacement[prefix..new_end].to_owned(),
        source_revision: request.instance.source_target().revision,
    })
}
