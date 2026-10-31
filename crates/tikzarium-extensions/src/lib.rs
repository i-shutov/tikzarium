//! Declarative PGF/TikZ extension catalogue.
//!
//! A TeX package is not an executable plugin. Finding a package does not
//! establish successful compilation, inspection, or safe visual editing.
//! No manifest field is interpreted as a command, shared library, or script.

pub mod evidence;
pub mod primitive_edit;
pub mod primitives;
pub mod project_disconnect;
pub mod project_imports;

use serde::Deserialize;
use std::{
    collections::HashSet,
    fs,
    io::{ErrorKind, Read},
    path::Path,
};
use thiserror::Error;
use tikzarium_core::TexEnvironment;

pub const MANIFEST_SCHEMA_VERSION: u32 = 1;
const MAX_MANIFEST_BYTES: usize = 64 * 1024;
const MAX_DIRECTORY_MANIFESTS: usize = 128;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EngineRequirement {
    Xelatex,
    Lualatex,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ExtensionManifest {
    pub schema_version: u32,
    pub id: String,
    pub display_name: String,
    pub version: String,
    pub category: String,
    pub engine: EngineRequirement,
    #[serde(default)]
    pub requires_files: Vec<String>,
    /// Metadata for future adapters, never proof of editability.
    #[serde(default)]
    pub visual_features: Vec<String>,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstallationState {
    /// Every required file was located by the configured TeX lookup.
    Present,
    /// At least one lookup returned a negative result.
    NotLocated,
    /// Lookup was unavailable or at least one result was indeterminate.
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CompilationState {
    /// No real XeLaTeX fixture has been executed for this environment.
    NotTested,
    /// The advertised feature requires a different engine.
    IncompatibleEngine,
}

#[derive(Debug, Clone)]
pub struct ExtensionStatus {
    pub manifest: ExtensionManifest,
    pub installation: InstallationState,
    pub compilation: CompilationState,
    pub inspectable: bool,
    pub visual_editable: bool,
    /// Compatibility with the W01 package panel: only true for Present.
    pub installed: bool,
    /// Names for which a lookup explicitly failed, not a complete package inventory.
    pub missing_files: Vec<String>,
    /// Never promoted by mere package discovery.
    pub compilation_verified: bool,
}

#[derive(Debug, Error)]
pub enum RegistryError {
    #[error("Failed to read extension manifests: {0}")]
    Io(#[from] std::io::Error),
    #[error("Cannot parse {path}: {source}")]
    Toml {
        path: String,
        source: toml::de::Error,
    },
    #[error("Invalid extension manifest {path}: {reason}")]
    Invalid { path: String, reason: String },
    #[error("Duplicate extension id: {0}")]
    DuplicateId(String),
    #[error("Unsafe extension entry (not a regular TOML file): {0}")]
    UnsafeEntry(String),
    #[error("Extension manifest is larger than 64 KiB: {0}")]
    TooLarge(String),
    #[error("Extension manifest is not UTF-8: {0}")]
    InvalidUtf8(String),
    #[error("Too many extension manifests (maximum 128)")]
    TooMany,
}

#[derive(Default, Debug, Clone)]
pub struct Registry {
    pub manifests: Vec<ExtensionManifest>,
}

impl Registry {
    pub fn new() -> Result<Self, RegistryError> {
        let mut registry = Self::default();
        for (path, source) in [
            ("core.toml", include_str!("../../../extensions/core.toml")),
            (
                "pgfplots.toml",
                include_str!("../../../extensions/pgfplots.toml"),
            ),
            (
                "circuitikz.toml",
                include_str!("../../../extensions/circuitikz.toml"),
            ),
            (
                "tikz-cd.toml",
                include_str!("../../../extensions/tikz-cd.toml"),
            ),
            (
                "graphdrawing-lua.toml",
                include_str!("../../../extensions/graphdrawing-lua.toml"),
            ),
        ] {
            registry.add(path, source)?;
        }
        Ok(registry)
    }

    /// Parse and validate before inserting; an unsuccessful add changes nothing.
    pub fn add(&mut self, path: &str, source: &str) -> Result<(), RegistryError> {
        if source.len() > MAX_MANIFEST_BYTES {
            return Err(RegistryError::TooLarge(path.to_owned()));
        }
        let manifest: ExtensionManifest =
            toml::from_str(source).map_err(|source| RegistryError::Toml {
                path: path.to_owned(),
                source,
            })?;
        validate_manifest(&manifest).map_err(|reason| RegistryError::Invalid {
            path: path.to_owned(),
            reason,
        })?;
        if self.manifests.iter().any(|known| known.id == manifest.id) {
            return Err(RegistryError::DuplicateId(manifest.id));
        }
        self.manifests.push(manifest);
        Ok(())
    }

    /// Read metadata only, never execute it. Deterministic and all-or-nothing.
    ///
    /// A missing directory is an empty optional catalogue. Other IO errors
    /// propagate. Symlinks and non-regular TOML entries are rejected to avoid
    /// following unexpected paths outside the selected directory.
    pub fn load_directory(&mut self, dir: &Path) -> Result<usize, RegistryError> {
        // read_dir follows a symlink at the catalogue root. A missing optional
        // directory is acceptable, but a symlink (including a dangling one) or
        // a non-directory root must never be treated as an empty catalogue.
        match fs::symlink_metadata(dir) {
            Ok(metadata) if metadata.file_type().is_symlink() || !metadata.is_dir() => {
                return Err(RegistryError::UnsafeEntry(dir.display().to_string()));
            }
            Ok(_) => {}
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(0),
            Err(error) => return Err(error.into()),
        };
        // A disappearance after the preflight is an IO error, not a silent
        // success. Concurrent mutation is not an OS-level sandbox guarantee.
        let mut entries = fs::read_dir(dir)?.collect::<Result<Vec<_>, _>>()?;
        entries.sort_by_key(|entry| entry.file_name());
        let candidates: Vec<_> = entries
            .iter()
            .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "toml"))
            .collect();
        if candidates.len() > MAX_DIRECTORY_MANIFESTS {
            return Err(RegistryError::TooMany);
        }

        let mut staged = self.clone();
        for entry in &candidates {
            let path = entry.path();
            let label = path.display().to_string();
            if !entry.file_type()?.is_file() {
                return Err(RegistryError::UnsafeEntry(label));
            }
            let mut reader = fs::File::open(&path)?.take((MAX_MANIFEST_BYTES + 1) as u64);
            let mut bytes = Vec::new();
            reader.read_to_end(&mut bytes)?;
            if bytes.len() > MAX_MANIFEST_BYTES {
                return Err(RegistryError::TooLarge(label));
            }
            let source =
                String::from_utf8(bytes).map_err(|_| RegistryError::InvalidUtf8(label.clone()))?;
            staged.add(&label, &source)?;
        }
        *self = staged;
        Ok(candidates.len())
    }

    /// Discovery is performed on demand by the caller, not on every UI frame.
    #[must_use]
    pub fn status(&self, tex: &TexEnvironment) -> Vec<ExtensionStatus> {
        self.status_with_lookup(|file| {
            tex.kpsewhich.as_ref()?;
            Some(tex.package_file(file).is_some())
        })
    }

    /// Testable lookup boundary: Some(true) means found, Some(false) means
    /// not located, and None means there is no reliable lookup result.
    /// No PASS compilation or editor capability is synthesized here.
    #[must_use]
    pub fn status_with_lookup(
        &self,
        mut lookup: impl FnMut(&str) -> Option<bool>,
    ) -> Vec<ExtensionStatus> {
        self.manifests
            .iter()
            .cloned()
            .map(|manifest| {
                let mut missing_files = Vec::new();
                let mut indeterminate = false;
                for file in &manifest.requires_files {
                    match lookup(file) {
                        Some(true) => {}
                        Some(false) => missing_files.push(file.clone()),
                        None => indeterminate = true,
                    }
                }
                let installation = if !missing_files.is_empty() {
                    InstallationState::NotLocated
                } else if indeterminate {
                    InstallationState::Unknown
                } else {
                    InstallationState::Present
                };
                let compilation = match manifest.engine {
                    EngineRequirement::Xelatex => CompilationState::NotTested,
                    EngineRequirement::Lualatex => CompilationState::IncompatibleEngine,
                };
                ExtensionStatus {
                    installed: installation == InstallationState::Present,
                    manifest,
                    installation,
                    compilation,
                    inspectable: false,
                    visual_editable: false,
                    missing_files,
                    compilation_verified: false,
                }
            })
            .collect()
    }

    #[must_use]
    pub fn unique_ids(&self) -> bool {
        let mut ids = HashSet::new();
        self.manifests
            .iter()
            .all(|item| ids.insert(item.id.as_str()))
    }
}

fn validate_manifest(manifest: &ExtensionManifest) -> Result<(), String> {
    if manifest.schema_version != MANIFEST_SCHEMA_VERSION {
        return Err(format!(
            "unsupported schema_version {}; supported: {}",
            manifest.schema_version, MANIFEST_SCHEMA_VERSION
        ));
    }
    if manifest.id.len() > 128
        || manifest.id.split('.').count() < 2
        || !manifest.id.split('.').all(|part| {
            part.as_bytes().first().is_some_and(u8::is_ascii_lowercase)
                && !part.ends_with('-')
                && part
                    .bytes()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
        })
    {
        return Err("id must be a lowercase dotted identifier".into());
    }
    if !is_semver_triplet(&manifest.version) {
        return Err("version must be a three-component numeric version".into());
    }
    for (label, value, max) in [
        ("display_name", manifest.display_name.as_str(), 128),
        ("category", manifest.category.as_str(), 96),
        ("notes", manifest.notes.as_str(), 2048),
    ] {
        if value.len() > max
            || (label != "notes" && value.trim().is_empty())
            || value
                .chars()
                .any(|c| c.is_control() && c != '\n' && c != '\t')
        {
            return Err(format!("invalid {label}"));
        }
    }
    if manifest.requires_files.is_empty() || manifest.requires_files.len() > 32 {
        return Err("requires_files must contain 1..32 TeX filenames".into());
    }
    let mut names = HashSet::new();
    for name in &manifest.requires_files {
        if !is_tex_filename(name) || !names.insert(name) {
            return Err(format!("unsafe or duplicate TeX filename: {name}"));
        }
    }
    if manifest.visual_features.len() > 64 {
        return Err("too many declared visual_features".into());
    }
    let mut features = HashSet::new();
    for feature in &manifest.visual_features {
        if feature.is_empty()
            || feature.len() > 96
            || !feature
                .bytes()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || b"-_:.".contains(&c))
            || !features.insert(feature)
        {
            return Err(format!("invalid or duplicate visual feature: {feature}"));
        }
    }
    Ok(())
}

fn is_semver_triplet(version: &str) -> bool {
    let parts = version.split('.').collect::<Vec<_>>();
    parts.len() == 3
        && parts.iter().all(|part| {
            !part.is_empty()
                && (part.len() == 1 || !part.starts_with('0'))
                && part.bytes().all(|c| c.is_ascii_digit())
                && part.parse::<u64>().is_ok()
        })
}

fn is_tex_filename(file: &str) -> bool {
    file.len() <= 128
        && !file.starts_with('.')
        && !file.starts_with('-')
        && !file.contains("..")
        && file
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || b"-_.".contains(&c))
        && [".sty", ".cls", ".tex", ".def"]
            .iter()
            .any(|suffix| file.ends_with(suffix))
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID: &str = r#"
schema_version = 1
id = "org.example.geometry"
display_name = "Example geometry"
version = "0.1.0"
category = "Mathematics"
engine = "xelatex"
requires_files = ["tikz.sty"]
visual_features = []
"#;

    #[test]
    fn bundled_registry_has_unique_valid_entries() {
        let registry = Registry::new().unwrap();
        assert_eq!(registry.manifests.len(), 5);
        assert!(registry.unique_ids());
        assert!(
            registry
                .manifests
                .iter()
                .all(|item| item.visual_features.is_empty())
        );
    }

    #[test]
    fn rejects_duplicates_unsafe_paths_and_unknown_keys() {
        let mut registry = Registry::new().unwrap();
        let original = registry.manifests.len();
        assert!(
            registry
                .add(
                    "duplicate.toml",
                    include_str!("../../../extensions/core.toml")
                )
                .is_err()
        );
        assert!(
            registry
                .add(
                    "traversal.toml",
                    &VALID.replace("tikz.sty", "../secret.tex")
                )
                .is_err()
        );
        assert!(
            registry
                .add("windows.toml", &VALID.replace("tikz.sty", "C:\\secret.tex"))
                .is_err()
        );
        assert!(
            registry
                .add("unknown.toml", &format!("{VALID}\ncommand = \"rm -rf x\""))
                .is_err()
        );
        assert!(
            registry
                .add(
                    "id.toml",
                    &VALID.replace("org.example.geometry", "org..geometry")
                )
                .is_err()
        );
        assert!(
            registry
                .add("version.toml", &VALID.replace("0.1.0", "v1"))
                .is_err()
        );
        assert!(
            registry
                .add(
                    "future.toml",
                    &VALID.replace("schema_version = 1", "schema_version = 999")
                )
                .is_err()
        );
        assert_eq!(registry.manifests.len(), original);
    }

    #[test]
    fn reports_installation_independently_of_compilation_and_editing() {
        let registry = Registry::new().unwrap();
        let unknown = registry.status_with_lookup(|_| None);
        assert!(unknown.iter().all(|s| {
            s.installation == InstallationState::Unknown
                && !s.installed
                && !s.compilation_verified
                && !s.inspectable
                && !s.visual_editable
        }));
        let found = registry.status_with_lookup(|_| Some(true));
        assert!(found.iter().all(|s| s.installed));
        assert!(found.iter().all(|s| !s.compilation_verified));
        assert_eq!(
            found
                .iter()
                .find(|s| s.manifest.id == "org.tikzarium.graphdrawing-lua")
                .unwrap()
                .compilation,
            CompilationState::IncompatibleEngine
        );
        let mixed = registry.status_with_lookup(|name| Some(name != "pgfplots.sty"));
        assert_eq!(
            mixed
                .iter()
                .find(|s| s.manifest.id == "org.tikzarium.pgfplots")
                .unwrap()
                .installation,
            InstallationState::NotLocated
        );
    }

    #[test]
    fn directory_load_is_transactional() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.toml"), VALID).unwrap();
        fs::write(dir.path().join("b.toml"), "schema_version = 9").unwrap();
        let mut registry = Registry::new().unwrap();
        let original = registry.manifests.len();
        assert!(registry.load_directory(dir.path()).is_err());
        assert_eq!(registry.manifests.len(), original);
        fs::remove_file(dir.path().join("b.toml")).unwrap();
        assert_eq!(registry.load_directory(dir.path()).unwrap(), 1);
        assert_eq!(registry.manifests.len(), original + 1);
        assert!(registry.load_directory(dir.path()).is_err());
    }

    #[test]
    fn missing_directory_is_optional_and_size_limit_is_enforced() {
        let dir = tempfile::tempdir().unwrap();
        let mut registry = Registry::default();
        assert_eq!(
            registry
                .load_directory(&dir.path().join("missing"))
                .unwrap(),
            0
        );
        let oversized = "x".repeat(MAX_MANIFEST_BYTES + 1);
        fs::write(dir.path().join("oversized.toml"), oversized).unwrap();
        assert!(matches!(
            registry.load_directory(dir.path()),
            Err(RegistryError::TooLarge(_))
        ));
        assert!(registry.manifests.is_empty());
    }

    #[test]
    fn regular_file_is_not_an_optional_catalogue_directory() {
        let dir = tempfile::tempdir().unwrap();
        let not_a_dir = dir.path().join("catalogue.toml");
        fs::write(&not_a_dir, VALID).unwrap();
        let mut registry = Registry::new().unwrap();
        let original = registry.manifests.len();
        assert!(matches!(
            registry.load_directory(&not_a_dir),
            Err(RegistryError::UnsafeEntry(_))
        ));
        assert_eq!(registry.manifests.len(), original);
    }

    #[cfg(unix)]
    #[test]
    fn directory_root_symlinks_are_rejected_without_mutation() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        let real = dir.path().join("real");
        fs::create_dir(&real).unwrap();
        fs::write(real.join("a.toml"), VALID).unwrap();
        let alias = dir.path().join("alias");
        symlink(&real, &alias).unwrap();
        let dangling = dir.path().join("dangling");
        symlink(dir.path().join("does-not-exist"), &dangling).unwrap();

        let mut registry = Registry::new().unwrap();
        let original = registry.manifests.len();
        for path in [&alias, &dangling] {
            assert!(matches!(
                registry.load_directory(path),
                Err(RegistryError::UnsafeEntry(_))
            ));
            assert_eq!(registry.manifests.len(), original);
        }
        // Direct, non-symlinked access still loads the original manifest.
        assert_eq!(registry.load_directory(&real).unwrap(), 1);
        assert_eq!(registry.manifests.len(), original + 1);
    }

    #[cfg(windows)]
    #[test]
    fn windows_directory_symlink_is_rejected_if_host_allows_creation() {
        use std::os::windows::fs::symlink_dir;
        let dir = tempfile::tempdir().unwrap();
        let real = dir.path().join("real");
        fs::create_dir(&real).unwrap();
        fs::write(real.join("a.toml"), VALID).unwrap();
        let alias = dir.path().join("alias");

        match symlink_dir(&real, &alias) {
            Ok(()) => {}
            Err(error) if error.kind() == ErrorKind::PermissionDenied => {
                eprintln!("SKIP: Windows host lacks symlink creation privilege");
                return;
            }
            Err(error) => panic!("unexpected symlink setup failure: {error}"),
        }

        let mut registry = Registry::new().unwrap();
        let original = registry.manifests.len();
        assert!(matches!(
            registry.load_directory(&alias),
            Err(RegistryError::UnsafeEntry(_))
        ));
        assert_eq!(registry.manifests.len(), original);
        assert_eq!(registry.load_directory(&real).unwrap(), 1);
    }

    #[cfg(unix)]
    #[test]
    fn directory_does_not_follow_symlinked_manifest() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        let outside = tempfile::NamedTempFile::new().unwrap();
        fs::write(outside.path(), VALID).unwrap();
        symlink(outside.path(), dir.path().join("link.toml")).unwrap();
        let mut registry = Registry::default();
        assert!(matches!(
            registry.load_directory(dir.path()),
            Err(RegistryError::UnsafeEntry(_))
        ));
    }

    #[test]
    fn known_missing_beats_indeterminate_and_option_name_is_unsafe() {
        let registry = Registry::new().unwrap();
        let statuses = registry.status_with_lookup(|name| {
            if name == "tikz.sty" {
                Some(false)
            } else {
                None
            }
        });
        let core = statuses
            .iter()
            .find(|s| s.manifest.id == "org.tikzarium.core")
            .unwrap();
        assert_eq!(core.installation, InstallationState::NotLocated);
        assert_eq!(core.missing_files, vec!["tikz.sty".to_owned()]);
        let mut empty = Registry::default();
        assert!(
            empty
                .add("option.toml", &VALID.replace("tikz.sty", "-help.sty"))
                .is_err()
        );
    }
}
