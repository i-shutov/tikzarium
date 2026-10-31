//! Native egui workbench. XeLaTeX PDF is authoritative; no fake Rust render.
use eframe::egui;
use std::{
    path::PathBuf,
    sync::mpsc::{self, Receiver, TryRecvError},
    time::Duration,
};
use tikzarium_core::{
    BuildArtifact, BuildError, BuildOptions, BuildRequest, BuildService, Document, TexEnvironment,
};
use tikzarium_extensions::{ExtensionStatus, Registry};

const QUICKSTART: &str = include_str!("../../../examples/quickstart.tex");

struct TikzariumApp {
    document: Document,
    file_field: String,
    tex: TexEnvironment,
    package_statuses: Vec<ExtensionStatus>,
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
                self.preview_texture = None;
                self.pdf = None;
                self.preview_status = "Not built".into();
                self.status = format!("Opened {}", path.display());
            }
            Err(err) => self.status = format!("Open failed: {err}"),
        }
    }

    fn save(&mut self) -> bool {
        let path = if !self.file_field.trim().is_empty() {
            PathBuf::from(self.file_field.trim())
        } else if let Some(path) = &self.document.path {
            path.clone()
        } else {
            self.status = "Enter the destination .tex file path first".into();
            return false;
        };
        match self.document.save_to(&path) {
            Ok(()) => {
                self.file_field = path.display().to_string();
                self.status = "Saved".into();
                true
            }
            Err(error) => {
                self.status = format!("Save failed: {error}");
                false
            }
        }
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
                ui.checkbox(&mut self.show_packages, "Packages");
                ui.checkbox(&mut self.show_log, "Build log");
                if self.document.dirty() {
                    ui.colored_label(egui::Color32::YELLOW, "Unsaved edits");
                }
                if self
                    .built_source
                    .as_ref()
                    .is_some_and(|built| built != &self.document.source)
                {
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
                .default_height(130.0)
                .show(ctx, |ui| {
                    ui.horizontal(|ui| {
                        ui.strong("XeLaTeX log");
                        if ui.button("Copy").clicked() {
                            ui.ctx().copy_text(self.log.clone());
                        }
                    });
                    egui::ScrollArea::both().show(ui, |ui| {
                        ui.add(
                            egui::TextEdit::multiline(&mut self.log)
                                .font(egui::TextStyle::Monospace)
                                .desired_width(f32::INFINITY)
                                .desired_rows(5)
                                .interactive(false),
                        );
                    });
                });
        }
        egui::SidePanel::left("source")
            .resizable(true)
            .default_width(500.0)
            .min_width(240.0)
            .show(ctx, |ui| {
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
                        ui.add(
                            egui::TextEdit::multiline(&mut self.document.source)
                                .code_editor()
                                .desired_width(f32::INFINITY)
                                .desired_rows(40),
                        );
                    });
            });
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.heading("Exact PDF preview");
                if ui.button("−").clicked() { self.zoom = (self.zoom / 1.2).max(0.2); }
                ui.label(format!("{}%", (100.0 * self.zoom) as u32));
                if ui.button("+").clicked() { self.zoom = (self.zoom * 1.2).min(5.0); }
            });
            ui.label(&self.preview_status);
            ui.separator();
            egui::ScrollArea::both().auto_shrink([false, false]).show(ui, |ui| {
                if let Some(texture) = &self.preview_texture {
                    ui.image((texture.id(), texture.size_vec2() * self.zoom));
                } else {
                    ui.vertical_centered(|ui| {
                        ui.add_space(60.0);
                        ui.label("Build a TeX file to show page 1 here.");
                        ui.small("XeLaTeX generates exact PDF; pdftoppm rasterizes only the viewport.");
                        if let Some(pdf) = &self.pdf {
                            ui.label(format!("PDF in memory: {} bytes. Use Export PDF.", pdf.len()));
                        }
                    });
                }
            });
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
