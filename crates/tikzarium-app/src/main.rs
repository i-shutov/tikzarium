// Windows native GUI release should not spawn an unwanted console window.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

//! Native egui workbench. XeLaTeX PDF is authoritative; no fake Rust render.
use eframe::egui;
use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
    sync::mpsc::{self, Receiver, TryRecvError},
    time::Duration,
};
use tikzarium_core::{
    BuildArtifact, BuildDiagnostic, BuildError, BuildOptions, BuildRequest, BuildService, Document,
    Severity, TexEnvironment,
};
use tikzarium_extensions::{ExtensionStatus, primitives::Evidence};

mod build_save_dialog;
mod font_proof;
mod pdf_navigation;
mod preview_image;
mod source_fonts;
mod studio_ui;
mod tex_discovery;
mod tikz_authoring;
mod tikz_canvas;
mod tikz_libraries;
mod ui_state;
mod ui_theme;
use ui_state::{
    BottomView, EditorCommand, WorkspaceMode, diagnostic_targets_current_file,
    editor_command_from_events, line_start_char_index, preview_is_stale, scaled_zoom,
};

use font_proof::{FontProofResult, spawn_font_proof};
use pdf_navigation::{
    PageCountReceiver, PageRenderReceiver, can_navigate, spawn_page_count, spawn_page_render,
};
use preview_image::{PreviewLodReceiver, decode_preview_png, spawn_preview_lod};
use source_fonts::scan_explicit_font_hints;
use studio_ui::{StudioDock, StudioGroup, StudioIcon};
use ui_theme::{STORAGE_KEY, UiPreferences};

const QUICKSTART: &str = include_str!("../../../examples/quickstart.tex");
// The Linux Save action cannot use a native dialog: this is an actual, editable
// initial destination, never just a hint. typed_save_destination still forbids
// overwriting a pre-existing file without a deliberate path change.
const DEFAULT_SCRATCH_FILENAME: &str = "figure.tex";

// Fixed 500pt source + 250pt inspector left the exact PDF/guide unusable
// at the native 850pt minimum window width. Reserve central space first.
// All dimensions are egui logical points, independent of Retina scale.
#[derive(Clone, Copy, Debug)]
struct SplitPanelLayout {
    source_default: f32,
    source_max: f32,
    inspector_default: f32,
    inspector_max: f32,
}

impl SplitPanelLayout {
    fn for_width(viewport_width: f32) -> Self {
        let width = viewport_width.max(0.0);
        let inspector_max = (width * 0.26).clamp(210.0, 300.0);
        let source_max = (width - inspector_max - 230.0 - 32.0).clamp(240.0, 600.0);
        Self {
            source_default: (width * 0.36).clamp(240.0, 500.0).min(source_max),
            source_max,
            inspector_default: (width * 0.21).clamp(210.0, 270.0),
            inspector_max,
        }
    }

    /// Re-evaluate the source maximum AFTER the inspector and icon rail
    /// have consumed their real egui rectangles. Respect the central canvas.
    fn reserving_center(self, remaining_width: f32) -> Self {
        let available = if remaining_width.is_finite() {
            remaining_width.max(0.0)
        } else {
            0.0
        };
        let source_max = self.source_max.min((available - 260.0).max(240.0));
        Self {
            source_default: self.source_default.min(source_max),
            source_max,
            ..self
        }
    }
}

fn show_split_inspector_panel(
    ctx: &egui::Context,
    layout: SplitPanelLayout,
    add_contents: impl FnOnce(&mut egui::Ui),
) {
    egui::SidePanel::right("tikz-source-inspector")
        .resizable(true)
        .default_width(layout.inspector_default)
        .min_width(210.0)
        .max_width(layout.inspector_max)
        .show(ctx, add_contents);
}

fn show_split_source_panel(
    ctx: &egui::Context,
    layout: SplitPanelLayout,
    add_contents: impl FnOnce(&mut egui::Ui),
) -> egui::Rect {
    egui::SidePanel::left("source")
        .resizable(true)
        .default_width(layout.source_default)
        .min_width(240.0)
        .max_width(layout.source_max)
        .show(ctx, add_contents)
        .response
        .rect
}

/// Fit an entire rasterized XeLaTeX PDF page in the actual remaining preview
/// viewport, AFTER the provisional guide and status widgets took their space.
/// Scrollbar allowance is conservative; no PDF-to-TeX coordinate conversion.
fn fit_page_zoom(image: egui::Vec2, viewport: egui::Vec2) -> Option<f32> {
    if !image.is_finite() || !viewport.is_finite() || image.x <= 0.0 || image.y <= 0.0 {
        return None;
    }
    let available = viewport - egui::vec2(24.0, 24.0);
    if available.x <= 0.0 || available.y <= 0.0 {
        return None;
    }
    let zoom = (available.x / image.x).min(available.y / image.y);
    // An exact 120-dpi PDF raster may need much less than 20% after the
    // provisional guide consumes vertical space (real X11: 1180x680).
    // Whole-page mode must show the *entire* PDF, even if text is tiny;
    // never report success if fitting would require less than 2%.
    (zoom >= 0.02 && zoom.is_finite()).then_some(zoom.min(5.0))
}

/// Fit width to the *actual* central-panel width without inventing 80px
/// of space or clamping up to 20% and therefore clipping a narrow preview.
fn fit_width_zoom(image_width: f32, canvas_width: f32) -> Option<f32> {
    if !image_width.is_finite() || !canvas_width.is_finite() || image_width <= 0.0 {
        return None;
    }
    let available = canvas_width - 24.0;
    if available <= 0.0 {
        return None;
    }
    let zoom = available / image_width;
    (zoom.is_finite() && zoom >= 0.02).then_some(zoom.min(5.0))
}

/// The PDF toolbar is painted before the post-guide viewport can be measured.
/// A resize or page change may therefore refit *after* the visible percentage
/// was emitted. Schedule one more frame only when the rounded readout differs
/// from the raster scale; otherwise a resize can leave a stale "7%" alongside
/// a page rendered at 25% (confirmed in I43 real X11 screenshots).
fn pdf_zoom_percent(zoom: f32) -> u32 {
    (zoom * 100.0).round() as u32
}

fn repaint_if_pdf_zoom_label_stale(
    ctx: &egui::Context,
    displayed_percent: u32,
    actual_zoom: f32,
) -> bool {
    let stale = displayed_percent != pdf_zoom_percent(actual_zoom);
    if stale {
        ctx.request_repaint();
    }
    stale
}

/// A 120-dpi Poppler PNG shrunk below 40% with GPU bilinear filtering
/// undersamples hairlines and can omit entire rectangle sides (real I51 X11).
/// Select a CPU-prefiltered LOD but keep the full raster dimensions as the
/// layout authority; this is still a sampled PDF *preview*, not PDF geometry.
fn show_pdf_raster(
    ui: &mut egui::Ui,
    full: &egui::TextureHandle,
    prefiltered: Option<&egui::TextureHandle>,
    zoom: f32,
) -> (egui::Response, bool) {
    let use_prefiltered = zoom < 0.38 && prefiltered.is_some();
    let texture = if use_prefiltered {
        prefiltered.expect("checked above")
    } else {
        full
    };
    (
        ui.image((texture.id(), full.size_vec2() * zoom)),
        use_prefiltered,
    )
}

fn page_fit_warning(unavailable: bool) -> Option<&'static str> {
    unavailable.then_some(
        "Автоподбор страницы: не хватает места даже при 2%; увеличьте область PDF или прокручивайте.",
    )
}

/// Draw the actual egui Fit Page control. The selected state is sticky across
/// page navigation and window resizing, unlike a one-shot scalar zoom.
/// Keep the editable source/inspector visible while the user explicitly gives
/// the central area to the authoritative XeLaTeX PDF instead of the provisional
/// drawing guide. The real egui control is also driven by UNIT_EVENT frames.
fn show_split_center_focus_switch(
    ui: &mut egui::Ui,
    pdf_focus: &mut bool,
    authoring: &mut tikz_authoring::Session,
    fit_page_active: &mut bool,
) -> [egui::Rect; 2] {
    let previous = *pdf_focus;
    let rects = [
        ui.selectable_value(pdf_focus, false, "Рисовать TikZ").rect,
        ui.selectable_value(pdf_focus, true, "PDF крупно").rect,
    ];
    if *pdf_focus != previous {
        if *pdf_focus {
            // If another input device changes the view during a pointer
            // gesture, its later release cannot author a ghost command.
            authoring.cancelled_pointer_capture |=
                authoring.guide_pointer_armed || authoring.drag_start.is_some();
            authoring.guide_pointer_armed = false;
            authoring.drag_start = None;
            authoring.alt_selection_capture = false;
            *fit_page_active = true;
        }
        ui.ctx().request_repaint();
    }
    rects
}

fn show_fit_page_button(ui: &mut egui::Ui, enabled: bool, fit_active: &mut bool) -> egui::Response {
    let response = ui
        .add_enabled(
            enabled,
            egui::Button::new("Вся страница").selected(*fit_active),
        )
        .on_hover_text(
            "Автоматически подгонять текущую страницу точного PDF под доступную область. В компактном окне масштаб может стать меньше 20%: вся страница видна, но мелкий текст трудно прочитать. Кнопки +/−, 100% и Fit width переключают на ручной масштаб.",
        );
    if response.clicked() {
        *fit_active = true;
    }
    response
}

/// Keep whole-page mode responsive to page changes/resizes, without altering
/// source or claiming any PDF-to-TikZ coordinate mapping. A missing texture is
/// not a failure; a page too large even at 2% is explicitly reported.
fn refit_selected_page(
    fit_active: bool,
    image: Option<egui::Vec2>,
    viewport: egui::Vec2,
    zoom: &mut f32,
) -> bool {
    if !fit_active {
        return false;
    }
    let Some(image) = image else {
        return false;
    };
    if let Some(fit) = fit_page_zoom(image, viewport) {
        *zoom = fit;
        false
    } else {
        true
    }
}

/// Screen-space caret region from the real egui text galley. Never estimate
/// source-line positions from a fixed logical row height: soft wrapping,
/// font metrics and horizontal scroll invalidate that estimate.
fn source_caret_target(
    galley: &egui::Galley,
    galley_pos: egui::Pos2,
    char_index: usize,
) -> egui::Rect {
    galley
        .pos_from_cursor(egui::text::CCursor::new(char_index))
        .translate(galley_pos.to_vec2())
        .expand2(egui::vec2(2.0, 2.0))
}

/// A confirmed authored source transaction and TextEdit share one mutable .tex
/// buffer, but egui's native undo snapshots predate that transaction. Fence
/// them before the next code editor frame. A no-op selection/F1 must *not*
/// clear the user's ordinary text Undo history.
fn fence_source_editor_undo_on_revision_change(
    previous_revision: u64,
    session: &tikz_authoring::Session,
    reset_undo_history: &mut bool,
) -> bool {
    if session.source_revision() == previous_revision {
        return false;
    }
    *reset_undo_history = true;
    true
}

/// Switching documents must not reuse egui TextEdit's native Undo snapshots:
/// those snapshots belong to the old .tex buffer, not the new source file.
fn show_source_text_edit(
    ui: &mut egui::Ui,
    source: &mut String,
    reset_undo_history: &mut bool,
    soft_wrap: bool,
) -> egui::text_edit::TextEditOutput {
    let fenced = *reset_undo_history;
    // INFINITY disables wrapping. The alternative only changes visual galley
    // rows: not the source, CRLF, opaque macros, Undo or source-caret offsets.
    // egui 0.33 clamps desired_width(INFINITY) to available_width:
    // it does NOT turn wrapping off in a normal, non-justified SidePanel.
    // Control the actual galley wrap width rather than widening the widget.
    // Keep native code-editor font, Tab/focus/caret and Undo behavior.
    let edit_width = if soft_wrap {
        ui.available_width().max(140.0)
    } else {
        f32::INFINITY
    };
    let mut layouter = |ui: &egui::Ui, text: &dyn egui::TextBuffer, wrap_width: f32| {
        let actual_wrap_width = if soft_wrap { wrap_width } else { f32::INFINITY };
        let job = egui::text::LayoutJob::simple(
            text.as_str().to_owned(),
            egui::TextStyle::Monospace.resolve(ui.style()),
            ui.visuals().widgets.inactive.text_color(),
            actual_wrap_width,
        );
        ui.fonts_mut(|fonts| fonts.layout_job(job))
    };
    let mut output = egui::TextEdit::multiline(source)
        .code_editor()
        .desired_width(edit_width)
        .desired_rows(36)
        .layouter(&mut layouter)
        .interactive(!fenced)
        .show(ui);
    if fenced {
        output.state.clear_undoer();
        output.state.clone().store(ui.ctx(), output.response.id);
        *reset_undo_history = false;
        ui.ctx().request_repaint();
    }
    output
}

/// A floating geometry palette should never cover the canvas while the user
/// returns to the editable TeX. Only an actual pointer click in the TextEdit
/// dismisses it: typing/F1/hover must keep tool selection and source unchanged.
fn dismiss_studio_palette_on_source_click(
    response: &egui::Response,
    group: &mut Option<StudioGroup>,
) {
    if response.clicked() {
        *group = None;
    }
}

#[derive(Debug, PartialEq, Eq)]
enum PendingOpenAction {
    Save(PathBuf),
    Discard,
    Cancel,
    Reject(String),
}

/// An "Open path" is never implicitly a "Save As" destination. In particular,
/// do not replace the target file with an unsaved scratch buffer before
/// re-opening it. Resolve aliases of existing files before comparing paths.
fn same_existing_path(a: &Path, b: &Path) -> bool {
    a == b
        || matches!(
            (a.canonicalize(), b.canonicalize()),
            (Ok(left), Ok(right)) if left == right
        )
}

/// Stage the complete PDF on the destination filesystem before exposing the
/// final filename. A failed write must not leave a corrupt user-visible PDF;
/// persist_noclobber also refuses existing files and symlinks.
fn write_new_pdf_without_overwrite(path: &Path, pdf: &[u8]) -> std::io::Result<()> {
    let folder = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let mut staged = tempfile::NamedTempFile::new_in(folder)?;
    std::io::Write::write_all(staged.as_file_mut(), pdf)?;
    staged.as_file().sync_all()?;
    staged
        .persist_noclobber(path)
        .map(|_| ())
        .map_err(|error| error.error)
}

/// A native Save dialog can still select a symlink or already occupied name.
/// Fail closed unless writing to the exact current document. Unlike displaying
/// path strings, this keeps non-UTF-8 Linux path bytes intact.
fn checked_native_save_destination(document: &Document, path: PathBuf) -> Result<PathBuf, String> {
    if path.as_os_str().is_empty() {
        return Err("Выберите имя TeX-файла".into());
    }
    let current = document
        .path
        .as_deref()
        .is_some_and(|existing| same_existing_path(existing, &path));
    match std::fs::symlink_metadata(&path) {
        Ok(_) if !current => Err(
            "Файл уже существует: сохранение поверх чужого документа запрещено; выберите другое имя".into()
        ),
        Ok(_) => Ok(path),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(path),
        Err(error) => Err(format!("Ошибка проверки файла перед сохранением: {error}")),
    }
}

/// A typed path is not explicit permission to overwrite another TeX file.
/// Both typed input and native picks reject unintended target replacement.
fn typed_save_destination(document: &Document, input: &str) -> Result<PathBuf, String> {
    if input.trim().is_empty() {
        return Err("Укажите путь для сохранения TeX-документа.".into());
    }
    let path = PathBuf::from(input.trim());
    let saving_current = document
        .path
        .as_deref()
        .is_some_and(|current| same_existing_path(current, &path));
    match std::fs::symlink_metadata(&path) {
        Ok(_) if !saving_current => Err(
            "Файл уже существует. Автоматическая перезапись чужого TeX запрещена; выберите новое имя."
                .into(),
        ),
        Ok(_) => Ok(path),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(path),
        Err(error) => Err(format!("Не удалось проверить путь сохранения: {error}")),
    }
}

fn pending_open_save_destination(
    document: &Document,
    input: &str,
    open_target: &Path,
) -> Result<PathBuf, String> {
    if input.trim().is_empty() {
        return Err(
            "Укажите отдельный путь для сохранения текущего документа перед открытием.".into(),
        );
    }
    let save_path = typed_save_destination(document, input)?;
    let current_is_target = document
        .path
        .as_deref()
        .is_some_and(|current| same_existing_path(current, open_target));
    if same_existing_path(&save_path, open_target) && !current_is_target {
        return Err(
            "Нельзя сохранить текущий документ поверх файла, который вы собираетесь открыть."
                .into(),
        );
    }
    Ok(save_path)
}

/// A dirty scratch must retain its own safe Save-and-open destination even
/// after the File menu field has been changed to the file being opened.
/// Never suggest a path that is occupied or aliases the incoming target.
fn initial_pending_open_save_path(
    document: &Document,
    open_target: &Path,
    scratch_candidate: &Path,
) -> String {
    let candidate = document.path.as_deref().unwrap_or(scratch_candidate);
    let Some(text) = candidate.to_str() else {
        return String::new();
    };
    if pending_open_save_destination(document, text, open_target).is_ok() {
        text.to_owned()
    } else {
        String::new()
    }
}

/// Real egui controls; returning the save-button rect additionally allows
/// pointer event-frame tests to exercise the exact production click handler.
fn pending_open_controls(
    ui: &mut egui::Ui,
    document: &Document,
    open_target: &Path,
    save_input: &mut String,
    validation_error: Option<&str>,
) -> (Option<PendingOpenAction>, egui::Rect, Option<egui::Rect>) {
    ui.label("В текущем TeX-документе есть несохранённые изменения.");
    ui.small(format!(
        "Открыть после подтверждения: {}",
        open_target.display()
    ));
    ui.label("Путь сохранения текущего документа:");
    ui.add(
        egui::TextEdit::singleline(save_input)
            .desired_width(400.0)
            .hint_text("отдельный файл .tex"),
    );
    ui.small("Путь открываемого файла не используется для сохранения. Для нового документа укажите другое имя.");
    // A rejected Save-and-open must explain itself inside the modal. The
    // top-toolbar status is dimmed and cannot be read through the backdrop.
    let error_rect = validation_error.map(|error| {
        let color = ui.visuals().error_fg_color;
        ui.colored_label(color, error).rect
    });
    let mut action = None;
    let mut save_button_rect = egui::Rect::NOTHING;
    ui.horizontal(|ui| {
        let button = ui.button("Сохранить и открыть");
        save_button_rect = button.rect;
        if button.clicked() {
            action = Some(
                match pending_open_save_destination(document, save_input, open_target) {
                    Ok(path) => PendingOpenAction::Save(path),
                    Err(error) => PendingOpenAction::Reject(error),
                },
            );
        }
        if ui.button("Отбросить и открыть").clicked() {
            action = Some(PendingOpenAction::Discard);
        }
        if ui.button("Отмена").clicked() {
            action = Some(PendingOpenAction::Cancel);
        }
    });
    (action, save_button_rect, error_rect)
}

/// Dirty-Open confirmation must block underlying guide/source pointer events.
fn show_pending_open_dialog(
    ctx: &egui::Context,
    document: &Document,
    open_target: &Path,
    save_input: &mut String,
    validation_error: Option<&str>,
) -> (Option<PendingOpenAction>, egui::Rect, Option<egui::Rect>) {
    let mut result = (None, egui::Rect::NOTHING, None);
    egui::Modal::new(egui::Id::new("tikzarium-pending-open")).show(ctx, |ui| {
        ui.heading("Несохранённые изменения");
        ui.separator();
        result = pending_open_controls(ui, document, open_target, save_input, validation_error);
    });
    if result.0.is_none() && ctx.input(|input| input.key_pressed(egui::Key::Escape)) {
        result.0 = Some(PendingOpenAction::Cancel);
    }
    result
}

#[derive(Debug, PartialEq, Eq)]
enum PendingCloseAction {
    Save(PathBuf),
    Discard,
    Cancel,
    Reject(String),
}

/// The native close button and Alt+F4 must not discard the user's only
/// copy of an edited TeX document. A successful Save/explicit Discard is the
/// only path that may approve the subsequent root viewport Close command.
fn close_requires_confirmation(dirty: bool, approved: bool) -> bool {
    dirty && !approved
}

fn intercept_dirty_viewport_close(ctx: &egui::Context, dirty: bool, approved: bool) -> bool {
    if !close_requires_confirmation(dirty, approved)
        || !ctx.input(|input| input.viewport().close_requested())
    {
        return false;
    }
    ctx.send_viewport_cmd(egui::ViewportCommand::CancelClose);
    true
}

/// A scratch buffer must never be silently saved over an existing file.
/// Do not borrow the File menu's path: it can be the last Open target.
fn initial_pending_close_save_path(document: &Document) -> String {
    let candidate = document
        .path
        .as_deref()
        .unwrap_or(Path::new(DEFAULT_SCRATCH_FILENAME));
    let Some(path) = candidate.to_str() else {
        return String::new();
    };
    typed_save_destination(document, path)
        .ok()
        .map_or_else(String::new, |_| path.to_owned())
}

