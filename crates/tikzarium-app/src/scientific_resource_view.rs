//! Explicit, revision-bound source references. No path resolution or source edit.
use eframe::egui;
use tikzarium_extensions::{
    scientific_resources::{
        ScientificResourceKind, ScientificResourceReference, ScientificResourceStatus,
        scan_scientific_resources,
    },
    scientific_scan::SourceView,
};

#[derive(Default)]
pub struct ScientificResourceView {
    references: Vec<ScientificResourceReference>,
    revision: Option<u64>,
    feedback: String,
}

impl ScientificResourceView {
    fn scan(&mut self, source: &str, revision: u64) {
        self.references.clear();
        self.revision = Some(revision);
        match scan_scientific_resources(SourceView {
            text: source,
            revision,
        }) {
            Ok(references) => {
                self.feedback = format!(
                    "Ссылок в исходнике: {}. Фактические входы сборки показаны отдельно ниже.",
                    references.len()
                );
                self.references = references;
            }
            Err(error) => {
                self.feedback =
                    format!("Ссылки не распознаны: {error}. Исходник сохранён без изменений.")
            }
        }
    }

    fn discard_stale(&mut self, revision: u64) {
        if self.revision.is_some_and(|previous| previous != revision) {
            self.references.clear();
            self.revision = None;
            self.feedback = "Исходник изменился. Обновите список ссылок.".into();
        }
    }

    pub fn show(&mut self, ui: &mut egui::Ui, source: &str, revision: u64) -> Option<usize> {
        self.discard_stale(revision);
        let mut selected_line = None;
        egui::CollapsingHeader::new("Ссылки на данные и TeX")
            .default_open(true)
            .show(ui, |ui| {
                ui.small("Поиск plot file, input и include. Макросы не раскрываются; наличие файла не проверяется.");
                if ui.button("Найти ссылки в исходнике").clicked() {
                    self.scan(source, revision);
                }
                if !self.feedback.is_empty() { ui.label(&self.feedback); }
                for (index, reference) in self.references.iter().take(64).enumerate() {
                    let kind = match reference.kind {
                        ScientificResourceKind::TikzPlotFile => "plot file",
                        ScientificResourceKind::TexInput => "input",
                        ScientificResourceKind::TexInclude => "include",
                    };
                    let status = match reference.status {
                        ScientificResourceStatus::UnresolvedLiteral => "Литеральный путь · не разрешён",
                        ScientificResourceStatus::MacroContaining => "Путь с TeX-синтаксисом · не разрешён",
                    };
                    ui.push_id(index, |ui| {
                        if ui.small_button(format!("{kind} · строка {}", reference.line)).clicked() {
                            selected_line = Some(reference.line);
                        }
                        ui.add(egui::Label::new(egui::RichText::new(&reference.path).monospace()).wrap());
                        ui.small(status);
                        ui.separator();
                    });
                }
                if self.references.len() > 64 {
                    ui.small("Показаны первые 64 ссылки; остальные доступны в исходнике.");
                }
            });
        selected_line
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resource_navigation_uses_current_revision_and_preserves_source() {
        let source = "% Кириллица\r\n\\input{данные.tex}\r\n";
        let mut panel = ScientificResourceView::default();
        panel.scan(source, 12);
        assert_eq!(panel.references.len(), 1);
        assert_eq!(panel.references[0].line, 2);
        assert_eq!(panel.references[0].path, "данные.tex");
        assert_eq!(source, "% Кириллица\r\n\\input{данные.tex}\r\n");
        panel.discard_stale(13);
        assert!(panel.references.is_empty());
        assert_eq!(panel.revision, None);
    }
}
