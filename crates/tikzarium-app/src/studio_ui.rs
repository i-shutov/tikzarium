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
    // Old grouped palette is retained only for historical unit regression.
    #[cfg(test)]
    Geometry,
    #[cfg(test)]
    Connections,
    #[cfg(test)]
    Text,
    Extensions,
}
impl StudioGroup {
    #[cfg(test)]
    pub const ALL: [Self; 4] = [
        Self::Geometry,
        Self::Connections,
        Self::Text,
        Self::Extensions,
    ];
    pub const fn label(self) -> &'static str {
        match self {
            #[cfg(test)]
            Self::Geometry => "Геометрия",
            #[cfg(test)]
            Self::Connections => "Линии и стрелки",
            #[cfg(test)]
            Self::Text => "Узлы и подписи",
            Self::Extensions => "Расширения TikZ",
        }
    }
    pub const fn tools(self) -> &'static [Tool] {
        match self {
            #[cfg(test)]
            Self::Geometry => &[Tool::Line, Tool::Rectangle, Tool::Circle, Tool::Cubic],
            #[cfg(test)]
            Self::Connections => &[Tool::Arrow],
            #[cfg(test)]
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
        #[cfg(test)]
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
        #[cfg(test)]
        StudioIcon::Group(StudioGroup::Connections) => {
            draw_icon(ui, rect, StudioIcon::Tool(Tool::Arrow), selected)
        }
        #[cfg(test)]
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
    // A real egui Button provides keyboard focus and AccessKit semantics.
    // A manually allocated Sense::click() icon can paint nicely while
    // remaining unavailable to keyboard-only users and screen readers.
    let response = ui.add_sized(
        Vec2::splat(side).to_array(),
        egui::Button::new("").selected(selected),
    );
    if ui.is_rect_visible(response.rect) {
        draw_icon(ui, response.rect, kind, selected);
    }
    response.widget_info(|| {
        egui::WidgetInfo::labeled(egui::WidgetType::Button, ui.is_enabled(), tooltip)
    });
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

/// The toolbar Help icon is a toggle, just like F1. A hidden inspector
/// with a remembered Help tab must reopen, not close.
pub fn toggle_studio_help_button(
    session: &mut Session,
    dock: &mut StudioDock,
    inspector_open: &mut bool,
) {
    if *inspector_open && *dock == StudioDock::Help {
        session.help = false;
        *dock = StudioDock::Properties;
    } else {
        session.help = true;
        *dock = StudioDock::Help;
        *inspector_open = true;
    }
}

// Observe native widget rectangles in event tests without changing production clicks.
#[cfg(test)]
pub(crate) fn show_group_rail_observed(
    ui: &mut egui::Ui,
    active: &mut Option<StudioGroup>,
    narrow: bool,
    mut observe: impl FnMut(StudioGroup, Rect),
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
        observe(group, response.rect);
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

/// UX2: selecting a direct Studio tool opens Properties, not the F1 dock.
/// Session::select_tool enables legacy contextual help, so normalize that
/// flag when Studio routes users directly to the Properties inspector.
pub fn activate_studio_tool(
    session: &mut Session,
    tool: Tool,
    dock: &mut StudioDock,
    inspector_open: &mut bool,
) {
    session.select_tool(tool);
    session.help = false;
    *dock = StudioDock::Properties;
    *inspector_open = true;
}

/// UX2: one-click access to the six reviewed native tools. Groups are reserved
/// for extensions, so the first authoring gesture never needs a floating popup.
/// The rail is a presentation surface; choosing a tool does not patch TeX.
#[derive(Default)]
pub struct StudioRailAction {
    pub selected_tool: Option<Tool>,
    pub extension_anchor: Option<Pos2>,
}

fn short_tool_label(tool: Tool) -> &'static str {
    match tool {
        Tool::Line => "Линия",
        Tool::Arrow => "Стрелка",
        Tool::Rectangle => "Прямоуг.",
        Tool::Circle => "Круг",
        Tool::Node => "Текст",
        Tool::Cubic => "Безье",
    }
}

/// A native egui Button owns each clickable icon and its keyboard focus.
/// The small visible caption is not a second hit target. Tooltip/AccessKit
/// names come from the existing C catalogue, never a parallel command registry.
pub fn show_direct_tool_rail(
    ui: &mut egui::Ui,
    selected: Option<Tool>,
    extension_group: &mut Option<StudioGroup>,
    narrow: bool,
) -> StudioRailAction {
    show_direct_tool_rail_observed(ui, selected, extension_group, narrow, |_, _| {}, |_| {})
}

pub(crate) fn show_direct_tool_rail_observed(
    ui: &mut egui::Ui,
    selected: Option<Tool>,
    extension_group: &mut Option<StudioGroup>,
    narrow: bool,
    mut observe_tool: impl FnMut(Tool, Rect),
    mut observe_extensions: impl FnMut(Rect),
) -> StudioRailAction {
    let mut action = StudioRailAction::default();
    ui.vertical_centered(|ui| {
        ui.strong("TikZ");
        ui.small("Создать");
        ui.separator();
    });
    egui::ScrollArea::vertical()
        .id_salt("ux2-direct-tool-rail")
        .auto_shrink([false, false])
        .show(ui, |ui| {
            for tool in tikz_authoring::TOOLS {
                let spec = tikz_authoring::spec(tool);
                let title = spec.title_ru.as_str();
                let tip = format!(
                    "{}\n{}\n{}\nPGF/TikZ §{}",
                    title, spec.help_ru, spec.syntax, spec.manual_section
                );
                ui.vertical_centered(|ui| {
                    let response = ui
                        .add_sized(
                            [48.0, 36.0],
                            egui::Button::new("").selected(selected == Some(tool)),
                        )
                        .on_hover_text(&tip);
                    response.widget_info(|| {
                        egui::WidgetInfo::labeled(egui::WidgetType::Button, ui.is_enabled(), title)
                    });
                    draw_icon(
                        ui,
                        response.rect,
                        StudioIcon::Tool(tool),
                        selected == Some(tool),
                    );
                    observe_tool(tool, response.rect);
                    if response.clicked() {
                        action.selected_tool = Some(tool);
                        *extension_group = None;
                    }
                    ui.label(egui::RichText::new(short_tool_label(tool)).size(if narrow {
                        10.0
                    } else {
                        11.0
                    }));
                });
            }
            ui.separator();
            ui.vertical_centered(|ui| {
                let response = ui
                    .add_sized(
                        [48.0, 36.0],
                        egui::Button::new("")
                            .selected(*extension_group == Some(StudioGroup::Extensions)),
                    )
                    .on_hover_text("Расширения и пакеты: открыть каталог доступности");
                response.widget_info(|| {
                    egui::WidgetInfo::labeled(
                        egui::WidgetType::Button,
                        ui.is_enabled(),
                        "Расширения TikZ",
                    )
                });
                draw_icon(
                    ui,
                    response.rect,
                    StudioIcon::Group(StudioGroup::Extensions),
                    *extension_group == Some(StudioGroup::Extensions),
                );
                observe_extensions(response.rect);
                if response.clicked() {
                    *extension_group = if *extension_group == Some(StudioGroup::Extensions) {
                        None
                    } else {
                        Some(StudioGroup::Extensions)
                    };
                    action.extension_anchor = Some(response.rect.right_top());
                }
                ui.label(egui::RichText::new("Пакеты").size(10.0));
            });
        });
    action
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
    show_palette_observed(ctx, group, anchor, session, data, open_libraries, |_, _| {});
}

// The observer exposes the very same C tool buttons used by the Studio GUI.
pub(crate) fn show_palette_observed(
    ctx: &egui::Context,
    group: &mut Option<StudioGroup>,
    anchor: Pos2,
    session: &mut Session,
    data: PaletteData<'_>,
    open_libraries: &mut bool,
    mut observe: impl FnMut(Tool, Rect),
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
                            let response = icon_button(
                                ui,
                                StudioIcon::Tool(tool),
                                session.active == Some(tool),
                                46.0,
                                &tip,
                            );
                            observe(tool, response.rect);
                            if response.clicked() {
                                session.select_tool(tool);
                                *group = None;
                            }
                        }
                    });
                    ui.small("Наведите на иконку для команды и справки.");
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
    fn b42_real_help_toolbar_pointer_and_f1_toggle_the_visible_dock() {
        // UNIT_EVENT on the same production icon Response and F1 route.
        fn frame(
            ctx: &egui::Context,
            session: &mut Session,
            dock: &mut StudioDock,
            open: &mut bool,
            events: Vec<egui::Event>,
        ) -> Rect {
            let mut rect = Rect::NOTHING;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(Rect::from_min_size(Pos2::ZERO, egui::vec2(850.0, 560.0))),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    let old = session.help;
                    crate::tikz_canvas::handle_help_shortcut(ctx, session);
                    route_studio_help_toggle(old, session.help, dock, open);
                    egui::TopBottomPanel::top("b42-help-click").show(ctx, |ui| {
                        let response = icon_button(
                            ui,
                            StudioIcon::Help,
                            *dock == StudioDock::Help && *open,
                            32.0,
                            "Контекстная справка F1 из общего TikZ-каталога",
                        );
                        rect = response.rect;
                        if response.clicked() {
                            toggle_studio_help_button(session, dock, open);
                        }
                    });
                    egui::CentralPanel::default().show(ctx, |ui| {
                        ui.label("Редактируемый TeX; точный PDF строит XeLaTeX");
                    });
                },
            );
            rect
        }

        let ctx = egui::Context::default();
        let source = "% русский CRLF\r\n\\opaqueMacro{не переписывать}\r\n";
        let mut session = Session::default();
        session.reset(source);
        let mut dock = StudioDock::Properties;
        let mut open = false;
        let rect = frame(&ctx, &mut session, &mut dock, &mut open, vec![]);
        assert!(rect.is_positive());
        let at = rect.center();
        let pointer = |pressed| egui::Event::PointerButton {
            pos: at,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: Default::default(),
        };
        for visible in [true, false] {
            frame(
                &ctx,
                &mut session,
                &mut dock,
                &mut open,
                vec![egui::Event::PointerMoved(at), pointer(true)],
            );
            frame(
                &ctx,
                &mut session,
                &mut dock,
                &mut open,
                vec![pointer(false)],
            );
            assert_eq!(session.help, visible);
            assert_eq!(
                dock,
                if visible {
                    StudioDock::Help
                } else {
                    StudioDock::Properties
                }
            );
            assert!(open);
        }
        dock = StudioDock::Help;
        open = false;
        frame(
            &ctx,
            &mut session,
            &mut dock,
            &mut open,
            vec![egui::Event::PointerMoved(at), pointer(true)],
        );
        frame(
            &ctx,
            &mut session,
            &mut dock,
            &mut open,
            vec![pointer(false)],
        );
        assert!(session.help && open && dock == StudioDock::Help);

        let key = |pressed| egui::Event::Key {
            key: egui::Key::F1,
            physical_key: None,
            pressed,
            repeat: false,
            modifiers: Default::default(),
        };
        frame(&ctx, &mut session, &mut dock, &mut open, vec![key(true)]);
        assert!(!session.help);
        assert_eq!(dock, StudioDock::Properties);
        frame(&ctx, &mut session, &mut dock, &mut open, vec![key(false)]);
        frame(&ctx, &mut session, &mut dock, &mut open, vec![key(true)]);
        assert!(session.help);
        assert_eq!(dock, StudioDock::Help);
        assert_eq!(
            source,
            "% русский CRLF\r\n\\opaqueMacro{не переписывать}\r\n"
        );
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

    #[test]
    fn ux2_direct_tool_selection_keeps_f1_and_properties_in_sync() {
        let ctx = egui::Context::default();
        let source = "% русский CRLF\r\n\\myOpaque{не менять}\r\n";
        let mut session = Session::default();
        session.reset(source);
        let mut dock = StudioDock::Help;
        let mut open = false;
        activate_studio_tool(&mut session, Tool::Node, &mut dock, &mut open);
        assert_eq!(session.active, Some(Tool::Node));
        assert_eq!(dock, StudioDock::Properties);
        assert!(open);
        assert!(!session.help);
        for (expected_help, expected_dock) in
            [(true, StudioDock::Help), (false, StudioDock::Properties)]
        {
            let pressed = egui::Event::Key {
                key: egui::Key::F1,
                physical_key: None,
                pressed: true,
                repeat: false,
                modifiers: egui::Modifiers::default(),
            };
            let _ = ctx.run(
                egui::RawInput {
                    events: vec![pressed],
                    ..Default::default()
                },
                |ctx| {
                    let old = session.help;
                    crate::tikz_canvas::handle_help_shortcut(ctx, &mut session);
                    route_studio_help_toggle(old, session.help, &mut dock, &mut open);
                    egui::CentralPanel::default().show(ctx, |ui| {
                        ui.label("Исходник и PDF являются независимыми видами");
                    });
                },
            );
            assert_eq!(session.help, expected_help);
            assert_eq!(dock, expected_dock);
            assert!(open);
            // An actual second F1 press must follow a key-up event.
            let _ = ctx.run(
                egui::RawInput {
                    events: vec![egui::Event::Key {
                        key: egui::Key::F1,
                        physical_key: None,
                        pressed: false,
                        repeat: false,
                        modifiers: egui::Modifiers::default(),
                    }],
                    ..Default::default()
                },
                |_| {},
            );
        }
        assert!(!session.undo_available());
        assert_eq!(source, "% русский CRLF\r\n\\myOpaque{не менять}\r\n");
    }

    #[test]
    fn ux2_six_native_tools_select_in_one_direct_rail_click_without_tex_mutation() {
        // REAL UNIT_EVENT: same production native Buttons used by Studio.
        // Distinct from Windows physical W2b/W3, DPI and IME acceptance.
        struct State {
            group: Option<StudioGroup>,
            positions: [Rect; 6],
            extensions: Rect,
            session: Session,
        }
        impl State {
            fn frame(&mut self, ctx: &egui::Context, events: Vec<egui::Event>) {
                let mut action = StudioRailAction::default();
                let _ = ctx.run(
                    egui::RawInput {
                        screen_rect: Some(Rect::from_min_size(
                            Pos2::ZERO,
                            egui::vec2(1180.0, 680.0),
                        )),
                        events,
                        ..Default::default()
                    },
                    |ctx| {
                        egui::SidePanel::left("ux2-direct-rail-event")
                            .resizable(false)
                            .exact_width(62.0)
                            .show(ctx, |ui| {
                                action = show_direct_tool_rail_observed(
                                    ui,
                                    self.session.active,
                                    &mut self.group,
                                    false,
                                    |tool, rect| {
                                        let i = tikz_authoring::TOOLS
                                            .iter()
                                            .position(|candidate| *candidate == tool)
                                            .unwrap();
                                        self.positions[i] = rect;
                                    },
                                    |rect| self.extensions = rect,
                                );
                            });
                        egui::CentralPanel::default().show(ctx, |ui| {
                            ui.label("Обычный TeX остаётся единственным источником истины");
                        });
                    },
                );
                if let Some(tool) = action.selected_tool {
                    self.session.select_tool(tool);
                }
            }
            fn click(&mut self, ctx: &egui::Context, pos: Pos2) {
                for pressed in [true, false] {
                    self.frame(
                        ctx,
                        vec![
                            egui::Event::PointerMoved(pos),
                            egui::Event::PointerButton {
                                pos,
                                button: egui::PointerButton::Primary,
                                pressed,
                                modifiers: Default::default(),
                            },
                        ],
                    );
                }
            }
        }
        let ctx = egui::Context::default();
        let source = "% пользовательский CRLF\r\n\\unknown{жёстко}\r\n".to_owned();
        let untouched = source.clone();
        let mut state = State {
            group: None,
            positions: [Rect::NOTHING; 6],
            extensions: Rect::NOTHING,
            session: Session::default(),
        };
        state.session.reset(&source);
        for (index, tool) in tikz_authoring::TOOLS.into_iter().enumerate() {
            state.frame(&ctx, vec![]);
            assert!(state.positions[index].is_positive(), "{tool:?} not visible");
            state.click(&ctx, state.positions[index].center());
            assert_eq!(
                state.session.active,
                Some(tool),
                "{tool:?} failed direct click"
            );
            assert_eq!(
                state.group, None,
                "basic tools must not open a floating group"
            );
            assert_eq!(source.as_bytes(), untouched.as_bytes());
            assert!(!state.session.undo_available());
        }
        state.frame(&ctx, vec![]);
        assert!(state.extensions.is_positive());
        state.click(&ctx, state.extensions.center());
        assert_eq!(state.group, Some(StudioGroup::Extensions));
        state.click(&ctx, state.extensions.center());
        assert_eq!(state.group, None);
        assert_eq!(source, "% пользовательский CRLF\r\n\\unknown{жёстко}\r\n");
    }

    #[test]
    fn b42_rawinput_group_and_six_native_tool_icons_use_production_handlers() {
        // Actual egui press/release; layout positions are observed from
        // production widgets, not guessed or supplied as alternate controls.
        // UNIT_EVENT only: does not replace real Linux/X11 desktop acceptance.
        struct State {
            group: Option<StudioGroup>,
            anchor: Pos2,
            groups: [Rect; 4],
            tools: [Rect; 6],
            session: Session,
            filter: String,
            libraries: bool,
        }
        impl State {
            fn frame(&mut self, ctx: &egui::Context, source: &str, events: Vec<egui::Event>) {
                let State {
                    group,
                    anchor,
                    groups,
                    tools,
                    session,
                    filter,
                    libraries,
                } = self;
                let _ = ctx.run(
                    egui::RawInput {
                        screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(850.0, 560.0))),
                        events,
                        ..Default::default()
                    },
                    |ctx| {
                        egui::SidePanel::left("b42-real-event-rail")
                            .resizable(false)
                            .exact_width(62.0)
                            .show(ctx, |ui| {
                                if let Some(next) =
                                    show_group_rail_observed(ui, group, true, |kind, rect| {
                                        let index = StudioGroup::ALL
                                            .iter()
                                            .position(|&candidate| candidate == kind)
                                            .unwrap();
                                        groups[index] = rect;
                                    })
                                {
                                    *anchor = next;
                                }
                            });
                        egui::CentralPanel::default().show(ctx, |ui| {
                            ui.label("TikZ source is authoritative, not provisional overlay.");
                        });
                        show_palette_observed(
                            ctx,
                            group,
                            *anchor,
                            session,
                            PaletteData {
                                source,
                                extensions: &[],
                                filter,
                            },
                            libraries,
                            |tool, rect| {
                                let index = crate::tikz_authoring::TOOLS
                                    .iter()
                                    .position(|&candidate| candidate == tool)
                                    .unwrap();
                                tools[index] = rect;
                            },
                        );
                    },
                );
            }
            fn click(&mut self, ctx: &egui::Context, source: &str, pos: Pos2) {
                for pressed in [true, false] {
                    self.frame(
                        ctx,
                        source,
                        vec![
                            egui::Event::PointerMoved(pos),
                            egui::Event::PointerButton {
                                pos,
                                button: egui::PointerButton::Primary,
                                pressed,
                                modifiers: Default::default(),
                            },
                        ],
                    );
                }
            }
        }

        let ctx = egui::Context::default();
        let source = "% русский комментарий\r\n\\myOpaque{Не менять}\r\n".to_owned();
        let untouched = source.clone();
        let mut state = State {
            group: None,
            anchor: Pos2::ZERO,
            groups: [Rect::NOTHING; 4],
            tools: [Rect::NOTHING; 6],
            session: Session::default(),
            filter: String::new(),
            libraries: false,
        };
        state.session.reset(&source);
        for kind in [
            StudioGroup::Geometry,
            StudioGroup::Connections,
            StudioGroup::Text,
        ] {
            for &tool in kind.tools() {
                state.frame(&ctx, &source, vec![]);
                let group_index = StudioGroup::ALL
                    .iter()
                    .position(|&candidate| candidate == kind)
                    .unwrap();
                assert!(state.groups[group_index].is_positive());
                state.click(&ctx, &source, state.groups[group_index].center());
                assert_eq!(state.group, Some(kind), "{kind:?} group not opened");
                // egui Areas register their popup hit-test widgets on the
                // following frame. Settle that frame before dispatching the
                // next primary press into a newly opened foreground palette.
                state.frame(&ctx, &source, vec![]);
                let tool_index = crate::tikz_authoring::TOOLS
                    .iter()
                    .position(|&candidate| candidate == tool)
                    .unwrap();
                assert!(
                    state.tools[tool_index].is_positive(),
                    "{tool:?} button absent"
                );
                state.click(&ctx, &source, state.tools[tool_index].center());
                assert_eq!(state.session.active, Some(tool), "{tool:?} not selected");
                assert_eq!(state.group, None, "palette remains open after tool click");
                assert_eq!(source, untouched, "click cannot rewrite opaque TeX");
                assert!(!state.session.undo_available(), "selection is not a patch");
            }
        }
        assert!(!state.libraries);
    }
}