/// A native modal so WM_DELETE_WINDOW (and the window-manager keyboard
/// close) is intercepted without altering the .tex buffer or undo history.
fn show_pending_close_dialog(
    ctx: &egui::Context,
    document: &Document,
    save_input: &mut String,
    validation_error: Option<&str>,
) -> Option<PendingCloseAction> {
    let mut action = None;
    egui::Modal::new(egui::Id::new("tikzarium-pending-close")).show(ctx, |ui| {
        ui.heading("Несохранённые изменения");
        ui.separator();
        ui.label("Текущий TeX-документ изменён. Сохранить перед выходом?");
        ui.label("Путь сохранения:");
        ui.add(
            egui::TextEdit::singleline(save_input)
                .desired_width(400.0)
                .hint_text("новый файл .tex"),
        );
        ui.small("Существующий чужой файл не будет перезаписан автоматически.");
        if let Some(error) = validation_error {
            ui.colored_label(ui.visuals().error_fg_color, error);
        }
        ui.horizontal(|ui| {
            if ui.button("Сохранить и выйти").clicked() {
                action = Some(match typed_save_destination(document, save_input) {
                    Ok(path) => PendingCloseAction::Save(path),
                    Err(error) => PendingCloseAction::Reject(error),
                });
            }
            if ui.button("Не сохранять и выйти").clicked() {
                action = Some(PendingCloseAction::Discard);
            }
            if ui.button("Отмена").clicked() {
                action = Some(PendingCloseAction::Cancel);
            }
        });
    });
    if action.is_none() && ctx.input(|input| input.key_pressed(egui::Key::Escape)) {
        action = Some(PendingCloseAction::Cancel);
    }
    action
}

struct TikzariumApp {
    document: Document,
    file_field: String,
    tex: TexEnvironment,
    tex_discovery_rx: Option<Receiver<Result<tex_discovery::Snapshot, String>>>,
    tex_privilege_notice: Option<String>,
    package_statuses: Vec<ExtensionStatus>,
    library_installation: BTreeMap<String, Evidence>,
    diagnostics: Vec<BuildDiagnostic>,
    workspace: WorkspaceMode,
    bottom_view: BottomView,
    jump_to_line: Option<usize>,
    last_build_failed: bool,
    log: String,
    status: String,
    preview_status: String,
    preview_texture: Option<egui::TextureHandle>,
    preview_lod_texture: Option<egui::TextureHandle>,
    preview_lod_rx: Option<PreviewLodReceiver>,
    pdf: Option<Vec<u8>>,
    built_source: Option<String>,
    built_path: Option<PathBuf>,
    building_source: Option<String>,
    building_path: Option<PathBuf>,
    zoom: f32,
    fit_page_active: bool,
    pdf_focus_in_split: bool,
    preview_epoch: u64,
    page_index: usize,
    page_count: Option<usize>,
    page_count_rx: Option<PageCountReceiver>,
    page_render_rx: Option<PageRenderReceiver>,
    page_navigation_status: String,
    receiver: Option<Receiver<Result<BuildArtifact, BuildError>>>,
    cancellation: Option<BuildService>,
    show_packages: bool,
    help_query: String,
    source_caret: Option<(usize, u64)>,
    show_log: bool,
    pending_build: bool,
    pending_build_save_path: String,
    pending_build_validation_error: Option<String>,
    pending_open: Option<PathBuf>,
    pending_open_save_path: String,
    pending_open_validation_error: Option<String>,
    pending_close: bool,
    pending_close_save_path: String,
    pending_close_validation_error: Option<String>,
    close_approved: bool,
    viewport_fit_requested: Option<egui::Vec2>,
    prefs: UiPreferences,
    studio_group: Option<StudioGroup>,
    studio_palette_anchor: egui::Pos2,
    studio_extension_filter: String,
    authoring: tikz_authoring::Session,
    highlight_generated_line: bool,
    // A source patch or document replacement must not leave native TextEdit
    // history that could restore commands or bytes from a previous file.
    reset_source_editor_undo_history: bool,
    font_proof_rx: Option<Receiver<Result<FontProofResult, String>>>,
    font_proof_status: String,
    font_proof_report: String,
    font_proof_texture: Option<egui::TextureHandle>,
}

// B42: the path TextEdit must not close its menu just by gaining focus.
// egui 0.33 defaults to CloseOnClick, including clicks inside the menu.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum StudioFileAction {
    OpenPath,
    SaveAs,
    OpenPicker,
    SavePicker,
    ExportPicker,
}

struct StudioFileMenuResponse {
    action: Option<StudioFileAction>,
    #[cfg(test)]
    trigger_rect: egui::Rect,
    #[cfg(test)]
    path_rect: Option<egui::Rect>,
    #[cfg(test)]
    open_rect: Option<egui::Rect>,
}

fn show_studio_file_menu(
    ui: &mut egui::Ui,
    file_field: &mut String,
    ready: bool,
) -> StudioFileMenuResponse {
    let mut result = StudioFileMenuResponse {
        action: None,
        #[cfg(test)]
        trigger_rect: egui::Rect::NOTHING,
        #[cfg(test)]
        path_rect: None,
        #[cfg(test)]
        open_rect: None,
    };
    let (trigger, _) = egui::containers::menu::MenuButton::new("Файл")
        .config(
            egui::containers::menu::MenuConfig::default()
                .close_behavior(egui::PopupCloseBehavior::CloseOnClickOutside),
        )
        .ui(ui, |ui| {
            ui.label("TeX-проект:");
            let path_edit = ui.add(
                egui::TextEdit::singleline(file_field)
                    .desired_width(260.0)
                    .hint_text("figure.tex"),
            );
            #[cfg(test)]
            {
                result.path_rect = Some(path_edit.rect);
            }
            #[cfg(not(test))]
            let _ = path_edit;

            let open = ui.add_enabled(ready, egui::Button::new("Открыть путь"));
            #[cfg(test)]
            {
                result.open_rect = Some(open.rect);
            }
            if open.clicked() {
                result.action = Some(StudioFileAction::OpenPath);
                ui.close();
            }
            if ui
                .add_enabled(ready, egui::Button::new("Сохранить как…"))
                .clicked()
            {
                result.action = Some(StudioFileAction::SaveAs);
                ui.close();
            }
            ui.separator();
            // These are genuine platform dialogs, separate from the manual
            // typed-path workflow retained for offline/portal-less X11 tests.
            if ui
                .add_enabled(ready, egui::Button::new("Выбрать файл…"))
                .clicked()
            {
                result.action = Some(StudioFileAction::OpenPicker);
                ui.close();
            }
            if ui
                .add_enabled(ready, egui::Button::new("Сохранить через диалог…"))
                .clicked()
            {
                result.action = Some(StudioFileAction::SavePicker);
                ui.close();
            }
            if ui
                .add_enabled(ready, egui::Button::new("Экспорт PDF через диалог…"))
                .clicked()
            {
                result.action = Some(StudioFileAction::ExportPicker);
                ui.close();
            }
        });
    #[cfg(test)]
    {
        result.trigger_rect = trigger.rect;
    }
    #[cfg(not(test))]
    let _ = trigger;
    result
}

