//! Strict, non-authoritative per-environment XeLaTeX fixture observations.
//! TOML records are not signed attestations and never enable visual adapters.

use crate::{EngineRequirement, ExtensionManifest};
use serde::Deserialize;
use thiserror::Error;

pub const EVIDENCE_SCHEMA_VERSION: u32 = 1;
const MAX_BYTES: usize = 16 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FixtureVerdict {
    RenderedPdf,
    ExpectedEngineError,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RunnerKind {
    HostedCi,
    LocalUnattested,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FixtureObservation {
    pub schema_version: u32,
    pub fixture_id: String,
    pub manifest_id: String,
    pub tested_engine: EngineRequirement,
    pub host_os: String,
    pub host_arch: String,
    pub host_release: String,
    pub runner_kind: RunnerKind,
    pub tex_version: String,
    pub source_sha256: String,
    pub log_sha256: String,
    pub tex_log_sha256: Option<String>,
    pub exit_code: i32,
    pub verdict: FixtureVerdict,
    pub source_preserved: bool,
    pub elapsed_ms: u64,
    pub pdf_sha256: Option<String>,
    pub pages: Option<u32>,
}

#[derive(Debug, Error)]
pub enum EvidenceError {
    #[error("evidence TOML exceeds 16 KiB")]
    TooLarge,
    #[error("cannot parse evidence TOML: {0}")]
    Toml(#[from] toml::de::Error),
    #[error("invalid evidence: {0}")]
    Invalid(String),
}

impl FixtureObservation {
    /// Validate structure, not authenticity. Does not mutate any registry status.
    pub fn parse(source: &str) -> Result<Self, EvidenceError> {
        if source.len() > MAX_BYTES {
            return Err(EvidenceError::TooLarge);
        }
        let record: Self = toml::from_str(source)?;
        record.validate().map_err(EvidenceError::Invalid)?;
        Ok(record)
    }

    #[must_use]
    pub fn matches_manifest(&self, manifest: &ExtensionManifest) -> bool {
        self.manifest_id == manifest.id
            && match self.fixture_id.as_str() {
                "graphdrawing-lua" => manifest.engine == EngineRequirement::Lualatex,
                "core" | "pgfplots" | "circuitikz" | "tikz-cd" => {
                    manifest.engine == EngineRequirement::Xelatex
                }
                _ => false,
            }
    }

    fn validate(&self) -> Result<(), String> {
        if self.schema_version != EVIDENCE_SCHEMA_VERSION {
            return Err("unsupported evidence schema version".into());
        }
        let manifest = match self.fixture_id.as_str() {
            "core" => "org.tikzarium.core",
            "pgfplots" => "org.tikzarium.pgfplots",
            "circuitikz" => "org.tikzarium.circuitikz",
            "tikz-cd" => "org.tikzarium.tikz-cd",
            "graphdrawing-lua" => "org.tikzarium.graphdrawing-lua",
            _ => return Err("unrecognized fixture".into()),
        };
        if self.manifest_id != manifest {
            return Err("fixture/manifest mismatch".into());
        }
        if self.tested_engine != EngineRequirement::Xelatex {
            return Err("fixture observation must use XeLaTeX".into());
        }
        for (name, value, max) in [
            ("host_os", self.host_os.as_str(), 64),
            ("host_arch", self.host_arch.as_str(), 64),
            ("host_release", self.host_release.as_str(), 192),
            ("tex_version", self.tex_version.as_str(), 256),
        ] {
            if value.is_empty() || value.len() > max || value.chars().any(char::is_control) {
                return Err(format!("invalid {name}"));
            }
        }
        if !["Windows", "Darwin", "Linux"].contains(&self.host_os.as_str()) {
            return Err("unsupported host OS".into());
        }
        if !sha256(&self.source_sha256) || !sha256(&self.log_sha256) {
            return Err("invalid source/console hash".into());
        }
        if self
            .tex_log_sha256
            .as_ref()
            .is_some_and(|hash| !sha256(hash))
            || self.pdf_sha256.as_ref().is_some_and(|hash| !sha256(hash))
        {
            return Err("invalid TeX log/PDF hash".into());
        }
        if self.elapsed_ms > 3_600_000 {
            return Err("implausible duration".into());
        }
        match self.verdict {
            FixtureVerdict::RenderedPdf => {
                if self.fixture_id == "graphdrawing-lua"
                    || self.exit_code != 0
                    || !self.source_preserved
                    || self.pages != Some(1)
                    || self.pdf_sha256.is_none()
                    || self.tex_log_sha256.is_none()
                {
                    return Err("contradictory rendered_pdf record".into());
                }
            }
            FixtureVerdict::ExpectedEngineError => {
                if self.fixture_id != "graphdrawing-lua"
                    || self.exit_code == 0
                    || !self.source_preserved
                    || self.pages.is_some()
                    || self.pdf_sha256.is_some()
                    || self.tex_log_sha256.is_none()
                {
                    return Err("contradictory expected_engine_error record".into());
                }
            }
            FixtureVerdict::Failed => {} // A failed run is never a PASS.
        }
        Ok(())
    }
}

fn sha256(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid() -> String {
        format!(
            r#"schema_version = 1
fixture_id = "core"
manifest_id = "org.tikzarium.core"
tested_engine = "xelatex"
host_os = "Linux"
host_arch = "x86_64"
host_release = "6.12"
runner_kind = "local_unattested"
tex_version = "XeTeX 3.14"
source_sha256 = "{}"
log_sha256 = "{}"
tex_log_sha256 = "{}"
exit_code = 0
verdict = "rendered_pdf"
source_preserved = true
elapsed_ms = 200
pdf_sha256 = "{}"
pages = 1
"#,
            "a".repeat(64),
            "b".repeat(64),
            "c".repeat(64),
            "d".repeat(64)
        )
    }

    #[test]
    fn fixture_record_never_enables_visual_editing() {
        let item = FixtureObservation::parse(&valid()).unwrap();
        let registry = crate::Registry::new().unwrap();
        let manifest = registry
            .manifests
            .iter()
            .find(|m| m.id == "org.tikzarium.core")
            .unwrap();
        assert!(item.matches_manifest(manifest));
        assert_eq!(item.verdict, FixtureVerdict::RenderedPdf);
        assert!(
            registry
                .status_with_lookup(|_| Some(true))
                .iter()
                .all(|status| !status.compilation_verified && !status.visual_editable)
        );
    }

    #[test]
    fn rejects_inconsistent_records() {
        let good = valid();
        for wrong in [
            good.replace("pages = 1", "pages = 2"),
            good.replace("exit_code = 0", "exit_code = 1"),
            good.replace("source_preserved = true", "source_preserved = false"),
            good.replace("tested_engine = \"xelatex\"", "tested_engine = \"lualatex\""),
            good.replace("manifest_id = \"org.tikzarium.core\"", "manifest_id = \"org.other\""),
            good.replace("schema_version = 1", "schema_version = 2"),
            format!("{good}\ncommand = 'evil'"),
        ] {
            assert!(FixtureObservation::parse(&wrong).is_err());
        }
        assert!(matches!(
            FixtureObservation::parse(&"z".repeat(MAX_BYTES + 1)),
            Err(EvidenceError::TooLarge)
        ));
    }

    #[test]
    fn lua_negative_cannot_claim_rendered_pdf() {
        let negative = valid()
            .replace("fixture_id = \"core\"", "fixture_id = \"graphdrawing-lua\"")
            .replace("manifest_id = \"org.tikzarium.core\"", "manifest_id = \"org.tikzarium.graphdrawing-lua\"")
            .replace("verdict = \"rendered_pdf\"", "verdict = \"expected_engine_error\"")
            .replace("exit_code = 0", "exit_code = 1")
            .replace("pages = 1\n", "")
            .replace(&format!("pdf_sha256 = \"{}\"\n", "d".repeat(64)), "");
        let item = FixtureObservation::parse(&negative).unwrap();
        assert_eq!(item.verdict, FixtureVerdict::ExpectedEngineError);
        assert!(FixtureObservation::parse(&negative.replace("exit_code = 1", "exit_code = 0")).is_err());
    }
}
