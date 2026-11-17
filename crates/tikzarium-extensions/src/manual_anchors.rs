//! Статический реестр прямых точек оригинальных PDF-мануалов PGF/TikZ и пакетов расширений.
//! Не перераспределяет массивные PDF в репозитории (AGENTS.md п.5): хранит компактный TOML-индекс
//! страниц, NamedDest и нормализованных координат [0..1] для локального `kpsewhich`.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use thiserror::Error;

pub const MANUAL_ANCHOR_SCHEMA_VERSION: u32 = 1;
const MAX_SEARCH_QUERY_BYTES: usize = 256;

#[derive(Debug, Error)]
pub enum ManualAnchorError {
    #[error("Invalid manual anchor schema version: {0}")]
    UnsupportedSchema(u32),
    #[error("Invalid manual anchor entry: {0}")]
    InvalidEntry(String),
    #[error("TOML parse error: {0}")]
    Toml(#[from] toml::de::Error),
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ManualDocumentSpec {
    pub id: String,
    pub filename: String,
    pub texdoc_key: String,
    pub version: String,
    pub total_pages: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ManualAnchorSpec {
    pub id: String,
    pub doc_id: String,
    pub section: String,
    pub page: u32,
    pub named_dest: String,
    pub bbox: [f32; 4],
    pub title_ru: String,
    pub declaration: String,
    pub matched_tokens: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ManualAnchorCatalog {
    pub schema_version: u32,
    pub documents: Vec<ManualDocumentSpec>,
    pub anchors: Vec<ManualAnchorSpec>,
}

impl ManualAnchorCatalog {
    pub fn bundled() -> Result<Self, ManualAnchorError> {
        let raw = include_str!("../../../extensions/manuals/manual-anchors-v1.toml");
        Self::from_toml_str(raw)
    }

    pub fn from_toml_str(raw: &str) -> Result<Self, ManualAnchorError> {
        let catalog: Self = toml::from_str(raw)?;
        catalog.validate()?;
        Ok(catalog)
    }

    fn validate(&self) -> Result<(), ManualAnchorError> {
        if self.schema_version != MANUAL_ANCHOR_SCHEMA_VERSION {
            return Err(ManualAnchorError::UnsupportedSchema(self.schema_version));
        }
        let mut doc_ids = HashSet::new();
        for doc in &self.documents {
            if doc.id.trim().is_empty() || !doc.filename.ends_with(".pdf") || doc.total_pages == 0 {
                return Err(ManualAnchorError::InvalidEntry(doc.id.clone()));
            }
            if !doc_ids.insert(doc.id.as_str()) {
                return Err(ManualAnchorError::InvalidEntry(doc.id.clone()));
            }
        }
        let mut anchor_ids = HashSet::new();
        for anchor in &self.anchors {
            let [x0, y0, x1, y1] = anchor.bbox;
            let valid_bbox = x0 >= 0.0 && y0 >= 0.0 && x1 <= 1.0 && y1 <= 1.0 && x0 < x1 && y0 < y1;
            if anchor.id.trim().is_empty()
                || !doc_ids.contains(anchor.doc_id.as_str())
                || anchor.page == 0
                || !valid_bbox
                || !anchor_ids.insert(anchor.id.as_str())
            {
                return Err(ManualAnchorError::InvalidEntry(anchor.id.clone()));
            }
        }
        Ok(())
    }

    #[must_use]
    pub fn document(&self, id: &str) -> Option<&ManualDocumentSpec> {
        self.documents.iter().find(|doc| doc.id == id)
    }

    #[must_use]
    pub fn anchor(&self, id: &str) -> Option<&ManualAnchorSpec> {
        self.anchors.iter().find(|item| item.id == id)
    }

    #[must_use]
    pub fn resolve_token(&self, token: &str) -> Option<&ManualAnchorSpec> {
        let trimmed = token.trim();
        if trimmed.is_empty() || trimmed.len() > MAX_SEARCH_QUERY_BYTES {
            return None;
        }
        let plain = trimmed.trim_start_matches('\\');
        self.anchors.iter().find(|item| {
            item.matched_tokens
                .iter()
                .any(|cand| cand == trimmed || cand.trim_start_matches('\\') == plain)
        })
    }

    #[must_use]
    pub fn search(&self, query: &str, doc_filter: Option<&str>) -> Vec<&ManualAnchorSpec> {
        let needle = query.trim().to_lowercase();
        if needle.len() > MAX_SEARCH_QUERY_BYTES {
            return Vec::new();
        }
        self.anchors
            .iter()
            .filter(|item| {
                doc_filter.is_none_or(|target| item.doc_id == target)
                    && (needle.is_empty()
                        || item.id.to_lowercase().contains(&needle)
                        || item.section.to_lowercase().contains(&needle)
                        || item.title_ru.to_lowercase().contains(&needle)
                        || item.declaration.to_lowercase().contains(&needle)
                        || item
                            .matched_tokens
                            .iter()
                            .any(|tok| tok.to_lowercase().contains(&needle)))
            })
            .collect()
    }
}

/// Lossless byte-exact split at literal `\begin{document}` line boundary.
/// Concatenating `(preamble, body)` always yields exact original UTF-8 & CRLF bytes.
#[must_use]
pub fn split_atomic_preamble(source: &str) -> (&str, &str) {
    let mut offset = 0usize;
    for raw in source.split_inclusive('\n') {
        let trimmed = raw.trim_end_matches(['\r', '\n']).trim();
        if trimmed == "\\begin{document}" {
            return (&source[..offset], &source[offset..]);
        }
        offset += raw.len();
    }
    ("", source)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bundled_manual_anchors_cover_core_and_extension_pdfs() {
        let catalog = ManualAnchorCatalog::bundled().unwrap();
        assert!(catalog.documents.len() >= 11);
        assert!(catalog.anchors.len() >= 20);
        let addplot = catalog.resolve_token("\\addplot").unwrap();
        assert_eq!(addplot.doc_id, "pgfplots");
        let stealth = catalog.resolve_token("Stealth").unwrap();
        assert_eq!(stealth.doc_id, "pgfmanual");
        assert!(catalog.search(&"x".repeat(300), None).is_empty());
    }

    #[test]
    fn atomic_preamble_split_is_byte_exact_for_crlf_and_cyrillic() {
        let src = "% русский комментарий\r\n\\documentclass{standalone}\r\n\\usepackage{tikz}\r\n\\begin{document}\r\n\\myMacro{Кириллица}\r\n\\end{document}\r\n";
        let (preamble, body) = split_atomic_preamble(src);
        assert!(preamble.ends_with("\\usepackage{tikz}\r\n"));
        assert!(body.starts_with("\\begin{document}\r\n"));
        assert_eq!(format!("{preamble}{body}"), src);
    }
}