impl TikzariumApp {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        let prefs = cc
            .storage
            .and_then(|storage| eframe::get_value::<UiPreferences>(storage, STORAGE_KEY))
            .unwrap_or_default();
        prefs.theme.apply(&cc.egui_ctx, prefs.compact);
        // Do not spawn external tools in eframe's native window constructor.
        let initial = tex_discovery::Snapshot::unknown();
        let tex = initial.tex;
        let tex_discovery_rx = Some(tex_discovery::start(cc.egui_ctx.clone()));
        let tex_privilege_notice = match tikzarium_core::external_document_privilege_notice() {
            Ok(Some(warning)) => Some(warning.to_owned()),
            Ok(None) => None,
            Err(error) => Some(format!(
                "⚠ Не удалось проверить права Windows: {error}. Внешняя компиляция будет отклонена проверкой токена."
            )),
        };
        let package_statuses = initial.packages;
        let library_installation = initial.libraries;
        Self {
            document: Document::scratch(QUICKSTART),
            file_field: DEFAULT_SCRATCH_FILENAME.to_owned(),
            tex,
            tex_discovery_rx,
            tex_privilege_notice,
            package_statuses,
            library_installation,
            diagnostics: Vec::new(),
            workspace: WorkspaceMode::Split,
            bottom_view: BottomView::Issues,
            jump_to_line: None,
            last_build_failed: false,
            log: String::new(),
            status: "Проверка TeX в фоне; исходник и справка доступны".into(),
            preview_status: "No exact preview yet".into(),
            preview_texture: None,
            preview_lod_texture: None,
            preview_lod_rx: None,
            pdf: None,
            built_source: None,
            built_path: None,
            building_source: None,
            building_path: None,
            zoom: 1.0,
            fit_page_active: false,
            pdf_focus_in_split: false,
            preview_epoch: 0,
            page_index: 1,
            page_count: None,
            page_count_rx: None,
            page_render_rx: None,
            page_navigation_status: "Page count NOT_CHECKED".into(),
            receiver: None,
            cancellation: None,
            show_packages: true,
            help_query: String::new(),
            source_caret: None,
            show_log: true,
            pending_build: false,
            pending_build_save_path: String::new(),
            pending_build_validation_error: None,
            pending_open: None,
            pending_open_save_path: String::new(),
            pending_open_validation_error: None,
            pending_close: false,
            pending_close_save_path: String::new(),
            pending_close_validation_error: None,
            close_approved: false,
            viewport_fit_requested: None,
            prefs,
            studio_group: None,
            studio_palette_anchor: egui::pos2(65.0, 120.0),
            studio_extension_filter: String::new(),
            authoring: {
                let mut state = tikz_authoring::Session::default();
                state.reset(QUICKSTART);
                state
            },
            highlight_generated_line: false,
            reset_source_editor_undo_history: false,
            font_proof_rx: None,
            font_proof_status: "Not tested".into(),
            font_proof_report: String::new(),
            font_proof_texture: None,
        }
    }

    fn modal_active(&self) -> bool {
        self.pending_open.is_some() || self.pending_close || self.pending_build
    }

    fn intercept_close(&mut self, ctx: &egui::Context) {
        if !intercept_dirty_viewport_close(ctx, self.document.dirty(), self.close_approved) {
            return;
        }
        if !self.pending_close {
            self.pending_close = true;
            self.pending_close_save_path = initial_pending_close_save_path(&self.document);
            self.pending_close_validation_error = None;
        }
        ctx.request_repaint();
    }

    fn accept_close(&mut self, ctx: &egui::Context) {
        self.close_approved = true;
        self.pending_close = false;
        self.pending_close_save_path.clear();
        self.pending_close_validation_error = None;
        ctx.send_viewport_cmd(egui::ViewportCommand::Close);
    }

    fn pending_close_ui(&mut self, ctx: &egui::Context) {
        if !self.pending_close {
            return;
        }
        let previous_destination = self.pending_close_save_path.clone();
        let action = show_pending_close_dialog(
            ctx,
            &self.document,
            &mut self.pending_close_save_path,
            self.pending_close_validation_error.as_deref(),
        );
        if self.pending_close_save_path != previous_destination {
            self.pending_close_validation_error = None;
        }
        match action {
            Some(PendingCloseAction::Save(path)) => {
                if self.save_to_path(path) {
                    self.accept_close(ctx);
                } else {
                    self.pending_close_validation_error = Some(self.status.clone());
                    ctx.request_repaint();
                }
            }
            Some(PendingCloseAction::Discard) => self.accept_close(ctx),
            Some(PendingCloseAction::Cancel) => {
                self.pending_close = false;
                self.pending_close_validation_error = None;
                self.pending_close_save_path.clear();
            }
            Some(PendingCloseAction::Reject(error)) => {
                self.status = error.clone();
                self.pending_close_validation_error = Some(error);
                ctx.request_repaint();
            }
            None => {}
        }
    }

    fn pending_build_ui(&mut self, ctx: &egui::Context) {
        if !self.pending_build || self.pending_close || self.pending_open.is_some() {
            return;
        }
        let previous_destination = self.pending_build_save_path.clone();
        let decision = build_save_dialog::show(
            ctx,
            &self.document,
            &mut self.pending_build_save_path,
            self.pending_build_validation_error.as_deref(),
        );
        if self.pending_build_save_path != previous_destination {
            self.pending_build_validation_error = None;
        }
        match decision {
            Some(build_save_dialog::BuildSaveAction::Save(path)) => {
                if self.save_to_path(path) {
                    self.pending_build = false;
                    self.pending_build_save_path.clear();
                    self.pending_build_validation_error = None;
                    // Build uses the newly confirmed document.path, not the
                    // unrelated Open-path field or another native file dialog.
                    self.build();
                } else {
                    self.pending_build_validation_error = Some(self.status.clone());
                    ctx.request_repaint();
                }
            }
            Some(build_save_dialog::BuildSaveAction::Reject(error)) => {
                self.status = error.clone();
                self.pending_build_validation_error = Some(error);
                ctx.request_repaint();
            }
            Some(build_save_dialog::BuildSaveAction::Cancel) => {
                self.pending_build = false;
                self.pending_build_save_path.clear();
                self.pending_build_validation_error = None;
                self.status = "Сборка отменена: исходник не изменён".into();
            }
            None => {}
        }
    }

    fn open_path(&mut self, path: PathBuf) {
        if path.as_os_str().is_empty() {
            self.status = "Choose a .tex file".into();
            return;
        }
        if self.receiver.is_some() {
            self.status = "Cancel active compilation before opening a file".into();
            return;
        }
        if self.document.dirty() {
            self.pending_open_validation_error = None;
            self.pending_open_save_path = initial_pending_open_save_path(
                &self.document,
                &path,
                Path::new(DEFAULT_SCRATCH_FILENAME),
            );
            self.pending_open = Some(path);
            return;
        }
        self.load_path(path);
    }

    fn load_path(&mut self, path: PathBuf) {
        match Document::load(&path) {
            Ok(document) => {
                self.file_field = path.display().to_string();
                self.document = document;
                self.authoring.reset(&self.document.source);
                self.source_caret = None;
                // A stable egui TextEdit widget ID otherwise retains the old
                // document's native Ctrl/Cmd+Z history across Open/Reopen.
                self.reset_source_editor_undo_history = true;
                self.highlight_generated_line = false;
                self.built_source = None;
                self.built_path = None;
                self.building_source = None;
                self.building_path = None;
                self.diagnostics.clear();
                self.log.clear();
                self.jump_to_line = None;
                self.last_build_failed = false;
                self.preview_texture = None;
                self.preview_lod_texture = None;
                self.preview_lod_rx = None;
                self.fit_page_active = false;
                self.pdf = None;
                self.preview_epoch = self.preview_epoch.wrapping_add(1);
                self.page_index = 1;
                self.page_count = None;
                self.page_count_rx = None;
                self.page_render_rx = None;
                self.page_navigation_status = "Page count NOT_CHECKED".into();
                self.preview_status = "Not built".into();
                self.status = format!("Opened {}", path.display());
            }
            Err(err) => self.status = format!("Open failed: {err}"),
        }
    }

    fn save_to_path(&mut self, path: PathBuf) -> bool {
        match self.document.save_to(&path) {
            Ok(()) => {
                self.file_field = path.display().to_string();
                self.status = format!("Saved {}", path.display());
                true
            }
            Err(error) => {
                self.status = format!("Save failed: {error}");
                false
            }
        }
    }

    fn save_as(&mut self) -> bool {
        #[cfg(any(target_os = "windows", target_os = "macos"))]
        {
            let filename = self
                .document
                .path
                .as_ref()
                .and_then(|path| path.file_name())
                .and_then(|name| name.to_str())
                .unwrap_or("figure.tex");
            let path = rfd::FileDialog::new()
                .add_filter("TeX / TikZ", &["tex", "tikz"])
                .set_file_name(filename)
                .save_file();
            match path {
                Some(path) => self.save_to_path(path),
                None => {
                    self.status = "Save cancelled".into();
                    false
                }
            }
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            match typed_save_destination(&self.document, &self.file_field) {
                Ok(path) => self.save_to_path(path),
                Err(error) => {
                    self.status = error;
                    false
                }
            }
        }
    }

    fn save(&mut self) -> bool {
        if let Some(path) = self.document.path.clone() {
            return self.save_to_path(path);
        }
        // The toolbar's Path field is also used by Open path. For scratch
        // documents it is not an authorized overwrite destination. Route
        // through a platform Save As dialog or validated typed path instead.
        self.save_as()
    }

    /// Dialog selection is a *candidate path*, not authorization to destroy
    /// unrelated files. Both Unicode and OS-native PathBuf names are kept intact.
    fn save_as_picker(&mut self) -> bool {
        let filename = self
            .document
            .path
            .as_ref()
            .and_then(|path| path.file_name())
            .and_then(|name| name.to_str())
            .unwrap_or(DEFAULT_SCRATCH_FILENAME);
        let path = rfd::FileDialog::new()
            .add_filter("TeX / TikZ", &["tex", "tikz"])
            .set_file_name(filename)
            .save_file();
        let Some(path) = path else {
            self.status = "Выбор сохранения отменён или XDG file portal недоступен; путь можно ввести вручную".into();
            return false;
        };
        match checked_native_save_destination(&self.document, path) {
            Ok(path) => self.save_to_path(path),
            Err(error) => {
                self.status = error;
                false
            }
        }
    }

    fn open_document_picker(&mut self) {
        match rfd::FileDialog::new()
            .add_filter("TeX / TikZ", &["tex", "tikz"])
            .pick_file()
        {
            Some(path) => self.open_path(path), // dirty-open confirmation remains authoritative
            None => {
                self.status = "Выбор открытия отменён или XDG file portal недоступен; можно ввести путь вручную".into();
            }
        }
    }

    fn export_pdf_picker(&mut self) {
        if self.preview_stale() || self.pdf.is_none() {
            self.status = "Сначала соберите актуальный PDF с внешним XeLaTeX".into();
            return;
        }
        let filename = self
            .document
            .path
            .as_deref()
            .and_then(|p| p.with_extension("pdf").file_name().map(|x| x.to_owned()))
            .and_then(|x| x.into_string().ok())
            .unwrap_or_else(|| "figure.pdf".into());
        let Some(path) = rfd::FileDialog::new()
            .add_filter("PDF", &["pdf"])
            .set_file_name(&filename)
            .save_file()
        else {
            self.status = "Выбор PDF отменён или XDG file portal недоступен".into();
            return;
        };
        if !path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("pdf"))
        {
            self.status = "Для экспорта выберите имя файла с расширением .pdf".into();
            return;
        }
        match write_new_pdf_without_overwrite(&path, self.pdf.as_deref().expect("checked above")) {
            Ok(()) => self.status = format!("Экспортирован PDF {}", path.display()),
            Err(error) => {
                self.status = format!(
                    "PDF не записан (существующий файл не заменяется): {}: {error}",
                    path.display()
                );
            }
        }
    }

    fn preview_stale(&self) -> bool {
        preview_is_stale(
            self.pdf.is_some(),
            self.last_build_failed,
            self.receiver.is_some(),
            self.built_source.as_deref(),
            &self.document.source,
            self.built_path.as_deref(),
            self.document.path.as_deref(),
        )
    }

    fn open_document_dialog(&mut self) {
        #[cfg(any(target_os = "windows", target_os = "macos"))]
        if let Some(path) = rfd::FileDialog::new()
            .add_filter("TeX & TikZ", &["tex", "tikz"])
            .pick_file()
        {
            self.open_path(path);
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        self.open_path(PathBuf::from(self.file_field.trim()));
    }

    fn build(&mut self) {
        if self.tex_discovery_rx.is_some() {
            self.status = "Проверка TeX ещё выполняется; исходник и справка доступны".into();
            return;
        }
        if self.receiver.is_some() {
            self.status = "XeLaTeX уже выполняет сборку; дождитесь завершения или отмените её".into();
            return;
        }
        let Some(xelatex) = self.tex.xelatex.clone() else {
            self.status =
                "XeLaTeX missing: install TeX Live/MiKTeX or set TIKZARIUM_XELATEX".into();
            return;
        };
        if self.document.path.is_none() {
            // A native Save As picker can be hidden behind an RDP window.
            // Make the necessary user decision explicit, visible and testable.
            self.pending_build = true;
            self.pending_build_save_path.clear();
            self.pending_build_validation_error = None;
            self.status = "Укажите путь нового .tex в окне «Сохранение перед сборкой»".into();
            return;
        }
        if !self.save() {
            return;
        }
        let Some(source) = self.document.path.clone() else {
            return;
        };
        let request = BuildRequest {
            source: source.clone(),
            xelatex,
            pdf_renderer: self.tex.pdf_renderer.clone(),
            options: BuildOptions::default(),
        };
        let (tx, rx) = mpsc::channel();
        let service = BuildService::new();
        let worker = service.clone();
        std::thread::spawn(move || {
            let _ = tx.send(worker.run(&request));
        });
        self.receiver = Some(rx);
        self.cancellation = Some(service);
        self.building_source = Some(self.document.source.clone());
        self.building_path = Some(source);
        self.status = "Compiling with XeLaTeX …".into();
    }

    fn poll_build(&mut self, ctx: &egui::Context) {
        let result = self
            .receiver
            .as_ref()
            .and_then(|receiver| match receiver.try_recv() {
                Ok(result) => Some(result),
                Err(TryRecvError::Empty) => None,
                Err(TryRecvError::Disconnected) => Some(Err(BuildError::Io(std::io::Error::new(
                    std::io::ErrorKind::BrokenPipe,
                    "Build worker disconnected",
                )))),
            });
        if let Some(result) = result {
            self.receiver = None;
            self.cancellation = None;
            let build_source = self.building_source.take();
            let build_path = self.building_path.take();
            match result {
                Ok(artifact) => {
                    self.preview_epoch = self.preview_epoch.wrapping_add(1);
                    self.page_index = 1;
                    self.page_count = None;
                    self.page_render_rx = None;
                    self.page_navigation_status = "Checking PDF page count via pdfinfo …".into();
                    self.page_count_rx =
                        Some(spawn_page_count(artifact.pdf.clone(), self.preview_epoch));
                    self.diagnostics = artifact.diagnostics.clone();
                    self.last_build_failed = false;
                    self.preview_texture = None;
                    self.preview_lod_texture = None;
                    self.preview_lod_rx = None;
                    self.preview_status = "Exact PDF created by XeLaTeX".into();
                    match artifact.preview {
                        Ok(Some(bitmap)) => match decode_preview_png(&bitmap.png) {
                            Ok(rgba) => {
                                let size = [rgba.width() as usize, rgba.height() as usize];
                                let color =
                                    egui::ColorImage::from_rgba_unmultiplied(size, rgba.as_raw());
                                self.preview_texture = Some(ctx.load_texture(
                                    "exact-pdf-page1",
                                    color,
                                    egui::TextureOptions::LINEAR,
                                ));
                                // Keep the full raster immediately available. A CPU Lanczos
                                // minification worker produces a separate texture for the
                                // compact PDF view without blocking egui's event thread.
                                self.preview_lod_rx = Some(spawn_preview_lod(
                                    rgba,
                                    self.preview_epoch,
                                    self.page_index,
                                ));
                            }
                            Err(error) => {
                                self.preview_status =
                                    format!("PDF ready; PNG decode failed: {error}")
                            }
                        },
                        Ok(None) => {
                            self.preview_status =
                                "PDF ready; install pdftoppm (Poppler) for inline preview".into()
                        }
                        Err(error) => {
                            self.preview_status = format!("PDF ready; rasterizer error: {error}")
                        }
                    }
                    self.log = artifact.log;
                    self.pdf = Some(artifact.pdf);
                    self.built_source = build_source;
                    self.built_path = build_path;
                    self.status = format!(
                        "Built in {:.2}s; {} inputs; {} diagnostics",
                        artifact.elapsed.as_secs_f64(),
                        artifact.dependencies.len(),
                        artifact.diagnostics.len()
                    );
                }
                Err(error) => {
                    self.last_build_failed = true;
                    self.diagnostics = error.diagnostics().to_vec();
                    if self.diagnostics.is_empty() {
                        self.diagnostics = vec![BuildDiagnostic {
                            severity: Severity::Error,
                            message: error.to_string(),
                            source: None,
                            line: None,
                        }];
                    }
                    self.bottom_view = BottomView::Issues;
                    self.show_log = true;
                    self.log = error
                        .log_excerpt()
                        .map(str::to_owned)
                        .unwrap_or_else(|| error.to_string());
                    self.preview_status = if self.pdf.is_some() {
                        "Build failed — last good PDF retained (stale)".into()
                    } else {
                        "Build failed — no PDF available".into()
                    };
                    let summary = error.to_string();
                    let first_line = summary.lines().next().unwrap_or("XeLaTeX error");
                    self.status = format!(
                        "Build failed: {}",
                        first_line.chars().take(160).collect::<String>()
                    );
                }
            }
        }
        if self.receiver.is_some() {
            ctx.request_repaint_after(Duration::from_millis(75));
        }
    }

    fn request_page(&mut self, page: usize) {
        if self.receiver.is_some()
            || self.page_render_rx.is_some()
            || !can_navigate(self.page_count, self.page_index, page)
        {
            return;
        }
        let Some(pdf) = self.pdf.clone() else {
            return;
        };
        self.page_navigation_status = format!("Rendering PDF page {page} …");
        self.page_render_rx = Some(spawn_page_render(
            pdf,
            page,
            self.tex.pdf_renderer.clone(),
            self.preview_epoch,
        ));
    }

    fn poll_pages(&mut self, ctx: &egui::Context) {
        let count_result = self
            .page_count_rx
            .as_ref()
            .and_then(|rx| match rx.try_recv() {
                Ok(result) => Some(result),
                Err(TryRecvError::Empty) => None,
                Err(TryRecvError::Disconnected) => Some((
                    self.preview_epoch,
                    Err("Page-count worker disconnected".into()),
                )),
            });
        if let Some((epoch, result)) = count_result {
            self.page_count_rx = None;
            if epoch == self.preview_epoch {
                match result {
                    Ok(total) => {
                        self.page_count = Some(total);
                        self.page_navigation_status = format!("PDF page count: {total}");
                    }
                    Err(error) => {
                        self.page_count = None;
                        self.page_navigation_status = format!("{error}; navigation NOT_CHECKED");
                    }
                }
            }
        }
        let render_result = self
            .page_render_rx
            .as_ref()
            .and_then(|rx| match rx.try_recv() {
                Ok(result) => Some(result),
                Err(TryRecvError::Empty) => None,
                Err(TryRecvError::Disconnected) => Some((
                    self.preview_epoch,
                    self.page_index,
                    Err("Page-render worker disconnected".into()),
                )),
            });
        if let Some((epoch, page, result)) = render_result {
            self.page_render_rx = None;
            if epoch == self.preview_epoch {
                match result.and_then(|png| decode_preview_png(&png)) {
                    Ok(rgba) => {
                        let size = [rgba.width() as usize, rgba.height() as usize];
                        let color = egui::ColorImage::from_rgba_unmultiplied(size, rgba.as_raw());
                        self.preview_texture = Some(ctx.load_texture(
                            format!("exact-pdf-page-{epoch}-{page}"),
                            color,
                            egui::TextureOptions::LINEAR,
                        ));
                        self.preview_lod_texture = None;
                        self.preview_lod_rx = Some(spawn_preview_lod(rgba, epoch, page));
                        self.page_index = page;
                        self.page_navigation_status = format!("Showing page {page}");
                    }
                    Err(error) => {
                        self.page_navigation_status =
                            format!("Page {page} preview failed: {error}; previous page retained");
                    }
                }
            }
        }
        if self.page_count_rx.is_some() || self.page_render_rx.is_some() {
            ctx.request_repaint_after(Duration::from_millis(75));
        }
    }

    fn poll_preview_lod(&mut self, ctx: &egui::Context) {
        let completed = self
            .preview_lod_rx
            .as_ref()
            .and_then(|rx| match rx.try_recv() {
                Ok(value) => Some(Some(value)),
                Err(TryRecvError::Empty) => None,
                Err(TryRecvError::Disconnected) => Some(None),
            });
        if let Some(result) = completed {
            self.preview_lod_rx = None;
            if let Some((epoch, page, Some(rgba))) = result
                && epoch == self.preview_epoch
                && page == self.page_index
            {
                let size = [rgba.width() as usize, rgba.height() as usize];
                let color = egui::ColorImage::from_rgba_unmultiplied(size, rgba.as_raw());
                self.preview_lod_texture = Some(ctx.load_texture(
                    format!("pdf-prefiltered-lod-{epoch}-{page}"),
                    color,
                    egui::TextureOptions::LINEAR,
                ));
                ctx.request_repaint();
            }
        }
        if self.preview_lod_rx.is_some() {
            ctx.request_repaint_after(Duration::from_millis(75));
        }
    }

    fn export(&mut self) {
        if self.preview_stale() {
            self.status = "PDF is stale: rebuild the current file before exporting".into();
            return;
        }
        let Some(pdf) = &self.pdf else {
            self.status = "No successful PDF to export".into();
            return;
        };
        let Some(source) = self.document.path.as_ref() else {
            self.status = "Save the TeX project first".into();
            return;
        };
        let target = source.with_extension("pdf");
        match std::fs::write(&target, pdf) {
            Ok(()) => self.status = format!("Exported {}", target.display()),
            Err(error) => self.status = format!("Export failed: {error}"),
        }
    }

    fn refresh_tex(&mut self, ctx: &egui::Context) {
        // One bounded discovery worker at a time; repeated clicks cannot fan out.
        if self.tex_discovery_rx.is_some() || self.receiver.is_some() {
            return;
        }
        let unknown = tex_discovery::Snapshot::unknown();
        self.tex = unknown.tex;
        self.package_statuses = unknown.packages;
        self.library_installation = unknown.libraries;
        self.tex_discovery_rx = Some(tex_discovery::start(ctx.clone()));
        self.status = "Проверка TeX в фоне; исходник и справка доступны".into();
    }

    fn poll_tex_discovery(&mut self, ctx: &egui::Context) {
        let result = self
            .tex_discovery_rx
            .as_ref()
            .and_then(|rx| match rx.try_recv() {
                Ok(result) => Some(result),
                Err(TryRecvError::Empty) => None,
                Err(TryRecvError::Disconnected) => {
                    Some(Err("Проверка TeX завершилась без результата".into()))
                }
            });
        if let Some(result) = result {
            self.tex_discovery_rx = None;
            match result {
                Ok(snapshot) => {
                    self.tex = snapshot.tex;
                    self.package_statuses = snapshot.packages;
                    self.library_installation = snapshot.libraries;
                    // Do not overwrite a newer user Save/Open/edit status.
                    if self.status.starts_with("Проверка TeX") {
                        self.status = format!(
                            "Проверка TeX завершена за {:.1} с; XeLaTeX: {:?}",
                            snapshot.elapsed.as_secs_f64(),
                            self.tex.xelatex
                        );
                    }
                }
                Err(error) => self.status = error,
            }
            ctx.request_repaint();
        }
        if self.tex_discovery_rx.is_some() {
            ctx.request_repaint_after(Duration::from_millis(100));
        }
    }
    fn show_source_editor(&mut self, ui: &mut egui::Ui) {
        if self.modal_active() {
            ui.disable();
        }
        ui.horizontal(|ui| {
            ui.strong("Исходник .tex");
            if self.document.dirty() {
                ui.colored_label(ui.visuals().warn_fg_color, "Изменён")
                    .on_hover_text("Несохранённые правки");
            }
            ui.with_layout(
                egui::Layout::right_to_left(egui::Align::Center),
                |ui| {
                    ui.checkbox(&mut self.prefs.source_soft_wrap, "Перенос")
                        .on_hover_text(
                            "Переносить длинные строки только на экране. Не меняет TeX, CRLF и PDF. Выключите для горизонтальной прокрутки.",
                        );
                },
            );
        });
        let basename = self
            .document
            .path
            .as_deref()
            .and_then(Path::file_name)
            .and_then(|name| name.to_str())
            .unwrap_or("figure.tex · новый документ");
        let path_description = self.document.path.as_ref().map_or_else(
            || "Новый TeX-документ — сохраните его явно".to_owned(),
            |path| path.display().to_string(),
        );
        ui.add(egui::Label::new(basename).truncate())
            .on_hover_text(path_description);
        ui.separator();
        egui::ScrollArea::new([!self.prefs.source_soft_wrap, true])
            .auto_shrink([false, false])
            .show(ui, |ui| {
                let mut output = show_source_text_edit(
                    ui,
                    &mut self.document.source,
                    &mut self.reset_source_editor_undo_history,
                    self.prefs.source_soft_wrap,
                );
                // Both the desktop and UNIT_EVENT frames handle the same
                // TextEdit change signal before visual Undo can be offered.
                tikz_canvas::observe_source_text_edit(
                    &output.response,
                    &mut self.authoring,
                    &self.document.source,
                );
                // A source click is an explicit return to editing. Keep the
                // floating palette out of the canvas/source work area; it can
                // be reopened from the icon rail at any time.
                dismiss_studio_palette_on_source_click(&output.response, &mut self.studio_group);
                if output.response.has_focus() {
                    self.source_caret = output.state.cursor.char_range().and_then(|range| {
                        (range.primary.index == range.secondary.index)
                            .then_some((range.primary.index, self.authoring.source_revision()))
                    });
                }
                if let Some(line) = self.jump_to_line.take() {
                    if let Some(position) = line_start_char_index(&self.document.source, line) {
                        use egui::text::{CCursor, CCursorRange};
                        output.state.cursor.set_char_range(Some(
                            if self.highlight_generated_line {
                                let count = self
                                    .document
                                    .source
                                    .lines()
                                    .nth(line.saturating_sub(1))
                                    .map(|text| text.trim_end_matches('\r').chars().count())
                                    .unwrap_or(0);
                                CCursorRange::two(
                                    CCursor::new(position),
                                    CCursor::new(position + count),
                                )
                            } else {
                                CCursorRange::one(CCursor::new(position))
                            },
                        ));
                        self.highlight_generated_line = false;
                        output.state.store(ui.ctx(), output.response.id);
                        // Scroll/highlight without stealing keyboard focus.
                        // A new guide gesture must own Ctrl/Cmd+Z until its
                        // mouse-up; users click the source to edit text.
                        // The galley, not physical line count * font height,
                        // owns TextEdit's geometry (wrapping, padding, DPI,
                        // unicode and font layout). Scroll to the actual cursor.
                        ui.scroll_to_rect(
                            source_caret_target(&output.galley, output.galley_pos, position),
                            Some(egui::Align::Center),
                        );
                    } else {
                        self.status = format!("Line {line} is outside this document");
                    }
                }
            });
    }

    fn primitive_capabilities(&self) -> tikz_canvas::Capabilities {
        let core = self
            .package_statuses
            .iter()
            .find(|status| status.manifest.id == "org.tikzarium.core");
        tikz_canvas::Capabilities {
            installed: core.is_some_and(|status| status.installed),
            loaded: tikzarium_extensions::project_imports::inspect(&self.document.source).status(
                tikzarium_extensions::project_imports::ImportKind::Package,
                "tikz",
            ),
            engine_compatible: self.tex.xelatex.is_some()
                && core.is_some_and(|status| {
                    status.compilation != tikzarium_extensions::CompilationState::IncompatibleEngine
                }),
            implemented: true, // Only B07's six explicitly narrow built-in primitives.
        }
    }

    fn show_authoring_inspector(&mut self, ui: &mut egui::Ui) {
        let previous_revision = self.authoring.source_revision();
        tikz_libraries::show_help_search(ui, &mut self.help_query);
        if let Some(line) = tikz_libraries::show_library_panel(
            ui,
            &mut self.authoring,
            &mut self.document.source,
            self.tex.xelatex.is_some(),
            &self.library_installation,
        ) {
            self.jump_to_line = Some(line);
            self.highlight_generated_line = true;
        }
        ui.separator();
        let caps = self.primitive_capabilities();
        if let Some(line) =
            tikz_canvas::show_inspector(ui, &mut self.authoring, &mut self.document.source, caps)
        {
            self.jump_to_line = Some(line);
            self.highlight_generated_line = true;
        }
        if self.show_packages {
            ui.separator();
            ui.collapsing("Library inventory · from C registry", |ui| {
                for item in &self.package_statuses {
                    ui.strong(&item.manifest.display_name);
                    ui.small(format!(
                        "installed={:?}, compilation={:?}, inspectable={}, editable={}",
                        item.installation, item.compilation, item.inspectable, item.visual_editable,
                    ));
                }
            });
        }
        fence_source_editor_undo_on_revision_change(
            previous_revision,
            &self.authoring,
            &mut self.reset_source_editor_undo_history,
        );
    }

    /// The main toolbar is four clear vector icons, not a long wall of
    /// textual action buttons. Infrequent commands live in two menus.
    fn show_studio_toolbar(&mut self, ctx: &egui::Context) {
        let ready = self.receiver.is_none() && !self.modal_active();
        egui::TopBottomPanel::top("b42-studio-toolbar").show(ctx, |ui| {
            if self.modal_active() {
                ui.disable();
            }
            ui.horizontal(|ui| {
                ui.strong(egui::RichText::new("TikZarium").size(20.0));
                ui.separator();
                if studio_ui::icon_button(ui, StudioIcon::Open, false, 34.0, "Открыть TeX · Ctrl+O")
                    .clicked()
                    && ready
                {
                    self.open_document_dialog();
                }
                if studio_ui::icon_button(
                    ui,
                    StudioIcon::Save,
                    false,
                    34.0,
                    "Сохранить исходник · Ctrl+S",
                )
                .clicked()
                    && ready
                {
                    self.save();
                }
                if studio_ui::icon_button(
                    ui,
                    StudioIcon::Build,
                    self.receiver.is_some(),
                    34.0,
                    "Собрать точный PDF через внешний XeLaTeX · Ctrl+Enter",
                )
                .clicked()
                    && ready
                {
                    self.build();
                }
                if studio_ui::icon_button(
                    ui,
                    StudioIcon::Export,
                    false,
                    34.0,
                    "Экспорт PDF. Только актуальный результат XeLaTeX.",
                )
                .clicked()
                    && self.pdf.is_some()
                    && !self.preview_stale()
                {
                    self.export();
                }
                if self.receiver.is_some()
                    && ui
                        .small_button("■")
                        .on_hover_text("Отменить сборку")
                        .clicked()
                    && let Some(cancel) = &self.cancellation
                {
                    cancel.cancel();
                }
                ui.separator();
                match show_studio_file_menu(ui, &mut self.file_field, ready).action {
                    Some(StudioFileAction::OpenPath) => {
                        self.open_path(PathBuf::from(self.file_field.trim()));
                    }
                    Some(StudioFileAction::SaveAs) => {
                        self.save_as();
                    }
                    Some(StudioFileAction::OpenPicker) => self.open_document_picker(),
                    Some(StudioFileAction::SavePicker) => {
                        self.save_as_picker();
                    }
                    Some(StudioFileAction::ExportPicker) => self.export_pdf_picker(),
                    None => {}
                }
                ui.menu_button("Вид", |ui| {
                    if ui
                        .checkbox(&mut self.prefs.studio_tool_rail, "Группы инструментов")
                        .changed()
                        && !self.prefs.studio_tool_rail
                    {
                        // A hidden rail must not leave a floating tool palette.
                        self.studio_group = None;
                    }
                    ui.checkbox(&mut self.prefs.studio_inspector_open, "Инспектор");
                    ui.checkbox(&mut self.prefs.studio_console_open, "Диагностика");
                    ui.separator();
                    self.prefs.draw_toolbar(ui, ctx);
                    if ui.button("Классический режим").clicked() {
                        self.prefs.studio_mode = false;
                        ui.close();
                    }
                    if ui.button("Шрифты рисунка").clicked() {
                        self.prefs.show_font_lab = true;
                        ui.close();
                    }
                });
                if studio_ui::icon_button(
                    ui,
                    StudioIcon::Help,
                    self.prefs.studio_dock == StudioDock::Help && self.prefs.studio_inspector_open,
                    32.0,
                    "Контекстная справка F1 из общего TikZ-каталога",
                )
                .clicked()
                {
                    studio_ui::toggle_studio_help_button(
                        &mut self.authoring,
                        &mut self.prefs.studio_dock,
                        &mut self.prefs.studio_inspector_open,
                    );
                }
                if studio_ui::icon_button(
                    ui,
                    StudioIcon::Console,
                    self.prefs.studio_console_open,
                    32.0,
                    "Показать или скрыть диагностику и журнал XeLaTeX",
                )
                .clicked()
                {
                    self.prefs.studio_console_open = !self.prefs.studio_console_open;
                }
            });
            ui.horizontal(|ui| {
                let prior_focus = self.pdf_focus_in_split;
                ui.selectable_value(&mut self.pdf_focus_in_split, false, "Эскиз");
                ui.selectable_value(&mut self.pdf_focus_in_split, true, "PDF");
                if self.pdf_focus_in_split && !prior_focus {
                    self.fit_page_active = true;
                    self.authoring.cancelled_pointer_capture |=
                        self.authoring.guide_pointer_armed || self.authoring.drag_start.is_some();
                    self.authoring.guide_pointer_armed = false;
                    self.authoring.drag_start = None;
                    self.authoring.alt_selection_capture = false;
                }
                ui.separator();
                let filename = self
                    .document
                    .path
                    .as_ref()
                    .map_or_else(|| "Новый .tex".to_owned(), |p| p.display().to_string());
                ui.add(egui::Label::new(filename).truncate());
                if self.document.dirty() {
                    ui.colored_label(ui.visuals().warn_fg_color, "● Изменено");
                }
                if self.preview_stale() {
                    ui.colored_label(ui.visuals().warn_fg_color, "PDF устарел");
                }
            });
        });
    }

    /// One contextual dock at a time. Unlike the legacy UI, library inventory,
    /// parameter editing and full help do not stack into one endless scroll.
    fn show_studio_inspector(&mut self, ui: &mut egui::Ui) {
        ui.horizontal(|ui| {
            for tab in StudioDock::ALL {
                ui.selectable_value(&mut self.prefs.studio_dock, tab, tab.label());
            }
        });
        ui.separator();
        if self.authoring.active.is_some() || self.authoring.undo_available() {
            let prior = self.authoring.source_revision();
            if let Some(line) = tikz_canvas::show_inspector_action_bar(
                ui,
                &mut self.authoring,
                &mut self.document.source,
            ) {
                self.jump_to_line = Some(line);
                self.highlight_generated_line = true;
            }
            fence_source_editor_undo_on_revision_change(
                prior,
                &self.authoring,
                &mut self.reset_source_editor_undo_history,
            );
            ui.separator();
        }
        egui::ScrollArea::vertical()
            .auto_shrink([false, false])
            .show(ui, |ui| match self.prefs.studio_dock {
                StudioDock::Properties => {
                    if self.authoring.active.is_none() {
                        ui.heading("Выберите инструмент");
                        ui.label("Нажмите на группу иконок слева, затем выберите команду TikZ.");
                        ui.small("Параметры и примеры появятся здесь из единого каталога.");
                        ui.separator();
                        ui.small("Исходный .tex остаётся редактируемым. Точный результат — внешний XeLaTeX.");
                    } else {
                        let prior = self.authoring.source_revision();
                        let caps = self.primitive_capabilities();
                        if let Some(line) = tikz_canvas::show_inspector(
                            ui,
                            &mut self.authoring,
                            &mut self.document.source,
                            caps,
                        ) {
                            self.jump_to_line = Some(line);
                            self.highlight_generated_line = true;
                        }
                        fence_source_editor_undo_on_revision_change(
                            prior,
                            &self.authoring,
                            &mut self.reset_source_editor_undo_history,
                        );
                    }
                }
                StudioDock::Libraries => {
                    ui.heading("Библиотеки проекта");
                    ui.small("Подключение — показанная обратимая правка преамбулы; не установка.");
                    let prior = self.authoring.source_revision();
                    if let Some(line) = tikz_libraries::show_library_panel(
                        ui,
                        &mut self.authoring,
                        &mut self.document.source,
                        self.tex.xelatex.is_some(),
                        &self.library_installation,
                    ) {
                        self.jump_to_line = Some(line);
                        self.highlight_generated_line = true;
                    }
                    fence_source_editor_undo_on_revision_change(
                        prior,
                        &self.authoring,
                        &mut self.reset_source_editor_undo_history,
                    );
                    ui.collapsing("Реестр доступности пакетов", |ui| {
                        for item in &self.package_statuses {
                            ui.strong(&item.manifest.display_name);
                            ui.small(format!(
                                "Установка: {:?} · XeLaTeX: {:?} · GUI-адаптер: {}",
                                item.installation,
                                item.compilation,
                                if item.visual_editable {
                                    "да"
                                } else {
                                    "нет"
                                }
                            ));
                        }
                    });
                }
                StudioDock::Help => {
                    // Avoid a second generic "choose a tool" help card after a
                    // successful caret lookup; the user's source is the context.
                    let mut source_parameter_help_shown = false;
                    if let Some((caret, revision)) = self.source_caret {
                        // Source parameter F1 is read-only and must not steal
                        // or replace the existing library-name completion.
                        if revision == self.authoring.source_revision() {
                            let caps = self.primitive_capabilities();
                            source_parameter_help_shown =
                                show_source_parameter_help(ui, &self.document.source, caret, caps);
                            if source_parameter_help_shown {
                                ui.separator();
                            }
                        }
                        let prior = self.authoring.source_revision();
                        if let Some(line) = tikz_libraries::show_source_caret_completion(
                            ui, &mut self.authoring, &mut self.document.source,
                            caret, revision, self.tex.xelatex.is_some(),
                            &self.library_installation,
                        ) {
                            self.jump_to_line = Some(line);
                            self.highlight_generated_line = true;
                            self.source_caret = None;
                        }
                        fence_source_editor_undo_on_revision_change(
                            prior, &self.authoring, &mut self.reset_source_editor_undo_history,
                        );
                        ui.separator();
                    }
                    tikz_libraries::show_help_search(ui, &mut self.help_query);
                    if !source_parameter_help_shown {
                        ui.separator();
                        studio_ui::show_context_help(ui, &self.authoring);
                    }
                }
            });
    }

    fn show_pdf_canvas(&mut self, ui: &mut egui::Ui) {
        // Studio uses the full central area for ONE primary task: interactive
        // TikZ authoring OR exact PDF. The previous 170pt pad above a huge
        // empty preview was the principal ergonomic failure on 1366x768.
        // Both modes keep the original editable code pane alongside them.
        if self.prefs.studio_mode && !self.pdf_focus_in_split {
            let prior = self.authoring.source_revision();
            let caps = self.primitive_capabilities();
            if let Some(line) = tikz_canvas::show_guide_studio(
                ui,
                &mut self.authoring,
                &mut self.document.source,
                caps,
            ) {
                self.jump_to_line = Some(line);
                self.highlight_generated_line = true;
                ui.ctx().request_repaint();
            }
            fence_source_editor_undo_on_revision_change(
                prior,
                &self.authoring,
                &mut self.reset_source_editor_undo_history,
            );
            ui.separator();
            ui.small("Интерактивный эскиз TikZ. Точная геометрия и шрифты — во вкладке PDF после XeLaTeX.");
            return;
        }
        let canvas_width = ui.available_width();
        let mut displayed_zoom_percent = pdf_zoom_percent(self.zoom);
        ui.horizontal_wrapped(|ui| {
            ui.heading(if self.prefs.studio_mode {
                "Рисунок / PDF"
            } else {
                "Canvas · exact PDF (read-only)"
            });
            if self.workspace == WorkspaceMode::Split && !self.prefs.studio_mode {
                ui.label("Центр:");
                show_split_center_focus_switch(
                    ui,
                    &mut self.pdf_focus_in_split,
                    &mut self.authoring,
                    &mut self.fit_page_active,
                );
            }
            let page_controls = self.receiver.is_none()
                && self.page_render_rx.is_none()
                && self.tex.pdf_renderer.is_some();
            let previous = self.page_index.saturating_sub(1);
            if ui
                .add_enabled(
                    page_controls && can_navigate(self.page_count, self.page_index, previous),
                    egui::Button::new("◀ Prev"),
                )
                .clicked()
            {
                self.request_page(previous);
            }
            ui.strong(match self.page_count {
                Some(total) => format!("Page {} / {total}", self.page_index),
                None => format!("Page {} / ?", self.page_index),
            });
            let next = self.page_index.saturating_add(1);
            if ui
                .add_enabled(
                    page_controls && can_navigate(self.page_count, self.page_index, next),
                    egui::Button::new("Next ▶"),
                )
                .clicked()
            {
                self.request_page(next);
            }
            if ui.button("−").clicked() {
                self.fit_page_active = false;
                self.zoom = scaled_zoom(self.zoom, 1.0 / 1.2);
            }
            displayed_zoom_percent = pdf_zoom_percent(self.zoom);
            ui.label(format!("{displayed_zoom_percent}%"));
            if ui.button("+").clicked() {
                self.fit_page_active = false;
                self.zoom = scaled_zoom(self.zoom, 1.2);
            }
            if ui.button("100%").clicked() {
                self.fit_page_active = false;
                self.zoom = 1.0;
            }
            let fit = self.preview_texture.as_ref().and_then(|texture| {
                fit_width_zoom(texture.size_vec2().x, canvas_width)
            });
            if ui
                .add_enabled(fit.is_some(), egui::Button::new("Fit width"))
                .on_hover_text("Подогнать точный PDF по реальной ширине области просмотра; допускается масштаб меньше 20% в компактном окне. Не меняет исходный TikZ.")
                .clicked()
                && let Some(fit) = fit
            {
                self.fit_page_active = false;
                self.zoom = fit;
            }
            show_fit_page_button(
                ui,
                self.preview_texture.is_some(),
                &mut self.fit_page_active,
            );
        });
        if self.preview_stale() {
            ui.colored_label(
                egui::Color32::YELLOW,
                "STALE · last successful PDF, not current source",
            );
        }
        ui.label(&self.preview_status);
        ui.small(&self.page_navigation_status);
        if !self.prefs.studio_mode {
            ui.small("The guide pad edits N1-owned source through the shared TikZ catalogue. This exact PDF is read-only and is NOT coordinate-aligned with the guide.");
        }
        if self.workspace == WorkspaceMode::Split && !self.pdf_focus_in_split {
            let caps = self.primitive_capabilities();
            let previous_revision = self.authoring.source_revision();
            let inserted = if self.prefs.studio_mode {
                tikz_canvas::show_guide_studio(
                    ui,
                    &mut self.authoring,
                    &mut self.document.source,
                    caps,
                )
            } else {
                tikz_canvas::show_guide(ui, &mut self.authoring, &mut self.document.source, caps)
            };
            if let Some(line) = inserted {
                self.jump_to_line = Some(line);
                self.highlight_generated_line = true;
                // The source SidePanel has already been rendered this frame.
                // Schedule a second frame so the created TikZ command is focused
                // and highlighted without requiring another mouse interaction.
                ui.ctx().request_repaint();
            }
            fence_source_editor_undo_on_revision_change(
                previous_revision,
                &self.authoring,
                &mut self.reset_source_editor_undo_history,
            );
        } else if self.workspace == WorkspaceMode::Split {
            ui.small("Точный PDF занимает центральную область. Код и свойства остаются видимыми; для нового жеста выберите «Рисовать TikZ».");
        } else {
            ui.label("Canvas: только просмотр. Рисование требует кода рядом.");
            if ui.button("Рисовать TikZ — показать код рядом").clicked() {
                self.workspace = WorkspaceMode::Split;
                self.pdf_focus_in_split = false;
            }
        }
        ui.separator();
        // Refit on *every* frame while selected, including a newly rasterized
        // page or a resized Split. A manual zoom action above leaves this mode.
        let fit_unavailable = refit_selected_page(
            self.fit_page_active,
            self.preview_texture
                .as_ref()
                .map(|texture| texture.size_vec2()),
            ui.available_size(),
            &mut self.zoom,
        );
        // The toolbar above has already painted its percentage. A late
        // auto-fit (or a subsequent +/-/Fit width click) changes the PDF
        // raster scale this frame; repaint the label on the next frame.
        // Avoid permanent redraws when the rounded percentage is unchanged.
        repaint_if_pdf_zoom_label_stale(ui.ctx(), displayed_zoom_percent, self.zoom);
        // Fit failure belongs to the current viewport only. Never persist
        // it in the top-level Build/Save status: a later successful refit must
        // not keep showing the obsolete "2%" error (I51 X11 screenshot).
        if let Some(warning) = page_fit_warning(fit_unavailable) {
            ui.colored_label(ui.visuals().warn_fg_color, warning);
        }
        egui::ScrollArea::both()
            .auto_shrink([false, false])
            .show(ui, |ui| {
                if let Some(texture) = &self.preview_texture {
                    let _ =
                        show_pdf_raster(ui, texture, self.preview_lod_texture.as_ref(), self.zoom);
                } else {
                    ui.vertical_centered(|ui| {
                        ui.add_space(48.0);
                        ui.label("Build a TeX project to show the first PDF page.");
                        ui.small(
                            "XeLaTeX creates the exact PDF; optional pdftoppm rasterizes page 1.",
                        );
                        if let Some(pdf) = &self.pdf {
                            ui.label(format!(
                                "PDF retained in memory: {} bytes. Use Export PDF.",
                                pdf.len()
                            ));
                        }
                    });
                }
            });
    }
    fn begin_font_proof(&mut self) {
        if self.font_proof_rx.is_some() {
            return;
        }
        self.font_proof_texture = None;
        self.font_proof_report.clear();
        self.font_proof_status = "Checking fontspec + unicode-math via XeLaTeX …".into();
        self.font_proof_rx = Some(spawn_font_proof(
            self.prefs.figure_fonts(),
            self.tex.xelatex.clone(),
            self.tex.pdf_renderer.clone(),
        ));
    }

    fn poll_font_proof(&mut self, ctx: &egui::Context) {
        let result = self
            .font_proof_rx
            .as_ref()
            .and_then(|rx| match rx.try_recv() {
                Ok(value) => Some(value),
                Err(TryRecvError::Empty) => None,
                Err(TryRecvError::Disconnected) => {
                    Some(Err("Font proof worker disconnected".into()))
                }
            });
        if let Some(result) = result {
            self.font_proof_rx = None;
            match result {
                Ok(proof) => {
                    if !proof.verified {
                        self.status = "Typography proof is not verified; see Figure fonts".into();
                    }
                    self.font_proof_status = proof.description;
                    self.font_proof_report = proof.font_report;
                    if let Some(bytes) = proof.preview_png {
                        match decode_preview_png(&bytes) {
                            Ok(rgba) => {
                                let size = [rgba.width() as usize, rgba.height() as usize];
                                let color =
                                    egui::ColorImage::from_rgba_unmultiplied(size, rgba.as_raw());
                                self.font_proof_texture = Some(ctx.load_texture(
                                    "exact-figure-font-proof",
                                    color,
                                    egui::TextureOptions::LINEAR,
                                ));
                            }
                            Err(error) => {
                                self.font_proof_report
                                    .push_str(&format!("\nPreview decode: {error}"));
                            }
                        }
                    }
                }
                Err(error) => {
                    self.font_proof_status = format!("Font proof failed: {error}");
                    self.font_proof_report = "No font compatibility claim was made.".into();
                }
            }
        }
        if self.font_proof_rx.is_some() {
            ctx.request_repaint_after(Duration::from_millis(80));
        }
    }

    fn show_font_lab(&mut self, ctx: &egui::Context) {
        if !self.prefs.show_font_lab {
            return;
        }
        let mut open = true;
        egui::Window::new("Figure typography · XeLaTeX")
            .open(&mut open)
            .resizable(true)
            .default_size(egui::vec2(580.0, 520.0))
            .show(ctx, |ui| {
                ui.label("Text and math families used inside TikZ figures, not the GUI font.");
                ui.small("Names require installed system/TeX fonts; absence is an error, never a silent substitute.");
                ui.horizontal(|ui| {
                    ui.label("Text:");
                    ui.text_edit_singleline(&mut self.prefs.text_family);
                });
                ui.horizontal(|ui| {
                    ui.label("Sans:");
                    ui.text_edit_singleline(&mut self.prefs.sans_family);
                });
                ui.horizontal(|ui| {
                    ui.label("Math:");
                    ui.text_edit_singleline(&mut self.prefs.math_font);
                });
                ui.small("Example: DejaVu Serif · DejaVu Sans · latinmodern-math.otf");
                egui::CollapsingHeader::new("Current source · font references")
                    .default_open(true)
                    .show(ui, |ui| {
                        ui.small("Read-only source hints; not expanded TeX macros, installed-font verification or the effective font of each TikZ node.");
                        let hints = scan_explicit_font_hints(&self.document.source);
                        egui::ScrollArea::vertical().max_height(105.0).show(ui, |ui| {
                            if hints.is_empty() {
                                ui.label("No explicit fontspec/unicode-math declarations detected.");
                            }
                            for hint in hints.iter().take(40) {
                                let display_family = hint.family.chars().take(75).collect::<String>();
                                let label = format!(
                                    "Line {} · \\{} · {}",
                                    hint.line, hint.command, display_family
                                );
                                if ui.button(label).clicked() {
                                    self.jump_to_line = Some(hint.line);
                                    if !self.workspace.show_source() {
                                        self.workspace = WorkspaceMode::Split;
                                    }
                                }
                            }
                            if hints.len() > 40 {
                                ui.small(format!("{} more hints omitted from the list", hints.len() - 40));
                            }
                        });
                    });
                ui.horizontal_wrapped(|ui| {
                    if ui.button("Copy preamble").clicked() {
                        match self.prefs.figure_fonts().preamble() {
                            Ok(source) => ui.ctx().copy_text(source),
                            Err(error) => self.font_proof_status = format!("Invalid family: {error}"),
                        }
                    }
                    if ui.button("Copy literal-text node").clicked() {
                        match self.prefs.figure_fonts().example_node("Привет, мир! — Геометрия") {
                            Ok(source) => ui.ctx().copy_text(source),
                            Err(error) => self.font_proof_status = format!("Invalid family: {error}"),
                        }
                    }
                    if ui.button("Copy proof .tex").clicked() {
                        match self.prefs.figure_fonts().proof_source() {
                            Ok(source) => ui.ctx().copy_text(source),
                            Err(error) => self.font_proof_status = format!("Invalid family: {error}"),
                        }
                    }
                });
                if ui.add_enabled(
                    self.font_proof_rx.is_none(),
                    egui::Button::new("Verify fonts via XeLaTeX")
                ).clicked() {
                    self.begin_font_proof();
                }
                ui.strong(&self.font_proof_status);
                ui.small("Proof is separate from the active document. PDF glyph extraction needs pdftotext; font embedding needs pdffonts.");
                egui::ScrollArea::vertical().max_height(150.0).show(ui, |ui| {
                    if let Some(texture) = &self.font_proof_texture {
                        ui.image((texture.id(), texture.size_vec2() * 0.45));
                    }
                });
                ui.separator();
                egui::ScrollArea::both().max_height(150.0).show(ui, |ui| {
                    ui.add(egui::TextEdit::multiline(&mut self.font_proof_report)
                        .font(egui::TextStyle::Monospace)
                        .desired_width(f32::INFINITY)
                        .desired_rows(7)
                        .interactive(false));
                });
            });
        self.prefs.show_font_lab = open;
    }
}

