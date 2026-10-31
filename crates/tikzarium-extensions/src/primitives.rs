//! Six source-first TikZ generators. No CAD scene, TeX parser, or executable plugin.
use serde::Deserialize;
use std::{
    collections::{BTreeMap, HashSet},
    ops::Range,
};
use thiserror::Error;
pub const SCHEMA_VERSION: u32 = 1;
const IDS: [&str; 6] = [
    "tikz.line",
    "tikz.arrow",
    "tikz.rectangle",
    "tikz.circle",
    "tikz.node",
    "tikz.bezier-cubic",
];

#[derive(Debug, Error)]
pub enum PrimitiveError {
    #[error("Invalid primitive catalogue: {0}")]
    Catalog(String),
    #[error("Invalid TOML: {0}")]
    Toml(#[from] toml::de::Error),
    #[error("Unknown tool: {0}")]
    UnknownTool(String),
    #[error("Unknown parameter: {0}")]
    UnknownParameter(String),
    #[error("Missing parameter: {0}")]
    MissingParameter(String),
    #[error("Invalid literal {parameter}: {reason}")]
    Literal { parameter: String, reason: String },
    #[error("Stale, invalid or conflicting source range")]
    SourceConflict,
}
fn invalid(s: &str) -> PrimitiveError {
    PrimitiveError::Catalog(s.to_owned())
}
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Catalog {
    pub schema_version: u32,
    pub id: String,
    pub tools: Vec<ToolSpec>,
}
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ToolSpec {
    pub id: String,
    pub title_ru: String,
    pub syntax: String,
    pub help_ru: String,
    pub example: String,
    pub warning_ru: String,
    pub interaction_ru: String,
    pub manual_section: String,
    pub manual_url: String,
    pub requirements: Requirements,
    pub parameter: Vec<ParameterSpec>,
}
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Requirements {
    pub packages: Vec<String>,
    pub libraries: Vec<String>,
    pub engine: String,
    pub pgf_version_min: String,
    pub documented_against: String,
}
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ParameterSpec {
    pub id: String,
    pub syntax: String,
    pub kind: String,
    pub units: Vec<String>,
    pub allowed_values: Vec<String>,
    pub positive: bool,
    pub max_abs: f64,
    pub default: String,
    pub default_provenance: String,
    pub help_ru: String,
    pub example: String,
    pub warning_ru: String,
    pub interaction_ru: String,
    pub manual_section: String,
    pub manual_url: String,
    pub requirements_inherit: String,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GeneratedCommand {
    pub tool_id: String,
    pub source: String,
    pub usepackage: Vec<String>,
    pub usetikzlibrary: Vec<String>,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Evidence {
    Confirmed,
    Absent,
    Unknown,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Capabilities {
    pub installed: Evidence,
    pub project_loaded: Evidence,
    pub engine_compatible: Evidence,
    pub tool_implemented: Evidence,
    pub help_available: Evidence,
    pub visual_editable: bool,
}
impl Catalog {
    pub fn bundled() -> Result<Self, PrimitiveError> {
        let c: Self = toml::from_str(include_str!(
            "../../../extensions/primitives/catalog-v1.toml"
        ))?;
        c.validate()?;
        Ok(c)
    }
    pub fn tool(&self, id: &str) -> Option<&ToolSpec> {
        self.tools.iter().find(|t| t.id == id)
    }
    /// Installation status and project-loaded status are independent observations.
    pub fn capabilities(
        &self,
        id: &str,
        installed: Evidence,
        project_loaded: Evidence,
        engine: Option<&str>,
    ) -> Result<Capabilities, PrimitiveError> {
        let t = self
            .tool(id)
            .ok_or_else(|| PrimitiveError::UnknownTool(id.to_owned()))?;
        Ok(Capabilities {
            installed,
            project_loaded,
            engine_compatible: match engine {
                None => Evidence::Unknown,
                Some(e) if e.eq_ignore_ascii_case(&t.requirements.engine) => Evidence::Confirmed,
                Some(_) => Evidence::Absent,
            },
            tool_implemented: Evidence::Confirmed,
            help_available: Evidence::Confirmed,
            visual_editable: false,
        })
    }
    /// Only inspector literal values are constrained. Raw TeX elsewhere is untouched.
    pub fn generate(
        &self,
        id: &str,
        values: &BTreeMap<String, String>,
    ) -> Result<GeneratedCommand, PrimitiveError> {
        let t = self
            .tool(id)
            .ok_or_else(|| PrimitiveError::UnknownTool(id.to_owned()))?;
        for key in values.keys() {
            if !t.parameter.iter().any(|p| &p.id == key) {
                return Err(PrimitiveError::UnknownParameter(key.clone()));
            }
        }
        let mut effective = BTreeMap::new();
        for p in &t.parameter {
            let v = match values.get(&p.id) {
                Some(v) => v.as_str(),
                None if p.default != "UNKNOWN" => &p.default,
                None => return Err(PrimitiveError::MissingParameter(p.id.clone())),
            };
            validate_literal(p, v)?;
            effective.insert(p.id.as_str(), v.to_owned());
        }
        let mut replacements = BTreeMap::new();
        for p in &t.parameter {
            let v = &effective[p.id.as_str()];
            let rendered = if p.kind == "node_content" {
                match effective.get("mode").map(String::as_str) {
                    Some("text") => escape_text(v),
                    Some("math") => format!("{}{}{}", '\u{24}', v, '\u{24}'),
                    _ => {
                        return Err(PrimitiveError::Literal {
                            parameter: "mode".into(),
                            reason: "expected text or math".into(),
                        });
                    }
                }
            } else {
                v.clone()
            };
            replacements.insert(p.id.as_str(), rendered);
        }
        let source = substitute(&t.syntax, &replacements)?;
        Ok(GeneratedCommand {
            tool_id: t.id.clone(),
            source,
            usepackage: t.requirements.packages.clone(),
            usetikzlibrary: t.requirements.libraries.clone(),
        })
    }
    pub fn fixture_document(&self) -> Result<String, PrimitiveError> {
        let mut s = String::from(
            "\\documentclass{article}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta}\n\\pagestyle{empty}\n\\begin{document}\n\\begin{tikzpicture}\n",
        );
        for t in &self.tools {
            s.push_str(&self.generate(&t.id, &BTreeMap::new())?.source);
            s.push('\n');
        }
        s.push_str("\\end{tikzpicture}\n\\end{document}\n");
        Ok(s)
    }
    /// Separated visual QA: all commands come from the same six source generators.
    pub fn gallery_document(&self) -> Result<String, PrimitiveError> {
        let mut s = String::from(
            "\\documentclass{article}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta}\n\\pagestyle{empty}\n\\begin{document}\n\\noindent\\begin{tikzpicture}\n",
        );
        let captions = ["Line", "Arrow", "Rectangle", "Circle", "Node", "Bezier"];
        for (i, (tool, caption)) in self.tools.iter().zip(captions).enumerate() {
            let x = (i % 3) * 4;
            let y = if i < 3 { 0 } else { -4 };
            s.push_str(&format!("\\begin{{scope}}[shift={{({x}cm,{y}cm)}}]\n"));
            s.push_str("\\draw[gray!30] (-0.25cm,-0.25cm) rectangle (3.5cm,3cm);\n");
            s.push_str(&format!(
                "\\node[anchor=west] at (0cm,2.65cm) {{\\small {caption}}};\n"
            ));
            s.push_str(&self.generate(&tool.id, &BTreeMap::new())?.source);
            s.push_str("\n\\end{scope}\n");
        }
        s.push_str("\\end{tikzpicture}\n\\end{document}\n");
        Ok(s)
    }
    fn validate(&self) -> Result<(), PrimitiveError> {
        if self.schema_version != SCHEMA_VERSION
            || self.id != "org.tikzarium.primitives"
            || self.tools.len() != IDS.len()
        {
            return Err(invalid("unsupported schema or tool count"));
        }
        let mut ids = HashSet::new();
        for t in &self.tools {
            if !IDS.contains(&t.id.as_str()) || !ids.insert(t.id.as_str()) {
                return Err(invalid("duplicate or unsupported id"));
            }
            if [
                t.title_ru.as_str(),
                &t.help_ru,
                &t.example,
                &t.warning_ru,
                &t.interaction_ru,
                &t.manual_section,
            ]
            .iter()
            .any(|s| s.trim().is_empty())
                || !t.manual_url.starts_with("https://tikz.dev/")
                || t.parameter.is_empty()
            {
                return Err(invalid("incomplete tool help"));
            }
            if t.requirements.packages.join(",") != "tikz"
                || t.requirements.engine != "xelatex"
                || t.requirements.pgf_version_min != "UNKNOWN"
                || t.requirements.documented_against != "3.1.12"
                || t.requirements.libraries.iter().any(|s| s != "arrows.meta")
                || (t.id == "tikz.arrow" && t.requirements.libraries.join(",") != "arrows.meta")
                || (t.id != "tikz.arrow" && !t.requirements.libraries.is_empty())
            {
                return Err(invalid("invalid declared requirements"));
            }
            if t.syntax.len() > 1024
                || !(t.syntax.starts_with("\\draw ")
                    || t.syntax.starts_with("\\draw[")
                    || t.syntax.starts_with("\\node "))
                || !t.syntax.ends_with(';')
            {
                return Err(invalid("invalid syntax template"));
            }
            let mut seen = HashSet::new();
            for p in &t.parameter {
                if p.id.is_empty()
                    || !p
                        .id
                        .bytes()
                        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
                    || !seen.insert(p.id.as_str())
                    || [
                        p.syntax.as_str(),
                        &p.help_ru,
                        &p.example,
                        &p.warning_ru,
                        &p.interaction_ru,
                        &p.manual_section,
                    ]
                    .iter()
                    .any(|s| s.trim().is_empty())
                    || !p.manual_url.starts_with("https://tikz.dev/")
                    || p.requirements_inherit != "tool"
                    || !(p.default_provenance == "editor_preset"
                        || p.default_provenance == "UNKNOWN")
                    || (p.default == "UNKNOWN") != (p.default_provenance == "UNKNOWN")
                {
                    return Err(invalid("incomplete parameter help"));
                }
                match p.kind.as_str() {
                    "dimension"
                        if p.units.join(",") == "pt,mm,cm,in" && p.allowed_values.is_empty() => {}
                    "choice" if p.units.is_empty() && !p.allowed_values.is_empty() => {}
                    "node_content" if p.units.is_empty() && p.allowed_values.is_empty() => {}
                    _ => return Err(invalid("unsupported type or units")),
                }
                if p.kind == "dimension"
                    && (!p.max_abs.is_finite() || p.max_abs <= 0.0 || p.max_abs > 10000.0)
                {
                    return Err(invalid("invalid declared magnitude limit"));
                }
                if p.default != "UNKNOWN" {
                    validate_literal(p, &p.default)?;
                }
            }
            if self.generate(&t.id, &BTreeMap::new())?.source != t.example {
                return Err(invalid("example mismatches executable schema"));
            }
        }
        Ok(())
    }
}
fn validate_literal(p: &ParameterSpec, v: &str) -> Result<(), PrimitiveError> {
    let bad = |reason: &str| PrimitiveError::Literal {
        parameter: p.id.clone(),
        reason: reason.to_owned(),
    };
    if v.len() > 2048 || v.chars().any(|c| c.is_control()) {
        return Err(bad("too long or contains control characters"));
    }
    match p.kind.as_str() {
        "dimension" => {
            let unit = p
                .units
                .iter()
                .find(|u| v.ends_with(u.as_str()))
                .ok_or_else(|| bad("explicit pt/mm/cm/in required"))?;
            let raw = v
                .strip_suffix(unit.as_str())
                .ok_or_else(|| bad("invalid unit"))?;
            let digits = raw.strip_prefix('-').unwrap_or(raw);
            if digits.is_empty()
                || !digits.bytes().all(|b| b.is_ascii_digit() || b == b'.')
                || digits.bytes().filter(|b| *b == b'.').count() > 1
                || !digits.bytes().any(|b| b.is_ascii_digit())
            {
                return Err(bad("expected literal decimal, not TeX expression"));
            }
            let n: f64 = raw.parse().map_err(|_| bad("invalid number"))?;
            if !n.is_finite() || n.abs() > p.max_abs || (p.positive && n <= 0.0) {
                return Err(bad("invalid magnitude/radius"));
            }
        }
        "choice" if p.allowed_values.iter().any(|s| s == v) => {}
        "node_content" => {}
        "choice" => return Err(bad("outside enumerated choices")),
        _ => return Err(bad("unknown kind")),
    }
    Ok(())
}
fn escape_text(v: &str) -> String {
    let mut out = String::new();
    for c in v.chars() {
        match c {
            '\\' => out.push_str("\\textbackslash{}"),
            '{' => out.push_str("\\{"),
            '}' => out.push_str("\\}"),
            '\u{24}' => out.push_str("\\$"),
            '&' => out.push_str("\\&"),
            '%' => out.push_str("\\%"),
            '#' => out.push_str("\\#"),
            '_' => out.push_str("\\_"),
            '^' => out.push_str("\\textasciicircum{}"),
            '~' => out.push_str("\\textasciitilde{}"),
            _ => out.push(c),
        }
    }
    out
}
fn substitute(syntax: &str, params: &BTreeMap<&str, String>) -> Result<String, PrimitiveError> {
    let mut out = String::new();
    let mut rest = syntax;
    while let Some(start) = rest.find("\u{24}{") {
        out.push_str(&rest[..start]);
        let after = &rest[start + 2..];
        let end = after
            .find('}')
            .ok_or_else(|| invalid("unterminated placeholder"))?;
        out.push_str(
            params
                .get(&after[..end])
                .ok_or_else(|| invalid("undeclared placeholder"))?,
        );
        rest = &after[end + 1..];
    }
    out.push_str(rest);
    if out.len() > 4096 {
        return Err(invalid("generated source too long"));
    }
    Ok(out)
}
/// Applies a minimal edit to a caller-confirmed range, returning its undo patch.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourcePatch {
    pub range: Range<usize>,
    pub expected_old: String,
    pub replacement: String,
    pub source_revision: u64,
}
impl SourcePatch {
    pub fn apply(
        &self,
        source: &mut String,
        revision: &mut u64,
    ) -> Result<SourcePatch, PrimitiveError> {
        if *revision != self.source_revision
            || source.get(self.range.clone()) != Some(self.expected_old.as_str())
        {
            return Err(PrimitiveError::SourceConflict);
        }
        let next = self
            .source_revision
            .checked_add(1)
            .ok_or(PrimitiveError::SourceConflict)?;
        let end = self
            .range
            .start
            .checked_add(self.replacement.len())
            .ok_or(PrimitiveError::SourceConflict)?;
        source.replace_range(self.range.clone(), &self.replacement);
        *revision = next;
        Ok(SourcePatch {
            range: self.range.start..end,
            expected_old: self.replacement.clone(),
            replacement: self.expected_old.clone(),
            source_revision: next,
        })
    }
}
