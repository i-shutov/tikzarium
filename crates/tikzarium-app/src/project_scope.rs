//! An explicit, document-scoped project root. TeX still runs beside its source.
use std::path::{Path, PathBuf};

/// Selecting a common parent is deliberate; opening a file never infers a
/// wider project from `..` references. Resolve both sides to reject symlink
/// escapes while accepting platform aliases such as macOS /var.
pub fn checked_project_root(source: &Path, root: &Path) -> Result<PathBuf, String> {
    let root = root
        .canonicalize()
        .map_err(|error| format!("Папка проекта недоступна: {error}"))?;
    if !root.is_dir() {
        return Err("Выберите папку проекта, а не файл.".into());
    }
    let source = source
        .canonicalize()
        .map_err(|error| format!("Исходный файл недоступен: {error}"))?;
    if !source.is_file() || !source.starts_with(&root) {
        return Err("Папка проекта должна содержать открытый исходный файл.".into());
    }
    Ok(root)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn common_parent_accepts_scientific_sibling_data_without_rewriting_source() {
        let project = tempfile::tempdir().unwrap();
        let figures = project.path().join("figures");
        let data = project.path().join("data");
        fs::create_dir(&figures).unwrap();
        fs::create_dir(&data).unwrap();
        let source = figures.join("график.tex");
        let bytes = b"\\def\\datadir{../data}\r\n";
        fs::write(&source, bytes).unwrap();
        fs::write(data.join("curve.dat"), b"0 1\n").unwrap();
        assert_eq!(
            checked_project_root(&source, project.path()).unwrap(),
            project.path().canonicalize().unwrap()
        );
        assert_eq!(fs::read(source).unwrap(), bytes);
    }

    #[test]
    fn unrelated_missing_or_file_roots_are_rejected() {
        let project = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let source = project.path().join("figure.tex");
        fs::write(&source, "source").unwrap();
        assert!(checked_project_root(&source, other.path()).is_err());
        assert!(checked_project_root(&source, &project.path().join("missing")).is_err());
        assert!(checked_project_root(&source, &source).is_err());
        assert!(checked_project_root(&project.path().join("gone.tex"), project.path()).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn source_symlink_cannot_silently_escape_selected_root() {
        let project = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let target = other.path().join("outside.tex");
        fs::write(&target, "source").unwrap();
        let source = project.path().join("figure.tex");
        std::os::unix::fs::symlink(target, &source).unwrap();
        assert!(checked_project_root(&source, project.path()).is_err());
    }
}
