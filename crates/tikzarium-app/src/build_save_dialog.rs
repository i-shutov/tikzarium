//! Explicit in-window Save & Build for a scratch document.
//!
//! A platform-native Save As picker may hide behind an RDP window. Build must
//! not appear to do nothing, infer that "figure.tex" is authorized, or write
//! to the last Open-path field. The user supplies a destination inside egui.
use std::path::PathBuf;

use eframe::egui;

use super::{Document, typed_save_destination};

#[derive(Debug, PartialEq, Eq)]
pub(super) enum BuildSaveAction {
    Save(PathBuf),
    Reject(String),
    Cancel,
}

/// A separate control function permits true egui pointer-event tests of the
/// production button, rather than testing only a simulated path validator.
fn controls(
    ui: &mut egui::Ui,
    document: &Document,
    save_input: &mut String,
    validation_error: Option<&str>,
) -> (Option<BuildSaveAction>, egui::Rect) {
    ui.heading("Сохранение перед сборкой");
    ui.separator();
    ui.label("Новый рисунок ещё не сохранён. Для сборки через XeLaTeX укажите путь к .tex-файлу.");
    ui.label("Путь для нового исходника:");
    ui.add(
        egui::TextEdit::singleline(save_input)
            .desired_width(440.0)
            .hint_text("Полный путь к новому файлу .tex"),
    );
    ui.small("Существующий чужой файл не перезаписывается. Отмена не изменяет исходник.");
    if let Some(error) = validation_error {
        ui.colored_label(ui.visuals().error_fg_color, error);
    }
    let mut action = None;
    let mut save_rect = egui::Rect::NOTHING;
    ui.horizontal(|ui| {
        let save = ui.button("Сохранить и собрать PDF");
        save_rect = save.rect;
        if save.clicked() {
            action = Some(match typed_save_destination(document, save_input) {
                Ok(path) => BuildSaveAction::Save(path),
                Err(error) => BuildSaveAction::Reject(error),
            });
        }
        if ui.button("Отмена").clicked() {
            action = Some(BuildSaveAction::Cancel);
        }
    });
    (action, save_rect)
}

pub(super) fn show(
    ctx: &egui::Context,
    document: &Document,
    save_input: &mut String,
    validation_error: Option<&str>,
) -> Option<BuildSaveAction> {
    let mut action = None;
    egui::Modal::new(egui::Id::new("tikzarium-scratch-build-save")).show(ctx, |ui| {
        action = controls(ui, document, save_input, validation_error).0;
    });
    if action.is_none() && ctx.input(|input| input.key_pressed(egui::Key::Escape)) {
        action = Some(BuildSaveAction::Cancel);
    }
    action
}

#[cfg(test)]
mod tests {
    use super::*;

    fn frame(
        ctx: &egui::Context,
        document: &Document,
        save_input: &mut String,
        events: Vec<egui::Event>,
    ) -> (Option<BuildSaveAction>, egui::Rect) {
        let mut result = (None, egui::Rect::NOTHING);
        let _ = ctx.run(
            egui::RawInput {
                screen_rect: Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(1000.0, 600.0),
                )),
                events,
                ..Default::default()
            },
            |ctx| {
                egui::CentralPanel::default().show(ctx, |ui| {
                    result = controls(ui, document, save_input, None);
                });
            },
        );
        result
    }

    #[test]
    fn w3_scratch_build_requires_explicit_destination_and_rejects_other_files() {
        let dir = tempfile::tempdir().unwrap();
        let occupied = dir.path().join("старый.tex");
        let existing_bytes = b"% keep other content\r\n";
        std::fs::write(&occupied, existing_bytes).unwrap();
        let document = Document::scratch("% новая версия\r\n\\draw (0,0)--(1,1);\r\n");
        assert!(typed_save_destination(&document, "").is_err());
        assert!(typed_save_destination(&document, occupied.to_str().unwrap()).is_err());
        let alias = dir.path().join("sub").join("..").join("старый.tex");
        std::fs::create_dir(dir.path().join("sub")).unwrap();
        assert!(typed_save_destination(&document, alias.to_str().unwrap()).is_err());
        assert_eq!(std::fs::read(&occupied).unwrap(), existing_bytes);
    }

    #[test]
    fn w3_real_egui_save_build_button_requires_click_and_preserves_utf8_crlf() {
        let dir = tempfile::tempdir().unwrap();
        let destination = dir.path().join("рисунок из GUI.tex");
        let original = "% Комментарий\r\n\\draw (0,0) -- (1,1);\r\n";
        let mut document = Document::scratch(original);
        let mut input = destination.to_string_lossy().into_owned();
        let ctx = egui::Context::default();
        let (idle_action, button_rect) = frame(&ctx, &document, &mut input, vec![]);
        assert_eq!(idle_action, None);
        assert!(button_rect.is_positive());
        assert_eq!(document.path, None);
        assert!(!destination.exists());
        let at = button_rect.center();
        let pointer = |pressed| egui::Event::PointerButton {
            pos: at,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: Default::default(),
        };
        frame(
            &ctx,
            &document,
            &mut input,
            vec![egui::Event::PointerMoved(at), pointer(true)],
        );
        let action = frame(&ctx, &document, &mut input, vec![pointer(false)]).0;
        assert_eq!(action, Some(BuildSaveAction::Save(destination.clone())));
        assert!(!destination.exists(), "click alone must not write the file");
        document.save_to(&destination).unwrap();
        assert_eq!(std::fs::read(&destination).unwrap(), original.as_bytes());
        assert_eq!(document.path, Some(destination));
        assert!(!document.dirty());
    }
}
