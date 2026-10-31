//! Small, testable UI state transitions. No dependency on the compiler or OS.
use eframe::egui::{Key, Modifiers};
use std::path::Path;
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
    build_in_progress: bool,
    built_source: Option<&str>,
    current_source: &str,
    built_path: Option<&Path>,
    current_path: Option<&Path>,
) -> bool {
    has_pdf
        && (last_build_failed
            || build_in_progress
            || built_source != Some(current_source)
            || built_path.is_none()
            || built_path != current_path)
}

/// Use the platform's Command/Ctrl shortcut abstraction, not raw Ctrl on macOS.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EditorCommand {
    Open,
    Save,
    SaveAs,
    Build,
}

#[must_use]
pub fn editor_command(key: Key, modifiers: Modifiers) -> Option<EditorCommand> {
    if !modifiers.command {
        return None;
    }
    match (key, modifiers.shift) {
        (Key::O, false) => Some(EditorCommand::Open),
        (Key::S, false) => Some(EditorCommand::Save),
        (Key::S, true) => Some(EditorCommand::SaveAs),
        (Key::Enter, false) => Some(EditorCommand::Build),
        _ => None,
    }
}

/// Only navigate an error when the logged source can be identified as the open file.
/// Relative TeX paths are resolved against the current document directory.
/// For an unknown file we deliberately refuse to jump to a possibly wrong line.
#[must_use]
pub fn diagnostic_targets_current_file(source: Option<&Path>, current: Option<&Path>) -> bool {
    let (Some(source), Some(current)) = (source, current) else {
        return false;
    };
    let absolute = if source.is_absolute() {
        source.to_path_buf()
    } else {
        current.parent().unwrap_or_else(|| Path::new(".")).join(source)
    };
    match (absolute.canonicalize(), current.canonicalize()) {
        (Ok(a), Ok(b)) => a == b,
        _ => absolute == current,
    }
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
    fn failed_build_diagnostics_never_jump_to_an_included_file() {
        let dir = tempfile::tempdir().unwrap();
        let main = dir.path().join("main.tex");
        let include = dir.path().join("included.tex");
        std::fs::write(&main, "% main").unwrap();
        std::fs::write(&include, "% included").unwrap();
        assert!(diagnostic_targets_current_file(Some(Path::new("./main.tex")), Some(&main)));
        assert!(!diagnostic_targets_current_file(Some(Path::new("included.tex")), Some(&main)));
        assert!(!diagnostic_targets_current_file(Some(&include), Some(&main)));
        assert!(!diagnostic_targets_current_file(None, Some(&main)));
        assert!(!diagnostic_targets_current_file(Some(Path::new("main.tex")), None));
    }

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
        let path = Path::new("fig.tex");
        let moved = Path::new("fig-copy.tex");
        // An in-flight XeLaTeX run renders the retained prior PDF non-exportable.
        assert!(preview_is_stale(
            true,
            false,
            true,
            Some("x"),
            "x",
            Some(path),
            Some(path),
        ));
        assert!(!preview_is_stale(
            false,
            true,
            false,
            Some("x"),
            "y",
            None,
            None
        ));
        assert!(!preview_is_stale(
            true,
            false,
            false,
            Some("x"),
            "x",
            Some(path),
            Some(path),
        ));
        assert!(preview_is_stale(
            true,
            true,
            false,
            Some("x"),
            "x",
            Some(path),
            Some(path),
        ));
        assert!(preview_is_stale(
            true,
            false,
            false,
            Some("x"),
            "changed",
            Some(path),
            Some(path),
        ));
        assert!(preview_is_stale(
            true,
            false,
            false,
            None,
            "x",
            Some(path),
            Some(path),
        ));
        assert!(preview_is_stale(
            true,
            false,
            false,
            Some("x"),
            "x",
            Some(path),
            Some(moved),
        ));
        assert!(preview_is_stale(
            true,
            false,
            false,
            Some("x"),
            "x",
            None,
            Some(path),
        ));
    }

    #[test]
    fn command_shortcuts_respect_platform_command_and_shift() {
        let command = Modifiers {
            command: true,
            ..Default::default()
        };
        let save_as = Modifiers {
            command: true,
            shift: true,
            ..Default::default()
        };
        assert_eq!(editor_command(Key::S, command), Some(EditorCommand::Save));
        assert_eq!(editor_command(Key::S, save_as), Some(EditorCommand::SaveAs));
        assert_eq!(editor_command(Key::O, command), Some(EditorCommand::Open));
        assert_eq!(
            editor_command(Key::Enter, command),
            Some(EditorCommand::Build)
        );
        assert_eq!(editor_command(Key::O, save_as), None);
        assert_eq!(editor_command(Key::S, Modifiers::default()), None);
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
