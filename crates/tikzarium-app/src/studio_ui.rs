//! B42: grouped icon palettes for TikZ-native authoring.
//! Tool and parameter semantics belong to the existing C catalogue. Vector
//! icon strokes are only UI affordances, never a second PGF renderer.
use crate::tikz_authoring::{self, Session, Tool};
use eframe::egui::{self, Pos2, Rect, Sense, Shape, Stroke, Vec2};
use serde::{Deserialize, Serialize};

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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum StudioGroup {
    Geometry,
    Connections,
    Text,
    Extensions,
}
impl StudioGroup {
    pub const ALL: [Self; 4] = [
        Self::Geometry,
        Self::Connections,
        Self::Text,
        Self::Extensions,
    ];
    pub const fn label(self) -> &'static str {
        match self {
            Self::Geometry => "Геометрия",
            Self::Connections => "Линии и стрелки",
            Self::Text => "Узлы и подписи",
            Self::Extensions => "Расширения TikZ",
        }
    }
    pub const fn tools(self) -> &'static [Tool] {
        match self {
            Self::Geometry => &[Tool::Line, Tool::Rectangle, Tool::Circle, Tool::Cubic],
            Self::Connections => &[Tool::Arrow],
            Self::Text => &[Tool::Node],
            Self::Extensions => &[],
        }
    }
}
#[derive(Clone, Copy, Debug)]
pub struct StudioLayout {
    pub tool_rail_width: f32,
    pub inspector_width: f32,
    pub inspector_max: f32,
    pub narrow: bool,
}
impl StudioLayout {
    pub fn for_width(width: f32) -> Self {
        let width = if width.is_finite() {
            width.max(0.0)
        } else {
            0.0
        };
        Self {
            tool_rail_width: 62.0,
            inspector_width: (width * 0.22).clamp(225.0, 300.0),
            inspector_max: (width * 0.28).clamp(260.0, 350.0),
            narrow: width < 1050.0,
        }
    }
}