/// Reserve the Studio status row before any side/central panel consumes the
/// remaining viewport. The bottom bar is full width, and on-demand diagnostics
/// stack ABOVE it; editable source and provisional guide cannot render beneath
/// an after-the-fact CentralPanel overlay.
fn show_studio_status_panel(ctx: &egui::Context, status: &str, xelatex_ready: bool) -> egui::Rect {
    egui::TopBottomPanel::bottom("b42-status")
        .show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.label(egui::RichText::new(status).small());
                if xelatex_ready {
                    ui.small("XeLaTeX: настроен");
                } else {
                    ui.colored_label(ui.visuals().warn_fg_color, "XeLaTeX не выбран");
                }
            });
        })
        .response
        .rect
}

/// Persistent visual privilege notice on native GUI PE2, in Studio and classic modes.
fn show_current_user_privilege_banner(ctx: &egui::Context, notice: &str) -> egui::Rect {
    egui::TopBottomPanel::top("windows-current-user-privilege-warning")
        .show(ctx, |ui| {
            ui.colored_label(
                ui.visuals().warn_fg_color,
                egui::RichText::new(notice).strong(),
            );
        })
        .response
        .rect
}

/// The five states are independent. A boolean capability can only prove
/// CONFIRMED or NOT CONFIRMED; never promote missing evidence to "absent".
/// The exact C-owned HelpEntry::Parameter itself proves help availability.
fn source_help_evidence_rows(caps: tikz_canvas::Capabilities) -> [(&'static str, &'static str); 5] {
    let confirmed = |value| {
        if value {
            "ПОДТВЕРЖДЕНО"
        } else {
            "НЕ ПОДТВЕРЖДЕНО"
        }
    };
    let loaded = match caps.loaded {
        Evidence::Confirmed => "ПОДТВЕРЖДЕНО",
        Evidence::Absent => "НЕТ ПРЯМОГО ПОДКЛЮЧЕНИЯ",
        Evidence::Unknown => "UNKNOWN",
    };
    [
        ("Установлен", confirmed(caps.installed)),
        ("Подключён в проекте", loaded),
        ("XeLaTeX совместим", confirmed(caps.engine_compatible)),
        ("GUI-инструмент", confirmed(caps.implemented)),
        ("Русская справка", "ПОДТВЕРЖДЕНО"),
    ]
}

/// Read-only F1 parameter help directly under the source TextEdit caret.
fn show_source_parameter_help(
    ui: &mut egui::Ui,
    source: &str,
    caret_chars: usize,
    caps: tikz_canvas::Capabilities,
) -> bool {
    let catalog = tikz_authoring::catalog();
    let Some(hit) =
        tikzarium_extensions::source_assist::parameter_caret(source, caret_chars, catalog)
    else {
        return false;
    };
    let key = format!("{}:{}", hit.tool_id, hit.parameter_id);
    let Some(tikzarium_extensions::help_search::HelpEntry::Parameter(tool, parameter)) =
        tikzarium_extensions::help_search::exact(catalog, &key)
    else {
        return false;
    };
    ui.heading("Параметр TikZ под курсором");
    ui.strong(format!("{} · {}", tool.title_ru, parameter.id));
    ui.label(&parameter.help_ru);
    ui.strong("Синтаксис");
    ui.code(&parameter.syntax);
    // Use readable body text and separate lines in the narrow right dock.
    // The former 12pt run-on line was barely legible at real 1366×768.
    ui.label(format!("Тип: {}", parameter.kind));
    ui.label(format!(
        "Единицы: {}",
        if parameter.units.is_empty() {
            "—".to_owned()
        } else {
            parameter.units.join(", ")
        }
    ));
    ui.label(format!(
        "Допустимые значения: {}",
        if parameter.allowed_values.is_empty() {
            "UNKNOWN / свободный ввод".to_owned()
        } else {
            parameter.allowed_values.join(", ")
        }
    ));
    if parameter.default_provenance == "editor_preset" {
        ui.label(format!(
            "Пресет редактора: {} (это НЕ default TikZ)",
            parameter.default
        ));
    } else {
        ui.label("Default TikZ: UNKNOWN");
    }
    ui.label(&parameter.interaction_ru);
    ui.label(&parameter.warning_ru);
    ui.label("Пример");
    ui.code(&parameter.example);
    ui.hyperlink_to(
        format!("PGF/TikZ §{}", parameter.manual_section),
        &parameter.manual_url,
    );
    ui.label(format!(
        "Источник: C-каталог {} · PGF {}",
        tool.id, tool.requirements.documented_against,
    ));
    ui.label(format!("Пакеты: {}", tool.requirements.packages.join(", ")));
    ui.separator();
    ui.strong("Доступность · пять независимых статусов");
    for (name, status) in source_help_evidence_rows(caps) {
        ui.horizontal_wrapped(|ui| {
            ui.label(format!("{name}:"));
            ui.strong(status);
        });
    }
    ui.small("Наличие пакета и совместимость ещё не доказывают успешную сборку PDF.");
    true
}

