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

/// UX2 visual foundation. Only application chrome uses these values:
/// never infer TeX color, fontspec or PDF output from GUI appearance.
#[derive(Clone, Copy, Debug)]
struct StudioColors {
    panel: Color32,
    window: Color32,
    inset: Color32,
    button: Color32,
    hover: Color32,
    active: Color32,
    outline: Color32,
    text: Color32,
    accent: Color32,
    link: Color32,
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

    /// One restrained palette per native UI mode, with deliberate control
    /// contrast and distinguishable surface elevations.
    fn colors(self) -> StudioColors {
        let rgb = Color32::from_rgb;
        match self {
            Self::Light => StudioColors {
                panel: rgb(243, 247, 251),
                window: rgb(255, 255, 255),
                inset: rgb(237, 244, 249),
                button: rgb(251, 253, 255),
                hover: rgb(228, 241, 249),
                active: rgb(204, 225, 242),
                outline: rgb(199, 215, 226),
                text: rgb(26, 42, 60),
                accent: rgb(37, 103, 162),
                link: rgb(32, 95, 157),
            },
            Self::Dark => StudioColors {
                panel: rgb(24, 33, 46),
                window: rgb(30, 42, 58),
                inset: rgb(17, 26, 38),
                button: rgb(35, 49, 66),
                hover: rgb(46, 67, 85),
                active: rgb(40, 84, 112),
                outline: rgb(70, 93, 118),
                text: rgb(229, 236, 245),
                accent: rgb(37, 111, 160),
                link: rgb(130, 199, 239),
            },
            Self::Midnight => StudioColors {
                panel: rgb(19, 26, 39),
                window: rgb(26, 36, 53),
                inset: rgb(12, 19, 31),
                button: rgb(31, 44, 63),
                hover: rgb(39, 60, 83),
                active: rgb(36, 78, 115),
                outline: rgb(61, 82, 108),
                text: rgb(230, 240, 251),
                accent: rgb(45, 111, 174),
                link: rgb(125, 191, 239),
            },
            Self::Paper => StudioColors {
                panel: rgb(247, 245, 239),
                window: rgb(255, 253, 248),
                inset: rgb(239, 236, 226),
                button: rgb(253, 252, 247),
                hover: rgb(226, 239, 235),
                active: rgb(195, 224, 214),
                outline: rgb(202, 210, 204),
                text: rgb(37, 56, 75),
                accent: rgb(32, 100, 112),
                link: rgb(31, 109, 125),
            },
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
        let c = self.colors();
        let mut visuals = match self {
            Self::Light | Self::Paper => egui::Visuals::light(),
            Self::Dark | Self::Midnight => egui::Visuals::dark(),
        };
        visuals.panel_fill = c.panel;
        visuals.window_fill = c.window;
        visuals.extreme_bg_color = c.inset;
        // Preserve egui's disabled/secondary text treatments instead of
        // forcing one global text color over every widget state.
        visuals.override_text_color = None;
        visuals.selection.bg_fill = c.accent;
        visuals.selection.stroke = Stroke::new(1.0, Color32::WHITE);
        visuals.hyperlink_color = c.link;

        // Real egui widgets, not icon-only paint hit targets: hover, focus
        // and pressed states have a consistent visual depth in every theme.
        visuals.widgets.noninteractive.bg_fill = c.window;
        visuals.widgets.noninteractive.bg_stroke = Stroke::new(1.0, c.outline);
        visuals.widgets.inactive.bg_fill = c.button;
        visuals.widgets.inactive.bg_stroke = Stroke::new(1.0, c.outline);
        visuals.widgets.hovered.bg_fill = c.hover;
        visuals.widgets.hovered.bg_stroke = Stroke::new(1.0, c.accent);
        visuals.widgets.active.bg_fill = c.active;
        visuals.widgets.active.bg_stroke = Stroke::new(1.5, c.link);
        visuals.widgets.noninteractive.fg_stroke = Stroke::new(1.0, c.text);
        visuals.widgets.inactive.fg_stroke = Stroke::new(1.0, c.text);
        visuals.widgets.hovered.fg_stroke = Stroke::new(1.0, c.text);
        visuals.widgets.active.fg_stroke = Stroke::new(1.0, c.text);
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
            style.text_styles.insert(
                egui::TextStyle::Heading,
                egui::FontId::proportional(if compact { 17.0 } else { 19.0 }),
            );
            style
                .text_styles
                .insert(egui::TextStyle::Button, egui::FontId::proportional(13.0));
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

    fn channel_linear(value: u8) -> f64 {
        let x = f64::from(value) / 255.0;
        if x <= 0.04045 {
            x / 12.92
        } else {
            ((x + 0.055) / 1.055).powf(2.4)
        }
    }

    fn luminance(color: Color32) -> f64 {
        0.2126 * channel_linear(color.r())
            + 0.7152 * channel_linear(color.g())
            + 0.0722 * channel_linear(color.b())
    }

    fn contrast_ratio(a: Color32, b: Color32) -> f64 {
        let a = luminance(a);
        let b = luminance(b);
        (a.max(b) + 0.05) / (a.min(b) + 0.05)
    }

    #[test]
    fn ux2_four_native_theme_tokens_have_readable_surfaces_and_primary_actions() {
        for theme in UiTheme::ALL {
            let c = theme.colors();
            assert!(
                contrast_ratio(c.text, c.panel) >= 7.0,
                "{theme:?} body text must remain highly legible"
            );
            assert!(
                contrast_ratio(c.text, c.window) >= 7.0,
                "{theme:?} raised surface has low contrast"
            );
            assert!(
                contrast_ratio(Color32::WHITE, c.accent) >= 4.5,
                "{theme:?} white-labelled primary Build action has low contrast"
            );
            assert_ne!(c.button, c.hover, "{theme:?} hover must be visible");
            assert_ne!(c.hover, c.active, "{theme:?} active must be visible");
            let ctx = egui::Context::default();
            theme.apply(&ctx, false);
            let style = ctx.style();
            assert_eq!(style.visuals.panel_fill, c.panel);
            assert_eq!(style.visuals.window_fill, c.window);
            assert_eq!(style.visuals.widgets.inactive.bg_fill, c.button);
            assert_eq!(style.visuals.widgets.hovered.bg_fill, c.hover);
            assert_eq!(style.visuals.widgets.active.bg_fill, c.active);
            assert_eq!(style.visuals.override_text_color, None);
            assert_eq!(style.visuals.widgets.inactive.fg_stroke.color, c.text);
            assert_eq!(style.visuals.widgets.hovered.fg_stroke.color, c.text);
        }
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
