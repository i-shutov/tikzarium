//! Native egui workbench. XeLaTeX PDF is authoritative; no fake Rust render.
use eframe::egui;
use std::{
    path::{Path, PathBuf},
    sync::mpsc::{self, Receiver, TryRecvError},
    time::Duration,
};
use tikzarium_core::{
    BuildArtifact, BuildDiagnostic, BuildError, BuildOptions, BuildRequest, BuildService, Document,
    Severity, TexEnvironment,
};
use tikzarium_extensions::{ExtensionStatus, Registry};

mod font_proof;
mod pdf_navigation;
mod preview_image;
mod source_fonts;
mod tikz_authoring;
mod tikz_canvas;
mod ui_state;
mod ui_theme;
use ui_state::{
    BottomView, EditorCommand, WorkspaceMode, diagnostic_targets_current_file, editor_command,
    line_start_char_index, preview_is_stale, scaled_zoom,
};

use font_proof::{FontProofResult, spawn_font_proof};
use pdf_navigation::{
    PageCountReceiver, PageRenderReceiver, can_navigate, spawn_page_count, spawn_page_render,
};
use preview_image::{PreviewLodReceiver, decode_preview_png, spawn_preview_lod};
use source_fonts::scan_explicit_font_hints;
use ui_theme::{STORAGE_KEY, UiPreferences};

