//! N1 egui controls read the same C catalogue as the generator and F1 help.
//! The small input guide is explicitly approximate; XeLaTeX alone renders the PDF.
use crate::tikz_authoring::{self, Draft, Point, Session, TOOLS, Tool};
use eframe::egui::{self, Color32, Pos2, Rect, Sense, Stroke, Vec2};
use tikzarium_extensions::primitives::ParameterSpec;

#[derive(Clone, Copy)]
pub struct Capabilities {
    pub installed: bool,
    pub loaded: bool,
    pub engine_compatible: bool,
    pub implemented: bool,
}
impl Capabilities {
    fn base_ready(self) -> bool {
        self.installed && self.engine_compatible && self.implemented
    }
    fn explanation(self) -> &'static str {
        if !self.engine_compatible {
            "Путь внешнего XeLaTeX не подтверждён. Windows: отдельно установленный MiKTeX."
        } else if !self.installed {
            "Наличие tikz.sty не подтверждено. Редактор не устанавливает TeX или пакеты автоматически."
        } else if !self.loaded {
            "Подключение TikZ в исходнике не подтверждено; просмотрите предлагаемую правку преамбулы."
        } else {
            "Установка, подключение в проекте и успешная компиляция — разные статусы. Результат проверяет XeLaTeX."
        }
    }
}
const SCALE: f32 = 29.0;
const MARGIN: f32 = 14.0;
const HEIGHT: f32 = 170.0;
fn screen_point(rect: Rect, point: Point) -> Pos2 {
    Pos2::new(
        rect.left() + MARGIN + point.x * SCALE,
        rect.bottom() - MARGIN - point.y * SCALE,
    )
}
fn snap(pos: Pos2, rect: Rect) -> Point {
    let x = ((pos.x - rect.left() - MARGIN) / SCALE).max(0.0);
    let y = ((rect.bottom() - MARGIN - pos.y) / SCALE).max(0.0);
    Point::new((x * 4.0).round() / 4.0, (y * 4.0).round() / 4.0)
}
fn paint_draft(painter: &egui::Painter, rect: Rect, tool: Tool, draft: &Draft) -> Option<()> {
    let ink = Color32::from_rgb(50, 158, 222);
    let stroke = Stroke::new(2.0, ink);
    let start = match tool {
        Tool::Circle => draft.point_cm("center_x", "center_y")?,
        Tool::Node => draft.point_cm("x", "y")?,
        _ => draft.point_cm("start_x", "start_y")?,
    };
    let a = screen_point(rect, start);
    match tool {
        Tool::Circle => {
            painter.circle_stroke(a, draft.cm("radius")? * SCALE, stroke);
        }
        Tool::Node => {
            painter.circle_stroke(a, 4.0, stroke);
            painter.text(
                a + Vec2::new(8.0, -12.0),
                egui::Align2::LEFT_TOP,
                draft
                    .values
                    .get("content")
                    .map(String::as_str)
                    .unwrap_or(""),
                egui::FontId::proportional(12.0),
                ink,
            );
        }
        _ => {
            let b = screen_point(rect, draft.point_cm("end_x", "end_y")?);
            match tool {
                Tool::Line | Tool::Arrow => {
                    painter.line_segment([a, b], stroke);
                    if tool == Tool::Arrow && (b - a).length() > 0.1 {
                        let unit = (b - a).normalized();
                        let tail = b - unit * 10.0;
                        let side = Vec2::new(-unit.y, unit.x) * 4.0;
                        painter.line_segment([b, tail + side], stroke);
                        painter.line_segment([b, tail - side], stroke);
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
                Tool::Cubic => {
                    let c1 = screen_point(rect, draft.point_cm("control1_x", "control1_y")?);
                    let c2 = screen_point(rect, draft.point_cm("control2_x", "control2_y")?);
                    painter.line_segment([a, c1], Stroke::new(1.0, ink));
                    painter.line_segment([c2, b], Stroke::new(1.0, ink));
                    let mut old = a;
                    for step in 1..=24 {
                        let t = step as f32 / 24.0;
                        let u = 1.0 - t;
                        let p = Pos2::new(
                            u * u * u * a.x
                                + 3.0 * u * u * t * c1.x
                                + 3.0 * u * t * t * c2.x
                                + t * t * t * b.x,
                            u * u * u * a.y
                                + 3.0 * u * u * t * c1.y
                                + 3.0 * u * t * t * c2.y
                                + t * t * t * b.y,
                        );
                        painter.line_segment([old, p], stroke);
                        old = p;
                    }
                    painter.circle_filled(c1, 3.0, ink);
                    painter.circle_filled(c2, 3.0, ink);
                }
                _ => unreachable!(),
            }
            painter.circle_filled(b, 3.0, ink);
        }
    }
    painter.circle_filled(a, 3.5, ink);
    Some(())
}

pub fn show_guide(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    caps: Capabilities,
) -> Option<usize> {
    ui.horizontal_wrapped(|ui| {
        ui.strong("TikZ · инструменты");
        for tool in TOOLS {
            let info = tikz_authoring::spec(tool);
            if ui
                .add(egui::Button::new(&info.title_ru).selected(session.active == Some(tool)))
                .on_hover_text(format!(
                    "{}\n{}\nPGF/TikZ §{}\n{}",
                    info.help_ru, info.syntax, info.manual_section, info.manual_url
                ))
                .clicked()
            {
                session.select_tool(tool);
            }
        }
    });
    ui.small("ПОЛЕ ВВОДА · шаг 0.25 cm. Не наложено на PDF; стили и преобразования выполняет TeX.");
    let ready = caps.base_ready()
        && session
            .active
            .is_some_and(|tool| tikz_authoring::requirements_loaded(source, tool));
    if !ready {
        ui.colored_label(
            ui.visuals().warn_fg_color,
            if !caps.base_ready() {
                caps.explanation()
            } else {
                "Выберите инструмент и подтвердите его подключения в панели свойств."
            },
        );
    }
    let (rect, response) = ui.allocate_exact_size(
        Vec2::new(ui.available_width().max(180.0), HEIGHT),
        Sense::click_and_drag(),
    );
    let painter = ui.painter_at(rect);
    painter.rect_filled(rect, 3.0, ui.visuals().faint_bg_color);
    let grid = ui
        .visuals()
        .widgets
        .noninteractive
        .bg_stroke
        .color
        .gamma_multiply(0.55);
    let nx = (((rect.width() - 2.0 * MARGIN) / SCALE).floor().max(0.0) as usize).min(150);
    let ny = (((rect.height() - 2.0 * MARGIN) / SCALE).floor().max(0.0) as usize).min(150);
    for i in 0..=nx {
        let x = rect.left() + MARGIN + i as f32 * SCALE;
        painter.line_segment(
            [Pos2::new(x, rect.top()), Pos2::new(x, rect.bottom())],
            Stroke::new(0.6, grid),
        );
    }
    for i in 0..=ny {
        let y = rect.bottom() - MARGIN - i as f32 * SCALE;
        painter.line_segment(
            [Pos2::new(rect.left(), y), Pos2::new(rect.right(), y)],
            Stroke::new(0.6, grid),
        );
    }
    painter.text(
        rect.left_top() + Vec2::new(6.0, 4.0),
        egui::Align2::LEFT_TOP,
        "Вспомогательная сетка · точный результат ниже: XeLaTeX PDF",
        egui::FontId::proportional(10.0),
        ui.visuals().text_color(),
    );
    if let Some(tool) = session.active {
        if let Some(start) = session.drag_start {
            let end = response
                .interact_pointer_pos()
                .map(|pos| snap(pos, rect))
                .unwrap_or(start);
            let draft = Draft::from_gesture(tool, start, end, &session.draft);
            paint_draft(&painter, rect, tool, &draft);
        } else if session.selected.is_some() {
            paint_draft(&painter, rect, tool, &session.draft);
        }
    }
    if !ready {
        return None;
    }
    if response.drag_started() {
        let pointer = ui
            .input(|input| input.pointer.press_origin())
            .or_else(|| response.interact_pointer_pos());
        if let Some(pointer) = pointer {
            session.drag_start = Some(snap(pointer, rect));
        }
    }
    let finish = if response.drag_stopped() {
        session.drag_start.take().map(|start| {
            let end = response
                .interact_pointer_pos()
                .map(|pos| snap(pos, rect))
                .unwrap_or(start);
            (start, end)
        })
    } else if response.clicked() {
        response.interact_pointer_pos().map(|pos| {
            let start = snap(pos, rect);
            let end = Point::new(
                start.x + 1.0,
                start.y
                    + if session.active == Some(Tool::Circle) {
                        0.0
                    } else {
                        1.0
                    },
            );
            (start, end)
        })
    } else {
        None
    };
    if let (Some(tool), Some((start, end))) = (session.active, finish) {
        let draft = Draft::from_gesture(tool, start, end, &session.draft);
        match session.insert(source, tool, draft) {
            Ok(line) => return Some(line),
            Err(error) => session.status = error,
        }
    }
    None
}

fn parameter_help(p: &ParameterSpec) -> String {
    let preset = if p.default_provenance == "editor_preset" {
        format!(
            "Начальное значение редактора: {} (НЕ default TikZ)",
            p.default
        )
    } else {
        "Значение по умолчанию: не подтверждено".into()
    };
    format!(
        "{}\nСинтаксис: {}\nТип: {}\nЕдиницы: {}\nВарианты: {}\n{}\n{}\n{}\nПример: {}\nPGF/TikZ §{} · {}",
        p.help_ru,
        p.syntax,
        p.kind,
        p.units.join(", "),
        p.allowed_values.join(", "),
        preset,
        p.warning_ru,
        p.interaction_ru,
        p.example,
        p.manual_section,
        p.manual_url
    )
}
fn parameter_control(ui: &mut egui::Ui, p: &ParameterSpec, value: &mut String) {
    let help = parameter_help(p);
    ui.horizontal(|ui| {
        ui.label(&p.id).on_hover_text(&help);
        if p.kind == "choice" {
            egui::ComboBox::from_id_salt(("n1-parameter", &p.id))
                .selected_text(value.as_str())
                .show_ui(ui, |ui| {
                    for candidate in &p.allowed_values {
                        ui.selectable_value(value, candidate.clone(), candidate);
                    }
                });
        } else {
            ui.add(
                egui::TextEdit::singleline(value).desired_width(if p.kind == "dimension" {
                    85.0
                } else {
                    150.0
                }),
            )
            .on_hover_text(&help);
        }
    });
    ui.small(&p.help_ru);
}

pub fn show_inspector(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    caps: Capabilities,
) -> Option<usize> {
    let mut jump = None;
    ui.heading("TikZ · параметры и справка");
    ui.small("Один каталог: палитра → свойства → команда → F1. Неизвестный TeX не переписывается.");
    ui.small(format!(
        "tikz.sty подтверждён={} · явное подключение={} · путь XeLaTeX={}",
        caps.installed, caps.loaded, caps.engine_compatible
    ));
    ui.small(caps.explanation());
    let choices = tikz_authoring::owned(source);
    egui::ComboBox::from_id_salt("n1-owned-command")
        .selected_text(
            session
                .selected
                .map(|id| format!("Команда #{id}"))
                .unwrap_or_else(|| "Выберите созданную команду".into()),
        )
        .show_ui(ui, |ui| {
            for item in choices {
                let label = format!(
                    "#{} {} · строка {}",
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
        ui.label(&info.help_ru);
        let loaded = tikz_authoring::requirements_loaded(source, tool);
        ui.small(format!(
            "Требуемые пакеты: {}; библиотеки: {}; подключение {}",
            info.requirements.packages.join(", "),
            if info.requirements.libraries.is_empty() {
                "core".into()
            } else {
                info.requirements.libraries.join(", ")
            },
            if loaded {
                "подтверждено явно"
            } else {
                "не подтверждено (UNKNOWN)"
            }
        ));
        for parameter in &info.parameter {
            let value = session
                .draft
                .values
                .entry(parameter.id.clone())
                .or_insert_with(|| {
                    if parameter.default == "UNKNOWN" {
                        String::new()
                    } else {
                        parameter.default.clone()
                    }
                });
            ui.push_id((&info.id, &parameter.id), |ui| {
                parameter_control(ui, parameter, value)
            });
        }
        ui.separator();
        match tikz_authoring::command(tool, &session.draft) {
            Ok(code) => {
                ui.label("Команда из общего каталога:");
                ui.code(code);
            }
            Err(error) => {
                ui.colored_label(ui.visuals().error_fg_color, error);
            }
        }
        if session.selected.is_some() {
            if ui
                .button("Применить параметры · изменить только эту команду")
                .clicked()
            {
                match session.apply_parameters(source) {
                    Ok(line) => jump = Some(line),
                    Err(error) => session.status = error,
                }
            }
        } else if ui
            .add_enabled(
                caps.base_ready() && loaded,
                egui::Button::new("Вставить по параметрам"),
            )
            .clicked()
        {
            let draft = session.draft.clone();
            match session.insert(source, tool, draft) {
                Ok(line) => jump = Some(line),
                Err(error) => session.status = error,
            }
        }
        if !loaded {
            match Session::propose_dependencies(source, tool) {
                Ok(proposed) => {
                    ui.separator();
                    ui.strong("Предлагаемая правка преамбулы");
                    ui.code(&proposed);
                    ui.small("Только текст проекта, без установки пакетов. Правку можно отменить.");
                    if ui.button("Применить показанные подключения").clicked()
                        && let Err(error) = session.add_dependencies(source, tool)
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
            .button(if session.help {
                "Скрыть подробную справку · F1"
            } else {
                "Подробная справка · F1"
            })
            .clicked()
        {
            session.help = !session.help;
        }
        if session.help {
            ui.separator();
            ui.strong("Контекстная справка");
            ui.code(&info.syntax);
            ui.label(&info.warning_ru);
            ui.label(&info.interaction_ru);
            ui.label("Минимальный пример:");
            ui.code(&info.example);
            ui.hyperlink_to(
                format!("PGF/TikZ §{}", info.manual_section),
                &info.manual_url,
            );
            for p in &info.parameter {
                egui::CollapsingHeader::new(format!("{} · {}", p.id, p.help_ru)).show(ui, |ui| {
                    ui.label(parameter_help(p));
                });
            }
            ui.small(format!("Справка сверена с PGF {}; минимальная версия: {}. Успешная сборка не подразумевается.",
                info.requirements.documented_against, info.requirements.pgf_version_min));
        }
    } else {
        ui.small("Выберите примитив над полем ввода. Исходный код остаётся главным документом.");
    }
    ui.separator();
    if ui
        .add_enabled(
            session.undo_available(),
            egui::Button::new("Отменить визуальную правку"),
        )
        .clicked()
        && let Err(error) = session.undo(source)
    {
        session.status = error;
    }
    ui.small(&session.status);
    jump
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn parameter_help_distinguishes_editor_presets_from_tex_defaults() {
        for tool in TOOLS {
            for p in &tikz_authoring::spec(tool).parameter {
                let help = parameter_help(p);
                assert!(help.contains(&p.help_ru));
                assert!(help.contains(&p.example));
                assert!(help.contains(&p.manual_url));
                if p.default_provenance == "editor_preset" {
                    assert!(help.contains("НЕ default TikZ"));
                }
            }
        }
    }
    #[test]
    fn gesture_mapping_uses_explicit_cm_not_fake_pdf_coordinates() {
        let rect = Rect::from_min_size(Pos2::new(0.0, 0.0), Vec2::new(300.0, 170.0));
        let point = Point::new(1.25, 2.5);
        assert_eq!(snap(screen_point(rect, point), rect), point);
    }
}
