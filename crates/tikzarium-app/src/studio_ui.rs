//! B42 studio workbench: native TikZ tool rail and context-sensitive docks.
//! The C catalogue remains the single source of tool/help facts, and the
//! external XeLaTeX PDF remains authoritative. No internal TeX renderer.
use eframe::egui;
use serde::{Deserialize, Serialize};
use tikzarium_extensions::primitives::Evidence;

use crate::tikz_authoring::{self, Session, TOOLS, Tool};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum StudioDock {
    #[default]
    Properties,
    Libraries,
    Help,
}

impl StudioDock {
    pub const ALL: [Self; 3] = [Self::Properties, Self::Libraries, Self::Help];

    pub const fn label(self) -> &'static str {
        match self {
            Self::Properties => "Свойства",
            Self::Libraries => "Библиотеки",
            Self::Help => "Справка",
        }
    }
}

/// Layout policy uses logical egui points, not PDF coordinates. At narrow
/// widths the rail becomes icon-only, and the dock can be hidden explicitly.
#[derive(Clone, Copy, Debug)]
pub struct StudioLayout {
    pub tool_rail_width: f32,
    pub inspector_width: f32,
    pub inspector_max: f32,
    pub narrow: bool,
}

impl StudioLayout {
    #[must_use]
    pub fn for_width(width: f32) -> Self {
        let width = if width.is_finite() { width.max(0.0) } else { 0.0 };
        Self {
            tool_rail_width: if width < 1050.0 { 94.0 } else { 136.0 },
            inspector_width: (width * 0.22).clamp(225.0, 300.0),
            inspector_max: (width * 0.28).clamp(260.0, 350.0),
            narrow: width < 1050.0,
        }
    }
}

fn symbol(tool: Tool) -> &'static str {
    match tool {
        Tool::Line => "╱",
        Tool::Arrow => "→",
        Tool::Rectangle => "▭",
        Tool::Circle => "○",
        Tool::Node => "T",
        Tool::Cubic => "∿",
    }
}

/// Actual tool selection uses the same Session and C catalogue as the
/// historical toolbar. It does not insert any TeX or create an Undo entry.
pub fn show_tool_rail(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &str,
    narrow: bool,
) -> Option<StudioDock> {
    let mut navigate = None;
    ui.heading(if narrow { "TikZ" } else { "Инструменты" });
    ui.separator();
    for tool in TOOLS {
        let info = tikz_authoring::spec(tool);
        let title = if narrow {
            symbol(tool).to_owned()
        } else {
            format!("{}  {}", symbol(tool), info.title_ru)
        };
        let response = ui
            .add_sized(
                [ui.available_width(), 34.0],
                egui::Button::new(title).selected(session.active == Some(tool)),
            )
            .on_hover_text(format!(
                "{}\n{}\nPGF/TikZ §{} · {}\nБиблиотеки: {}",
                info.help_ru,
                info.syntax,
                info.manual_section,
                info.manual_url,
                if info.requirements.libraries.is_empty() {
                    "core".to_owned()
                } else {
                    info.requirements.libraries.join(", ")
                }
            ));
        if response.clicked() {
            session.select_tool(tool);
        }
    }
    ui.separator();
    let tool_state = session.active.map(|tool| tikz_authoring::requirements_status(source, tool));
    match tool_state {
        Some(Evidence::Confirmed) => {
            ui.small("Код TikZ готов к вставке.");
        }
        Some(Evidence::Absent) => {
            ui.colored_label(ui.visuals().warn_fg_color, "Нужно подключение.");
        }
        Some(Evidence::Unknown) => {
            ui.colored_label(ui.visuals().warn_fg_color, "Импорт: UNKNOWN");
        }
        None => {
            ui.small("Выберите инструмент.");
        }
    }
    ui.add_space(6.0);
    if ui
        .add_sized(
            [ui.available_width(), 29.0],
            egui::Button::new(if narrow { "Пакеты" } else { "Библиотеки / пакеты" }),
        )
        .on_hover_text("Родные TikZ-библиотеки и другие пакеты; неизвестные возможности не скрываются.")
        .clicked()
    {
        navigate = Some(StudioDock::Libraries);
    }
    if ui
        .add_sized(
            [ui.available_width(), 29.0],
            egui::Button::new(if narrow { "F1" } else { "Справка · F1" }),
        )
        .clicked()
    {
        session.help = true;
        navigate = Some(StudioDock::Help);
    }
    ui.separator();
    ui.small("Редактируется обычный .tex; сетка не заменяет PDF.");
    navigate
}

