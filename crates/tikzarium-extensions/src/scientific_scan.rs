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
        "columns" => Some(ScientificPropertyHelp {
            key: "columns",
            value_type: "Перестановка существующего списка имён столбцов",
            effect: "Порядок вывода столбцов только выбранной команды \\pgfplotstabletypeset; данные и формулы создания столбцов не меняются.",
            editor_limit: "Только уже записанный columns={...}: 1–32 уникальных простых ASCII-имени; перестановка того же набора. Макросы, индексы и неоднозначные локальные ключи отклоняются. Неизвестные внешние команды/окружения блокируют правку. Глобальные стили сохраняются без вычисления их влияния; результат проверяется сборкой.",
            example: "columns={x,model,y}",
            package: "pgfplotstable",
            verified_tex_default: "UNKNOWN",
            manual_section: "PGFPlotstable §2.2 Selecting Columns and their Appearance Styles; /pgfplots/table/columns (CTAN pgfplotstable.pdf; версия установленного пакета не подтверждена)",
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
    /// Explicit groupplot options, not a whole-axis visual adapter.
    GroupPlot,
    /// One explicit subplot option group within a recognized groupplot.
    NextGroupPlot,
    /// One table typesetting command, with only existing columns reorder.
    TableTypeset,
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
    /// Index of the parent axis/subplot (or groupplot for NextGroupPlot).
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
    #[error("opaque or unreviewed TeX control/context in scientific source")]
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

/// Only a braced argument or one literal control word. Its contents are
/// source-owned and skipped, never scanned for apparently active commands.
fn table_argument_end(text: &str, from: usize) -> Result<usize, ScanRefusal> {
    let p = whitespace_and_comments(text, from);
    match text.as_bytes().get(p) {
        Some(b'{') => group_at(text, p)
            .map(|group| group.next)
            .ok_or(ScanRefusal::UnbalancedSource),
        Some(b'\\') => {
            let (word, end) = command_at(text, p);
            if word.is_empty()
                || !text
                    .as_bytes()
                    .get(end)
                    .is_none_or(|byte| byte.is_ascii_whitespace() || matches!(byte, b'%' | b'\\'))
            {
                return Err(ScanRefusal::UnsupportedTeXControl);
            }
            Ok(end)
        }
        _ => Err(ScanRefusal::UnsupportedTeXControl),
    }
}

fn supported_option_suffix(text: &str, from: usize) -> bool {
    text.as_bytes()
        .get(from)
        .is_none_or(|byte| byte.is_ascii_whitespace() || matches!(byte, b'[' | b'{' | b'%' | b'\\'))
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

fn redefines_scoped_command(text: &str, from: usize) -> bool {
    let mut p = whitespace_and_comments(text, from);
    if text.as_bytes().get(p) == Some(&b'*') {
        p = whitespace_and_comments(text, p + 1);
    }
    if text.as_bytes().get(p) == Some(&b'{') {
        let Some(group) = group_at(text, p) else {
            return false;
        };
        p = whitespace_and_comments(text, group.inside.start);
    }
    if text.as_bytes().get(p) != Some(&b'\\') {
        return false;
    }
    matches!(
        command_at(text, p).0,
        "groupplot" | "endgroupplot" | "nextgroupplot" | "pgfplotstabletypeset"
    )
}

/// Closed lexical invocation vocabulary for the two new corpus scenarios.
/// An unknown command may consume even an unbraced following control token.
/// Its arity/expansion is not guessed. Bodies/options consumed by the existing
/// handlers below are not independently treated as top-level invocations.
fn reviewed_scoped_invocation(word: &str) -> bool {
    matches!(
        word,
        "documentclass"
            | "usepackage"
            | "usetikzlibrary"
            | "usepgfplotslibrary"
            | "begin"
            | "end"
            | "verb"
            | "lstinline"
            | "def"
            | "gdef"
            | "edef"
            | "xdef"
            | "newcommand"
            | "renewcommand"
            | "providecommand"
            | "DeclareRobustCommand"
            | "tikzset"
            | "pgfplotsset"
            | "pgfplotstableset"
            | "pgfkeys"
            | "pgfmathsetmacro"
            | "pgfmathdeclarefunction"
            | "foreach"
            | "pgfplotstableread"
            | "pgfplotstablecreatecol"
            | "pgfplotstabletypeset"
            | "nextgroupplot"
            | "addplot"
            | "draw"
            | "path"
            | "fill"
            | "clip"
            | "node"
            | "coordinate"
            | "pic"
            | "dimline"
    )
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

/// Recognizes literal TikZ picture commands and an explicit table typesetting
/// command outside a picture for the bounded existing-corpus columns reorder.
/// New groupplot/table descriptors require the closed invocation vocabulary;
/// unknown top-level commands/contexts remain source-only. Bodies of
/// \def/\foreach are skipped, without macro expansion or execution claims.
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
    // Unconsumed arguments of unknown commands do not establish ownership
    // for the new scoped adapters. Existing axis scanning keeps its contract.
    let mut unowned_groups: Vec<u8> = Vec::new();
    let mut scoped_control_is_opaque = false;
    let mut scoped_grouping_is_opaque = false;
    // Group options and each explicit nextgroupplot retain separate owners.
    // Nested groupplots/axis environments are outside this bounded grammar.
    let mut groupplot: Option<(usize, Option<usize>)> = None;
    while i < b.len() {
        if b[i] == b'%' {
            while i < b.len() && b[i] != b'\n' {
                i += 1;
            }
            continue;
        }
        if b[i] != b'\\' {
            match b[i] {
                b'{' | b'[' => {
                    if unowned_groups.len() >= MAX_GROUP_DEPTH {
                        return Err(ScanRefusal::UnbalancedSource);
                    }
                    unowned_groups.push(if b[i] == b'{' { b'}' } else { b']' });
                }
                b'}' | b']' => {
                    if unowned_groups.last() == Some(&b[i]) {
                        unowned_groups.pop();
                    } else {
                        scoped_grouping_is_opaque = true;
                    }
                }
                _ => {}
            }
            i += 1;
            continue;
        }
        let start = i;
        let (word, next) = command_at(text, i);
        i = next;
        if unowned_groups.is_empty() && !reviewed_scoped_invocation(word) {
            scoped_control_is_opaque = true;
        }
        // These token controls/conditionals can make a literal occurrence a
        // definition operand or inactive token. No expansion/interpreter is
        // attempted. Only the newly scoped descriptors lose editability;
        // approved Axis/AddPlot recognition retains its existing contract.
        if matches!(
            word,
            "let" | "futurelet" | "noexpand" | "expandafter" | "unless" | "else" | "or" | "fi"
        ) || word.starts_with("if")
        {
            scoped_control_is_opaque = true;
        }
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
            scoped_control_is_opaque |= redefines_scoped_command(text, next);
            i = skip_macro_body(text, next, 1).ok_or(ScanRefusal::UnbalancedSource)?;
            continue;
        }
        if matches!(
            word,
            "newcommand" | "renewcommand" | "providecommand" | "DeclareRobustCommand"
        ) {
            scoped_control_is_opaque |= redefines_scoped_command(text, next);
            i = skip_newcommand_body(text, next).ok_or(ScanRefusal::UnbalancedSource)?;
            continue;
        }
        if matches!(
            word,
            "tikzset" | "pgfplotsset" | "pgfplotstableset" | "pgfkeys" | "pgfmathsetmacro"
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
        if matches!(word, "pgfplotstableread" | "pgfplotstablecreatecol") {
            if !supported_option_suffix(text, next) {
                return Err(ScanRefusal::UnsupportedTeXControl);
            }
            let (_, after_options) = trailing_options(text, next)?;
            let after_argument = table_argument_end(text, after_options)?;
            i = table_argument_end(text, after_argument)?;
            continue;
        }
        if word == "pgfplotstabletypeset" {
            if !unowned_groups.is_empty() {
                i = trailing_options(text, next)?.1;
                continue;
            }
            if !supported_option_suffix(text, next) {
                return Err(ScanRefusal::UnsupportedTeXControl);
            }
            let (options, after_options) = trailing_options(text, next)?;
            let finish = table_argument_end(text, after_options)?;
            add(
                &mut out,
                RecognizedInstance {
                    kind: ScientificKind::TableTypeset,
                    range: start..finish,
                    option_range: options,
                    parent_axis: None,
                    confidence: RecognitionConfidence::Lexical,
                    revision: view.revision,
                    source_sha256: sha,
                },
            )?;
            i = finish;
            continue;
        }
        if (word == "begin" || word == "end")
            && let Some((env, end)) = environment_at(text, next)
        {
            if unowned_groups.is_empty()
                && !matches!(
                    env,
                    "document"
                        | "tikzpicture"
                        | "axis"
                        | "groupplot"
                        | "verbatim"
                        | "lstlisting"
                        | "minted"
                )
            {
                scoped_control_is_opaque = true;
            }
            match (word, env) {
                ("begin", "tikzpicture") => {
                    if groupplot.is_some() {
                        return Err(ScanRefusal::UnbalancedSource);
                    }
                    picture_depth += 1;
                    i = end;
                    continue;
                }
                ("end", "tikzpicture") => {
                    if groupplot.is_some() {
                        return Err(ScanRefusal::UnbalancedSource);
                    }
                    picture_depth = picture_depth.saturating_sub(1);
                    axis_stack.clear();
                    i = end;
                    continue;
                }
                ("end", "axis") if picture_depth > 0 => {
                    if groupplot.is_some() {
                        return Err(ScanRefusal::UnbalancedSource);
                    }
                    axis_stack.pop();
                    i = end;
                    continue;
                }
                ("begin", "axis") if picture_depth > 0 => {
                    if groupplot.is_some() {
                        return Err(ScanRefusal::UnbalancedSource);
                    }
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
                ("begin", "groupplot") if picture_depth > 0 && unowned_groups.is_empty() => {
                    if groupplot.is_some() || !axis_stack.is_empty() || picture_depth != 1 {
                        return Err(ScanRefusal::UnbalancedSource);
                    }
                    if !supported_option_suffix(text, end) {
                        return Err(ScanRefusal::UnsupportedTeXControl);
                    }
                    let (options, finish) = trailing_options(text, end)?;
                    let index = add(
                        &mut out,
                        RecognizedInstance {
                            kind: ScientificKind::GroupPlot,
                            range: start..finish,
                            option_range: options,
                            parent_axis: None,
                            confidence: RecognitionConfidence::Lexical,
                            revision: view.revision,
                            source_sha256: sha,
                        },
                    )?;
                    groupplot = Some((index, None));
                    i = finish;
                    continue;
                }
                ("end", "groupplot") if picture_depth > 0 && unowned_groups.is_empty() => {
                    if groupplot.take().is_none() {
                        return Err(ScanRefusal::UnbalancedSource);
                    }
                    i = end;
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
        if word == "nextgroupplot" {
            if !unowned_groups.is_empty() {
                i = trailing_options(text, next)?.1;
                continue;
            }
            let Some((group, _)) = groupplot else {
                return Err(ScanRefusal::UnbalancedSource);
            };
            if !supported_option_suffix(text, next) {
                return Err(ScanRefusal::UnsupportedTeXControl);
            }
            let (options, finish) = trailing_options(text, next)?;
            let index = add(
                &mut out,
                RecognizedInstance {
                    kind: ScientificKind::NextGroupPlot,
                    range: start..finish,
                    option_range: options,
                    parent_axis: Some(group),
                    confidence: RecognitionConfidence::Lexical,
                    revision: view.revision,
                    source_sha256: sha,
                },
            )?;
            groupplot = Some((group, Some(index)));
            i = finish;
            continue;
        }
        let parent_axis = axis_stack.last().copied().or_else(|| {
            unowned_groups
                .is_empty()
                .then(|| groupplot.and_then(|(_, current)| current))
                .flatten()
        });
        if word == "addplot" && groupplot.is_some() && parent_axis.is_none() {
            return Err(ScanRefusal::UnbalancedSource);
        }
        if word == "foreach" {
            let finish = skip_macro_body(text, next, 2).ok_or(ScanRefusal::UnbalancedSource)?;
            add(
                &mut out,
                RecognizedInstance {
                    kind: ScientificKind::ForeachOpaque,
                    range: start..finish,
                    option_range: None,
                    parent_axis,
                    confidence: RecognitionConfidence::Opaque,
                    revision: view.revision,
                    source_sha256: sha,
                },
            )?;
            i = finish;
            continue;
        }
        let kind = match word {
            "addplot" if parent_axis.is_some() => ScientificKind::AddPlot,
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
        // TeX control words contain letters only: `command_at` leaves the
        // PGFPlots 3D suffix in `\addplot3` before its optional `+` and `[]`.
        // Reuse the same plot-owned literal keys; never consume a numeric
        // prefix of an unreviewed spelling such as `\addplot30`/`\addplot3x`.
        if kind == ScientificKind::AddPlot && b.get(after) == Some(&b'3') {
            after += 1;
            let suffix_end = after + usize::from(b.get(after) == Some(&b'+'));
            if !b.get(suffix_end).is_some_and(|byte| {
                byte.is_ascii_whitespace() || matches!(byte, b'[' | b'{' | b'(' | b'%')
            }) {
                // The rejected command still owns its balanced options/body.
                // Do not expose nested draw/axis/plot tokens as active source.
                i = command_semicolon(text, next).ok_or(ScanRefusal::UnbalancedSource)?;
                continue;
            }
        }
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
                parent_axis,
                confidence: RecognitionConfidence::Lexical,
                revision: view.revision,
                source_sha256: sha,
            },
        )?;
        i = finish;
    }
    let has_scoped_descriptor = out.iter().any(|item| {
        matches!(
            item.kind,
            ScientificKind::GroupPlot
                | ScientificKind::NextGroupPlot
                | ScientificKind::TableTypeset
        )
    });
    if scoped_control_is_opaque && has_scoped_descriptor {
        return Err(ScanRefusal::UnsupportedTeXControl);
    }
    if picture_depth != 0
        || !axis_stack.is_empty()
        || groupplot.is_some()
        || (has_scoped_descriptor && (!unowned_groups.is_empty() || scoped_grouping_is_opaque))
    {
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

/// Ignore only trivia surrounding one option token. Interior comments remain
/// in the range: joining their separated bytes could invent literal ownership.
fn option_token_range(text: &str, range: Range<usize>) -> Result<Range<usize>, EditRefusal> {
    let b = text.as_bytes();
    let start = whitespace_and_comments(text, range.start).min(range.end);
    let mut i = start;
    let mut end = start;
    while i < range.end {
        match b[i] {
            byte if byte.is_ascii_whitespace() => i += 1,
            b'%' => {
                while i < range.end && b[i] != b'\n' {
                    i += 1;
                }
            }
            b'\\' => {
                i += if i + 1 < range.end { 2 } else { 1 };
                end = i;
            }
            b'{' | b'[' => {
                i = group_at(text, i).ok_or(EditRefusal::Opaque)?.next;
                if i > range.end {
                    return Err(EditRefusal::Opaque);
                }
                end = i;
            }
            _ => {
                i += 1;
                end = i;
            }
        }
    }
    Ok(start..end)
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
                b'%' => {
                    while p < segment.end && b[p] != b'\n' {
                        p += 1;
                    }
                }
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
        let key = option_token_range(text, segment.start..equals.unwrap_or(segment.end))?;
        let actual_key = text.get(key).ok_or(EditRefusal::Opaque)?;
        // TeX removes comments before pgfkeys sees the key. A comment inside
        // a token can therefore hide an effective duplicate of `wanted`.
        // Refuse rather than ignoring the entry and editing another value.
        if actual_key.contains('%') {
            return Err(EditRefusal::Opaque);
        }
        // A pgfkeys path switch changes the owner of following bare keys.
        // Refuse this list, including naked controls without '=', rather than
        // assuming a later key or namespace reset belongs to this axis/plot.
        if actual_key == ".cd" || actual_key.ends_with("/.cd") {
            return Err(EditRefusal::Opaque);
        }
        if owner == ScientificKind::TableTypeset {
            // Do not confuse qualified aliases/handlers with the one direct
            // columns value, or permit a namespace control to change it.
            if actual_key.contains('\\')
                || actual_key.starts_with('/')
                || actual_key.starts_with('.')
                || actual_key.ends_with("/.search also")
                || (depth > 0 && actual_key == "columns")
                || (actual_key.starts_with("columns/") && !table_column_style_key(actual_key))
            {
                return Err(EditRefusal::Opaque);
            }
        }
        let Some(eq) = equals else {
            continue;
        };
        let value = option_token_range(text, eq + 1..segment.end)?;
        if actual_key == wanted {
            hits.push(value);
            continue;
        }
        if owner == ScientificKind::TableTypeset
            && (actual_key.ends_with("/.style") || actual_key.ends_with("/.append style"))
            && text.as_bytes().get(value.start) == Some(&b'{')
        {
            let nested = group_at(text, value.start).ok_or(EditRefusal::Opaque)?;
            if nested.next != value.end {
                return Err(EditRefusal::Opaque);
            }
            locate_key(text, nested.inside, owner, wanted, depth + 1, hits)?;
        }
        // Only these axis-owned plot styles have the reviewed plot-property
        // meaning. A legend/node/custom style can contain the same key with
        // a different owner; descending into it would silently edit another
        // object. Do not recurse further into styles nested inside a plot.
        if matches!(
            owner,
            ScientificKind::Axis | ScientificKind::GroupPlot | ScientificKind::NextGroupPlot
        ) && depth == 0
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

fn simple_column_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 32
        && name.as_bytes()[0].is_ascii_alphabetic()
        && name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

fn table_column_style_key(key: &str) -> bool {
    let parts = key.split('/').collect::<Vec<_>>();
    matches!(parts.as_slice(), ["columns", name, ".style" | ".append style"] if simple_column_name(name))
}

/// Closed value domain: existing, unique, explicitly named columns only.
/// It does not resolve data, aliases, TeX macros, indices or generated ranges.
struct Columns<'a> {
    names: Vec<&'a str>,
}

impl<'a> Columns<'a> {
    fn parse(value: &'a str) -> Option<Self> {
        let inner = value.strip_prefix('{')?.strip_suffix('}')?;
        let mut names = Vec::new();
        for part in inner.split(',') {
            let name = part.trim_matches(|ch: char| ch.is_ascii_whitespace());
            if names.len() >= 32 || !simple_column_name(name) || names.contains(&name) {
                return None;
            }
            names.push(name);
        }
        Some(Self { names })
    }

    fn same_columns(mut self, mut other: Self) -> bool {
        self.names.sort_unstable();
        other.names.sort_unstable();
        self.names == other.names
    }
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
        "columns" => Columns::parse(value).is_some(),
        _ => false,
    }
}

fn allowed_property(kind: ScientificKind, key: &str) -> bool {
    match key {
        "samples" | "domain" | "mark" => {
            matches!(
                kind,
                ScientificKind::Axis
                    | ScientificKind::GroupPlot
                    | ScientificKind::NextGroupPlot
                    | ScientificKind::AddPlot
            )
        }
        "xmin" | "xmax" | "ymin" | "ymax" | "xtick" | "ytick" | "xtick distance"
        | "ytick distance" | "width" | "height" | "xlabel" | "ylabel" => {
            matches!(
                kind,
                ScientificKind::Axis | ScientificKind::GroupPlot | ScientificKind::NextGroupPlot
            )
        }
        "columns" => kind == ScientificKind::TableTypeset,
        _ => false,
    }
}

fn additional_edit_guards(key: &str, old: &str, new: &str) -> bool {
    if key == "columns" {
        return Columns::parse(old)
            .zip(Columns::parse(new))
            .is_some_and(|(old_columns, new_columns)| old_columns.same_columns(new_columns));
    }
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
            ScientificKind::Axis
                | ScientificKind::GroupPlot
                | ScientificKind::NextGroupPlot
                | ScientificKind::TableTypeset
                | ScientificKind::AddPlot
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

#[cfg(test)]
mod scoped_descriptor_tests {
    use super::*;

    const GROUP: &str =
        include_str!("../../../roadmap/AI_TIKZ_SKILLS_2026-11-10/examples/group-plots.tex");
    const TABLE: &str = include_str!(
        "../../../roadmap/AI_TIKZ_SKILLS_2026-11-10/examples/table-derived-column.tex"
    );

    fn view(text: &str) -> SourceView<'_> {
        SourceView { text, revision: 19 }
    }

    fn edit(
        text: &str,
        instance: &RecognizedInstance,
        key: &str,
        old: &str,
        new: &str,
    ) -> Result<SourcePatch, EditRefusal> {
        plan_literal_key_edit(LiteralEditRequest {
            view: view(text),
            instance,
            key,
            expected_old: old,
            replacement: new,
        })
    }

    #[test]
    fn original_groupplot_has_separate_scoped_owners_and_one_byte_width_patch() {
        let instances = scan_scientific_source(view(GROUP)).unwrap();
        assert_eq!(
            instances.iter().map(|item| item.kind).collect::<Vec<_>>(),
            [
                ScientificKind::GroupPlot,
                ScientificKind::NextGroupPlot,
                ScientificKind::AddPlot,
                ScientificKind::NextGroupPlot,
                ScientificKind::AddPlot,
            ]
        );
        assert_eq!(instances[1].parent_axis, Some(0));
        assert_eq!(instances[2].parent_axis, Some(1));
        assert_eq!(instances[3].parent_axis, Some(0));
        assert_eq!(instances[4].parent_axis, Some(3));
        assert_eq!(
            literal_key_value(view(GROUP), &instances[0], "width").unwrap(),
            "6cm"
        );
        assert_eq!(
            literal_key_value(view(GROUP), &instances[1], "width"),
            Err(EditRefusal::Opaque)
        );
        let patch = edit(GROUP, &instances[0], "width", "6cm", "7cm").unwrap();
        assert_eq!(patch.expected_old, "6");
        assert_eq!(patch.replacement, "7");
        let mut source = GROUP.to_owned();
        let mut revision = 19;
        let inverse = patch.apply(&mut source, &mut revision).unwrap();
        assert_eq!(source, GROUP.replacen("width=6cm", "width=7cm", 1));
        assert!(source.contains("group size=2 by 1,horizontal sep=14mm"));
        assert!(source.contains("{sin(deg(x))}"));
        assert!(source.contains("{cos(deg(x))}"));
        assert!(source.contains("\r\n"));
        inverse.apply(&mut source, &mut revision).unwrap();
        assert_eq!(source.as_bytes(), GROUP.as_bytes());
        assert_eq!(
            edit(GROUP, &instances[0], "width", "6cm", "7mm").unwrap_err(),
            EditRefusal::InvalidLiteral
        );
        assert_eq!(
            edit(GROUP, &instances[0], "columns", "{x,y}", "{y,x}").unwrap_err(),
            EditRefusal::UnsupportedKey
        );
    }

    #[test]
    fn nextgroupplot_literal_belongs_only_to_that_subplot() {
        let source = "\\begin{tikzpicture}\\begin{groupplot}[width=6cm]\\nextgroupplot[width=4cm]\\addplot[domain=0:1]{x};\\nextgroupplot[width=5cm]\\addplot{x^2};\\end{groupplot}\\end{tikzpicture}";
        let instances = scan_scientific_source(view(source)).unwrap();
        let patch = edit(source, &instances[1], "width", "4cm", "3cm").unwrap();
        let mut changed = source.to_owned();
        patch.apply(&mut changed, &mut 19).unwrap();
        assert_eq!(changed, source.replacen("width=4cm", "width=3cm", 1));
        assert_eq!(
            literal_key_value(view(source), &instances[3], "width").unwrap(),
            "5cm"
        );
    }

    #[test]
    fn original_table_reorder_preserves_data_expression_unknown_bytes_and_inverse() {
        let source = format!("% сохраняется Ω\r\n{TABLE}% unknown \\opaque{{🦀}}\r\n");
        let instances = scan_scientific_source(view(&source)).unwrap();
        assert_eq!(instances.len(), 1);
        assert_eq!(instances[0].kind, ScientificKind::TableTypeset);
        assert_eq!(instances[0].parent_axis, None);
        assert_eq!(
            literal_key_value(view(&source), &instances[0], "columns").unwrap(),
            "{x,y,model}"
        );
        let patch = edit(
            &source,
            &instances[0],
            "columns",
            "{x,y,model}",
            "{x,model,y}",
        )
        .unwrap();
        let mut changed = source.clone();
        let mut revision = 19;
        let inverse = patch.apply(&mut changed, &mut revision).unwrap();
        assert_eq!(
            changed,
            source.replacen("columns={x,y,model}", "columns={x,model,y}", 1)
        );
        assert!(changed.contains(r"create col/expr={\thisrow{x}^2}"));
        assert!(changed.contains(r"{x y\\1 1.1\\2 3.9\\3 9.2\\4 15.8\\}"));
        inverse.apply(&mut changed, &mut revision).unwrap();
        assert_eq!(changed.as_bytes(), source.as_bytes());
        assert_eq!(
            edit(&source, &instances[0], "width", "6cm", "7cm").unwrap_err(),
            EditRefusal::UnsupportedKey
        );
        let help = scientific_property_help("columns").unwrap();
        assert_eq!(help.package, "pgfplotstable");
        assert_eq!(help.verified_tex_default, "UNKNOWN");
        assert!(help.effect.contains("\\pgfplotstabletypeset"));
    }

    #[test]
    fn columns_domain_allows_only_bounded_unique_simple_names_and_same_set() {
        let instance = scan_scientific_source(view(TABLE)).unwrap().remove(0);
        for replacement in [
            "{x,y}",
            "{x,y,model,z}",
            "{x,y,y}",
            "{x,y,other}",
            "{x,\\model,y}",
            "{x,[index]1,y}",
            "{x,{model},y}",
            "{x,mod/el,y}",
            "{x,model/.style,y}",
            "{x,model% hidden\n,y}",
            "{x,модель,y}",
            "{}",
        ] {
            assert_eq!(
                edit(TABLE, &instance, "columns", "{x,y,model}", replacement).unwrap_err(),
                EditRefusal::InvalidLiteral,
                "{replacement}"
            );
        }
        let bounded = format!(
            "{{{}}}",
            (0..32)
                .map(|i| format!("c{i}"))
                .collect::<Vec<_>>()
                .join(",")
        );
        assert!(Columns::parse(&bounded).is_some());
        let excessive = bounded.replace('}', ",c32}");
        assert!(Columns::parse(&excessive).is_none());
        assert!(Columns::parse("{x,x}").is_none());
        assert!(Columns::parse("{a_long_column_name_over_32_characters}").is_none());
        assert!(edit(TABLE, &instance, "columns", "{x,model,y}", "{y,model,x}").is_err());
    }

    #[test]
    fn columns_reject_ambiguous_namespace_handlers_duplicates_and_macro_names() {
        for options in [
            "columns={x,y},columns={y,x}",
            "columns={x,y},/pgfplots/table/columns={y,x}",
            "/pgfplots/table/.cd,columns={x,y}",
            "columns={x,y},.cd",
            "columns={x,y},columns/.add={}{,z}",
            "columns={x,y},columns/.style={}",
            "columns={x,y},\\switch",
            "columns={x,y},.search also={/other}",
            "columns={x,x}",
            "columns={x,\\model}",
            "columns={x,y},col% hidden\numns={y,x}",
            "columns={x,y},columns/x/.append style={columns={y,x}}",
            "columns={x,y},every head row/.style={/pgfplots/table/.cd,columns={y,x}}",
            "columns={x,y},columns/x/.style={\\pgfkeys{/pgfplots/table/columns={y,x}}}",
        ] {
            let source = format!("\\pgfplotstabletypeset[{options}]\\datatable\r\n");
            let instance = scan_scientific_source(view(&source)).unwrap().remove(0);
            assert!(
                literal_key_value(view(&source), &instance, "columns").is_err(),
                "{options}"
            );
        }
    }

    #[test]
    fn scoped_commands_ignore_macro_bodies_comments_verbatim_and_table_arguments() {
        let fake = r"\pgfplotstabletypeset[columns={x,y}]\fake";
        let source = format!(
            "% {fake}\n\\newcommand{{\\fake}}[1]{{\\newcommand{{\\inner}}{{{fake}}}}}\n\\def\\other{{{fake}}}\n\\begin{{verbatim}}{fake}\\end{{verbatim}}\n\\pgfplotstableread{{{fake}}}\\data\n\\pgfplotstablecreatecol[create col/expr={{{fake}}}]{{model}}\\data\n{TABLE}"
        );
        let instances = scan_scientific_source(view(&source)).unwrap();
        assert_eq!(instances.len(), 1);
        assert_eq!(instances[0].kind, ScientificKind::TableTypeset);
        for source in [
            r"\newcommand{\fake}{\begin{tikzpicture}\begin{groupplot}[width=6cm]\nextgroupplot[width=4cm]\end{groupplot}\end{tikzpicture}}",
            r"\def\fake{\begin{tikzpicture}\begin{groupplot}[width=6cm]\nextgroupplot[width=4cm]\end{groupplot}\end{tikzpicture}}",
        ] {
            assert!(scan_scientific_source(view(source)).unwrap().is_empty());
        }
    }

    #[test]
    fn scoped_descriptors_do_not_claim_unknown_braced_or_optional_arguments() {
        let table = r"\pgfplotstabletypeset[columns={x,y}]\data";
        let group = r"\begin{tikzpicture}\begin{groupplot}[width=6cm]\nextgroupplot[width=4cm]\end{groupplot}\end{tikzpicture}";
        for command in ["input", "unreviewed"] {
            for hidden in [table, group] {
                for source in [
                    format!("\\{command}{{{hidden}}}"),
                    format!("\\{command}[{hidden}]"),
                ] {
                    let instances = scan_scientific_source(view(&source)).unwrap();
                    assert!(
                        instances.iter().all(|item| !matches!(
                            item.kind,
                            ScientificKind::GroupPlot
                                | ScientificKind::NextGroupPlot
                                | ScientificKind::TableTypeset
                        )),
                        "{source}"
                    );
                }
            }
        }
        let source = format!("\\unreviewed{{{table}}}\r\n{TABLE}");
        assert_eq!(
            scan_scientific_source(view(&source)),
            Err(ScanRefusal::UnsupportedTeXControl)
        );
    }

    #[test]
    fn unknown_top_level_invocations_cannot_consume_new_scoped_commands() {
        let table = r"\pgfplotstabletypeset[columns={x,y}]\data";
        for source in [
            format!(r"\unreviewed{table}"),
            format!(r"\textbf{table}"),
            format!(r"\#{table}"),
            format!(r"\newcommand{{\custom}}[1]{{#1}}\custom{table}"),
            format!(r"{table}\unreviewed"),
            format!(r"\begin{{unknown}}{table}\end{{unknown}}"),
            r"\begin{tikzpicture}\unreviewed\begin{groupplot}[width=6cm]\nextgroupplot[width=4cm]\end{groupplot}\end{tikzpicture}".to_owned(),
            r"\newcommand{\custom}[1]{#1}\begin{tikzpicture}\custom\begin{groupplot}[width=6cm]\nextgroupplot[width=4cm]\end{groupplot}\end{tikzpicture}".to_owned(),
        ] {
            assert_eq!(scan_scientific_source(view(&source)), Err(ScanRefusal::UnsupportedTeXControl), "{source}");
        }
        // The vocabulary closes only the new adapters, preserving the old
        // source-scanner contract for existing axis fixtures.
        let source =
            r"\unreviewed\begin{tikzpicture}\begin{axis}[width=6cm]\end{axis}\end{tikzpicture}";
        let found = scan_scientific_source(view(source)).unwrap();
        assert!(edit(source, &found[0], "width", "6cm", "7cm").is_ok());
    }

    #[test]
    fn scoped_commands_reject_unsupported_suffixes_nesting_and_unbalanced_groups() {
        for source in [
            r"\pgfplotstabletypeset*[columns={x,y}]\data",
            r"\pgfplotstabletypeset3[columns={x,y}]\data",
            r"\pgfplotstabletypeset[columns={x,y}]\data2",
            r"\begin{tikzpicture}\begin{groupplot}*[width=6cm]\end{groupplot}\end{tikzpicture}",
            r"\begin{tikzpicture}\begin{groupplot}[width=6cm]\nextgroupplot3[width=4cm]\end{groupplot}\end{tikzpicture}",
            r"\begin{tikzpicture}\begin{groupplot}[width=6cm]\begin{groupplot}[width=5cm]\end{groupplot}\end{groupplot}\end{tikzpicture}",
            r"\begin{tikzpicture}\begin{groupplot}[width=6cm]\begin{axis}[width=5cm]\end{axis}\end{groupplot}\end{tikzpicture}",
            r"\begin{tikzpicture}\begin{groupplot}[width=6cm]\end{axis}\end{groupplot}\end{tikzpicture}",
            r"\begin{tikzpicture}\begin{groupplot}[width=6cm]\end{tikzpicture}",
            r"\begin{tikzpicture}\nextgroupplot[width=4cm]\end{tikzpicture}",
        ] {
            assert!(scan_scientific_source(view(source)).is_err(), "{source}");
        }
    }

    #[test]
    fn scoped_token_controls_inactive_branches_and_reserved_redefinitions_fail_closed() {
        let table = r"\pgfplotstabletypeset[columns={x,y}]\data";
        // Actual false-ownership probes: alias RHS, unexpanded token and a
        // redefined command must never grant a columns editing capability.
        for source in [
            format!(r"\let\fake{table}"),
            format!(r"\noexpand{table}"),
            format!(r"\renewcommand{{\pgfplotstabletypeset}}[1]{{}}{table}"),
            format!(r"\futurelet\fake{table}"),
            format!(r"\expandafter{table}"),
            format!(r"\iffalse {table}\fi"),
            format!(r"\iftrue {table}\else\fi"),
            format!(r"{table}\let\pgfplotstabletypeset\custom"),
            format!(r"{table}\def\pgfplotstabletypeset#1{{}}"),
            format!(r"{table}\providecommand{{\pgfplotstabletypeset}}[1]{{}}"),
        ] {
            assert_eq!(
                scan_scientific_source(view(&source)),
                Err(ScanRefusal::UnsupportedTeXControl),
                "{source}"
            );
        }
        for definition in [
            r"\renewcommand{\nextgroupplot}[1]{}",
            r"\def\groupplot#1{}",
            r"\gdef\endgroupplot{}",
            r"\DeclareRobustCommand{\nextgroupplot}[1]{}",
        ] {
            let source = format!("{definition}\r\n{GROUP}");
            assert_eq!(
                scan_scientific_source(view(&source)),
                Err(ScanRefusal::UnsupportedTeXControl),
                "{definition}"
            );
        }
        let unrelated = format!(r"\newcommand{{\custom}}[1]{{#1}}{TABLE}");
        assert_eq!(scan_scientific_source(view(&unrelated)).unwrap().len(), 1);
        for source in [
            format!("}}{TABLE}"),
            format!("[{TABLE}"),
            format!("{TABLE}}}"),
        ] {
            assert!(
                scan_scientific_source(view(&source))
                    .map_or(true, |instances| instances.is_empty())
            );
        }
    }

    #[test]
    fn new_scoped_refusals_do_not_change_existing_axis_literal_contract() {
        let axis = r"\begin{tikzpicture}\begin{axis}[width=6cm]\addplot[domain=0:1]{x};\end{axis}\end{tikzpicture}";
        for prefix in [
            r"\let\custom\other ",
            r"\noexpand ",
            r"\expandafter ",
            r"\iffalse ",
            r"\renewcommand{\nextgroupplot}[1]{}",
        ] {
            let source = format!("{prefix}{axis}");
            let found = scan_scientific_source(view(&source)).unwrap();
            assert_eq!(found[0].kind, ScientificKind::Axis);
            assert!(edit(&source, &found[0], "width", "6cm", "7cm").is_ok());
        }
    }

    #[test]
    fn table_reorder_keeps_revision_expected_literal_and_descriptor_ownership_checks() {
        let instance = scan_scientific_source(view(TABLE)).unwrap().remove(0);
        let mut stale = instance.clone();
        stale.revision += 1;
        assert_eq!(
            edit(TABLE, &stale, "columns", "{x,y,model}", "{x,model,y}").unwrap_err(),
            EditRefusal::SourceConflict
        );
        let changed = TABLE.replace("1.1", "1.2");
        assert_eq!(
            edit(&changed, &instance, "columns", "{x,y,model}", "{x,model,y}").unwrap_err(),
            EditRefusal::SourceConflict
        );
        let mut forged = instance.clone();
        forged.option_range = Some(0..1);
        assert_eq!(
            edit(TABLE, &forged, "columns", "{x,y,model}", "{x,model,y}").unwrap_err(),
            EditRefusal::SourceConflict
        );
        assert_eq!(
            edit(TABLE, &instance, "columns", "{y,x,model}", "{x,model,y}").unwrap_err(),
            EditRefusal::SourceConflict
        );
        assert_eq!(
            edit(TABLE, &instance, "columns", "{x,y,model}", "{x,y,model}").unwrap_err(),
            EditRefusal::InvalidLiteral
        );
    }
}
