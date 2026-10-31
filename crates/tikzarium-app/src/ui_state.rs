//! Small, testable UI state transitions. No dependency on the compiler or OS.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WorkspaceMode {
    Source,
    Split,
    Canvas,
}

impl WorkspaceMode {
    #[must_use]
    pub fn show_source(self) -> bool {
        self != Self::Canvas
    }

    #[must_use]
    pub fn show_canvas(self) -> bool {
        self != Self::Source
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BottomView {
    Issues,
    Log,
}

/// Convert TeX's one-based line numbers to egui's Unicode character offsets.
/// CRLF counts as one line break; never use UTF-8 byte offsets for editor cursors.
#[must_use]
pub fn line_start_char_index(source: &str, one_based_line: usize) -> Option<usize> {
    if one_based_line == 0 {
        return None;
    }
    if one_based_line == 1 {
        return Some(0);
    }
    let mut line = 1;
    for (index, character) in source.chars().enumerate() {
        if character == '\n' {
            line += 1;
            if line == one_based_line {
                return Some(index + 1);
            }
        }
    }
    None
}

/// Only a PDF corresponding to current source and a successful latest build is fresh.
#[must_use]
pub fn preview_is_stale(
    has_pdf: bool,
    last_build_failed: bool,
    built_source: Option<&str>,
    current_source: &str,
) -> bool {
    has_pdf && (last_build_failed || built_source != Some(current_source))
}

/// Keep zoom finite and inside a user-visible range, including corrupt state.
#[must_use]
pub fn scaled_zoom(current: f32, factor: f32) -> f32 {
    if !current.is_finite() || !factor.is_finite() || factor <= 0.0 {
        return 1.0;
    }
    (current * factor).clamp(0.2, 5.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn source_canvas_and_split_have_explicit_boundaries() {
        assert!(WorkspaceMode::Source.show_source());
        assert!(!WorkspaceMode::Source.show_canvas());
        assert!(WorkspaceMode::Split.show_source());
        assert!(WorkspaceMode::Split.show_canvas());
        assert!(!WorkspaceMode::Canvas.show_source());
        assert!(WorkspaceMode::Canvas.show_canvas());
    }

    #[test]
    fn navigation_counts_unicode_characters_not_utf8_bytes() {
        let source = "Привет\n\\begin{tikzpicture}\nтест\r\n";
        assert_eq!(line_start_char_index(source, 0), None);
        assert_eq!(line_start_char_index(source, 1), Some(0));
        assert_eq!(line_start_char_index(source, 2), Some(7));
        assert_eq!(line_start_char_index(source, 3), Some(27));
        assert_eq!(line_start_char_index(source, 4), Some(33));
        assert_eq!(line_start_char_index(source, 5), None);
    }

    #[test]
    fn last_good_pdf_never_masquerades_as_current_after_failure_or_edit() {
        assert!(!preview_is_stale(false, true, Some("x"), "y"));
        assert!(!preview_is_stale(true, false, Some("x"), "x"));
        assert!(preview_is_stale(true, true, Some("x"), "x"));
        assert!(preview_is_stale(true, false, Some("x"), "changed"));
        assert!(preview_is_stale(true, false, None, "x"));
    }

    #[test]
    fn zoom_clamps_and_drops_non_finite_inputs() {
        assert_eq!(scaled_zoom(1.0, 1.2), 1.2);
        assert_eq!(scaled_zoom(4.9, 1.2), 5.0);
        assert_eq!(scaled_zoom(0.21, 0.1), 0.2);
        assert_eq!(scaled_zoom(f32::NAN, 1.2), 1.0);
        assert_eq!(scaled_zoom(1.0, f32::INFINITY), 1.0);
    }
}
