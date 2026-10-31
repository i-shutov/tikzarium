//! Rasterize exact XeLaTeX PDF for the on-screen viewport.
//! Without a rasterizer the canonical PDF remains valid and exportable.
//! I07: first-page preview must never wait forever or read arbitrary PNG bytes.
use std::{
    fs::{self, File},
    io::{self, Read},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};
use thiserror::Error;

const FIRST_PAGE_TIMEOUT: Duration = Duration::from_secs(45);
const FIRST_PAGE_MAX_PNG_BYTES: u64 = 64 * 1024 * 1024;

#[derive(Debug, Clone)]
pub struct Preview {
    pub png: Vec<u8>,
}

#[derive(Debug, Error)]
pub enum PreviewError {
    #[error("PDF rasterizer failed ({0:?})")]
    ToolExit(Option<i32>),
    #[error("PDF rasterizer missing: {0}")]
    MissingTool(PathBuf),
    #[error("PDF rasterizer timed out after {0:?}")]
    Timeout(Duration),
    #[error("PDF preview PNG exceeds budget: {bytes} bytes (limit {limit})")]
    OversizedPng { bytes: u64, limit: u64 },
    #[error("preview I/O: {0}")]
    Io(#[from] io::Error),
}

/// Rasterization is *optional* after successful XeLaTeX. A timeout or oversized
/// PNG returns a preview error rather than blocking the editor/build forever.
/// The PDF itself and the author's source are never modified.
pub fn render_first_page(pdftoppm: &Path, pdf: &Path) -> Result<Preview, PreviewError> {
    render_first_page_with_limits(pdftoppm, pdf, FIRST_PAGE_TIMEOUT, FIRST_PAGE_MAX_PNG_BYTES)
}

fn render_first_page_with_limits(
    pdftoppm: &Path,
    pdf: &Path,
    timeout: Duration,
    png_limit: u64,
) -> Result<Preview, PreviewError> {
    if !pdftoppm.is_file() {
        return Err(PreviewError::MissingTool(pdftoppm.into()));
    }
    let temp = tempfile::tempdir()?;
    let prefix = temp.path().join("page1");
    let mut child = Command::new(pdftoppm)
        .arg("-f")
        .arg("1")
        .arg("-singlefile")
        .arg("-scale-to")
        .arg("1500")
        .arg("-png")
        .arg(pdf)
        .arg(&prefix)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()?;

    let started = Instant::now();
    let exit = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() >= timeout => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(PreviewError::Timeout(timeout));
            }
            Ok(None) => thread::sleep(Duration::from_millis(25)),
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(PreviewError::Io(error));
            }
        }
    };
    if !exit.success() {
        return Err(PreviewError::ToolExit(exit.code()));
    }
    Ok(Preview {
        png: read_bounded_png(&prefix.with_extension("png"), png_limit)?,
    })
}

/// Bound memory twice: before opening by file metadata and during read in
/// case the output file changes after stat. The PNG pixel/decode limit is
/// enforced separately by B06's egui preview_image helper.
fn read_bounded_png(path: &Path, limit: u64) -> Result<Vec<u8>, PreviewError> {
    let before = fs::metadata(path)?.len();
    if before > limit {
        return Err(PreviewError::OversizedPng {
            bytes: before,
            limit,
        });
    }
    let mut png = Vec::new();
    File::open(path)?
        .take(limit.saturating_add(1))
        .read_to_end(&mut png)?;
    if png.len() as u64 > limit {
        return Err(PreviewError::OversizedPng {
            bytes: png.len() as u64,
            limit,
        });
    }
    Ok(png)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn png_read_is_bounded_and_does_not_rewrite_the_file() {
        let dir = tempfile::tempdir().unwrap();
        let png = dir.path().join("test.png");
        fs::write(&png, b"PNG fixture").unwrap();
        assert_eq!(read_bounded_png(&png, 11).unwrap(), b"PNG fixture");
        assert!(matches!(
            read_bounded_png(&png, 10),
            Err(PreviewError::OversizedPng {
                bytes: 11,
                limit: 10
            })
        ));
        assert_eq!(fs::read(&png).unwrap(), b"PNG fixture");
    }

    #[test]
    fn missing_pdf_renderer_is_a_controlled_error() {
        let dir = tempfile::tempdir().unwrap();
        assert!(matches!(
            render_first_page(&dir.path().join("missing-pdftoppm"), Path::new("image.pdf")),
            Err(PreviewError::MissingTool(_))
        ));
    }

    #[cfg(unix)]
    fn fake_poppler(body: &str) -> (tempfile::TempDir, PathBuf, PathBuf) {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let tool = dir.path().join("fake-pdftoppm.sh");
        let pdf = dir.path().join("untouched.pdf");
        fs::write(&pdf, b"%PDF dummy - keep exact bytes").unwrap();
        fs::write(&tool, format!("#!/bin/sh\n{body}\n")).unwrap();
        let mut permissions = fs::metadata(&tool).unwrap().permissions();
        permissions.set_mode(0o700);
        fs::set_permissions(&tool, permissions).unwrap();
        (dir, tool, pdf)
    }

    #[cfg(unix)]
    #[test]
    fn fake_poppler_success_preserves_pdf_source_and_returns_png() {
        let (_dir, tool, pdf) = fake_poppler("for last; do :; done\nprintf 'PNG' > \"$last.png\"");
        let original = fs::read(&pdf).unwrap();
        let preview =
            render_first_page_with_limits(&tool, &pdf, Duration::from_secs(2), 3).unwrap();
        assert_eq!(preview.png, b"PNG");
        assert_eq!(fs::read(&pdf).unwrap(), original);
        assert!(matches!(
            render_first_page_with_limits(&tool, &pdf, Duration::from_secs(2), 2),
            Err(PreviewError::OversizedPng { bytes: 3, limit: 2 })
        ));
    }

    #[cfg(unix)]
    #[test]
    fn nonzero_renderer_exit_is_not_treated_as_a_valid_pdf_preview() {
        let (_dir, tool, pdf) = fake_poppler("exit 9");
        assert!(matches!(
            render_first_page_with_limits(&tool, &pdf, Duration::from_secs(2), 100),
            Err(PreviewError::ToolExit(Some(9)))
        ));
    }

    #[cfg(unix)]
    #[test]
    fn hung_first_page_renderer_is_killed_with_bounded_wall_time() {
        let (_dir, tool, pdf) = fake_poppler("while :; do :; done");
        let started = Instant::now();
        assert!(matches!(
            render_first_page_with_limits(&tool, &pdf, Duration::from_millis(150), 100),
            Err(PreviewError::Timeout(_))
        ));
        assert!(started.elapsed() < Duration::from_secs(5));
    }
}
