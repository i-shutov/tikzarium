//! Independent font proof worker: XeLaTeX + glyph audit + embedded PDF fonts.
//! It does not modify or replace the user's open TeX document or its preview.
use std::{
    fs,
    process::Command,
    sync::mpsc::{self, Receiver},
};
use tikzarium_core::{BuildOptions, BuildRequest, BuildService, FigureFonts, find_executable};

#[derive(Debug)]
pub struct FontProofResult {
    pub description: String,
    pub font_report: String,
    pub preview_png: Option<Vec<u8>>,
    pub verified: bool,
}

pub fn spawn_font_proof(fonts: FigureFonts, xelatex: Option<std::path::PathBuf>, pdftoppm: Option<std::path::PathBuf>) -> Receiver<Result<FontProofResult, String>> {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let result = test_fonts(fonts, xelatex, pdftoppm);
        let _ = tx.send(result);
    });
    rx
}

fn test_fonts(fonts: FigureFonts, xelatex: Option<std::path::PathBuf>, pdftoppm: Option<std::path::PathBuf>) -> Result<FontProofResult, String> {
    let source = fonts.proof_source().map_err(|error| error.to_string())?;
    let xelatex = xelatex.ok_or_else(|| "XeLaTeX not found; font proof is NOT_RUN".to_owned())?;
    let dir = tempfile::tempdir().map_err(|e| e.to_string())?;
    let tex_file = dir.path().join("tikzarium-font-proof.tex");
    fs::write(&tex_file, source).map_err(|e| e.to_string())?;
    let request = BuildRequest {
        source: tex_file,
        xelatex,
        pdf_renderer: pdftoppm,
        options: BuildOptions::default(),
    };
    let artifact = BuildService::new().run(&request).map_err(|e| format!("XeLaTeX font proof failed: {e}"))?;
    let missing = tikzarium_core::missing_glyph_messages(&artifact.log);
    let mut report = String::new();
    let mut verified = missing.is_empty();
    if !missing.is_empty() {
        verified = false;
        report.push_str("MISSING GLYPHS:\n");
        report.push_str(&missing.join("\n"));
        report.push('\n');
    }

    let pdf_path = dir.path().join("font-proof.pdf");
    fs::write(&pdf_path, &artifact.pdf).map_err(|e| e.to_string())?;
    let expected = ["Привет, мир!", "Геометрия", "Научный рисунок"];
    let extraction = find_executable("pdftotext").and_then(|tool| {
        Command::new(tool).arg("-enc").arg("UTF-8").arg("-layout").arg(&pdf_path).arg("-").output().ok()
    });
    match extraction {
        Some(out) if out.status.success() => {
            let text = String::from_utf8_lossy(&out.stdout);
            let not_found = expected.iter().copied().filter(|phrase| !text.contains(phrase)).collect::<Vec<_>>();
            if not_found.is_empty() {
                report.push_str("PDF Cyrillic text extraction: PASS\n");
            } else {
                verified = false;
                report.push_str(&format!("PDF Cyrillic text extraction: FAIL: {}\n", not_found.join(", ")));
            }
        }
        _ => {
            verified = false;
            report.push_str("PDF Cyrillic text extraction: NOT_RUN (pdftotext unavailable)\n");
        }
    }
    let embedding = find_executable("pdffonts").and_then(|tool| Command::new(tool).arg(&pdf_path).output().ok());
    match embedding {
        Some(out) if out.status.success() => {
            let text = String::from_utf8_lossy(&out.stdout);
            let lines = text.lines().skip(2).filter(|line| !line.trim().is_empty()).collect::<Vec<_>>();
            if lines.is_empty() || lines.iter().any(|line| {
                let fields = line.split_whitespace().collect::<Vec<_>>();
                fields.len() < 6 || fields[3] != "yes" // 'emb' column
            }) {
                verified = false;
                report.push_str("Embedded fonts: FAIL / UNKNOWN\n");
            } else {
                report.push_str("Embedded fonts: PASS\n");
            }
            report.push_str(&text);
        }
        _ => {
            verified = false;
            report.push_str("Embedded fonts: NOT_RUN (pdffonts unavailable)\n");
        }
    }
    let preview_png = match artifact.preview {
        Ok(Some(p)) => Some(p.png),
        Ok(None) => {
            report.push_str("PNG preview unavailable (pdftoppm missing)\n");
            None
        }
        Err(err) => {
            report.push_str(&format!("PNG preview failed: {err}\n"));
            None
        }
    };

    let description = if verified {
        "PASS: XeLaTeX, required Cyrillic glyphs and embedded fonts".into()
    } else {
        "INCOMPLETE / FAIL: inspect typography report (PDF exists)".into()
    };
    Ok(FontProofResult { description, font_report: report, preview_png, verified })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn missing_engine_does_not_claim_font_pass() {
        let result = test_fonts(FigureFonts::default(), None, None);
        assert!(result.unwrap_err().contains("NOT_RUN"));
    }
    #[test]
    fn malicious_family_is_rejected_before_spawning_tex() {
        let mut fonts = FigureFonts::default();
        fonts.text_family = "Evil} \\input{secret}".into();
        let result = test_fonts(fonts, None, None);
        assert!(result.unwrap_err().contains("unsafe"));
    }
}
