//! Conservative TeX log diagnostics, without mutating source.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Severity { Error, Warning }

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BuildDiagnostic {
    pub severity: Severity,
    pub message: String,
    pub line: Option<usize>,
}

#[must_use]
pub fn extract_diagnostics(log: &str) -> Vec<BuildDiagnostic> {
    let mut items = Vec::new();
    for line in log.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("! ") {
            items.push(BuildDiagnostic { severity: Severity::Error, message: rest.to_owned(), line: None });
        } else if trimmed.contains("LaTeX Warning:") || trimmed.contains("Package pgf Warning:") {
            items.push(BuildDiagnostic { severity: Severity::Warning, message: trimmed.to_owned(), line: None });
        } else if let Some((_, rest)) = trimmed.rsplit_once(".tex:") {
            let digits = rest.chars().take_while(|c| c.is_ascii_digit()).collect::<String>();
            if let Ok(n) = digits.parse::<usize>() {
                items.push(BuildDiagnostic { severity: Severity::Error, message: trimmed.to_owned(), line: Some(n) });
            }
        }
    }
    items
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn parse_log_without_panics() {
        let diagnostics = extract_diagnostics("! Undefined control sequence.\nmain.tex:18: Undefined control sequence\nLaTeX Warning: Label changed.\n");
        assert_eq!(diagnostics.len(), 3);
        assert_eq!(diagnostics[1].line, Some(18));
        assert_eq!(diagnostics[2].severity, Severity::Warning);
    }
}
