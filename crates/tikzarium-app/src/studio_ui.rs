//! B42: grouped icon palettes for TikZ-native authoring.
//! Tool and parameter semantics belong to the existing C catalogue. Vector
//! icon strokes are only UI affordances, never a second PGF renderer.
use crate::tikz_authoring::{self, Session, Tool};
use eframe::egui::{self, Pos2, Rect, Shape, Stroke};
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
            tool_rail_width: 46.0,
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
    Build,
    Undo,
    Redo,
    Search,
    Settings,
    Inspector,
    ChevronRight,
    ChevronDown,
    Open,
    Save,
    Export,
    Help,
    Console,
}

/// Native toolbar hit area; the authoring rail uses the same icons at 30 pt.
pub const ICON_BUTTON_SIDE: f32 = 32.0;
const TOOL_BUTTON_SIDE: f32 = 30.0;

fn line(p: &egui::Painter, a: Pos2, b: Pos2, stroke: Stroke) {
    p.line_segment([a, b], stroke);
}
fn draw_icon(ui: &egui::Ui, rect: Rect, kind: StudioIcon, color: egui::Color32) {
    let p = ui.painter_at(rect);
    let c = rect.center();
    let t = rect.width().min(rect.height()) * 0.29;
    let stroke = Stroke::new(1.5, color);
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
            draw_icon(ui, rect, StudioIcon::Tool(Tool::Arrow), color)
        }
        #[cfg(test)]
        StudioIcon::Group(StudioGroup::Text) => {
            draw_icon(ui, rect, StudioIcon::Tool(Tool::Node), color)
        }
        StudioIcon::Group(StudioGroup::Extensions) => {
            for (x, y) in [(-0.65, -0.65), (0.65, -0.65), (-0.65, 0.65), (0.65, 0.65)] {
                p.circle_filled(point(x, y), 2.6, stroke.color);
            }
            line(&p, point(-0.65, -0.65), point(0.65, 0.65), stroke);
            line(&p, point(-0.65, 0.65), point(0.65, -0.65), stroke);
        }
        StudioIcon::Build => {
            // A compact play mark over a stable baseline reads as the primary
            // compile action without implying a different renderer.
            p.add(Shape::closed_line(
                vec![point(-0.38, -0.82), point(0.72, 0.0), point(-0.38, 0.82)],
                stroke,
            ));
            line(&p, point(-0.88, 1.02), point(0.88, 1.02), stroke);
        }
        StudioIcon::Undo => {
            line(&p, point(-0.82, -0.15), point(0.45, -0.15), stroke);
            line(&p, point(0.45, -0.15), point(0.82, 0.18), stroke);
            line(&p, point(0.82, 0.18), point(0.82, 0.75), stroke);
            line(&p, point(-0.82, -0.15), point(-0.32, -0.65), stroke);
            line(&p, point(-0.82, -0.15), point(-0.32, 0.35), stroke);
        }
        StudioIcon::Redo => {
            line(&p, point(-0.45, -0.15), point(0.82, -0.15), stroke);
            line(&p, point(-0.82, 0.18), point(-0.82, 0.75), stroke);
            line(&p, point(-0.82, 0.18), point(-0.45, -0.15), stroke);
            line(&p, point(0.82, -0.15), point(0.32, -0.65), stroke);
            line(&p, point(0.82, -0.15), point(0.32, 0.35), stroke);
        }
        StudioIcon::Search => {
            p.circle_stroke(point(-0.16, -0.18), t * 0.57, stroke);
            line(&p, point(0.28, 0.30), point(0.88, 0.92), stroke);
        }
        StudioIcon::Settings => {
            p.circle_stroke(c, t * 0.84, stroke);
            p.circle_stroke(c, t * 0.30, stroke);
            for tooth in 0..8 {
                let angle = tooth as f32 * std::f32::consts::FRAC_PI_4;
                let dx = angle.cos();
                let dy = angle.sin();
                line(
                    &p,
                    point(dx * 0.82, dy * 0.82),
                    point(dx * 1.12, dy * 1.12),
                    stroke,
                );
            }
        }
        StudioIcon::Inspector => {
            p.add(Shape::closed_line(
                vec![
                    point(-1.0, -0.8),
                    point(1.0, -0.8),
                    point(1.0, 0.8),
                    point(-1.0, 0.8),
                ],
                stroke,
            ));
            line(&p, point(0.32, -0.8), point(0.32, 0.8), stroke);
        }
        StudioIcon::ChevronRight => {
            p.add(Shape::line(
                vec![point(-0.35, -0.65), point(0.3, 0.0), point(-0.35, 0.65)],
                stroke,
            ));
        }
        StudioIcon::ChevronDown => {
            p.add(Shape::line(
                vec![point(-0.65, -0.35), point(0.0, 0.3), point(0.65, -0.35)],
                stroke,
            ));
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
    icon_button_enabled(ui, kind, true, selected, side, tooltip, tooltip)
}

