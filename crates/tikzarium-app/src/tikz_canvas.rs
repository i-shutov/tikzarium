//! B07 egui-only interaction for an independent approximate coordinate pad.
//! Exact output is the XeLaTeX PDF below this pad, NEVER the painted guides.

use crate::tikz_authoring::{self, Draft, Point, Session, TOOLS, Tool};
use eframe::egui::{self, Color32, Pos2, Rect, Sense, Stroke, Vec2};

#[derive(Clone, Copy)]
pub struct Capabilities {
    pub installed: bool,
    pub loaded: bool,
    pub engine_compatible: bool,
    pub implemented: bool,
    pub arrow_library_loaded: bool,
}

impl Capabilities {
    pub fn can_draw(self) -> bool {
        self.installed && self.loaded && self.engine_compatible && self.implemented
    }
    pub fn can_draw_tool(self, tool: Tool) -> bool {
        self.can_draw() && (tool != Tool::Arrow || self.arrow_library_loaded)
    }
    pub fn explanation_for(self, tool: Tool) -> &'static str {
        if tool == Tool::Arrow && !self.arrow_library_loaded {
            "arrows.meta is not explicitly loaded in this project; approve its visible preamble diff."
        } else {
            self.explanation()
        }
    }
    pub fn explanation(self) -> &'static str {
        if !self.engine_compatible {
            "XeLaTeX unavailable or incompatible (configure an external engine)."
        } else if !self.installed {
            "tikz.sty not confirmed installed. Install MiKTeX/TeX Live independently; no automatic installation."
        } else if !self.loaded {
            "TikZ located, but \\usepackage{tikz} not explicitly loaded. Review the proposed source diff."
        } else if !self.implemented {
            "No reviewed B visual source adapter available."
        } else {
            "Six native TikZ core source adapters are available; package compilation is still NOT_VERIFIED."
        }
    }
}

const SCALE: f32 = 29.0;
const MARGIN: f32 = 14.0;
const HEIGHT: f32 = 176.0;
fn screen_point(rect: Rect, p: Point) -> Pos2 {
    Pos2::new(
        rect.left() + MARGIN + p.x * SCALE,
        rect.bottom() - MARGIN - p.y * SCALE,
    )
}
fn snap(pos: Pos2, rect: Rect) -> Point {
    let x = ((pos.x - rect.left() - MARGIN) / SCALE).max(0.0);
    let y = ((rect.bottom() - MARGIN - pos.y) / SCALE).max(0.0);
    Point::new((x * 4.0).round() / 4.0, (y * 4.0).round() / 4.0)
}
fn paint_draft(painter: &egui::Painter, rect: Rect, tool: Tool, draft: &Draft) {
    let blue = Color32::from_rgb(50, 158, 222);
    let a = screen_point(rect, draft.start);
    let b = screen_point(rect, draft.end);
    let stroke = Stroke::new(2.0, blue);
    match tool {
        Tool::Line | Tool::Arrow => {
            painter.line_segment([a, b], stroke);
            if tool == Tool::Arrow {
                let dir = b - a;
                let length = dir.length();
                if length > 0.1 {
                    let unit = dir / length;
                    let tail = b - unit * 11.0;
                    let sideways = Vec2::new(-unit.y, unit.x) * 4.0;
                    painter.line_segment([b, tail + sideways], stroke);
                    painter.line_segment([b, tail - sideways], stroke);
                }
            }
        }
        Tool::Rectangle => {
            painter.rect_stroke(
                Rect::from_two_pos(a, b),
                0.0,
                stroke,
                egui::StrokeKind::Middle,
            );
        }
        Tool::Circle => {
            painter.circle_stroke(a, (b - a).length().max(0.1), stroke);
        }
        Tool::Node => {
            painter.circle_stroke(a, 5.0, stroke);
            painter.text(
                a + Vec2::new(8.0, -10.0),
                egui::Align2::LEFT_TOP,
                &draft.text,
                egui::FontId::proportional(12.0),
                blue,
            );
        }
        Tool::Cubic => {
            let dx = (draft.end.x - draft.start.x) / 3.0;
            let c1 = screen_point(
                rect,
                Point::new(draft.start.x + dx, draft.start.y + draft.bend),
            );
            let c2 = screen_point(rect, Point::new(draft.end.x - dx, draft.end.y + draft.bend));
            painter.line_segment([a, c1], Stroke::new(1.0, blue));
            painter.line_segment([c2, b], Stroke::new(1.0, blue));
            let cubic = |t: f32| {
                let u = 1.0 - t;
                let t2 = t * t;
                let u2 = u * u;
                Pos2::new(
                    u2 * u * a.x + 3.0 * u2 * t * c1.x + 3.0 * u * t2 * c2.x + t2 * t * b.x,
                    u2 * u * a.y + 3.0 * u2 * t * c1.y + 3.0 * u * t2 * c2.y + t2 * t * b.y,
                )
            };
            let mut old = a;
            for step in 1..=20 {
                let point = cubic(step as f32 / 20.0);
                painter.line_segment([old, point], stroke);
                old = point;
            }
            painter.circle_filled(c1, 3.0, blue);
            painter.circle_filled(c2, 3.0, blue);
        }
    }
    painter.circle_filled(a, 3.5, blue);
    if tool != Tool::Node {
        painter.circle_filled(b, 3.5, blue);
    }
}

