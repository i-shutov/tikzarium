//! SC1-01 contract tests: state and source bytes, not a physical GUI/PDF proof.
use std::{
    fs,
    path::{Path, PathBuf},
};
use tikzarium_core::{
    Document, FigurePreviewState, FigureSessionError, OneFigureSession, ProjectDependencySnapshot,
};

fn source_and_data() -> (tempfile::TempDir, PathBuf, PathBuf) {
    let dir = tempfile::tempdir().unwrap();
    let source = dir.path().join("рисунок.tex");
    let data = dir.path().join("измерения.dat");
    fs::write(
        &source,
        "% рисунок CRLF\r\n\\begin{tikzpicture}\r\n\\end{tikzpicture}\r\n".as_bytes(),
    )
    .unwrap();
    fs::write(&data, b"1 2\r\n3 4\r\n").unwrap();
    (dir, source, data)
}

fn snapshot(root: &Path, source: &Path, data: &Path) -> ProjectDependencySnapshot {
    ProjectDependencySnapshot::capture(root, source, &[data.to_path_buf()], true).unwrap()
}

#[test]
fn one_source_utf8_selection_undo_revisions_and_disk_bytes() {
    let (_root, source, _data) = source_and_data();
    let original_bytes = fs::read(&source).unwrap();
    let document = Document::load(&source).unwrap();
    let mut session = OneFigureSession::new(document);
    assert_eq!(session.preview_state(), FigurePreviewState::NotBuilt);
    let text = session.document().source.clone();
    let start = text.find('р').unwrap();
    assert!(matches!(
        session.select_source_range(Some(start + 1..start + 2)),
        Err(FigureSessionError::InvalidSelection)
    ));
    session.select_source_range(Some(start..start + 2)).unwrap();
    assert_eq!(session.selected_source_range(), Some(start..start + 2));
    assert_eq!(session.replace_source(0, text.clone()).unwrap(), false);
    assert_eq!(session.revision(), 0);
    let modified = format!("{text}% added\n");
    assert!(session.replace_source(0, modified).unwrap());
    assert_eq!(session.revision(), 1);
    assert!(session.selected_source_range().is_none());
    assert!(matches!(
        session.replace_source(0, "stale".to_owned()),
        Err(FigureSessionError::StaleRevision)
    ));
    assert_eq!(fs::read(&source).unwrap(), original_bytes);
    assert!(session.undo(1).unwrap());
    assert_eq!(session.revision(), 2);
    assert_eq!(session.document().source, text);
    assert_eq!(fs::read(&source).unwrap(), original_bytes);
    assert_eq!(session.undo(2).unwrap(), false);
}

#[test]
fn recorded_data_change_and_failure_never_claim_fresh_pdf() {
    let (root, source, data) = source_and_data();
    let original_source = fs::read(&source).unwrap();
    let mut session = OneFigureSession::new(Document::load(&source).unwrap());
    let pdf = root.path().join("figure.pdf");
    // A test marker for the model's provenance gate, not a real rendered PDF.
    fs::write(&pdf, b"%PDF-1.5\nqa-placeholder\n").unwrap();
    let ticket = session.begin_build().unwrap();
    assert_eq!(session.preview_state(), FigurePreviewState::Building);
    session
        .finish_build_success(ticket, &pdf, snapshot(root.path(), &source, &data))
        .unwrap();
    assert_eq!(session.preview_state(), FigurePreviewState::CurrentPdf);
    let original_dat = fs::read(&data).unwrap();
    let mut edited_data = original_dat.clone();
    edited_data[0] = b'8';
    fs::write(&data, &edited_data).unwrap();
    assert_eq!(session.preview_state(), FigurePreviewState::StalePdf);
    fs::write(&data, &original_dat).unwrap();
    assert_eq!(session.preview_state(), FigurePreviewState::CurrentPdf);
    let fail_ticket = session.begin_build().unwrap();
    session.finish_build_failure(fail_ticket).unwrap();
    assert_eq!(session.preview_state(), FigurePreviewState::FailedBuild);
    assert_eq!(session.last_good_pdf_path(), Some(pdf.as_path()));
    assert_eq!(fs::read(&source).unwrap(), original_source);
}

#[test]
fn delayed_build_outcome_and_tampered_pdf_never_masquerade_as_current() {
    let (root, source, data) = source_and_data();
    let mut session = OneFigureSession::new(Document::load(&source).unwrap());
    let old = session.begin_build().unwrap();
    let previous_source = session.document().source.clone();
    session
        .replace_source(0, format!("{previous_source}% edit\n"))
        .unwrap();
    let pdf = root.path().join("preview.pdf");
    fs::write(&pdf, b"%PDF-1.5\nold-build\n").unwrap();
    assert!(matches!(
        session.finish_build_success(old, &pdf, snapshot(root.path(), &source, &data)),
        Err(FigureSessionError::StaleBuild)
    ));
    let current = session.begin_build().unwrap();
    assert!(matches!(
        session.finish_build_failure(old),
        Err(FigureSessionError::StaleBuild)
    ));
    session.save().unwrap();
    session
        .finish_build_success(current, &pdf, snapshot(root.path(), &source, &data))
        .unwrap();
    assert_eq!(session.preview_state(), FigurePreviewState::CurrentPdf);
    fs::write(&pdf, b"%PDF-1.5\nTAMPERED!\n").unwrap();
    assert_eq!(session.preview_state(), FigurePreviewState::StalePdf);
}

