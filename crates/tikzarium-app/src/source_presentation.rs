//! Source presentation only: metadata colors and wrapping must never modify
//! literal TeX, cursor offsets, line endings, or generated ownership markers.
use eframe::egui::{self, Color32, FontId};

/// Blend the metadata comment towards its editor background. Color ONLY:
/// no replacement, elision, folding, or font-size change in the editable buffer.
fn dim_comment(foreground: Color32, background: Color32) -> Color32 {
    let mix = |f: u8, b: u8| ((f as u16 * 3 + b as u16 * 2) / 5) as u8;
    Color32::from_rgb(
        mix(foreground.r(), background.r()),
        mix(foreground.g(), background.g()),
        mix(foreground.b(), background.b()),
    )
}

/// Match exact generator-owned inline metadata, including trailing comments on
/// an authored command. The original source string is returned byte-for-byte
/// inside LayoutJob so egui's caret and Undo indices stay authoritative.
pub fn layout_job(
    source: &str,
    font: FontId,
    foreground: Color32,
    editor_background: Color32,
    max_width: f32,
) -> egui::text::LayoutJob {
    let mut job = egui::text::LayoutJob::simple(
        String::new(),
        font.clone(),
        foreground,
        max_width,
    );
    let metadata = dim_comment(foreground, editor_background);
    let marker = "% tikzarium:n1:";
    for line in source.split_inclusive('\n') {
        let mut normal = |part: &str, color: Color32| {
            if !part.is_empty() {
                job.append(
                    part,
                    0.0,
                    egui::TextFormat {
                        font_id: font.clone(),
                        color,
                        ..Default::default()
                    },
                );
            }
        };
        if let Some(pos) = line.find(marker) {
            normal(&line[..pos], foreground);
            normal(&line[pos..], metadata);
        } else {
            normal(line, foreground);
        }
    }
    job
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn metadata_lens_does_not_change_crlf_unicode_macro_or_tikz_source_bytes() {
        let source = "\\newcommand{\\opaque}{Сохрани}\\r\\n\\draw (0,0)--(1,1); % tikzarium:n1:[1,\\\"line\\\",{\\\"x\\\":\\\"10cm\\\"}]\\r\\n\\node {\\opaque};\\r\\n";
        let fg = Color32::WHITE;
        let bg = Color32::BLACK;
        for wrap in [f32::INFINITY, 280.0] {
            let job = layout_job(source, FontId::monospace(14.0), fg, bg, wrap);
            assert_eq!(job.text.as_bytes(), source.as_bytes());
            assert!(job.sections.iter().any(|item| item.format.color != fg));
            assert!(job.sections.iter().any(|item| item.format.color == fg));
            assert_eq!(job.wrap.max_width, wrap);
        }
    }

    #[test]
    fn ordinary_percent_comments_and_manual_macros_keep_normal_contrast() {
        let source = "% заметка заказчика\\r\\n\\myMacro{не менять}\\r\\n";
        let fg = Color32::from_rgb(18, 28, 42);
        let job = layout_job(
            source,
            FontId::monospace(14.0),
            fg,
            Color32::WHITE,
            f32::INFINITY,
        );
        assert_eq!(job.text, source);
        assert!(job.sections.iter().all(|item| item.format.color == fg));
    }

    #[test]
    fn trailing_generator_marker_is_colored_without_hiding_draw_geometry() {
        let source = "\\draw (0,0)--(1,1); % tikzarium:n1:[2,\\\"line\\\"]\\n";
        let fg = Color32::WHITE;
        let job = layout_job(
            source, FontId::monospace(14.0), fg, Color32::BLACK, 480.0,
        );
        assert_eq!(job.text, source);
        let highlighted: String = job
            .sections
            .iter()
            .filter(|section| section.format.color != fg)
            .map(|section| &job.text[section.byte_range.clone()])
            .collect();
        assert!(highlighted.starts_with("% tikzarium:n1:"));
        assert!(highlighted.ends_with('\n'));
    }
}