#[derive(Clone, Copy)]
pub enum StudioIcon {
    Tool(Tool),
    Group(StudioGroup),
    Open,
    Save,
    Build,
    Export,
    Help,
    Console,
}
fn line(p: &egui::Painter, a: Pos2, b: Pos2, stroke: Stroke) {
    p.line_segment([a, b], stroke);
}
fn draw_icon(ui: &egui::Ui, rect: Rect, kind: StudioIcon, selected: bool) {
    let p = ui.painter_at(rect);
    let c = rect.center();
    let t = rect.width().min(rect.height()) * 0.28;
    let stroke = Stroke::new(
        1.9,
        if selected {
            ui.visuals().selection.stroke.color
        } else {
            ui.visuals().text_color()
        },
    );
    let point = |x: f32, y: f32| Pos2::new(c.x + t * x, c.y + t * y);
    match kind {
        StudioIcon::Tool(Tool::Line) => {
            line(&p, point(-1.0, 0.9), point(1.0, -0.9), stroke);
            p.circle_filled(point(-1.0, 0.9), 2.3, stroke.color);
            p.circle_filled(point(1.0, -0.9), 2.3, stroke.color);
        }
        StudioIcon::Tool(Tool::Arrow) => {
            line(&p, point(-1.0, 0.0), point(1.0, 0.0), stroke);
            line(&p, point(1.0, 0.0), point(0.3, -0.65), stroke);
            line(&p, point(1.0, 0.0), point(0.3, 0.65), stroke);
        }
        StudioIcon::Tool(Tool::Rectangle) => {
            let a = point(-1.0, -0.72);
            let b = point(1.0, 0.72);
            p.add(Shape::closed_line(
                vec![a, point(1.0, -0.72), b, point(-1.0, 0.72)],
                stroke,
            ));
        }
        StudioIcon::Tool(Tool::Circle) => {
            p.circle_stroke(c, t * 0.9, stroke);
        }
        StudioIcon::Tool(Tool::Node) => {
            p.add(Shape::closed_line(
                vec![
                    point(-1.0, -0.8),
                    point(1.0, -0.8),
                    point(1.0, 0.8),
                    point(-1.0, 0.8),
                ],
                stroke,
            ));
            p.text(
                c,
                egui::Align2::CENTER_CENTER,
                "T",
                egui::FontId::proportional(t * 1.15),
                stroke.color,
            );
        }
        StudioIcon::Tool(Tool::Cubic) => {
            let mut points = Vec::with_capacity(21);
            for i in 0..=20 {
                let v = i as f32 / 20.0;
                let inv = 1.0 - v;
                let x = inv * inv * inv * (-1.1)
                    + 3.0 * inv * inv * v * (-0.45)
                    + 3.0 * inv * v * v * (0.45)
                    + v * v * v * (1.1);
                let y = inv * inv * inv * (0.8)
                    + 3.0 * inv * inv * v * (-1.3)
                    + 3.0 * inv * v * v * (1.3)
                    + v * v * v * (-0.8);
                points.push(point(x, y));
            }
            p.add(Shape::line(points, stroke));
        }
        StudioIcon::Group(StudioGroup::Geometry) => {
            p.circle_stroke(point(-0.45, -0.4), t * 0.60, stroke);
            p.add(Shape::closed_line(
                vec![
                    point(0.10, -0.10),
                    point(1.0, -0.10),
                    point(1.0, 0.82),
                    point(0.10, 0.82),
                ],
                stroke,
            ));
        }
        StudioIcon::Group(StudioGroup::Connections) => {
            draw_icon(ui, rect, StudioIcon::Tool(Tool::Arrow), selected)
        }
        StudioIcon::Group(StudioGroup::Text) => {
            draw_icon(ui, rect, StudioIcon::Tool(Tool::Node), selected)
        }
        StudioIcon::Group(StudioGroup::Extensions) => {
            for (x, y) in [(-0.65, -0.65), (0.65, -0.65), (-0.65, 0.65), (0.65, 0.65)] {
                p.circle_filled(point(x, y), 2.6, stroke.color);
            }
            line(&p, point(-0.65, -0.65), point(0.65, 0.65), stroke);
            line(&p, point(-0.65, 0.65), point(0.65, -0.65), stroke);
        }
        StudioIcon::Open => {
            p.add(Shape::line(
                vec![
                    point(-1.05, -0.45),
                    point(-0.45, -0.45),
                    point(-0.18, -0.15),
                    point(0.95, -0.15),
                    point(0.85, 0.76),
                    point(-0.98, 0.76),
                    point(-1.05, -0.45),
                ],
                stroke,
            ));
        }
        StudioIcon::Save => {
            p.add(Shape::closed_line(
                vec![
                    point(-0.85, -1.0),
                    point(0.58, -1.0),
                    point(0.95, -0.65),
                    point(0.95, 1.0),
                    point(-0.85, 1.0),
                ],
                stroke,
            ));
            line(&p, point(-0.43, -0.9), point(-0.43, -0.3), stroke);
            line(&p, point(-0.43, -0.3), point(0.38, -0.3), stroke);
            line(&p, point(-0.43, 0.25), point(0.55, 0.25), stroke);
        }
        StudioIcon::Build => {
            p.add(Shape::closed_line(
                vec![point(-0.65, -1.0), point(1.0, 0.0), point(-0.65, 1.0)],
                stroke,
            ));
        }
        StudioIcon::Export => {
            p.add(Shape::line(
                vec![
                    point(-0.9, -0.3),
                    point(-0.9, 0.98),
                    point(0.9, 0.98),
                    point(0.9, -0.3),
                ],
                stroke,
            ));
            line(&p, point(0.0, -1.0), point(0.0, 0.38), stroke);
            line(&p, point(0.0, 0.38), point(-0.5, -0.13), stroke);
            line(&p, point(0.0, 0.38), point(0.5, -0.13), stroke);
        }
        StudioIcon::Help => {
            p.circle_stroke(c, t, stroke);
            p.text(
                c,
                egui::Align2::CENTER_CENTER,
                "?",
                egui::FontId::proportional(t * 1.6),
                stroke.color,
            );
        }
        StudioIcon::Console => {
            p.add(Shape::closed_line(
                vec![
                    point(-1.0, -0.8),
                    point(1.0, -0.8),
                    point(1.0, 0.8),
                    point(-1.0, 0.8),
                ],
                stroke,
            ));
            line(&p, point(-0.65, -0.3), point(-0.2, 0.0), stroke);
            line(&p, point(-0.2, 0.0), point(-0.65, 0.3), stroke);
            line(&p, point(-0.05, 0.35), point(0.65, 0.35), stroke);
        }
    }
}

