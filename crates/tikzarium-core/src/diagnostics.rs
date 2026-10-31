//! Conservative XeLaTeX diagnostics: preserve the public GUI-compatible shape.
//! The optional source path is carried in a separate record so B does not need
//! to change its BuildDiagnostic struct literals.
use std::path::{Path, PathBuf};

use crate::font_audit::{FontIssueKind, audit_font_log};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Severity {
    Error,
    Warning,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BuildDiagnostic {
    pub severity: Severity,
    pub message: String,
    pub line: Option<usize>,
}

/// Source-aware diagnostics for build services and future GUI navigation.
/// BuildDiagnostic intentionally retains its original three fields.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LocatedBuildDiagnostic {
    pub diagnostic: BuildDiagnostic,
    pub source: Option<PathBuf>,
}

#[must_use]
pub fn extract_diagnostics(log: &str) -> Vec<BuildDiagnostic> {
    extract_located_diagnostics(log)
        .into_iter()
        .map(|item| item.diagnostic)
        .collect()
}

/// Parse TeX's \`-file-line-error\` and \`l.N\` forms, then append typed font
/// records from the already-merged F02 parser. A font problem may exist even
/// when XeLaTeX exits successfully and writes a PDF.
#[must_use]
pub fn extract_located_diagnostics(log: &str) -> Vec<LocatedBuildDiagnostic> {
    let mut items: Vec<LocatedBuildDiagnostic> = Vec::new();

    for line in log.lines() {
        let trimmed = line.trim();
        if let Some((source, number, message)) = file_line_error(trimmed) {
            // F02 creates a complete, multi-line fontspec diagnostic below.
            if message.contains("Package fontspec Error:") {
                continue;
            }
            if let Some(previous) = items.last_mut()
                && previous.diagnostic.severity == Severity::Error
                && previous.diagnostic.line.is_none()
                && (message.contains(&previous.diagnostic.message)
                    || previous.diagnostic.message.contains(&message))
            {
                previous.source = Some(source);
                previous.diagnostic.line = Some(number);
                continue;
            }
            items.push(LocatedBuildDiagnostic {
                diagnostic: BuildDiagnostic {
                    severity: Severity::Error,
                    message,
                    line: Some(number),
                },
                source: Some(source),
            });
        } else if let Some(message) = trimmed.strip_prefix("! ") {
            // Delegate fontspec errors and missing-font primitives to F02.
            if message.contains("Package fontspec Error:")
                || (message.starts_with("Font ") && message.contains("not loadable"))
            {
                continue;
            }
            items.push(LocatedBuildDiagnostic {
                diagnostic: BuildDiagnostic {
                    severity: Severity::Error,
                    message: message.to_owned(),
                    line: None,
                },
                source: None,
            });
        } else if let Some(number) = tex_line_marker(trimmed) {
            if let Some(previous) = items.iter_mut().rev().find(|item| {
                item.diagnostic.severity == Severity::Error && item.diagnostic.line.is_none()
            }) {
                previous.diagnostic.line = Some(number);
            }
        } else if (trimmed.starts_with("LaTeX Warning:")
            || (trimmed.starts_with("Package ") && trimmed.contains(" Warning:"))
            || trimmed.starts_with("Overfull \\")
            || trimmed.starts_with("Underfull \\"))
            && !trimmed.starts_with("Package fontspec Warning:")
        {
            items.push(LocatedBuildDiagnostic {
                diagnostic: BuildDiagnostic {
                    severity: Severity::Warning,
                    message: trimmed.to_owned(),
                    line: None,
                },
                source: None,
            });
        }
    }

    // The F02 audit coalesces wrapped glyph descriptions and fontspec
    // continuations; do not emit a truncated duplicate from line scanning.
    for issue in audit_font_log(log).issues {
        let severity = match issue.kind {
            FontIssueKind::MissingFont | FontIssueKind::FontspecError => Severity::Error,
            FontIssueKind::MissingGlyph | FontIssueKind::FontWarning => Severity::Warning,
        };
        let source = file_line_error(&issue.message).map(|(source, _, _)| source);
        items.push(LocatedBuildDiagnostic {
            diagnostic: BuildDiagnostic {
                severity,
                message: issue.message,
                line: issue.source_line,
            },
            source,
        });
    }
    items
}