/// A native icon Button with a concise accessible name and a richer hover
/// description (including a shortcut where available). Disabled actions keep
/// their normal hit area and cannot receive activation or keyboard focus.
pub fn icon_button_enabled(
    ui: &mut egui::Ui,
    kind: StudioIcon,
    enabled: bool,
    selected: bool,
    side: f32,
    label: &str,
    tooltip: &str,
) -> egui::Response {
    // A real egui Button provides keyboard focus and AccessKit semantics.
    // A manually allocated Sense::click() icon can paint nicely while
    // remaining unavailable to keyboard-only users and screen readers.
    let response = ui.add_enabled(
        enabled,
        egui::Button::new("")
            .selected(selected)
            .min_size(egui::vec2(side, side)),
    );
    if ui.is_rect_visible(response.rect) {
        let mut color = ui
            .style()
            .interact_selectable(&response, selected)
            .fg_stroke
            .color;
        // add_enabled restores the parent painter before custom icon painting.
        // A disabled parent Ui already applies its opacity, so fade only the
        // action disabled locally by this helper.
        if !response.enabled() && ui.is_enabled() {
            color = color.gamma_multiply(ui.visuals().disabled_alpha());
        }
        draw_icon(ui, response.rect, kind, color);
    }
    response.widget_info(|| {
        egui::WidgetInfo::selected(
            egui::WidgetType::Button,
            response.enabled(),
            selected,
            label,
        )
    });
    response.on_hover_text(tooltip)
}

