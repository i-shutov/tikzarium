//! Font choices for XeLaTeX-generated figures, independent of the egui visual theme.
//! A font name is user data, not raw TeX source. Reject control characters and macros.

use std::fmt::Write;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FigureFonts {
    pub text_family: String,
    pub sans_family: String,
    pub math_font: String,
}

impl Default for FigureFonts {
    fn default() -> Self {
        Self {
            text_family: "DejaVu Serif".into(),
            sans_family: "DejaVu Sans".into(),
            // Filename is found via kpathsea in a TeX Live installation; on
            // some machines the friendly family name does not resolve.
            math_font: "latinmodern-math.otf".into(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FontInputError {
    Empty,
    TooLong,
    UnsafeCharacter(char),
}

impl std::fmt::Display for FontInputError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Empty => write!(f, "font family is empty"),
            Self::TooLong => write!(f, "font family exceeds 128 characters"),
            Self::UnsafeCharacter(ch) => write!(f, "unsafe font name character: {ch:?}"),
        }
    }
}
impl std::error::Error for FontInputError {}

/// Names accepted in a fontspec family argument. Never treat a font name
/// as an arbitrary TeX macro or OS pathname.
pub fn validate_font_name(value: &str) -> Result<&str, FontInputError> {
    let name = value.trim();
    if name.is_empty() {
        return Err(FontInputError::Empty);
    }
    if name.chars().count() > 128 {
        return Err(FontInputError::TooLong);
    }
    for ch in name.chars() {
        if !ch.is_alphanumeric() && !matches!(ch, ' ' | '-' | '_' | '.' | '+' | '(' | ')' | '\'') {
            return Err(FontInputError::UnsafeCharacter(ch));
        }
    }
    Ok(name)
}

/// Plain text only; deliberately does not attempt to parse user TeX macros.
#[must_use]
pub fn tex_escape_plain_text(plain: &str) -> String {
    let mut tex = String::with_capacity(plain.len());
    for ch in plain.chars() {
        match ch {
            '\\' => tex.push_str(r"\textbackslash{}"),
            '{' => tex.push_str(r"\{"),
            '}' => tex.push_str(r"\}"),
            '%' => tex.push_str(r"\%"),
            '$' => tex.push_str(r"\$"),
            '&' => tex.push_str(r"\&"),
            '#' => tex.push_str(r"\#"),
            '_' => tex.push_str(r"\_"),
            '^' => tex.push_str(r"\^{}"),
            '~' => tex.push_str(r"\~{}"),
            _ => tex.push(ch),
        }
    }
    tex
}

impl FigureFonts {
    pub fn validate(&self) -> Result<(), FontInputError> {
        validate_font_name(&self.text_family)?;
        validate_font_name(&self.sans_family)?;
        validate_font_name(&self.math_font)?;
        Ok(())
    }

    /// Copy/paste suggestion only: never rewrite the user's existing preamble.
    pub fn preamble(&self) -> Result<String, FontInputError> {
        self.validate()?;
        Ok(format!(
            "\\usepackage{{fontspec}}\n\\usepackage{{unicode-math}}\n\\setmainfont{{{}}}\n\\setsansfont{{{}}}\n\\setmathfont{{{}}}\n",
            self.text_family.trim(), self.sans_family.trim(), self.math_font.trim(),
        ))
    }

    /// A self-contained proof drawing compiled by the real XeLaTeX engine.
    /// A successful PDF is insufficient: also audit warnings, extracted text and embedding.
    pub fn proof_source(&self) -> Result<String, FontInputError> {
        let mut doc = String::from("\\documentclass{standalone}\n");
        doc.push_str(&self.preamble()?);
        doc.push_str(
            "\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta,positioning}\n\\begin{document}\n"
        );
        doc.push_str(
            r"\begin{tikzpicture}[>=Stealth,every node/.style={align=center}]
  \node[draw,rounded corners,fill=blue!8,text width=4.5cm] (a) at (0,0) {Привет, мир!\\Геометрия и оптика};
  \node[draw,rounded corners,fill=green!8,right=1.2cm of a] (b) {\sffamily Научный рисунок\\\(E=\hbar\omega,\ \alpha+\beta=\gamma\)};
  \draw[->,line width=1pt] (a) -- (b);
\end{tikzpicture}
\end{document}
",
        );
        Ok(doc)
    }

    /// Node-local font selection. fontspec must be loaded in the project.
    pub fn example_node(&self, plain_text: &str) -> Result<String, FontInputError> {
        let family = validate_font_name(&self.text_family)?;
        let mut result = String::new();
        writeln!(
            &mut result,
            "\\node[font=\\fontspec{{{family}}},draw,rounded corners] at (0,0) {{{}}};",
            tex_escape_plain_text(plain_text)
        ).expect("writing to a String cannot fail");
        Ok(result)
    }
}

/// XeTeX missing characters are commonly logged as nonfatal diagnostics.
/// A return code of zero therefore does not prove correct font coverage.
#[must_use]
pub fn missing_glyph_messages(log: &str) -> Vec<String> {
    log.lines()
        .map(str::trim)
        .filter(|line| {
            line.starts_with("Missing character:")
                || line.starts_with("LaTeX Font Warning:")
                || line.starts_with("Package fontspec Warning:")
        })
        .map(str::to_owned)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn malicious_font_families_do_not_become_tex_commands() {
        for bad in ["", "{}", "Noto} \\input{secrets}", "%", "Noto\nSans", "C:\\fonts"] {
            assert!(validate_font_name(bad).is_err(), "{bad:?}");
        }
        assert!(validate_font_name("Noto Sans CJK SC").is_ok());
        assert!(validate_font_name("Libertinus Serif").is_ok());
        assert!(validate_font_name("New Computer Modern Math").is_ok());
    }

    #[test]
    fn figure_fonts_are_not_connected_to_gui_theme() {
        let profile = FigureFonts::default();
        let source = profile.proof_source().unwrap();
        assert!(source.contains(r"\setmainfont{DejaVu Serif}"));
        assert!(source.contains(r"\setmathfont{latinmodern-math.otf}"));
        assert!(source.contains("Привет, мир!"));
        assert!(source.contains(r"\alpha+\beta=\gamma"));
        assert!(!source.contains("Midnight"));
    }

    #[test]
    fn plain_labels_escape_reserved_tex_characters() {
        let text = r"Лазер_1 & 25% \ {a} $ # ^ ~";
        let result = FigureFonts::default().example_node(text).unwrap();
        assert!(result.contains(r"Лазер\_1 \& 25\%"));
        assert!(result.contains(r"\textbackslash{}"));
        assert!(result.contains(r"\{a\}"));
        assert!(result.contains(r"\$ \# \^{} \~{}"));
    }

    #[test]
    fn missing_glyphs_are_not_silent_success() {
        let log = "Missing character: There is no Ж in font LM Roman 10!\nLaTeX Font Warning: Font shape not available\n";
        assert_eq!(missing_glyph_messages(log).len(), 2);
        assert!(missing_glyph_messages("Output written on a.pdf").is_empty());
    }
}
