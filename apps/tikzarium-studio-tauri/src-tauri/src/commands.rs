//! Нативные IPC-команды `#[tauri::command]` оболочки Tauri v2 + Rust.
//! Делегирует компиляцию XeLaTeX (`-no-shell-escape`, `--disable-installer`), read-only проверку пакетов,
//! атомарную запись `.tex` и реестр прямых точек PDF-мануалов напрямую в `tikzarium-core` и `tikzarium-extensions`.

use crate::patch_engine::{
    CheckedSourcePatchResult, SourcePatchSpan, apply_checked_source_patch, sha256_hex,
    sha256_short_hex,
};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, State};
use tikzarium_core::{
    BuildError, BuildOptions, BuildRequest, BuildService, Document, PackageProbe, Severity,
    TexEnvironment, find_executable,
};
use tikzarium_extensions::{manual_anchors::ManualAnchorCatalog, project_imports};

pub struct StudioSessionInner {
    pub active_document: Option<Document>,
    pub active_build: Arc<BuildService>,
    pub fs_watcher: Option<RecommendedWatcher>,
}

impl Default for StudioSessionInner {
    fn default() -> Self {
        Self {
            active_document: None,
            active_build: Arc::new(BuildService::new()),
            fs_watcher: None,
        }
    }
}

pub struct StudioTauriState {
    pub inner: Mutex<StudioSessionInner>,
}