pub fn show_guide(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    caps: Capabilities,
) -> Option<usize> {
    ui.horizontal_wrapped(|ui| {
        ui.strong("TikZ primitives");
        for tool in TOOLS {
            let info = tikz_authoring::spec(tool);
            let response = ui
                .add_enabled(
                    caps.can_draw_tool(tool),
                    egui::Button::new(&info.title_ru).selected(session.active == Some(tool)),
                )
                .on_hover_text(format!(
                    "{}\n{}\n{}",
                    info.help_ru, info.syntax, info.manual_section
                ));
            if response.clicked() {
                session.active = Some(tool);
                session.selected = None;
                session.help = true;
            }
        }
    });
    if !caps.can_draw() {
        ui.colored_label(ui.visuals().warn_fg_color, caps.explanation());
    }
    ui.small("СКЕТЧ-СЕТКА · приблизительные координаты 0.25 cm, НЕ совмещена с PDF и не отражает arbitrary scopes/transforms.");
    let width = ui.available_width().max(180.0);
    let (rect, response) =
        ui.allocate_exact_size(Vec2::new(width, HEIGHT), Sense::click_and_drag());
    let painter = ui.painter_at(rect);
    painter.rect_filled(rect, 3.0, ui.visuals().faint_bg_color);
    let grid_color = ui
        .visuals()
        .widgets
        .noninteractive
        .bg_stroke
        .color
        .gamma_multiply(0.55);
    let vertical = ((rect.width() - 2.0 * MARGIN) / SCALE).floor() as usize;
    let horizontal = ((rect.height() - 2.0 * MARGIN) / SCALE).floor() as usize;
    for x in 0..=vertical {
        let screen_x = rect.left() + MARGIN + x as f32 * SCALE;
        painter.line_segment(
            [
                Pos2::new(screen_x, rect.top()),
                Pos2::new(screen_x, rect.bottom()),
            ],
            Stroke::new(0.6, grid_color),
        );
    }
    for y in 0..=horizontal {
        let screen_y = rect.bottom() - MARGIN - y as f32 * SCALE;
        painter.line_segment(
            [
                Pos2::new(rect.left(), screen_y),
                Pos2::new(rect.right(), screen_y),
            ],
            Stroke::new(0.6, grid_color),
        );
    }
    painter.text(
        rect.left_top() + Vec2::new(8.0, 6.0),
        egui::Align2::LEFT_TOP,
        "Guide only · x/y TikZ units assumed 1 cm",
        egui::FontId::monospace(10.0),
        ui.visuals().text_color(),
    );

    if let Some(tool) = session.active {
        if let Some(start) = session.drag_start {
            let end = response
                .interact_pointer_pos()
                .map(|pos| snap(pos, rect))
                .unwrap_or(start);
            let mut draft = session.draft.clone();
            draft.start = start;
            draft.end = end;
            paint_draft(&painter, rect, tool, &draft);
        } else if session.selected.is_some() {
            paint_draft(&painter, rect, tool, &session.draft);
        }
    }

    if session.active.is_none() {
        return None;
    }
    if let Some(tool) = session.active
        && !caps.can_draw_tool(tool)
    {
        ui.colored_label(ui.visuals().warn_fg_color, caps.explanation_for(tool));
        return None;
    }
    if response.drag_started()
        && let Some(pointer) = response.interact_pointer_pos()
    {
        session.drag_start = Some(snap(pointer, rect));
    }
    let mut finish = None;
    if response.drag_stopped() {
        if let Some(start) = session.drag_start.take() {
            let end = response
                .interact_pointer_pos()
                .map(|pos| snap(pos, rect))
                .unwrap_or(start);
            finish = Some((start, end));
        }
    } else if response.clicked()
        && let Some(pointer) = response.interact_pointer_pos()
    {
        let start = snap(pointer, rect);
        let end = if session.active == Some(Tool::Circle) {
            Point::new(start.x + 1.0, start.y)
        } else {
            Point::new(start.x + 1.0, start.y + 1.0)
        };
        finish = Some((start, end));
    }
    if let (Some(tool), Some((start, end))) = (session.active, finish) {
        let draft = Draft {
            start,
            end,
            ..Default::default()
        };
        match session.insert(source, tool, draft) {
            Ok(line) => return Some(line),
            Err(error) => session.status = error,
        }
    }
    None
}

