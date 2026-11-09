//! One active TikZ figure: revisioned source, selection, Undo, and PDF freshness.
//! The authoritative source remains Document; no alternate TeX model is created.
use crate::{Document, ProjectDependencySnapshot};
use sha2::{Digest, Sha256};
use std::{
    fs, io,
    ops::Range,
    path::{Path, PathBuf},
};

const MAX_UNDO_SNAPSHOTS: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FigurePreviewState {
    NotBuilt,
    Building,
    CurrentPdf,
    StalePdf,
    FailedBuild,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FigureBuildEpoch {
    id: u64,
    revision: u64,
}

#[derive(Debug, thiserror::Error)]
pub enum FigureSessionError {
    #[error("stale source revision; refresh selection before editing")]
    StaleRevision,
    #[error("selection is not a UTF-8-aligned source byte range")]
    InvalidSelection,
    #[error("build result does not belong to the current source/build epoch")]
    StaleBuild,
    #[error("session revision/epoch counter exhausted")]
    CounterExhausted,
    #[error(transparent)]
    Io(#[from] io::Error),
}

#[derive(Debug)]
struct LastGoodPdf {
    path: PathBuf,
    path_sha256: [u8; 32],
    source_path: Option<PathBuf>,
    source_sha256: [u8; 32],
    dependencies: ProjectDependencySnapshot,
}

/// A single-source figure session; no second drawing model or canvases.
/// Recognition adapters may attach byte-range selections in a subsequent SC2.
#[derive(Debug)]
pub struct OneFigureSession {
    document: Document,
    revision: u64,
    selected: Option<Range<usize>>,
    undo_source: Vec<String>,
    latest_build: Option<FigureBuildEpoch>,
    next_build_id: u64,
    last_good_pdf: Option<LastGoodPdf>,
    build_failed: bool,
}

impl OneFigureSession {
    pub fn new(document: Document) -> Self {
        Self {
            document,
            revision: 0,
            selected: None,
            undo_source: Vec::new(),
            latest_build: None,
            next_build_id: 0,
            last_good_pdf: None,
            build_failed: false,
        }
    }

    #[must_use]
    pub fn document(&self) -> &Document {
        &self.document
    }

    #[must_use]
    pub fn revision(&self) -> u64 {
        self.revision
    }

    #[must_use]
    pub fn selected_source_range(&self) -> Option<Range<usize>> {
        self.selected.clone()
    }

    /// An adapter cannot select half a UTF-8 character or an outside range.
    pub fn select_source_range(
        &mut self,
        span: Option<Range<usize>>,
    ) -> Result<(), FigureSessionError> {
        if let Some(ref range) = span {
            let source = &self.document.source;
            if range.start >= range.end
                || range.end > source.len()
                || !source.is_char_boundary(range.start)
                || !source.is_char_boundary(range.end)
            {
                return Err(FigureSessionError::InvalidSelection);
            }
        }
        self.selected = span;
        Ok(())
    }

    /// The sole tracked path to author-source mutation. On success all old
    /// selection ranges are invalidated and the revision only increases.
    pub fn replace_source(
        &mut self,
        expected_revision: u64,
        replacement: String,
    ) -> Result<bool, FigureSessionError> {
        self.require_revision(expected_revision)?;
        if self.document.source == replacement {
            return Ok(false);
        }
        let next = self
            .revision
            .checked_add(1)
            .ok_or(FigureSessionError::CounterExhausted)?;
        if self.undo_source.len() == MAX_UNDO_SNAPSHOTS {
            self.undo_source.remove(0);
        }
        self.undo_source.push(self.document.source.clone());
        self.document.source = replacement;
        self.revision = next;
        self.selected = None;
        self.latest_build = None;
        // Existing PDF and any queued build remain provenance-bound to the old
        // source and can never masquerade as current after an edit.
        self.build_failed = false;
        Ok(true)
    }

    pub fn undo(&mut self, expected_revision: u64) -> Result<bool, FigureSessionError> {
        self.require_revision(expected_revision)?;
        let Some(previous) = self.undo_source.last() else {
            return Ok(false);
        };
        let next = self
            .revision
            .checked_add(1)
            .ok_or(FigureSessionError::CounterExhausted)?;
        let previous = previous.clone();
        self.undo_source.pop();
        self.document.source = previous;
        self.revision = next;
        self.selected = None;
        self.latest_build = None;
        self.build_failed = false;
        Ok(true)
    }

    pub fn save(&mut self) -> io::Result<()> {
        self.document.save()
    }

    pub fn save_as(&mut self, path: impl AsRef<Path>) -> io::Result<()> {
        self.document.save_to(path)
    }

    /// Starts a source-revision-bound build. A later/stale completion cannot
    /// become the current PDF, even if the external XeLaTeX returned success.
    pub fn begin_build(&mut self) -> Result<FigureBuildEpoch, FigureSessionError> {
        let next = self
            .next_build_id
            .checked_add(1)
            .ok_or(FigureSessionError::CounterExhausted)?;
        self.next_build_id = next;
        let ticket = FigureBuildEpoch {
            id: next,
            revision: self.revision,
        };
        self.latest_build = Some(ticket);
        self.build_failed = false;
        Ok(ticket)
    }

    /// Accept only a completed PDF already produced by the external compiler.
    /// No engine invocation or TeX emulation occurs in the session model.
    pub fn finish_build_success(
        &mut self,
        ticket: FigureBuildEpoch,
        pdf_path: impl AsRef<Path>,
        dependencies: ProjectDependencySnapshot,
    ) -> Result<(), FigureSessionError> {
        self.require_current_build(ticket)?;
        let path = pdf_path.as_ref();
        let bytes = fs::read(path)?;
        if bytes.len() < 5 || &bytes[..5] != b"%PDF-" {
            return Err(FigureSessionError::Io(io::Error::new(
                io::ErrorKind::InvalidData,
                "external build output is not a PDF",
            )));
        }
        self.last_good_pdf = Some(LastGoodPdf {
            path: path.to_path_buf(),
            path_sha256: hash(&bytes),
            source_path: self.document.path.clone(),
            source_sha256: hash(self.document.source.as_bytes()),
            dependencies,
        });
        self.latest_build = None;
        self.build_failed = false;
        Ok(())
    }

    /// Retain the previous PDF but label it failed/stale, never current.
    pub fn finish_build_failure(
        &mut self,
        ticket: FigureBuildEpoch,
    ) -> Result<(), FigureSessionError> {
        self.require_current_build(ticket)?;
        self.latest_build = None;
        self.build_failed = true;
        Ok(())
    }

    #[must_use]
    pub fn last_good_pdf_path(&self) -> Option<&Path> {
        self.last_good_pdf.as_ref().map(|pdf| pdf.path.as_path())
    }

    /// Check local source, recorder dependencies and PDF bytes on demand, not
    /// on each UI frame. Remote TeX installation paths remain unverified.
    #[must_use]
    pub fn preview_state(&self) -> FigurePreviewState {
        if self.latest_build.is_some() {
            return FigurePreviewState::Building;
        }
        if self.build_failed {
            return FigurePreviewState::FailedBuild;
        }
        let Some(pdf) = &self.last_good_pdf else {
            return FigurePreviewState::NotBuilt;
        };
        if pdf.source_path != self.document.path
            || pdf.source_sha256 != hash(self.document.source.as_bytes())
            || !pdf.dependencies.is_project_fresh()
            || fs::read(&pdf.path).ok().map(|bytes| hash(&bytes)) != Some(pdf.path_sha256)
        {
            return FigurePreviewState::StalePdf;
        }
        FigurePreviewState::CurrentPdf
    }

    fn require_revision(&self, expected: u64) -> Result<(), FigureSessionError> {
        if self.revision == expected {
            Ok(())
        } else {
            Err(FigureSessionError::StaleRevision)
        }
    }

    fn require_current_build(&self, ticket: FigureBuildEpoch) -> Result<(), FigureSessionError> {
        if self.latest_build == Some(ticket) && self.revision == ticket.revision {
            Ok(())
        } else {
            Err(FigureSessionError::StaleBuild)
        }
    }
}

fn hash(bytes: &[u8]) -> [u8; 32] {
    Sha256::digest(bytes).into()
}
