//! UTF-8 source documents. Unsupported TeX constructs are left unchanged.
use std::{fs, io, path::{Path, PathBuf}};

#[derive(Debug)]
pub struct Document {
    pub path: Option<PathBuf>,
    pub source: String,
    saved_source: String,
}

impl Document {
    #[must_use]
    pub fn scratch(source: impl Into<String>) -> Self {
        Self { path: None, source: source.into(), saved_source: String::new() }
    }

    pub fn load(path: impl AsRef<Path>) -> io::Result<Self> {
        let path = path.as_ref().to_path_buf();
        let source = fs::read_to_string(&path)?;
        Ok(Self { path: Some(path), saved_source: source.clone(), source })
    }

    #[must_use]
    pub fn dirty(&self) -> bool { self.source != self.saved_source }

    pub fn save_to(&mut self, path: impl AsRef<Path>) -> io::Result<()> {
        let target = path.as_ref();
        let dir = target.parent().filter(|p| !p.as_os_str().is_empty())
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
        let path = self.path.clone().ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Document has no path"))?;
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
}
