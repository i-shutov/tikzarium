//! Persistent egui appearance. This styling NEVER changes figure source or PDF colors.
use eframe::egui::{self, Color32, Stroke};
use serde::{Deserialize, Serialize};
use tikzarium_core::FigureFonts;

pub const STORAGE_KEY: &str = "tikzarium.preferences.v1";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum UiTheme {
    Light,
    #[default]
    Dark,
    Midnight,
    Paper,
}

impl UiTheme {
    pub const ALL: [Self; 4] = [Self::Light, Self::Dark, Self::Midnight, Self::Paper];

    pub const fn label(self) -> &'static str {
        match self {
            Self::Light => "Light",
            Self::Dark => "Dark",
            Self::Midnight => "Midnight",
            Self::Paper => "Paper",
        }
    }

    pub fn apply(self, ctx: &egui::Context, compact: bool) {
        let mut visuals = match self {
            Self::Light | Self::Paper => egui::Visuals::light(),
            Self::Dark | Self::Midnight => egui::Visuals::dark(),
        };
        match self {
            Self::Light => {
                visuals.selection.bg_fill = Color32::from_rgb(55, 118, 190);
                visuals.hyperlink_color = Color32::from_rgb(35, 99, 170);
            }
            Self::Dark => {
                visuals.selection.bg_fill = Color32::from_rgb(31, 126, 162);
                visuals.hyperlink_color = Color32::from_rgb(91, 185, 211);
            }
            Self::Midnight => {
                visuals.panel_fill = Color32::from_rgb(19, 26, 39);
                visuals.window_fill = Color32::from_rgb(26, 34, 49);
                visuals.extreme_bg_color = Color32::from_rgb(13, 19, 30);
                visuals.selection.bg_fill = Color32::from_rgb(54, 113, 184);
                visuals.hyperlink_color = Color32::from_rgb(125, 191, 239);
            }
            Self::Paper => {
                visuals.panel_fill = Color32::from_rgb(247, 245, 239);
                visuals.window_fill = Color32::from_rgb(255, 253, 248);
                visuals.extreme_bg_color = Color32::from_rgb(238, 235, 225);
                visuals.selection.bg_fill = Color32::from_rgb(38, 112, 112);
                visuals.selection.stroke = Stroke::new(1.0, Color32::WHITE);
                visuals.hyperlink_color = Color32::from_rgb(31, 109, 125);
            }
        }
        ctx.set_visuals(visuals);
        ctx.style_mut(|style| {
            style.spacing.item_spacing = if compact {
                egui::vec2(5.0, 3.0)
            } else {
                egui::vec2(8.0, 6.0)
            };
            style.spacing.interact_size.y = if compact { 23.0 } else { 29.0 };
        });
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct UiPreferences {
    pub theme: UiTheme,
    pub compact: bool,
    pub show_font_lab: bool,
    pub text_family: String,
    pub sans_family: String,
    pub math_font: String,
}

impl Default for UiPreferences {
    fn default() -> Self {
        let fonts = FigureFonts::default();
        Self {
            theme: UiTheme::default(),
            compact: true,
            show_font_lab: false,
            text_family: fonts.text_family,
            sans_family: fonts.sans_family,
            math_font: fonts.math_font,
        }
    }
}

impl UiPreferences {
    pub fn figure_fonts(&self) -> FigureFonts {
        FigureFonts {
            text_family: self.text_family.clone(),
            sans_family: self.sans_family.clone(),
            math_font: self.math_font.clone(),
        }
    }

    pub fn draw_toolbar(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        let mut changed = false;
        egui::ComboBox::from_id_salt("tikzarium-ui-theme")
            .selected_text(format!("Theme: {}", self.theme.label()))
            .show_ui(ui, |ui| {
                for theme in UiTheme::ALL {
                    changed |= ui
                        .selectable_value(&mut self.theme, theme, theme.label())
                        .changed();
                }
            });
        changed |= ui.checkbox(&mut self.compact, "Compact").changed();
        if changed {
            self.theme.apply(ctx, self.compact);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn themes_are_stable_and_distinct() {
        assert_eq!(UiTheme::ALL.len(), 4);
        assert_eq!(
            UiTheme::ALL.map(UiTheme::label),
            ["Light", "Dark", "Midnight", "Paper"]
        );
    }

    #[test]
    fn preferences_default_and_legacy_partial_data() {
        let defaults = UiPreferences::default();
        assert!(defaults.compact);
        assert_eq!(defaults.math_font, "latinmodern-math.otf");
        let old = r#"{"theme":"Paper"}"#;
        let restored: UiPreferences = serde_json::from_str(old).unwrap();
        assert_eq!(restored.theme, UiTheme::Paper);
        assert!(restored.compact);
    }

    #[test]
    fn themes_change_only_egui_not_xelatex_figure_source() {
        let ctx = egui::Context::default();
        let prefs = UiPreferences::default();
        let original = prefs.figure_fonts().proof_source().unwrap();
        for theme in UiTheme::ALL {
            theme.apply(&ctx, true);
            assert_eq!(prefs.figure_fonts().proof_source().unwrap(), original);
        }
    }
}
