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

mod ui_state;
use ui_state::{BottomView, WorkspaceMode, line_start_char_index, preview_is_stale, scaled_zoom};

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
    building_source: Option<String>,
    zoom: f32,
    receiver: Option<Receiver<Result<BuildArtifact, BuildError>>>,
    cancellation: Option<BuildService>,
    show_packages: bool,
    show_log: bool,
    pending_open: Option<PathBuf>,
}

impl TikzariumApp {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        cc.egui_ctx.set_visuals(egui::Visuals::dark());
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
            building_source: None,
            zoom: 1.0,
            receiver: None,
            cancellation: None,
            show_packages: true,
            show_log: true,
            pending_open: None,
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
                self.built_source = None;
                self.diagnostics.clear();
                self.log.clear();
                self.jump_to_line = None;
                self.last_build_failed = false;
                self.preview_texture = None;
                self.pdf = None;
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
            source,
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
            match result {
                Ok(artifact) => {
                    self.diagnostics = artifact.diagnostics.clone();
                    self.last_build_failed = false;
                    self.preview_texture = None;
                    self.preview_status = "Exact PDF created by XeLaTeX".into();
                    match artifact.preview {
                        Ok(Some(bitmap)) => match image::load_from_memory(&bitmap.png) {
                            Ok(image) => {
                                let rgba = image.to_rgba8();
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
                    self.status = format!(
                        "Built in {:.2}s; {} inputs; {} diagnostics",
                        artifact.elapsed.as_secs_f64(),
                        artifact.dependencies.len(),
                        artifact.diagnostics.len()
                    );
                }
                Err(error) => {
                    self.last_build_failed = true;
                    self.diagnostics = vec![BuildDiagnostic {
                        severity: Severity::Error,
                        message: error.to_string(),
                        line: None,
                    }];
                    self.bottom_view = BottomView::Issues;
                    self.show_log = true;
                    self.log = error.to_string();
                    self.preview_status = if self.pdf.is_some() {
                        "Build failed — last good PDF retained (stale)".into()
                    } else {
                        "Build failed — no PDF available".into()
                    };
                    self.status = format!("Build failed: {error}");
                }
            }
        }
        if self.receiver.is_some() {
            ctx.request_repaint_after(Duration::from_millis(75));
        }
    }

    fn export(&mut self) {
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
                        output
                            .state
                            .cursor
                            .set_char_range(Some(CCursorRange::one(CCursor::new(position))));
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

    fn show_pdf_canvas(&mut self, ui: &mut egui::Ui) {
        let canvas_width = ui.available_width();
        ui.horizontal_wrapped(|ui| {
            ui.heading("Canvas · exact PDF (read-only)");
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
        if preview_is_stale(
            self.pdf.is_some(),
            self.last_build_failed,
            self.built_source.as_deref(),
            &self.document.source,
        ) {
            ui.colored_label(
                egui::Color32::YELLOW,
                "STALE · last successful PDF, not current source",
            );
        }
        ui.label(&self.preview_status);
        ui.small(
            "Showing page 1 only; multi-page navigation and source-linked canvas edits are pending.",
        );
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
}

impl eframe::App for TikzariumApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.poll_build(ctx);
        egui::TopBottomPanel::top("tools").show(ctx, |ui| {
            ui.horizontal_wrapped(|ui| {
                ui.heading("TikZarium");
                if ui.button("Open").clicked() {
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
                ui.label("Path:");
                ui.add(
                    egui::TextEdit::singleline(&mut self.file_field)
                        .desired_width(280.0)
                        .hint_text("path/to/figure.tex"),
                );
                if ui.button("Open path").clicked() {
                    self.open_path(PathBuf::from(self.file_field.trim()));
                }
                if ui.button("Save").clicked() {
                    self.save();
                }
                if ui.button("Save As…").clicked() {
                    self.save_as();
                }
                if ui
                    .add_enabled(
                        self.receiver.is_none(),
                        egui::Button::new("Build (XeLaTeX)"),
                    )
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
                    .add_enabled(self.pdf.is_some(), egui::Button::new("Export PDF"))
                    .clicked()
                {
                    self.export();
                }
                if ui.button("Discover TeX").clicked() {
                    self.refresh_tex();
                }
            });
            ui.horizontal_wrapped(|ui| {
                ui.label("Workspace:");
                ui.selectable_value(&mut self.workspace, WorkspaceMode::Source, "Source");
                ui.selectable_value(&mut self.workspace, WorkspaceMode::Split, "Split");
                ui.selectable_value(&mut self.workspace, WorkspaceMode::Canvas, "Canvas");
                ui.separator();
                ui.checkbox(&mut self.show_packages, "Packages");
                ui.checkbox(&mut self.show_log, "Diagnostics / log");
                if self.document.dirty() {
                    ui.colored_label(egui::Color32::YELLOW, "Unsaved edits");
                }
                if preview_is_stale(
                    self.pdf.is_some(),
                    self.last_build_failed,
                    self.built_source.as_deref(),
                    &self.document.source,
                ) {
                    ui.colored_label(egui::Color32::YELLOW, "PDF stale");
                }
                ui.label(&self.status);
            });
        });
        if self.show_packages {
            egui::SidePanel::right("packages")
                .resizable(true)
                .default_width(245.0)
                .show(ctx, |ui| {
                    ui.heading("Libraries");
                    ui.small("Package detection ≠ verified compilation ≠ visual editing");
                    ui.separator();
                    egui::ScrollArea::vertical().show(ui, |ui| {
                        for item in &self.package_statuses {
                            let state = if item.installed {
                                "Installed"
                            } else {
                                "Missing"
                            };
                            ui.strong(format!("{} — {state}", item.manifest.display_name));
                            if !item.missing_files.is_empty() {
                                ui.small(format!("Needed: {}", item.missing_files.join(", ")));
                            }
                            ui.small("Visual editing: not yet implemented");
                            ui.separator();
                        }
                    });
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
                                    let label = match item.line {
                                        Some(line) => {
                                            format!("{severity} · line {line} · {}", item.message)
                                        }
                                        None => format!("{severity} · {}", item.message),
                                    };
                                    if let Some(line) = item.line {
                                        if ui.button(label).clicked() {
                                            self.jump_to_line = Some(line);
                                            if !self.workspace.show_source() {
                                                self.workspace = WorkspaceMode::Split;
                                            }
                                        }
                                    } else {
                                        ui.label(label);
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