const QUICKSTART: &str = include_str!("../../../examples/quickstart.tex");

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
) {
    egui::SidePanel::left("source")
        .resizable(true)
        .default_width(layout.source_default)
        .min_width(240.0)
        .max_width(layout.source_max)
        .show(ctx, add_contents);
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

/// Switching documents must not reuse egui TextEdit's native Undo snapshots:
/// those snapshots belong to the old .tex buffer, not the new source file.
fn show_source_text_edit(
    ui: &mut egui::Ui,
    source: &mut String,
    reset_undo_history: &mut bool,
) -> egui::text_edit::TextEditOutput {
    let fenced = *reset_undo_history;
    let mut output = egui::TextEdit::multiline(source)
        .code_editor()
        .desired_width(f32::INFINITY)
        .desired_rows(36)
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

/// A typed path is not explicit permission to overwrite another TeX file.
/// Linux without a native Save As dialog must fail closed on occupied paths;
/// the platform file dialog on Windows/macOS handles intentional replacement.
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

struct TikzariumApp {
    document: Document,
    file_field: String,
    tex: TexEnvironment,
    package_statuses: Vec<ExtensionStatus>,
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
    show_log: bool,
    pending_open: Option<PathBuf>,
    pending_open_save_path: String,
    pending_open_validation_error: Option<String>,
    prefs: UiPreferences,
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

impl TikzariumApp {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        let prefs = cc
            .storage
            .and_then(|storage| eframe::get_value::<UiPreferences>(storage, STORAGE_KEY))
            .unwrap_or_default();
        prefs.theme.apply(&cc.egui_ctx, prefs.compact);
        let tex = TexEnvironment::discover();
        let registry = Registry::new().expect("built-in extension manifests must validate");
        let package_statuses = registry.status(&tex); // cache; never spawn kpsewhich every frame
        Self {
            document: Document::scratch(QUICKSTART),
            file_field: String::new(),
            tex,
            package_statuses,
            diagnostics: Vec::new(),
            workspace: WorkspaceMode::Split,
            bottom_view: BottomView::Issues,
            jump_to_line: None,
            last_build_failed: false,
            log: String::new(),
            status: "Save the starter as a .tex file, then Build".into(),
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
            show_log: true,
            pending_open: None,
            pending_open_save_path: String::new(),
            pending_open_validation_error: None,
            prefs,
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
            self.pending_open_save_path = self
                .document
                .path
                .as_ref()
                .map(|current| current.display().to_string())
                .unwrap_or_default();
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
        if self.receiver.is_some() {
            return;
        }
        let Some(xelatex) = self.tex.xelatex.clone() else {
            self.status =
                "XeLaTeX missing: install TeX Live/MiKTeX or set TIKZARIUM_XELATEX".into();
            return;
        };
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
        let completed = self.preview_lod_rx.as_ref().and_then(|rx| match rx.try_recv() {
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

    fn refresh_tex(&mut self) {
        self.tex = TexEnvironment::discover();
        self.package_statuses = Registry::new()
            .expect("built-in manifests must validate")
            .status(&self.tex);
        self.status = format!("XeLaTeX: {:?}", self.tex.xelatex);
    }
    fn show_source_editor(&mut self, ui: &mut egui::Ui) {
        if self.pending_open.is_some() {
            ui.disable();
        }
        ui.heading("TeX / TikZ source");
        ui.small(
            self.document
                .path
                .as_ref()
                .map_or("Scratch: save as .tex", |p| {
                    p.to_str().unwrap_or("Unicode path")
                }),
        );
        ui.separator();
        egui::ScrollArea::both()
            .auto_shrink([false, false])
            .show(ui, |ui| {
                let mut output = show_source_text_edit(
                    ui,
                    &mut self.document.source,
                    &mut self.reset_source_editor_undo_history,
                );
                // Both the desktop and UNIT_EVENT frames handle the same
                // TextEdit change signal before visual Undo can be offered.
                tikz_canvas::observe_source_text_edit(
                    &output.response,
                    &mut self.authoring,
                    &self.document.source,
                );
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
    }

    fn show_pdf_canvas(&mut self, ui: &mut egui::Ui) {
        let canvas_width = ui.available_width();
        let mut displayed_zoom_percent = pdf_zoom_percent(self.zoom);
        ui.horizontal_wrapped(|ui| {
            ui.heading("Canvas · exact PDF (read-only)");
            if self.workspace == WorkspaceMode::Split {
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
        ui.small("The guide pad edits N1-owned source through the shared TikZ catalogue. This exact PDF is read-only and is NOT coordinate-aligned with the guide.");
        if self.workspace == WorkspaceMode::Split && !self.pdf_focus_in_split {
            let caps = self.primitive_capabilities();
            let guide_undo_key = ui.input(|input| {
                input.key_pressed(egui::Key::Z)
                    && input.modifiers.command
                    && !input.modifiers.shift
                    && !input.modifiers.alt
            });
            if let Some(line) =
                tikz_canvas::show_guide(ui, &mut self.authoring, &mut self.document.source, caps)
            {
                // Fallback Undo can run inside the guide after the source
                // panel has rendered; fence its native history next frame.
                if guide_undo_key {
                    self.reset_source_editor_undo_history = true;
                }
                self.jump_to_line = Some(line);
                self.highlight_generated_line = true;
                // The source SidePanel has already been rendered this frame.
                // Schedule a second frame so the created TikZ command is focused
                // and highlighted without requiring another mouse interaction.
                ui.ctx().request_repaint();
            }
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
                    let _ = show_pdf_raster(
                        ui,
                        texture,
                        self.preview_lod_texture.as_ref(),
                        self.zoom,
                    );
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

impl eframe::App for TikzariumApp {
    fn save(&mut self, storage: &mut dyn eframe::Storage) {
        eframe::set_value(storage, STORAGE_KEY, &self.prefs);
    }

    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.poll_build(ctx);
        self.poll_pages(ctx);
        self.poll_preview_lod(ctx);
        self.poll_font_proof(ctx);
        self.show_font_lab(ctx);
        // Pending dirty-Open decisions own the keyboard: do not change source
        // through a global help/visual Undo shortcut behind the modal.
        if self.pending_open.is_none() {
            tikz_canvas::handle_help_shortcut(ctx, &mut self.authoring);
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
        let shortcut = ctx.input(|input| {
            if input.key_pressed(egui::Key::S) {
                editor_command(egui::Key::S, input.modifiers)
            } else if input.key_pressed(egui::Key::O) {
                editor_command(egui::Key::O, input.modifiers)
            } else if input.key_pressed(egui::Key::Enter) {
                editor_command(egui::Key::Enter, input.modifiers)
            } else {
                None
            }
        });
        // A modal or running XeLaTeX run must not change the active file mid-build.
        if self.receiver.is_none() && self.pending_open.is_none() {
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
        let file_actions_enabled = self.receiver.is_none() && self.pending_open.is_none();
        egui::TopBottomPanel::top("tools").show(ctx, |ui| {
            if self.pending_open.is_some() {
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
                    self.refresh_tex();
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
        let split_layout = SplitPanelLayout::for_width(ctx.available_rect().width());
        if self.workspace == WorkspaceMode::Split {
            show_split_inspector_panel(ctx, split_layout, |ui| {
                if self.pending_open.is_some() {
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
                ui.separator();
                egui::ScrollArea::vertical()
                    .auto_shrink([false, false])
                    .show(ui, |ui| self.show_authoring_inspector(ui));
            });
        }
        if self.show_log {
            egui::TopBottomPanel::bottom("log")
                .resizable(true)
                .default_height(145.0)
                .show(ctx, |ui| {
                    if self.pending_open.is_some() {
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
        if self.workspace == WorkspaceMode::Split {
            show_split_source_panel(ctx, split_layout, |ui| {
                self.show_source_editor(ui);
            });
        }
        egui::CentralPanel::default().show(ctx, |ui| {
            if self.pending_open.is_some() {
                ui.disable();
            }
            if self.workspace.show_canvas() {
                self.show_pdf_canvas(ui);
            } else {
                self.show_source_editor(ui);
            }
        });
        if let Some(path) = self.pending_open.clone() {
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
    }
}

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size(egui::vec2(1250.0, 800.0))
            .with_min_inner_size(egui::vec2(850.0, 560.0)),
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
    use tikzarium_extensions::primitives::Evidence;

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
                        let output = show_source_text_edit(ui, source, reset);
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
                        let output = show_source_text_edit(ui, source, reset);
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
        use tikzarium_extensions::primitives::Evidence;

        let ctx = egui::Context::default();
        let full_color = egui::ColorImage::from_rgba_unmultiplied(
            [400, 160],
            &vec![255; 400 * 160 * 4],
        );
        let lod_color = egui::ColorImage::from_rgba_unmultiplied(
            [100, 40],
            &vec![255; 100 * 40 * 4],
        );
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
                    observed = Some((
                        small.rect.size(),
                        uses_lod,
                        large.rect.size(),
                        uses_full,
                    ));
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
        let _ = Evidence::Confirmed;
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
