//! Native egui workbench. XeLaTeX PDF is authoritative; no fake Rust render.
use eframe::egui;
use std::{
    path::PathBuf,
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
use preview_image::decode_preview_png;
use source_fonts::scan_explicit_font_hints;
use ui_theme::{STORAGE_KEY, UiPreferences};

const QUICKSTART: &str = include_str!("../../../examples/quickstart.tex");

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
    pdf: Option<Vec<u8>>,
    built_source: Option<String>,
    built_path: Option<PathBuf>,
    building_source: Option<String>,
    building_path: Option<PathBuf>,
    zoom: f32,
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
    prefs: UiPreferences,
    authoring: tikz_authoring::Session,
    highlight_generated_line: bool,
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
            pdf: None,
            built_source: None,
            built_path: None,
            building_source: None,
            building_path: None,
            zoom: 1.0,
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
            prefs,
            authoring: {
                let mut state = tikz_authoring::Session::default();
                state.reset(QUICKSTART);
                state
            },
            highlight_generated_line: false,
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
            if self.file_field.trim().is_empty() {
                self.status =
                    "Enter a destination .tex path (no native dialog on this host)".into();
                return false;
            }
            self.save_to_path(PathBuf::from(self.file_field.trim()))
        }
    }

    fn save(&mut self) -> bool {
        if let Some(path) = self.document.path.clone() {
            return self.save_to_path(path);
        }
        if !self.file_field.trim().is_empty() {
            return self.save_to_path(PathBuf::from(self.file_field.trim()));
        }
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
                let mut output = egui::TextEdit::multiline(&mut self.document.source)
                    .code_editor()
                    .desired_width(f32::INFINITY)
                    .desired_rows(36)
                    .show(ui);
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
                        output.response.request_focus();
                        let row_height = ui.text_style_height(&egui::TextStyle::Monospace);
                        let y = output.response.rect.top()
                            + (line.saturating_sub(1) as f32) * row_height;
                        ui.scroll_to_rect(
                            egui::Rect::from_min_size(
                                egui::pos2(output.response.rect.left(), y),
                                egui::vec2(1.0, row_height),
                            ),
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
            loaded: tikz_authoring::tikz_loaded(&self.document.source),
            engine_compatible: self.tex.xelatex.is_some()
                && core.is_some_and(|status| {
                    status.compilation != tikzarium_extensions::CompilationState::IncompatibleEngine
                }),
            implemented: true, // The six B mouse gestures are backed by C07 generators.
            arrows_loaded: tikz_authoring::library_loaded(
                &self.document.source,
                "arrows.meta",
            ),
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
        ui.horizontal_wrapped(|ui| {
            ui.heading("Canvas · exact PDF (read-only)");
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
                self.zoom = scaled_zoom(self.zoom, 1.0 / 1.2);
            }
            ui.label(format!("{}%", (self.zoom * 100.0).round() as u32));
            if ui.button("+").clicked() {
                self.zoom = scaled_zoom(self.zoom, 1.2);
            }
            if ui.button("100%").clicked() {
                self.zoom = 1.0;
            }
            let fit = self.preview_texture.as_ref().map(|texture| {
                ((canvas_width - 24.0).max(80.0) / texture.size_vec2().x).clamp(0.2, 5.0)
            });
            if ui
                .add_enabled(fit.is_some(), egui::Button::new("Fit width"))
                .clicked()
                && let Some(fit) = fit
            {
                self.zoom = fit;
            }
        });
        if self.preview_stale() {
            ui.colored_label(
                egui::Color32::YELLOW,
                "STALE · last successful PDF, not current source",
            );
        }
        ui.label(&self.preview_status);
        ui.small(&self.page_navigation_status);
        ui.small("Only the guide pad below makes B07-owned source patches. This exact PDF is read-only and is NOT coordinate-aligned with the guide.");
        let caps = self.primitive_capabilities();
        if let Some(line) =
            tikz_canvas::show_guide(ui, &mut self.authoring, &mut self.document.source, caps)
        {
            self.jump_to_line = Some(line);
            self.highlight_generated_line = true;
        }
        ui.separator();
        egui::ScrollArea::both()
            .auto_shrink([false, false])
            .show(ui, |ui| {
                if let Some(texture) = &self.preview_texture {
                    ui.image((texture.id(), texture.size_vec2() * self.zoom));
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
        self.poll_font_proof(ctx);
        self.show_font_lab(ctx);
        if ctx.input(|input| input.key_pressed(egui::Key::F1)) {
            self.authoring.help = !self.authoring.help;
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
        egui::TopBottomPanel::top("tools").show(ctx, |ui| {
            ui.horizontal_wrapped(|ui| {
                ui.heading("TikZarium");
                if ui
                    .add_enabled(self.receiver.is_none(), egui::Button::new("Open"))
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
                    .add_enabled(self.receiver.is_none(), egui::Button::new("Open path"))
                    .clicked()
                {
                    self.open_path(PathBuf::from(self.file_field.trim()));
                }
                if ui
                    .add_enabled(self.receiver.is_none(), egui::Button::new("Save"))
                    .on_hover_text("Ctrl+S / Cmd+S")
                    .clicked()
                {
                    self.save();
                }
                if ui
                    .add_enabled(self.receiver.is_none(), egui::Button::new("Save As…"))
                    .on_hover_text("Ctrl+Shift+S / Cmd+Shift+S")
                    .clicked()
                {
                    self.save_as();
                }
                if ui
                    .add_enabled(
                        self.receiver.is_none(),
                        egui::Button::new("Build (XeLaTeX)"),
                    )
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
        if self.workspace.show_canvas() {
            egui::SidePanel::right("tikz-source-inspector")
                .resizable(true)
                .default_width(250.0)
                .min_width(210.0)
                .show(ctx, |ui| {
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
            egui::SidePanel::left("source")
                .resizable(true)
                .default_width(500.0)
                .min_width(240.0)
                .show(ctx, |ui| {
                    self.show_source_editor(ui);
                });
        }
        egui::CentralPanel::default().show(ctx, |ui| {
            if self.workspace.show_canvas() {
                self.show_pdf_canvas(ui);
            } else {
                self.show_source_editor(ui);
            }
        });
        if let Some(path) = self.pending_open.clone() {
            egui::Window::new("Unsaved edits")
                .collapsible(false)
                .show(ctx, |ui| {
                    ui.label(
                        "Save the current document or discard changes before opening another file.",
                    );
                    ui.horizontal(|ui| {
                        if ui.button("Save and open").clicked() && self.save() {
                            self.pending_open = None;
                            self.load_path(path.clone());
                        }
                        if ui.button("Discard and open").clicked() {
                            self.pending_open = None;
                            self.load_path(path.clone());
                        }
                        if ui.button("Cancel").clicked() {
                            self.pending_open = None;
                        }
                    });
                });
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
