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
        if Path::new(program).extension().is_none()
            && let Some(found) = candidate(&dir.join(format!("{program}.exe")))
        {
            return Some(found);
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

/// The distribution can only be trusted when XeLaTeX itself reports it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TexDistribution {
    MiKTeX,
    TeXLive,
    Unknown,
}

impl TexDistribution {
    #[must_use]
    pub fn from_version(version: &str) -> Self {
        let lower = version.to_ascii_lowercase();
        if lower.contains("miktex") {
            Self::MiKTeX
        } else if lower.contains("tex live") {
            Self::TeXLive
        } else {
            Self::Unknown
        }
    }
}

/// A version probe is read-only and never invokes a package manager.
#[derive(Clone, Debug)]
pub struct TexEngineIdentity {
    pub version: String,
    pub distribution: TexDistribution,
}

/// The first nonempty version line is displayed, but the full output is used
/// for classification because distributors may put the name on a later line.
pub fn inspect_xelatex(path: &Path) -> std::io::Result<TexEngineIdentity> {
    let output = Command::new(path)
        .arg("--version")
        .stdin(std::process::Stdio::null())
        .output()?;
    if !output.status.success() {
        return Err(std::io::Error::other(format!(
            "XeLaTeX --version exited with {}",
            output.status
        )));
    }
    let mut complete = String::from_utf8_lossy(&output.stdout).into_owned();
    complete.push_str(&String::from_utf8_lossy(&output.stderr));
    let version = complete
        .lines()
        .find(|line| !line.trim().is_empty())
        .unwrap_or("")
        .trim()
        .to_owned();
    Ok(TexEngineIdentity {
        distribution: TexDistribution::from_version(&complete),
        version,
    })
}

/// An unavailable lookup is not evidence that a package is missing.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PackageProbe {
    Present(PathBuf),
    Missing,
    Unavailable,
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
        let xelatex_version =
            xelatex
                .as_ref()
                .and_then(|p| inspect_xelatex(p).ok())
                .map(|identity| {
                    if TexDistribution::from_version(&identity.version) != TexDistribution::Unknown
                    {
                        identity.version
                    } else {
                        // Preserve the identity if the distributor only named itself
                        // after the first version line, without adding a struct field.
                        let suffix = match identity.distribution {
                            TexDistribution::MiKTeX => "MiKTeX",
                            TexDistribution::TeXLive => "TeX Live",
                            TexDistribution::Unknown => "unknown",
                        };
                        format!("{} [{suffix}]", identity.version)
                    }
                });
        Self {
            xelatex,
            xelatex_version,
            kpsewhich: find_executable("kpsewhich"),
            pdf_renderer: find_executable("pdftoppm"),
        }
    }

    /// Read-only lookup: MiKTeX's native findtexmf never receives
    /// --must-exist (which can trigger package installation). We never call
    /// bare MiKTeX kpsewhich, which has historically triggered auto-install.
    #[must_use]
    pub fn probe_package(&self, name: &str) -> PackageProbe {
        if name.is_empty()
            || name.starts_with('/')
            || name.contains("..")
            || !name
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || "-_./".contains(c))
        {
            return PackageProbe::Unavailable;
        }

        let distribution = self
            .xelatex_version
            .as_deref()
            .map(TexDistribution::from_version)
            .unwrap_or(TexDistribution::Unknown);
        let tool = match distribution {
            TexDistribution::MiKTeX => tool_next_to_engine(self.xelatex.as_deref(), "findtexmf"),
            TexDistribution::TeXLive => tool_near_engine(self.xelatex.as_deref(), "kpsewhich")
                .or_else(|| self.kpsewhich.clone()),
            TexDistribution::Unknown => None,
        };
        let Some(tool) = tool else {
            return PackageProbe::Unavailable;
        };
        let output = Command::new(tool)
            .arg(OsStr::new(name))
            .stdin(std::process::Stdio::null())
            .output();
        let Ok(output) = output else {
            return PackageProbe::Unavailable;
        };
        if !output.status.success() {
            return PackageProbe::Missing;
        }
        let Ok(found) = String::from_utf8(output.stdout) else {
            return PackageProbe::Unavailable;
        };
        let path = PathBuf::from(found.trim());
        if path.is_file() {
            PackageProbe::Present(path)
        } else {
            PackageProbe::Missing
        }
    }

    /// Compatibility helper for existing read-only package panels.
    #[must_use]
    pub fn package_file(&self, name: &str) -> Option<PathBuf> {
        match self.probe_package(name) {
            PackageProbe::Present(path) => Some(path),
            PackageProbe::Missing | PackageProbe::Unavailable => None,
        }
    }
}

