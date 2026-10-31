//! XeLaTeX build isolation and cancellation. NOT a full OS security sandbox.
use crate::{
    diagnostics::{BuildDiagnostic, extract_diagnostics},
    preview::{Preview, render_first_page},
};
use std::{
    fs::{self, File},
    io,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::{Duration, Instant},
};
use thiserror::Error;

#[derive(Debug, Clone)]
pub struct BuildOptions {
    pub timeout: Duration,
    pub rasterize_first_page: bool,
}
impl Default for BuildOptions {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(120),
            rasterize_first_page: true,
        }
    }
}

#[derive(Debug, Clone)]
pub struct BuildRequest {
    pub source: PathBuf,
    pub xelatex: PathBuf,
    pub pdf_renderer: Option<PathBuf>,
    pub options: BuildOptions,
}

#[derive(Debug)]
pub struct BuildArtifact {
    pub pdf: Vec<u8>,
    pub log: String,
    pub dependencies: Vec<PathBuf>,
    pub diagnostics: Vec<BuildDiagnostic>,
    pub preview: Result<Option<Preview>, String>,
    pub elapsed: Duration,
}

#[derive(Debug, Error)]
pub enum BuildError {
    #[error("Source file does not exist: {0}")]
    MissingSource(PathBuf),
    #[error("XeLaTeX executable is missing: {0}")]
    MissingEngine(PathBuf),
    #[error("Build cancelled")]
    Cancelled,
    #[error("XeLaTeX exceeded timeout of {0:?}")]
    Timeout(Duration),
    #[error("XeLaTeX exited with {code:?}: {details}")]
    TeXFailure { code: Option<i32>, details: String },
    #[error("Compiled PDF missing: {0}")]
    MissingPdf(PathBuf),
    #[error("I/O: {0}")]
    Io(#[from] io::Error),
}

#[derive(Clone, Default)]
pub struct BuildService {
    cancelled: Arc<AtomicBool>,
}
impl BuildService {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }
    pub fn run(&self, request: &BuildRequest) -> Result<BuildArtifact, BuildError> {
        if !request.source.is_file() {
            return Err(BuildError::MissingSource(request.source.clone()));
        }
        if !request.xelatex.is_file() {
            return Err(BuildError::MissingEngine(request.xelatex.clone()));
        }
        if self.cancelled.load(Ordering::SeqCst) {
            return Err(BuildError::Cancelled);
        }
        let started = Instant::now();
        let source = request.source.canonicalize()?;
        let cwd = source.parent().unwrap_or_else(|| Path::new("."));
        let filename = source
            .file_name()
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Missing source name"))?;
        let temp = tempfile::tempdir()?;
        let stdout_file = temp.path().join("xelatex.stdout.log");
        let stderr_file = temp.path().join("xelatex.stderr.log");
        let out_dir = temp.path().join("out");
        fs::create_dir_all(&out_dir)?;
        let mut child = Command::new(&request.xelatex)
            .current_dir(cwd)
            .arg("-interaction=nonstopmode")
            .arg("-halt-on-error")
            .arg("-file-line-error")
            .arg("-recorder")
            .arg("-no-shell-escape")
            .arg(format!("-output-directory={}", out_dir.display()))
            .arg(filename)
            .stdin(Stdio::null())
            .stdout(Stdio::from(File::create(&stdout_file)?))
            .stderr(Stdio::from(File::create(&stderr_file)?))
            .spawn()?;
        let status = loop {
            if self.cancelled.load(Ordering::SeqCst) {
                let _ = child.kill();
                let _ = child.wait();
                return Err(BuildError::Cancelled);
            }
            if started.elapsed() > request.options.timeout {
                let _ = child.kill();
                let _ = child.wait();
                return Err(BuildError::Timeout(request.options.timeout));
            }
            if let Some(status) = child.try_wait()? {
                break status;
            }
            thread::sleep(Duration::from_millis(60));
        };
        let stem = source
            .file_stem()
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "No source stem"))?;
        let log_path = out_dir.join(stem).with_extension("log");
        let mut log = read_capped(&log_path, 1_000_000).unwrap_or_default();
        if log.is_empty() {
            log = read_capped(&stdout_file, 1_000_000).unwrap_or_default();
        }
        if !status.success() {
            let stderr = read_capped(&stderr_file, 4000).unwrap_or_default();
            let details = if stderr.trim().is_empty() {
                tail(&log, 3000)
            } else {
                stderr
            };
            return Err(BuildError::TeXFailure {
                code: status.code(),
                details,
            });
        }
        let pdf_path = out_dir.join(stem).with_extension("pdf");
        if !pdf_path.is_file() {
            return Err(BuildError::MissingPdf(pdf_path));
        }
        let pdf = fs::read(&pdf_path)?;
        let fls_path = out_dir.join(stem).with_extension("fls");
        let deps = parse_fls(&fs::read_to_string(fls_path).unwrap_or_default());
        let preview = if request.options.rasterize_first_page {
            match &request.pdf_renderer {
                Some(renderer) => render_first_page(renderer, &pdf_path)
                    .map(Some)
                    .map_err(|e| e.to_string()),
                None => Ok(None),
            }
        } else {
            Ok(None)
        };
        let diagnostics = extract_diagnostics(&log);
        Ok(BuildArtifact {
            pdf,
            log,
            dependencies: deps,
            diagnostics,
            preview,
            elapsed: started.elapsed(),
        })
    }
}

#[must_use]
pub fn parse_fls(log: &str) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    for line in log.lines() {
        if let Some(path) = line.strip_prefix("INPUT ") {
            let path = PathBuf::from(path);
            if !paths.contains(&path) {
                paths.push(path);
            }
        }
    }
    paths
}
fn read_capped(path: &Path, cap: usize) -> io::Result<String> {
    let contents = fs::read(path)?;
    let start = contents.len().saturating_sub(cap);
    Ok(String::from_utf8_lossy(&contents[start..]).into_owned())
}
fn tail(text: &str, max: usize) -> String {
    let start = text.len().saturating_sub(max);
    String::from_utf8_lossy(&text.as_bytes()[start..]).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn dependencies_are_deduplicated() {
        let parsed = parse_fls(
            "PWD /x\nINPUT /a/b.tex\nOUTPUT /out.pdf\nINPUT /a/b.tex\nINPUT /c/image.png\n",
        );
        assert_eq!(parsed.len(), 2);
    }
    #[test]
    fn missing_source_is_reported() {
        let dir = tempfile::tempdir().unwrap();
        let req = BuildRequest {
            source: dir.path().join("missing.tex"),
            xelatex: dir.path().join("xelatex"),
            pdf_renderer: None,
            options: BuildOptions::default(),
        };
        assert!(matches!(
            BuildService::new().run(&req),
            Err(BuildError::MissingSource(_))
        ));
    }
    #[test]
    fn cancelled_job_never_launches_engine() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("a.tex");
        fs::write(&source, "test").unwrap();
        let engine = dir.path().join("xelatex");
        fs::write(&engine, "").unwrap();
        let svc = BuildService::new();
        svc.cancel();
        let req = BuildRequest {
            source,
            xelatex: engine,
            pdf_renderer: None,
            options: BuildOptions::default(),
        };
        assert!(matches!(svc.run(&req), Err(BuildError::Cancelled)));
    }
}
