//! Optional, asynchronous Poppler-backed navigation for the exact XeLaTeX PDF.
//! No PDF content, page geometry, font or TeX source is modified here.
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    process::{Command, ExitStatus, Stdio},
    sync::mpsc::{self, Receiver},
    time::{Duration, Instant},
};
use tikzarium_core::find_executable;

/// Fail closed when an external PDF tool stalls. These are worker-side budgets, not GUI timeouts.
const PDFINFO_TIMEOUT: Duration = Duration::from_secs(12);
const PDF_RENDER_TIMEOUT: Duration = Duration::from_secs(45);
const MAX_CAPTURE_BYTES: u64 = 64 * 1024;
const MAX_PREVIEW_PNG_BYTES: u64 = 64 * 1024 * 1024;

#[derive(Debug)]
struct ProcessOutput {
    status: ExitStatus,
    stdout: Vec<u8>,
    stderr: Vec<u8>,
}

/// Direct invocation, bounded lifetime and bounded log memory on all three OSes.
/// Redirect both streams to files so a verbose Poppler error cannot deadlock a pipe.
fn run_poppler(
    command: &mut Command,
    name: &str,
    timeout: Duration,
) -> Result<ProcessOutput, String> {
    let dir = tempfile::tempdir().map_err(|e| format!("{name} capture directory: {e}"))?;
    let stdout_path = dir.path().join("stdout.txt");
    let stderr_path = dir.path().join("stderr.txt");
    let stdout =
        fs::File::create(&stdout_path).map_err(|e| format!("{name} stdout capture: {e}"))?;
    let stderr =
        fs::File::create(&stderr_path).map_err(|e| format!("{name} stderr capture: {e}"))?;
    command
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr));
    let mut child = command
        .spawn()
        .map_err(|e| format!("{name} invocation failed: {e}"))?;
    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() >= timeout => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("{name} timed out after {}s", timeout.as_secs()));
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(25)),
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("{name} process monitoring failed: {error}"));
            }
        }
    };
    Ok(ProcessOutput {
        status,
        stdout: read_capture(&stdout_path, name)?,
        stderr: read_capture(&stderr_path, name)?,
    })
}

fn read_capture(path: &Path, name: &str) -> Result<Vec<u8>, String> {
    let mut data = Vec::new();
    fs::File::open(path)
        .map_err(|e| format!("{name} capture open: {e}"))?
        .take(MAX_CAPTURE_BYTES)
        .read_to_end(&mut data)
        .map_err(|e| format!("{name} capture read: {e}"))?;
    Ok(data)
}

/// Worker replies carry the PDF identity epoch, avoiding stale cross-document updates.
pub type PageCountReceiver = Receiver<(u64, Result<usize, String>)>;
pub type PageRenderReceiver = Receiver<(u64, usize, Result<Vec<u8>, String>)>;

/// Page numbers in the UI and Poppler are one-based. Never report a guessed page count.
#[must_use]
pub fn parse_page_count(output: &str) -> Option<usize> {
    output.lines().find_map(|line| {
        let (key, value) = line.split_once(':')?;
        if key.trim() != "Pages" {
            return None;
        }
        let pages = value.trim().parse::<usize>().ok()?;
        (pages > 0).then_some(pages)
    })
}

#[must_use]
pub fn can_navigate(page_count: Option<usize>, current: usize, target: usize) -> bool {
    page_count.is_some_and(|total| target >= 1 && target <= total && target != current)
}

/// The result carries the PDF epoch so a previous document's worker cannot update a new one.
pub fn spawn_page_count(pdf: Vec<u8>, epoch: u64) -> PageCountReceiver {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send((epoch, inspect_pages(&pdf)));
    });
    rx
}

fn inspect_pages(pdf: &[u8]) -> Result<usize, String> {
    let pdfinfo = find_executable("pdfinfo")
        .ok_or_else(|| "pdfinfo not installed: page count NOT_CHECKED".to_owned())?;
    let dir = tempfile::tempdir().map_err(|e| format!("Temporary PDF directory: {e}"))?;
    let input = dir.path().join("tikzarium-preview.pdf");
    fs::write(&input, pdf).map_err(|e| format!("Temporary PDF write: {e}"))?;
    let output = run_poppler(
        Command::new(pdfinfo).arg(&input),
        "pdfinfo",
        PDFINFO_TIMEOUT,
    )?;
    if !output.status.success() {
        return Err(format!(
            "pdfinfo failed ({}): {}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
                .trim()
                .chars()
                .take(200)
                .collect::<String>()
        ));
    }
    parse_page_count(&String::from_utf8_lossy(&output.stdout))
        .ok_or_else(|| "pdfinfo returned no valid Pages field: page count NOT_CHECKED".to_owned())
}

