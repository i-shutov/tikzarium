//! Read-only lexical hints for explicit fontspec/unicode-math declarations.
//! This is deliberately NOT a TeX expansion engine or a per-node computed-font inspector.

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FontHint {
    pub line: usize,
    pub command: &'static str,
    pub family: String,
}

/// Preserve byte offsets while excluding TeX line comments. A literal \% is not a comment.
/// The input source is never changed and can contain arbitrary UTF-8.
fn mask_comments(source: &str) -> Vec<u8> {
    let mut masked = source.as_bytes().to_vec();
    let mut in_comment = false;
    let mut slashes = 0usize;
    for (index, &byte) in source.as_bytes().iter().enumerate() {
        if byte == b'\n' {
            in_comment = false;
            slashes = 0;
            continue;
        }
        if in_comment {
            masked[index] = b' ';
            continue;
        }
        if byte == b'%' && slashes.is_multiple_of(2) {
            in_comment = true;
            masked[index] = b' ';
        }
        if byte == b'\\' {
            slashes += 1;
        } else {
            slashes = 0;
        }
    }
    masked
}

fn whitespace(bytes: &[u8], mut at: usize) -> usize {
    while bytes.get(at).is_some_and(u8::is_ascii_whitespace) {
        at += 1;
    }
    at
}

fn optional_options(bytes: &[u8], at: usize) -> Option<usize> {
    let mut at = whitespace(bytes, at);
    if bytes.get(at) != Some(&b'[') {
        return Some(at);
    }
    let mut depth = 0usize;
    while let Some(&byte) = bytes.get(at) {
        if byte == b'[' {
            depth += 1;
        } else if byte == b']' {
            depth -= 1;
            if depth == 0 {
                return Some(whitespace(bytes, at + 1));
            }
        }
        at += 1;
    }
    None
}

/// Returns the UTF-8-safe byte span inside one balanced braced TeX argument.
fn braced_argument(bytes: &[u8], at: usize) -> Option<(usize, usize, usize)> {
    let mut at = whitespace(bytes, at);
    if bytes.get(at) != Some(&b'{') {
        return None;
    }
    let start = at + 1;
    let mut depth = 1usize;
    at += 1;
    while let Some(&byte) = bytes.get(at) {
        if byte == b'\\' && at + 1 < bytes.len() {
            at += 2;
            continue;
        }
        match byte {
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    return Some((start, at, at + 1));
                }
            }
            _ => {}
        }
        at += 1;
    }
    None
}

fn font_argument(bytes: &[u8], command: &str, at: usize) -> Option<(usize, usize, usize)> {
    let mut at = whitespace(bytes, at);
    if command == "newfontfamily" {
        if bytes.get(at) != Some(&b'\\') {
            return None;
        }
        at += 1;
        let start = at;
        while bytes.get(at).is_some_and(|byte| byte.is_ascii_alphabetic() || *byte == b'@') {
            at += 1;
        }
        if at == start {
            return None;
        }
    }
    braced_argument(bytes, optional_options(bytes, at)?)
}

/// Reports explicit declarations as source *hints*, not confirmed installed families.
/// Macros, conditionals, catcodes and effective node-level overrides require TeX expansion.
#[must_use]
pub fn scan_explicit_font_hints(source: &str) -> Vec<FontHint> {
    const COMMANDS: [&str; 6] = [
        "setmainfont",
        "setsansfont",
        "setmonofont",
        "setmathfont",
        "newfontfamily",
        "fontspec",
    ];
    let masked = mask_comments(source);
    let mut hints = Vec::new();
    let mut i = 0;
    while i < masked.len() {
        if masked[i] != b'\\' {
            i += 1;
            continue;
        }
        // A TeX \\ line-break command followed by text is not a font command.
        if masked.get(i + 1) == Some(&b'\\') {
            i += 2;
            continue;
        }
        let candidate = COMMANDS.iter().copied().find(|command| {
            masked[i + 1..].starts_with(command.as_bytes())
                && !masked
                    .get(i + 1 + command.len())
                    .is_some_and(|next| next.is_ascii_alphabetic() || *next == b'@')
        });
        if let Some(command) = candidate
            && let Some((start, end, after)) =
                font_argument(&masked, command, i + 1 + command.len())
        {
            // Byte offsets remain aligned with the unchanged UTF-8 original.
            let family = source[start..end].split_whitespace().collect::<Vec<_>>().join(" ");
            if !family.is_empty() {
                let line = 1 + source.as_bytes()[..i]
                    .iter()
                    .filter(|&&byte| byte == b'\n')
                    .count();
                hints.push(FontHint {
                    line,
                    command,
                    family,
                });
            }
            i = after;
        } else {
            i += 1;
        }
    }
    hints
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovers_fontspec_and_unicode_math_without_comment_false_positives() {
        let source = "\\setmainfont[Scale=MatchLowercase]{DejaVu Serif}\n\
                      % \\setsansfont{Commented out}\n\
                      \\node{\\fontspec{Тест Кириллица} Привет};\n\
                      \\newfontfamily\\posterfont{TeX Gyre Termes}\n";
        let before = source.as_bytes().to_vec();
        let found = scan_explicit_font_hints(source);
        assert_eq!(found.len(), 3);
        assert_eq!(found[0].line, 1);
        assert_eq!(found[0].family, "DejaVu Serif");
        assert_eq!(found[1].line, 3);
        assert_eq!(found[1].family, "Тест Кириллица");
        assert_eq!(found[2].command, "newfontfamily");
        assert_eq!(found[2].line, 4);
        assert_eq!(found[2].family, "TeX Gyre Termes");
        assert_eq!(source.as_bytes(), before);
    }

    #[test]
    fn handles_escaped_percent_multiline_nested_options_and_crlf() {
        let source = "\\% still active \\setsansfont{A}\\r\\n\
                      \\setmathfont[Scale=[1.0]]\\r\\n\
                      {latinmodern-math.otf}\\r\\n\
                      \\setmainfontfeature{not a font family}\\r\\n";
        let found = scan_explicit_font_hints(source);
        assert_eq!(found.len(), 2);
        assert_eq!(found[0].line, 1);
        assert_eq!(found[0].family, "A");
        assert_eq!(found[1].line, 2);
        assert_eq!(found[1].family, "latinmodern-math.otf");
    }

    #[test]
    fn ignores_incomplete_and_escaped_commands() {
        let source = "\\\\setmainfont{not real}\n\
                      \\setmainfont[unfinished\n\
                      % \\setmathfont{not real}\n";
        assert!(scan_explicit_font_hints(source).is_empty());
    }
}