/// One native command target with a 16pt vector slot and a visible label.
/// Atom layout reserves the icon space without changing the accessible name
/// or introducing a second clickable region beside the button text.
pub fn command_button(
    ui: &mut egui::Ui,
    kind: StudioIcon,
    enabled: bool,
    label: &str,
    tooltip: &str,
) -> egui::Response {
    let icon_id = ui.next_auto_id().with("command-icon");
    let response = ui.add_enabled(enabled, |ui: &mut egui::Ui| {
        let button =
            egui::Button::new((egui::Atom::custom(icon_id, egui::Vec2::splat(16.0)), label))
                .min_size(egui::vec2(92.0, ICON_BUTTON_SIDE))
                .atom_ui(ui);
        if ui.is_rect_visible(button.response.rect)
            && let Some(rect) = button
                .custom_rects()
                .find_map(|(id, rect)| (id == icon_id).then_some(rect))
        {
            let color = ui.style().interact(&button.response).fg_stroke.color;
            draw_icon(ui, rect.expand(6.0), kind, color);
        }
        button.response
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

/// Studio F1 follows the visible dock; legacy views keep their own help flag.
pub fn handle_studio_help_shortcut(
    ctx: &egui::Context,
    session: &mut Session,
    dock: &mut StudioDock,
    inspector_open: &mut bool,
) {
    // Mouse tab selection can leave the legacy flag stale. Normalize from
    // actual visibility before toggling, including a hidden remembered Help.
    session.help = *inspector_open && *dock == StudioDock::Help;
    let was_enabled = session.help;
    crate::tikz_canvas::handle_help_shortcut(ctx, session);
    route_studio_help_toggle(was_enabled, session.help, dock, inspector_open);
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

/// A native egui Button owns each clickable icon and its keyboard focus.
/// Names and native command details stay in tooltip/AccessKit text from the
/// existing C catalogue; the rail stays icon-only to keep all six tools close.
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
    _narrow: bool,
    mut observe_tool: impl FnMut(Tool, Rect),
    mut observe_extensions: impl FnMut(Rect),
) -> StudioRailAction {
    let mut action = StudioRailAction::default();
    ui.vertical_centered(|ui| {
        ui.strong("TikZ");
        ui.separator();
    });
    egui::ScrollArea::vertical()
        .id_salt("ux2-direct-tool-rail")
        .auto_shrink([false, false])
        .show(ui, |ui| {
            for tool in tikz_authoring::TOOLS {
                let spec = tikz_authoring::spec(tool);
                let tip = format!(
                    "{}\n{}\n{}\nPGF/TikZ §{}",
                    spec.title_ru, spec.help_ru, spec.syntax, spec.manual_section
                );
                ui.vertical_centered(|ui| {
                    let response = icon_button_enabled(
                        ui,
                        StudioIcon::Tool(tool),
                        true,
                        selected == Some(tool),
                        TOOL_BUTTON_SIDE,
                        &spec.title_ru,
                        &tip,
                    );
                    observe_tool(tool, response.rect);
                    if response.clicked() {
                        action.selected_tool = Some(tool);
                        *extension_group = None;
                    }
                });
            }
            ui.separator();
            ui.vertical_centered(|ui| {
                let response = icon_button_enabled(
                    ui,
                    StudioIcon::Group(StudioGroup::Extensions),
                    true,
                    *extension_group == Some(StudioGroup::Extensions),
                    TOOL_BUTTON_SIDE,
                    "Расширения TikZ",
                    "Расширения и пакеты: открыть каталог доступности",
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
            });
        });
    action
}

/// Position the popup beyond the current source and adjacent tool rail,
/// never from a default width or the button's old horizontal position.
/// The floating palette itself adds a small 6pt gap in show_palette.
pub fn palette_anchor_at_source_edge(
    source_panel: Rect,
    rail_panel: Option<Rect>,
    button_anchor: Pos2,
) -> Pos2 {
    let edge = rail_panel.map_or(source_panel.right(), |rail| rail.right());
    Pos2::new(edge + 8.0, button_anchor.y)
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
    use eframe::egui::Vec2;

    #[test]
    fn compact_group_rail_is_bounded_with_expansion_as_floating_overlay() {
        for width in [850.0_f32, 1180.0, 1366.0, 1920.0] {
            let layout = StudioLayout::for_width(width);
            assert_eq!(layout.tool_rail_width, 46.0);
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
    fn studio_f1_after_pointer_tab_switch_reopens_help_and_preserves_source_history() {
        // UNIT_EVENT: real selectable_value pointer clicks and F1 key-up/down.
        // This reproduces native run03's Help -> Properties -> F1 sequence.
        fn frame(
            ctx: &egui::Context,
            session: &mut Session,
            dock: &mut StudioDock,
            open: &mut bool,
            events: Vec<egui::Event>,
        ) -> [Rect; 3] {
            let mut tabs = [Rect::NOTHING; 3];
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(Rect::from_min_size(Pos2::ZERO, egui::vec2(850.0, 560.0))),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    handle_studio_help_shortcut(ctx, session, dock, open);
                    if *open {
                        egui::TopBottomPanel::top("studio-f1-tab-regression").show(ctx, |ui| {
                            ui.horizontal(|ui| {
                                for (index, tab) in StudioDock::ALL.into_iter().enumerate() {
                                    tabs[index] = ui.selectable_value(dock, tab, tab.label()).rect;
                                }
                            });
                        });
                    }
                    egui::CentralPanel::default().show(ctx, |ui| {
                        ui.label("TeX remains authoritative");
                    });
                },
            );
            tabs
        }
        let key = |pressed| egui::Event::Key {
            key: egui::Key::F1,
            physical_key: None,
            pressed,
            repeat: false,
            modifiers: Default::default(),
        };
        let ctx = egui::Context::default();
        let original = "% Привет; CRLF and unknown macros\r\n\\newcommand{\\opaque}{unknown}\r\n\\begin{tikzpicture}\r\n\\begin{axis}[samples=21]\r\n\\addplot[samples=22]{x};\r\n\\end{axis}\r\n\\end{tikzpicture}\r\n";
        let mut source = original.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        let axis = session.scientific_candidates(&source).unwrap().remove(0);
        session
            .apply_scientific_literal(&mut source, &axis, "samples", "21", "25")
            .unwrap();
        let before = source.clone();
        let revision = session.source_revision();
        assert!(
            session.undo_available(),
            "seed a real inverse, not empty history"
        );
        let mut dock = StudioDock::Properties;
        let mut open = true;
        frame(&ctx, &mut session, &mut dock, &mut open, vec![key(true)]);
        assert!(session.help && open && dock == StudioDock::Help);
        let mut tabs = frame(&ctx, &mut session, &mut dock, &mut open, vec![key(false)]);
        for (index, target) in [(0, StudioDock::Properties), (1, StudioDock::Libraries)] {
            let pos = tabs[index].center();
            assert!(tabs[index].is_positive());
            for pressed in [true, false] {
                frame(
                    &ctx,
                    &mut session,
                    &mut dock,
                    &mut open,
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
            assert_eq!(dock, target, "the real tab click must select its target");
            frame(&ctx, &mut session, &mut dock, &mut open, vec![key(true)]);
            assert!(
                session.help && open && dock == StudioDock::Help,
                "F1 after clicking {target:?} must reopen visible Help"
            );
            tabs = frame(&ctx, &mut session, &mut dock, &mut open, vec![key(false)]);
            assert_eq!(source.as_bytes(), before.as_bytes());
            assert_eq!(session.source_revision(), revision);
            assert!(session.undo_available());
        }
        session.undo(&mut source).unwrap();
        assert_eq!(
            source.as_bytes(),
            original.as_bytes(),
            "F1/tab clicks must retain the exact inverse"
        );
        assert!(!session.undo_available());
    }

    #[test]
    fn studio_f1_reopens_remembered_help_in_hidden_inspector_then_closes_visible_help() {
        let ctx = egui::Context::default();
        let mut session = Session::default();
        let source = "% Не менять\r\n\\opaque{unknown}\r\n";
        session.reset(source);
        session.help = true;
        let revision = session.source_revision();
        let mut dock = StudioDock::Help;
        let mut open = false;
        for (pressed, expected) in [
            (true, StudioDock::Help),
            (false, StudioDock::Help),
            (true, StudioDock::Properties),
            (false, StudioDock::Properties),
        ] {
            let _ = ctx.run(
                egui::RawInput {
                    events: vec![egui::Event::Key {
                        key: egui::Key::F1,
                        physical_key: None,
                        pressed,
                        repeat: false,
                        modifiers: Default::default(),
                    }],
                    ..Default::default()
                },
                |ctx| {
                    handle_studio_help_shortcut(ctx, &mut session, &mut dock, &mut open);
                    egui::CentralPanel::default().show(ctx, |ui| {
                        ui.label(source);
                    });
                },
            );
            assert!(
                open,
                "F1 must reopen a hidden inspector, not merely change a flag"
            );
            assert_eq!(dock, expected);
            assert_eq!(session.help, expected == StudioDock::Help);
            assert_eq!(session.source_revision(), revision);
            assert!(!session.undo_available());
        }
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
    fn palette_follows_resized_source_and_stays_beyond_adjacent_tool_rail() {
        // Current response rectangles model source -> rail -> canvas. The
        // saved button x deliberately remains stale while the source resizes.
        let button = Pos2::new(61.0, 178.0);
        let mut popup_lefts = Vec::new();
        for source_width in [240.0, 475.0] {
            let source = Rect::from_min_size(Pos2::new(0.0, 60.0), Vec2::new(source_width, 600.0));
            let rail = Rect::from_min_size(source.right_top(), Vec2::new(46.0, source.height()));
            let anchor = palette_anchor_at_source_edge(source, Some(rail), button);
            let popup_left = anchor.x + 6.0;
            assert!(
                popup_left >= rail.right() + 6.0,
                "popup must not obscure rail targets"
            );
            assert_eq!(anchor.x, rail.right() + 8.0);
            assert_eq!(anchor.y, button.y);
            popup_lefts.push(popup_left);
        }
        assert_eq!(popup_lefts[1] - popup_lefts[0], 235.0);
    }

    #[test]
    fn palette_without_tool_rail_follows_current_source_edge() {
        let source = Rect::from_min_size(Pos2::new(0.0, 60.0), Vec2::new(475.0, 600.0));
        let button = Pos2::new(61.0, 178.0);
        let anchor = palette_anchor_at_source_edge(source, None, button);
        assert_eq!(anchor, Pos2::new(source.right() + 8.0, button.y));
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
                            .exact_width(46.0)
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
    fn direct_rail_buttons_activate_with_enter_and_space_without_source_edits() {
        // Raw egui keyboard events exercise the same production Button widgets
        // used by the rail. This records egui event behavior only; it is not a
        // claim about platform accessibility or physical keyboard acceptance.
        struct State {
            group: Option<StudioGroup>,
            positions: [Rect; 6],
            session: Session,
        }
        impl State {
            fn frame(&mut self, ctx: &egui::Context, events: Vec<egui::Event>) {
                let mut action = StudioRailAction::default();
                let _ = ctx.run(
                    egui::RawInput {
                        screen_rect: Some(Rect::from_min_size(
                            Pos2::ZERO,
                            Vec2::new(1180.0, 680.0),
                        )),
                        events,
                        ..Default::default()
                    },
                    |ctx| {
                        egui::SidePanel::left("ux2-keyboard-rail")
                            .resizable(false)
                            .exact_width(46.0)
                            .show(ctx, |ui| {
                                action = show_direct_tool_rail_observed(
                                    ui,
                                    self.session.active,
                                    &mut self.group,
                                    false,
                                    |tool, rect| {
                                        let index = tikz_authoring::TOOLS
                                            .iter()
                                            .position(|candidate| *candidate == tool)
                                            .unwrap();
                                        self.positions[index] = rect;
                                    },
                                    |_| {},
                                );
                            });
                        egui::CentralPanel::default().show(ctx, |ui| {
                            ui.label("TeX остаётся неизменным при выборе инструмента");
                        });
                    },
                );
                if let Some(tool) = action.selected_tool {
                    self.session.select_tool(tool);
                }
            }
        }

        let key = |key, pressed| egui::Event::Key {
            key,
            physical_key: None,
            pressed,
            repeat: false,
            modifiers: egui::Modifiers::default(),
        };
        for activation_key in [egui::Key::Enter, egui::Key::Space] {
            let ctx = egui::Context::default();
            let source = "% CRLF\r\n\\opaque{keep}\r\n".to_owned();
            let original = source.clone();
            let mut state = State {
                group: None,
                positions: [Rect::NOTHING; 6],
                session: Session::default(),
            };
            state.session.reset(&source);

            state.frame(&ctx, vec![]);
            state.frame(&ctx, vec![key(egui::Key::Tab, true)]);
            state.frame(&ctx, vec![key(egui::Key::Tab, false)]);
            state.frame(&ctx, vec![key(activation_key, true)]);
            assert_eq!(state.session.active, Some(Tool::Line), "{activation_key:?}");
            state.frame(&ctx, vec![key(activation_key, false)]);
            assert_eq!(source.as_bytes(), original.as_bytes());
            assert!(!state.session.undo_available());
        }
    }

    #[test]
    fn disabled_direct_rail_buttons_do_not_select_or_mutate_source() {
        let ctx = egui::Context::default();
        let source = "% keep me\r\n\\opaque{untouched}\r\n".to_owned();
        let original = source.clone();
        let mut group = Some(StudioGroup::Extensions);
        let mut action = StudioRailAction::default();
        let mut positions = [Rect::NOTHING; 6];
        let _ = ctx.run(
            egui::RawInput {
                screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(1180.0, 680.0))),
                ..Default::default()
            },
            |ctx| {
                egui::SidePanel::left("ux2-disabled-rail")
                    .resizable(false)
                    .exact_width(46.0)
                    .show(ctx, |ui| {
                        ui.add_enabled_ui(false, |ui| {
                            action = show_direct_tool_rail_observed(
                                ui,
                                None,
                                &mut group,
                                false,
                                |tool, rect| {
                                    let index = tikz_authoring::TOOLS
                                        .iter()
                                        .position(|candidate| *candidate == tool)
                                        .unwrap();
                                    positions[index] = rect;
                                },
                                |_| {},
                            );
                        });
                    });
                egui::CentralPanel::default().show(ctx, |_| {});
            },
        );
        let pos = positions[0].center();
        for pressed in [true, false] {
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(1180.0, 680.0))),
                    events: vec![
                        egui::Event::PointerMoved(pos),
                        egui::Event::PointerButton {
                            pos,
                            button: egui::PointerButton::Primary,
                            pressed,
                            modifiers: Default::default(),
                        },
                    ],
                    ..Default::default()
                },
                |ctx| {
                    egui::SidePanel::left("ux2-disabled-rail")
                        .resizable(false)
                        .exact_width(46.0)
                        .show(ctx, |ui| {
                            ui.add_enabled_ui(false, |ui| {
                                action = show_direct_tool_rail_observed(
                                    ui,
                                    None,
                                    &mut group,
                                    false,
                                    |tool, rect| {
                                        let index = tikz_authoring::TOOLS
                                            .iter()
                                            .position(|candidate| *candidate == tool)
                                            .unwrap();
                                        positions[index] = rect;
                                    },
                                    |_| {},
                                );
                            });
                        });
                    egui::CentralPanel::default().show(ctx, |_| {});
                },
            );
        }
        assert!(action.selected_tool.is_none());
        assert_eq!(group, Some(StudioGroup::Extensions));
        assert_eq!(source.as_bytes(), original.as_bytes());
    }

    #[test]
    fn disabled_icon_button_response_reports_disabled_and_ignores_pointer() {
        let ctx = egui::Context::default();
        let mut rect = Rect::NOTHING;
        let mut enabled = true;
        let mut clicked = false;
        let _ = ctx.run(
            egui::RawInput {
                screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(400.0, 200.0))),
                ..Default::default()
            },
            |ctx| {
                egui::CentralPanel::default().show(ctx, |ui| {
                    ui.add_enabled_ui(false, |ui| {
                        let response =
                            icon_button(ui, StudioIcon::Tool(Tool::Line), false, 44.0, "Линия");
                        rect = response.rect;
                        enabled = response.enabled();
                        clicked = response.clicked();
                    });
                });
            },
        );
        let pos = rect.center();
        let _ = ctx.run(
            egui::RawInput {
                screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(400.0, 200.0))),
                events: vec![
                    egui::Event::PointerMoved(pos),
                    egui::Event::PointerButton {
                        pos,
                        button: egui::PointerButton::Primary,
                        pressed: true,
                        modifiers: Default::default(),
                    },
                ],
                ..Default::default()
            },
            |ctx| {
                egui::CentralPanel::default().show(ctx, |ui| {
                    ui.add_enabled_ui(false, |ui| {
                        let response =
                            icon_button(ui, StudioIcon::Tool(Tool::Line), false, 44.0, "Линия");
                        enabled = response.enabled();
                        clicked = response.clicked();
                    });
                });
            },
        );
        assert!(
            !enabled,
            "Response.enabled() reflects the disabled UI scope"
        );
        assert!(!clicked, "disabled icon ignores a pointer press");
    }

    #[test]
    fn compact_toolbar_icons_skip_disabled_actions_and_report_named_keyboard_activation() {
        fn frame(
            ctx: &egui::Context,
            events: Vec<egui::Event>,
        ) -> (egui::FullOutput, Vec<egui::Response>) {
            let mut buttons = Vec::new();
            let output = ctx.run(
                egui::RawInput {
                    screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(400.0, 200.0))),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::TopBottomPanel::top("compact-icon-toolbar").show(ctx, |ui| {
                        ui.horizontal(|ui| {
                            buttons.push(icon_button_enabled(
                                ui,
                                StudioIcon::Undo,
                                false,
                                false,
                                ICON_BUTTON_SIDE,
                                "Отменить",
                                "Отменить (Ctrl+Z)",
                            ));
                            buttons.push(icon_button_enabled(
                                ui,
                                StudioIcon::Search,
                                true,
                                false,
                                ICON_BUTTON_SIDE,
                                "Найти",
                                "Найти в исходнике (Ctrl+F)",
                            ));
                            buttons.push(command_button(
                                ui,
                                StudioIcon::Build,
                                true,
                                "Собрать",
                                "Собрать документ (Ctrl+Enter)",
                            ));
                        });
                    });
                },
            );
            (output, buttons)
        }
        let key = |key, pressed| egui::Event::Key {
            key,
            physical_key: None,
            pressed,
            repeat: false,
            modifiers: Default::default(),
        };
        for activation in [egui::Key::Enter, egui::Key::Space] {
            let ctx = egui::Context::default();
            let (_, buttons) = frame(&ctx, vec![]);
            assert!(!buttons[0].enabled());
            for button in &buttons[..2] {
                assert_eq!(button.rect.size(), Vec2::splat(ICON_BUTTON_SIDE));
            }
            assert_eq!(buttons[2].rect.height(), ICON_BUTTON_SIDE);
            assert!((92.0..=110.0).contains(&buttons[2].rect.width()));
            frame(&ctx, vec![key(egui::Key::Tab, true)]);
            let (_, buttons) = frame(&ctx, vec![key(egui::Key::Tab, false)]);
            assert!(!buttons[0].has_focus());
            assert!(buttons[1].has_focus());
            let (output, buttons) = frame(&ctx, vec![key(activation, true)]);
            assert!(!buttons[0].clicked());
            assert!(buttons[1].clicked(), "{activation:?}");
            assert!(output.platform_output.events.iter().any(|event| matches!(
                event,
                egui::output::OutputEvent::Clicked(info)
                    if info.enabled && info.label.as_deref() == Some("Найти")
            )));
        }
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
                            .exact_width(46.0)
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
