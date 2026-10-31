//! Direct XeLaTeX runner. -no-shell-escape is not an OS sandbox.
use crate::{
    dependencies::ProjectDependencySnapshot,
    diagnostics::{BuildDiagnostic, Severity, extract_diagnostics},
    discovery::{TexDistribution, inspect_xelatex},
    preview::{Preview, render_first_page},
};
use std::{
    collections::HashSet,
    ffi::{OsStr, OsString},
    fs::{self, File},
    io::{self, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
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
    /// Optional persistent build log. If absent, temporary TeX output is removed.
    pub log_path: Option<PathBuf>,
}

impl Default for BuildOptions {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(120),
            rasterize_first_page: true,
            log_path: None,
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
    /// Read-only SHA-256 project-local source/dependency snapshot, not a global TeX cache.
    pub project_dependencies: ProjectDependencySnapshot,
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
    #[error("Cannot verify XeLaTeX distribution at {path}: {details}; offline build refused")]
    UnverifiedEngine { path: PathBuf, details: String },
    #[error("XeLaTeX exceeded timeout of {0:?}")]
    Timeout(Duration),
    #[error("XeLaTeX exited with {code:?}: {details}")]
    TeXFailure {
        code: Option<i32>,
        details: String,
        /// Bounded in-memory TeX log for GUI error navigation (not the full persistent log).
        log_excerpt: String,
        diagnostics: Vec<BuildDiagnostic>,
    },
    #[error("Compiled PDF missing: {0}")]
    MissingPdf(PathBuf),
    #[error("Build log path would overwrite the TeX source: {0}")]
    UnsafeLogPath(PathBuf),
    #[error("Cannot save XeLaTeX log to {path}: {cause}")]
    LogWrite {
        path: PathBuf,
        #[source]
        cause: io::Error,
    },
    #[error("I/O: {0}")]
    Io(#[from] io::Error),
}

impl BuildError {
    /// Structured diagnostics for failed XeLaTeX runs, ready for source navigation.
    /// Other errors have no TeX diagnostics.
    #[must_use]
    pub fn diagnostics(&self) -> &[BuildDiagnostic] {
        match self {
            Self::TeXFailure { diagnostics, .. } => diagnostics,
            _ => &[],
        }
    }

    /// A bounded text excerpt from the engine's log, if the engine exited in error.
    /// Use BuildOptions::log_path to retain the entire .log file.
    #[must_use]
    pub fn log_excerpt(&self) -> Option<&str> {
        match self {
            Self::TeXFailure { log_excerpt, .. } => Some(log_excerpt),
            _ => None,
        }
    }
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
        // MiKTeX can silently download missing packages even in nonstopmode.
        // Refuse an unidentifiable engine, and override MiKTeX's user/shared
        // AutoInstall setting only for this invocation (never persist it).
        let identity =
            inspect_xelatex(&request.xelatex).map_err(|error| BuildError::UnverifiedEngine {
                path: request.xelatex.clone(),
                details: error.to_string(),
            })?;
        if identity.distribution == TexDistribution::Unknown {
            return Err(BuildError::UnverifiedEngine {
                path: request.xelatex.clone(),
                details: format!("unrecognized --version: {}", identity.version),
            });
        }
        let source = request.source.canonicalize()?;
        if let Some(destination) = request.options.log_path.as_deref()
            && destination.exists()
            && destination.canonicalize()? == source
        {
            return Err(BuildError::UnsafeLogPath(destination.to_path_buf()));
        }

        let cwd = source.parent().unwrap_or_else(|| Path::new("."));
        let filename = source
            .file_name()
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Missing source name"))?;
        let temp = tempfile::tempdir()?;
        let stdout_file = temp.path().join("xelatex.stdout.log");
        let stderr_file = temp.path().join("xelatex.stderr.log");
        let out_dir = temp.path().join("out");
        fs::create_dir_all(&out_dir)?;

        // A literal forward-slash ./ prefix protects a leading-dash filename.
        // Path::new(".").join(filename) creates a backslash on Windows that
        // XeTeX interprets as a TeX control sequence instead of a path.
        let mut command = Command::new(&request.xelatex);
        if identity.distribution == TexDistribution::MiKTeX {
            command.arg("--disable-installer");
        }
        let mut child = command
            .current_dir(cwd)
            .arg("-interaction=nonstopmode")
            .arg("-halt-on-error")
            .arg("-file-line-error")
            .arg("-recorder")
            .arg("-no-shell-escape")
            .arg(format!("-output-directory={}", out_dir.display()))
            .arg(tex_source_operand(filename))
            .stdin(Stdio::null())
            .stdout(Stdio::from(File::create(&stdout_file)?))
            .stderr(Stdio::from(File::create(&stderr_file)?))
            .spawn()?;

        // Retain the entire source name before replacing its final extension:
        // "figure.v2.tex" must generate "figure.v2.pdf", not "figure.pdf".
        let job_path = out_dir.join(filename);
        let log_path = job_path.with_extension("log");
        let pdf_path = job_path.with_extension("pdf");
        let fls_path = job_path.with_extension("fls");

        let status = loop {
            if self.cancelled.load(Ordering::SeqCst) {
                terminate_child(&mut child);
                let _ = save_log(&log_path, &stdout_file, request.options.log_path.as_deref());
                return Err(BuildError::Cancelled);
            }
            if started.elapsed() > request.options.timeout {
                terminate_child(&mut child);
                let _ = save_log(&log_path, &stdout_file, request.options.log_path.as_deref());
                return Err(BuildError::Timeout(request.options.timeout));
            }
            match child.try_wait() {
                Ok(Some(status)) => break status,
                Ok(None) => thread::sleep(Duration::from_millis(60)),
                Err(error) => {
                    terminate_child(&mut child);
                    return Err(error.into());
                }
            }
        };

        let mut log = read_capped(&log_path, 1_000_000).unwrap_or_default();
        if log.is_empty() {
            log = read_capped(&stdout_file, 1_000_000).unwrap_or_default();
        }
        let stderr = read_capped(&stderr_file, 8_000).unwrap_or_default();
        let log_saved = save_log(&log_path, &stdout_file, request.options.log_path.as_deref());
        if !status.success() {
            let diagnostics = extract_diagnostics(&log);
            let mut details = failure_details(&log, &stderr);
            if let Err(error) = log_saved {
                details.push_str(&format!("\nLog persistence also failed: {error}"));
            }
            return Err(BuildError::TeXFailure {
                code: status.code(),
                details,
                log_excerpt: log,
                diagnostics,
            });
        }
        log_saved?;

        if !pdf_path.is_file() {
            return Err(BuildError::MissingPdf(pdf_path));
        }
        let pdf = fs::read(&pdf_path)?;
        let recorder = fs::read_to_string(&fls_path);
        // Any INPUT line is insufficient: a truncated or foreign-only .fls
        // could miss actual project dependencies. Require a recorder that
        // explicitly includes this author source as an input.
        // The public dependency list stays canonical. The snapshot separately
        // retains original .fls INPUT paths so a moved symlink cannot look fresh.
        let dependencies: Vec<PathBuf> =
            parse_fls_with_cwd(recorder.as_deref().unwrap_or_default(), cwd)
                .into_iter()
                .filter(|path| !path.starts_with(&out_dir))
                .collect();
        let recorded_inputs: Vec<PathBuf> =
            parse_fls_with_cwd_preserving_links(recorder.as_deref().unwrap_or_default(), cwd)
                .into_iter()
                .filter(|path| !path.starts_with(&out_dir))
                .collect();
        let recorder_complete = recorder.is_ok() && dependencies.contains(&source);
        // Canonical compilation paths must not hide the user's source symlink.
        let authored_source = if request.source.is_absolute() {
            request.source.clone()
        } else {
            std::env::current_dir()?.join(&request.source)
        };
        let project_dependencies = ProjectDependencySnapshot::capture(
            cwd,
            &authored_source,
            &recorded_inputs,
            recorder_complete,
        )?;
        let preview = if request.options.rasterize_first_page {
            match &request.pdf_renderer {
                Some(renderer) => render_first_page(renderer, &pdf_path)
                    .map(Some)
                    .map_err(|error| error.to_string()),
                None => Ok(None),
            }
        } else {
            Ok(None)
        };
        let diagnostics = extract_diagnostics(&log);
        Ok(BuildArtifact {
            pdf,
            log,
            dependencies,
            project_dependencies,
            diagnostics,
            preview,
            elapsed: started.elapsed(),
        })
    }
}

/// Preserve native filename bytes while using an unambiguous TeX operand on
/// Windows and Unix. Do not normalize or rewrite the user's TeX source.
fn tex_source_operand(filename: &OsStr) -> OsString {
    let mut operand = OsString::from("./");
    operand.push(filename);
    operand
}

fn terminate_child(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

fn save_log(primary: &Path, stdout: &Path, destination: Option<&Path>) -> Result<(), BuildError> {
    let Some(destination) = destination else {
        return Ok(());
    };
    let directory = destination
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let result = (|| -> io::Result<()> {
        fs::create_dir_all(directory)?;
        let mut temp = tempfile::NamedTempFile::new_in(directory)?;
        let source = if primary.is_file() { primary } else { stdout };
        io::copy(&mut File::open(source)?, &mut temp)?;
        temp.flush()?;
        temp.as_file().sync_all()?;
        temp.persist(destination).map_err(|error| error.error)?;
        Ok(())
    })();
    result.map_err(|cause| BuildError::LogWrite {
        path: destination.to_path_buf(),
        cause,
    })
}

fn failure_details(log: &str, stderr: &str) -> String {
    let mut text = String::new();
    if let Some(diagnostic) = extract_diagnostics(log)
        .into_iter()
        .find(|item| item.severity == Severity::Error)
    {
        if let Some(path) = diagnostic.source {
            text.push_str(&path.display().to_string());
            if let Some(line) = diagnostic.line {
                text.push_str(&format!(":{line}"));
            }
            text.push_str(": ");
        } else if let Some(line) = diagnostic.line {
            text.push_str(&format!("line {line}: "));
        }
        text.push_str(&diagnostic.message);
        text.push('\n');
    }
    if !stderr.trim().is_empty() {
        text.push_str("stderr:\n");
        text.push_str(stderr.trim());
        text.push('\n');
    }
    if !log.trim().is_empty() {
        text.push_str("TeX log tail:\n");
        text.push_str(&tail(log, 6_000));
    }
    if text.is_empty() {
        text.push_str("Compiler returned a failure without a readable TeX log");
    }
    text
}

/// Return the raw INPUT paths as recorded, without interpreting PWD.
#[must_use]
pub fn parse_fls(log: &str) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    let mut seen = HashSet::new();
    for line in log.lines() {
        if let Some(value) = line.strip_prefix("INPUT ") {
            let value = value.trim_end_matches('\r');
            if !value.is_empty() {
                let path = PathBuf::from(value);
                if seen.insert(path.clone()) {
                    paths.push(path);
                }
            }
        }
    }
    paths
}

/// Resolve INPUT records against recorder PWD (or the document directory).
/// This does not claim that external TeX packages are project-local files.
#[must_use]
pub fn parse_fls_with_cwd(log: &str, cwd: &Path) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    let mut seen = HashSet::new();
    for absolute in parse_fls_with_cwd_preserving_links(log, cwd) {
        let resolved = absolute.canonicalize().unwrap_or(absolute);
        if seen.insert(resolved.clone()) {
            paths.push(resolved);
        }
    }
    paths
}

