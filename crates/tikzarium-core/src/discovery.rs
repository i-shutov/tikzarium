//! Discover local TeX tools. Discovery does not execute TeX documents.
use std::{
    env,
    ffi::OsStr,
    path::{Path, PathBuf},
    process::Command,
};

#[must_use]
pub fn find_executable(program: &str) -> Option<PathBuf> {
    if program.is_empty() {
        return None;
    }
    let path = Path::new(program);
    if path.components().count() > 1 || path.is_absolute() {
        return candidate(path);
    }
    let search = env::var_os("PATH")?;
    for dir in env::split_paths(&search) {
        let direct = dir.join(program);
        if let Some(found) = candidate(&direct) {
            return Some(found);
        }
        #[cfg(windows)]
        if Path::new(program).extension().is_none() {
            if let Some(found) = candidate(&dir.join(format!("{program}.exe"))) {
                return Some(found);
            }
        }
    }
    None
}

fn candidate(path: &Path) -> Option<PathBuf> {
    if path.is_file() {
        Some(path.to_path_buf())
    } else {
        None
    }
}

#[derive(Clone, Debug)]
pub struct TexEnvironment {
    pub xelatex: Option<PathBuf>,
    pub xelatex_version: Option<String>,
    pub kpsewhich: Option<PathBuf>,
    pub pdf_renderer: Option<PathBuf>,
}

impl TexEnvironment {
    #[must_use]
    pub fn discover() -> Self {
        let xelatex = env::var_os("TIKZARIUM_XELATEX")
            .and_then(|path| candidate(Path::new(&path)))
            .or_else(|| find_executable("xelatex"));
        let xelatex_version = xelatex.as_ref().and_then(|p| {
            Command::new(p)
                .arg("--version")
                .output()
                .ok()
                .filter(|o| o.status.success())
                .and_then(|o| String::from_utf8(o.stdout).ok())
                .and_then(|o| o.lines().next().map(str::to_owned))
        });
        Self {
            xelatex,
            xelatex_version,
            kpsewhich: find_executable("kpsewhich"),
            pdf_renderer: find_executable("pdftoppm"),
        }
    }

    /// A successful kpsewhich lookup only establishes presence, not compile compatibility.
    #[must_use]
    pub fn package_file(&self, name: &str) -> Option<PathBuf> {
        if name.is_empty()
            || name.starts_with('/')
            || name.contains("..")
            || !name
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || "-_./".contains(c))
        {
            return None;
        }
        let tool = self.kpsewhich.as_ref()?;
        let output = Command::new(tool).arg(OsStr::new(name)).output().ok()?;
        if !output.status.success() {
            return None;
        }
        let found = String::from_utf8(output.stdout).ok()?;
        let path = PathBuf::from(found.trim());
        if path.is_file() { Some(path) } else { None }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn empty_executable_never_resolves() {
        assert_eq!(find_executable(""), None);
    }
    #[test]
    fn traversal_is_not_accepted_as_package_name() {
        let env = TexEnvironment {
            xelatex: None,
            xelatex_version: None,
            kpsewhich: None,
            pdf_renderer: None,
        };
        assert!(env.package_file("../../secrets.tex").is_none());
        assert!(env.package_file("a; echo").is_none());
    }
}