impl eframe::App for TikzariumApp {
    fn save(&mut self, storage: &mut dyn eframe::Storage) {
        eframe::set_value(storage, STORAGE_KEY, &self.prefs);
    }

    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.poll_tex_discovery(ctx);
        // A persisted or new native window can be too large at fractional DPI.
        let fitted = ctx.input(|input| {
            let viewport = input.viewport();
            fit_oversized_window(
                viewport.monitor_size?,
                viewport.inner_rect?.size(),
                viewport.outer_rect?.size(),
            )
        });
        if let Some(size) = fitted {
            if self.viewport_fit_requested != Some(size) {
                ctx.send_viewport_cmd(egui::ViewportCommand::InnerSize(size));
                self.viewport_fit_requested = Some(size);
            }
        } else {
            self.viewport_fit_requested = None;
        }
        self.intercept_close(ctx);
        self.poll_build(ctx);
        self.poll_pages(ctx);
        self.poll_preview_lod(ctx);
        self.poll_font_proof(ctx);
        self.show_font_lab(ctx);
        // Pending dirty-Open decisions own the keyboard: do not change source
        // through a global help/visual Undo shortcut behind the modal.
        if !self.modal_active() {
            let had_help = self.authoring.help;
            tikz_canvas::handle_help_shortcut(ctx, &mut self.authoring);
            if self.prefs.studio_mode {
                studio_ui::route_studio_help_toggle(
                    had_help,
                    self.authoring.help,
                    &mut self.prefs.studio_dock,
                    &mut self.prefs.studio_inspector_open,
                );
            }
            if self.workspace == WorkspaceMode::Split
                && let Some(line) = tikz_canvas::handle_visual_undo_shortcut(
                    ctx,
                    &mut self.authoring,
                    &mut self.document.source,
                )
            {
                self.jump_to_line = Some(line);
                self.highlight_generated_line = true;
                self.reset_source_editor_undo_history = true;
            }
        }
        // Read modifiers from EACH key-down event. A real, short X11 Ctrl+O
        // press and release may be coalesced into a single frame, leaving
        // input.modifiers.command=false even though the O event was Ctrl+O.
        let shortcut = ctx.input(|input| editor_command_from_events(&input.events));
        // A modal or running XeLaTeX run must not change the active file mid-build.
        if self.receiver.is_none() && !self.modal_active() {
            match shortcut {
                Some(EditorCommand::Open) => self.open_document_dialog(),
                Some(EditorCommand::Save) => {
                    self.save();
                }
                Some(EditorCommand::SaveAs) => {
                    self.save_as();
                }
                Some(EditorCommand::Build) => self.build(),
                None => {}
            }
        }
        let file_actions_enabled = self.receiver.is_none() && !self.modal_active();
        if self.prefs.studio_mode {
            self.workspace = WorkspaceMode::Split;
            self.show_studio_toolbar(ctx);
        } else {
            egui::TopBottomPanel::top("tools").show(ctx, |ui| {
                if self.modal_active() {
                    ui.disable();
                }
                ui.horizontal_wrapped(|ui| {
                    ui.heading("TikZarium");
                    if ui
                        .add_enabled(file_actions_enabled, egui::Button::new("Open"))
                        .on_hover_text("Ctrl+O / Cmd+O")
                        .clicked()
                    {
                        self.open_document_dialog();
                    }
                    ui.label("Path:");
                    ui.add(
                        egui::TextEdit::singleline(&mut self.file_field)
                            .desired_width(280.0)
                            .hint_text("path/to/figure.tex"),
                    );
                    if ui
                        .add_enabled(file_actions_enabled, egui::Button::new("Open path"))
                        .clicked()
                    {
                        self.open_path(PathBuf::from(self.file_field.trim()));
                    }
                    if ui
                        .add_enabled(file_actions_enabled, egui::Button::new("Save"))
                        .on_hover_text("Ctrl+S / Cmd+S")
                        .clicked()
                    {
                        self.save();
                    }
                    if ui
                        .add_enabled(file_actions_enabled, egui::Button::new("Save As…"))
                        .on_hover_text("Ctrl+Shift+S / Cmd+Shift+S")
                        .clicked()
                    {
                        self.save_as();
                    }
                    if ui
                        .add_enabled(file_actions_enabled, egui::Button::new("Build (XeLaTeX)"))
                        .on_hover_text("Ctrl+Enter / Cmd+Enter")
                        .clicked()
                    {
                        self.build();
                    }
                    if ui
                        .add_enabled(self.receiver.is_some(), egui::Button::new("Cancel"))
                        .clicked()
                        && let Some(cancel) = &self.cancellation
                    {
                        cancel.cancel();
                    }
                    if ui
                        .add_enabled(
                            self.pdf.is_some() && !self.preview_stale(),
                            egui::Button::new("Export PDF"),
                        )
                        .clicked()
                    {
                        self.export();
                    }
                    if ui
                        .add_enabled(self.receiver.is_none(), egui::Button::new("Discover TeX"))
                        .clicked()
                    {
                        self.refresh_tex(ctx);
                    }
                });
                ui.horizontal_wrapped(|ui| {
                    ui.label("Workspace:");
                    ui.selectable_value(&mut self.workspace, WorkspaceMode::Source, "Source");
                    ui.selectable_value(&mut self.workspace, WorkspaceMode::Split, "Split");
                    ui.selectable_value(&mut self.workspace, WorkspaceMode::Canvas, "Canvas");
                    ui.separator();
                    self.prefs.draw_toolbar(ui, ctx);
                    if ui.button("Figure fonts").clicked() {
                        self.prefs.show_font_lab = !self.prefs.show_font_lab;
                    }
                    ui.checkbox(&mut self.show_packages, "Library inventory");
                    ui.checkbox(&mut self.show_log, "Diagnostics / log");
                    if self.document.dirty() {
                        ui.colored_label(egui::Color32::YELLOW, "Unsaved edits");
                    }
                    if self.preview_stale() {
                        ui.colored_label(egui::Color32::YELLOW, "PDF stale");
                    }
                    ui.label(&self.status);
                });
            });
        }
        let split_layout = SplitPanelLayout::for_width(ctx.available_rect().width());
        if self.prefs.studio_mode {
            show_studio_status_panel(ctx, &self.status, self.tex.xelatex.is_some());
        }
        if let Some(notice) = self.tex_privilege_notice.as_deref() {
            show_current_user_privilege_banner(ctx, notice);
        }
        if self.prefs.studio_mode && self.prefs.studio_inspector_open {
            let studio = studio_ui::StudioLayout::for_width(ctx.available_rect().width());
            egui::SidePanel::right("b42-studio-inspector")
                .resizable(true)
                .default_width(studio.inspector_width)
                .min_width(225.0)
                .max_width(studio.inspector_max)
                .show(ctx, |ui| {
                    if self.modal_active() {
                        ui.disable();
                    }
                    self.show_studio_inspector(ui);
                });
        }
        if !self.prefs.studio_mode && self.workspace == WorkspaceMode::Split {
            show_split_inspector_panel(ctx, split_layout, |ui| {
                let previous_revision = self.authoring.source_revision();
                if self.modal_active() {
                    ui.disable();
                }
                if let Some(line) = tikz_canvas::show_inspector_action_bar(
                    ui,
                    &mut self.authoring,
                    &mut self.document.source,
                ) {
                    self.jump_to_line = Some(line);
                    self.highlight_generated_line = true;
                }
                fence_source_editor_undo_on_revision_change(
                    previous_revision,
                    &self.authoring,
                    &mut self.reset_source_editor_undo_history,
                );
                ui.separator();
                egui::ScrollArea::vertical()
                    .auto_shrink([false, false])
                    .show(ui, |ui| self.show_authoring_inspector(ui));
            });
        }
        if (!self.prefs.studio_mode && self.show_log)
            || (self.prefs.studio_mode && self.prefs.studio_console_open)
        {
            egui::TopBottomPanel::bottom("log")
                .resizable(true)
                .default_height(145.0)
                .show(ctx, |ui| {
                    if self.modal_active() {
                        ui.disable();
                    }
                    ui.horizontal(|ui| {
                        ui.selectable_value(
                            &mut self.bottom_view,
                            BottomView::Issues,
                            format!("Diagnostics ({})", self.diagnostics.len()),
                        );
                        ui.selectable_value(
                            &mut self.bottom_view,
                            BottomView::Log,
                            "Raw XeLaTeX log",
                        );
                        if self.bottom_view == BottomView::Log && ui.button("Copy log").clicked() {
                            ui.ctx().copy_text(self.log.clone());
                        }
                    });
                    ui.separator();
                    egui::ScrollArea::both()
                        .auto_shrink([false, false])
                        .show(ui, |ui| match self.bottom_view {
                            BottomView::Issues => {
                                if self.diagnostics.is_empty() {
                                    ui.label("No diagnostics captured from the most recent build.");
                                }
                                for item in &self.diagnostics {
                                    let severity = match &item.severity {
                                        Severity::Error => "ERROR",
                                        Severity::Warning => "WARNING",
                                    };
                                    let location = match (item.source.as_ref(), item.line) {
                                        (Some(source), Some(line)) => format!("{}:{line}", source.display()),
                                        (Some(source), None) => source.display().to_string(),
                                        (None, Some(line)) => format!("line {line}, file unknown"),
                                        (None, None) => "location unknown".to_owned(),
                                    };
                                    let label = format!("{severity} · {location} · {}", item.message);
                                    let active_source = diagnostic_targets_current_file(
                                        item.source.as_deref(),
                                        self.document.path.as_deref(),
                                    );
                                    if active_source {
                                        if let Some(line) = item.line
                                            && ui.button(&label).clicked()
                                        {
                                            self.jump_to_line = Some(line);
                                            self.highlight_generated_line = false;
                                            if !self.workspace.show_source() {
                                                self.workspace = WorkspaceMode::Split;
                                            }
                                        }
                                    } else {
                                        ui.label(label)
                                            .on_hover_text("Open the referenced file to navigate; unknown source is not guessed.");
                                    }
                                }
                            }
                            BottomView::Log => {
                                ui.add(
                                    egui::TextEdit::multiline(&mut self.log)
                                        .font(egui::TextStyle::Monospace)
                                        .desired_width(f32::INFINITY)
                                        .desired_rows(6)
                                        .interactive(false),
                                );
                            }
                        });
                });
        }
        if self.prefs.studio_mode
            && self.workspace == WorkspaceMode::Split
            && self.prefs.studio_tool_rail
        {
            egui::SidePanel::left("b42-tool-groups")
                .resizable(false)
                .exact_width(
                    studio_ui::StudioLayout::for_width(ctx.available_rect().width())
                        .tool_rail_width,
                )
                .show(ctx, |ui| {
                    if self.modal_active() {
                        ui.disable();
                    }
                    if let Some(anchor) = studio_ui::show_group_rail(
                        ui,
                        &mut self.studio_group,
                        studio_ui::StudioLayout::for_width(ctx.available_rect().width()).narrow,
                    ) {
                        self.studio_palette_anchor = anchor;
                    }
                });
        }
        let source_layout = if self.prefs.studio_mode {
            split_layout.reserving_center(ctx.available_rect().width())
        } else {
            split_layout
        };
        let actual_source_rect = if self.workspace == WorkspaceMode::Split {
            Some(show_split_source_panel(ctx, source_layout, |ui| {
                self.show_source_editor(ui);
            }))
        } else {
            None
        };
        egui::CentralPanel::default().show(ctx, |ui| {
            if self.modal_active() {
                ui.disable();
            }
            if self.workspace.show_canvas() {
                self.show_pdf_canvas(ui);
            } else {
                self.show_source_editor(ui);
            }
        });
        if self.prefs.studio_mode
            && self.prefs.studio_tool_rail
            && !self.modal_active()
            && let Some(source_rect) = actual_source_rect
        {
            let mut open_libraries = false;
            studio_ui::show_palette(
                ctx,
                &mut self.studio_group,
                studio_ui::palette_anchor_at_source_edge(source_rect, self.studio_palette_anchor),
                &mut self.authoring,
                studio_ui::PaletteData {
                    source: &self.document.source,
                    extensions: &self.package_statuses,
                    filter: &mut self.studio_extension_filter,
                },
                &mut open_libraries,
            );
            if open_libraries {
                self.prefs.studio_dock = StudioDock::Libraries;
                self.prefs.studio_inspector_open = true;
            }
        }
        self.pending_close_ui(ctx);
        if !self.pending_close
            && let Some(path) = self.pending_open.clone()
        {
            let previous_destination = self.pending_open_save_path.clone();
            let decision = show_pending_open_dialog(
                ctx,
                &self.document,
                &path,
                &mut self.pending_open_save_path,
                self.pending_open_validation_error.as_deref(),
            )
            .0;
            // Once the user corrects the destination, the old rejection must
            // not linger as though the newly entered path had been checked.
            if self.pending_open_save_path != previous_destination {
                self.pending_open_validation_error = None;
            }
            match decision {
                Some(PendingOpenAction::Save(save_path)) => {
                    if self.save_to_path(save_path) {
                        self.pending_open = None;
                        self.pending_open_save_path.clear();
                        self.pending_open_validation_error = None;
                        self.load_path(path);
                    } else {
                        self.pending_open_validation_error = Some(self.status.clone());
                        ctx.request_repaint();
                    }
                }
                Some(PendingOpenAction::Discard) => {
                    self.pending_open = None;
                    self.pending_open_save_path.clear();
                    self.pending_open_validation_error = None;
                    self.load_path(path);
                }
                Some(PendingOpenAction::Cancel) => {
                    self.pending_open = None;
                    self.pending_open_save_path.clear();
                    self.pending_open_validation_error = None;
                }
                Some(PendingOpenAction::Reject(error)) => {
                    self.status = error.clone();
                    self.pending_open_validation_error = Some(error);
                    ctx.request_repaint();
                }
                None => {}
            }
        }
        self.pending_build_ui(ctx);
    }
}

// Native minimum height must be below the available 540 logical points at 200%
// on a 1080px monitor, including window manager decorations.
const RELEASE_MIN_INNER_SIZE: egui::Vec2 = egui::vec2(850.0, 440.0);

/// Use *logical* egui points; never disable OS scaling to make room.
/// At 200% the former 560pt minimum was 1120 physical pixels high on
/// a 1080px monitor, before including X11 window decorations.
fn fit_oversized_window(
    monitor: egui::Vec2,
    inner: egui::Vec2,
    outer: egui::Vec2,
) -> Option<egui::Vec2> {
    if !monitor.is_finite()
        || !inner.is_finite()
        || !outer.is_finite()
        || monitor.x <= 0.0
        || monitor.y <= 0.0
        || inner.x <= 0.0
        || inner.y <= 0.0
    {
        return None;
    }
    const MARGIN: f32 = 16.0;
    if outer.x + MARGIN <= monitor.x && outer.y + MARGIN <= monitor.y {
        return None;
    }
    let chrome = egui::vec2((outer.x - inner.x).max(0.0), (outer.y - inner.y).max(0.0));
    let target = egui::vec2(
        inner.x.min((monitor.x - chrome.x - MARGIN).max(0.0)),
        inner.y.min((monitor.y - chrome.y - MARGIN).max(0.0)),
    );
    (target.x > 0.0 && target.y > 0.0 && (target.x + 0.5 < inner.x || target.y + 0.5 < inner.y))
        .then_some(target)
}

/// A 1366×768 screen is not the full drawable client rectangle.
/// Reserve desktop chrome without changing user scale or figure typography.
fn startup_inner_size() -> egui::Vec2 {
    egui::vec2(1180.0, 680.0)
}

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size(startup_inner_size())
            .with_min_inner_size(RELEASE_MIN_INNER_SIZE),
        ..Default::default()
    };
    eframe::run_native(
        "TikZarium",
        options,
        Box::new(|cc| Ok(Box::new(TikzariumApp::new(cc)))),
    )
}

#[cfg(test)]
mod split_layout_tests {
    use super::*;

    #[test]
    fn r3_pdf_export_is_complete_unicode_and_never_overwrites_existing_bytes() {
        let temp = tempfile::tempdir().unwrap();
        let target = temp.path().join("Схема с пробелами.pdf");
        let pdf = b"%PDF-1.7\n% complete output\n%%EOF\n";
        write_new_pdf_without_overwrite(&target, pdf).unwrap();
        assert_eq!(std::fs::read(&target).unwrap(), pdf);

        let err = write_new_pdf_without_overwrite(&target, b"replacement").unwrap_err();
        assert_eq!(err.kind(), std::io::ErrorKind::AlreadyExists);
        assert_eq!(std::fs::read(&target).unwrap(), pdf);

        let missing_parent = temp.path().join("missing").join("figure.pdf");
        assert!(write_new_pdf_without_overwrite(&missing_parent, pdf).is_err());
        assert!(!missing_parent.exists());

        let leftovers: Vec<_> = std::fs::read_dir(temp.path())
            .unwrap()
            .map(|entry| entry.unwrap().file_name())
            .collect();
        assert_eq!(leftovers, vec![target.file_name().unwrap().to_owned()]);
    }

    #[test]
    fn r3_native_picker_path_is_not_permission_to_overwrite_unrelated_tex() {
        let temp = tempfile::tempdir().unwrap();
        let owned = temp.path().join("черновик.tex");
        let foreign = temp.path().join("чужой.tex");
        let fresh = temp.path().join("другая фигура.tex");
        std::fs::write(&owned, "% сохранённое\r\n").unwrap();
        std::fs::write(&foreign, "% чужой\r\n").unwrap();
        let mut doc = Document::load(&owned).unwrap();
        assert!(checked_native_save_destination(&doc, owned.clone()).is_ok());
        assert!(checked_native_save_destination(&doc, fresh).is_ok());
        assert!(checked_native_save_destination(&doc, foreign.clone()).is_err());
        assert_eq!(
            std::fs::read(&foreign).unwrap(),
            b"% \xd1\x87\xd1\x83\xd0\xb6\xd0\xbe\xd0\xb9\r\n"
        );
        doc.source.push_str("% opaque\r\n");
        assert!(doc.dirty());
    }

    #[test]
    fn r2_scaled_desktop_fit_preserves_dpi_and_compact_workspace() {
        assert_eq!(RELEASE_MIN_INNER_SIZE, egui::vec2(850.0, 440.0));
        assert!(
            fit_oversized_window(
                egui::vec2(1366.0, 768.0),
                egui::vec2(1180.0, 680.0),
                egui::vec2(1180.0, 700.0),
            )
            .is_none()
        );
        assert!(
            fit_oversized_window(
                egui::vec2(1536.0, 864.0),
                egui::vec2(1180.0, 680.0),
                egui::vec2(1180.0, 700.0),
            )
            .is_none()
        );
        let at_200pct = fit_oversized_window(
            egui::vec2(960.0, 540.0),
            egui::vec2(960.0, 560.0),
            egui::vec2(960.0, 571.0),
        )
        .unwrap();
        assert!(at_200pct.y < 520.0 && at_200pct.y >= RELEASE_MIN_INNER_SIZE.y);
        assert!(at_200pct.x >= RELEASE_MIN_INNER_SIZE.x);
        assert!(
            fit_oversized_window(
                egui::vec2(f32::NAN, 540.0),
                egui::vec2(960.0, 560.0),
                egui::vec2(960.0, 571.0),
            )
            .is_none()
        );
    }

    #[test]
    fn r1_native_close_event_requires_confirmed_save_or_explicit_discard() {
        assert!(close_requires_confirmation(true, false));
        assert!(!close_requires_confirmation(false, false));
        assert!(!close_requires_confirmation(true, true));

        let ctx = egui::Context::default();
        let mut input = egui::RawInput::default();
        input
            .viewports
            .entry(egui::ViewportId::ROOT)
            .or_default()
            .events
            .push(egui::ViewportEvent::Close);
        let mut intercepted = false;
        let output = ctx.run(input, |ctx| {
            intercepted = intercept_dirty_viewport_close(ctx, true, false);
        });
        assert!(intercepted);
        assert!(output.viewport_output.values().any(|viewport| {
            viewport
                .commands
                .iter()
                .any(|command| matches!(command, egui::ViewportCommand::CancelClose))
        }));
    }

