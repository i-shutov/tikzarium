//! Optional, asynchronous Poppler-backed navigation for the exact XeLaTeX PDF.
//! No PDF content, page geometry, font or TeX source is modified here.
use std::{
    fs,
    path::PathBuf,
    process::Command,
    sync::mpsc::{self, Receiver},
};
use tikzarium_core::find_executable;

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
    let output = Command::new(pdfinfo)
        .arg(&input)
        .output()
        .map_err(|e| format!("pdfinfo invocation failed: {e}"))?;
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
    let output = Command::new(renderer)
        .arg("-f")
        .arg(page.to_string())
        .arg("-l")
        .arg(page.to_string())
        .arg("-singlefile")
        .arg("-png")
        .arg("-r")
        .arg("120")
        .arg(&input)
        .arg(&output_prefix)
        .output()
        .map_err(|e| format!("pdftoppm invocation failed: {e}"))?;
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
    fs::read(output_prefix.with_extension("png"))
        .map_err(|e| format!("pdftoppm page {page} returned no PNG: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

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