/// Scalable vector icon. A short, stable tooltip includes the native TikZ
/// command and its actual C-owned manual reference.
pub fn icon_button(
    ui: &mut egui::Ui,
    kind: StudioIcon,
    selected: bool,
    side: f32,
    tooltip: &str,
) -> egui::Response {
    let (rect, response) = ui.allocate_exact_size(Vec2::splat(side), Sense::click());
    if ui.is_rect_visible(rect) {
        let p = ui.painter_at(rect);
        let fill = if selected {
            ui.visuals().selection.bg_fill
        } else if response.hovered() {
            ui.visuals().widgets.hovered.bg_fill
        } else {
            ui.visuals().widgets.inactive.bg_fill
        };
        p.rect_filled(rect, egui::CornerRadius::same(7), fill);
        draw_icon(ui, rect, kind, selected);
    }
    response.on_hover_text(tooltip)
}

/// F1 opens the same C-backed Help tab; toggling F1 off must visibly leave
/// that tab rather than only changing an invisible Session::help boolean.
pub fn route_studio_help_toggle(
    was_enabled: bool,
    is_enabled: bool,
    dock: &mut StudioDock,
    inspector_open: &mut bool,
) {
    if !was_enabled && is_enabled {
        *dock = StudioDock::Help;
        *inspector_open = true;
    } else if was_enabled && !is_enabled && *dock == StudioDock::Help {
        *dock = StudioDock::Properties;
    }
}

/// Narrow permanent rail: four *groups* rather than dozens of buttons.
/// Clicking a group opens a floating palette; the code and PDF keep their size.
pub fn show_group_rail(
    ui: &mut egui::Ui,
    active: &mut Option<StudioGroup>,
    narrow: bool,
) -> Option<Pos2> {
    let _ = narrow;
    ui.vertical_centered(|ui| {
        ui.strong("TikZ");
        ui.separator();
    });
    let mut anchor = None;
    for group in StudioGroup::ALL {
        let tooltip = format!("Палитра: {}. Нажмите для раскрытия.", group.label());
        let response = icon_button(
            ui,
            StudioIcon::Group(group),
            *active == Some(group),
            43.0,
            &tooltip,
        );
        if response.clicked() {
            *active = if *active == Some(group) {
                None
            } else {
                Some(group)
            };
            anchor = Some(response.rect.right_top());
        }
    }
    anchor
}

/// Position the popup from the ACTUAL resizable source SidePanel boundary,
/// never from its default width. No PDF-to-guide coordinate mapping is implied.
/// The floating palette itself adds a small 6pt gap in show_palette.
pub fn palette_anchor_at_source_edge(source_panel: Rect, rail_anchor: Pos2) -> Pos2 {
    Pos2::new(source_panel.right() + 8.0, rail_anchor.y)
}

/// Floating grouped palette. It never takes space from the code/PDF columns.
/// Future package adapters appear as unavailable, not hidden or falsely ready.
/// Borrow the current read-only project facts as one UI context, not a
/// second registry and not a license to mutate user source or install TeX.
pub struct PaletteData<'a> {
    pub source: &'a str,
    pub extensions: &'a [tikzarium_extensions::ExtensionStatus],
    pub filter: &'a mut String,
}

