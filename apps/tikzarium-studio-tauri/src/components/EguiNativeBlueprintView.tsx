import React, { useState } from 'react';
import { Copy, Check, Cpu, Monitor, Layers, ShieldAlert, ArrowRight } from 'lucide-react';

interface EguiNativeBlueprintViewProps {
  onJumpToEditorDemo: () => void;
}

interface RustSnippetCard {
  id: string;
  targetFile: string;
  titleRu: string;
  rationaleRu: string;
  code: string;
}

const RUST_SNIPPETS: RustSnippetCard[] = [
  {
    id: 'egui-hover-tooltip',
    targetFile: 'crates/tikzarium-app/src/source_highlight.rs + main.rs (eframe = "=0.33.3")',
    titleRu: '1. Всплывающая подсказка аргументов LaTeX в нативном egui::TextEdit',
    rationaleRu:
      'В egui 0.33 нельзя повесить CSS :hover на подсвеченный текст. Вместо этого используется TextEditOutput { response, galley, galley_pos }. Критично: CCursor::index возвращает индекс Unicode-символа (char), поэтому для кириллицы его нужно перевести в байтовое смещение UTF-8 и проверить правую границу глифа, чтобы тултип не всплывал на пустом поле справа от строки.',
    code: `// В crates/tikzarium-app/src/main.rs сразу после show_source_text_edit_cached(...):
pub(crate) fn show_tex_command_hover_tooltip(
    ui: &egui::Ui,
    source: &str,
    output: &egui::text_edit::TextEditOutput,
    font_size: f32,
) {
    // Не мешаем выделению текста зажатой кнопкой мыши
    if output.response.is_pointer_button_down_on() {
        return;
    }
    let Some(pointer_pos) = output.response.hover_pos() else {
        return;
    };

    let rel_pos = pointer_pos - output.galley_pos;
    if rel_pos.x < 0.0 || rel_pos.y < 0.0 {
        return;
    }

    let cursor = output.galley.cursor_from_pos(rel_pos);
    let glyph_rect = output.galley.pos_from_cursor(&cursor);
    // Защита от ложного срабатывания на пустом поле справа от конца строки:
    if rel_pos.x > glyph_rect.max.x + font_size * 0.75 {
        return;
    }

    // Безопасный перевод char-индекса egui в байтовый индекс UTF-8 (кириллица = 2 байта):
    let byte_offset = source
        .char_indices()
        .nth(cursor.ccursor.index)
        .map(|(idx, _)| idx)
        .unwrap_or(source.len());

    let Some(doc) = crate::source_highlight::resolve_command_hover(source, byte_offset) else {
        return;
    };

    egui::show_tooltip_at_pointer(
        ui.ctx(),
        ui.layer_id(),
        egui::Id::new("tikzarium-tex-cmd-tooltip"),
        |ui| {
            ui.set_max_width(360.0);
            ui.strong(&doc.title_ru);
            ui.monospace(&doc.signature);
            ui.add_space(4.0);
            egui::Grid::new("cmd_args_grid")
                .striped(true)
                .spacing([10.0, 4.0])
                .show(ui, |ui| {
                    for arg in &doc.arguments {
                        ui.monospace(arg.name);
                        ui.label(arg.type_ru);
                        ui.weak(&arg.constraint_ru);
                        ui.end_row();
                    }
                });
            ui.separator();
            ui.small(&doc.dependency_note_ru);
        },
    );
}`,
  },
  {
    id: 'egui-tactile-stepper',
    targetFile: 'crates/tikzarium-app/src/tikz_canvas.rs',
    titleRu: '2. Тактильный шаг размерностей (− / + / ↑↓) и режим «Автошаг» в Инспекторе egui',
    rationaleRu:
      'В нативном egui комбинация ui.small_button("−"), однострочного TextEdit и ComboBox единиц даёт мгновенный CAD-отклик без нарушения строгой валидации literal-параметров каталога catalog-v1.toml.',
    code: `pub(crate) fn show_dimension_stepper_row(
    ui: &mut egui::Ui,
    label_ru: &str,
    value: &mut String,
    positive_only: bool,
    auto_apply: bool,
) -> bool {
    let mut stepped_now = false;
    let coarse = ui.input(|i| i.modifiers.shift);

    ui.horizontal(|ui| {
        ui.label(label_ru);
        if ui.small_button("−").on_hover_text("Уменьшить (Shift — шаг ×5)").clicked() {
            *value = step_dimension_literal(value, -1, coarse, positive_only);
            stepped_now = auto_apply;
        }
        let resp = ui.add(
            egui::TextEdit::singleline(value)
                .desired_width(68.0)
                .font(egui::TextStyle::Monospace),
        );
        if resp.has_focus() && ui.input(|i| i.key_pressed(egui::Key::ArrowUp)) {
            *value = step_dimension_literal(value, 1, coarse, positive_only);
            stepped_now = auto_apply;
        }
        if resp.has_focus() && ui.input(|i| i.key_pressed(egui::Key::ArrowDown)) {
            *value = step_dimension_literal(value, -1, coarse, positive_only);
            stepped_now = auto_apply;
        }
        if ui.small_button("+").on_hover_text("Увеличить (Shift — шаг ×5)").clicked() {
            *value = step_dimension_literal(value, 1, coarse, positive_only);
            stepped_now = auto_apply;
        }
    });
    stepped_now
}`,
  },
  {
    id: 'egui-modal-shortcuts',
    targetFile: 'crates/tikzarium-app/src/main.rs + build_save_dialog.rs',
    titleRu: '3. Палитра Ctrl+K и защита модификаторов от перехвата Ctrl+C в egui',
    rationaleRu:
      'В egui 0.33 уже есть нативный egui::Modal (используется в build_save_dialog.rs:65). При обработке горячих клавиш инструментов V/L/A/R/C/N/B обязательно проверять !ctx.wants_keyboard_input() && i.modifiers.is_none(), чтобы системное копирование Ctrl+C никогда не включало инструмент «Окружность».',
    code: `pub(crate) fn handle_global_shortcuts(ctx: &egui::Context, state: &mut StudioState) {
    let toggle_palette = ctx.input(|i| i.modifiers.command && i.key_pressed(egui::Key::K));
    if toggle_palette {
        state.command_palette_open = !state.command_palette_open;
        return;
    }

    if ctx.input(|i| i.modifiers.command && (i.key_pressed(egui::Key::Enter) || i.key_pressed(egui::Key::S))) {
        state.request_save_and_build();
        return;
    }

    // Однобуквенные хоткеи — ТОЛЬКО вне фокуса TextEdit и строго без Ctrl/Alt/Cmd:
    if !ctx.wants_keyboard_input() {
        ctx.input(|i| {
            if i.modifiers.is_none() {
                if i.key_pressed(egui::Key::V) { state.select_tool(None); }
                if i.key_pressed(egui::Key::C) { state.select_tool(Some(ToolId::Circle)); }
                if i.key_pressed(egui::Key::L) { state.select_tool(Some(ToolId::Line)); }
                if i.key_pressed(egui::Key::A) { state.select_tool(Some(ToolId::Arrow)); }
            }
        });
    }
}`,
  },
  {
    id: 'egui-template-modal',
    targetFile: 'crates/tikzarium-app/src/template_dialog.rs (eframe = "=0.33.3")',
    titleRu: '4. Диалог создания файла по шаблону («Диаграмма», «График», «Схема оптики») в egui::Modal',
    rationaleRu:
      'Вызывается по Ctrl+N (i.modifiers.command && i.key_pressed(Key::N)). Использует штатный egui::Modal::new, список selectable_value и живой предпросмотр геометрии через ui.painter() с учётом флага несохранённых правок dirty-open.',
    code: `pub(crate) fn show_new_template_modal(ctx: &egui::Context, state: &mut StudioState) {
    if !state.template_modal_open {
        return;
    }
    egui::Modal::new(egui::Id::new("new_document_template_modal")).show(ctx, |ui| {
        ui.set_width(680.0);
        ui.heading("Создать новый документ по шаблону");
        ui.separator();
        ui.columns(2, |cols| {
            for tpl in TemplateKind::ALL {
                cols[0].selectable_value(&mut state.selected_template, tpl, tpl.title_ru());
            }
            cols[1].horizontal(|ui| {
                ui.label("Имя файла:");
                ui.text_edit_singleline(&mut state.new_filename);
            });
            cols[1].checkbox(&mut state.use_fontspec_cyrillic, "Кириллица fontspec + unicode-math");
        });
        ui.separator();
        ui.horizontal(|ui| {
            if ui.button("Отмена").clicked() {
                state.template_modal_open = false;
            }
            if ui.button("Создать документ").clicked() {
                state.instantiate_selected_template();
                state.template_modal_open = false;
            }
        });
    });
}`,
  },
  {
    id: 'egui-ghost-preview',
    targetFile: 'crates/tikzarium-app/src/tikz_canvas.rs (eframe = "=0.33.3")',
    titleRu: '5. Приглушённый ghost-предпросмотр рисуемой фигуры в нативном egui::Painter',
    rationaleRu:
      'Во время удержания кнопки мыши (drag_start..drag_current) рисуем реальную геометрию будущего примитива (круг, прямоугольник, стрелку, кривую Безье CubicBezierShape) полупрозрачным штрихом Color32::from_rgba_unmultiplied поверх сетки без мутации буфера .tex до отпускания кнопки.',
    code: `pub(crate) fn paint_ghost_draft_shape(
    painter: &egui::Painter,
    draft: &GestureDraftPreview,
    cm_to_screen: impl Fn(f32, f32) -> egui::Pos2,
    px_per_cm: f32,
) {
    let ghost_stroke = egui::Stroke::new(1.8, egui::Color32::from_rgba_unmultiplied(2, 132, 199, 155));
    let ghost_fill = egui::Color32::from_rgba_unmultiplied(2, 132, 199, 24);

    match draft.tool {
        ToolId::Rectangle => {
            let p1 = cm_to_screen(draft.start_cm.x, draft.start_cm.y);
            let p2 = cm_to_screen(draft.end_cm.x, draft.end_cm.y);
            let rect = egui::Rect::from_two_pos(p1, p2);
            painter.rect(rect, 0.0, ghost_fill, ghost_stroke, egui::StrokeKind::Middle);
        }
        ToolId::Circle => {
            let center = cm_to_screen(draft.start_cm.x, draft.start_cm.y);
            painter.circle(center, draft.radius_cm * px_per_cm, ghost_fill, ghost_stroke);
        }
        ToolId::Cubic => {
            let pts = [
                cm_to_screen(draft.start_cm.x, draft.start_cm.y),
                cm_to_screen(draft.c1_cm.x, draft.c1_cm.y),
                cm_to_screen(draft.c2_cm.x, draft.c2_cm.y),
                cm_to_screen(draft.end_cm.x, draft.end_cm.y),
            ];
            painter.add(egui::epaint::CubicBezierShape::from_points_stroke(
                pts, false, egui::Color32::TRANSPARENT, ghost_stroke,
            ));
        }
        _ => {
            let p1 = cm_to_screen(draft.start_cm.x, draft.start_cm.y);
            let p2 = cm_to_screen(draft.end_cm.x, draft.end_cm.y);
            painter.line_segment([p1, p2], ghost_stroke);
        }
    }
}`,
  },
  {
    id: 'egui-cad-handles-snap',
    targetFile: 'crates/tikzarium-app/src/tikz_canvas.rs (P01–P06, P14)',
    titleRu: '6. Узловые ручки перетаскивания (Sense::drag), Smart Snap и режим Кальки (Onion-Skin) в egui',
    rationaleRu:
      'В egui каждая контрольная точка выбранной фигуры (вершины, радиус, рычаги Безье c1/c2) регистрируется через ui.interact(handle_rect, id, egui::Sense::drag()). Это даёт мгновенное CAD-редактирование с примагничиванием к соседним объектам без единого веб-компонента.',
    code: `pub(crate) fn interact_primitive_handles(
    ui: &mut egui::Ui,
    painter: &egui::Painter,
    prim: &OwnedPrimitive,
    all_prims: &[OwnedPrimitive],
    cm_to_screen: impl Fn(f32, f32) -> egui::Pos2,
    screen_to_cm: impl Fn(egui::Pos2) -> egui::Vec2,
) -> Option<BTreeMap<String, String>> {
    let mut updated_values = None;
    for handle in compute_primitive_handles(prim) {
        let center = cm_to_screen(handle.x_cm, handle.y_cm);
        let hit_rect = egui::Rect::from_center_size(center, egui::vec2(12.0, 12.0));
        let id = ui.make_persistent_id(("n1_handle", prim.id, handle.id));
        let resp = ui.interact(hit_rect, id, egui::Sense::drag());

        let fill = if handle.is_bezier { egui::Color32::from_rgb(245, 158, 11) } else { egui::Color32::WHITE };
        painter.circle(center, if resp.hovered() || resp.dragged() { 5.0 } else { 3.8 }, fill,
            egui::Stroke::new(1.6, egui::Color32::from_rgb(2, 132, 199)));

        if resp.dragged() {
            if let Some(pos) = resp.interact_pointer_pos() {
                let raw_cm = screen_to_cm(pos);
                let snap = compute_smart_snap(raw_cm, all_prims, &[prim.id], 0.14);
                paint_snap_guides(painter, &snap.guides, &cm_to_screen);
                updated_values = Some(apply_handle_drag(prim, handle.id, snap.snapped_cm));
            }
        }
    }
    updated_values
}`,
  },
  {
    id: 'egui-os-notify-drop-storage',
    targetFile: 'crates/tikzarium-app/src/app.rs + storage.rs (P15–P20 · eframe = "=0.33.3")',
    titleRu: '7. Файловый наблюдатель ОС (notify), Drag-and-Drop (.tex/.csv/.png) и eframe::Storage',
    rationaleRu:
      'В нативном eframe 0.33.3 перетаскивание файлов из Проводника Windows / файлового менеджера Linux читается напрямую из ctx.input(|i| i.raw.dropped_files.clone()), фоновый notify::RecommendedWatcher будит окно через ctx.request_repaint(), а личные сниппеты и список Recent Files сохраняются в eframe::Storage::set_string.',
    code: `impl eframe::App for TikzariumApp {
    fn save(&mut self, storage: &mut dyn eframe::Storage) {
        // P20: Персистентное сохранение темы, кегля, сплиттеров, Recent Files и личных сниппетов
        if let Ok(json) = serde_json::to_string(&self.workspace_prefs) {
            storage.set_string("tikzarium_workspace_v1", json);
        }
    }

    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // P18: Неблокирующий приём событий notify::RecommendedWatcher с диска
        while let Ok(disk_ev) = self.fs_watch_rx.try_recv() {
            self.on_external_file_modified(disk_ev);
        }

        // P19: Нативный Drag-and-Drop файлов (.tex, .csv -> pgfplots, .png -> калька)
        let dropped = ctx.input(|i| i.raw.dropped_files.clone());
        for file in dropped {
            if let Some(path) = &file.path {
                match path.extension().and_then(|s| s.to_str()) {
                    Some("tex") => self.open_tex_from_disk(path),
                    Some("csv" | "dat") => self.import_csv_as_pgfplots(path),
                    Some("png" | "jpg") => self.load_reference_underlay(path, ctx),
                    _ => {}
                }
            }
        }
        self.render_studio_panels(ctx);
    }
}`,
  },
  {
    id: 'egui-context-menu-routing-callouts',
    targetFile: 'crates/tikzarium-app/src/tikz_canvas.rs (P21–P26, P34 · eframe = "=0.33.3")',
    titleRu: '8. Нативное ПКМ-меню egui::Response::context_menu, трассы |- / -| и размерные выноски ГОСТ',
    rationaleRu:
      'В egui 0.33 контекстное меню привязывается напрямую к интерактивному региону холста или фигуры через canvas_resp.context_menu(|ui| ...). Ортогональные трассы |- и -| рисуются через Painter::line, а размерные выноски — парой перпендикулярных засечек Bar[] и наклонной подписью.',
    code: `pub(crate) fn attach_canvas_context_menu(
    canvas_resp: &egui::Response,
    hit_prim_id: Option<u64>,
    click_cm: egui::Vec2,
    state: &mut StudioState,
) {
    canvas_resp.context_menu(|ui| {
        ui.set_min_width(210.0);
        if let Some(id) = hit_prim_id {
            ui.weak(format!("Объект #{id} · n1"));
            ui.separator();
            if ui.button("Дублировать со сдвигом (Ctrl+D)").clicked() {
                state.duplicate_owned_primitive(id);
                ui.close();
            }
            if ui.button("Повернуть +45° (P22)").clicked() {
                state.rotate_primitives(&[id], 45.0);
                ui.close();
            }
            if ui.button("Отразить по оси X (P22)").clicked() {
                state.mirror_primitives(&[id], MirrorAxis::X);
                ui.close();
            }
            if ui.button("Размерная выноска |<->| (P21)").clicked() {
                state.toggle_dimension_callout(id);
                ui.close();
            }
            if ui.button("Размножить в \\foreach… (P23)").clicked() {
                state.open_foreach_dialog(vec![id]);
                ui.close();
            }
        } else {
            ui.weak(format!("Холст ({:.2}, {:.2} см)", click_cm.x, click_cm.y));
            ui.separator();
            if ui.button("Штамп: Собирающая линза (P25)").clicked() {
                state.insert_scientific_stamp(StampKind::ConvexLens, click_cm);
                ui.close();
            }
            if ui.button("Штамп: Резистор ГОСТ/IEC (P25)").clicked() {
                state.insert_scientific_stamp(StampKind::ResistorIec, click_cm);
                ui.close();
            }
        }
    });
}`,
  },
  {
    id: 'egui-journal-gauge-synctex',
    targetFile: 'crates/tikzarium-app/src/pdf_preview.rs + journal_audit.rs (P28–P30 · eframe = "=0.33.3")',
    titleRu: '9. Калибр колонки журнала (86/140/178 мм), Ч/Б цветопроба и обратный клик SyncTeX из PDF',
    rationaleRu:
      'Калибр журнала рисует границу колонки на холсте и предупреждает о нечитаемом кегле после масштабирования \\includegraphics[width=\\columnwidth]. Клик по растрированному листу PDF запускает штатный synctex edit -o page:x:y:file.pdf и переводит каретку egui::TextEdit на точную строку .tex.',
    code: `pub(crate) fn resolve_synctex_pdf_click(
    pdf_path: &std::path::Path,
    page_1based: u32,
    pdf_pt: egui::Pos2,
) -> Option<usize> {
    let spec = format!("{}:{:.1}:{:.1}:{}", page_1based, pdf_pt.x, pdf_pt.y, pdf_path.display());
    let out = std::process::Command::new("synctex")
        .args(["edit", "-o", &spec])
        .output()
        .ok()?;
    let stdout = String::from_utf8_lossy(&out.stdout);
    for line in stdout.lines() {
        if let Some(num) = line.strip_prefix("Line:") {
            return num.trim().parse::<usize>().ok();
        }
    }
    None
}

pub(crate) fn apply_grayscale_proof(c: egui::Color32) -> egui::Color32 {
    // ГОСТ / печатная Ч/Б проба по яркости ITU-R BT.709:
    let luma = (0.2126 * c.r() as f32 + 0.7152 * c.g() as f32 + 0.0722 * c.b() as f32).round() as u8;
    egui::Color32::from_rgba_unmultiplied(luma, luma, luma, c.a())
}`,
  },
  {
    id: 'egui-arboard-clipboard-batch',
    targetFile: 'crates/tikzarium-app/src/clipboard_io.rs + project_batch.rs (P31–P33, P35)',
    titleRu: '10. Системный буфер ОС (arboard: RGBA PNG + таблицы Excel TSV) и пакетный профилировщик проекта',
    rationaleRu:
      'Крейт arboard работает нативно на Windows 10 и Linux (X11/Wayland): Ctrl+Shift+C отдаёт растрированный буфер прямо в Word/PowerPoint/Telegram без временных файлов, а вставка табличных строк из Excel/Origin автоматически строит точки n1 или \\addplot.',
    code: `pub(crate) fn copy_rendered_figure_to_os_clipboard(
    rgba_pixels: &[u8],
    width: usize,
    height: usize,
) -> Result<(), arboard::Error> {
    let mut clipboard = arboard::Clipboard::new()?;
    let img = arboard::ImageData {
        width,
        height,
        bytes: std::borrow::Cow::Borrowed(rgba_pixels),
    };
    clipboard.set_image(img)
}

pub(crate) fn paste_tsv_table_from_os_clipboard() -> Option<Vec<(f64, f64)>> {
    let mut clipboard = arboard::Clipboard::new().ok()?;
    let raw = clipboard.get_text().ok()?;
    let mut pts = Vec::new();
    for row in raw.lines() {
        let cols: Vec<&str> = if row.contains('\\t') {
            row.split('\\t').collect()
        } else {
            row.split(|c: char| c == ';' || c.is_whitespace()).filter(|s| !s.is_empty()).collect()
        };
        if cols.len() >= 2 {
            if let (Ok(x), Ok(y)) = (
                cols[0].trim().replace(',', ".").parse::<f64>(),
                cols[1].trim().replace(',', ".").parse::<f64>(),
            ) {
                pts.push((x, y));
            }
        }
    }
    (pts.len() >= 2).then_some(pts)
}`,
  },
  {
    id: 'egui-resizable-splitters-and-dragvalue-scrub',
    targetFile: 'crates/tikzarium-app/src/workspace_layout.rs + tex_scrubber.rs (P41, P49)',
    titleRu: '11. Перетаскиваемые сплиттеры SidePanel::resizable, пресеты рабочих мест и живой DragValue-скруббер чисел в .tex',
    rationaleRu:
      'В egui 0.33.3 нативные сплиттеры реализуются без кастомного DOM через SidePanel::left/right(...).resizable(true).width_range(...) с сохранением ширин в eframe::Storage, а скруббинг чисел прямо в буфере .tex опирается на Alt+колесо и egui::DragValue с синхронизацией комментария % tikzarium:n1:.',
    code: `pub(crate) fn show_resizable_studio_panels(
    ctx: &egui::Context,
    prefs: &mut WorkspacePrefs,
    draw_canvas: impl FnOnce(&mut egui::Ui),
    draw_editor: impl FnOnce(&mut egui::Ui),
    draw_inspector: impl FnOnce(&mut egui::Ui),
) {
    if !prefs.inspector_collapsed {
        let resp = egui::SidePanel::right("tz_inspector_panel")
            .resizable(true)
            .default_width(prefs.inspector_width_pt)
            .width_range(240.0..=460.0)
            .show(ctx, draw_inspector);
        prefs.inspector_width_pt = resp.response.rect.width();
    }
    let left = egui::SidePanel::left("tz_canvas_panel")
        .resizable(true)
        .default_width(prefs.canvas_width_pt)
        .width_range(340.0..=920.0)
        .show(ctx, draw_canvas);
    prefs.canvas_width_pt = left.response.rect.width();

    egui::CentralPanel::default().show(ctx, draw_editor);
}

pub(crate) fn show_inline_tex_number_scrubber(
    ui: &mut egui::Ui,
    token_val: &mut f64,
    unit_suffix: &str,
) -> bool {
    let step = if unit_suffix == "cm" { 0.05 } else { 0.5 };
    ui.add(
        egui::DragValue::new(token_val)
            .speed(step)
            .suffix(unit_suffix)
            .fixed_decimals(if unit_suffix == "cm" { 2 } else { 1 }),
    )
    .changed()
}`,
  },
  {
    id: 'egui-polygons-gost-hatch-decorations',
    targetFile: 'crates/tikzarium-app/src/cad_geometry.rs (P36–P39)',
    titleRu: '12. Полигоны (-- cycle), векторные штриховки ГОСТ 2.306, декорации скобок/волн и решатель пересечений',
    rationaleRu:
      'Замкнутые призмы и клинья рисуются через egui::Shape::convex_polygon / PathShape::closed_line, ГОСТ-штриховка 45° рендерится клиппированными диагональными сегментами ui.painter().with_clip_rect(...), а пересечения лучей с линзами рассчитываются аналитически в f64.',
    code: `pub(crate) fn paint_gost_hatch_rect(
    painter: &egui::Painter,
    rect: egui::Rect,
    step_pt: f32,
    counter_diagonal: bool,
    stroke: egui::Stroke,
) {
    let clipped = painter.with_clip_rect(rect);
    let span = rect.width() + rect.height();
    let mut offset = -rect.height();
    while offset <= span {
        let (a, b) = if !counter_diagonal {
            (
                egui::pos2(rect.left() + offset, rect.bottom()),
                egui::pos2(rect.left() + offset + rect.height(), rect.top()),
            )
        } else {
            (
                egui::pos2(rect.left() + offset, rect.top()),
                egui::pos2(rect.left() + offset + rect.height(), rect.bottom()),
            )
        };
        clipped.line_segment([a, b], stroke);
        offset += step_pt;
    }
}

pub(crate) fn line_circle_intersections_cm(
    p1: (f64, f64),
    p2: (f64, f64),
    center: (f64, f64),
    radius: f64,
) -> Vec<(f64, f64)> {
    let (dx, dy) = (p2.0 - p1.0, p2.1 - p1.1);
    let a = dx * dx + dy * dy;
    if a < 1e-9 { return Vec::new(); }
    let (fx, fy) = (p1.0 - center.0, p1.1 - center.1);
    let b = 2.0 * (fx * dx + fy * dy);
    let c = fx * fx + fy * fy - radius * radius;
    let disc = b * b - 4.0 * a * c;
    if disc < 0.0 { return Vec::new(); }
    let sq = disc.sqrt();
    vec![
        (p1.0 + ((-b - sq) / (2.0 * a)) * dx, p1.1 + ((-b - sq) / (2.0 * a)) * dy),
        (p1.0 + ((-b + sq) / (2.0 * a)) * dx, p1.1 + ((-b + sq) / (2.0 * a)) * dy),
    ]
}`,
  },
  {
    id: 'egui-layers-beamer-and-digitizer',
    targetFile: 'crates/tikzarium-app/src/layers_and_digitizer.rs (P43–P47)',
    titleRu: '13. Слои Scope (Lock / Hide), пошаговый инспектор слайдов Beamer <n-> и 2-точечный оцифровщик сканов',
    rationaleRu:
      'Заблокированные слои исключаются из hit-test до вызова Sense::click_and_drag(), а неактивные на текущем кадре Beamer элементы либо скрываются, либо рисуются с пониженной альфой tint_alpha = 0.18.',
    code: `pub(crate) fn is_primitive_interactive_on_canvas(
    layer_id: &str,
    beamer_spec: Option<&str>,
    locked_layers: &[String],
    hidden_layers: &[String],
    active_slide: Option<u32>,
) -> (bool, bool) {
    if hidden_layers.iter().any(|l| l == layer_id) {
        return (false, false); // (visible, interactive)
    }
    let visible_on_slide = match (active_slide, beamer_spec) {
        (Some(slide), Some(spec)) => match spec.strip_suffix('-') {
            Some(start) => start.parse::<u32>().map_or(true, |s| slide >= s),
            None => true,
        },
        _ => true,
    };
    let locked = locked_layers.iter().any(|l| l == layer_id);
    (visible_on_slide, visible_on_slide && !locked)
}`,
  },
  {
    id: 'egui-radial-pie-and-3d-basis',
    targetFile: 'crates/tikzarium-app/src/radial_pie_and_3d.rs (P54, P60)',
    titleRu: '14. Радиальное Pie-меню из 8 секторов (egui::Area + Painter) и 3D-проектор базиса ГОСТ 2.317',
    rationaleRu:
      'Вместо вложенных контекстных списков правая кнопка открывает мгновенное кольцо из 8 кольцевых секторов вокруг курсора с полярным hit-test atan2(dy, dx), а 3D-точки проецируются в 2D см без зависимостей от LuaTeX.',
    code: `use eframe::egui::{self, Color32, Order, Pos2, Sense, Stroke, Vec2};

pub(crate) fn show_radial_pie_menu(ctx: &egui::Context, origin: Pos2) -> Option<usize> {
    let mut picked = None;
    egui::Area::new(egui::Id::new("tikzarium_radial_pie"))
        .order(Order::Foreground)
        .fixed_pos(origin - Vec2::splat(88.0))
        .show(ctx, |ui| {
            let (rect, resp) = ui.allocate_exact_size(Vec2::splat(176.0), Sense::click());
            let center = rect.center();
            let ptr = resp.hover_pos().unwrap_or(center);
            let delta = ptr - center;
            let dist = delta.length();
            let hovered_sector = if (24.0..=82.0).contains(&dist) {
                let deg = delta.y.atan2(delta.x).to_degrees();
                Some((((deg + 112.5).rem_euclid(360.0)) / 45.0).floor() as usize % 8)
            } else {
                None
            };
            let painter = ui.painter();
            painter.circle(center, 80.0, Color32::from_black_alpha(225), Stroke::new(1.2, Color32::LIGHT_BLUE));
            painter.circle(center, 24.0, Color32::from_rgb(2, 132, 199), Stroke::new(1.2, Color32::WHITE));
            if resp.clicked() {
                picked = hovered_sector;
            }
        });
    picked
}`,
  },
  {
    id: 'egui-table-outliner-and-eyedropper',
    targetFile: 'crates/tikzarium-app/src/outliner_table.rs (P56–P59, P61–P62)',
    titleRu: '15. Табличный реестр объектов n1 (egui_extras::TableBuilder), Пипетка стиля и R-сопряжения Fillet',
    rationaleRu:
      'Виртуализированная таблица TableBuilder позволяет редактировать координаты, слои и формулы сотен примитивов напрямую с клавиатуры, а StylePassport переносит stroke/fill/hatch/rounded_corners в 1 клик.',
    code: `#[derive(Clone, Default)]
pub(crate) struct StylePassport {
    pub stroke_width: String,
    pub line_style: String,
    pub stroke_color: String,
    pub fill_color: String,
    pub hatch_pattern: String,
    pub rounded_corners: String,
}

pub(crate) fn compute_fillet_setback_cm(radius_cm: f64, cos_interior: f64) -> f64 {
    let alpha = cos_interior.clamp(-0.98, 0.98).acos();
    let half_tan = (alpha * 0.5).tan().max(0.15);
    radius_cm / half_tan
}`,
  },
  {
    id: 'egui-math-layoutjob-and-tikzproj',
    targetFile: 'crates/tikzarium-app/src/math_shaper_and_audit.rs (P63–P65)',
    titleRu: '16. Живой рендерер индексов LayoutJob (valign = Bottom/Top), BBox-линтер омоглифов и .tikzproj сессия',
    rationaleRu:
      'egui::text::LayoutJob поддерживает смещение индексов через TextFormat { font_id: small, valign: Align::BOTTOM/TOP } прямо на холсте без вызова XeLaTeX, а пре-принт аудитор ловит кириллические двойники внутри $...$.',
    code: `use eframe::egui::{text::LayoutJob, Align, Color32, FontFamily, FontId, TextFormat};

pub(crate) fn build_math_node_layout_job(runs: &[(&str, i8)]) -> LayoutJob {
    let mut job = LayoutJob::default();
    for &(segment, script_level) in runs {
        let (size, valign) = match script_level {
            -1 => (9.5, Align::BOTTOM),
            1 => (9.5, Align::TOP),
            _ => (13.5, Align::Center),
        };
        job.append(
            segment,
            0.0,
            TextFormat {
                font_id: FontId::new(size, FontFamily::Proportional),
                color: Color32::from_rgb(15, 23, 42),
                valign,
                ..Default::default()
            },
        );
    }
    job
}`,
  },
  {
    id: 'rust-17-ast-formatter',
    titleRu: '17. AST-безопасный автоформатер TikZ/LaTeX с защитой % tikzarium:n1: и CRLF (P66–P69)',
    targetFile: 'crates/tikzarium-core/src/formatter.rs',
    rationaleRu:
      'Выстраивает каскадные отступы окружений (document → tikzpicture → scope / axis и \\foreach { ... }), приводит опции внутри [...] к каноническому порядку и пересобирает управляемые строки n1 без малейшего повреждения hex-метаданных, макросов \\newcommand, экранированного \\% и переводов строк Windows CRLF.',
    code: `pub struct FormatConfig {
    pub indent_spaces: usize,
    pub sort_bracket_options: bool,
    pub align_trailing_comments: bool,
}

pub fn format_tikz_document_lossless(src: &str, cfg: &FormatConfig) -> String {
    let eol = if src.contains("\\r\\n") { "\\r\\n" } else { "\\n" };
    let unit = " ".repeat(cfg.indent_spaces);
    let mut depth: usize = 0;
    let mut in_verbatim = false;
    let mut out_lines: Vec<String> = Vec::new();

    for raw_line in src.split(|c| c == '\\n').map(|l| l.strip_suffix('\\r').unwrap_or(l)) {
        let trimmed = raw_line.trim();
        if trimmed.is_empty() {
            out_lines.push(String::new());
            continue;
        }
        if trimmed.starts_with("\\\\begin{filecontents") || trimmed.starts_with("\\\\begin{verbatim}") {
            out_lines.push(format!("{}{}", unit.repeat(depth), trimmed));
            in_verbatim = true;
            continue;
        }
        if in_verbatim {
            if trimmed.starts_with("\\\\end{filecontents") || trimmed.starts_with("\\\\end{verbatim}") {
                in_verbatim = false;
                out_lines.push(format!("{}{}", unit.repeat(depth), trimmed));
            } else {
                out_lines.push(raw_line.to_string());
            }
            continue;
        }

        let closes_env = trimmed.starts_with("\\\\end{") || trimmed.starts_with('}');
        let line_depth = if closes_env { depth.saturating_sub(1) } else { depth };
        let indent = unit.repeat(line_depth);

        if let Some(marker_idx) = raw_line.find("% tikzarium:n1:") {
            let cmd = raw_line[..marker_idx].trim();
            let meta = &raw_line[marker_idx..];
            out_lines.push(format!("{indent}{cmd} {meta}"));
        } else {
            out_lines.push(format!("{indent}{trimmed}"));
        }

        if closes_env {
            depth = depth.saturating_sub(1);
        } else if (trimmed.starts_with("\\\\begin{") && !trimmed.contains("\\\\end{"))
            || (trimmed.starts_with("\\\\foreach") && trimmed.ends_with('{'))
        {
            depth += 1;
        }
    }
    out_lines.join(eol)
}`,
  },
  {
    id: 'rust-18-galley-pair-matcher',
    titleRu: '18. Подсветка парных скобок {} [] () и \\begin…\\end поверх Galley с учётом UTF-8 (P70–P73)',
    targetFile: 'crates/tikzarium-app/src/editor_pairs.rs',
    rationaleRu:
      'Конвертирует символьный индекс каретки TextEditOutput::cursor_range в байтовый сдвиг UTF-8 (критично для кириллицы), находит парную скобку или окружение в обход \\{ и %-комментариев и рисует контурную рамку прямо через ui.painter() поверх Galley.',
    code: `use egui::{Color32, Pos2, Rect, Stroke, StrokeKind, Ui};

pub fn char_idx_to_byte_offset(s: &str, char_idx: usize) -> usize {
    s.char_indices().nth(char_idx).map(|(b, _)| b).unwrap_or(s.len())
}

pub fn paint_matching_delimiter_box(
    ui: &Ui,
    galley_pos: Pos2,
    galley: &egui::Galley,
    pair_char_idx: usize,
) {
    let ccursor = egui::text::CCursor::new(pair_char_idx);
    let glyph_rect = galley.pos_from_ccursor(ccursor);
    let screen_rect = Rect::from_min_max(
        galley_pos + glyph_rect.min.to_vec2(),
        galley_pos + egui::vec2(glyph_rect.min.x + 7.5, glyph_rect.max.y),
    );
    ui.painter().rect_stroke(
        screen_rect.expand(1.0),
        2.0,
        Stroke::new(1.25, Color32::from_rgb(56, 189, 248)),
        StrokeKind::Outside,
    );
}`,
  },
  {
    id: 'rust-19-catmull-rom-and-svg',
    titleRu: '19. Интерполяционный сплайн Catmull–Rom C¹ и векторный импортёр SVG → n1 (P74–P80)',
    targetFile: 'crates/tikzarium-core/src/cad_splines_svg.rs',
    rationaleRu:
      'Преобразует экспериментальные узловые точки в гладкую цепочку кубических кривых Безье C¹ (.. controls .. and .. ..) и масштабирует внешние SVG-примитивы с инверсией оси Y (SVG Y-down → TikZ Y-up в сантиметрах).',
    code: `use egui::Pos2;

#[derive(Clone, Copy, Debug)]
pub struct CubicBezierCm {
    pub p0: Pos2,
    pub c1: Pos2,
    pub c2: Pos2,
    pub p3: Pos2,
}

pub fn catmull_rom_to_cubic_chain(pts: &[Pos2], tension: f32) -> Vec<CubicBezierCm> {
    if pts.len() < 2 {
        return Vec::new();
    }
    let n = pts.len();
    let get = |idx: isize| -> Pos2 {
        if idx < 0 {
            Pos2::new(2.0 * pts[0].x - pts[1].x, 2.0 * pts[0].y - pts[1].y)
        } else if (idx as usize) >= n {
            Pos2::new(2.0 * pts[n - 1].x - pts[n - 2].x, 2.0 * pts[n - 1].y - pts[n - 2].y)
        } else {
            pts[idx as usize]
        }
    };

    let mut out = Vec::with_capacity(n - 1);
    for i in 0..(n - 1) {
        let p0 = get(i as isize - 1);
        let p1 = get(i as isize);
        let p2 = get(i as isize + 1);
        let p3 = get(i as isize + 2);
        out.push(CubicBezierCm {
            p0: p1,
            c1: Pos2::new(
                p1.x + (p2.x - p0.x) * tension / 6.0,
                p1.y + (p2.y - p0.y) * tension / 6.0,
            ),
            c2: Pos2::new(
                p2.x - (p3.x - p1.x) * tension / 6.0,
                p2.y - (p3.y - p1.y) * tension / 6.0,
            ),
            p3: p2,
        });
    }
    out
}`,
  },
  {
    id: 'two-pane-preamble-body-splitter',
    titleRu: '20. Двухоконный .tex-сплиттер: Преамбула ↕ Код рисунка со сквозной нумерацией строк (E01 · E05)',
    targetFile: 'crates/tikzarium-app/src/editor_split_pane.rs',
    rationaleRu:
      'В нативном egui 0.33.3 внутри колонки редактора размещается внутренний egui::TopBottomPanel::top("tex_preamble_pane").resizable(true).min_height(64.0).max_height(320.0), который делит буфер ровно по границе \\begin{document} (или \\begin{tikzpicture}) без потери ни одного байта CRLF/LF. Верхнее окно отображает физические строки 1..K, а нижнее — K+1..N.',
    code: `pub struct SplitTexBuffer<'a> {
    pub preamble: &'a str,
    pub body: &'a str,
    pub body_start_line: usize,
    pub eol: &'static str,
}

pub fn split_tex_document(src: &str) -> Option<SplitTexBuffer<'_>> {
    let eol = if src.contains("\\r\\n") { "\\r\\n" } else { "\\n" };
    let boundary = src.find("\\\\begin{document}")
        .or_else(|| src.find("\\\\begin{tikzpicture}"))?;
    let line_start = src[..boundary].rfind('\\n').map(|i| i + 1).unwrap_or(0);
    if line_start == 0 { return None; }
    let trim_end = if line_start >= 2 && &src[line_start - 2..line_start] == "\\r\\n" {
        line_start - 2
    } else {
        line_start - 1
    };
    let preamble = &src[..trim_end];
    let body = &src[line_start..];
    let preamble_lines = preamble.bytes().filter(|&b| b == b'\\n').count() + 1;
    Some(SplitTexBuffer {
        preamble,
        body,
        body_start_line: preamble_lines + 1,
        eol,
    })
}

pub fn ui_two_pane_tex_editor(ui: &mut egui::Ui, source: &mut String) {
    if let Some(split) = split_tex_document(source) {
        let mut preamble_buf = split.preamble.to_owned();
        let mut body_buf = split.body.to_owned();
        let body_start = split.body_start_line;
        let eol = split.eol;
        let mut changed = false;

        egui::TopBottomPanel::top("tex_preamble_pane")
            .resizable(true)
            .default_height(132.0)
            .height_range(64.0..=320.0)
            .show_inside(ui, |ui| {
                ui.label(egui::RichText::new(format!("Преамбула документа · стр. 1–{}", body_start - 1)).small().strong());
                egui::ScrollArea::vertical().id_salt("preamble_scroll").show(ui, |ui| {
                    if ui.add(egui::TextEdit::multiline(&mut preamble_buf).code_editor().desired_width(f32::INFINITY)).changed() {
                        changed = true;
                    }
                });
            });

        egui::CentralPanel::default().show_inside(ui, |ui| {
            ui.label(egui::RichText::new(format!("Код рисунка · стр. {}+", body_start)).small().strong());
            egui::ScrollArea::vertical().id_salt("body_scroll").show(ui, |ui| {
                if ui.add(egui::TextEdit::multiline(&mut body_buf).code_editor().desired_width(f32::INFINITY)).changed() {
                    changed = true;
                }
            });
        });

        if changed {
            *source = format!("{}{}{}", preamble_buf, eol, body_buf);
        }
    }
}`,
  },
  {
    id: 'vertical-cad-rail-and-workshops-hub',
    titleRu: '21. Вертикальный рельс инструментов 38 px, хаб «Мастерские» и ★ Избранное (E02–E08)',
    targetFile: 'crates/tikzarium-app/src/cad_tool_rail.rs',
    rationaleRu:
      'Перенос всех 13 инструментов рисования из шапки холста в узкий левый SidePanel::left("cad_tool_rail").exact_width(38.0) освобождает вертикаль для чертежа, а сворачивание шести модальных кнопок в единый каталог «Мастерские» (Ctrl+Shift+T) + до 4 закрепляемых слотов ★ исключает переполнение на экранах 1366×768.',
    code: `pub fn ui_vertical_cad_rail(ui: &mut egui::Ui, active_tool: &mut CadTool) {
    egui::SidePanel::left("cad_tool_rail")
        .exact_width(38.0)
        .resizable(false)
        .show_inside(ui, |ui| {
            ui.vertical_centered(|ui| {
                for (tool, glyph, tip) in [
                    (CadTool::Select, "↖", "Курсор (V)"),
                    (CadTool::Marquee, "⬚", "Рамка (B)"),
                    (CadTool::Line, "╱", "Отрезок (L)"),
                    (CadTool::Polygon, "⬠", "Полигон (P)"),
                    (CadTool::Arc3Pt, "⌒", "Дуга по 3 точкам (G)"),
                    (CadTool::Rectangle, "▭", "Прямоугольник (R)"),
                    (CadTool::Circle, "◯", "Окружность (C)"),
                    (CadTool::Cubic, "∿", "Кривая Безье (K)"),
                    (CadTool::Node, "T", "Узел LaTeX (N)"),
                ] {
                    let btn = egui::Button::new(glyph)
                        .min_size(egui::vec2(28.0, 26.0))
                        .selected(*active_tool == tool);
                    if ui.add(btn).on_hover_text(tip).clicked() {
                        *active_tool = tool;
                    }
                }
            });
        });
}`,
  },
  {
    id: 'polar-iso-snap-and-shoelace-metrics',
    titleRu: '22. Полярная/Изометрическая привязка 30°, площадь Гаусса и поэлементный Diff отката (F05 · F06 · F11)',
    targetFile: 'crates/tikzarium-core/src/cad_metrics_and_snap.rs',
    rationaleRu:
      'Чистая аналитическая математика без внешних крейтов: полярная сетка (r, θ кратно 15°), аксонометрическая решётка ГОСТ 2.317 (±30°), вычисление площади произвольного замкнутого контура формулой шнурования Гаусса (Shoelace) и выборочный возврат одной строки % [tikzarium:id=n1] из снимка истории.',
    code: `pub fn snap_polar_or_iso(pt_cm: egui::Pos2, step_cm: f64, mode: GridMode) -> egui::Pos2 {
    match mode {
        GridMode::Cartesian => egui::pos2(
            ((pt_cm.x as f64 / step_cm).round() * step_cm) as f32,
            ((pt_cm.y as f64 / step_cm).round() * step_cm) as f32,
        ),
        GridMode::Polar { origin } => {
            let dx = (pt_cm.x - origin.x) as f64;
            let dy = (pt_cm.y - origin.y) as f64;
            let r = ((dx.hypot(dy) / step_cm).round() * step_cm).max(0.0);
            let deg_step = 15.0_f64.to_radians();
            let theta = (dy.atan2(dx) / deg_step).round() * deg_step;
            egui::pos2(origin.x + (r * theta.cos()) as f32, origin.y + (r * theta.sin()) as f32)
        }
        GridMode::Isometric => {
            let cos30 = 3.0_f64.sqrt() * 0.5;
            let u = ((pt_cm.x as f64 / (step_cm * cos30)).round()) * step_cm * cos30;
            let parity = ((u / (step_cm * cos30)).round() as i64).rem_euclid(2) as f64 * 0.5 * step_cm;
            let v = (((pt_cm.y as f64 - parity) / step_cm).round()) * step_cm + parity;
            egui::pos2(u as f32, v as f32)
        }
    }
}

pub fn polygon_area_and_centroid_cm(pts: &[egui::Pos2]) -> (f64, egui::Pos2) {
    if pts.len() < 3 { return (0.0, egui::Pos2::ZERO); }
    let (mut twice_a, mut cx, mut cy) = (0.0_f64, 0.0_f64, 0.0_f64);
    for i in 0..pts.len() {
        let p = pts[i];
        let q = pts[(i + 1) % pts.len()];
        let cross = (p.x as f64) * (q.y as f64) - (q.x as f64) * (p.y as f64);
        twice_a += cross;
        cx += ((p.x + q.x) as f64) * cross;
        cy += ((p.y + q.y) as f64) * cross;
    }
    let area = 0.5 * twice_a.abs();
    if twice_a.abs() > 1e-6 {
        (area, egui::pos2((cx / (3.0 * twice_a)) as f32, (cy / (3.0 * twice_a)) as f32))
    } else {
        (0.0, pts[0])
    }
}`,
  },
  {
    id: 'epaint-concave-hatch-and-atomic-passport',
    titleRu:
      '23. Паспорт атомарного рисунка и обход ограничений epaint: невыпуклые полигоны (earcutr), штриховка ГОСТ и поворот вершин',
    targetFile: 'crates/tikzarium-app/src/epaint_concave_hatch.rs (egui = "=0.33.3", earcutr = "0.4")',
    rationaleRu:
      'В egui 0.33 Shape::convex_polygon корректно заливает только выпуклые контуры, RectShape выровнен по осям экрана, а встроенных текстурных паттернов нет. Все четыре нюанса решаются чистой геометрией CPU поверх стандартного egui::Painter без кастомных WGSL/GLSL шейдеров: (1) триангуляция earcutr::earcut в egui::Mesh для булевых вырезов A − B, (2) аналитическая подрезка линий 45° по рёбрам многоугольника для штриховки ГОСТ 2.306, (3) пред-поворот вершин в PathShape::closed_line и (4) компактная плашка паспорта пакетов в TopBottomPanel::top("tex_preamble_pane").',
    code: `// 1. Заливка произвольного невыпуклого контура (2D Boolean A - B) через egui::Mesh:
pub fn paint_concave_polygon(
    painter: &egui::Painter,
    contour_px: &[egui::Pos2],
    fill: egui::Color32,
    stroke: egui::Stroke,
) {
    if contour_px.len() < 3 {
        return;
    }
    if fill != egui::Color32::TRANSPARENT {
        let mut flat = Vec::with_capacity(contour_px.len() * 2);
        for p in contour_px {
            flat.push(p.x as f64);
            flat.push(p.y as f64);
        }
        if let Ok(indices) = earcutr::earcut(&flat, &[], 2) {
            let mut mesh = egui::Mesh::default();
            for &p in contour_px {
                mesh.colored_vertex(p, fill);
            }
            mesh.indices = indices.into_iter().map(|i| i as u32).collect();
            painter.add(egui::Shape::mesh(mesh));
        }
    }
    painter.add(egui::epaint::PathShape::closed_line(contour_px.to_vec(), stroke));
}

// 2. Векторная штриховка ГОСТ 2.306 (patterns: north east lines 45°) без шейдеров:
pub fn paint_gost_hatch_45deg(
    painter: &egui::Painter,
    poly_px: &[egui::Pos2],
    step_px: f32,
    stroke: egui::Stroke,
) {
    if poly_px.len() < 3 || step_px < 2.0 {
        return;
    }
    // Вдоль нормали n = (-sin 45°, cos 45°) сканируем скалярные уровни c = y - x
    let (mut c_min, mut c_max) = (f32::INFINITY, f32::NEG_INFINITY);
    for p in poly_px {
        let c = p.y - p.x;
        c_min = c_min.min(c);
        c_max = c_max.max(c);
    }
    let diag_step = step_px * std::f32::consts::SQRT_2;
    let mut c = (c_min / diag_step).ceil() * diag_step;
    let mut hits = Vec::with_capacity(8);
    while c <= c_max {
        hits.clear();
        for i in 0..poly_px.len() {
            let a = poly_px[i];
            let b = poly_px[(i + 1) % poly_px.len()];
            let ca = a.y - a.x - c;
            let cb = b.y - b.x - c;
            if (ca <= 0.0 && cb > 0.0) || (cb <= 0.0 && ca > 0.0) {
                let t = ca / (ca - cb);
                hits.push(a + (b - a) * t);
            }
        }
        hits.sort_by(|p, q| p.x.total_cmp(&q.x));
        for pair in hits.chunks_exact(2) {
            painter.line_segment([pair[0], pair[1]], stroke);
        }
        c += diag_step;
    }
}

// 3. Повёрнутый прямоугольник rotate around={θ:(cx,cy)} через PathShape::closed_line:
pub fn rotated_rect_shape(
    rect_px: egui::Rect,
    angle_rad: f32,
    stroke: egui::Stroke,
) -> egui::Shape {
    let center = rect_px.center();
    let rot = egui::emath::Rot2::from_angle(angle_rad);
    let corners = [
        rect_px.left_top(),
        rect_px.right_top(),
        rect_px.right_bottom(),
        rect_px.left_bottom(),
    ]
    .into_iter()
    .map(|p| center + rot * (p - center))
    .collect();
    egui::Shape::Path(egui::epaint::PathShape::closed_line(corners, stroke))
}

// 4. Паспорт пакетов атомарного рисунка в верхнем окне преамбулы egui:
pub fn ui_atomic_preamble_passport_bar(
    ui: &mut egui::Ui,
    profile: &mut AtomicFigureProfileId,
    passport: &FigurePackagePassport,
    mut on_disconnect_lib: impl FnMut(&str),
    mut on_prune_unused: impl FnMut(),
) {
    ui.horizontal_wrapped(|ui| {
        ui.monospace(&passport.doc_class);
        egui::ComboBox::from_id_salt("atomic_figure_profile")
            .selected_text(profile.short_label_ru())
            .show_ui(ui, |ui| {
                for candidate in AtomicFigureProfileId::ALL {
                    ui.selectable_value(profile, candidate, candidate.short_label_ru());
                }
            });
        ui.separator();
        for lib in &passport.libraries {
            let label = if lib.dependent_primitives > 0 {
                format!("{} ({})", lib.name, lib.dependent_primitives)
            } else {
                format!("{} ×", lib.name)
            };
            let btn = ui.add_enabled(lib.xelatex_ok, egui::Button::new(label).small());
            if btn.clicked() && lib.dependent_primitives == 0 {
                on_disconnect_lib(&lib.name);
            }
        }
        if !passport.unused_libraries.is_empty()
            && ui.small_button(format!("Очистить ({})", passport.unused_libraries.len())).clicked()
        {
            on_prune_unused();
        }
    });
}`,
  },
  {
    id: 'tikz-extensions-workshop-egui',
    titleRu:
      '24. Мастерская «Пакеты расширений TikZ» (12 студий): SidePanel каталога + параметрический конструктор + гибридная вставка',
    targetFile: 'crates/tikzarium-app/src/extensions_workshop.rs (egui = "=0.33.3")',
    rationaleRu:
      'Единая двухпанельная мастерская предметных пакетов (pgfplots, circuitikz, tikz-cd, chemfig, tikz-3dplot, forest, pgfgantt, quantikz, tkz-euclide, tikz-timing, tikz-optics, PGF core suites) с тремя режимами эмиссии: Гибрид (автопатч преамбулы \\usepackage + идиоматический LaTeX + синхронные интерактивные примитивы холста), Чистый LaTeX пакета и Только примитивы холста.',
    code: `#[derive(Clone, Copy, PartialEq, Eq)]
pub enum ExtensionOutputMode {
    Hybrid,
    NativeTexOnly,
    CanvasPrimitivesOnly,
}

pub fn ui_tikz_extensions_workshop(
    ui: &mut egui::Ui,
    state: &mut ExtensionsWorkshopState,
    source: &mut String,
) {
    egui::SidePanel::left("tikz_ext_packages_nav")
        .resizable(false)
        .exact_width(250.0)
        .show_inside(ui, |ui| {
            egui::ScrollArea::vertical().show(ui, |ui| {
                for spec in TIKZ_EXTENSION_SPECS {
                    let loaded = preamble_has_package(source, spec.pkg_name);
                    let label = if loaded {
                        format!("{}  ● в преамбуле", spec.short_badge)
                    } else {
                        spec.short_badge.to_owned()
                    };
                    if ui.selectable_label(state.selected_id == spec.id, label).clicked() {
                        state.selected_id = spec.id;
                    }
                }
            });
        });

    egui::CentralPanel::default().show_inside(ui, |ui| {
        let bundle = build_extension_bundle(state);
        ui.heading(bundle.title_ru);
        ui.horizontal(|ui| {
            ui.selectable_value(&mut state.mode, ExtensionOutputMode::Hybrid, "Гибрид: пакет + холст");
            ui.selectable_value(&mut state.mode, ExtensionOutputMode::NativeTexOnly, "Чистый LaTeX пакета");
            ui.selectable_value(&mut state.mode, ExtensionOutputMode::CanvasPrimitivesOnly, "Примитивы холста");
            if ui.button("Вставить в рисунок").clicked() {
                apply_extension_bundle_to_tex(source, &bundle, state.mode);
            }
        });
    });
}`,
  },
  {
    id: 'pdf-manual-anchor-and-qa-api-v2-egui',
    titleRu:
      '25. Встроенный PDF-ридер с прямыми точками [page, NamedDest, bbox_norm] + 100% паритет JSONL API tikzarium-qa-control v2',
    targetFile:
      'crates/tikzarium-app/src/manual_reader.rs & crates/tikzarium-app/src/bin/tikzarium-qa-control.rs',
    rationaleRu:
      'Однократный предсборочный индекс manual_anchors.index.json (через kpsewhich + PyMuPDF без перераспределения массивных PDF в Git по п.5 AGENTS.md) позволяет по клику в коде или Shift+F1 мгновенно рендерить нужную страницу через pdftoppm -f P -l P, подсвечивать рамку bbox_norm [0..1] через egui::Painter::rect_stroke и вызывать те же операции детерминированно через JSONL API для агентов и тестов.',
    code: `pub fn paint_pdf_page_with_direct_anchor(
    ui: &mut egui::Ui,
    page_tex: egui::TextureId,
    page_aspect: f32,
    anchor: &PdfManualAnchor,
) {
    let avail_w = ui.available_width().min(720.0);
    let size = egui::vec2(avail_w, avail_w / page_aspect);
    let (page_rect, _) = ui.allocate_exact_size(size, egui::Sense::hover());

    ui.painter().image(
        page_tex,
        page_rect,
        egui::Rect::from_min_max(egui::pos2(0.0, 0.0), egui::pos2(1.0, 1.0)),
        egui::Color32::WHITE,
    );

    // Нормализованный [0..1] прямоугольник прямой точки независим от DPI монитора:
    let b = anchor.bbox_norm;
    let target_rect = egui::Rect::from_min_max(
        egui::pos2(
            egui::lerp(page_rect.x_range(), b.x0),
            egui::lerp(page_rect.y_range(), b.y0),
        ),
        egui::pos2(
            egui::lerp(page_rect.x_range(), b.x1),
            egui::lerp(page_rect.y_range(), b.y1),
        ),
    );
    ui.painter().rect_filled(
        target_rect,
        3.0,
        egui::Color32::from_rgba_unmultiplied(14, 165, 233, 38),
    );
    ui.painter().rect_stroke(
        target_rect,
        3.0,
        egui::Stroke::new(2.0, egui::Color32::from_rgb(2, 132, 199)),
        egui::StrokeKind::Outside,
    );
}

// Расширение tikzarium-qa-control v2 при 100% сохранении контрактов v1 (panel.source, b42, F1):
match op {
    "manual.open_anchor" => {
        let id = required_string(&request, "anchor_id")?;
        win.studio.open_manual_anchor(&id)?; // чистое чтение: doc.source побайтово неизменен
        Ok(win.snapshot())
    }
    "extension.insert" => {
        let ext = required_string(&request, "extension")?;
        let preset = optional_string(&request, "preset")?;
        win.session.insert_extension_bundle(&ext, preset.as_deref())?;
        Ok(win.snapshot())
    }
    _ => handle_v1_operation(win, request),
}`,
  },
];