    #[test]
    fn r1_close_save_target_is_safe_for_unicode_and_occupied_scratch() {
        let temp = tempfile::tempdir().unwrap();
        let current = temp.path().join("текущий.tex");
        let occupied = temp.path().join("чужой.tex");
        std::fs::write(&current, "% сохранённый\r\n").unwrap();
        std::fs::write(&occupied, "% защищённый\r\n").unwrap();

        let mut document = Document::load(&current).unwrap();
        document.source.push_str("% правка Ω\r\n");
        assert!(document.dirty());
        assert_eq!(
            initial_pending_close_save_path(&document),
            current.to_str().unwrap()
        );
        assert_eq!(
            typed_save_destination(&document, current.to_str().unwrap()).unwrap(),
            current
        );
        assert!(typed_save_destination(&document, occupied.to_str().unwrap()).is_err());
        assert!(typed_save_destination(&document, "").is_err());
        assert_eq!(
            std::fs::read(&occupied).unwrap(),
            b"% \xd0\xb7\xd0\xb0\xd1\x89\xd0\xb8\xd1\x89\xd1\x91\xd0\xbd\xd0\xbd\xd1\x8b\xd0\xb9\r\n"
        );

        let scratch = Document::scratch("% исходник\r\n");
        let new_path = temp.path().join("рисунок-Ω.tex");
        assert_eq!(
            typed_save_destination(&scratch, new_path.to_str().unwrap()).unwrap(),
            new_path
        );
        assert!(!new_path.exists());
    }

    use tikzarium_extensions::primitives::Evidence;

    #[test]
    fn n5_packaged_startup_fits_compact_desktop_with_window_manager_chrome() {
        let size = startup_inner_size();
        assert!(size.x >= 850.0 && size.y >= 560.0);
        // Hosted 1× 1366×768 X11 must show the entire client, not just title.
        assert!(size.x <= 1366.0 - 96.0);
        assert!(size.y <= 768.0 - 64.0);
    }

