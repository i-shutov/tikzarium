//! Persistent egui appearance. This styling NEVER changes figure source or PDF colors.
use crate::studio_ui::StudioDock;
use eframe::egui::{self, Color32, Stroke};
use serde::{Deserialize, Serialize};
use tikzarium_core::FigureFonts;

pub const STORAGE_KEY: &str = "tikzarium.preferences.v1";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum UiTheme {
    Light,
    Dark,
    #[default]
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
        // These four choices are explicit application preferences. Select the
        // active style slot before customizing it; a later first native OS
        // theme hint must not switch to the untouched opposite slot.
        ctx.set_theme(match self {
            Self::Light | Self::Paper => egui::Theme::Light,
            Self::Dark | Self::Midnight => egui::Theme::Dark,
        });
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
            style
                .text_styles
                .insert(egui::TextStyle::Body, egui::FontId::proportional(14.0));
            style
                .text_styles
                .insert(egui::TextStyle::Monospace, egui::FontId::monospace(14.0));
            style
                .text_styles
                .insert(egui::TextStyle::Small, egui::FontId::proportional(12.0));
        });
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct UiPreferences {
    pub studio_mode: bool,
    pub studio_tool_rail: bool,
    pub studio_inspector_open: bool,
    pub studio_console_open: bool,
    pub studio_dock: StudioDock,
    pub theme: UiTheme,
    pub compact: bool,
    /// Presentation-only soft wrap; the source and PDF never change.
    pub source_soft_wrap: bool,
    /// Editable-source font only (not document fontspec or PDF).
    pub source_font_size: f32,
    pub show_font_lab: bool,
    pub text_family: String,
    pub sans_family: String,
    pub math_font: String,
}