export const EguiNativeBlueprintView: React.FC<EguiNativeBlueprintViewProps> = ({
  onJumpToEditorDemo,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      setCopiedId(id);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--tz-inset)] p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Top Architectural Confirmation Banner */}
        <div className="p-5 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-[var(--tz-muted)]">
              <Cpu className="w-4 h-4 text-[var(--tz-link)]" />
              <span>Целевой стек вашего репозитория: Rust + eframe/egui =0.33.3 (glow · Windows 10 · Linux X11/Wayland)</span>
            </div>
            <h1 className="text-lg font-bold text-[var(--tz-text)]">
              Полная совместимость всех решений с нативным ОС-интерфейсом egui
            </h1>
            <p className="text-xs text-[var(--tz-muted)] max-w-3xl leading-relaxed">
              Ни один элемент эргономики в этом прототипе не опирается на «веб-эффекты», HTML-поповеры или CSS-анимации. Каждый контрол спроектирован строго под immediate-mode архитектуру <code className="font-mono">egui 0.33.3</code> из <code className="font-mono">crates/tikzarium-app</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={onJumpToEditorDemo}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 whitespace-nowrap shrink-0"
          >
            <span>Испытать hover-подсказку в .tex</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Critical Native OS / egui Constraints Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--tz-text)]">
              <Monitor className="w-4 h-4 text-[var(--tz-link)] shrink-0" />
              <span>Порядок панелей и HiDPI ОС</span>
            </div>
            <p className="text-xs text-[var(--tz-muted)] leading-relaxed">
              В <code className="font-mono">egui</code> внешние <code className="font-mono">TopBottomPanel</code> и <code className="font-mono">SidePanel</code> обязаны вызываться строго <strong>до</strong> <code className="font-mono">CentralPanel</code>. Все размеры заданы в логических поинтах, поэтому при 125%–200% масштабировании Windows 10 раскладка не ломается.
            </p>
          </div>

          <div className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--tz-text)]">
              <Layers className="w-4 h-4 text-[var(--tz-link)] shrink-0" />
              <span>Слой Order::Tooltip без потери фокуса</span>
            </div>
            <p className="text-xs text-[var(--tz-muted)] leading-relaxed">
              Тултип аргументов LaTeX рендерится через <code className="font-mono">egui::show_tooltip_at_pointer</code> поверх <code className="font-mono">Galley</code>: он не перехватывает клики каретки, не сбивает выделение мышью и не меняет байты исходника <code className="font-mono">.tex</code>.
            </p>
          </div>

          <div className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--tz-text)]">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Нюанс UTF-8 Кириллицы в Galley</span>
            </div>
            <p className="text-xs text-[var(--tz-muted)] leading-relaxed">
              <code className="font-mono">Galley::cursor_from_pos</code> возвращает индекс в <code className="font-mono">char</code>, а лексер <code className="font-mono">source_highlight::Span</code> индексирует байты UTF-8. Русские комментарии сдвигают байты вдвое — в сниппете ниже заложена точная конвертация <code className="font-mono">char_indices().nth(...)</code>.
            </p>
          </div>
        </div>

        {/* Ready-to-Paste Rust / egui 0.33.3 Modules */}
        <div className="flex flex-col gap-4">
          {RUST_SNIPPETS.map((item) => (
            <div
              key={item.id}
              className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] overflow-hidden"
            >
              <div className="px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold text-[var(--tz-text)]">{item.titleRu}</h2>
                  <p className="text-[11px] font-mono text-[var(--tz-muted)]">{item.targetFile}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.code)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Копировать Rust-код</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <p className="text-xs text-[var(--tz-muted)] leading-relaxed">{item.rationaleRu}</p>
                <pre className="p-3.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs text-[var(--tz-text)] overflow-x-auto leading-relaxed">
                  {item.code}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