pub fn show_palette(
    ctx: &egui::Context,
    group: &mut Option<StudioGroup>,
    anchor: Pos2,
    session: &mut Session,
    data: PaletteData<'_>,
    open_libraries: &mut bool,
) {
    let PaletteData {
        source,
        extensions,
        filter: extension_filter,
    } = data;
    if ctx.input(|input| input.key_pressed(egui::Key::Escape)) {
        *group = None;
    }
    let Some(selected) = *group else { return };
    egui::Area::new(egui::Id::new("b42-group-palette"))
        .order(egui::Order::Foreground)
        .fixed_pos(anchor + egui::vec2(6.0, -36.0))
        .show(ctx, |ui| {
            egui::Frame::popup(ui.style()).show(ui, |ui| {
                ui.set_min_width(if selected == StudioGroup::Extensions {
                    265.0
                } else {
                    158.0
                });
                ui.horizontal(|ui| {
                    ui.strong(selected.label());
                    if ui
                        .small_button("×")
                        .on_hover_text("Закрыть палитру")
                        .clicked()
                    {
                        *group = None;
                    }
                });
                ui.separator();
                if selected == StudioGroup::Extensions {
                    ui.small("Расширения из общего реестра");
                    ui.add(
                        egui::TextEdit::singleline(extension_filter)
                            .hint_text("Поиск пакета…")
                            .desired_width(242.0),
                    );
                    let filter = extension_filter.trim().to_lowercase();
                    egui::ScrollArea::vertical()
                        .max_height(270.0)
                        .show(ui, |ui| {
                            for item in extensions.iter().filter(|item| {
                                filter.is_empty()
                                    || item.manifest.id.to_lowercase().contains(&filter)
                                    || item.manifest.display_name.to_lowercase().contains(&filter)
                            }) {
                                ui.strong(&item.manifest.display_name);
                                ui.small(format!(
                                    "Установлен: {:?} · Совместимость: {:?}",
                                    item.installation, item.compilation
                                ));
                                ui.small(format!(
                                    "GUI-инструмент: {} · просмотр: {}",
                                    if item.visual_editable {
                                        "есть"
                                    } else {
                                        "пока нет"
                                    },
                                    if item.inspectable {
                                        "есть"
                                    } else {
                                        "пока нет"
                                    },
                                ));
                                ui.separator();
                            }
                        });
                    ui.small("Наличие ≠ подключение ≠ поддержка инструмента. Lua-only не XeLaTeX.");
                    if ui.button("Управление библиотеками проекта").clicked()
                    {
                        *open_libraries = true;
                        *group = None;
                    }
                } else {
                    ui.horizontal_wrapped(|ui| {
                        for &tool in selected.tools() {
                            let info = tikz_authoring::spec(tool);
                            let status = tikz_authoring::requirements_status(source, tool);
                            let tip = format!(
                                "{}\n{}\n{}\nPGF/TikZ §{}\nПодключение: {:?}",
                                info.title_ru,
                                info.help_ru,
                                info.syntax,
                                info.manual_section,
                                status
                            );
                            if icon_button(
                                ui,
                                StudioIcon::Tool(tool),
                                session.active == Some(tool),
                                46.0,
                                &tip,
                            )
                            .clicked()
                            {
                                session.select_tool(tool);
                                *group = None;
                            }
                        }
                    });
                    ui.small("Наведите на иконку для команды и справки.");
                    if selected == StudioGroup::Connections {
                        ui.small("Стрелки arrows.meta требуют явного подключения.");
                    }
                }
            });
        });
}