fn tex_line_marker(text: &str) -> Option<usize> {
    let digits = text.strip_prefix("l.")?;
    let digits = digits
        .chars()
        .take_while(char::is_ascii_digit)
        .collect::<String>();
    digits.parse::<usize>().ok()
}

fn file_line_error(text: &str) -> Option<(PathBuf, usize, String)> {
    // Scan for :<digits>: rather than splitting on the first colon: Windows
    // drive paths contain colons, and TeX messages can contain further colons.
    for (index, character) in text.char_indices() {
        if character != ':' {
            continue;
        }
        let rest = &text[index + 1..];
        let digit_count = rest.bytes().take_while(u8::is_ascii_digit).count();
        if digit_count == 0 || !rest[digit_count..].starts_with(':') {
            continue;
        }
        let filename = text[..index].trim();
        let extension = Path::new(filename).extension()?.to_str()?;
        if !["tex", "tikz", "ltx", "sty", "cls", "def"]
            .iter()
            .any(|candidate| extension.eq_ignore_ascii_case(candidate))
        {
            continue;
        }
        let number = rest[..digit_count].parse::<usize>().ok()?;
        let message = rest[digit_count + 1..].trim();
        if message.is_empty() {
            continue;
        }
        return Some((PathBuf::from(filename), number, message.to_owned()));
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_glyph_is_nonfatal_but_always_reported() {
        let log = "Missing character: There is no Ж in font LM Roman 10!\nLaTeX Font Warning: substituted\n";
        let out = extract_diagnostics(log);
        assert_eq!(out.len(), 2);
        assert!(out.iter().all(|item| item.severity == Severity::Warning));
    }

    #[test]
    fn deduplicates_error_with_file_line_location() {
        let log = "! Undefined control sequence.\n./main.tex:18: Undefined control sequence.\nLaTeX Warning: Label changed.\n";
        let diagnostics = extract_located_diagnostics(log);
        assert_eq!(diagnostics.len(), 2);
        assert_eq!(diagnostics[0].diagnostic.line, Some(18));
        assert_eq!(diagnostics[0].source, Some(PathBuf::from("./main.tex")));
        assert_eq!(diagnostics[1].diagnostic.severity, Severity::Warning);
    }

    #[test]
    fn recognizes_windows_paths_and_bare_tex_line_numbers() {
        let log = "C:\\research project\\fig.v2.tex:73: Undefined control sequence.\n! Missing $ inserted.\nl.41 \\foo\n";
        let diagnostics = extract_located_diagnostics(log);
        assert_eq!(diagnostics.len(), 2);
        assert_eq!(
            diagnostics[0].source,
            Some(PathBuf::from("C:\\research project\\fig.v2.tex"))
        );
        assert_eq!(diagnostics[0].diagnostic.line, Some(73));
        assert_eq!(diagnostics[1].diagnostic.line, Some(41));
    }

    #[test]
    fn malformed_log_never_produces_a_phantom_line() {
        let log = "foo.tex:: error\nfoo.tex:abc: error\n\\SomeMacro{100}\n";
        assert!(extract_diagnostics(log).is_empty());
    }

    #[test]
    fn wrapped_missing_glyph_is_one_complete_warning() {
        let log = "Missing character: There is no П (U+041F) in font Noto Sans/OT:la\nnguage=dflt;mapping=tex-text;!\n";
        let diagnostics = extract_diagnostics(log);
        assert_eq!(diagnostics.len(), 1);
        assert_eq!(diagnostics[0].severity, Severity::Warning);
        assert!(diagnostics[0].message.contains("OT:language=dflt"));
    }

    #[test]
    fn fontspec_error_has_a_complete_message_and_source_line() {
        let log = concat!(
            "./figure.tex:4: Package fontspec Error:\n",
            "(fontspec) The font \"Definitely Nonexistent Font 424242\"\n",
            "(fontspec) cannot be found.\n"
        );
        let items = extract_located_diagnostics(log);
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].diagnostic.severity, Severity::Error);
        assert_eq!(items[0].diagnostic.line, Some(4));
        assert_eq!(items[0].source, Some(PathBuf::from("./figure.tex")));
        assert!(
            items[0]
                .diagnostic
                .message
                .contains("Definitely Nonexistent")
        );
    }

    #[test]
    fn general_package_and_box_warnings_are_retained() {
        let log = "Package pgfplots Warning: empty axis\nOverfull \\hbox (10.0pt too wide)\n";
        assert_eq!(extract_diagnostics(log).len(), 2);
    }
}
