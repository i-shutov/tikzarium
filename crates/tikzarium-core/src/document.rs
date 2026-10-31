//! UTF-8 source documents. Unsupported TeX constructs are left unchanged.
use std::{
    fs, io,
    path::{Path, PathBuf},
};

#[derive(Debug)]
pub struct Document {
    pub path: Option<PathBuf>,
    pub source: String,
    saved_source: String,
}

impl Document {
    #[must_use]
    pub fn scratch(source: impl Into<String>) -> Self {
        Self {
            path: None,
            source: source.into(),
            saved_source: String::new(),
        }
    }

    pub fn load(path: impl AsRef<Path>) -> io::Result<Self> {
        let path = path.as_ref().to_path_buf();
        let source = fs::read_to_string(&path)?;
        Ok(Self {
            path: Some(path),
            saved_source: source.clone(),
            source,
        })
    }

    #[must_use]
    pub fn dirty(&self) -> bool {
        self.source != self.saved_source
    }

    /// Store source without rewriting a byte-identical open document.
    ///
    /// A normal Build calls save() before invoking XeLaTeX. Replacing a clean
    /// file with a new tempfile on every Build would silently break symlinks
    /// and hard links and alter filesystem identity despite unchanged TeX.
    ///
    /// When editing an already-open path, reject externally changed/deleted
    /// disk contents rather than silently overwriting another writer's work.
    /// The byte comparison is a preflight, not a race-free filesystem lock.
    pub fn save_to(&mut self, path: impl AsRef<Path>) -> io::Result<()> {
        let target = path.as_ref();
        let same_document = self.path.as_ref().is_some_and(|current| {
            current.as_path() == target
                || matches!(
                    (current.canonicalize(), target.canonicalize()),
                    (Ok(old), Ok(new)) if old == new
                )
        });
        let metadata = match fs::symlink_metadata(target) {
            Ok(metadata) => Some(metadata),
            Err(error) if error.kind() == io::ErrorKind::NotFound => None,
            Err(error) => return Err(error),
        };
        if same_document {
            // A deleted or redirected file is not recreated implicitly.
            let info = metadata.as_ref().ok_or_else(|| {
                io::Error::new(
                    io::ErrorKind::NotFound,
                    "Open TeX source disappeared on disk; use Save As instead",
                )
            })?;
            if !info.is_file() && !info.file_type().is_symlink() {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "Open TeX source is no longer a regular file",
                ));
            }
            if fs::read(target)? != self.saved_source.as_bytes() {
                return Err(io::Error::new(
                    io::ErrorKind::AlreadyExists,
                    "TeX source changed on disk since opening; use Save As to preserve the external edit",
                ));
            }
            // Build's save of an unchanged document is a true no-op.
            if !self.dirty() {
                self.path = Some(target.to_path_buf());
                return Ok(());
            }
        }

        if let Some(info) = metadata.as_ref() {
            // Atomic rename over a symlink would silently replace the link
            // itself, not write through to its referent. Never do that.
            if info.file_type().is_symlink() {
                return Err(io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    "Refusing to replace a symlinked TeX source; use Save As",
                ));
            }
            if !info.is_file() {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "TeX output path is not a regular file",
                ));
            }
            if info.permissions().readonly() {
                return Err(io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    "Refusing to replace a read-only TeX source",
                ));
            }
        }

        let dir = target
            .parent()
            .filter(|p| !p.as_os_str().is_empty())
            .unwrap_or_else(|| Path::new("."));
        fs::create_dir_all(dir)?;
        let mut temp = tempfile::NamedTempFile::new_in(dir)?;
        use std::io::Write;
        temp.write_all(self.source.as_bytes())?;
        temp.flush()?;
        temp.as_file().sync_all()?;
        temp.persist(target).map_err(|e| e.error)?;
        self.path = Some(target.to_path_buf());
        self.saved_source.clone_from(&self.source);
        Ok(())
    }

    pub fn save(&mut self) -> io::Result<()> {
        let path = self
            .path
            .clone()
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Document has no path"))?;
        self.save_to(path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tracks_unsaved_changes() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("пример.tex");
        let mut doc = Document::scratch("\\begin{document}тест\\end{document}\n");
        assert!(doc.dirty());
        doc.save_to(&file).unwrap();
        assert!(!doc.dirty());
        doc.source.push_str("% note\n");
        assert!(doc.dirty());
        doc.save().unwrap();
        assert_eq!(Document::load(&file).unwrap().source, doc.source);
        assert!(!doc.dirty());
    }

    #[test]
    fn cannot_save_unbound_document() {
        let mut doc = Document::scratch("x");
        assert_eq!(doc.save().unwrap_err().kind(), io::ErrorKind::InvalidInput);
    }
    #[test]
    fn clean_save_preserves_existing_file_bytes_and_identity() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("тест с пробелом.tex");
        let bytes = b"% original CRLF\r\n\\begin{tikzpicture}\r\n";
        fs::write(&source, bytes).unwrap();
        let original = fs::metadata(&source).unwrap();
        let mut document = Document::load(&source).unwrap();

        assert!(!document.dirty());
        document.save().unwrap();
        assert_eq!(fs::read(&source).unwrap(), bytes);
        assert!(!document.dirty());
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;
            let after = fs::metadata(&source).unwrap();
            assert_eq!(original.dev(), after.dev());
            assert_eq!(original.ino(), after.ino());
        }
        #[cfg(not(unix))]
        let _ = original;
    }

    #[test]
    fn changed_disk_source_is_never_overwritten_by_stale_buffer() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("figure.tex");
        fs::write(&source, "initial\n").unwrap();
        let mut doc = Document::load(&source).unwrap();

        fs::write(&source, "other process edited\n").unwrap();
        let error = doc.save().unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::AlreadyExists);
        assert_eq!(fs::read_to_string(&source).unwrap(), "other process edited\n");

        doc.source.push_str("% my unsaved change\n");
        assert!(doc.dirty());
        let error = doc.save().unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::AlreadyExists);
        assert_eq!(fs::read_to_string(&source).unwrap(), "other process edited\n");
        assert_eq!(doc.path.as_deref(), Some(source.as_path()));
    }

    #[test]
    fn deleted_open_source_cannot_be_silently_recreated() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("figure.tex");
        fs::write(&source, "initial\n").unwrap();
        let mut doc = Document::load(&source).unwrap();
        fs::remove_file(&source).unwrap();
        let error = doc.save().unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::NotFound);
        assert!(!source.exists());
    }

    #[test]
    fn explicit_save_as_to_new_path_preserves_the_original() {
        let dir = tempfile::tempdir().unwrap();
        let original = dir.path().join("original.tex");
        let copy = dir.path().join("copy.tex");
        fs::write(&original, "original\n").unwrap();
        let mut doc = Document::load(&original).unwrap();
        doc.source.push_str("% new content\n");
        doc.save_to(&copy).unwrap();
        assert_eq!(fs::read_to_string(&original).unwrap(), "original\n");
        assert_eq!(
            fs::read_to_string(&copy).unwrap(),
            "original\n% new content\n"
        );
        assert_eq!(doc.path.as_deref(), Some(copy.as_path()));
        assert!(!doc.dirty());
    }

    #[cfg(unix)]
    #[test]
    fn clean_build_save_preserves_symlink_and_dirty_save_fails_closed() {
        use std::os::unix::fs::symlink;

        let dir = tempfile::tempdir().unwrap();
        let real = dir.path().join("real.tex");
        let alias = dir.path().join("alias.tex");
        fs::write(&real, "unchanged\n").unwrap();
        symlink(&real, &alias).unwrap();
        let mut doc = Document::load(&alias).unwrap();
        doc.save().unwrap();
        assert!(fs::symlink_metadata(&alias).unwrap().file_type().is_symlink());
        doc.source.push_str("% change\n");
        let error = doc.save().unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::PermissionDenied);
        assert!(fs::symlink_metadata(&alias).unwrap().file_type().is_symlink());
        assert_eq!(fs::read_to_string(&real).unwrap(), "unchanged\n");
    }

    #[test]
    fn readonly_open_source_can_be_built_without_replacement() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("read-only.tex");
        fs::write(&file, "unchanged\n").unwrap();
        let original_permissions = fs::metadata(&file).unwrap().permissions();
        let mut locked_permissions = original_permissions.clone();
        locked_permissions.set_readonly(true);
        fs::set_permissions(&file, locked_permissions).unwrap();

        let mut doc = Document::load(&file).unwrap();
        assert!(doc.save().is_ok());
        doc.source.push_str("% change\n");
        assert_eq!(doc.save().unwrap_err().kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(fs::read_to_string(&file).unwrap(), "unchanged\n");
        // Restore write permissions before TempDir cleanup on Windows.
        fs::set_permissions(&file, original_permissions).unwrap();
    }

}
