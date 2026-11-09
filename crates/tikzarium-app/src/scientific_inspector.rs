//! Scientific-142 Inspector: one source figure, no hidden TeX rewrite.
//! A source scan happens only on explicit user request, never each egui frame.
use crate::tikz_authoring;
use eframe::egui;
use tikzarium_extensions::scientific_scan::{
    RecognizedInstance, ScientificKind, SourceView, literal_key_value, scientific_property_help,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
enum LiteralProperty {
    #[default]
    Samples,
    Domain,
    XMin,
    XMax,
    YMin,
    YMax,
    XTickDistance,
    YTickDistance,
    XTick,
    YTick,
    Width,
    Height,
    Mark,
    XLabel,
    YLabel,
}

impl LiteralProperty {
    fn key(self) -> &'static str {
        match self {
            Self::Samples => "samples",
            Self::Domain => "domain",
            Self::XMin => "xmin",
            Self::XMax => "xmax",
            Self::YMin => "ymin",
            Self::YMax => "ymax",
            Self::XTickDistance => "xtick distance",
            Self::YTickDistance => "ytick distance",
            Self::XTick => "xtick",
            Self::YTick => "ytick",
            Self::Width => "width",
            Self::Height => "height",
            Self::Mark => "mark",
            Self::XLabel => "xlabel",
            Self::YLabel => "ylabel",
        }
    }

    fn available_for(self, kind: ScientificKind) -> bool {
        match kind {
            ScientificKind::Axis => true,
            ScientificKind::AddPlot => matches!(self, Self::Samples | Self::Domain | Self::Mark),
            _ => false,
        }
    }

    const ALL: [Self; 15] = [
        Self::Samples,
        Self::Domain,
        Self::XMin,
        Self::XMax,
        Self::YMin,
        Self::YMax,
        Self::XTickDistance,
        Self::YTickDistance,
        Self::XTick,
        Self::YTick,
        Self::Width,
        Self::Height,
        Self::Mark,
        Self::XLabel,
        Self::YLabel,
    ];
}

struct Candidate {
    instance: RecognizedInstance,
    label: String,
}

#[derive(Default)]
pub struct ScientificInspector {
    candidates: Vec<Candidate>,
    selected: Option<usize>,
    property: LiteralProperty,
    original_value: Option<String>,
    proposed_value: String,
    feedback: String,
}

impl ScientificInspector {
    fn scan(&mut self, session: &mut tikz_authoring::Session, source: &str) {
        self.candidates.clear();
        self.selected = None;
        self.original_value = None;
        self.proposed_value.clear();
        match session.scientific_candidates(source) {
            Ok(instances) => {
                let recognized = instances
                    .iter()
                    .filter(|item| {
                        matches!(item.kind, ScientificKind::Axis | ScientificKind::AddPlot)
                    })
                    .count();
                self.candidates = instances
                    .into_iter()
                    .filter(|item| {
                        matches!(item.kind, ScientificKind::Axis | ScientificKind::AddPlot)
                    })
                    .take(64)
                    .map(|instance| {
                        let line = source.get(..instance.range.start).map_or(1, |prefix| {
                            prefix.bytes().filter(|byte| *byte == b'\n').count() + 1
                        });
                        let kind = match instance.kind {
                            ScientificKind::Axis => "axis",
                            ScientificKind::AddPlot => "addplot",
                            _ => "неизвестно",
                        };
                        Candidate {
                            label: format!("{kind} · строка {line}"),
                            instance,
                        }
                    })
                    .collect();
                self.feedback = format!(
                    "Распознано {recognized} axis/addplot; доступны только проверенные литералы. {}",
                    if recognized > self.candidates.len() {
                        "Показаны первые 64, остальные — текстовый редактор."
                    } else {
                        "Другие конструкции остаются исходным TeX."
                    }
                );
            }
            Err(error) => {
                self.feedback = format!("OPAQUE: {error}. Исходный TeX не изменён.");
            }
        }
    }

