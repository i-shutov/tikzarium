//! Declarative extensions: TeX packages are NOT executable native plugins.
//! Package presence, successful XeLaTeX build and safe visual edit are distinct.
use serde::Deserialize;
use std::{collections::HashSet, fs, path::Path};
use thiserror::Error;
use tikzarium_core::TexEnvironment;

#[derive(Debug, Clone, Deserialize)]
pub struct ExtensionManifest {
    pub id: String,
    pub display_name: String,
    pub version: String,
    pub category: String,
    #[serde(default)]
    pub requires_files: Vec<String>,
    #[serde(default)]
    pub visual_features: Vec<String>,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Clone)]
pub struct ExtensionStatus {
    pub manifest: ExtensionManifest,
    pub installed: bool,
    pub missing_files: Vec<String>,
    /// Discovery is not a successful compilation test.
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
    #[error("Duplicate extension id: {0}")]
    DuplicateId(String),
    #[error("Invalid extension identifier: {0}")]
    InvalidId(String),
}

#[derive(Default, Debug)]
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
        ] {
            registry.add(path, source)?;
        }
        Ok(registry)
    }

    pub fn add(&mut self, path: &str, source: &str) -> Result<(), RegistryError> {
        let item: ExtensionManifest =
            toml::from_str(source).map_err(|source| RegistryError::Toml {
                path: path.into(),
                source,
            })?;
        if item.id.is_empty()
            || !item
                .id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || ".-_".contains(c))
        {
            return Err(RegistryError::InvalidId(item.id));
        }
        if self.manifests.iter().any(|known| known.id == item.id) {
            return Err(RegistryError::DuplicateId(item.id));
        }
        self.manifests.push(item);
        Ok(())
    }

    pub fn load_directory(&mut self, dir: &Path) -> Result<usize, RegistryError> {
        if !dir.exists() {
            return Ok(0);
        }
        let mut paths = fs::read_dir(dir)?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| path.extension().is_some_and(|ext| ext == "toml"))
            .collect::<Vec<_>>();
        paths.sort();
        let mut count = 0;
        for path in paths {
            let source = fs::read_to_string(&path)?;
            self.add(&path.display().to_string(), &source)?;
            count += 1;
        }
        Ok(count)
    }

    #[must_use]
    pub fn status(&self, tex: &TexEnvironment) -> Vec<ExtensionStatus> {
        self.manifests
            .iter()
            .cloned()
            .map(|manifest| {
                let missing_files = manifest
                    .requires_files
                    .iter()
                    .filter(|name| tex.package_file(name).is_none())
                    .cloned()
                    .collect::<Vec<_>>();
                ExtensionStatus {
                    installed: missing_files.is_empty(),
                    manifest,
                    missing_files,
                    compilation_verified: false,
                }
            })
            .collect()
    }

    #[must_use]
    pub fn unique_ids(&self) -> bool {
        let mut ids = HashSet::new();
        self.manifests.iter().all(|item| ids.insert(&item.id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn baseline_registry_has_distinct_ids() {
        let r = Registry::new().unwrap();
        assert!(r.unique_ids());
        assert_eq!(r.manifests.len(), 4);
        assert!(r.manifests.iter().all(|e| e.visual_features.is_empty()));
    }
    #[test]
    fn malformed_and_duplicate_manifests_are_rejected() {
        let mut r = Registry::new().unwrap();
        assert!(r.add("bad.toml", "id = 17").is_err());
        assert!(
            r.add("copy.toml", include_str!("../../../extensions/core.toml"))
                .is_err()
        );
    }
}