    #[test]
    fn b43_real_egui_source_click_dismisses_palette_without_touching_tex() {
        // Production TextEdit click handling, not a synthetic button.
        // UNIT_EVENT only: final visual confirmation still needs real X11 PNG.
        fn frame(
            ctx: &egui::Context,
            source: &mut String,
            reset: &mut bool,
            group: &mut Option<StudioGroup>,
            events: Vec<egui::Event>,
        ) -> egui::Rect {
            let mut actual_editor = egui::Rect::NOTHING;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(850.0, 620.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        let output = show_source_text_edit(ui, source, reset, true);
                        actual_editor = output.response.rect;
                        dismiss_studio_palette_on_source_click(&output.response, group);
                    });
                },
            );
            actual_editor
        }
        let ctx = egui::Context::default();
        let original = "% длинный русский комментарий\r\n\\myOpaque{сохранить}\r\n".to_owned();
        let mut source = original.clone();
        let mut reset = false;
        let mut group = Some(StudioGroup::Geometry);
        let rect = frame(&ctx, &mut source, &mut reset, &mut group, vec![]);
        assert!(
            rect.is_positive(),
            "source editor must have an actual hit rectangle"
        );
        assert_eq!(group, Some(StudioGroup::Geometry));
        let pos = rect.center();
        for pressed in [true, false] {
            frame(
                &ctx,
                &mut source,
                &mut reset,
                &mut group,
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
        assert_eq!(group, None, "source click must dismiss floating palette");
        assert_eq!(
            source, original,
            "palette dismissal must not edit CRLF/opaque TeX"
        );
        assert!(!reset, "palette dismissal cannot reset native Undo");
    }

    #[test]
    fn b43_after_dock_source_budget_reserves_live_canvas() {
        for width in [850.0_f32, 1000.0, 1366.0, 1920.0] {
            let studio = studio_ui::StudioLayout::for_width(width);
            let remaining = width - studio.tool_rail_width - studio.inspector_width;
            let layout = SplitPanelLayout::for_width(width).reserving_center(remaining);
            assert!(
                remaining - layout.source_max >= 260.0,
                "source stole central canvas at width {width}"
            );
            assert!(layout.source_default <= layout.source_max);
            assert!(layout.source_default >= 240.0);
            assert!(layout.source_max <= 600.0);
        }
        let fallback = SplitPanelLayout::for_width(850.0).reserving_center(f32::NAN);
        assert!(fallback.source_max.is_finite());
    }

    #[test]
    fn b43_egui_soft_wrap_preserves_opaque_unicode_crlf_and_preferences() {
        let original = format!(
            "% {}\r\n\\myOpaque{{не трогать}}\r\n",
            "ОченьДлинныйРусскийКомментарий_".repeat(30)
        );
        let mut rows = Vec::new();
        for soft_wrap in [false, true] {
            let ctx = egui::Context::default();
            let mut source = original.clone();
            let mut reset = false;
            let mut observed_rows = 0;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(850.0, 620.0),
                    )),
                    ..Default::default()
                },
                |ctx| {
                    egui::SidePanel::left("b43-source")
                        .exact_width(290.0)
                        .show(ctx, |ui| {
                            // Mirror the real source pane. Without this ScrollArea,
                            // an unwrapped TeX line expands the *test* SidePanel
                            // despite exact_width, stealing width from the canvas.
                            egui::ScrollArea::new([!soft_wrap, true])
                                .auto_shrink([false, false])
                                .show(ui, |ui| {
                                    let output = show_source_text_edit(
                                        ui,
                                        &mut source,
                                        &mut reset,
                                        soft_wrap,
                                    );
                                    observed_rows = output.galley.rows.len();
                                });
                        });
                    egui::CentralPanel::default().show(ctx, |ui| {
                        assert!(ui.available_width() > 260.0);
                    });
                },
            );
            assert_eq!(source, original, "wrapping must never edit TeX bytes");
            assert!(!reset, "visual wrapping cannot fence native undo");
            rows.push(observed_rows);
        }
        assert!(
            rows[0] <= 4,
            "unwrapped TextEdit must not soft-wrap one long TeX comment: {rows:?}"
        );
        assert!(
            rows[1] > rows[0],
            "wrapped TextEdit must create additional visual rows: {rows:?}"
        );
        let mut prefs = UiPreferences::default();
        assert!(prefs.source_soft_wrap);
        prefs.source_soft_wrap = false;
        let json = serde_json::to_string(&prefs).unwrap();
        let restored: UiPreferences = serde_json::from_str(&json).unwrap();
        assert!(!restored.source_soft_wrap, "user preference must persist");
    }

    #[test]
    fn n3_help_evidence_rows_do_not_promote_unknown_and_separate_all_five_states() {
        let uncertain = source_help_evidence_rows(tikz_canvas::Capabilities {
            installed: false,
            loaded: Evidence::Unknown,
            engine_compatible: false,
            implemented: true,
        });
        assert_eq!(uncertain.len(), 5);
        assert_eq!(uncertain[0], ("Установлен", "НЕ ПОДТВЕРЖДЕНО"));
        assert_eq!(uncertain[1], ("Подключён в проекте", "UNKNOWN"));
        assert_eq!(uncertain[2], ("XeLaTeX совместим", "НЕ ПОДТВЕРЖДЕНО"));
        assert_eq!(uncertain[3], ("GUI-инструмент", "ПОДТВЕРЖДЕНО"));
        assert_eq!(uncertain[4], ("Русская справка", "ПОДТВЕРЖДЕНО"));
        let absent = source_help_evidence_rows(tikz_canvas::Capabilities {
            installed: true,
            loaded: Evidence::Absent,
            engine_compatible: true,
            implemented: false,
        });
        assert_eq!(absent[1].1, "НЕТ ПРЯМОГО ПОДКЛЮЧЕНИЯ");
        assert_eq!(absent[3].1, "НЕ ПОДТВЕРЖДЕНО");
    }

    #[test]
    fn n3_egui_f1_shows_source_caret_parameter_without_source_change() {
        let catalog = tikz_authoring::catalog();
        let example = &catalog.tool("tikz.circle").unwrap().example;
        let source = format!(
            "\\begin{{tikzpicture}}\r\n{}\r\n\\myOpaque{{не менять}}\r\n\\end{{tikzpicture}}\r\n",
            example
        );
        let before = source.clone();
        let caret_byte = source.find("radius=").unwrap() + "radius=".len() + 1;
        let caret = source[..caret_byte].chars().count();
        let mut session = tikz_authoring::Session::default();
        session.reset(&source);
        let ctx = egui::Context::default();
        let mut saw_parameter = false;
        let _ = ctx.run(
            egui::RawInput {
                screen_rect: Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(1180.0, 720.0),
                )),
                events: vec![egui::Event::Key {
                    key: egui::Key::F1,
                    physical_key: None,
                    pressed: true,
                    repeat: false,
                    modifiers: egui::Modifiers::default(),
                }],
                ..Default::default()
            },
            |ctx| {
                tikz_canvas::handle_help_shortcut(ctx, &mut session);
                egui::CentralPanel::default().show(ctx, |ui| {
                    saw_parameter = show_source_parameter_help(
                        ui,
                        &source,
                        caret,
                        tikz_canvas::Capabilities {
                            installed: true,
                            loaded: Evidence::Confirmed,
                            engine_compatible: true,
                            implemented: true,
                        },
                    );
                });
            },
        );
        assert!(session.help, "actual F1 key must open the Help dock");
        assert!(
            saw_parameter,
            "circle radius must resolve through the shared C catalogue"
        );
        assert_eq!(
            source, before,
            "read-only F1 must preserve Unicode/CRLF/opaque source"
        );
    }

    #[test]
    fn b40_native_source_undo_never_resurrects_text_across_visual_transactions() {
        // Real egui::Context RawInput frames run the production source TextEdit.
        // A manual edit must retain its bytes through a primitive patch, visual
        // Undo and a subsequent native Ctrl+Z. This is UNIT_EVENT, not Win/Mac.
        fn frame(
            ctx: &egui::Context,
            source: &mut String,
            session: &mut tikz_authoring::Session,
            reset: &mut bool,
            events: Vec<egui::Event>,
            modifiers: egui::Modifiers,
            focus: bool,
        ) {
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(900.0, 620.0),
                    )),
                    events,
                    modifiers,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        let output = show_source_text_edit(ui, source, reset, false);
                        tikz_canvas::observe_source_text_edit(&output.response, session, source);
                        if focus {
                            output.response.request_focus();
                        }
                    });
                },
            );
        }
        let ctx = egui::Context::default();
        let mut source = "% комментарий\r\n\\documentclass{standalone}\r\n\\usepackage{tikz}\r\n\\begin{document}\r\n\\begin{tikzpicture}\r\n\\end{tikzpicture}\r\n\\myOpaque{не менять}\r\n\\end{document}\r\n".to_owned();
        let original = source.clone();
        let mut session = tikz_authoring::Session::default();
        session.reset(&source);
        let mut reset = false;
        frame(
            &ctx,
            &mut source,
            &mut session,
            &mut reset,
            vec![],
            Default::default(),
            true,
        );
        frame(
            &ctx,
            &mut source,
            &mut session,
            &mut reset,
            vec![egui::Event::Text("ручная правка".into())],
            Default::default(),
            false,
        );
        assert_ne!(source, original);
        let manually_edited = source.clone();
        let before = session.source_revision();
        session
            .insert(
                &mut source,
                tikz_authoring::Tool::Line,
                tikz_authoring::Draft::for_tool(tikz_authoring::Tool::Line),
            )
            .unwrap();
        assert!(fence_source_editor_undo_on_revision_change(
            before, &session, &mut reset,
        ));
        let with_primitive = source.clone();
        frame(
            &ctx,
            &mut source,
            &mut session,
            &mut reset,
            vec![],
            Default::default(),
            false,
        );
        assert!(!reset);
        frame(
            &ctx,
            &mut source,
            &mut session,
            &mut reset,
            vec![],
            Default::default(),
            true,
        );
        let command = egui::Modifiers {
            command: true,
            ctrl: true,
            ..Default::default()
        };
        let z = |pressed| egui::Event::Key {
            key: egui::Key::Z,
            physical_key: None,
            pressed,
            repeat: false,
            modifiers: command,
        };
        frame(
            &ctx,
            &mut source,
            &mut session,
            &mut reset,
            vec![z(true)],
            command,
            false,
        );
        assert_eq!(
            source, with_primitive,
            "native Undo must not cross an authored patch"
        );
        frame(
            &ctx,
            &mut source,
            &mut session,
            &mut reset,
            vec![z(false)],
            command,
            false,
        );
        let before_undo = session.source_revision();
        session.undo(&mut source).unwrap();
        assert_eq!(source, manually_edited);
        assert!(fence_source_editor_undo_on_revision_change(
            before_undo,
            &session,
            &mut reset,
        ));
        frame(
            &ctx,
            &mut source,
            &mut session,
            &mut reset,
            vec![],
            Default::default(),
            false,
        );
        frame(
            &ctx,
            &mut source,
            &mut session,
            &mut reset,
            vec![],
            Default::default(),
            true,
        );
        frame(
            &ctx,
            &mut source,
            &mut session,
            &mut reset,
            vec![z(true)],
            command,
            false,
        );
        assert_eq!(
            source, manually_edited,
            "stale native Undo must not erase manual TeX"
        );
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("b40-тест.tex");
        std::fs::write(&path, source.as_bytes()).unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), manually_edited.as_bytes());
        assert!(source.contains("\\myOpaque{не менять}"));
        assert!(source.contains("\r\n"));
        let unchanged_revision = session.source_revision();
        session.select_tool(tikz_authoring::Tool::Rectangle);
        assert!(!fence_source_editor_undo_on_revision_change(
            unchanged_revision,
            &session,
            &mut reset,
        ));
        assert!(
            !reset,
            "a pure selection must not erase native editor history"
        );
    }

    #[test]
    fn b26_fit_page_button_remains_selected_on_resize_and_new_pdf_raster() {
        // Actual Context::run pointer frames on the *production* Fit Page
        // button, followed by real UI-layout refits. No XeLaTeX emulation,
        // no PDF-to-guide coordinate inference and no source mutations.
        fn frame(
            ctx: &egui::Context,
            source: &mut String,
            active: &mut bool,
            zoom: &mut f32,
            image: egui::Vec2,
            size: egui::Vec2,
            events: Vec<egui::Event>,
        ) -> egui::Rect {
            let mut button = egui::Rect::NOTHING;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(egui::Pos2::ZERO, size)),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        button = show_fit_page_button(ui, true, active).rect;
                        ui.add(
                            egui::TextEdit::multiline(source)
                                .code_editor()
                                .desired_rows(2),
                        );
                        ui.add_space(42.0);
                        let too_small =
                            refit_selected_page(*active, Some(image), ui.available_size(), zoom);
                        assert!(!too_small, "test viewport should fit at 20%");
                    });
                },
            );
            button
        }
        let ctx = egui::Context::default();
        let mut source = QUICKSTART.to_owned();
        let original = source.clone();
        let mut active = false;
        let mut zoom = 1.0;
        let large = egui::vec2(1366.0, 740.0);
        let page = egui::vec2(720.0, 480.0);
        let button = frame(
            &ctx,
            &mut source,
            &mut active,
            &mut zoom,
            page,
            large,
            vec![],
        );
        assert!(!active);
        let pos = button.center();
        let pointer = |pressed| egui::Event::PointerButton {
            pos,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: egui::Modifiers::default(),
        };
        frame(
            &ctx,
            &mut source,
            &mut active,
            &mut zoom,
            page,
            large,
            vec![egui::Event::PointerMoved(pos), pointer(true)],
        );
        frame(
            &ctx,
            &mut source,
            &mut active,
            &mut zoom,
            page,
            large,
            vec![pointer(false)],
        );
        assert!(
            active,
            "the real Fit Page button did not switch on auto-fit"
        );
        let wide_zoom = zoom;
        frame(
            &ctx,
            &mut source,
            &mut active,
            &mut zoom,
            page,
            egui::vec2(850.0, 560.0),
            vec![],
        );
        assert!(zoom < wide_zoom, "resize did not refit the page");
        frame(
            &ctx,
            &mut source,
            &mut active,
            &mut zoom,
            egui::vec2(720.0, 1200.0),
            large,
            vec![],
        );
        assert!(zoom < wide_zoom, "new taller PDF raster was not refitted");
        // This is the same state transition as a manual +/−/100%/Fit width.
        active = false;
        zoom = 0.7;
        frame(
            &ctx,
            &mut source,
            &mut active,
            &mut zoom,
            page,
            large,
            vec![],
        );
        assert_eq!(zoom, 0.7, "manual zoom must no longer auto-refit");
        let before = zoom;
        assert!(refit_selected_page(
            true,
            Some(egui::vec2(1000.0, 1000.0)),
            egui::vec2(40.0, 40.0),
            &mut zoom,
        ));
        assert_eq!(zoom, before, "cannot claim fit below the 2% minimum");
        assert_eq!(source, original);
    }

    #[test]
    fn b31_compact_pdf_fit_is_below_twenty_percent_and_manual_zoom_is_continuous() {
        // Reproduction target: an actual X11 1180x680 window can leave a
        // short PDF viewport below the provisional guide. The prior hard
        // 20% minimum showed a false "cannot fit" while A4 needed ~7%.
        let image = egui::vec2(1200.0, 1700.0);
        let viewport = egui::vec2(500.0, 150.0);
        let mut zoom = 1.0;
        assert!(!refit_selected_page(true, Some(image), viewport, &mut zoom));
        assert!((0.02..0.2).contains(&zoom), "compact fit: {zoom}");
        assert!(image.x * zoom <= viewport.x - 23.0);
        assert!(image.y * zoom <= viewport.y - 23.0);

        // A manual + immediately after Fit Page must not jump from 7%
        // to the obsolete 20% lower clamp.
        let plus = scaled_zoom(zoom, 1.2);
        assert!((plus - zoom * 1.2).abs() < 0.00001);
        let minus = scaled_zoom(zoom, 1.0 / 1.2);
        assert!((minus - zoom / 1.2).abs() < 0.00001);

        // Fail closed rather than claim the whole page is shown at
        // an infeasible scale, preserving the last user-selected zoom.
        let previous = zoom;
        assert!(refit_selected_page(
            true,
            Some(image),
            egui::vec2(40.0, 40.0),
            &mut zoom,
        ));
        assert_eq!(zoom, previous);
        assert_eq!(fit_page_zoom(egui::vec2(f32::NAN, 1700.0), viewport), None,);
    }

    #[test]
    fn b31_x11_resize_refit_repaints_stale_zoom_readout_with_source_untouched() {
        // I43 real X11: compact Fit Page raster was ~7%, restored viewport
        // rendered ~25% but the toolbar stayed at 7%. In production the
        // readout is painted BEFORE the guide and auto-refit, so an explicit
        // second frame is required to make the displayed percentage truthful.
        // This is UNIT_EVENT/LAYOUT, NOT another physical desktop acceptance.
        fn frame(
            ctx: &egui::Context,
            source: &mut String,
            session: &mut tikz_authoring::Session,
            zoom: &mut f32,
            window: egui::Vec2,
        ) -> (u32, u32, bool) {
            let mut observed = None;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(egui::Pos2::ZERO, window)),
                    ..Default::default()
                },
                |ctx| {
                    let layout = SplitPanelLayout::for_width(ctx.available_rect().width());
                    show_split_inspector_panel(ctx, layout, |ui| {
                        ui.strong("F1 · каталог C");
                    });
                    show_split_source_panel(ctx, layout, |ui| {
                        ui.add(egui::TextEdit::multiline(source).code_editor());
                    });
                    egui::CentralPanel::default().show(ctx, |ui| {
                        ui.heading("Canvas · exact XeLaTeX PDF");
                        let readout = pdf_zoom_percent(*zoom);
                        ui.label(format!("{readout}%"));
                        tikz_canvas::show_guide(
                            ui,
                            session,
                            source,
                            tikz_canvas::Capabilities {
                                installed: true,
                                loaded: Evidence::Confirmed,
                                engine_compatible: true,
                                implemented: true,
                            },
                        );
                        ui.separator();
                        let image = egui::vec2(1200.0, 1700.0);
                        assert!(!refit_selected_page(
                            true,
                            Some(image),
                            ui.available_size(),
                            zoom,
                        ));
                        let actual = pdf_zoom_percent(*zoom);
                        let requested = repaint_if_pdf_zoom_label_stale(ctx, readout, *zoom);
                        observed = Some((readout, actual, requested));
                    });
                },
            );
            observed.expect("real egui panels must render")
        }

        let ctx = egui::Context::default();
        let mut source = QUICKSTART.to_owned();
        let original = source.clone();
        let mut session = tikz_authoring::Session::default();
        session.reset(&source);
        session.select_tool(tikz_authoring::Tool::Line);
        let mut zoom = 1.0;

        for window in [egui::vec2(1180.0, 680.0), egui::vec2(1366.0, 740.0)] {
            let first = frame(&ctx, &mut source, &mut session, &mut zoom, window);
            assert_ne!(first.0, first.1, "first pass must expose a late refit");
            assert!(first.2, "a stale toolbar must schedule another frame");
            let settled = frame(&ctx, &mut source, &mut session, &mut zoom, window);
            assert_eq!(
                settled.0, settled.1,
                "follow-up frame must match readout and raster"
            );
            assert!(!settled.2, "stable fit must not request endless redraws");
        }
        assert_eq!(
            source, original,
            "PDF fitting must never edit arbitrary TeX"
        );
        assert!(
            !session.undo_available(),
            "fitting must not insert an undo entry"
        );
    }

    #[test]
    fn b31_fit_width_respects_actual_center_width_without_false_fit() {
        let raster_width = 1200.0;
        let compact_center = 230.0;
        let fit = fit_width_zoom(raster_width, compact_center)
            .expect("230pt canvas must fit a 1200px raster below 20%");
        assert!((0.02..0.2).contains(&fit));
        assert!(raster_width * fit <= compact_center - 23.0);
        assert_eq!(fit_width_zoom(raster_width, 40.0), None);
        assert_eq!(fit_width_zoom(f32::NAN, compact_center), None);
        assert_eq!(fit_width_zoom(0.0, compact_center), None);
    }

    #[test]
    fn b31_real_egui_split_keeps_editable_source_and_fits_pdf_after_guide() {
        // Headless *production* egui panels, source TextEdit, guide handler
        // and actual post-guide available_size. UNIT_EVENT/LAYOUT, not
        // physical Win10 or M1/M4 acceptance or a PDF-coordinate proof.
        let ctx = egui::Context::default();
        let mut source = QUICKSTART.to_owned();
        let original = source.clone();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        authoring.select_tool(tikz_authoring::Tool::Line);
        for (width, height) in [(1180.0, 680.0), (850.0, 560.0)] {
            let mut reached = false;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(width, height),
                    )),
                    ..Default::default()
                },
                |ctx| {
                    let layout = SplitPanelLayout::for_width(ctx.available_rect().width());
                    show_split_inspector_panel(ctx, layout, |ui| {
                        ui.strong("F1 · русский каталог C");
                    });
                    show_split_source_panel(ctx, layout, |ui| {
                        ui.add(egui::TextEdit::multiline(&mut source).code_editor());
                    });
                    egui::CentralPanel::default().show(ctx, |ui| {
                        ui.heading("Canvas · exact PDF");
                        ui.small("Source is editable; PDF is external XeLaTeX");
                        tikz_canvas::show_guide(
                            ui,
                            &mut authoring,
                            &mut source,
                            tikz_canvas::Capabilities {
                                installed: true,
                                loaded: Evidence::Confirmed,
                                engine_compatible: true,
                                implemented: true,
                            },
                        );
                        ui.separator();
                        let viewport = ui.available_size();
                        let image = egui::vec2(1200.0, 1700.0);
                        let fit = fit_page_zoom(image, viewport)
                            .expect("A4 should fit below 20% in this real egui layout");
                        assert!(fit < 0.2, "regression must exercise compact fit: {fit}");
                        assert!(image.x * fit <= viewport.x - 23.0);
                        assert!(image.y * fit <= viewport.y - 23.0);
                        reached = true;
                    });
                },
            );
            assert!(reached, "no egui panel layout for {width}x{height}");
            assert_eq!(source, original, "fit must not mutate arbitrary TeX");
        }
        assert!(!authoring.undo_available());
    }

    #[test]
    fn b25_fit_page_uses_real_remaining_viewport_not_canvas_width_or_provisional_guide() {
        let ctx = egui::Context::default();
        let mut source = QUICKSTART.to_owned();
        let original = source.clone();
        let mut session = tikz_authoring::Session::default();
        session.reset(&source);
        session.select_tool(tikz_authoring::Tool::Line);
        for (width, height) in [(1366.0, 740.0), (850.0, 560.0)] {
            let mut checked = false;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(width, height),
                    )),
                    ..Default::default()
                },
                |ctx| {
                    let layout = SplitPanelLayout::for_width(ctx.available_rect().width());
                    show_split_inspector_panel(ctx, layout, |ui| {
                        ui.strong("F1 · каталог C");
                    });
                    show_split_source_panel(ctx, layout, |ui| {
                        ui.add(egui::TextEdit::multiline(&mut source).code_editor());
                    });
                    egui::CentralPanel::default().show(ctx, |ui| {
                        ui.heading("Canvas · exact PDF");
                        ui.small("External XeLaTeX PDF, provisional guide below");
                        tikz_canvas::show_guide(
                            ui,
                            &mut session,
                            &mut source,
                            tikz_canvas::Capabilities {
                                installed: true,
                                loaded: Evidence::Confirmed,
                                engine_compatible: true,
                                implemented: true,
                            },
                        );
                        ui.separator();
                        let viewport = ui.available_size();
                        let image = egui::vec2(720.0, 480.0);
                        let fit = fit_page_zoom(image, viewport).expect("page must fit");
                        assert!(image.x * fit <= viewport.x - 23.0);
                        assert!(image.y * fit <= viewport.y - 23.0);
                        assert!((0.2..=5.0).contains(&fit));
                        checked = true;
                    });
                },
            );
            assert!(checked, "no frame at {width}x{height}");
            assert_eq!(source, original, "fit must never change user TeX");
        }
        assert_eq!(
            fit_page_zoom(egui::vec2(0.0, 480.0), egui::vec2(400.0, 300.0)),
            None
        );
        assert_eq!(
            fit_page_zoom(egui::vec2(1000.0, 1000.0), egui::vec2(40.0, 40.0)),
            None
        );
        assert_eq!(
            fit_page_zoom(egui::vec2(f32::NAN, 100.0), egui::vec2(400.0, 300.0)),
            None
        );
        assert!(!session.undo_available());
    }

    #[test]
    fn b21_source_navigation_targets_actual_textedit_galley_for_long_unicode_lines() {
        let ctx = egui::Context::default();
        let original = format!(
            "\\documentclass{{standalone}}\n% {}\n\\begin{{tikzpicture}}\n  \\draw (0,0) -- (1,1);\n\\end{{tikzpicture}}\n",
            "длинный_пользовательский_макрос_".repeat(40)
        );
        let mut source = original.clone();
        let index = line_start_char_index(&source, 4).expect("source line");
        // Two genuine egui layout frames, including a narrow window and a
        // widened window, exercise the same caret helper used in production.
        for viewport in [340.0, 820.0] {
            let mut inspected = false;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(viewport, 400.0),
                    )),
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        let output = egui::TextEdit::multiline(&mut source)
                            .code_editor()
                            .desired_width(180.0)
                            .desired_rows(10)
                            .show(ui);
                        let caret = source_caret_target(&output.galley, output.galley_pos, index);
                        let relative = caret.center() - output.galley_pos;
                        let actual = output.galley.cursor_from_pos(relative);
                        assert_eq!(actual.index, index, "galley cursor drift at {viewport}");
                        assert!(caret.is_finite());
                        // The source jump is a read-only navigation operation.
                        ui.scroll_to_rect(caret, Some(egui::Align::Center));
                        inspected = true;
                    });
                },
            );
            assert!(inspected);
            assert_eq!(source, original);
        }
    }

    #[test]
    fn actual_egui_frames_keep_source_inspector_and_guide_at_minimum_and_resized_widths() {
        let ctx = egui::Context::default();
        let mut source = QUICKSTART.to_owned();
        let untouched = source.clone();
        let mut session = tikz_authoring::Session::default();
        session.reset(&source);
        session.select_tool(tikz_authoring::Tool::Line);
        // Reuse the SAME egui Context so saved side-panel widths are exercised
        // as the user shrinks a live window and then enlarges it again.
        for viewport in [1366.0, 850.0, 820.0, 1366.0] {
            let mut editor_width = 0.0;
            let mut inspector_width = 0.0;
            let mut guide_width = 0.0;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(viewport, 768.0),
                    )),
                    ..Default::default()
                },
                |ctx| {
                    let layout = SplitPanelLayout::for_width(ctx.available_rect().width());
                    show_split_inspector_panel(ctx, layout, |ui| {
                        inspector_width = ui.max_rect().width();
                        let _ =
                            tikz_canvas::show_inspector_action_bar(ui, &mut session, &mut source);
                    });
                    show_split_source_panel(ctx, layout, |ui| {
                        editor_width = ui.max_rect().width();
                        ui.add(egui::TextEdit::multiline(&mut source).code_editor());
                    });
                    egui::CentralPanel::default().show(ctx, |ui| {
                        guide_width = ui.available_width();
                        let _ = tikz_canvas::show_guide(
                            ui,
                            &mut session,
                            &mut source,
                            tikz_canvas::Capabilities {
                                installed: true,
                                loaded: Evidence::Confirmed,
                                engine_compatible: true,
                                implemented: true,
                            },
                        );
                    });
                },
            );
            assert!(
                editor_width > 200.0,
                "source hidden at {viewport}: {editor_width}"
            );
            assert!(
                inspector_width > 180.0,
                "inspector hidden at {viewport}: {inspector_width}"
            );
            assert!(
                guide_width > 190.0,
                "guide clipped at {viewport}: {guide_width}"
            );
            assert_eq!(source, untouched, "resizing silently changed source");
            assert!(!session.undo_available());
        }
    }

    #[test]
    fn b42_status_is_full_width_and_does_not_occlude_editable_source_or_guide() {
        // The production status panel must be allocated BEFORE any inspector,
        // source SidePanel or CentralPanel, at minimum and normal viewport.
        // RawInput layout evidence only, not a physical OS-window screenshot.
        for (width, height) in [(850.0, 560.0), (1366.0, 768.0)] {
            let ctx = egui::Context::default();
            let mut source = QUICKSTART.to_owned();
            let original = source.clone();
            let mut session = tikz_authoring::Session::default();
            session.reset(&source);
            let mut status_rect = egui::Rect::NOTHING;
            let mut source_rect = egui::Rect::NOTHING;
            let mut guide_rect = egui::Rect::NOTHING;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(width, height),
                    )),
                    ..Default::default()
                },
                |ctx| {
                    egui::TopBottomPanel::top("b42-status-test-toolbar").show(ctx, |ui| {
                        ui.label("Studio: source + native TikZ guide");
                    });
                    status_rect = show_studio_status_panel(ctx, "Сохраните рисунок", false);
                    egui::SidePanel::right("b42-status-test-inspector")
                        .exact_width(225.0)
                        .show(ctx, |ui| {
                            ui.label("Русские пояснения C");
                        });
                    egui::SidePanel::left("b42-status-test-tools")
                        .exact_width(62.0)
                        .show(ctx, |ui| {
                            ui.label("TikZ");
                        });
                    source_rect = show_split_source_panel(
                        ctx,
                        SplitPanelLayout::for_width(ctx.available_rect().width()),
                        |ui| {
                            ui.add(egui::TextEdit::multiline(&mut source).code_editor());
                        },
                    );
                    guide_rect = egui::CentralPanel::default()
                        .show(ctx, |ui| {
                            tikz_canvas::show_guide_studio(
                                ui,
                                &mut session,
                                &mut source,
                                tikz_canvas::Capabilities {
                                    installed: true,
                                    loaded: Evidence::Confirmed,
                                    engine_compatible: true,
                                    implemented: true,
                                },
                            );
                        })
                        .response
                        .rect;
                },
            );
            assert!(status_rect.is_positive());
            assert!(source_rect.is_positive());
            assert!(guide_rect.is_positive());
            assert!(
                status_rect.width() >= width - 2.0,
                "status row not full width at {width}: {status_rect:?}"
            );
            assert!(
                source_rect.bottom() <= status_rect.top() + 1.0,
                "source hidden under status at {width}"
            );
            assert!(
                guide_rect.bottom() <= status_rect.top() + 1.0,
                "guide hidden under status at {width}"
            );
            assert_eq!(source, original);
            assert!(!session.undo_available());
        }
    }

    #[test]
    fn b42_studio_save_icon_event_persists_default_utf8_scratch_without_overwriting() {
        // The exact production icon handler is driven by egui pointer frames.
        // This is UNIT_EVENT, not an actual X11/Win10/macOS desktop run.
        fn frame(
            ctx: &egui::Context,
            document: &mut Document,
            destination: &Path,
            rect: &mut egui::Rect,
            events: Vec<egui::Event>,
        ) -> bool {
            let mut saved = false;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(850.0, 560.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::TopBottomPanel::top("b42-save-icon-event").show(ctx, |ui| {
                        ui.horizontal(|ui| {
                            let response = studio_ui::icon_button(
                                ui,
                                StudioIcon::Save,
                                false,
                                34.0,
                                "Сохранить исходник · Ctrl+S",
                            );
                            *rect = response.rect;
                            if response.clicked() {
                                let path =
                                    typed_save_destination(document, destination.to_str().unwrap())
                                        .unwrap();
                                document.save_to(&path).unwrap();
                                saved = true;
                            }
                        });
                    });
                },
            );
            saved
        }

        assert_eq!(DEFAULT_SCRATCH_FILENAME, "figure.tex");
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join(DEFAULT_SCRATCH_FILENAME);
        let original = "% исходный комментарий\r\n\\MyOpaque{Не менять}\r\n";
        let mut document = Document::scratch(original);
        let ctx = egui::Context::default();
        let mut rect = egui::Rect::NOTHING;
        assert!(!frame(&ctx, &mut document, &path, &mut rect, vec![]));
        assert!(rect.is_positive());
        let pos = rect.center();
        let button = |pressed| egui::Event::PointerButton {
            pos,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: Default::default(),
        };
        assert!(!frame(
            &ctx,
            &mut document,
            &path,
            &mut rect,
            vec![egui::Event::PointerMoved(pos), button(true)],
        ));
        assert!(frame(
            &ctx,
            &mut document,
            &path,
            &mut rect,
            vec![button(false)],
        ));
        assert_eq!(std::fs::read(&path).unwrap(), original.as_bytes());
        assert_eq!(Document::load(&path).unwrap().source, original);
        assert!(!document.dirty());

        let another_scratch = Document::scratch("% другой черновик\r\n");
        assert!(
            typed_save_destination(&another_scratch, path.to_str().unwrap()).is_err(),
            "the suggested scratch name must never overwrite a prior document"
        );
        assert_eq!(std::fs::read(&path).unwrap(), original.as_bytes());
    }

    #[test]
    fn b33_typed_save_rejects_existing_open_target_and_accepts_new_utf8_file() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("чужой-файл.tex");
        let original = "% чужие макросы\r\n\\MyOpaque{не менять}\r\n";
        std::fs::write(&target, original).unwrap();
        let mut scratch = Document::scratch("% набросок\n\\draw (0,0) -- (1,1);\n");
        assert!(typed_save_destination(&scratch, target.to_str().unwrap()).is_err());
        assert!(typed_save_destination(&scratch, "").is_err());

        let alias_dir = dir.path().join("alias-dir");
        std::fs::create_dir(&alias_dir).unwrap();
        let path_alias = alias_dir.join("..").join("чужой-файл.tex");
        assert!(typed_save_destination(&scratch, path_alias.to_str().unwrap()).is_err());
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            let alias = dir.path().join("shortcut.tex");
            symlink(&target, &alias).unwrap();
            assert!(typed_save_destination(&scratch, alias.to_str().unwrap()).is_err());
            let dangling = dir.path().join("broken.tex");
            symlink(dir.path().join("missing.tex"), &dangling).unwrap();
            assert!(typed_save_destination(&scratch, dangling.to_str().unwrap()).is_err());
        }

        let safe = dir.path().join("мой-рисунок.tex");
        let destination = typed_save_destination(&scratch, safe.to_str().unwrap()).unwrap();
        scratch.save_to(destination).unwrap();
        assert_eq!(std::fs::read_to_string(&target).unwrap(), original);
        assert!(std::fs::read_to_string(&safe).unwrap().contains("\\draw"));

        let mut opened = Document::load(&target).unwrap();
        opened.source.push_str("% обычная правка\n");
        assert_eq!(
            typed_save_destination(&opened, target.to_str().unwrap()).unwrap(),
            target
        );
        opened.save().unwrap();
        assert!(
            std::fs::read_to_string(&target)
                .unwrap()
                .contains("обычная правка")
        );
    }

    #[test]
    fn b32_pending_open_protects_the_target_and_other_existing_files() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("цель.tex");
        let target_source = "% чужой документ\r\n\\input{custom-macro}\r\n";
        std::fs::write(&target, target_source).unwrap();
        let mut scratch = Document::scratch(
            "\\documentclass{standalone}\n% мой черновик\n\\begin{document}тест\\end{document}\n",
        );
        assert!(scratch.dirty());
        assert!(pending_open_save_destination(&scratch, "", &target).is_err());
        assert!(
            pending_open_save_destination(&scratch, target.to_str().unwrap(), &target).is_err()
        );

        let alias_dir = dir.path().join("alias");
        std::fs::create_dir(&alias_dir).unwrap();
        let alias = alias_dir.join("..").join("цель.tex");
        assert!(pending_open_save_destination(&scratch, alias.to_str().unwrap(), &target).is_err());

        let occupied = dir.path().join("occupied.tex");
        std::fs::write(&occupied, "unrelated\n").unwrap();
        assert!(
            pending_open_save_destination(&scratch, occupied.to_str().unwrap(), &target).is_err()
        );

        let safe = dir.path().join("мой-сохранённый.tex");
        let resolved =
            pending_open_save_destination(&scratch, safe.to_str().unwrap(), &target).unwrap();
        scratch.save_to(resolved).unwrap();
        assert_eq!(std::fs::read_to_string(&target).unwrap(), target_source);
        assert_eq!(std::fs::read_to_string(&occupied).unwrap(), "unrelated\n");
        assert_eq!(
            Document::load(&target).unwrap().source,
            target_source,
            "opening must retrieve the target, not an overwritten scratch document"
        );

        let mut already_open = Document::load(&target).unwrap();
        already_open.source.push_str("% current document change\n");
        assert!(
            pending_open_save_destination(&already_open, target.to_str().unwrap(), &target,)
                .is_ok(),
            "reopening the same loaded file must remain possible"
        );
    }

    #[test]
    fn b42_dirty_open_scratch_preserves_safe_destination_on_real_egui_save_click() {
        // UNIT_EVENT: drive the production Save-and-open button. The File menu
        // may have changed its field to the incoming file; never save there.
        fn frame(
            ctx: &egui::Context,
            document: &Document,
            target: &Path,
            input: &mut String,
            events: Vec<egui::Event>,
        ) -> (Option<PendingOpenAction>, egui::Rect) {
            let mut result = (None, egui::Rect::NOTHING);
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(850.0, 560.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        let (action, rect, _) =
                            pending_open_controls(ui, document, target, input, None);
                        result = (action, rect);
                    });
                },
            );
            result
        }

        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("открыть.tex");
        let safe = dir.path().join("мой-черновик.tex");
        let original = "% чужой CRLF\r\n\\foreignMacro{Не менять}\r\n";
        let scratch_source = "% набросок\r\n\\opaqueUser{оставить}\r\n";
        std::fs::write(&target, original).unwrap();
        let mut scratch = Document::scratch(scratch_source);
        assert!(scratch.dirty());
        let mut input = initial_pending_open_save_path(&scratch, &target, &safe);
        assert_eq!(input, safe.to_str().unwrap());
        let ctx = egui::Context::default();
        let (_, button) = frame(&ctx, &scratch, &target, &mut input, vec![]);
        assert!(button.is_positive());
        let at = button.center();
        let pointer = |pressed| egui::Event::PointerButton {
            pos: at,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: Default::default(),
        };
        frame(
            &ctx,
            &scratch,
            &target,
            &mut input,
            vec![egui::Event::PointerMoved(at), pointer(true)],
        );
        assert_eq!(
            frame(&ctx, &scratch, &target, &mut input, vec![pointer(false)]).0,
            Some(PendingOpenAction::Save(safe.clone()))
        );
        scratch.save_to(&safe).unwrap();
        assert_eq!(std::fs::read(&safe).unwrap(), scratch_source.as_bytes());
        assert_eq!(Document::load(&target).unwrap().source, original);
        assert_eq!(Document::load(&safe).unwrap().source, scratch_source);
        assert_eq!(
            initial_pending_open_save_path(&Document::scratch(scratch_source), &target, &safe),
            "",
            "occupied destination must not be suggested again"
        );
        assert_eq!(
            initial_pending_open_save_path(&Document::scratch(scratch_source), &target, &target),
            "",
            "incoming target must not be proposed as scratch Save"
        );
        let mut loaded = Document::load(&target).unwrap();
        loaded.source.push_str("% ручная правка\r\n");
        assert_eq!(
            initial_pending_open_save_path(&loaded, &target, &safe),
            target.to_str().unwrap()
        );
    }

    #[test]
    fn b32_real_egui_pending_open_click_rejects_target_then_saves_elsewhere() {
        fn frame(
            ctx: &egui::Context,
            doc: &Document,
            open_target: &Path,
            save_field: &mut String,
            events: Vec<egui::Event>,
        ) -> (Option<PendingOpenAction>, egui::Rect) {
            let mut action = None;
            let mut rect = egui::Rect::NOTHING;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(850.0, 560.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        let result = pending_open_controls(ui, doc, open_target, save_field, None);
                        action = result.0;
                        rect = result.1;
                    });
                },
            );
            (action, rect)
        }
        fn click(
            ctx: &egui::Context,
            doc: &Document,
            target: &Path,
            save_field: &mut String,
            point: egui::Pos2,
        ) -> PendingOpenAction {
            let pointer = |pressed| egui::Event::PointerButton {
                pos: point,
                button: egui::PointerButton::Primary,
                pressed,
                modifiers: egui::Modifiers::default(),
            };
            frame(
                ctx,
                doc,
                target,
                save_field,
                vec![egui::Event::PointerMoved(point), pointer(true)],
            );
            frame(ctx, doc, target, save_field, vec![pointer(false)])
                .0
                .expect("the actual Save and open button must dispatch")
        }

        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("outside.tex");
        let original = "\\documentclass{article}\r\n% неприкосновенно\r\n";
        std::fs::write(&target, original).unwrap();
        let ctx = egui::Context::default();
        let mut doc = Document::scratch("% черновик\n\\myUnknown{тест}\n");
        let mut save_field = String::new();
        let (_, button) = frame(&ctx, &doc, &target, &mut save_field, vec![]);
        assert!(button.is_positive());
        let pos = button.center();
        assert!(matches!(
            click(&ctx, &doc, &target, &mut save_field, pos),
            PendingOpenAction::Reject(_),
        ));
        save_field = target.to_str().unwrap().to_owned();
        assert!(matches!(
            click(&ctx, &doc, &target, &mut save_field, pos),
            PendingOpenAction::Reject(_),
        ));
        assert_eq!(std::fs::read_to_string(&target).unwrap(), original);
        let safe = dir.path().join("own.tex");
        save_field = safe.to_str().unwrap().to_owned();
        assert_eq!(
            click(&ctx, &doc, &target, &mut save_field, pos),
            PendingOpenAction::Save(safe.clone())
        );
        doc.save_to(&safe).unwrap();
        assert_eq!(std::fs::read_to_string(&target).unwrap(), original);
        assert!(
            std::fs::read_to_string(&safe)
                .unwrap()
                .contains("\\myUnknown")
        );
        assert_eq!(Document::load(&target).unwrap().source, original);
    }

    #[test]
    fn b32_new_document_fences_old_native_textedit_history() {
        fn frame(
            ctx: &egui::Context,
            source: &mut String,
            reset: &mut bool,
            events: Vec<egui::Event>,
            modifiers: egui::Modifiers,
            focus_editor: bool,
        ) {
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(850.0, 560.0),
                    )),
                    events,
                    modifiers,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        let output = show_source_text_edit(ui, source, reset, false);
                        if focus_editor {
                            output.response.request_focus();
                        }
                    });
                },
            );
        }
        let ctx = egui::Context::default();
        let mut source = "% старый документ\n".to_owned();
        let mut reset = false;
        frame(
            &ctx,
            &mut source,
            &mut reset,
            vec![],
            Default::default(),
            true,
        );
        frame(
            &ctx,
            &mut source,
            &mut reset,
            vec![egui::Event::Text("ручная правка".into())],
            Default::default(),
            false,
        );
        assert!(source.contains("ручная правка"));
        // This is the load_path transition. It keeps the same egui TextEdit ID
        // but swaps the source; the first new-file frame clears old snapshots.
        let reopened = "% другой файл\n\\myOpaqueMacro{тест}\n".to_owned();
        source = reopened.clone();
        reset = true;
        frame(
            &ctx,
            &mut source,
            &mut reset,
            vec![],
            Default::default(),
            false,
        );
        assert!(!reset);
        frame(
            &ctx,
            &mut source,
            &mut reset,
            vec![],
            Default::default(),
            true,
        );
        let modifiers = egui::Modifiers {
            command: true,
            ctrl: true,
            ..Default::default()
        };
        frame(
            &ctx,
            &mut source,
            &mut reset,
            vec![egui::Event::Key {
                key: egui::Key::Z,
                physical_key: None,
                pressed: true,
                repeat: false,
                modifiers,
            }],
            modifiers,
            false,
        );
        assert_eq!(
            source, reopened,
            "native Undo after Open may not resurrect previous-file bytes"
        );
    }

    #[test]
    fn b34_dirty_open_modal_blocks_background_pointer_and_escape_cancels() {
        fn frame(
            ctx: &egui::Context,
            doc: &Document,
            target: &Path,
            save_input: &mut String,
            background_clicks: &mut usize,
            events: Vec<egui::Event>,
        ) -> (Option<PendingOpenAction>, egui::Rect) {
            let mut action = None;
            let mut behind = egui::Rect::NOTHING;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(850.0, 560.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        let button = ui.button("Background source action");
                        behind = button.rect;
                        if button.clicked() {
                            *background_clicks += 1;
                        }
                    });
                    action = show_pending_open_dialog(ctx, doc, target, save_input, None).0;
                },
            );
            (action, behind)
        }

        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("чужой.tex");
        let untouched = "% CRLF и неизвестный макрос\r\n\\Opaque{тест}\r\n";
        std::fs::write(&target, untouched).unwrap();
        let doc = Document::scratch("% черновик\n\\draw (0,0) -- (1,1);\n");
        let original = doc.source.clone();
        let ctx = egui::Context::default();
        let mut save_input = String::new();
        let mut clicked = 0;
        let (_, background) = frame(&ctx, &doc, &target, &mut save_input, &mut clicked, vec![]);
        assert!(background.is_positive());
        let pos = background.center();
        let pointer = |pressed| egui::Event::PointerButton {
            pos,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: egui::Modifiers::default(),
        };
        frame(
            &ctx,
            &doc,
            &target,
            &mut save_input,
            &mut clicked,
            vec![egui::Event::PointerMoved(pos), pointer(true)],
        );
        let (action, _) = frame(
            &ctx,
            &doc,
            &target,
            &mut save_input,
            &mut clicked,
            vec![pointer(false)],
        );
        assert!(action.is_none());
        assert_eq!(
            clicked, 0,
            "modal must block source/canvas controls behind it"
        );

        let (action, _) = frame(
            &ctx,
            &doc,
            &target,
            &mut save_input,
            &mut clicked,
            vec![egui::Event::Key {
                key: egui::Key::Escape,
                physical_key: None,
                pressed: true,
                repeat: false,
                modifiers: egui::Modifiers::default(),
            }],
        );
        assert_eq!(action, Some(PendingOpenAction::Cancel));
        assert_eq!(doc.source, original);
        assert_eq!(std::fs::read_to_string(target).unwrap(), untouched);
    }

    #[test]
    fn b34_focused_source_textedit_does_not_accept_keys_behind_modal() {
        fn frame(
            ctx: &egui::Context,
            source: &mut String,
            reset: &mut bool,
            dialog: (&Document, &Path, &mut String),
            state: (bool, bool),
            events: Vec<egui::Event>,
        ) {
            let (doc, target, save_field) = dialog;
            let (modal, focus_editor) = state;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(850.0, 560.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        if modal {
                            ui.disable();
                        }
                        let output = show_source_text_edit(ui, source, reset, false);
                        if focus_editor {
                            output.response.request_focus();
                        }
                    });
                    if modal {
                        show_pending_open_dialog(ctx, doc, target, save_field, None);
                    }
                },
            );
        }

        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("чужой.tex");
        let original_target = "% неприкосновенный\r\n\\Opaque{тест}\r\n";
        std::fs::write(&target, original_target).unwrap();
        let ctx = egui::Context::default();
        let mut source = "% редактируемый черновик\n".to_owned();
        let original_source = source.clone();
        let doc = Document::scratch(&source);
        let mut reset = false;
        let mut save_field = String::new();
        frame(
            &ctx,
            &mut source,
            &mut reset,
            (&doc, &target, &mut save_field),
            (false, true),
            vec![],
        );
        frame(
            &ctx,
            &mut source,
            &mut reset,
            (&doc, &target, &mut save_field),
            (true, false),
            vec![egui::Event::Text("НЕЛЬЗЯ_ВСТАВЛЯТЬ".into())],
        );
        assert_eq!(source, original_source);
        assert_eq!(std::fs::read_to_string(&target).unwrap(), original_target);
        // Closing the decision restores normal text editing.
        frame(
            &ctx,
            &mut source,
            &mut reset,
            (&doc, &target, &mut save_field),
            (false, true),
            vec![],
        );
        frame(
            &ctx,
            &mut source,
            &mut reset,
            (&doc, &target, &mut save_field),
            (false, false),
            vec![egui::Event::Text("РУЧНАЯ_ПРАВКА".into())],
        );
        assert!(source.contains("РУЧНАЯ_ПРАВКА"));
    }

    #[test]
    fn b35_rejected_save_is_legible_inside_real_egui_modal() {
        let ctx = egui::Context::default();
        let document = Document::scratch("% черновик\r\n\\Opaque{тест}\r\n");
        let target = Path::new("victim.tex");
        let mut destination = String::from("victim.tex");
        let message = "Файл уже существует. Выберите новое имя для сохранения.";
        let mut error_bounds = None;
        let _ = ctx.run(
            egui::RawInput {
                screen_rect: Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(850.0, 560.0),
                )),
                ..Default::default()
            },
            |ctx| {
                error_bounds = show_pending_open_dialog(
                    ctx,
                    &document,
                    target,
                    &mut destination,
                    Some(message),
                )
                .2;
            },
        );
        assert!(
            error_bounds.is_some_and(|rect| rect.is_positive()),
            "the rejection label must occupy a real layout rect inside the foreground egui modal"
        );
        assert_eq!(document.source, "% черновик\r\n\\Opaque{тест}\r\n");
    }
    #[test]
    fn b37_real_egui_pdf_lod_route_preserves_source_and_truthful_fit_feedback() {
        let ctx = egui::Context::default();
        let full_color =
            egui::ColorImage::from_rgba_unmultiplied([400, 160], &vec![255; 400 * 160 * 4]);
        let lod_color =
            egui::ColorImage::from_rgba_unmultiplied([100, 40], &vec![255; 100 * 40 * 4]);
        let full = ctx.load_texture("b37-original", full_color, egui::TextureOptions::LINEAR);
        let lod = ctx.load_texture("b37-prefiltered", lod_color, egui::TextureOptions::LINEAR);
        let mut source = format!("{QUICKSTART}\r\n% \\Unknown{{не переписывать}}\r\n");
        let unchanged = source.clone();
        let mut session = tikz_authoring::Session::default();
        session.reset(&source);
        let mut observed = None;
        let _ = ctx.run(
            egui::RawInput {
                screen_rect: Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(1180.0, 680.0),
                )),
                ..Default::default()
            },
            |ctx| {
                let layout = SplitPanelLayout::for_width(ctx.available_rect().width());
                show_split_inspector_panel(ctx, layout, |ui| {
                    ui.strong("Справка C · F1");
                });
                show_split_source_panel(ctx, layout, |ui| {
                    ui.add(egui::TextEdit::multiline(&mut source).code_editor());
                });
                egui::CentralPanel::default().show(ctx, |ui| {
                    let (small, uses_lod) = show_pdf_raster(ui, &full, Some(&lod), 0.26);
                    let (large, uses_full) = show_pdf_raster(ui, &full, Some(&lod), 0.75);
                    observed = Some((small.rect.size(), uses_lod, large.rect.size(), uses_full));
                    assert_eq!(page_fit_warning(false), None);
                    assert!(page_fit_warning(true).unwrap().contains("2%"));
                    // Genuine shared C handler still owns authoring, not
                    // the PDF preview or this display-only texture switch.
                    assert!(!session.undo_available());
                });
            },
        );
        let (small, lod_used, large, large_lod_used) = observed.unwrap();
        assert!(lod_used && !large_lod_used);
        assert!((small.x - 104.0).abs() < 0.5);
        assert!((small.y - 41.6).abs() < 0.5);
        assert!((large.x - 300.0).abs() < 0.5);
        assert_eq!(source, unchanged);
        assert!(!session.undo_available());
    }

    #[test]
    fn b36_compact_pdf_focus_switch_uses_real_egui_frames_and_keeps_tikz_source() {
        fn frame(
            ctx: &egui::Context,
            source: &mut String,
            session: &mut tikz_authoring::Session,
            focus: &mut bool,
            fit_active: &mut bool,
            events: Vec<egui::Event>,
        ) -> ([egui::Rect; 2], f32, f32, f32) {
            let mut buttons = [egui::Rect::NOTHING; 2];
            let mut pdf_height = 0.0;
            let mut fit_zoom = 0.0;
            let mut editor_width = 0.0;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(1180.0, 680.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::TopBottomPanel::top("b36_top").show(ctx, |ui| {
                        ui.label("TikZarium · editable source + exact external PDF");
                    });
                    let layout = SplitPanelLayout::for_width(ctx.available_rect().width());
                    show_split_inspector_panel(ctx, layout, |ui| {
                        ui.strong("C catalogue · русские свойства / F1");
                    });
                    show_split_source_panel(ctx, layout, |ui| {
                        editor_width = ui.available_width();
                        ui.add(egui::TextEdit::multiline(source).code_editor());
                    });
                    egui::CentralPanel::default().show(ctx, |ui| {
                        ui.heading("Canvas · exact XeLaTeX PDF");
                        ui.horizontal_wrapped(|ui| {
                            ui.label("Центр:");
                            buttons =
                                show_split_center_focus_switch(ui, focus, session, fit_active);
                        });
                        ui.small("Guide provisional, PDF exact; never PDF-to-source inversion.");
                        if !*focus {
                            tikz_canvas::show_guide(
                                ui,
                                session,
                                source,
                                tikz_canvas::Capabilities {
                                    installed: true,
                                    loaded: Evidence::Confirmed,
                                    engine_compatible: true,
                                    implemented: true,
                                },
                            );
                        }
                        ui.separator();
                        pdf_height = ui.available_height();
                        fit_zoom = fit_page_zoom(egui::vec2(1200.0, 1700.0), ui.available_size())
                            .unwrap_or(0.0);
                    });
                },
            );
            (buttons, pdf_height, fit_zoom, editor_width)
        }

        let ctx = egui::Context::default();
        let mut source = format!("{QUICKSTART}\n% \\OpaqueLabel{{кириллица}}\r\n");
        let original = source.clone();
        let mut authoring = tikz_authoring::Session::default();
        authoring.reset(&source);
        let mut focus = false;
        let mut fit_active = false;
        let drawing = frame(
            &ctx,
            &mut source,
            &mut authoring,
            &mut focus,
            &mut fit_active,
            vec![],
        );
        assert!(drawing.0[1].is_positive());
        assert!(drawing.3 > 180.0, "source panel was hidden");

        let click = |pos, pressed| egui::Event::PointerButton {
            pos,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: egui::Modifiers::default(),
        };
        let pdf_pos = drawing.0[1].center();
        frame(
            &ctx,
            &mut source,
            &mut authoring,
            &mut focus,
            &mut fit_active,
            vec![egui::Event::PointerMoved(pdf_pos), click(pdf_pos, true)],
        );
        let pdf = frame(
            &ctx,
            &mut source,
            &mut authoring,
            &mut focus,
            &mut fit_active,
            vec![click(pdf_pos, false)],
        );
        assert!(focus, "actual PDF toggle click was not dispatched");
        assert!(
            fit_active,
            "PDF focus should request a truthful whole-page fit"
        );
        assert!(
            pdf.1 > drawing.1 + 150.0,
            "compact PDF pane did not gain useful height: {} -> {}",
            drawing.1,
            pdf.1,
        );
        assert!(
            pdf.2 > drawing.2 + 0.03,
            "exact PDF fit did not improve: {} -> {}",
            drawing.2,
            pdf.2,
        );
        assert!(pdf.3 > 180.0, "PDF focus must not hide editable source");
        assert_eq!(
            source, original,
            "view toggling must not touch arbitrary TeX"
        );
        assert!(!authoring.undo_available(), "view toggling is not an edit");

        let draw_pos = pdf.0[0].center();
        frame(
            &ctx,
            &mut source,
            &mut authoring,
            &mut focus,
            &mut fit_active,
            vec![egui::Event::PointerMoved(draw_pos), click(draw_pos, true)],
        );
        let restored = frame(
            &ctx,
            &mut source,
            &mut authoring,
            &mut focus,
            &mut fit_active,
            vec![click(draw_pos, false)],
        );
        assert!(!focus, "return to the six native TikZ tools was lost");
        assert!(restored.1 < pdf.1 - 150.0);
        assert_eq!(source, original);
        assert!(!authoring.undo_available());
    }
}