    fn refresh_literal(&mut self, session: &tikz_authoring::Session, source: &str) {
        self.original_value = None;
        self.proposed_value.clear();
        let Some(index) = self.selected else {
            return;
        };
        let Some(selected) = self.candidates.get(index) else {
            return;
        };
        let view = SourceView {
            text: source,
            revision: session.source_revision(),
        };
        match literal_key_value(view, &selected.instance, self.property.key()) {
            Ok(value) => {
                self.proposed_value.clone_from(&value);
                self.original_value = Some(value);
                self.feedback =
                    "Литерал принадлежит конкретной команде; можно править точечно".into();
            }
            Err(error) => {
                self.feedback =
                    format!("OPAQUE/NOT_EDITABLE: {error}. Используйте текстовый редактор.");
            }
        }
    }

    fn apply_selected(
        &mut self,
        session: &mut tikz_authoring::Session,
        source: &mut String,
    ) -> Result<usize, String> {
        let index = self.selected.ok_or("Сначала выберите axis/addplot")?;
        let selected = self
            .candidates
            .get(index)
            .ok_or("Выбранная команда больше недоступна")?;
        let original = self
            .original_value
            .as_deref()
            .ok_or("Нет подтверждённого литерала для правки")?;
        let line = session.apply_scientific_literal(
            source,
            &selected.instance,
            self.property.key(),
            original,
            &self.proposed_value,
        )?;
        self.candidates.clear();
        self.selected = None;
        self.original_value = None;
        self.proposed_value.clear();
        self.feedback =
            "Изменено одно значение исходника. Undo — общий; пересканируйте для следующей правки."
                .into();
        Ok(line)
    }

    /// The same source-owned property guide appears in Studio's F1 dock
    /// and in the field's inline help; no fabricated TikZ defaults.
    pub fn show_selected_help(&self, ui: &mut egui::Ui) -> bool {
        if self
            .selected
            .and_then(|index| self.candidates.get(index))
            .is_none()
            || self.original_value.is_none()
        {
            return false;
        }
        let Some(help) = scientific_property_help(self.property.key()) else {
            return false;
        };
        ui.strong(format!("PGFPlots: {}", help.key));
        ui.label(format!("Тип: {}", help.value_type));
        ui.label(help.effect);
        ui.small(format!("Поддержка TikZarium: {}", help.editor_limit));
        ui.small(format!("Пример: {}", help.example));
        ui.small(format!("Пакет: {}", help.package));
        ui.small(format!(
            "Значение по умолчанию TeX: {}",
            help.verified_tex_default
        ));
        ui.small(format!("Руководство: {}", help.manual_section));
        true
    }

