//! Rasterize exact XeLaTeX PDF for the on-screen viewport.
//! Without a rasterizer the canonical PDF remains valid and exportable.
use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
use thiserror::Error;

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
    #[error("preview I/O: {0}")]
    Io(#[from] std::io::Error),
}

pub fn render_first_page(pdftoppm: &Path, pdf: &Path) -> Result<Preview, PreviewError> {
    if !pdftoppm.is_file() {
        return Err(PreviewError::MissingTool(pdftoppm.into()));
    }
    let temp = tempfile::tempdir()?;
    let prefix = temp.path().join("page1");
    let status = Command::new(pdftoppm)
        .arg("-f")
        .arg("1")
        .arg("-singlefile")
        .arg("-scale-to")
        .arg("1500")
        .arg("-png")
        .arg(pdf)
        .arg(&prefix)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()?;
    if !status.success() {
        return Err(PreviewError::ToolExit(status.code()));
    }
    Ok(Preview {
        png: fs::read(prefix.with_extension("png"))?,
    })
}
