//! Conservative font-specific XeLaTeX log audit.
//!
//! A zero exit status does not prove that every glyph was printed. Conversely,
//! fontspec can fail before a PDF is emitted. Audit the *real engine log* rather
//! than attempting to infer coverage from a font family name or GUI settings.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FontIssueKind {
    MissingGlyph,
    MissingFont,
    FontspecError,
    FontWarning,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FontIssue {
    pub kind: FontIssueKind,
    /// Complete enough to identify the glyph/family; XeTeX wraps log lines.
    pub message: String,
    /// Available for file-line-error diagnostics such as main.tex:7:.
    pub source_line: Option<usize>,
    /// Only populated when fontspec identifies a quoted, missing family.
    pub font_name: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct FontLogAudit {
    pub issues: Vec<FontIssue>,
}

impl FontLogAudit {
    #[must_use]
    pub fn is_clean(&self) -> bool {
        self.issues.is_empty()
    }

    #[must_use]
    pub fn has_missing_glyphs(&self) -> bool {
        self.issues
            .iter()
            .any(|issue| issue.kind == FontIssueKind::MissingGlyph)
    }

    #[must_use]
    pub fn has_missing_fonts(&self) -> bool {
        self.issues
            .iter()
            .any(|issue| issue.kind == FontIssueKind::MissingFont)
    }

    #[must_use]
    pub fn has_font_errors(&self) -> bool {
        self.issues.iter().any(|issue| {
            matches!(
                issue.kind,
                FontIssueKind::MissingFont | FontIssueKind::FontspecError
            )
        })
    }
}

/// Parse known XeLaTeX/fontspec messages without treating a successful PDF as
/// proof of correct Cyrillic, Greek or math rendering.
///
/// Missing-glyph records may wrap in the middle of a word (e.g. "la\nnguage").
/// fontspec error explanations instead use "(fontspec)" continuation lines.
/// Unknown messages are *not* classified as missing fonts.
#[must_use]
pub fn audit_font_log(log: &str) -> FontLogAudit {
    let mut audit = FontLogAudit::default();
    let mut lines = log.lines().peekable();

    while let Some(line) = lines.next() {
        let trimmed = line.trim();
        if trimmed.starts_with("Missing character:") {
            let mut message = trimmed.to_owned();
            // TeX wraps long missing-glyph records at its print-line width.
            // Never swallow a subsequent diagnostic or an arbitrary log block.
            for _ in 0..3 {
                if message.ends_with('!') {
                    break;
                }
                let Some(next) = lines.peek().copied() else {
                    break;
                };
                let continuation = next.trim();
                if continuation.is_empty()
                    || continuation.starts_with('(')
                    || continuation.starts_with('!')
                    || continuation.starts_with("Missing character:")
                    || continuation.contains(" Warning:")
                    || continuation.contains(" Error:")
                {
                    break;
                }
                // Wraps can split a token: joining with a space is incorrect.
                message.push_str(lines.next().expect("peeked line exists").trim());
            }
            audit.issues.push(FontIssue {
                kind: FontIssueKind::MissingGlyph,
                message,
                source_line: None,
                font_name: None,
            });
        } else if trimmed.contains("Package fontspec Error:") {
            let message = collect_fontspec_message(trimmed, &mut lines);
            let lower = message.to_ascii_lowercase();
            let missing = lower.contains("cannot be found")
                || lower.contains("could not be found")
                || lower.contains("not loadable");
            let font_name = if missing {
                quoted_font_name(&message)
            } else {
                None
            };
            audit.issues.push(FontIssue {
                kind: if missing {
                    FontIssueKind::MissingFont
                } else {
                    FontIssueKind::FontspecError
                },
                message,
                source_line: tex_source_line(trimmed),
                font_name,
            });
        } else if trimmed.starts_with("Package fontspec Warning:") {
            audit.issues.push(FontIssue {
                kind: FontIssueKind::FontWarning,
                message: collect_fontspec_message(trimmed, &mut lines),
                source_line: None,
                font_name: None,
            });
        } else if trimmed.starts_with("LaTeX Font Warning:") {
            audit.issues.push(FontIssue {
                kind: FontIssueKind::FontWarning,
                message: trimmed.to_owned(),
                source_line: None,
                font_name: None,
            });
        } else if trimmed.starts_with("! Font ") && trimmed.contains("not loadable") {
            audit.issues.push(FontIssue {
                kind: FontIssueKind::MissingFont,
                message: trimmed.to_owned(),
                source_line: None,
                font_name: None,
            });
        }
    }

    audit
}

fn collect_fontspec_message(
    header: &str,
    lines: &mut std::iter::Peekable<std::str::Lines<'_>>,
) -> String {
    let mut message = header.to_owned();
    // fontspec emits an explanation on "(fontspec)" continuation lines.
    // Bound each record so arbitrary input cannot grow an unbounded message.
    for _ in 0..16 {
        let Some(next) = lines.peek().copied() else {
            break;
        };
        let Some(continuation) = next.trim().strip_prefix("(fontspec)") else {
            break;
        };
        let continuation = continuation.trim();
        if message.len() + continuation.len() > 4096 {
            break;
        }
        if !continuation.is_empty() {
            message.push(' ');
            message.push_str(continuation);
        }
        lines.next();
    }
    message
}

fn quoted_font_name(message: &str) -> Option<String> {
    let (_, after) = message.split_once("The font \"")?;
    let (name, _) = after.split_once('"')?;
    if name.is_empty() {
        None
    } else {
        Some(name.to_owned())
    }
}

fn tex_source_line(header: &str) -> Option<usize> {
    let (_, trailing) = header.rsplit_once(".tex:")?;
    trailing
        .chars()
        .take_while(char::is_ascii_digit)
        .collect::<String>()
        .parse()
        .ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xetex_wrapped_missing_cyrillic_and_greek_remain_distinct() {
        let log = concat!(
            "Missing character: There is no П (U+041F) in font Noto Sans Tamil Regular/OT:la\n",
            "nguage=dflt;mapping=tex-text;!\n",
            "Missing character: There is no α (U+03B1) in font Noto Sans Tamil Regular/OT:la\n",
            "nguage=dflt;mapping=tex-text;!\n",
            "Output written on missing.pdf\n"
        );
        let audit = audit_font_log(log);
        assert_eq!(audit.issues.len(), 2);
        assert!(audit.has_missing_glyphs());
        assert!(!audit.has_missing_fonts());
        assert_eq!(audit.issues[0].kind, FontIssueKind::MissingGlyph);
        assert!(audit.issues[0].message.contains("OT:language=dflt"));
        assert!(audit.issues[1].message.contains("α (U+03B1)"));
    }

    #[test]
    fn missing_font_name_and_source_line_are_explicit() {
        let log = concat!(
            "./figure.tex:4: Package fontspec Error:\n",
            "(fontspec)                The font \"Definitely Nonexistent Font 424242\"\n",
            "(fontspec)                cannot be found; this may be but usually is not a\n",
            "(fontspec)                fontspec bug.\n",
            "\nFor immediate help type H <return>.\n"
        );
        let audit = audit_font_log(log);
        assert_eq!(audit.issues.len(), 1);
        assert!(audit.has_missing_fonts());
        assert!(audit.has_font_errors());
        assert_eq!(audit.issues[0].kind, FontIssueKind::MissingFont);
        assert_eq!(audit.issues[0].source_line, Some(4));
        assert_eq!(
            audit.issues[0].font_name.as_deref(),
            Some("Definitely Nonexistent Font 424242")
        );
    }

    #[test]
    fn fontspec_error_other_than_missing_font_stays_distinct() {
        let log = "! Package fontspec Error: Unknown option BogusOption.\n";
        let audit = audit_font_log(log);
        assert!(audit.has_font_errors());
        assert!(!audit.has_missing_fonts());
        assert_eq!(audit.issues[0].kind, FontIssueKind::FontspecError);
    }

    #[test]
    fn warnings_are_not_silently_mislabeled_as_missing_fonts() {
        let log = concat!(
            "Package fontspec Warning:\n",
            "(fontspec) Font shape has been substituted.\n",
            "LaTeX Font Warning: Some font shapes were not available.\n"
        );
        let audit = audit_font_log(log);
        assert_eq!(audit.issues.len(), 2);
        assert!(!audit.has_font_errors());
        assert!(!audit.has_missing_fonts());
        assert!(
            audit
                .issues
                .iter()
                .all(|issue| issue.kind == FontIssueKind::FontWarning)
        );
    }

    #[test]
    fn clean_log_is_not_a_claim_about_pdf_extraction_or_embedding() {
        let audit = audit_font_log("Output written on figure.pdf (1 page).\n");
        assert!(audit.is_clean());
        assert!(!audit.has_missing_glyphs());
        assert!(!audit.has_font_errors());
    }

    #[test]
    fn primitive_font_load_failure_is_reported() {
        let audit = audit_font_log(
            "! Font \\abc=missing-font at 10pt not loadable: Metric file not found.\n",
        );
        assert!(audit.has_missing_fonts());
        assert_eq!(audit.issues.len(), 1);
    }
}
