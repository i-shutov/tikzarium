//! N1 egui controls read the same C catalogue as the generator and F1 help.
//! The small input guide is explicitly approximate; XeLaTeX alone renders the PDF.
use crate::tikz_authoring::{self, Draft, Point, Session, TOOLS, Tool};
use eframe::egui::{self, Color32, Pos2, Rect, Sense, Stroke, Vec2};
use tikzarium_extensions::primitives::{Evidence, ParameterSpec};
use tikzarium_extensions::project_imports::{self, ImportKind};

#[derive(Clone, Copy)]
pub struct Capabilities {
    pub installed: bool,
    pub loaded: Evidence,
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
        } else if self.loaded == Evidence::Absent {
            "ABSENT: прямого подключения TikZ в проверенной преамбуле нет; просмотрите C/N2 diff."
        } else if self.loaded == Evidence::Unknown {
            "UNKNOWN: нельзя доказать подключение TikZ из непрозрачной преамбулы; автоматическая правка запрещена."
        } else {
            "Установка, подключение в проекте и успешная компиляция — разные статусы. Результат проверяет XeLaTeX."
        }
    }
}
fn evidence_label(value: Evidence) -> &'static str {
    match value {
        Evidence::Confirmed => "CONFIRMED",
        Evidence::Absent => "ABSENT",
        Evidence::Unknown => "UNKNOWN",
    }
}
/// Highlight only literal preamble import lines proven by C/N2. Byte offsets
/// come from the C catalogue's read-only declaration-site API, not a B TeX
/// scanner or an edit authorization. UNKNOWN and absent imports have no links.
fn confirmed_import_lines(source: &str, tool: Tool) -> Vec<(ImportKind, String, usize)> {
    let project = project_imports::inspect(source);
    let requirements = &tikz_authoring::spec(tool).requirements;
    let mut locations = Vec::new();
    for (kind, names) in [
        (ImportKind::Package, &requirements.packages),
        (ImportKind::TikzLibrary, &requirements.libraries),
    ] {
        for name in names {
            if project.status(kind, name) != Evidence::Confirmed {
                continue;
            }
            for site in project.declaration_sites(kind, name) {
                if site.line_range.start > site.name_range.start
                    || site.name_range.end > site.line_range.end
                    || site.line_range.end > source.len()
                    || source.get(site.name_range.clone()) != Some(name.as_str())
                {
                    continue;
                }
                let line = source.as_bytes()[..site.line_range.start]
                    .iter()
                    .filter(|byte| **byte == b'\n')
                    .count()
                    + 1;
                locations.push((kind, name.clone(), line));
            }
        }
    }
    locations
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
    // Captured drags can finish outside the guide. Clamp their end point to
    // the guide boundary rather than authoring offscreen coordinates.
    let inner = rect.shrink(MARGIN);
    let pos = Pos2::new(
        pos.x.clamp(inner.left(), inner.right()),
        pos.y.clamp(inner.top(), inner.bottom()),
    );
    let x = ((pos.x - rect.left() - MARGIN) / SCALE).max(0.0);
    let y = ((rect.bottom() - MARGIN - pos.y) / SCALE).max(0.0);
    Point::new((x * 4.0).round() / 4.0, (y * 4.0).round() / 4.0)
}
fn paint_draft(
    painter: &egui::Painter,
    rect: Rect,
    tool: Tool,
    draft: &Draft,
    selected: bool,
) -> Option<()> {
    let ink = if selected {
        Color32::from_rgb(50, 158, 222)
    } else {
        Color32::from_rgba_unmultiplied(130, 150, 170, 130)
    };
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

/// Only N1-owned commands with literal cm coordinates get clickable anchors.
fn authored_anchor(tool: Tool, draft: &Draft) -> Option<Point> {
    match tool {
        Tool::Circle => draft.point_cm("center_x", "center_y"),
        Tool::Node => draft.point_cm("x", "y"),
        _ => draft.point_cm("start_x", "start_y"),
    }
}

/// Never infer a TeX/PDF object from an ambiguous provisional anchor.
fn hit_authored_anchor(source: &str, rect: Rect, pos: Pos2) -> Result<Option<u64>, &'static str> {
    let mut hits: Vec<(f32, u64)> = tikz_authoring::owned(source)
        .into_iter()
        .filter_map(|item| {
            let anchor = screen_point(rect, authored_anchor(item.tool, &item.draft)?);
            if !rect.contains(anchor) {
                return None;
            }
            let squared = (anchor - pos).length_sq();
            (squared <= 225.0).then_some((squared, item.id))
        })
        .collect();
    hits.sort_by(|a, b| a.0.total_cmp(&b.0));
    match hits.as_slice() {
        [] => Ok(None),
        [(_, id)] => Ok(Some(*id)),
        [(a, _), (b, _), ..] if *b - *a <= 16.0 => {
            Err("Перекрытие маркеров: выберите точную команду в списке")
        }
        [(_, id), ..] => Ok(Some(*id)),
    }
}