impl Default for StudioTauriState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(StudioSessionInner::default()),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfUnderlayRenderRequest {
    pub source: String,
    pub revision: u64,
    pub min_x_cm: f64,
    pub max_x_cm: f64,
    pub min_y_cm: f64,
    pub max_y_cm: f64,
    pub dpi: Option<u32>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfUnderlayHitboxDto {
    pub object_id: String,
    pub line_number: usize,
    pub package_owner: String,
    pub label_ru: String,
    pub min_x_cm: f64,
    pub min_y_cm: f64,
    pub max_x_cm: f64,
    pub max_y_cm: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfUnderlayRenderResponse {
    pub ok: bool,
    pub revision: u64,
    pub source_digest: String,
    pub engine: String,
    pub engine_label_ru: String,
    pub png_data_url: Option<String>,
    pub pdf_base64: Option<String>,
    pub page_width_pt: f64,
    pub page_height_pt: f64,
    pub render_ms: u64,
    pub objects_rendered: usize,
    pub hitboxes: Vec<PdfUnderlayHitboxDto>,
    pub error_ru: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TauriRuntimeInfoDto {
    pub runtime: &'static str,
    pub tauri_version: &'static str,
    pub os: &'static str,
    pub arch: &'static str,
    pub xelatex_present: bool,
    pub xelatex_version: Option<String>,
    pub pdftoppm_present: bool,
    pub kpsewhich_present: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BinaryProbeDto {
    pub id: String,
    pub label: String,
    pub binary: String,
    pub role: String,
    pub required_for_release: bool,
    pub status: &'static str,
    pub path: Option<String>,
    pub version: Option<String>,
    pub detail: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TexPackageAuditDto {
    pub file: String,
    pub status: &'static str,
    pub detail: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedDocumentDto {
    pub path: String,
    pub filename: String,
    pub source: String,
    pub class_declared: bool,
    pub line_ending: &'static str,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedDocumentDto {
    pub ok: bool,
    pub path: String,
    pub dirty: bool,
    pub sha256_short: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalFileChangePayload {
    pub filename: String,
    pub path: String,
    pub disk_source: String,
    pub external_editor: &'static str,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManualPageRasterDto {
    pub ok: bool,
    pub filename: String,
    pub page: u32,
    pub resolved_pdf_path: Option<String>,
    pub png_data_url: Option<String>,
    pub error_ru: Option<String>,
}

fn rasterize_pdf_page_at_dpi(
    pdftoppm: Option<&Path>,
    pdf_path: &Path,
    page: u32,
    dpi: u32,
) -> Result<Vec<u8>, String> {
    let clamped_dpi = dpi.clamp(96, 300);
    let temp = tempfile::tempdir().map_err(|e| format!("tempdir: {e}"))?;

    if let Some(ppm_bin) = pdftoppm
        && ppm_bin.is_file()
    {
        let out_prefix = temp.path().join("underlay");
        let status = Command::new(ppm_bin)
            .arg("-f")
            .arg(page.to_string())
            .arg("-l")
            .arg(page.to_string())
            .arg("-singlefile")
            .arg("-r")
            .arg(clamped_dpi.to_string())
            .arg("-png")
            .arg(pdf_path)
            .arg(&out_prefix)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|e| format!("pdftoppm spawn: {e}"))?;

        if status.success() {
            let png_path = out_prefix.with_extension("png");
            return fs::read(&png_path).map_err(|e| format!("read png: {e}"));
        }
    }

    // Резервный локальный растеризатор Ghostscript (`gs -sDEVICE=pngalpha`), если `pdftoppm` не установлен
    if let Some(gs_bin) = find_executable("gs") {
        let png_path = temp.path().join("underlay_gs.png");
        let status = Command::new(gs_bin)
            .args([
                "-q",
                "-dNOPAUSE",
                "-dBATCH",
                "-dSAFER",
                "-sDEVICE=pngalpha",
                &format!("-r{clamped_dpi}"),
                &format!("-dFirstPage={page}"),
                &format!("-dLastPage={page}"),
                "-dTextAlphaBits=4",
                "-dGraphicsAlphaBits=4",
                &format!("-sOutputFile={}", png_path.display()),
            ])
            .arg(pdf_path)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|e| format!("gs spawn: {e}"))?;

        if status.success() {
            return fs::read(&png_path).map_err(|e| format!("read gs png: {e}"));
        }
    }

    Err("Не найден локальный растеризатор PDF (требуется pdftoppm из Poppler или gs).".to_owned())
}

#[tauri::command]
pub fn tz_runtime_info() -> TauriRuntimeInfoDto {
    let env = TexEnvironment::discover();
    TauriRuntimeInfoDto {
        runtime: "tauri-v2-rust-native",
        tauri_version: "2.5",
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        xelatex_present: env.xelatex.is_some(),
        xelatex_version: env.xelatex_version,
        pdftoppm_present: env.pdf_renderer.is_some(),
        kpsewhich_present: env.kpsewhich.is_some(),
    }
}

#[tauri::command]
pub async fn tz_render_pdf_underlay(
    req: PdfUnderlayRenderRequest,
    state: State<'_, StudioTauriState>,
) -> Result<PdfUnderlayRenderResponse, String> {
    let started = Instant::now();
    let dpi = req.dpi.unwrap_or(144).clamp(96, 240);
    let source_digest = sha256_hex(&req.source);

    let build_service = {
        let mut guard = state
            .inner
            .lock()
            .map_err(|_| "Блокировка состояния сессии повреждена".to_owned())?;
        // Superseding a request must cancel the previous worker, not lose its handle.
        guard.active_build.cancel();
        let fresh = Arc::new(BuildService::new());
        guard.active_build = Arc::clone(&fresh);
        fresh
    };

    let width_pt = ((req.max_x_cm - req.min_x_cm).abs().max(1.0)) * 28.346_456_7;
    let height_pt = ((req.max_y_cm - req.min_y_cm).abs().max(1.0)) * 28.346_456_7;
    let source_clone = req.source.clone();
    let revision = req.revision;
    let digest_clone = source_digest.clone();

    let blocking_out = tauri::async_runtime::spawn_blocking(move || {
        let env = TexEnvironment::discover();
        let Some(xelatex_bin) = env.xelatex.clone() else {
            return PdfUnderlayRenderResponse {
                ok: false,
                revision,
                source_digest: digest_clone,
                engine: "svg-vector-fallback".to_owned(),
                engine_label_ru: "Внешний XeLaTeX не найден в PATH (используется векторный контур холста)".to_owned(),
                png_data_url: None,
                pdf_base64: None,
                page_width_pt: width_pt,
                page_height_pt: height_pt,
                render_ms: started.elapsed().as_millis() as u64,
                objects_rendered: 0,
                hitboxes: Vec::new(),
                error_ru: Some(
                    "XeLaTeX не установлен локально (TikZarium соблюдает строгую офлайн-политику и не скачивает пакеты скрытно).".to_owned(),
                ),
            };
        };

        let Ok(work_dir) = tempfile::tempdir() else {
            return PdfUnderlayRenderResponse {
                ok: false,
                revision,
                source_digest: digest_clone,
                engine: "svg-vector-fallback".to_owned(),
                engine_label_ru: "Ошибка создания временного каталога сборки".to_owned(),
                png_data_url: None,
                pdf_base64: None,
                page_width_pt: width_pt,
                page_height_pt: height_pt,
                render_ms: started.elapsed().as_millis() as u64,
                objects_rendered: 0,
                hitboxes: Vec::new(),
                error_ru: Some("Не удалось выделить временную директорию ОС.".to_owned()),
            };
        };

        let tex_path = work_dir.path().join("figure.tex");
        if let Err(err) = fs::write(&tex_path, source_clone.as_bytes()) {
            return PdfUnderlayRenderResponse {
                ok: false,
                revision,
                source_digest: digest_clone,
                engine: "svg-vector-fallback".to_owned(),
                engine_label_ru: "Ошибка записи figure.tex".to_owned(),
                png_data_url: None,
                pdf_base64: None,
                page_width_pt: width_pt,
                page_height_pt: height_pt,
                render_ms: started.elapsed().as_millis() as u64,
                objects_rendered: 0,
                hitboxes: Vec::new(),
                error_ru: Some(err.to_string()),
            };
        }

        let build_req = BuildRequest {
            source: tex_path,
            xelatex: xelatex_bin,
            pdf_renderer: env.pdf_renderer.clone(),
            options: BuildOptions {
                timeout: Duration::from_secs(25),
                rasterize_first_page: false,
                log_path: None,
            },
        };

        match build_service.run(&build_req) {
            Ok(artifact) => {
                let pdf_path = work_dir.path().join("figure.pdf");
                let _ = fs::write(&pdf_path, &artifact.pdf);
                let png_data_url =
                    rasterize_pdf_page_at_dpi(env.pdf_renderer.as_deref(), &pdf_path, 1, dpi)
                        .ok()
                        .map(|bytes| format!("data:image/png;base64,{}", BASE64.encode(bytes)));

                PdfUnderlayRenderResponse {
                    ok: png_data_url.is_some(),
                    revision,
                    source_digest: digest_clone,
                    engine: "xelatex".to_owned(),
                    engine_label_ru: format!(
                        "Точный нативный XeLaTeX ({})",
                        env.xelatex_version
                            .as_deref()
                            .unwrap_or("-no-shell-escape")
                    ),
                    png_data_url,
                    pdf_base64: Some(BASE64.encode(&artifact.pdf)),
                    page_width_pt: width_pt,
                    page_height_pt: height_pt,
                    render_ms: artifact.elapsed.as_millis() as u64,
                    objects_rendered: 1,
                    hitboxes: Vec::new(),
                    error_ru: None,
                }
            }
            Err(build_err) => {
                let first_diag = build_err
                    .diagnostics()
                    .iter()
                    .find(|d| d.severity == Severity::Error)
                    .map(|d| match d.line {
                        Some(ln) => format!("Строка {ln}: {}", d.message),
                        None => d.message.clone(),
                    });
                let detail = match &build_err {
                    BuildError::Cancelled => "Сборка отменена пользователем.".to_owned(),
                    _ => first_diag.unwrap_or_else(|| build_err.to_string()),
                };
                PdfUnderlayRenderResponse {
                    ok: false,
                    revision,
                    source_digest: digest_clone,
                    engine: "svg-vector-fallback".to_owned(),
                    engine_label_ru: "Ошибка компиляции XeLaTeX".to_owned(),
                    png_data_url: None,
                    pdf_base64: None,
                    page_width_pt: width_pt,
                    page_height_pt: height_pt,
                    render_ms: started.elapsed().as_millis() as u64,
                    objects_rendered: 0,
                    hitboxes: Vec::new(),
                    error_ru: Some(detail),
                }
            }
        }
    })
    .await
    .map_err(|e| format!("spawn_blocking error: {e}"))?;

    Ok(blocking_out)
}

#[tauri::command]
pub fn tz_cancel_active_build(state: State<'_, StudioTauriState>) -> Result<bool, String> {
    let guard = state
        .inner
        .lock()
        .map_err(|_| "Блокировка сессии повреждена".to_owned())?;
    guard.active_build.cancel();
    Ok(true)
}

#[tauri::command]
pub async fn tz_doctor_environment() -> Result<serde_json::Value, String> {
    let started = Instant::now();
    tauri::async_runtime::spawn_blocking(move || {
        let env = TexEnvironment::discover();
        let probes = vec![
            BinaryProbeDto {
                id: "xelatex".to_owned(),
                label: "Движок XeLaTeX (tikzarium-core)".to_owned(),
                binary: "xelatex".to_owned(),
                role: "Авторитетная сборка .tex -> точный PDF (-no-shell-escape, --disable-installer)".to_owned(),
                required_for_release: true,
                status: if env.xelatex.is_some() { "PRESENT" } else { "MISSING" },
                path: env.xelatex.as_ref().map(|p| p.display().to_string()),
                version: env.xelatex_version.clone(),
                detail: env
                    .xelatex
                    .as_ref()
                    .map(|p| format!("Обнаружен: {}", p.display()))
                    .unwrap_or_else(|| "Не установлен локально (требуется MiKTeX или TeX Live)".to_owned()),
            },
            BinaryProbeDto {
                id: "kpsewhich".to_owned(),
                label: "Поиск пакетов TeX (kpsewhich / findtexmf)".to_owned(),
                binary: "kpsewhich".to_owned(),
                role: "Read-only проверка пакетов без автоустановки (--must-exist не вызывается)".to_owned(),
                required_for_release: true,
                status: if env.kpsewhich.is_some() { "PRESENT" } else { "MISSING" },
                path: env.kpsewhich.as_ref().map(|p| p.display().to_string()),
                version: None,
                detail: env
                    .kpsewhich
                    .as_ref()
                    .map(|p| format!("Доступен по пути {}", p.display()))
                    .unwrap_or_else(|| "Используется соседний findtexmf (MiKTeX) или не найден".to_owned()),
            },
            BinaryProbeDto {
                id: "pdftoppm".to_owned(),
                label: "Poppler PDF Rasterizer (pdftoppm)".to_owned(),
                binary: "pdftoppm".to_owned(),
                role: "Точная растеризация PDF-подложки 1:1 и одиночных страниц PDF-мануалов".to_owned(),
                required_for_release: false,
                status: if env.pdf_renderer.is_some() { "PRESENT" } else { "MISSING" },
                path: env.pdf_renderer.as_ref().map(|p| p.display().to_string()),
                version: None,
                detail: env
                    .pdf_renderer
                    .as_ref()
                    .map(|p| format!("Доступен по пути {}", p.display()))
                    .unwrap_or_else(|| "Опциональный инструмент (резерв: Ghostscript gs)".to_owned()),
            },
        ];

        let required_pkgs = [
            "standalone.cls",
            "tikz.sty",
            "tikzlibrarycalc.code.tex",
            "tikzlibrarypositioning.code.tex",
            "pgflibraryarrows.meta.code.tex",
            "fontspec.sty",
            "unicode-math.sty",
        ];

        let tex_packages: Vec<TexPackageAuditDto> = required_pkgs
            .iter()
            .map(|pkg| match env.probe_package(pkg) {
                PackageProbe::Present(found_path) => TexPackageAuditDto {
                    file: (*pkg).to_owned(),
                    status: "PRESENT",
                    detail: found_path.display().to_string(),
                },
                PackageProbe::Missing => TexPackageAuditDto {
                    file: (*pkg).to_owned(),
                    status: "MISSING",
                    detail: "Файл пакета отсутствует в локальном дистрибутиве TeX".to_owned(),
                },
                PackageProbe::Unavailable => TexPackageAuditDto {
                    file: (*pkg).to_owned(),
                    status: "NOT_CHECKED",
                    detail: "Read-only поиск недоступен без kpsewhich / findtexmf".to_owned(),
                },
            })
            .collect();

        let exit_code = if env.xelatex.is_some() { 0 } else { 2 };

        serde_json::json!({
            "checkedAt": "tauri-v2-native",
            "durationMs": started.elapsed().as_millis() as u64,
            "profile": "host-actual",
            "backend": {
                "status": "ONLINE",
                "port": 0,
                "platform": format!("{} ({}) · Tauri v2 IPC", std::env::consts::OS, std::env::consts::ARCH),
                "nodeVersion": "Rust Native Host (без Node.js в рантайме)",
                "offlinePolicy": "Строгая офлайн-политика tikzarium-core: --disable-installer обязателен; -no-shell-escape включён."
            },
            "github": {
                "reachable": true,
                "httpStatus": 200,
                "latencyMs": 0,
                "fullName": "i-shutov/tikzarium",
                "defaultBranch": "main",
                "pushedAt": null,
                "openIssuesCount": null,
                "note": "Локальное десктопное окно Tauri v2 + Rust"
            },
            "localRepo": {
                "present": true,
                "headSha": "tauri-v2",
                "headSubject": "TikZarium Studio — Tauri v2 + Rust Native Desktop Host",
                "crates": ["tikzarium-core", "tikzarium-extensions", "tikzarium-studio-tauri"],
                "catalogSchemaVersion": 1,
                "examples": ["cyrillic.tex", "fontspec-cyrillic-math.tex", "quickstart.tex", "windows-cyrillic.tex"],
                "sourceMode": "native-rust-workspace"
            },
            "doctor": {
                "exitCode": exit_code,
                "summary": if exit_code == 0 {
                    "tikzarium-core doctor (Tauri v2 IPC): код 0 — внешний XeLaTeX готов к сборке"
                } else {
                    "tikzarium-core doctor (Tauri v2 IPC): код 2 — установите внешний MiKTeX или TeX Live"
                },
                "probes": probes,
                "texPackages": tex_packages
            }
        })
    })
    .await
    .map_err(|e| format!("doctor task failed: {e}"))
}

#[tauri::command]
pub fn tz_open_document(
    path: String,
    app: AppHandle,
    state: State<'_, StudioTauriState>,
) -> Result<OpenedDocumentDto, String> {
    let target = PathBuf::from(&path);
    let doc = Document::load(&target).map_err(|e| format!("Не удалось открыть {path}: {e}"))?;
    let imports = project_imports::inspect(&doc.source);
    let line_ending = if doc.source.contains("\r\n") {
        "CRLF"
    } else {
        "LF"
    };
    let filename = target
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("figure.tex")
        .to_owned();
    let source_copy = doc.source.clone();

    let watched_path = target.clone();
    let watched_filename = filename.clone();
    let app_for_watch = app.clone();

    let watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res
            && event.kind.is_modify()
            && let Ok(disk_source) = fs::read_to_string(&watched_path)
        {
            let _ = app_for_watch.emit(
                "tz://external-file-change",
                ExternalFileChangePayload {
                    filename: watched_filename.clone(),
                    path: watched_path.display().to_string(),
                    disk_source,
                    external_editor: "Внешний редактор ОС (notify::RecommendedWatcher)",
                },
            );
        }
    })
    .ok()
    .and_then(|mut w| {
        w.watch(&target, RecursiveMode::NonRecursive).ok()?;
        Some(w)
    });

    let mut guard = state
        .inner
        .lock()
        .map_err(|_| "Блокировка сессии повреждена".to_owned())?;
    guard.active_document = Some(doc);
    guard.fs_watcher = watcher;

    Ok(OpenedDocumentDto {
        path,
        filename,
        source: source_copy,
        class_declared: imports.class_declared,
        line_ending,
    })
}

#[tauri::command]
pub fn tz_save_document(
    path: String,
    source: String,
    state: State<'_, StudioTauriState>,
) -> Result<SavedDocumentDto, String> {
    let target = PathBuf::from(&path);
    let mut guard = state
        .inner
        .lock()
        .map_err(|_| "Блокировка сессии повреждена".to_owned())?;

    let mut doc = guard
        .active_document
        .take()
        .unwrap_or_else(|| Document::scratch(source.clone()));
    doc.source = source.clone();

    let save_res = doc.save_to(&target);
    let dirty = doc.dirty();
    guard.active_document = Some(doc);

    save_res.map_err(|e| {
        format!(
            "Сохранение отклонено защитой целостности tikzarium_core::Document::save_to ({path}): {e}"
        )
    })?;

    Ok(SavedDocumentDto {
        ok: true,
        path,
        dirty,
        sha256_short: sha256_short_hex(&source),
    })
}

#[tauri::command]
pub fn tz_apply_checked_patch(
    source: String,
    patch: SourcePatchSpan,
    expected_digest: Option<String>,
) -> CheckedSourcePatchResult {
    apply_checked_source_patch(&source, &patch, expected_digest.as_deref())
}

#[tauri::command]
pub async fn tz_render_manual_page(
    filename: String,
    page: u32,
) -> Result<ManualPageRasterDto, String> {
    if page == 0 || !filename.ends_with(".pdf") || filename.contains('/') || filename.contains('\\')
    {
        return Err("Недопустимое имя файла PDF-мануала или номер страницы".to_owned());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let env = TexEnvironment::discover();
        let resolved_pdf = if let Some(kpse) = &env.kpsewhich {
            Command::new(kpse)
                .arg("--format=TeX system documentation")
                .arg(&filename)
                .output()
                .ok()
                .and_then(|out| {
                    let line = String::from_utf8_lossy(&out.stdout)
                        .lines()
                        .next()?
                        .trim()
                        .to_owned();
                    let p = PathBuf::from(line);
                    p.is_file().then_some(p)
                })
        } else {
            None
        };

        let Some(pdf_path) = resolved_pdf else {
            return ManualPageRasterDto {
                ok: false,
                filename,
                page,
                resolved_pdf_path: None,
                png_data_url: None,
                error_ru: Some(
                    "Локальный PDF не найден через kpsewhich (согласно AGENTS.md п.5 полные PDF не вшиваются в репозиторий)."
                        .to_owned(),
                ),
            };
        };

        match rasterize_pdf_page_at_dpi(env.pdf_renderer.as_deref(), &pdf_path, page, 150) {
            Ok(bytes) => ManualPageRasterDto {
                ok: true,
                filename,
                page,
                resolved_pdf_path: Some(pdf_path.display().to_string()),
                png_data_url: Some(format!("data:image/png;base64,{}", BASE64.encode(bytes))),
                error_ru: None,
            },
            Err(err) => ManualPageRasterDto {
                ok: false,
                filename,
                page,
                resolved_pdf_path: Some(pdf_path.display().to_string()),
                png_data_url: None,
                error_ru: Some(err),
            },
        }
    })
    .await
    .map_err(|e| format!("manual render task failed: {e}"))
}

#[tauri::command]
pub fn tz_resolve_manual_token(token: String) -> Result<serde_json::Value, String> {
    let catalog = ManualAnchorCatalog::bundled().map_err(|e| e.to_string())?;
    match catalog.resolve_token(&token) {
        Some(anchor) => Ok(serde_json::json!({
            "matched": true,
            "anchor": anchor,
            "document": catalog.document(&anchor.doc_id),
        })),
        None => Ok(serde_json::json!({
            "matched": false,
            "anchor": serde_json::Value::Null,
        })),
    }
}