    pub fn show(
        &mut self,
        ui: &mut egui::Ui,
        session: &mut tikz_authoring::Session,
        source: &mut String,
    ) -> Option<usize> {
        let mut changed_line = None;
        ui.collapsing("Научный TikZ · параметры исходника", |ui| {
            ui.small("SC2: обычный .tex, один рисунок. Никакого CAD, макрораскрытия и PDF→TikZ.");
            if ui.button("Распознать axis / addplot").clicked() {
                self.scan(session, source);
            }
            if !self.candidates.is_empty() {
                let before = self.selected;
                let selected = self
                    .selected
                    .and_then(|i| self.candidates.get(i))
                    .map_or("Выберите исходную команду", |item| item.label.as_str());
                egui::ComboBox::from_id_salt("scientific-142-source-instance")
                    .selected_text(selected)
                    .show_ui(ui, |ui| {
                        for (index, item) in self.candidates.iter().enumerate() {
                            ui.selectable_value(
                                &mut self.selected,
                                Some(index),
                                &item.label,
                            );
                        }
                    });
                let old_property = self.property;
                let kind = self
                    .selected
                    .and_then(|index| self.candidates.get(index))
                    .map(|item| item.instance.kind);
                if let Some(kind) = kind
                    && !self.property.available_for(kind)
                {
                    self.property = LiteralProperty::Samples;
                }
                ui.horizontal(|ui| {
                    ui.label("Параметр:");
                    egui::ComboBox::from_id_salt("scientific-142-property")
                        .selected_text(self.property.key())
                        .show_ui(ui, |ui| {
                            for property in LiteralProperty::ALL {
                                if kind.is_some_and(|kind| property.available_for(kind)) {
                                    ui.selectable_value(
                                        &mut self.property,
                                        property,
                                        property.key(),
                                    );
                                }
                            }
                        });
                });
                if before != self.selected || old_property != self.property {
                    self.refresh_literal(session, source);
                }
                if let Some(original) = &self.original_value {
                    ui.small(format!("Из исходника: {original}"));
                    ui.collapsing("ⓘ Справка по параметру · F1", |ui| {
                        self.show_selected_help(ui);
                    });
                    ui.add(
                        egui::TextEdit::singleline(&mut self.proposed_value)
                            .desired_width(160.0),
                    );
                    let enabled = self.proposed_value != *original
                        && !self.proposed_value.trim().is_empty();
                    if ui
                        .add_enabled(enabled, egui::Button::new("Применить SourcePatch"))
                        .clicked()
                    {
                        match self.apply_selected(session, source) {
                            Ok(line) => changed_line = Some(line),
                            Err(error) => {
                                self.feedback = format!(
                                    "Изменение отклонено: {error}. Источник сохранён."
                                );
                            }
                        }
                    }
                }
            }
            if !self.feedback.is_empty() {
                ui.small(&self.feedback);
            }
            ui.small("Лишь явно заданные и проверенные параметры axis/addplot. Макросы и неподдержанные формулы — OPAQUE; PDF строит внешний XeLaTeX.");
        });
        changed_line
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAROV: &str =
        include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-001/figure.tex");

    #[test]
    fn real_sarov_inspector_selection_apply_and_single_shared_undo() {
        let mut source = SAROV.to_owned();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        let mut inspector = ScientificInspector::default();
        inspector.scan(&mut authoring, &source);
        let selected = inspector
            .candidates
            .iter()
            .position(|candidate| candidate.instance.kind == ScientificKind::Axis)
            .unwrap();
        inspector.selected = Some(selected);
        inspector.refresh_literal(&authoring, &source);
        assert_eq!(inspector.original_value.as_deref(), Some("150"));
        inspector.proposed_value = "180".to_owned();
        let line = inspector
            .apply_selected(&mut authoring, &mut source)
            .unwrap();
        assert!(line > 10);
        assert!(source.contains("samples=180"));
        assert!(authoring.undo_available());
        authoring.undo(&mut source).unwrap();
        assert_eq!(source.as_bytes(), SAROV.as_bytes());
        assert!(!authoring.undo_available());
    }

    #[test]
    fn studio_f1_help_uses_shared_property_spec_without_writing_tex() {
        let source = SAROV.to_owned();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        let mut inspector = ScientificInspector::default();
        inspector.scan(&mut authoring, &source);
        let selected = inspector
            .candidates
            .iter()
            .position(|item| item.instance.kind == ScientificKind::Axis)
            .unwrap();
        inspector.selected = Some(selected);
        inspector.refresh_literal(&authoring, &source);
        let before = source.clone();
        let ctx = egui::Context::default();
        ctx.begin_pass(egui::RawInput::default());
        egui::CentralPanel::default().show(&ctx, |ui| {
            assert!(inspector.show_selected_help(ui));
        });
        let _ = ctx.end_pass();
        assert_eq!(before.as_bytes(), source.as_bytes());
        assert_eq!(inspector.original_value.as_deref(), Some("150"));
    }

    #[test]
    fn rendering_idle_inspector_does_not_mutate_source() {
        let mut source = SAROV.to_owned();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        let mut inspector = ScientificInspector::default();
        let ctx = egui::Context::default();
        ctx.begin_pass(egui::RawInput::default());
        egui::CentralPanel::default().show(&ctx, |ui| {
            assert!(inspector.show(ui, &mut authoring, &mut source).is_none());
        });
        let _ = ctx.end_pass();
        assert_eq!(source.as_bytes(), SAROV.as_bytes());
    }

    #[test]
    fn real_sv001_ymax_inspector_model_applies_exact_undo_and_rejects_series_bound() {
        let mut source = SAROV.to_owned();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        let mut inspector = ScientificInspector::default();
        inspector.scan(&mut authoring, &source);
        let axis_index = inspector
            .candidates
            .iter()
            .position(|candidate| candidate.instance.kind == ScientificKind::Axis)
            .unwrap();
        let plot_index = inspector
            .candidates
            .iter()
            .position(|candidate| candidate.instance.kind == ScientificKind::AddPlot)
            .unwrap();
        inspector.property = LiteralProperty::YMax;
        inspector.selected = Some(plot_index);
        inspector.refresh_literal(&authoring, &source);
        assert_eq!(inspector.original_value, None);
        inspector.selected = Some(axis_index);
        inspector.refresh_literal(&authoring, &source);
        assert_eq!(inspector.original_value.as_deref(), Some("1.4"));
        inspector.proposed_value = "1.2".to_owned();
        let line = inspector
            .apply_selected(&mut authoring, &mut source)
            .unwrap();
        assert!(line > 10);
        assert!(source.contains("ymax=1.2"));
        assert!(source.contains(r"\pgfplotsset{compat=1.17}"));
        assert!(authoring.undo_available());
        authoring.undo(&mut source).unwrap();
        assert_eq!(source.as_bytes(), SAROV.as_bytes());
        assert!(!authoring.undo_available());
    }
    #[test]
    fn sarov_tick_size_marker_inspector_uses_one_existing_undo_per_edit() {
        let mut source = SAROV.to_owned();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        let mut inspector = ScientificInspector::default();

        for (property, old, new) in [
            (LiteralProperty::XTickDistance, "1", "2"),
            (LiteralProperty::Height, r"0.62\textwidth", r"0.75\textwidth"),
            (LiteralProperty::Mark, "none", "*"),
        ] {
            inspector.scan(&mut authoring, &source);
            inspector.selected = inspector
                .candidates
                .iter()
                .position(|item| item.instance.kind == ScientificKind::Axis);
            inspector.property = property;
            inspector.refresh_literal(&authoring, &source);
            assert_eq!(inspector.original_value.as_deref(), Some(old));
            inspector.proposed_value = new.to_owned();
            let line = inspector.apply_selected(&mut authoring, &mut source).unwrap();
            assert!(line > 10);
            assert!(authoring.undo_available());
            assert!(source.contains(&format!("{}={new}", property.key())));
            authoring.undo(&mut source).unwrap();
            assert_eq!(source.as_bytes(), SAROV.as_bytes());
            assert!(!authoring.undo_available());
        }
    }

    #[test]
    fn mathematical_sarov_xlabel_is_opaque_in_f1_and_never_modified() {
        let mut source = SAROV.to_owned();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        let mut inspector = ScientificInspector::default();
        inspector.scan(&mut authoring, &source);
        inspector.selected = inspector
            .candidates
            .iter()
            .position(|item| item.instance.kind == ScientificKind::Axis);
        inspector.property = LiteralProperty::XLabel;
        inspector.refresh_literal(&authoring, &source);
        assert!(inspector.original_value.is_none());
        assert!(!authoring.undo_available());
        let ctx = egui::Context::default();
        ctx.begin_pass(egui::RawInput::default());
        egui::CentralPanel::default().show(&ctx, |ui| {
            assert!(!inspector.show_selected_help(ui));
            assert!(inspector.show(ui, &mut authoring, &mut source).is_none());
        });
        let _ = ctx.end_pass();
        assert_eq!(source.as_bytes(), SAROV.as_bytes());
    }

}