impl Default for UiPreferences {
    fn default() -> Self {
        let fonts = FigureFonts::default();
        Self {
            studio_mode: true,
            studio_tool_rail: true,
            studio_inspector_open: true,
            studio_console_open: false,
            studio_dock: StudioDock::default(),
            theme: UiTheme::default(),
            compact: false,
            source_soft_wrap: true,
            source_font_size: 14.0,
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
        // Ui::menu_button selects SubMenuButton inside Studio's View menu
        // and MenuButton in the classical toolbar. Both participate in egui's
        // menu hierarchy, so opening themes cannot dismiss their parent menu.
        ui.menu_button(format!("Theme: {}", self.theme.label()), |ui| {
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
        assert!(!defaults.compact);
        assert!(defaults.studio_mode);
        assert_eq!(defaults.studio_dock, StudioDock::Properties);
        assert_eq!(defaults.math_font, "latinmodern-math.otf");
        let old = r#"{"theme":"Paper"}"#;
        let restored: UiPreferences = serde_json::from_str(old).unwrap();
        assert_eq!(restored.theme, UiTheme::Paper);
        assert_eq!(restored.source_font_size, 14.0);
        assert!(!restored.compact);
        assert!(restored.studio_mode);
    }

    #[test]
    fn source_font_size_is_additive_and_never_changes_figure_fonts() {
        let mut prefs = UiPreferences::default();
        let old_source = prefs.figure_fonts().proof_source().unwrap();
        prefs.source_font_size = 23.0;
        let encoded = serde_json::to_string(&prefs).unwrap();
        let decoded: UiPreferences = serde_json::from_str(&encoded).unwrap();
        assert_eq!(decoded.source_font_size, 23.0);
        assert_eq!(decoded.figure_fonts().proof_source().unwrap(), old_source);
        let legacy: UiPreferences =
            serde_json::from_str(r#"{"theme":"Dark","source_soft_wrap":false}"#).unwrap();
        assert_eq!(legacy.source_font_size, 14.0);
        assert!(!legacy.source_soft_wrap);
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
    #[test]
    fn real_menu_pointer_events_reach_all_themes_in_studio_and_classical_toolbar() {
        fn frame(
            ctx: &egui::Context,
            prefs: &mut UiPreferences,
            nested: bool,
            events: Vec<egui::Event>,
        ) -> egui::FullOutput {
            ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(800.0, 600.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::TopBottomPanel::top("test-toolbar").show(ctx, |ui| {
                        if nested {
                            egui::MenuBar::new().ui(ui, |ui| {
                                ui.menu_button("View", |ui| prefs.draw_toolbar(ui, ctx));
                            });
                        } else {
                            ui.horizontal(|ui| prefs.draw_toolbar(ui, ctx));
                        }
                    });
                },
            )
        }
        fn label_center(output: &egui::FullOutput, label: &str, exact: bool) -> egui::Pos2 {
            output
                .shapes
                .iter()
                .find_map(|shape| {
                    if let egui::Shape::Text(text) = &shape.shape {
                        let found = if exact {
                            text.galley.text() == label
                        } else {
                            text.galley.text().contains(label)
                        };
                        if found {
                            return Some(text.pos + text.galley.size() / 2.0);
                        }
                    }
                    None
                })
                .unwrap_or_else(|| panic!("visible menu label missing: {label}"))
        }
        fn click(
            ctx: &egui::Context,
            prefs: &mut UiPreferences,
            nested: bool,
            position: egui::Pos2,
        ) -> egui::FullOutput {
            for pressed in [true, false] {
                frame(
                    ctx,
                    prefs,
                    nested,
                    vec![
                        egui::Event::PointerMoved(position),
                        egui::Event::PointerButton {
                            pos: position,
                            button: egui::PointerButton::Primary,
                            pressed,
                            modifiers: egui::Modifiers::NONE,
                        },
                    ],
                );
            }
            frame(ctx, prefs, nested, vec![])
        }
        for nested in [true, false] {
            for theme in UiTheme::ALL {
                let ctx = egui::Context::default();
                let mut prefs = UiPreferences::default();
                let fonts_before = prefs.figure_fonts().proof_source().unwrap();
                let mut output = frame(&ctx, &mut prefs, nested, vec![]);
                if nested {
                    let position = label_center(&output, "View", true);
                    output = click(&ctx, &mut prefs, nested, position);
                }
                let position = label_center(&output, "Theme:", false);
                output = click(&ctx, &mut prefs, nested, position);
                // Reaching every item also proves the View popup stayed alive
                // when its submenu opened, rather than closing on that click.
                for available in UiTheme::ALL {
                    label_center(&output, available.label(), true);
                }
                let position = label_center(&output, theme.label(), true);
                click(&ctx, &mut prefs, nested, position);
                assert_eq!(prefs.theme, theme);
                assert_eq!(prefs.figure_fonts().proof_source().unwrap(), fonts_before);
                assert_eq!(prefs.source_font_size, 14.0);
            }
        }
    }
    #[test]
    fn explicit_theme_before_first_frame_survives_opposite_and_changing_system_theme() {
        // eframe loads preferences before its first native RawInput. The first
        // OS hint must not switch away from the slot we customized at startup.
        for theme in [
            UiTheme::Midnight,
            UiTheme::Light,
            UiTheme::Dark,
            UiTheme::Paper,
        ] {
            let ctx = egui::Context::default();
            let mut prefs = UiPreferences::default();
            if theme != UiTheme::default() {
                let encoded = serde_json::to_string(&UiPreferences {
                    theme,
                    ..Default::default()
                })
                .unwrap();
                prefs = serde_json::from_str(&encoded).unwrap();
            }
            prefs.theme.apply(&ctx, true);
            let intended = ctx.style();
            let expected_theme = match theme {
                UiTheme::Light | UiTheme::Paper => egui::Theme::Light,
                UiTheme::Dark | UiTheme::Midnight => egui::Theme::Dark,
            };
            let opposite = match expected_theme {
                egui::Theme::Light => egui::Theme::Dark,
                egui::Theme::Dark => egui::Theme::Light,
            };
            for system_theme in [
                Some(opposite),
                Some(egui::Theme::Light),
                Some(egui::Theme::Dark),
                None,
                Some(opposite),
            ] {
                let _ = ctx.run(
                    egui::RawInput {
                        system_theme,
                        ..Default::default()
                    },
                    |ctx| {
                        egui::CentralPanel::default().show(ctx, |ui| {
                            assert_eq!(
                                ui.visuals().panel_fill,
                                intended.visuals.panel_fill,
                                "{theme:?} background changed after OS hint {system_theme:?}"
                            );
                            assert_eq!(
                                ui.visuals().extreme_bg_color,
                                intended.visuals.extreme_bg_color,
                                "{theme:?} editor background changed"
                            );
                            assert_eq!(
                                ui.visuals().dark_mode,
                                matches!(expected_theme, egui::Theme::Dark)
                            );
                        });
                        assert_eq!(
                            ctx.theme(),
                            expected_theme,
                            "explicit {theme:?} must own the active style slot"
                        );
                        assert_eq!(ctx.style().spacing.item_spacing, egui::vec2(5.0, 3.0));
                    },
                );
                assert_eq!(
                    prefs.theme, theme,
                    "native OS hint must not override persisted choice"
                );
            }
        }
    }
}
