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
    XLabel,
    YLabel,
    Mark,
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
            Self::XLabel => "xlabel",
            Self::YLabel => "ylabel",
            Self::Mark => "mark",
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Samples => "Число точек",
            Self::Domain => "Диапазон x",
            Self::XMin => "Левая граница x",
            Self::XMax => "Правая граница x",
            Self::YMin => "Нижняя граница y",
            Self::YMax => "Верхняя граница y",
            Self::XTickDistance => "Шаг делений x",
            Self::YTickDistance => "Шаг делений y",
            Self::XTick => "Деления x",
            Self::YTick => "Деления y",
            Self::Width => "Ширина",
            Self::Height => "Высота",
            Self::XLabel => "Подпись оси x",
            Self::YLabel => "Подпись оси y",
            Self::Mark => "Маркер ряда",
        }
    }

    fn choices(kind: ScientificKind) -> &'static [Self] {
        const AXIS: &[LiteralProperty] = &[
            LiteralProperty::Samples,
            LiteralProperty::Domain,
            LiteralProperty::XMin,
            LiteralProperty::XMax,
            LiteralProperty::YMin,
            LiteralProperty::YMax,
            LiteralProperty::XTickDistance,
            LiteralProperty::YTickDistance,
            LiteralProperty::XTick,
            LiteralProperty::YTick,
            LiteralProperty::Width,
            LiteralProperty::Height,
            LiteralProperty::XLabel,
            LiteralProperty::YLabel,
            LiteralProperty::Mark,
        ];
        const ADDPLOT: &[LiteralProperty] = &[
            LiteralProperty::Samples,
            LiteralProperty::Domain,
            LiteralProperty::Mark,
        ];
        match kind {
            ScientificKind::Axis => AXIS,
            ScientificKind::AddPlot => ADDPLOT,
            _ => &[],
        }
    }
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
    scan_revision: Option<u64>,
}