fn show_guide_frame_with_palette(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    caps: Capabilities,
    mut palette_rects: Option<&mut [Rect; 6]>,
) -> (Option<usize>, Rect) {
    ui.horizontal_wrapped(|ui| {
        ui.strong("TikZ · инструменты");
        for (index, tool) in TOOLS.into_iter().enumerate() {
            let info = tikz_authoring::spec(tool);
            let button = ui
                .add(egui::Button::new(&info.title_ru).selected(session.active == Some(tool)))
                .on_hover_text(format!(
                    "{}\n{}\nPGF/TikZ §{}\n{}",
                    info.help_ru, info.syntax, info.manual_section, info.manual_url
                ));
            if let Some(rects) = palette_rects.as_deref_mut() {
                rects[index] = button.rect;
            }
            if button.clicked() {
                session.select_tool(tool);
            }
        }
    });
    ui.strong(match session.active {
        Some(tool) => format!("ВЫБРАН: {}", tikz_authoring::spec(tool).title_ru),
        None => "ИНСТРУМЕНТ НЕ ВЫБРАН".to_owned(),
    });
    ui.small("ПОЛЕ ВВОДА · шаг 0.25 cm. Alt+клик на #ID выбирает команду. Это не PDF; стили и преобразования выполняет TeX.");
    let project_state = session
        .active
        .map(|tool| tikz_authoring::requirements_status(source, tool));
    let ready = caps.base_ready()
        && project_state == Some(tikzarium_extensions::primitives::Evidence::Confirmed);
    if !ready {
        ui.colored_label(
            ui.visuals().warn_fg_color,
            if !caps.base_ready() {
                caps.explanation()
            } else {
                match project_state {
                    Some(tikzarium_extensions::primitives::Evidence::Unknown) =>
                        "Подключения в преамбуле UNKNOWN: вручную проверьте TeX; безопасная вставка заблокирована.",
                    Some(tikzarium_extensions::primitives::Evidence::Absent) =>
                        "Требуемый TikZ-пакет/библиотека отсутствует в явной преамбуле: примите C/N2 diff.",
                    _ => "Выберите инструмент и подтвердите подключения в панели свойств.",
                }
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
    // Only validated source-owned primitives are represented on the guide.
    for item in tikz_authoring::owned(source) {
        if paint_draft(&painter, rect, item.tool, &item.draft, false).is_some()
            && let Some(anchor) = authored_anchor(item.tool, &item.draft)
        {
            let marker = screen_point(rect, anchor);
            if rect.contains(marker) {
                painter.text(
                    marker + Vec2::new(5.0, 5.0),
                    egui::Align2::LEFT_TOP,
                    format!("#{}", item.id),
                    egui::FontId::proportional(10.0),
                    ui.visuals().text_color().gamma_multiply(0.6),
                );
            }
        }
    }
    if let Some(tool) = session.active {
        if let Some(start) = session.drag_start {
            let end = response
                .interact_pointer_pos()
                .map(|pos| snap(pos, rect))
                .unwrap_or(start);
            let draft = Draft::from_gesture(tool, start, end, &session.draft);
            let _ = paint_draft(&painter, rect, tool, &draft, true);
        } else if session.selected.is_some() {
            let _ = paint_draft(&painter, rect, tool, &session.draft, true);
        }
    }
    // Read-only selection is allowed without confirmed packages/compiler.
    // Alt starts a selection-only pointer capture; dragging or releasing Alt
    // before the mouse must NEVER create an unintended source command.
    // Snapshot Response flags *before* locking egui InputState. Calling
    // Response methods from inside ui.input can recurse into the context lock.
    let clicked = response.clicked();
    let alt_press_on_guide = ui.input(|input| {
        input.modifiers.alt
            && (input.pointer.primary_down() || clicked)
            && input
                .pointer
                .press_origin()
                .is_some_and(|origin| rect.contains(origin))
    });
    if alt_press_on_guide {
        session.alt_selection_capture = true;
    }
    if session.alt_selection_capture {
        session.drag_start = None;
        let mut jump = None;
        if clicked && let Some(pos) = response.interact_pointer_pos() {
            match hit_authored_anchor(source, rect, pos) {
                Ok(Some(id)) => match session.choose(source, id) {
                    Ok(line) => {
                        session.status = "Команда выбрана; код выделяется рядом".into();
                        jump = Some(line);
                    }
                    Err(error) => session.status = error,
                },
                Ok(None) => {
                    session.status = "Нет маркера #ID поблизости; используйте список свойств".into()
                }
                Err(error) => session.status = error.into(),
            }
        }
        if ui.input(|input| !input.pointer.primary_down()) {
            session.alt_selection_capture = false;
        }
        return (jump, rect);
    }
    if !ready {
        session.drag_start = None;
        return (None, rect);
    }
    if response.drag_started() {
        let pointer = ui
            .input(|input| input.pointer.press_origin())
            .or_else(|| response.interact_pointer_pos());
        if let Some(pointer) = pointer {
            session.drag_start = Some(snap(pointer, rect));
        }
    }
    // Escape cancels the active provisional gesture, including a key event in
    // the same frame as drag-stop. Never turn a cancelled drag into TeX source.
    if ui.input(|input| input.key_pressed(egui::Key::Escape)) && session.drag_start.take().is_some()
    {
        session.status = "Жест отменён Esc; исходный TeX не изменён".into();
        return (None, rect);
    }
    let finish = if response.drag_stopped() {
        session.drag_start.take().map(|start| {
            let end = response
                .interact_pointer_pos()
                .or_else(|| ui.input(|input| input.pointer.latest_pos()))
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
            Ok(line) => return (Some(line), rect),
            Err(error) => session.status = error,
        }
    }
    (None, rect)
}

fn show_guide_frame(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    caps: Capabilities,
) -> (Option<usize>, Rect) {
    show_guide_frame_with_palette(ui, session, source, caps, None)
}

/// The production handler and UNIT_EVENT egui frames run the same Response
/// processing. The guide is provisional; neither path decodes a PDF.
pub fn show_guide(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    caps: Capabilities,
) -> Option<usize> {
    show_guide_frame(ui, session, source, caps).0
}

pub fn handle_help_shortcut(ctx: &egui::Context, session: &mut Session) {
    if ctx.input(|input| input.key_pressed(egui::Key::F1)) {
        session.help = !session.help;
    }
}

/// The same TextEdit change hook is used by the desktop app and egui events.
pub fn observe_source_text_edit(response: &egui::Response, session: &mut Session, source: &str) {
    if response.changed() {
        session.note_manual_source_edit(source);
    }
}

/// Always visible above the independently scrollable inspector. The shared
/// Session inverse patch is the only source authority; no TeX is reconstructed.
fn show_inspector_action_bar_frame(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    mut undo_rect: Option<&mut Rect>,
) -> Option<usize> {
    let mut jump = None;
    ui.horizontal_wrapped(|ui| {
        let button = ui
            .add_enabled(
                session.undo_available(),
                egui::Button::new("↶ Отменить правку"),
            )
            .on_hover_text("Undo точной TikZ/source-правки; перейти к изменённой строке");
        if let Some(rect) = undo_rect.as_deref_mut() {
            *rect = button.rect;
        }
        if button.clicked() {
            match session.undo_and_focus_line(source) {
                Ok(line) => jump = Some(line),
                Err(error) => session.status = error,
            }
        }
    });
    ui.small(&session.status);
    jump
}

pub fn show_inspector_action_bar(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
) -> Option<usize> {
    show_inspector_action_bar_frame(ui, session, source, None)
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
        "Установлен tikz.sty={} · явно подключён={} · внешний XeLaTeX={} · B-инструмент=реализован · C-справка=доступна",
        if caps.installed { "CONFIRMED" } else { "UNKNOWN" },
        evidence_label(caps.loaded),
        if caps.engine_compatible { "CONFIRMED" } else { "UNKNOWN" },
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
        let import_state = tikz_authoring::requirements_status(source, tool);
        let loaded = import_state == tikzarium_extensions::primitives::Evidence::Confirmed;
        ui.small(format!(
            "Требуемые пакеты: {}; библиотеки: {}; подключение {}",
            info.requirements.packages.join(", "),
            if info.requirements.libraries.is_empty() {
                "core".into()
            } else {
                info.requirements.libraries.join(", ")
            },
            evidence_label(import_state)
        ));
        let source_locations = confirmed_import_lines(source, tool);
        if !source_locations.is_empty() {
            ui.small("Явные подключения C/N2 · открыть код (не проверка установки):");
            ui.horizontal_wrapped(|ui| {
                for (kind, name, line) in source_locations {
                    let label = match kind {
                        ImportKind::Package => "Пакет",
                        ImportKind::TikzLibrary => "Библиотека",
                    };
                    if ui
                        .small_button(format!("{label} {name} · стр. {line}"))
                        .on_hover_text(
                            "Проверенная C/N2 строка исходника; выделение всей строки. Не установка TeX-пакета и не доказательство успешной компиляции.",
                        )
                        .clicked()
                    {
                        jump = Some(line);
                        session.status =
                            format!("Строка {line}: прямое подключение {name} в исходнике");
                    }
                }
            });
        }
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
                    {
                        match session.add_dependencies(source, tool) {
                            Ok(line) => jump = Some(line),
                            Err(error) => session.status = error,
                        }
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
    jump
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn inspector_undo_button_uses_real_egui_pointer_and_focuses_source() {
        fn frame(
            ctx: &egui::Context,
            session: &mut Session,
            source: &mut String,
            events: Vec<egui::Event>,
            mut rect: Option<&mut Rect>,
        ) -> Option<usize> {
            let mut jump = None;
            let _output = ctx.run(
                egui::RawInput {
                    screen_rect: Some(Rect::from_min_size(
                        Pos2::ZERO,
                        Vec2::new(260.0, 360.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        jump = show_inspector_action_bar_frame(
                            ui,
                            session,
                            source,
                            rect.as_deref_mut(),
                        );
                    });
                },
            );
            jump
        }

        let ctx = egui::Context::default();
        let mut source = EVENT_SOURCE.to_owned();
        let original = source.clone();
        let mut session = Session::default();
        session.reset(&source);
        session
            .insert(&mut source, Tool::Circle, Draft::for_tool(Tool::Circle))
            .unwrap();
        let inserted = source.clone();
        session.draft.values.insert("radius".into(), "2cm".into());
        session.apply_parameters(&mut source).unwrap();
        assert_ne!(source, inserted);
        let mut undo_button = Rect::NOTHING;
        frame(&ctx, &mut session, &mut source, vec![], Some(&mut undo_button));
        assert!(undo_button.width() > 0.0 && undo_button.height() > 0.0);
        let at = undo_button.center();
        frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerMoved(at), primary(at, true)],
            None,
        );
        let jump = frame(&ctx, &mut session, &mut source, vec![primary(at, false)], None);
        assert_eq!(source, inserted);
        assert_eq!(jump, Some(tikz_authoring::owned(&source)[0].line));
        assert!(session.undo_available());
        // Another real button click removes the authored command and focuses
        // the insertion line, leaving opaque source bytes entirely unchanged.
        frame(&ctx, &mut session, &mut source, vec![], None);
        frame(
            &ctx,
            &mut session,
            &mut source,
            vec![primary(at, true)],
            None,
        );
        let deletion_line =
            frame(&ctx, &mut session, &mut source, vec![primary(at, false)], None)
                .expect("second Undo must focus the deletion site");
        assert_eq!(source, original);
        assert_eq!(
            deletion_line,
            original.lines().position(|line| line == r"\\end{tikzpicture}").unwrap() + 1
        );
        assert!(!session.undo_available());
        source.push_str("% ручной код после Undo\\n");
        session.note_manual_source_edit(&source);
        let hand_edited = source.clone();
        let no_jump = frame(
            &ctx,
            &mut session,
            &mut source,
            vec![primary(at, true), primary(at, false)],
            None,
        );
        assert!(no_jump.is_none());
        assert_eq!(source, hand_edited);
    }

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
    fn c_n2_project_load_status_is_three_way_in_the_inspector() {
        use tikzarium_extensions::project_imports::{ImportKind, inspect};
        let cases = [
            (
                "\\documentclass{article}\n\\usepackage{tikz}\n\\begin{document}\n",
                Evidence::Confirmed,
                "CONFIRMED",
            ),
            (
                "\\documentclass{article}\n\\begin{document}\n",
                Evidence::Absent,
                "ABSENT",
            ),
            (
                "\\documentclass{article}\n\\myOpaquePreamble\n\\begin{document}\n",
                Evidence::Unknown,
                "UNKNOWN",
            ),
        ];
        for (source, expected, label) in cases {
            let state = inspect(source).status(ImportKind::Package, "tikz");
            assert_eq!(state, expected);
            assert_eq!(evidence_label(state), label);
            let capabilities = Capabilities {
                installed: true,
                loaded: state,
                engine_compatible: true,
                implemented: true,
            };
            let explanation = capabilities.explanation();
            if state != Evidence::Confirmed {
                assert!(explanation.contains(label));
            }
        }
    }
    #[test]
    fn c_n2_verified_import_links_use_exact_utf8_source_sites_and_keep_source_unchanged() {
        let source = concat!(
            "\u{feff}\\documentclass{standalone}\r\n",
            "% русская строка\r\n",
            "  \\usepackage[demo]{foo, tikz} % Cyrillic: подключено\r\n",
            "  \\usetikzlibrary{arrows.meta,calc} % ещё библиотека\r\n",
            "\\newcommand{\\myUnknown}{a}\r\n",
            "\\begin{document}\r\n"
        );
        let original = source.to_owned();
        assert_eq!(
            confirmed_import_lines(source, Tool::Arrow),
            vec![
                (ImportKind::Package, "tikz".into(), 3),
                (ImportKind::TikzLibrary, "arrows.meta".into(), 4),
            ]
        );
        assert_eq!(
            confirmed_import_lines(source, Tool::Line),
            vec![(ImportKind::Package, "tikz".into(), 3)]
        );
        assert_eq!(source, original);
        // A macro before the literal imports makes their provenance UNKNOWN.
        let opaque = source.replace("% русская строка\r\n", "\\myUnexpandedPackageMacro\r\n");
        assert!(confirmed_import_lines(&opaque, Tool::Arrow).is_empty());
        // No fabricated positive site for an invalid pre-class package.
        let preclass = "\\usepackage{tikz}\n\\documentclass{article}\n\\begin{document}\n";
        assert!(confirmed_import_lines(preclass, Tool::Line).is_empty());
    }

    #[test]
    fn c_n2_duplicate_import_sites_remain_individually_selectable() {
        let source = concat!(
            "\\documentclass{standalone}\n",
            "\\usepackage{tikz}\n",
            "\\usepackage{tikz}\n",
            "\\begin{document}\n",
        );
        assert_eq!(
            confirmed_import_lines(source, Tool::Line),
            vec![
                (ImportKind::Package, "tikz".into(), 2),
                (ImportKind::Package, "tikz".into(), 3),
            ]
        );
    }

    #[test]
    fn gesture_mapping_uses_explicit_cm_not_fake_pdf_coordinates() {
        let rect = Rect::from_min_size(Pos2::new(0.0, 0.0), Vec2::new(300.0, 170.0));
        let point = Point::new(1.25, 2.5);
        assert_eq!(snap(screen_point(rect, point), rect), point);
    }
    const EVENT_SOURCE: &str = r"\documentclass{standalone}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
\begin{document}
\begin{tikzpicture}
% пользовательский непрозрачный материал
\myOpaqueMacro{a_b}
\end{tikzpicture}
\end{document}
";

    const READY: Capabilities = Capabilities {
        installed: true,
        loaded: Evidence::Confirmed,
        engine_compatible: true,
        implemented: true,
    };

    // Input frames, hit-testing, and Response transitions are executed by
    // the real egui Context; these are not fabricated drag flags.
    fn event_frame(
        ctx: &egui::Context,
        session: &mut Session,
        source: &mut String,
        events: Vec<egui::Event>,
    ) -> (Option<usize>, Rect) {
        event_frame_mod(ctx, session, source, events, egui::Modifiers::default())
    }

    fn event_frame_mod(
        ctx: &egui::Context,
        session: &mut Session,
        source: &mut String,
        events: Vec<egui::Event>,
        modifiers: egui::Modifiers,
    ) -> (Option<usize>, Rect) {
        event_frame_mod_with_palette(ctx, session, source, events, modifiers, None, 820.0)
    }

    fn event_frame_mod_with_palette(
        ctx: &egui::Context,
        session: &mut Session,
        source: &mut String,
        events: Vec<egui::Event>,
        modifiers: egui::Modifiers,
        mut palette_rects: Option<&mut [Rect; 6]>,
        viewport_width: f32,
    ) -> (Option<usize>, Rect) {
        let mut observed = None;
        let mut guide_rect = Rect::NOTHING;
        let _output = ctx.run(
            egui::RawInput {
                screen_rect: Some(Rect::from_min_size(
                    Pos2::ZERO,
                    Vec2::new(viewport_width, 480.0),
                )),
                modifiers,
                events,
                ..Default::default()
            },
            |ctx| {
                handle_help_shortcut(ctx, session);
                egui::CentralPanel::default().show(ctx, |ui| {
                    (observed, guide_rect) = show_guide_frame_with_palette(
                        ui,
                        session,
                        source,
                        READY,
                        palette_rects.as_deref_mut(),
                    );
                });
            },
        );
        (observed, guide_rect)
    }

    fn primary(pos: Pos2, pressed: bool) -> egui::Event {
        egui::Event::PointerButton {
            pos,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: egui::Modifiers::default(),
        }
    }

    #[test]
    fn actual_palette_click_then_six_gestures_source_help_reopen_parameter_and_undo() {
        // No pre-selected Session tool: hit the real egui palette responses,
        // measured from the exact frame layout at narrow and wide widths.
        for viewport_width in [820.0, 1366.0] {
            for (index, tool) in TOOLS.into_iter().enumerate() {
                let ctx = egui::Context::default();
                let mut source = EVENT_SOURCE.to_owned();
                let original = source.clone();
                let mut session = Session::default();
                session.reset(&source);
                let mut buttons = [Rect::NOTHING; 6];
                event_frame_mod_with_palette(
                    &ctx,
                    &mut session,
                    &mut source,
                    vec![],
                    egui::Modifiers::default(),
                    Some(&mut buttons),
                    viewport_width,
                );
                assert!(
                    buttons
                        .iter()
                        .all(|rect| rect.width() > 0.0 && rect.height() > 0.0)
                );
                let at = buttons[index].center();
                event_frame_mod_with_palette(
                    &ctx,
                    &mut session,
                    &mut source,
                    vec![egui::Event::PointerMoved(at), primary(at, true)],
                    egui::Modifiers::default(),
                    None,
                    viewport_width,
                );
                event_frame_mod_with_palette(
                    &ctx,
                    &mut session,
                    &mut source,
                    vec![primary(at, false)],
                    egui::Modifiers::default(),
                    None,
                    viewport_width,
                );
                assert_eq!(session.active, Some(tool), "{tool:?}: palette click missed");
                assert!(session.help, "{tool:?}: catalogue help was not enabled");
                assert_eq!(source, original, "{tool:?}: palette selection edited TeX");
                event_frame_mod_with_palette(
                    &ctx,
                    &mut session,
                    &mut source,
                    vec![egui::Event::Key {
                        key: egui::Key::F1,
                        physical_key: None,
                        pressed: true,
                        repeat: false,
                        modifiers: egui::Modifiers::default(),
                    }],
                    egui::Modifiers::default(),
                    None,
                    viewport_width,
                );
                assert!(!session.help, "{tool:?}: F1 did not toggle contextual help");
                assert_eq!(source, original);
                let (_, guide) = event_frame_mod_with_palette(
                    &ctx,
                    &mut session,
                    &mut source,
                    vec![],
                    egui::Modifiers::default(),
                    None,
                    viewport_width,
                );
                let start = screen_point(guide, Point::new(1.0, 1.0));
                let end = screen_point(guide, Point::new(3.0, 2.0));
                event_frame_mod_with_palette(
                    &ctx,
                    &mut session,
                    &mut source,
                    vec![egui::Event::PointerMoved(start), primary(start, true)],
                    egui::Modifiers::default(),
                    None,
                    viewport_width,
                );
                event_frame_mod_with_palette(
                    &ctx,
                    &mut session,
                    &mut source,
                    vec![egui::Event::PointerMoved(end)],
                    egui::Modifiers::default(),
                    None,
                    viewport_width,
                );
                let (jump, _) = event_frame_mod_with_palette(
                    &ctx,
                    &mut session,
                    &mut source,
                    vec![primary(end, false)],
                    egui::Modifiers::default(),
                    None,
                    viewport_width,
                );
                let line = jump.expect("gesture must focus its new source line");
                assert_eq!(session.selected, Some(1));
                let items = tikz_authoring::owned(&source);
                assert_eq!(items.len(), 1);
                assert_eq!(items[0].tool, tool);
                assert_eq!(items[0].line, line);
                assert!(source.contains(r"\myOpaqueMacro{a_b}"));
                let tmp = tempfile::tempdir().unwrap();
                let tex = tmp.path().join("native-gesture.tex");
                std::fs::write(&tex, &source).unwrap();
                let mut reopened_source = std::fs::read_to_string(&tex).unwrap();
                assert_eq!(reopened_source, source);
                let mut reopened = Session::default();
                reopened.reset(&reopened_source);
                assert_eq!(reopened.choose(&reopened_source, 1).unwrap(), line);
                let parameter = match tool {
                    Tool::Circle => "radius",
                    Tool::Node => "x",
                    _ => "start_x",
                };
                reopened
                    .draft
                    .values
                    .insert(parameter.into(), "1.75cm".into());
                reopened.apply_parameters(&mut reopened_source).unwrap();
                assert_ne!(reopened_source, source);
                reopened.undo(&mut reopened_source).unwrap();
                assert_eq!(reopened_source, source);
                session.undo(&mut source).unwrap();
                assert_eq!(source, original, "{tool:?}: source Undo damaged opaque TeX");
            }
        }
    }

    #[test]
    fn actual_egui_pointer_frames_create_six_c_catalogue_commands_and_preserve_source() {
        for tool in TOOLS {
            let ctx = egui::Context::default();
            let mut source = EVENT_SOURCE.to_owned();
            let mut session = Session::default();
            session.reset(&source);
            session.select_tool(tool);
            let (_, rect) = event_frame(&ctx, &mut session, &mut source, vec![]);
            assert!(rect.width() > 300.0);
            let start = screen_point(rect, Point::new(1.0, 1.0));
            let end = screen_point(rect, Point::new(3.0, 2.0));
            let _ = event_frame(
                &ctx,
                &mut session,
                &mut source,
                vec![egui::Event::PointerMoved(start), primary(start, true)],
            );
            let _ = event_frame(
                &ctx,
                &mut session,
                &mut source,
                vec![egui::Event::PointerMoved(end)],
            );
            let (jump, _) = event_frame(&ctx, &mut session, &mut source, vec![primary(end, false)]);
            assert!(
                jump.is_some(),
                "{tool:?} did not commit through egui Response"
            );
            assert_eq!(session.selected, Some(1));
            let items = tikz_authoring::owned(&source);
            assert_eq!(items.len(), 1, "{tool:?}");
            assert_eq!(items[0].tool, tool);
            let expected = tikz_authoring::command(tool, &items[0].draft).unwrap();
            assert!(source.contains(&expected));
            assert!(source.contains("% пользовательский непрозрачный материал"));
            assert!(source.contains(r"\myOpaqueMacro{a_b}"));
            let jump_start =
                crate::ui_state::line_start_char_index(&source, jump.unwrap()).unwrap();
            let source_chars: String = source.chars().skip(jump_start).take(16).collect();
            assert!(
                source_chars.starts_with("  \\"),
                "{tool:?}: {source_chars:?}"
            );

            let temp = tempfile::tempdir().unwrap();
            let file = temp.path().join("gesture.tex");
            std::fs::write(&file, &source).unwrap();
            let disk = std::fs::read_to_string(&file).unwrap();
            assert_eq!(disk, source);
            let mut reopened = Session::default();
            reopened.reset(&disk);
            assert_eq!(reopened.choose(&disk, 1).unwrap(), jump.unwrap());
            assert_eq!(reopened.draft, items[0].draft);
            if tool == Tool::Circle {
                let prior = source.clone();
                reopened.draft.values.insert("radius".into(), "2cm".into());
                reopened.apply_parameters(&mut source).unwrap();
                assert!(source.contains("radius=2cm"));
                reopened.undo(&mut source).unwrap();
                assert_eq!(source, prior);
            }

            // A manual edit in the real TextEdit must revoke these patches,
            // even if the owned TikZ command itself remains byte-exact.
            source.push_str("% ручная правка вне сгенерированной команды\n");
            let hand_edited = source.clone();
            session.note_manual_source_edit(&source);
            assert_eq!(session.selected, None);
            assert!(!session.undo_available());
            assert!(session.undo(&mut source).is_err());
            assert_eq!(source, hand_edited);
        }
    }

    #[test]
    fn actual_egui_click_and_f1_are_distinct_from_drag_and_pdf_preview() {
        let ctx = egui::Context::default();
        let mut source = EVENT_SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        session.select_tool(Tool::Node);
        let (_, rect) = event_frame(&ctx, &mut session, &mut source, vec![]);
        let at = screen_point(rect, Point::new(1.0, 1.0));
        let _ = event_frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerMoved(at), primary(at, true)],
        );
        let (jump, _) = event_frame(&ctx, &mut session, &mut source, vec![primary(at, false)]);
        assert!(jump.is_some(), "click did not insert a node through egui");
        assert_eq!(tikz_authoring::owned(&source).len(), 1);
        let prior = session.help;
        let _ = event_frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::Key {
                key: egui::Key::F1,
                physical_key: None,
                pressed: true,
                repeat: false,
                modifiers: egui::Modifiers::default(),
            }],
        );
        assert_ne!(
            session.help, prior,
            "F1 did not reach the production handler"
        );
        assert!(source.contains(r"\myOpaqueMacro{a_b}"));
    }

    #[test]
    fn escape_cancels_real_egui_drag_without_source_patch_then_allows_next_gesture() {
        for tool in TOOLS {
            let ctx = egui::Context::default();
            let mut source = EVENT_SOURCE.to_owned();
            let original = source.clone();
            let mut session = Session::default();
            session.reset(&source);
            session.select_tool(tool);
            let (_, rect) = event_frame(&ctx, &mut session, &mut source, vec![]);
            let start = screen_point(rect, Point::new(1.0, 1.0));
            let end = screen_point(rect, Point::new(3.0, 2.0));
            let _ = event_frame(
                &ctx,
                &mut session,
                &mut source,
                vec![egui::Event::PointerMoved(start), primary(start, true)],
            );
            let _ = event_frame(
                &ctx,
                &mut session,
                &mut source,
                vec![egui::Event::PointerMoved(end)],
            );
            assert!(session.drag_start.is_some(), "{tool:?}: no active drag");
            let (cancelled, _) = event_frame(
                &ctx,
                &mut session,
                &mut source,
                vec![egui::Event::Key {
                    key: egui::Key::Escape,
                    physical_key: None,
                    pressed: true,
                    repeat: false,
                    modifiers: egui::Modifiers::default(),
                }],
            );
            assert_eq!(cancelled, None);
            assert!(session.drag_start.is_none());
            let (released, _) =
                event_frame(&ctx, &mut session, &mut source, vec![primary(end, false)]);
            assert_eq!(released, None, "{tool:?}: cancelled drag inserted source");
            assert_eq!(source, original);
            assert!(!session.undo_available());
            // The next ordinary pointer gesture must still work.
            let _ = event_frame(&ctx, &mut session, &mut source, vec![]);
            let _ = event_frame(
                &ctx,
                &mut session,
                &mut source,
                vec![egui::Event::PointerMoved(start), primary(start, true)],
            );
            let _ = event_frame(
                &ctx,
                &mut session,
                &mut source,
                vec![egui::Event::PointerMoved(end)],
            );
            let (inserted, _) =
                event_frame(&ctx, &mut session, &mut source, vec![primary(end, false)]);
            assert!(inserted.is_some(), "{tool:?}: next gesture was blocked");
            assert_eq!(tikz_authoring::owned(&source).len(), 1);
            session.undo(&mut source).unwrap();
            assert_eq!(source, original);
        }
    }

    #[test]
    fn arrow_gesture_requires_explicit_c_n2_import_then_undoes_both_transactions() {
        let ctx = egui::Context::default();
        let mut source = EVENT_SOURCE.replace("\\usetikzlibrary{arrows.meta}\n", "");
        let original = source.clone();
        let mut session = Session::default();
        session.reset(&source);
        session.select_tool(Tool::Arrow);
        let (_, rect) = event_frame(&ctx, &mut session, &mut source, vec![]);
        let start = screen_point(rect, Point::new(1.0, 1.0));
        let end = screen_point(rect, Point::new(3.0, 2.0));
        let _ = event_frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerMoved(start), primary(start, true)],
        );
        let _ = event_frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerMoved(end)],
        );
        let (disabled_jump, _) =
            event_frame(&ctx, &mut session, &mut source, vec![primary(end, false)]);
        assert_eq!(disabled_jump, None);
        assert_eq!(source, original);
        assert!(
            Session::propose_dependencies(&source, Tool::Arrow)
                .unwrap()
                .contains("+ \\usetikzlibrary{arrows.meta}")
        );
        let import_line = session.add_dependencies(&mut source, Tool::Arrow).unwrap();
        assert!(import_line > 0);
        assert!(source.contains("\\usetikzlibrary{arrows.meta}"));
        assert!(session.undo_available());

        let (_, rect) = event_frame(&ctx, &mut session, &mut source, vec![]);
        let start = screen_point(rect, Point::new(1.0, 1.0));
        let end = screen_point(rect, Point::new(3.0, 2.0));
        let _ = event_frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerMoved(start), primary(start, true)],
        );
        let _ = event_frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerMoved(end)],
        );
        let (jump, _) = event_frame(&ctx, &mut session, &mut source, vec![primary(end, false)]);
        assert!(jump.is_some());
        assert_eq!(tikz_authoring::owned(&source).len(), 1);
        session.undo(&mut source).unwrap();
        assert_eq!(tikz_authoring::owned(&source).len(), 0);
        session.undo(&mut source).unwrap();
        assert_eq!(source, original);
    }

    fn actual_source_textedit_frame(
        ctx: &egui::Context,
        session: &mut Session,
        source: &mut String,
        events: Vec<egui::Event>,
        request_focus: bool,
    ) {
        let _ = ctx.run(
            egui::RawInput {
                screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(820.0, 480.0))),
                events,
                ..Default::default()
            },
            |ctx| {
                egui::CentralPanel::default().show(ctx, |ui| {
                    let response =
                        ui.add(egui::TextEdit::multiline(&mut *source).desired_width(600.0));
                    if request_focus {
                        response.request_focus();
                    }
                    observe_source_text_edit(&response, session, source);
                });
            },
        );
    }

    #[test]
    fn actual_egui_textedit_typing_revokes_old_visual_undo_immediately() {
        let ctx = egui::Context::default();
        let mut source = EVENT_SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        session
            .insert(&mut source, Tool::Line, Draft::for_tool(Tool::Line))
            .unwrap();
        assert!(session.undo_available());
        assert_eq!(session.selected, Some(1));
        let previous = source.clone();
        actual_source_textedit_frame(&ctx, &mut session, &mut source, vec![], true);
        actual_source_textedit_frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::Text("проверка".into())],
            false,
        );
        assert_ne!(
            source, previous,
            "egui TextEdit did not process the text event"
        );
        assert!(source.contains("проверка"));
        assert!(!session.undo_available());
        assert_eq!(session.selected, None);
        assert!(source.contains(r"\myOpaqueMacro{a_b}"));
        let edited = source.clone();
        assert!(session.undo(&mut source).is_err());
        assert_eq!(source, edited);
    }

    #[test]
    fn alt_pointer_event_selects_existing_marker_for_c_patch_and_undo() {
        let ctx = egui::Context::default();
        let mut source = EVENT_SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        let draft = Draft::from_gesture(
            Tool::Line,
            Point::new(1.0, 1.0),
            Point::new(2.0, 1.5),
            &Draft::for_tool(Tool::Line),
        );
        let line = session.insert(&mut source, Tool::Line, draft).unwrap();
        let other = Draft::from_gesture(
            Tool::Circle,
            Point::new(4.0, 2.0),
            Point::new(5.0, 2.0),
            &Draft::for_tool(Tool::Circle),
        );
        session.insert(&mut source, Tool::Circle, other).unwrap();
        let original = source.clone();
        session.select_tool(Tool::Rectangle);
        let (_, rect) = event_frame(&ctx, &mut session, &mut source, vec![]);
        let pos = screen_point(rect, Point::new(1.0, 1.0));
        let alt = egui::Modifiers {
            alt: true,
            ..Default::default()
        };
        let event = |pressed| egui::Event::PointerButton {
            pos,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: alt,
        };
        event_frame_mod(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerMoved(pos), event(true)],
            alt,
        );
        let (selected, _) =
            event_frame_mod(&ctx, &mut session, &mut source, vec![event(false)], alt);
        assert_eq!(selected, Some(line));
        assert_eq!(source, original);
        assert_eq!(session.selected, Some(1));
        assert_eq!(session.active, Some(Tool::Line));
        session
            .draft
            .values
            .insert("start_x".into(), "1.25cm".into());
        session.apply_parameters(&mut source).unwrap();
        assert!(source.contains("1.25cm"));
        session.undo(&mut source).unwrap();
        assert_eq!(source, original);
        assert!(source.contains(r"\myOpaqueMacro{a_b}"));
    }

    #[test]
    fn alt_drag_cannot_insert_even_if_alt_is_released_before_mouse() {
        let ctx = egui::Context::default();
        let mut source = EVENT_SOURCE.to_owned();
        let original = source.clone();
        let mut session = Session::default();
        session.reset(&source);
        session.select_tool(Tool::Line);
        let (_, rect) = event_frame(&ctx, &mut session, &mut source, vec![]);
        let start = screen_point(rect, Point::new(1.0, 1.0));
        let end = screen_point(rect, Point::new(3.0, 2.0));
        let alt = egui::Modifiers {
            alt: true,
            ..Default::default()
        };
        let _ = event_frame_mod(
            &ctx,
            &mut session,
            &mut source,
            vec![
                egui::Event::PointerMoved(start),
                egui::Event::PointerButton {
                    pos: start,
                    button: egui::PointerButton::Primary,
                    pressed: true,
                    modifiers: alt,
                },
            ],
            alt,
        );
        let _ = event_frame_mod(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerMoved(end)],
            alt,
        );
        let _ = event_frame(&ctx, &mut session, &mut source, vec![]);
        let (jump, _) = event_frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerButton {
                pos: end,
                button: egui::PointerButton::Primary,
                pressed: false,
                modifiers: egui::Modifiers::default(),
            }],
        );
        assert_eq!(jump, None);
        assert_eq!(source, original);
        assert!(!session.alt_selection_capture);
        assert!(session.drag_start.is_none());

        // The same pointer can draw normally after the Alt capture is released.
        let _ = event_frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerMoved(start), primary(start, true)],
        );
        let _ = event_frame(
            &ctx,
            &mut session,
            &mut source,
            vec![egui::Event::PointerMoved(end)],
        );
        let (jump, _) = event_frame(&ctx, &mut session, &mut source, vec![primary(end, false)]);
        assert!(jump.is_some());
        assert_eq!(tikz_authoring::owned(&source).len(), 1);
    }

    #[test]
    fn overlapping_owned_anchors_refuse_guessed_selection() {
        let rect = Rect::from_min_size(Pos2::ZERO, Vec2::new(500.0, 170.0));
        let mut source = EVENT_SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        for tool in [Tool::Line, Tool::Circle] {
            let draft = Draft::from_gesture(
                tool,
                Point::new(1.0, 1.0),
                Point::new(2.0, 2.0),
                &Draft::for_tool(tool),
            );
            session.insert(&mut source, tool, draft).unwrap();
        }
        let before = source.clone();
        let marker = screen_point(rect, Point::new(1.0, 1.0));
        assert!(hit_authored_anchor(&source, rect, marker).is_err());
        assert_eq!(
            hit_authored_anchor(&source, rect, screen_point(rect, Point::new(5.0, 4.0))),
            Ok(None)
        );
        assert_eq!(source, before);
    }

    #[test]
    fn releasing_outside_guide_never_authors_unbounded_offscreen_coordinates() {
        let rect = Rect::from_min_size(Pos2::new(10.0, 20.0), Vec2::new(390.0, 170.0));
        let far = snap(Pos2::new(9000.0, -10000.0), rect);
        assert!(far.x <= (rect.width() - 2.0 * MARGIN) / SCALE + 0.25);
        assert!(far.y <= (rect.height() - 2.0 * MARGIN) / SCALE + 0.25);
        assert!(far.x >= 0.0 && far.y >= 0.0);
    }
}