/// The same read-only C catalogue consumed by the inspector and F1.
pub fn show_context_help(ui: &mut egui::Ui, session: &Session) {
    ui.heading("Справка TikZ");
    if let Some(tool) = session.active {
        let info = tikz_authoring::spec(tool);
        ui.strong(&info.title_ru);
        ui.label(&info.help_ru);
        ui.code(&info.syntax);
        ui.label("Пример:");
        ui.code(&info.example);
        ui.hyperlink_to(
            format!("PGF/TikZ §{}", info.manual_section),
            &info.manual_url,
        );
        ui.small(format!(
            "Пакет: {} · Библиотеки: {} · PGF {}",
            info.requirements.packages.join(", "),
            info.requirements.libraries.join(", "),
            info.requirements.documented_against
        ));
        for param in &info.parameter {
            egui::CollapsingHeader::new(&param.id).show(ui, |ui| {
                ui.label(&param.help_ru);
                ui.code(&param.syntax);
                ui.small(format!(
                    "Тип: {} · Единицы: {} · Допустимые значения: {}",
                    param.kind,
                    param.units.join(", "),
                    param.allowed_values.join(", ")
                ));
                if param.default_provenance == "editor_preset" {
                    ui.small(format!(
                        "Предустановка редактора: {} (НЕ default TikZ)",
                        param.default
                    ));
                } else {
                    ui.small("Default TikZ: UNKNOWN");
                }
                ui.label(&param.warning_ru);
                ui.label(&param.interaction_ru);
                ui.code(&param.example);
                ui.hyperlink_to(
                    format!("PGF/TikZ §{}", param.manual_section),
                    &param.manual_url,
                );
            });
        }
    } else {
        ui.label("Выберите инструмент в левой палитре.");
        ui.small("Подсказки и параметры поступают из единого каталога C.");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn compact_group_rail_is_bounded_with_expansion_as_floating_overlay() {
        for width in [850.0_f32, 1180.0, 1366.0, 1920.0] {
            let layout = StudioLayout::for_width(width);
            assert_eq!(layout.tool_rail_width, 62.0);
            assert!(width - layout.tool_rail_width - layout.inspector_width - 240.0 > 190.0);
        }
    }
    #[test]
    fn groups_cover_all_native_c_tools_once_and_expose_future_adapters() {
        let all = StudioGroup::ALL
            .iter()
            .flat_map(|g| g.tools())
            .copied()
            .collect::<Vec<_>>();
        assert_eq!(all.len(), 6);
        for item in crate::tikz_authoring::TOOLS {
            assert_eq!(all.iter().filter(|&&t| t == item).count(), 1);
            assert!(
                tikz_authoring::spec(item)
                    .manual_url
                    .starts_with("https://tikz.dev/")
            );
        }
        assert!(StudioGroup::Extensions.tools().is_empty());
    }
    #[test]
    fn icon_tooltips_and_dock_types_do_not_duplicate_document_state() {
        let v = serde_json::to_string(&StudioDock::Libraries).unwrap();
        assert_eq!(
            serde_json::from_str::<StudioDock>(&v).unwrap(),
            StudioDock::Libraries
        );
        assert_eq!(StudioDock::ALL.len(), 3);
    }
    #[test]
    fn real_f1_key_frames_toggle_visible_studio_dock_without_editing_tex() {
        let ctx = egui::Context::default();
        let source = "% ручной CRLF\r\n\\myOpaqueMacro{unknown}\r\n".to_owned();
        let before = source.clone();
        let mut session = Session::default();
        session.reset(&source);
        let mut dock = StudioDock::Properties;
        let mut open = false;
        let frame =
            |event: egui::Event, session: &mut Session, dock: &mut StudioDock, open: &mut bool| {
                let _ = ctx.run(
                    egui::RawInput {
                        events: vec![event],
                        ..Default::default()
                    },
                    |ctx| {
                        let old = session.help;
                        crate::tikz_canvas::handle_help_shortcut(ctx, session);
                        route_studio_help_toggle(old, session.help, dock, open);
                        egui::CentralPanel::default().show(ctx, |ui| {
                            ui.label("Исходник редактируем, PDF — внешний XeLaTeX");
                        });
                    },
                );
            };
        let key = |pressed: bool| egui::Event::Key {
            key: egui::Key::F1,
            physical_key: None,
            pressed,
            repeat: false,
            modifiers: egui::Modifiers::default(),
        };
        frame(key(true), &mut session, &mut dock, &mut open);
        assert!(session.help);
        assert_eq!(dock, StudioDock::Help);
        assert!(open);
        frame(key(false), &mut session, &mut dock, &mut open);
        frame(key(true), &mut session, &mut dock, &mut open);
        assert!(!session.help);
        assert_eq!(dock, StudioDock::Properties);
        assert_eq!(source, before);
        assert!(!session.undo_available());
    }

    #[test]
    fn palette_follows_actual_source_pane_resize_not_default_width() {
        // Simulated measured response rectangles from a resizable source panel.
        let button = Pos2::new(61.0, 178.0);
        let narrow = Rect::from_min_size(Pos2::new(62.0, 60.0), Vec2::new(240.0, 600.0));
        let wide = Rect::from_min_size(Pos2::new(62.0, 60.0), Vec2::new(475.0, 600.0));
        let a = palette_anchor_at_source_edge(narrow, button);
        let b = palette_anchor_at_source_edge(wide, button);
        assert_eq!(a.x, narrow.right() + 8.0);
        assert_eq!(b.x, wide.right() + 8.0);
        assert_eq!(b.x - a.x, 235.0);
        assert_eq!(a.y, button.y);
        assert_eq!(b.y, button.y);
    }

    #[test]
    fn icon_geometry_does_not_change_source_in_egui_frame() {
        let ctx = egui::Context::default();
        let mut source = String::from("% opaque CRLF\r\n\\newcommand{\\mine}{value}\r\n");
        let before = source.clone();
        let _ = ctx.run(egui::RawInput::default(), |ctx| {
            egui::CentralPanel::default().show(ctx, |ui| {
                icon_button(ui, StudioIcon::Tool(Tool::Cubic), false, 44.0, "Bezier");
                icon_button(
                    ui,
                    StudioIcon::Group(StudioGroup::Extensions),
                    false,
                    44.0,
                    "Packages",
                );
            });
        });
        assert_eq!(source, before);
        source.clear();
    }
}