impl ScientificInspector {
    fn scan(&mut self, session: &mut tikz_authoring::Session, source: &str) {
        self.candidates.clear();
        self.selected = None;
        self.original_value = None;
        self.proposed_value.clear();
        self.scan_revision = Some(session.source_revision());
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

    fn discard_stale_candidates(&mut self, current_revision: u64) {
        if self
            .scan_revision
            .is_some_and(|revision| revision != current_revision)
        {
            self.candidates.clear();
            self.selected = None;
            self.original_value = None;
            self.proposed_value.clear();
            self.scan_revision = None;
            self.feedback = "Источник изменился. Распознайте команды заново.".into();
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
        self.discard_stale_candidates(session.source_revision());
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
    pub fn show_selected_help(&self, ui: &mut egui::Ui, current_revision: u64) -> bool {
        if self
            .selected
            .and_then(|index| self.candidates.get(index))
            .is_none_or(|candidate| candidate.instance.revision != current_revision)
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
        self.discard_stale_candidates(session.source_revision());
        egui::CollapsingHeader::new("График PGFPlots")
            .default_open(true)
            .show(ui, |ui| {
            ui.small("Показываются значения, явно записанные в исходнике. Макросы и значения TeX по умолчанию не подставляются.");
            if ui.button("Распознать оси и ряды").clicked() {
                self.scan(session, source);
            }
            if !self.candidates.is_empty() {
                let before = self.selected;
                let selected = self
                    .selected
                    .and_then(|i| self.candidates.get(i))
                    .map_or("Выберите исходную команду", |item| item.label.as_str());
                egui::ComboBox::from_id_salt("scientific-142-source-instance")
                    .width(ui.available_width())
                    .truncate()
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
                let selected_kind = self.selected
                    .and_then(|index| self.candidates.get(index))
                    .map(|candidate| candidate.instance.kind);
                let choices = selected_kind.map_or(&[][..], LiteralProperty::choices);
                if !choices.contains(&self.property) {
                    if let Some(first) = choices.first() {
                        self.property = *first;
                    }
                }
                ui.label("Параметр");
                let property_label = self.property.label();
                egui::ComboBox::from_id_salt("scientific-142-literal-property")
                    .width(ui.available_width())
                    .truncate()
                    .selected_text(property_label)
                    .show_ui(ui, |ui| {
                        for property in choices {
                            ui.selectable_value(&mut self.property, *property, property.label());
                        }
                    });
                if before != self.selected || old_property != self.property {
                    self.refresh_literal(session, source);
                }
                if let Some(original) = &self.original_value {
                    ui.small(format!("Из исходника: {original}"));
                    ui.collapsing("Справка · F1", |ui| {
                        self.show_selected_help(ui, session.source_revision());
                    });
                    let proposed_width = ui.available_width().max(220.0);
                    ui.add(
                        egui::TextEdit::singleline(&mut self.proposed_value)
                            .desired_width(proposed_width),
                    );
                    let enabled = self.proposed_value != *original
                        && !self.proposed_value.trim().is_empty();
                    if ui
                        .add_enabled(enabled, egui::Button::new("Применить"))
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
            ui.small("Изменение затрагивает одно значение исходника и попадает в общий список отмены. Текст и формулы ряда остаются в файле без пересчёта.");
            })
            .header_response
            .on_hover_text("Параметры оси и ряда PGFPlots. Неизвестные записи остаются без изменений.");
        changed_line
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAROV: &str =
        include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-001/figure.tex");
    const SAROV_REPEAT: &str =
        include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-003/figure.tex");

    #[test]
    fn all_fifteen_properties_map_to_reviewed_keys_and_kind_specific_lists() {
        let all = LiteralProperty::choices(ScientificKind::Axis);
        let addplot = LiteralProperty::choices(ScientificKind::AddPlot);
        assert_eq!(all.len(), 15);
        assert_eq!(
            addplot,
            &[
                LiteralProperty::Samples,
                LiteralProperty::Domain,
                LiteralProperty::Mark
            ]
        );
        let keys = all
            .iter()
            .map(|property| property.key())
            .collect::<Vec<_>>();
        assert_eq!(
            keys,
            [
                "samples",
                "domain",
                "xmin",
                "xmax",
                "ymin",
                "ymax",
                "xtick distance",
                "ytick distance",
                "xtick",
                "ytick",
                "width",
                "height",
                "xlabel",
                "ylabel",
                "mark",
            ]
        );
        for property in all {
            assert!(!property.label().is_empty());
            assert!(scientific_property_help(property.key()).is_some());
        }
        assert!(LiteralProperty::choices(ScientificKind::Draw).is_empty());
    }

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
    fn real_sv003_axis_plot_style_edit_preserves_foreach_and_is_one_shared_undo() {
        let mut source = SAROV_REPEAT.to_owned();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        let mut inspector = ScientificInspector::default();
        inspector.scan(&mut authoring, &source);
        let selected = inspector
            .candidates
            .iter()
            .position(|candidate| {
                candidate.instance.kind == ScientificKind::Axis
                    && source
                        .get(candidate.instance.range.clone())
                        .is_some_and(|text| text.contains("samples=150"))
            })
            .unwrap();
        inspector.selected = Some(selected);
        inspector.refresh_literal(&authoring, &source);
        assert_eq!(inspector.original_value.as_deref(), Some("150"));
        inspector.proposed_value = "180".into();
        inspector
            .apply_selected(&mut authoring, &mut source)
            .unwrap();
        assert!(source.contains("mark=none,samples=180"));
        assert!(authoring.undo_available());
        authoring.undo(&mut source).unwrap();
        assert_eq!(source.as_bytes(), SAROV_REPEAT.as_bytes());
        assert!(!authoring.undo_available());
    }

    #[test]
    fn unicode_label_edit_preserves_crlf_and_undo_restores_exact_bytes() {
        let mut source = "\\begin{tikzpicture}\r\n\\begin{axis}[xlabel={Time (s)}]\r\n\\end{axis}\r\n\\end{tikzpicture}\r\n".to_owned();
        let original = source.clone();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        let mut inspector = ScientificInspector::default();
        inspector.scan(&mut authoring, &source);
        inspector.selected = Some(0);
        inspector.property = LiteralProperty::XLabel;
        inspector.refresh_literal(&authoring, &source);
        assert_eq!(inspector.original_value.as_deref(), Some("{Time (s)}"));
        inspector.proposed_value = "{Время (с)}".into();
        inspector
            .apply_selected(&mut authoring, &mut source)
            .unwrap();
        assert!(source.contains("xlabel={Время (с)}]\r\n"));
        assert!(source.contains("\r\n"));
        authoring.undo(&mut source).unwrap();
        assert_eq!(source.as_bytes(), original.as_bytes());
    }

    #[test]
    fn revision_change_discards_candidates_and_stale_f1_is_rejected() {
        let mut source = SAROV.to_owned();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        let mut inspector = ScientificInspector::default();
        inspector.scan(&mut authoring, &source);
        inspector.selected = inspector
            .candidates
            .iter()
            .position(|item| item.instance.kind == ScientificKind::Axis);
        inspector.refresh_literal(&authoring, &source);
        assert!(inspector.original_value.is_some());
        let stale_revision = authoring.source_revision();
        source.push_str("% изменённый источник\n");
        authoring.note_manual_source_edit(&source);
        assert_ne!(authoring.source_revision(), stale_revision);
        let ctx = egui::Context::default();
        ctx.begin_pass(egui::RawInput::default());
        egui::CentralPanel::default().show(&ctx, |ui| {
            assert!(!inspector.show_selected_help(ui, authoring.source_revision()));
        });
        let _ = ctx.end_pass();
        assert_eq!(inspector.candidates[0].instance.revision, stale_revision);
        inspector.discard_stale_candidates(authoring.source_revision());
        assert!(inspector.candidates.is_empty());
        assert!(inspector.selected.is_none());
        assert!(inspector.original_value.is_none());
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
            assert!(inspector.show_selected_help(ui, authoring.source_revision()));
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
    fn compact_inspector_stays_within_225_and_260_pixel_panels_for_every_axis_option() {
        for panel_width in [225.0, 260.0] {
            for property in LiteralProperty::choices(ScientificKind::Axis) {
                let mut source = SAROV.to_owned();
                let mut authoring = tikz_authoring::Session::default();
                authoring.reset(&source);
                let mut inspector = ScientificInspector::default();
                inspector.scan(&mut authoring, &source);
                inspector.selected = inspector
                    .candidates
                    .iter()
                    .position(|item| item.instance.kind == ScientificKind::Axis);
                inspector.property = *property;
                inspector.refresh_literal(&authoring, &source);
                let ctx = egui::Context::default();
                let mut input = egui::RawInput::default();
                input.screen_rect = Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(panel_width, 640.0),
                ));
                ctx.begin_pass(input);
                egui::CentralPanel::default().show(&ctx, |ui| {
                    ui.set_max_width(panel_width);
                    let _ = inspector.show(ui, &mut authoring, &mut source);
                    assert!(ui.min_rect().width() <= panel_width + 1.0);
                });
                let _ = ctx.end_pass();
            }
        }
    }
}