/// Preserve original INPUT paths for snapshot identity checks.
/// The public parse_fls_with_cwd API continues returning canonical targets.
fn parse_fls_with_cwd_preserving_links(log: &str, cwd: &Path) -> Vec<PathBuf> {
    let base = log
        .lines()
        .find_map(|line| line.strip_prefix("PWD "))
        .map(|value| PathBuf::from(value.trim_end_matches('\r')))
        .filter(|path| !path.as_os_str().is_empty())
        .map(|path| {
            if path.is_absolute() {
                path
            } else {
                cwd.join(path)
            }
        })
        .unwrap_or_else(|| cwd.to_path_buf());

    parse_fls(log)
        .into_iter()
        .map(|path| {
            if path.is_absolute() {
                path
            } else {
                base.join(path)
            }
        })
        .collect()
}

fn read_capped(path: &Path, cap: usize) -> io::Result<String> {
    let mut file = File::open(path)?;
    let size = file.metadata()?.len();
    let start = size.saturating_sub(cap as u64);
    file.seek(SeekFrom::Start(start))?;
    let mut contents = Vec::new();
    file.take(cap as u64).read_to_end(&mut contents)?;
    if start > 0
        && let Some(newline) = contents.iter().position(|byte| *byte == b'\n')
    {
        contents.drain(..=newline);
    }
    Ok(String::from_utf8_lossy(&contents).into_owned())
}