#[cfg(test)]
mod b42_file_popup_tests {
    use super::*;

    fn frame(
        ctx: &egui::Context,
        file_field: &mut String,
        events: Vec<egui::Event>,
        modifiers: egui::Modifiers,
    ) -> StudioFileMenuResponse {
        let mut result = None;
        let _ = ctx.run(
            egui::RawInput {
                screen_rect: Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(850.0, 560.0),
                )),
                events,
                modifiers,
                ..Default::default()
            },
            |ctx| {
                egui::TopBottomPanel::top("b42-file-popup-event").show(ctx, |ui| {
                    ui.horizontal(|ui| {
                        ui.strong("TikZarium");
                        ui.separator();
                        result = Some(show_studio_file_menu(ui, file_field, true));
                    });
                });
                egui::CentralPanel::default().show(ctx, |_ui| {});
            },
        );
        result.expect("the production File menu was not laid out")
    }

    fn pointer(pos: egui::Pos2, pressed: bool) -> egui::Event {
        egui::Event::PointerButton {
            pos,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: egui::Modifiers::default(),
        }
    }

    fn click(
        ctx: &egui::Context,
        file_field: &mut String,
        pos: egui::Pos2,
    ) -> (StudioFileMenuResponse, StudioFileMenuResponse) {
        frame(
            ctx,
            file_field,
            vec![egui::Event::PointerMoved(pos), pointer(pos, true)],
            Default::default(),
        );
        let released = frame(
            ctx,
            file_field,
            vec![pointer(pos, false)],
            Default::default(),
        );
        let settled = frame(ctx, file_field, vec![], Default::default());
        (released, settled)
    }

    #[test]
    fn b42_file_textedit_click_keeps_popup_open_then_real_open_action() {
        // I62 repro: old ui.menu_button closed the popup upon focusing TextEdit.
        // UNIT_EVENT through the actual production menu, NOT physical X11.
        let directory = tempfile::tempdir().unwrap();
        let second = directory.path().join("second-crlf.tex");
        let untouched = "% Не менять\r\n\\OpaqueSecond{тест}\r\n";
        std::fs::write(&second, untouched).unwrap();

        let ctx = egui::Context::default();
        let mut field = "figure.tex".to_owned();
        let initial = frame(&ctx, &mut field, vec![], Default::default());
        assert!(initial.trigger_rect.is_positive());
        let (_, opened) = click(&ctx, &mut field, initial.trigger_rect.center());
        assert!(opened.path_rect.is_some(), "File popup did not open");

        let (_, focused) = click(&ctx, &mut field, opened.path_rect.unwrap().center());
        assert!(
            focused.path_rect.is_some(),
            "clicking inside File TextEdit must not dismiss the popup"
        );
        let control = egui::Modifiers {
            ctrl: true,
            command: true,
            ..Default::default()
        };
        frame(
            &ctx,
            &mut field,
            vec![egui::Event::Key {
                key: egui::Key::A,
                physical_key: None,
                pressed: true,
                repeat: false,
                modifiers: control,
            }],
            control,
        );
        frame(
            &ctx,
            &mut field,
            vec![egui::Event::Key {
                key: egui::Key::A,
                physical_key: None,
                pressed: false,
                repeat: false,
                modifiers: control,
            }],
            Default::default(),
        );
        let entered = frame(
            &ctx,
            &mut field,
            vec![egui::Event::Text("second-crlf.tex".into())],
            Default::default(),
        );
        assert_eq!(
            field, "second-crlf.tex",
            "focused File TextEdit must replace the path"
        );
        assert!(
            entered.path_rect.is_some(),
            "typing must not close the menu"
        );

        let visible = frame(&ctx, &mut field, vec![], Default::default());
        let open_rect = visible
            .open_rect
            .expect("Open button not visible after editing");
        let (activated, closed) = click(&ctx, &mut field, open_rect.center());
        assert_eq!(activated.action, Some(StudioFileAction::OpenPath));
        assert!(
            closed.path_rect.is_none(),
            "Open must explicitly close File"
        );
        assert_eq!(std::fs::read(&second).unwrap(), untouched.as_bytes());
        assert_eq!(Document::load(&second).unwrap().source, untouched);
    }
}

#[cfg(test)]
mod elevated_user_warning_ui_tests {
    use super::*;

    #[test]
    fn warning_renders_in_actual_egui_frame_without_console() {
        // UNIT_EVENT, not proof of a physical Windows interactive desktop.
        let ctx = egui::Context::default();
        let mut rect = egui::Rect::NOTHING;
        let output = ctx.run(
            egui::RawInput {
                screen_rect: Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(850.0, 560.0),
                )),
                ..Default::default()
            },
            |ctx| {
                rect = show_current_user_privilege_banner(
                    ctx,
                    "⚠ Administrator: XeLaTeX с текущими правами; только доверенный документ.",
                );
                egui::CentralPanel::default().show(ctx, |_ui| {});
            },
        );
        assert!(rect.is_positive(), "warning must occupy GUI space");
        assert!(
            !output.shapes.is_empty(),
            "warning must paint real egui shapes"
        );
    }
}