/// Only use the helper from the selected MiKTeX installation: a helper
/// from another PATH entry could inspect the wrong user/shared package tree.
fn tool_next_to_engine(engine: Option<&Path>, name: &str) -> Option<PathBuf> {
    let directory = engine?.parent()?;
    #[cfg(windows)]
    let filename = format!("{name}.exe");
    #[cfg(not(windows))]
    let filename = name;
    candidate(&directory.join(filename))
}

fn tool_near_engine(engine: Option<&Path>, name: &str) -> Option<PathBuf> {
    tool_next_to_engine(engine, name).or_else(|| find_executable(name))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn empty_executable_never_resolves() {
        assert_eq!(find_executable(""), None);
    }
    #[test]
    fn distribution_identity_is_explicit_and_fail_closed() {
        assert_eq!(
            TexDistribution::from_version("MiKTeX-XeTeX 4.20 (MiKTeX 25.12)"),
            TexDistribution::MiKTeX
        );
        assert_eq!(
            TexDistribution::from_version("XeTeX 0.999996 (TeX Live 2025)"),
            TexDistribution::TeXLive
        );
        assert_eq!(
            TexDistribution::from_version("XeTeX-custom 0.1"),
            TexDistribution::Unknown
        );
    }

    #[test]
    fn unknown_distribution_cannot_use_an_arbitrary_package_manager() {
        let env = TexEnvironment {
            xelatex: None,
            xelatex_version: Some("unidentified".to_owned()),
            kpsewhich: Some(PathBuf::from("/unknown/kpsewhich")),
            pdf_renderer: None,
        };
        assert_eq!(env.probe_package("tikz.sty"), PackageProbe::Unavailable);
    }

    #[cfg(unix)]
    #[test]
    fn miktex_uses_sibling_findtexmf_without_install_option() {
        use std::{fs, os::unix::fs::PermissionsExt};
        let directory = tempfile::tempdir().unwrap();
        let bin = directory.path().join("путь с пробелом");
        fs::create_dir_all(&bin).unwrap();
        let engine = bin.join("xelatex");
        fs::write(&engine, "").unwrap();
        let package = directory.path().join("tikz.sty");
        fs::write(&package, "% installed").unwrap();
        let argv = directory.path().join("arguments.txt");
        let tool = bin.join("findtexmf");
        let script = format!(
            "#!/bin/sh\nprintf '%s\\n' \"$@\" > '{}'\nprintf '%s\\n' '{}'\n",
            argv.display(),
            package.display()
        );
        fs::write(&tool, script).unwrap();
        let mut permissions = fs::metadata(&tool).unwrap().permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&tool, permissions).unwrap();

        let environment = TexEnvironment {
            xelatex: Some(engine),
            xelatex_version: Some("MiKTeX-XeTeX 4.20".to_owned()),
            kpsewhich: None,
            pdf_renderer: None,
        };
        assert_eq!(
            environment.probe_package("tikz.sty"),
            PackageProbe::Present(package)
        );
        assert_eq!(fs::read_to_string(argv).unwrap(), "tikz.sty\n");
    }

    #[test]
    fn user_and_shared_miktex_roots_do_not_mix_lookup_helpers() {
        let directory = tempfile::tempdir().unwrap();
        let helper_name = if cfg!(windows) {
            "findtexmf.exe"
        } else {
            "findtexmf"
        };
        let user = directory.path().join("User MiKTeX Юникод");
        let shared = directory.path().join("Shared MiKTeX с пробелом");
        std::fs::create_dir_all(&user).unwrap();
        std::fs::create_dir_all(&shared).unwrap();
        let user_helper = user.join(helper_name);
        let shared_helper = shared.join(helper_name);
        std::fs::write(&user_helper, b"fake helper").unwrap();
        std::fs::write(&shared_helper, b"fake helper").unwrap();
        let user_engine = user.join("xelatex.exe");
        let shared_engine = shared.join("xelatex.exe");
        assert_eq!(
            tool_next_to_engine(Some(&user_engine), "findtexmf"),
            Some(user_helper.clone())
        );
        assert_eq!(
            tool_next_to_engine(Some(&shared_engine), "findtexmf"),
            Some(shared_helper)
        );
        std::fs::remove_file(user_helper).unwrap();
        assert_eq!(
            tool_next_to_engine(Some(&user_engine), "findtexmf"),
            None
        );
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