fn tail(text: &str, max: usize) -> String {
    let start = text.len().saturating_sub(max);
    String::from_utf8_lossy(&text.as_bytes()[start..]).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn source_operand_is_portable_and_protects_dash_prefixed_names() {
        assert_eq!(
            tex_source_operand(OsStr::new("quickstart.tex")),
            OsString::from("./quickstart.tex")
        );
        assert_eq!(
            tex_source_operand(OsStr::new("-shell-escape.tex")),
            OsString::from("./-shell-escape.tex")
        );
        assert_eq!(
            tex_source_operand(OsStr::new("тест v2.tex")),
            OsString::from("./тест v2.tex")
        );
    }

    #[test]
    fn dependencies_are_deduplicated() {
        let parsed = parse_fls(
            "PWD /x\nINPUT /a/b.tex\nOUTPUT /out.pdf\nINPUT /a/b.tex\nINPUT /c/image.png\n",
        );
        assert_eq!(parsed.len(), 2);
    }

    #[test]
    fn recorder_pwd_resolves_relative_paths() {
        let directory = tempfile::tempdir().unwrap();
        let source = directory.path().join("a.tex");
        fs::write(&source, "% test").unwrap();
        let contents = format!(
            "PWD {}\nINPUT ./a.tex\nINPUT ./a.tex\n",
            directory.path().display()
        );
        let paths = parse_fls_with_cwd(&contents, directory.path());
        assert_eq!(paths, vec![source.canonicalize().unwrap()]);
    }

    #[cfg(unix)]
    #[test]
    fn recorder_preserves_link_spelling_without_changing_public_resolved_paths() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("target.tex");
        let alias = dir.path().join("alias.tex");
        fs::write(&target, "target").unwrap();
        symlink(&target, &alias).unwrap();
        let fls = format!("PWD {}\nINPUT ./alias.tex\n", dir.path().display());
        assert_eq!(
            parse_fls_with_cwd_preserving_links(&fls, dir.path()),
            vec![dir.path().join("./alias.tex")]
        );
        assert_eq!(
            parse_fls_with_cwd(&fls, dir.path()),
            vec![target.canonicalize().unwrap()]
        );
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
