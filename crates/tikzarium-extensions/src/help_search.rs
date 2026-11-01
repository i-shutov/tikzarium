//! Read-only offline search over the SAME versioned C catalogue used by egui.
//! No TeX process, package lookup, geometry interpretation or network access.

use crate::primitives::{Catalog, LibrarySpec, ParameterSpec, Requirements, ToolSpec};

#[derive(Debug, Clone, Copy)]
pub enum HelpEntry<'a> {
    Tool(&'a ToolSpec),
    Parameter(&'a ToolSpec, &'a ParameterSpec),
    Library(&'a LibrarySpec),
}

impl<'a> HelpEntry<'a> {
    #[must_use]
    pub fn id(self) -> String {
        match self {
            Self::Tool(tool) => tool.id.clone(),
            Self::Parameter(tool, parameter) => format!("{}:{}", tool.id, parameter.id),
            Self::Library(library) => library.id.clone(),
        }
    }

    #[must_use]
    pub fn title(self) -> &'a str {
        match self {
            Self::Tool(tool) => &tool.title_ru,
            Self::Parameter(_, parameter) => &parameter.help_ru,
            Self::Library(library) => &library.title_ru,
        }
    }

    #[must_use]
    pub fn syntax(self) -> &'a str {
        match self {
            Self::Tool(tool) => &tool.syntax,
            Self::Parameter(_, parameter) => &parameter.syntax,
            Self::Library(library) => &library.syntax,
        }
    }

    #[must_use]
    pub fn example(self) -> &'a str {
        match self {
            Self::Tool(tool) => &tool.example,
            Self::Parameter(_, parameter) => &parameter.example,
            Self::Library(library) => &library.example,
        }
    }

    #[must_use]
    pub fn warning(self) -> &'a str {
        match self {
            Self::Tool(tool) => &tool.warning_ru,
            Self::Parameter(_, parameter) => &parameter.warning_ru,
            Self::Library(library) => &library.warning_ru,
        }
    }

    #[must_use]
    pub fn interaction(self) -> &'a str {
        match self {
            Self::Tool(tool) => &tool.interaction_ru,
            Self::Parameter(_, parameter) => &parameter.interaction_ru,
            Self::Library(library) => &library.interaction_ru,
        }
    }

    #[must_use]
    pub fn requirements(self) -> &'a Requirements {
        match self {
            Self::Tool(tool) | Self::Parameter(tool, _) => &tool.requirements,
            Self::Library(library) => &library.requirements,
        }
    }

    #[must_use]
    pub fn manual(self) -> (&'a str, &'a str) {
        match self {
            Self::Tool(tool) => (&tool.manual_section, &tool.manual_url),
            Self::Parameter(_, parameter) => {
                (&parameter.manual_section, &parameter.manual_url)
            }
            Self::Library(library) => (&library.manual_section, &library.manual_url),
        }
    }

    fn matches(self, needle: &str) -> bool {
        let id = self.id();
        let requirements = self.requirements();
        let base = [
            id.as_str(),
            self.title(),
            self.syntax(),
            self.example(),
            self.warning(),
            self.interaction(),
            self.manual().0,
            self.manual().1,
            requirements.documented_against.as_str(),
        ];
        base.iter().any(|part| part.to_lowercase().contains(needle))
            || requirements
                .libraries
                .iter()
                .chain(requirements.packages.iter())
                .any(|name| name.to_lowercase().contains(needle))
    }
}

/// A deterministic view of all six core tools, their parameters and four
/// documented library entries. No duplicate schema and no runtime discovery.
#[must_use]
pub fn entries(catalog: &Catalog) -> Vec<HelpEntry<'_>> {
    let mut result = Vec::new();
    for tool in &catalog.tools {
        result.push(HelpEntry::Tool(tool));
        for parameter in &tool.parameter {
            result.push(HelpEntry::Parameter(tool, parameter));
        }
    }
    for library in &catalog.libraries {
        result.push(HelpEntry::Library(library));
    }
    result
}

#[must_use]
pub fn exact<'a>(catalog: &'a Catalog, id: &str) -> Option<HelpEntry<'a>> {
    let id = id.trim();
    entries(catalog).into_iter().find(|entry| entry.id() == id)
}

/// Unicode lowercase search is deliberately simple and entirely offline.
/// Query length is bounded; no regex, TeX execution, or source mutation.
#[must_use]
pub fn search<'a>(catalog: &'a Catalog, query: &str) -> Vec<HelpEntry<'a>> {
    let needle = query.trim().to_lowercase();
    if needle.len() > 256 {
        return Vec::new();
    }
    entries(catalog)
        .into_iter()
        .filter(|entry| needle.is_empty() || entry.matches(&needle))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_source_of_truth_exposes_every_tool_parameter_and_library() {
        let catalog = Catalog::bundled().unwrap();
        let expected = catalog.tools.len()
            + catalog.tools.iter().map(|tool| tool.parameter.len()).sum::<usize>()
            + catalog.libraries.len();
        let items = entries(&catalog);
        assert_eq!(items.len(), expected);
        assert_eq!(catalog.tools.len(), 6);
        assert_eq!(catalog.libraries.len(), 4);
        let ids = items.iter().map(|entry| entry.id()).collect::<std::collections::HashSet<_>>();
        assert_eq!(ids.len(), items.len());
        assert!(ids.contains("tikz.arrow:tip"));
        assert!(ids.contains("tikz.library.arrows-meta"));
    }

    #[test]
    fn russian_unicode_and_parameter_search_use_the_shared_catalogue() {
        let catalog = Catalog::bundled().unwrap();
        assert!(search(&catalog, "ОКРУЖНОСТЬ")
            .iter()
            .any(|entry| entry.id() == "tikz.circle"));
        assert_eq!(exact(&catalog, "tikz.arrow:tip").unwrap().id(), "tikz.arrow:tip");
        assert!(search(&catalog, "positioning")
            .iter()
            .any(|entry| entry.id() == "tikz.library.positioning"));
        assert!(exact(&catalog, "tikz.not-a-tool").is_none());
    }

    #[test]
    fn help_does_not_claim_an_unknown_default_or_minimum_version() {
        let catalog = Catalog::bundled().unwrap();
        for entry in entries(&catalog) {
            let (section, url) = entry.manual();
            assert!(!section.trim().is_empty());
            assert!(url.starts_with("https://tikz.dev/"));
            assert_eq!(entry.requirements().pgf_version_min, "UNKNOWN");
            if let HelpEntry::Parameter(_, parameter) = entry {
                assert!(parameter.default_provenance == "editor_preset"
                    || parameter.default_provenance == "UNKNOWN");
            }
        }
    }

    #[test]
    fn oversize_query_fails_closed_without_processing_source() {
        let catalog = Catalog::bundled().unwrap();
        assert!(search(&catalog, &"a".repeat(257)).is_empty());
    }
}