/// Rasterize one requested page in a worker. The UI retains the last displayed page on failure.
pub fn spawn_page_render(
    pdf: Vec<u8>,
    page: usize,
    renderer: Option<PathBuf>,
    epoch: u64,
) -> PageRenderReceiver {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send((epoch, page, rasterize_page(&pdf, page, renderer)));
    });
    rx
}

fn rasterize_page(pdf: &[u8], page: usize, renderer: Option<PathBuf>) -> Result<Vec<u8>, String> {
    if page == 0 {
        return Err("PDF pages are one-based".into());
    }
    let renderer = renderer.ok_or_else(|| "pdftoppm is unavailable".to_owned())?;
    let dir = tempfile::tempdir().map_err(|e| format!("Temporary PDF directory: {e}"))?;
    let input = dir.path().join("tikzarium-preview.pdf");
    let output_prefix = dir.path().join("page");
    fs::write(&input, pdf).map_err(|e| format!("Temporary PDF write: {e}"))?;
    // Direct process invocation (no shell). The output filename is controlled by us.
    let output = run_poppler(
        Command::new(renderer)
            .arg("-f")
            .arg(page.to_string())
            .arg("-l")
            .arg(page.to_string())
            .arg("-singlefile")
            .arg("-png")
            .arg("-r")
            .arg("120")
            .arg(&input)
            .arg(&output_prefix),
        "pdftoppm",
        PDF_RENDER_TIMEOUT,
    )?;
    if !output.status.success() {
        return Err(format!(
            "pdftoppm page {page} failed ({}): {}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
                .trim()
                .chars()
                .take(200)
                .collect::<String>()
        ));
    }
    let png = output_prefix.with_extension("png");
    let bytes = fs::metadata(&png)
        .map_err(|e| format!("pdftoppm page {page} returned no PNG: {e}"))?
        .len();
    if bytes > MAX_PREVIEW_PNG_BYTES {
        return Err(format!(
            "pdftoppm page {page} exceeds 64 MiB preview budget ({bytes} bytes)"
        ));
    }
    fs::read(&png).map_err(|e| format!("pdftoppm page {page} PNG read: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(unix)]
    fn fake_poppler(script: &str) -> (tempfile::TempDir, PathBuf) {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("fake-poppler.sh");
        fs::write(&path, format!("#!/bin/sh\n{script}\n")).unwrap();
        let mut permissions = fs::metadata(&path).unwrap().permissions();
        permissions.set_mode(0o700);
        fs::set_permissions(&path, permissions).unwrap();
        (dir, path)
    }

    #[cfg(unix)]
    #[test]
    fn poppler_worker_captures_stdout_and_stderr_without_pipes() {
        let (_dir, path) = fake_poppler("printf 'Pages: 2\n'; printf 'warning\n' >&2");
        let output = run_poppler(Command::new(path), "fixture", Duration::from_secs(2)).unwrap();
        assert!(output.status.success());
        assert_eq!(
            parse_page_count(&String::from_utf8_lossy(&output.stdout)),
            Some(2)
        );
        assert!(String::from_utf8_lossy(&output.stderr).contains("warning"));
    }

    #[cfg(unix)]
    #[test]
    fn poppler_worker_kills_hung_process_and_reports_not_checked() {
        let (_dir, path) = fake_poppler("while :; do :; done");
        let start = Instant::now();
        let error =
            run_poppler(Command::new(path), "fixture", Duration::from_millis(150)).unwrap_err();
        assert!(error.contains("timed out"));
        assert!(start.elapsed() < Duration::from_secs(5));
    }

    #[test]
    fn page_count_requires_exact_positive_pages_field() {
        assert_eq!(
            parse_page_count("Title: Example\nPages:          12\nSize: 2k"),
            Some(12)
        );
        assert_eq!(parse_page_count("Pages: 1\n"), Some(1));
        assert_eq!(parse_page_count("Pages: 0"), None);
        assert_eq!(parse_page_count("Pages: many"), None);
        assert_eq!(parse_page_count("SubPages: 5"), None);
        assert_eq!(parse_page_count("Page size: 612 x 792 pts"), None);
    }

    #[test]
    fn navigation_never_guesses_unknown_or_out_of_range_pages() {
        assert!(!can_navigate(None, 1, 2));
        assert!(!can_navigate(Some(2), 1, 0));
        assert!(!can_navigate(Some(2), 1, 1));
        assert!(can_navigate(Some(2), 1, 2));
        assert!(!can_navigate(Some(2), 2, 3));
        assert!(can_navigate(Some(2), 2, 1));
    }

    #[test]
    fn zero_page_is_rejected_before_any_tool_invocation() {
        let result = rasterize_page(b"%PDF", 0, None).unwrap_err();
        assert!(result.contains("one-based"));
    }
}