#[test]
fn save_as_keeps_original_source_and_marks_old_pdf_stale() {
    let (root, source, data) = source_and_data();
    let original = fs::read(&source).unwrap();
    let mut session = OneFigureSession::new(Document::load(&source).unwrap());
    let pdf = root.path().join("original.pdf");
    fs::write(&pdf, b"%PDF-1.5\nfirst-build\n").unwrap();
    let ticket = session.begin_build().unwrap();
    session
        .finish_build_success(ticket, &pdf, snapshot(root.path(), &source, &data))
        .unwrap();
    assert_eq!(session.preview_state(), FigurePreviewState::CurrentPdf);
    let new_path = root.path().join("отдельная-копия.tex");
    session.save_as(&new_path).unwrap();
    assert_eq!(session.preview_state(), FigurePreviewState::StalePdf);
    assert_eq!(fs::read(source).unwrap(), original);
    assert_eq!(fs::read(new_path).unwrap(), original);
}

#[test]
fn unsaved_source_cannot_claim_a_current_pdf_from_an_old_fls() {
    let (root, source, data) = source_and_data();
    let unchanged_disk = fs::read(&source).unwrap();
    let mut doc = Document::load(&source).unwrap();
    doc.source.push_str("% unsaved edit\n");
    let mut session = OneFigureSession::new(doc);
    let pdf = root.path().join("wrong.pdf");
    fs::write(&pdf, b"%PDF-1.5\nnot-an-external-proof\n").unwrap();
    let epoch = session.begin_build().unwrap();
    let old_inputs = snapshot(root.path(), &source, &data);
    assert!(matches!(
        session.finish_build_success(epoch, &pdf, old_inputs),
        Err(FigureSessionError::UnverifiedBuildInputs)
    ));
    assert_eq!(session.preview_state(), FigurePreviewState::FailedBuild);
    assert_eq!(session.last_good_pdf_path(), None);
    assert_eq!(fs::read(&source).unwrap(), unchanged_disk);
}

#[test]
fn unrelated_source_or_changed_recorder_input_never_qualifies_a_pdf() {
    let (root, source, data) = source_and_data();
    let other = root.path().join("другой.tex");
    fs::copy(&source, &other).unwrap();
    let mut session = OneFigureSession::new(Document::load(&source).unwrap());
    let pdf = root.path().join("foreign.pdf");
    fs::write(&pdf, b"%PDF-1.5\nfixture\n").unwrap();
    let epoch = session.begin_build().unwrap();
    let foreign_inputs = snapshot(root.path(), &other, &data);
    assert!(matches!(
        session.finish_build_success(epoch, &pdf, foreign_inputs),
        Err(FigureSessionError::UnverifiedBuildInputs)
    ));

    let epoch = session.begin_build().unwrap();
    let captured = snapshot(root.path(), &source, &data);
    fs::write(&data, b"4 3\r\n2 1\r\n").unwrap();
    assert!(matches!(
        session.finish_build_success(epoch, &pdf, captured),
        Err(FigureSessionError::UnverifiedBuildInputs)
    ));
    assert_eq!(session.preview_state(), FigurePreviewState::FailedBuild);
}

#[test]
fn missing_or_invalid_pdf_preserves_last_good_as_failed_not_current() {
    let (root, source, data) = source_and_data();
    let mut session = OneFigureSession::new(Document::load(&source).unwrap());
    let good_pdf = root.path().join("last-good.pdf");
    fs::write(&good_pdf, b"%PDF-1.5\nlast-good\n").unwrap();
    let epoch = session.begin_build().unwrap();
    session
        .finish_build_success(epoch, &good_pdf, snapshot(root.path(), &source, &data))
        .unwrap();
    assert_eq!(session.preview_state(), FigurePreviewState::CurrentPdf);

    let invalid_pdf = root.path().join("bad.pdf");
    fs::write(&invalid_pdf, b"not a PDF").unwrap();
    let epoch = session.begin_build().unwrap();
    assert!(matches!(
        session.finish_build_success(
            epoch,
            &invalid_pdf,
            snapshot(root.path(), &source, &data)
        ),
        Err(FigureSessionError::Io(_))
    ));
    assert_eq!(session.preview_state(), FigurePreviewState::FailedBuild);
    assert_eq!(session.last_good_pdf_path(), Some(good_pdf.as_path()));
}

