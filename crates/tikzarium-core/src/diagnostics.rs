//! Conservative TeX log diagnostics; never edits the TeX source.
use std::path::{Path, PathBuf};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Severity {
    Error,
    Warning,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BuildDiagnostic {
    pub severity: Severity,
    pub message: String,
    pub source: Option<PathBuf>,
    pub line: Option<usize>,
}

#[must_use]
pub fn extract_diagnostics(log: &str) -> Vec<BuildDiagnostic> {
    let mut items: Vec<BuildDiagnostic> = Vec::new();
    for line in log.lines() {
        let trimmed = line.trim();
        if let Some((source, number, message)) = file_line_error(trimmed) {
            // The TeX log may repeat the preceding "! ..." message in
            // -file-line-error format. Keep one diagnostic with a location.
            if let Some(previous) = items.last_mut()
                && previous.severity == Severity::Error
                && previous.line.is_none()
                && (message.contains(&previous.message) || previous.message.contains(&message))
            {
                previous.source = Some(source);
                previous.line = Some(number);
                continue;
            }
            items.push(BuildDiagnostic {
                severity: Severity::Error,
                message,
                source: Some(source),
                line: Some(number),
            });
        } else if let Some(message) = trimmed.strip_prefix("! ") {
            items.push(BuildDiagnostic {
                severity: Severity::Error,
                message: message.to_owned(),
                source: None,
                line: None,
            });
        } else if let Some(number) = tex_line_marker(trimmed) {
            if let Some(previous) = items
                .iter_mut()
                .rev()
                .find(|item| item.severity == Severity::Error && item.line.is_none())
            {
                previous.line = Some(number);
            }
        } else if trimmed.starts_with("LaTeX Warning:")
            || (trimmed.starts_with("Package ") && trimmed.contains(" Warning:"))
            || trimmed.starts_with("Overfull \\")
            || trimmed.starts_with("Underfull \\")
            || trimmed.starts_with("Missing character:")
            || trimmed.starts_with("LaTeX Font Warning:")
        {
            items.push(BuildDiagnostic {
                severity: Severity::Warning,
                message: trimmed.to_owned(),
                source: None,
                line: None,
            });
        }
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
    // drive paths contain colons, and TeX diagnostics can contain more colons.
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
    fn deduplicates_error_with_file_line_location() {
        let log = "! Undefined control sequence.\n./main.tex:18: Undefined control sequence.\nLaTeX Warning: Label changed.\n";
        let diagnostics = extract_diagnostics(log);
        assert_eq!(diagnostics.len(), 2);
        assert_eq!(diagnostics[0].line, Some(18));
        assert_eq!(diagnostics[0].source, Some(PathBuf::from("./main.tex")));
        assert_eq!(diagnostics[1].severity, Severity::Warning);
    }

    #[test]
    fn recognizes_windows_paths_and_bare_tex_line_numbers() {
        let log = "C:\\research project\\fig.v2.tex:73: Undefined control sequence.\n! Missing $ inserted.\nl.41 \\foo\n";
        let diagnostics = extract_diagnostics(log);
        assert_eq!(diagnostics.len(), 2);
        assert_eq!(
            diagnostics[0].source,
            Some(PathBuf::from("C:\\research project\\fig.v2.tex"))
        );
        assert_eq!(diagnostics[0].line, Some(73));
        assert_eq!(diagnostics[1].line, Some(41));
    }

    #[test]
    fn font_warnings_remain_visible_after_source_path_merge() {
        let log = "Missing character: There is no Ж in font LM Roman 10!\nLaTeX Font Warning: substituted\nPackage fontspec Warning: family shape\n";
        let out = extract_diagnostics(log);
        assert_eq!(out.len(), 3);
        assert!(out.iter().all(|item| item.severity == Severity::Warning));
        assert!(out.iter().all(|item| item.source.is_none()));
    }

    #[test]
    fn package_and_box_warnings_are_not_silent() {
        let log = "Package pgfplots Warning: empty axis\nOverfull \\hbox (10.0pt too wide)\nMissing character: There is no x\n";
        assert_eq!(extract_diagnostics(log).len(), 3);
    }

    #[test]
    fn malformed_log_never_produces_a_phantom_line() {
        let log = "foo.tex:: error\nfoo.tex:abc: error\n\\SomeMacro{100}\n";
        assert!(extract_diagnostics(log).is_empty());
    }
}