/// One read-only context help dock shared with F1, command properties and
/// the offline search. No duplicate defaults or new parameter schema.
pub fn show_context_help(ui: &mut egui::Ui, session: &Session) {
    ui.heading("Контекстная справка");
    if let Some(tool) = session.active {
        let info = tikz_authoring::spec(tool);
        ui.strong(&info.title_ru);
        ui.label(&info.help_ru);
        ui.code(&info.syntax);
        ui.label("Пример из общего каталога:");
        ui.code(&info.example);
        ui.small(format!(
            "Требования: {} · библиотеки: {} · XeLaTeX · сверено с PGF {}",
            info.requirements.packages.join(", "),
            if info.requirements.libraries.is_empty() {
                "core".to_owned()
            } else {
                info.requirements.libraries.join(", ")
            },
            info.requirements.documented_against
        ));
        ui.hyperlink_to(
            format!("PGF/TikZ §{}", info.manual_section),
            &info.manual_url,
        );
        for parameter in &info.parameter {
            egui::CollapsingHeader::new(&parameter.id).show(ui, |ui| {
                ui.label(&parameter.help_ru);
                ui.code(&parameter.syntax);
                ui.small(format!(
                    "Тип: {} · Единицы: {} · Значения: {}",
                    parameter.kind,
                    parameter.units.join(", "),
                    parameter.allowed_values.join(", ")
                ));
                if parameter.default_provenance == "editor_preset" {
                    ui.small(format!(
                        "Начальное значение редактора: {} (НЕ default TikZ)",
                        parameter.default
                    ));
                } else {
                    ui.small("Документированный default: UNKNOWN");
                }
                ui.label(&parameter.interaction_ru);
                ui.label(&parameter.warning_ru);
                ui.code(&parameter.example);
                ui.hyperlink_to(
                    format!("PGF/TikZ §{}", parameter.manual_section),
                    &parameter.manual_url,
                );
            });
        }
    } else {
        ui.label("Выберите инструмент слева или найдите команду ниже.");
        ui.small("Требования, значения и примеры берутся из единого каталога C.");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ergonomic_width_policy_keeps_a_real_central_viewport() {
        for width in [850.0_f32, 1180.0, 1366.0, 1920.0] {
            let l = StudioLayout::for_width(width);
            // 240 pt editable source, chosen dock and its rail must not
            // consume the entire minimum-sized studio.
            assert!(width - l.tool_rail_width - l.inspector_width - 240.0 > 190.0);
        }
        assert!(StudioLayout::for_width(850.0).narrow);
        assert!(!StudioLayout::for_width(1366.0).narrow);
    }

    #[test]
    fn rail_reuses_the_single_validated_c_catalogue() {
        let ids: Vec<_> = TOOLS
            .iter()
            .map(|tool| tikz_authoring::spec(*tool).id.as_str())
            .collect();
        assert_eq!(ids.len(), 6);
        assert!(ids.contains(&"tikz.bezier-cubic"));
        assert!(ids.contains(&"tikz.arrow"));
    }

    #[test]
    fn studio_dock_labels_and_serialization_are_stable() {
        assert_eq!(StudioDock::ALL.len(), 3);
        let value = serde_json::to_string(&StudioDock::Libraries).unwrap();
        assert_eq!(serde_json::from_str::<StudioDock>(&value).unwrap(), StudioDock::Libraries);
    }
}