pub fn show_inspector(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    caps: Capabilities,
) -> Option<usize> {
    let mut jump = None;
    ui.heading("TikZ · свойства");
    ui.small("Только собственные B08-команды каталога C. Чужой TeX остаётся в Source.");
    ui.small(format!(
        "PGF/TikZ: installed={} · project-loaded={} · XeLaTeX-compatible={} · B-adapter={} · arrows.meta-loaded={}",
        caps.installed, caps.loaded, caps.engine_compatible, caps.implemented, caps.arrow_library_loaded,
    ));
    ui.label(caps.explanation());
    ui.separator();

    let choices = tikz_authoring::owned(source);
    egui::ComboBox::from_id_salt("tikz-b08-owned")
        .selected_text(match session.selected {
            Some(id) => format!("Primitive #{id}"),
            None => "Выберите примитив".into(),
        })
        .show_ui(ui, |ui| {
            for item in choices {
                let label = format!(
                    "#{} {} · line {}",
                    item.id,
                    tikz_authoring::spec(item.tool).title_ru,
                    item.line
                );
                if ui
                    .selectable_label(session.selected == Some(item.id), label)
                    .clicked()
                {
                    match session.choose(source, item.id) {
                        Ok(line) => jump = Some(line),
                        Err(error) => session.status = error,
                    }
                }
            }
        });

    if let Some(tool) = session.active {
        let info = tikz_authoring::spec(tool);
        ui.separator();
        ui.strong(&info.title_ru);
        ui.label("Точки (условные TikZ x/y, cm для обычной picture):");
        ui.horizontal(|ui| {
            ui.label("x1");
            ui.add(egui::DragValue::new(&mut session.draft.start.x).speed(0.1));
            ui.label("y1");
            ui.add(egui::DragValue::new(&mut session.draft.start.y).speed(0.1));
        });
        if tool == Tool::Circle {
            let mut radius = (session.draft.end.x - session.draft.start.x)
                .hypot(session.draft.end.y - session.draft.start.y);
            ui.horizontal(|ui| {
                ui.label("radius (cm)");
                if ui
                    .add(egui::DragValue::new(&mut radius).speed(0.1))
                    .changed()
                {
                    let radius = radius.clamp(0.1, 1000.0);
                    session.draft.end =
                        Point::new(session.draft.start.x + radius, session.draft.start.y);
                }
            });
        } else if tool != Tool::Node {
            ui.horizontal(|ui| {
                ui.label("x2");
                ui.add(egui::DragValue::new(&mut session.draft.end.x).speed(0.1));
                ui.label("y2");
                ui.add(egui::DragValue::new(&mut session.draft.end.y).speed(0.1));
            });
        }
        if tool == Tool::Cubic {
            ui.horizontal(|ui| {
                ui.label("bend");
                ui.add(egui::DragValue::new(&mut session.draft.bend).speed(0.1));
                ui.label("cm");
            });
        }
        if tool == Tool::Arrow {
            if let Some(tip) = info.parameter.iter().find(|p| p.id == "tip") {
                ui.label(&tip.help_ru);
                egui::ComboBox::from_id_salt("c-arrow-tip")
                    .selected_text(&session.draft.tip)
                    .show_ui(ui, |ui| {
                        for option in &tip.allowed_values {
                            ui.selectable_value(&mut session.draft.tip, option.clone(), option);
                        }
                    });
            }
        }
        if tool == Tool::Node {
            if let Some(mode) = info.parameter.iter().find(|p| p.id == "mode") {
                ui.label(&mode.help_ru);
                egui::ComboBox::from_id_salt("c-node-mode")
                    .selected_text(&session.draft.mode)
                    .show_ui(ui, |ui| {
                        for option in &mode.allowed_values {
                            ui.selectable_value(&mut session.draft.mode, option.clone(), option);
                        }
                    });
            }
            ui.label("Содержимое: text экранируется C, math — исходное TeX-выражение");
            ui.text_edit_singleline(&mut session.draft.text);
        }
        if let Some(id) = session.selected {
            if ui.button("Применить · patch source").clicked() {
                match session.apply_parameters(source) {
                    Ok(line) => jump = Some(line),
                    Err(error) => session.status = error,
                }
            }
            ui.small(format!("C-catalogue source marker: B08 #{id}"));
        }
        if let Ok(command) =
            tikz_authoring::generate(tool, &session.draft, session.selected.unwrap_or(0))
        {
            ui.label("Генерируемый код:");
            ui.code(command);
        }
        if ui
            .button(if session.help {
                "Скрыть справку F1"
            } else {
                "Справка F1"
            })
            .clicked()
        {
            session.help = !session.help;
        }
        if session.help {
            ui.separator();
            ui.strong("Контекстная справка · каталог C");
            ui.label(&info.help_ru);
            ui.small(format!("Синтаксис: {}", info.syntax));
            ui.small(format!("Интерактивно: {}", info.interaction_ru));
            ui.small(format!("Предупреждение: {}", info.warning_ru));
            ui.code(&info.example);
            ui.small(format!(
                "Зависимости: пакеты {:?}, библиотеки {:?}, движок {}, documented PGF {}, минимальная версия {}",
                info.requirements.packages, info.requirements.libraries,
                info.requirements.engine, info.requirements.documented_against,
                info.requirements.pgf_version_min
            ));
            ui.small(format!(
                "Первоисточник: {} · {}",
                info.manual_section, info.manual_url
            ));
            for parameter in &info.parameter {
                ui.collapsing(format!("{} · {}", parameter.id, parameter.kind), |ui| {
                    ui.label(&parameter.help_ru);
                    ui.small(format!("Синтаксис: {}", parameter.syntax));
                    ui.small(format!(
                        "Единицы {:?}; допустимые значения {:?}",
                        parameter.units, parameter.allowed_values
                    ));
                    ui.small(format!(
                        "Default: {} ({})",
                        parameter.default, parameter.default_provenance
                    ));
                    ui.small(format!("Предупреждение: {}", parameter.warning_ru));
                    ui.small(format!("Взаимодействие: {}", parameter.interaction_ru));
                    ui.code(&parameter.example);
                    ui.small(format!(
                        "PGF Manual: {} · {}",
                        parameter.manual_section, parameter.manual_url
                    ));
                });
            }
        }
    } else {
        ui.small("Выберите инструмент над координатным полем, затем click/drag. F1 показывает справку для выбранной команды.");
    }

    if caps.installed && !caps.loaded {
        ui.separator();
        ui.strong("Explicit package diff (Undo supported)");
        match Session::propose_usepackage(source) {
            Ok(diff) => {
                ui.code(diff);
                if ui.button("Принять diff").clicked()
                    && let Err(error) = session.add_usepackage(source)
                {
                    session.status = error;
                }
            }
            Err(error) => {
                ui.small(error);
            }
        }
    }
    if caps.installed && caps.loaded && !caps.arrow_library_loaded {
        ui.separator();
        ui.strong("arrows.meta · явная правка преамбулы с Undo");
        match Session::propose_library(source, "arrows.meta") {
            Ok(diff) => {
                ui.code(diff);
                if ui.button("Подключить arrows.meta").clicked()
                    && let Err(error) = session.add_library(source, "arrows.meta")
                {
                    session.status = error;
                }
            }
            Err(error) => {
                ui.small(error);
            }
        }
    }
    if ui
        .add_enabled(
            session.undo_available(),
            egui::Button::new("↶ Undo visual patch"),
        )
        .clicked()
        && let Err(error) = session.undo(source)
    {
        session.status = error;
    }
    ui.separator();
    ui.small(&session.status);
    jump
}
