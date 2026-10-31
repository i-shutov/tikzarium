//! N1: app gestures and transactions over the ONE C-owned TikZ catalogue.
//! We do not interpret TeX, replace PGF, or rewrite unrecognised source.
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, ops::Range, sync::LazyLock};
use tikzarium_extensions::primitives::{Catalog, Evidence, SourcePatch, ToolSpec};
use tikzarium_extensions::project_imports::{self, ImportDecision, ImportKind, ImportPlan};

static CATALOG: LazyLock<Catalog> = LazyLock::new(|| {
    Catalog::bundled().expect("bundled primitive catalogue must pass its own validation")
});
pub const MARKER: &str = " % tikzarium:n1:";
pub const TOOLS: [Tool; 6] = [
    Tool::Line,
    Tool::Arrow,
    Tool::Rectangle,
    Tool::Circle,
    Tool::Node,
    Tool::Cubic,
];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Tool {
    Line,
    Arrow,
    Rectangle,
    Circle,
    Node,
    Cubic,
}
impl Tool {
    pub const fn id(self) -> &'static str {
        match self {
            Self::Line => "line",
            Self::Arrow => "arrow",
            Self::Rectangle => "rectangle",
            Self::Circle => "circle",
            Self::Node => "node",
            Self::Cubic => "cubic",
        }
    }
    pub const fn catalog_id(self) -> &'static str {
        match self {
            Self::Line => "tikz.line",
            Self::Arrow => "tikz.arrow",
            Self::Rectangle => "tikz.rectangle",
            Self::Circle => "tikz.circle",
            Self::Node => "tikz.node",
            Self::Cubic => "tikz.bezier-cubic",
        }
    }
    fn from_id(id: &str) -> Option<Self> {
        TOOLS.into_iter().find(|tool| tool.id() == id)
    }
}
pub fn spec(tool: Tool) -> &'static ToolSpec {
    CATALOG
        .tool(tool.catalog_id())
        .expect("six reviewed catalogue IDs")
}
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}
impl Point {
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Draft {
    pub values: BTreeMap<String, String>,
}
impl Draft {
    pub fn for_tool(tool: Tool) -> Self {
        Self {
            values: spec(tool)
                .parameter
                .iter()
                .filter(|p| p.default != "UNKNOWN")
                .map(|p| (p.id.clone(), p.default.clone()))
                .collect(),
        }
    }
    fn set_cm(&mut self, key: &str, value: f32) {
        self.values.insert(key.into(), format!("{value:.2}cm"));
    }
    pub fn from_gesture(tool: Tool, start: Point, end: Point, previous: &Self) -> Self {
        let mut draft = previous.clone();
        match tool {
            Tool::Circle => {
                draft.set_cm("center_x", start.x);
                draft.set_cm("center_y", start.y);
                draft.set_cm("radius", (end.x - start.x).hypot(end.y - start.y).max(0.01));
            }
            Tool::Node => {
                draft.set_cm("x", start.x);
                draft.set_cm("y", start.y);
            }
            _ => {
                draft.set_cm("start_x", start.x);
                draft.set_cm("start_y", start.y);
                draft.set_cm("end_x", end.x);
                draft.set_cm("end_y", end.y);
                if tool == Tool::Cubic {
                    let dx = (end.x - start.x) / 3.0;
                    draft.set_cm("control1_x", start.x + dx);
                    draft.set_cm("control1_y", start.y + 0.8);
                    draft.set_cm("control2_x", end.x - dx);
                    draft.set_cm("control2_y", end.y + 0.8);
                }
            }
        }
        draft
    }
    /// Guides only accept cm literals. Other legal units remain editable and render in XeLaTeX.
    pub fn cm(&self, key: &str) -> Option<f32> {
        let v: f32 = self.values.get(key)?.strip_suffix("cm")?.parse().ok()?;
        v.is_finite().then_some(v)
    }
    pub fn point_cm(&self, x: &str, y: &str) -> Option<Point> {
        Some(Point::new(self.cm(x)?, self.cm(y)?))
    }
}
pub fn command(tool: Tool, draft: &Draft) -> Result<String, String> {
    CATALOG
        .generate(tool.catalog_id(), &draft.values)
        .map(|c| c.source)
        .map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Ownership {
    schema: u32,
    id: u64,
    tool: String,
    draft: Draft,
}
fn encode_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 15) as usize] as char);
    }
    out
}
fn decode_hex(hex: &str) -> Option<Vec<u8>> {
    if hex.len() > 24_000 || !hex.len().is_multiple_of(2) {
        return None;
    }
    hex.as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let h = (pair[0] as char).to_digit(16)?;
            let l = (pair[1] as char).to_digit(16)?;
            Some(((h << 4) | l) as u8)
        })
        .collect()
}
/// Read-only compatibility with the original opaque hex JSON comment.
/// Existing user documents retain this exact line until a deliberate edit.
fn generate_legacy(tool: Tool, draft: &Draft, id: u64) -> Result<String, String> {
    let source = command(tool, draft)?;
    let marker = Ownership {
        schema: 1,
        id,
        tool: tool.id().into(),
        draft: draft.clone(),
    };
    let json = serde_json::to_vec(&marker).map_err(|e| e.to_string())?;
    Ok(format!("  {source}{MARKER}{}", encode_hex(&json)))
}

/// B20: human-readable, compact versioned JSON metadata in a TeX comment.
/// The C catalogue still generates the entire TikZ command. Metadata never
/// changes unrelated source, and the public N1 marker prefix stays stable.
pub fn generate(tool: Tool, draft: &Draft, id: u64) -> Result<String, String> {
    let source = command(tool, draft)?;
    let metadata =
        serde_json::to_string(&(2_u8, id, tool.id(), &draft.values)).map_err(|e| e.to_string())?;
    Ok(format!("  {source}{MARKER}{metadata}"))
}
#[derive(Clone, Debug)]
pub struct Owned {
    pub id: u64,
    pub tool: Tool,
    pub draft: Draft,
    pub line: usize,
    pub text: String,
    pub range: Range<usize>,
}
fn parse_owned(line: &str, offset: usize, number: usize) -> Option<Owned> {
    // The FIRST marker starts the trailing comment. A node's JSON content
    // may itself mention the marker string; never split inside that content.
    let (_, payload) = line.split_once(MARKER)?;
    let (tool, id, draft, legacy) = if payload.starts_with('[') {
        let (schema, id, tool_id, values): (u8, u64, String, BTreeMap<String, String>) =
            serde_json::from_str(payload).ok()?;
        if schema != 2 || id == 0 {
            return None;
        }
        (Tool::from_id(&tool_id)?, id, Draft { values }, false)
    } else {
        let marker: Ownership = serde_json::from_slice(&decode_hex(payload)?).ok()?;
        if marker.schema != 1 || marker.id == 0 {
            return None;
        }
        (Tool::from_id(&marker.tool)?, marker.id, marker.draft, true)
    };
    // Metadata is NOT proof by itself. Both schemas must reproduce the exact
    // C-generated command AND full authored line, byte for byte.
    let expected = if legacy {
        generate_legacy(tool, &draft, id)
    } else {
        generate(tool, &draft, id)
    }
    .ok()?;
    if expected != line {
        return None;
    }
    Some(Owned {
        id,
        tool,
        draft,
        line: number,
        text: line.into(),
        range: offset..offset + line.len(),
    })
}
pub fn owned(source: &str) -> Vec<Owned> {
    let mut offset = 0;
    let mut found = Vec::new();
    for (number, line) in source.split_inclusive('\n').enumerate() {
        let body = line.trim_end_matches(&['\r', '\n'][..]);
        if let Some(item) = parse_owned(body, offset, number + 1) {
            found.push(item);
        }
        offset += line.len();
    }
    found
}
fn one_owned(source: &str, id: u64) -> Result<Owned, String> {
    let mut matching = owned(source).into_iter().filter(|item| item.id == id);
    let first = matching
        .next()
        .ok_or("Command was removed or edited by hand; use source mode")?;
    if matching.next().is_some() {
        return Err("Duplicate primitive ID: no edit was applied".into());
    }
    Ok(first)
}
fn unescaped_comment(line: &str) -> &str {
    let mut slashes = 0usize;
    for (at, c) in line.char_indices() {
        if c == '%' && slashes.is_multiple_of(2) {
            return &line[..at];
        }
        slashes = if c == '\\' { slashes + 1 } else { 0 };
    }
    line
}
pub fn requirements_status(source: &str, tool: Tool) -> Evidence {
    let project = project_imports::inspect(source);
    let r = &spec(tool).requirements;
    let states = r
        .packages
        .iter()
        .map(|name| project.status(ImportKind::Package, name))
        .chain(
            r.libraries
                .iter()
                .map(|name| project.status(ImportKind::TikzLibrary, name)),
        )
        .collect::<Vec<_>>();
    if states.iter().all(|state| *state == Evidence::Confirmed) {
        Evidence::Confirmed
    } else if states.contains(&Evidence::Unknown) {
        Evidence::Unknown
    } else {
        Evidence::Absent
    }
}
pub fn requirements_loaded(source: &str, tool: Tool) -> bool {
    requirements_status(source, tool) == Evidence::Confirmed
}

fn unique_line(source: &str, needle: &str) -> Result<usize, String> {
    let mut offset = 0;
    let mut result = None;
    for line in source.split_inclusive('\n') {
        let code = unescaped_comment(line).trim();
        if code.starts_with(needle) {
            if result.is_some() {
                return Err(format!(
                    "Several {needle}: select/edit the source explicitly"
                ));
            }
            result = Some(offset);
        }
        offset += line.len();
    }
    result.ok_or_else(|| format!("No unambiguous {needle}: edit source explicitly"))
}
fn insertion_offset(source: &str) -> Result<usize, String> {
    // Fail closed for lexical contexts that this small authored-block model cannot interpret.
    if [
        "\\catcode",
        "\\begin{verbatim}",
        "\\begin{lstlisting}",
        "\\begin{minted}",
    ]
    .iter()
    .any(|s| source.contains(s))
    {
        return Err("Special TeX lexical context: source-first, no automatic insertion".into());
    }
    let begin = unique_line(source, "\\begin{tikzpicture}")?;
    let end = unique_line(source, "\\end{tikzpicture}")?;
    if end <= begin {
        return Err("Invalid tikzpicture boundaries".into());
    }
    Ok(end)
}
fn eol(source: &str) -> &'static str {
    if source.contains("\r\n") {
        "\r\n"
    } else {
        "\n"
    }
}
/// The C N2 import planner owns preamble recognition, exact insertion point
/// and revision/anchor checks; B only chooses the requirements from the C tool.
fn dependency_plan(source: &str, tool: Tool, revision: u64) -> Result<ImportPlan, String> {
    let project = project_imports::inspect(source);
    let required = &spec(tool).requirements;
    let mut missing = None;
    // Library-first is deliberate: C N2 inserts tikz itself when necessary,
    // making an arrow's package+arrows.meta import ONE reversible transaction.
    for name in &required.libraries {
        if project.status(ImportKind::TikzLibrary, name) != Evidence::Confirmed {
            missing = Some((ImportKind::TikzLibrary, name.as_str()));
            break;
        }
    }
    if missing.is_none() {
        for name in &required.packages {
            if project.status(ImportKind::Package, name) != Evidence::Confirmed {
                missing = Some((ImportKind::Package, name.as_str()));
                break;
            }
        }
    }
    let (kind, name) = missing.ok_or("Все требуемые подключения уже явно присутствуют")?;
    let target = project.begin_document_target(revision).ok_or_else(|| {
        project
            .uncertain_reason
            .unwrap_or("нет однозначной преамбулы для безопасной вставки")
            .to_owned()
    })?;
    match project_imports::plan_import(source, target, kind, name) {
        ImportDecision::Proposed(plan) => Ok(plan),
        ImportDecision::AlreadyLoaded => {
            Err("Все требуемые подключения уже явно присутствуют".into())
        }
        ImportDecision::Refused { reason } => Err(format!("C/N2: {reason}")),
    }
}

#[derive(Default)]
pub struct Session {
    pub active: Option<Tool>,
    pub selected: Option<u64>,
    pub draft: Draft,
    pub drag_start: Option<Point>,
    /// Alt-initiated pointer gesture is selection-only until mouse release.
    pub alt_selection_capture: bool,
    pub status: String,
    pub help: bool,
    revision: u64,
    observed_source: String,
    undo: Vec<SourcePatch>,
}
impl Session {
    pub fn reset(&mut self, source: &str) {
        *self = Self {
            observed_source: source.into(),
            draft: Draft::for_tool(Tool::Line),
            status: "Единый каталог TikZ: неизвестные макросы сохраняются".into(),
            ..Self::default()
        };
    }
    fn sync(&mut self, source: &str) -> Result<bool, String> {
        if source == self.observed_source {
            return Ok(false);
        }
        self.revision = self.revision.checked_add(1).ok_or("Revision overflow")?;
        self.observed_source = source.into();
        // A manual source edit invalidates both old inverse patches and the
        // selected object's parameter authority until explicitly reselected.
        self.undo.clear();
        self.selected = None;
        self.drag_start = None;
        self.alt_selection_capture = false;
        Ok(true)
    }
    pub fn note_manual_source_edit(&mut self, source: &str) {
        match self.sync(source) {
            Ok(true) => {
                self.status = "Код изменён вручную: старые визуальные Undo отменены; выберите команду повторно".into();
            }
            Err(error) => self.status = error,
            Ok(false) => {}
        }
    }
    pub fn select_tool(&mut self, tool: Tool) {
        self.active = Some(tool);
        self.selected = None;
        self.drag_start = None;
        self.alt_selection_capture = false;
        self.draft = Draft::for_tool(tool);
        self.help = true;
    }
    pub fn undo_available(&self) -> bool {
        !self.undo.is_empty()
    }
    fn patch(
        &mut self,
        source: &mut String,
        range: Range<usize>,
        expected: String,
        replacement: String,
    ) -> Result<(), String> {
        let patch = SourcePatch {
            range,
            expected_old: expected,
            replacement,
            source_revision: self.revision,
        };
        let inverse = patch
            .apply(source, &mut self.revision)
            .map_err(|e| e.to_string())?;
        self.observed_source.clone_from(source);
        self.undo.push(inverse);
        Ok(())
    }
    pub fn choose(&mut self, source: &str, id: u64) -> Result<usize, String> {
        self.sync(source)?;
        let item = one_owned(source, id)?;
        self.selected = Some(id);
        self.active = Some(item.tool);
        self.draft = item.draft;
        Ok(item.line)
    }
    pub fn insert(
        &mut self,
        source: &mut String,
        tool: Tool,
        draft: Draft,
    ) -> Result<usize, String> {
        self.sync(source)?;
        if !requirements_loaded(source, tool) {
            return Err("Подключение пакета/библиотеки не подтверждено: сначала примите видимую правку преамбулы".into());
        }
        let at = insertion_offset(source)?;
        let id = owned(source)
            .iter()
            .map(|p| p.id)
            .max()
            .unwrap_or(0)
            .checked_add(1)
            .ok_or("Primitive ID overflow")?;
        let after = format!("{}{}", generate(tool, &draft, id)?, eol(source));
        let number = source[..at].bytes().filter(|b| *b == b'\n').count() + 1;
        self.patch(source, at..at, String::new(), after)?;
        self.active = Some(tool);
        self.selected = Some(id);
        self.draft = draft;
        self.status = "Добавлена команда из общего каталога; XeLaTeX обновляет точный PDF".into();
        Ok(number)
    }
    pub fn apply_parameters(&mut self, source: &mut String) -> Result<usize, String> {
        if self.sync(source)? {
            return Err(
                "Код изменён вручную: выберите команду повторно; старый patch не применён".into(),
            );
        }
        let id = self.selected.ok_or("Выберите собственную команду N1")?;
        let old = one_owned(source, id)?;
        // Applying unchanged fields must not silently reformat legacy source.
        // A real parameter edit may compact this exact owned line; Undo restores
        // the entire original line including the former hex marker.
        if old.draft != self.draft {
            let after = generate(old.tool, &self.draft, id)?;
            if old.text != after {
                self.patch(source, old.range, old.text, after)?;
            }
        }
        self.status =
            "Изменена только выбранная команда и её метаданные; другой код не переписан".into();
        Ok(old.line)
    }
    pub fn propose_dependencies(source: &str, tool: Tool) -> Result<String, String> {
        let plan = dependency_plan(source, tool, 0)?;
        let mut preview = String::from("@@ перед \\begin{document} @@\n");
        for declaration in &plan.declarations {
            preview.push_str("+ ");
            preview.push_str(declaration);
            preview.push('\n');
        }
        Ok(preview)
    }
    pub fn add_dependencies(&mut self, source: &mut String, tool: Tool) -> Result<usize, String> {
        self.sync(source)?;
        let plan = dependency_plan(source, tool, self.revision)?;
        let at = plan.patch.range.start;
        let line = source[..at].bytes().filter(|byte| *byte == b'\n').count() + 1;
        // C N2 re-checks the begin-document anchor and source revision on apply.
        let inverse = plan
            .apply(source, &mut self.revision)
            .map_err(|e| e.to_string())?;
        self.observed_source.clone_from(source);
        self.undo.push(inverse);
        self.status =
            "Преамбула изменена через проверенный C/N2 patch; доступна отмена. TeX-пакеты не устанавливались".into();
        Ok(line)
    }
    /// The inspector may navigate to the exact inverse-patch anchor after a
    /// successful Undo. A stale source revision still fails in undo() without
    /// modifying user text. Line numbers are physical, one-based and UTF-8 safe.
    pub fn undo_and_focus_line(&mut self, source: &mut String) -> Result<usize, String> {
        let start = self
            .undo
            .last()
            .ok_or("Нет изменений для отмены")?
            .range
            .start;
        let line = source
            .get(..start)
            .map(|prefix| prefix.bytes().filter(|byte| *byte == b'\n').count() + 1)
            .unwrap_or(1);
        self.undo(source)?;
        Ok(line)
    }

    pub fn undo(&mut self, source: &mut String) -> Result<(), String> {
        if self.sync(source)? {
            return Err("Undo отменён: исходник изменён вне этой транзакции".into());
        }
        let mut inverse = self.undo.last().ok_or("Нет изменений для отмены")?.clone();
        // Our LIFO snapshot is verified; revisions are monotone even when undoing.
        inverse.source_revision = self.revision;
        inverse
            .apply(source, &mut self.revision)
            .map_err(|e| e.to_string())?;
        self.undo.pop();
        self.observed_source.clone_from(source);
        if let Some(id) = self.selected {
            if let Ok(item) = one_owned(source, id) {
                self.draft = item.draft;
            } else {
                self.selected = None;
            }
        }
        self.status = "Отменена точная правка исходника".into();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const SOURCE: &str = "\\documentclass{standalone}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta}\n\\begin{document}\n\\begin{tikzpicture}\n% opaque user material\n\\myMacro{x}\n\\end{tikzpicture}\n\\end{document}\n";
    #[test]
    fn all_six_app_gestures_use_the_c_generator_and_roundtrip() {
        for tool in TOOLS {
            let mut source = SOURCE.to_owned();
            let mut session = Session::default();
            session.reset(&source);
            let draft = Draft::from_gesture(
                tool,
                Point::new(1.0, 1.0),
                Point::new(3.0, 2.0),
                &Draft::for_tool(tool),
            );
            let expected = CATALOG.generate(tool.catalog_id(), &draft.values).unwrap();
            session.insert(&mut source, tool, draft).unwrap();
            assert!(source.contains(&expected.source));
            assert!(source.contains("% opaque user material\n\\myMacro{x}\n"));
            assert_eq!(owned(&source).len(), 1);
            let mut reopened = Session::default();
            reopened.reset(&source);
            reopened.choose(&source, 1).unwrap();
            assert_eq!(command(tool, &reopened.draft).unwrap(), expected.source);
            session.undo(&mut source).unwrap();
            assert_eq!(source, SOURCE);
        }
    }
    #[test]
    fn parameter_change_and_two_undos_preserve_original_crlf_unicode() {
        let mut source = SOURCE
            .replace("opaque user material", "Неизвестная команда")
            .replace('\n', "\r\n");
        let original = source.clone();
        let mut session = Session::default();
        session.reset(&source);
        session
            .insert(&mut source, Tool::Circle, Draft::for_tool(Tool::Circle))
            .unwrap();
        let first = source.clone();
        session.draft.values.insert("radius".into(), "2cm".into());
        session.apply_parameters(&mut source).unwrap();
        assert!(source.contains("radius=2cm"));
        session.undo(&mut source).unwrap();
        assert_eq!(source, first);
        session.undo(&mut source).unwrap();
        assert_eq!(source, original);
    }
    #[test]
    fn node_text_is_escaped_and_math_is_explicit_from_same_catalogue() {
        let mut draft = Draft::for_tool(Tool::Node);
        draft
            .values
            .insert("content".into(), "Оптика_1 & 25% {A}".into());
        let text = command(Tool::Node, &draft).unwrap();
        assert!(text.contains(r"Оптика\_1 \& 25\% \{A\}"));
        draft.values.insert("mode".into(), "math".into());
        draft
            .values
            .insert("content".into(), r"\alpha+\beta".into());
        assert!(
            command(Tool::Node, &draft)
                .unwrap()
                .contains(r"$\alpha+\beta$")
        );
        let line = generate(Tool::Node, &draft, 3).unwrap();
        assert_eq!(owned(&line).len(), 1);
    }
    #[test]
    fn library_activation_is_explicit_and_reversible() {
        let mut source = SOURCE.replace("\\usetikzlibrary{arrows.meta}\n", "");
        let original = source.clone();
        let mut session = Session::default();
        session.reset(&source);
        assert!(!requirements_loaded(&source, Tool::Arrow));
        assert!(
            session
                .insert(&mut source, Tool::Arrow, Draft::for_tool(Tool::Arrow))
                .is_err()
        );
        assert_eq!(source, original);
        assert!(
            Session::propose_dependencies(&source, Tool::Arrow)
                .unwrap()
                .contains("\\usetikzlibrary{arrows.meta}")
        );
        session.add_dependencies(&mut source, Tool::Arrow).unwrap();
        assert!(requirements_loaded(&source, Tool::Arrow));
        session.undo(&mut source).unwrap();
        assert_eq!(source, original);
        let multi_package = SOURCE.replace("\\usepackage{tikz}", "\\usepackage[demo]{foo, tikz}");
        assert_eq!(
            requirements_status(&multi_package, Tool::Line),
            Evidence::Confirmed
        );
        let commented = SOURCE.replace("\\usepackage{tikz}", "% \\usepackage{tikz}");
        // A direct arrows.meta declaration with a commented tikz package
        // has unresolved dependencies: C/N2 correctly reports UNKNOWN,
        // never a confirmed loaded TikZ package.
        assert_eq!(
            requirements_status(&commented, Tool::Line),
            Evidence::Unknown
        );
    }
    #[test]
    fn hand_edits_or_duplicate_objects_do_not_gain_write_authority() {
        let mut source = SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        session
            .insert(&mut source, Tool::Line, Draft::for_tool(Tool::Line))
            .unwrap();
        source = source.replace("\\draw (", "\\draw[red] (");
        let edited = source.clone();
        assert!(session.apply_parameters(&mut source).is_err());
        assert_eq!(source, edited);
        assert!(owned(&source).is_empty());
        assert!(session.undo(&mut source).is_err());
        let line = generate(Tool::Node, &Draft::for_tool(Tool::Node), 8).unwrap();
        let duplicated = format!("{line}\n{line}\n");
        assert!(one_owned(&duplicated, 8).is_err());
    }
    #[test]
    fn manual_source_typing_immediately_revokes_visual_undo_and_selection() {
        let mut source = SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        session
            .insert(&mut source, Tool::Line, Draft::for_tool(Tool::Line))
            .unwrap();
        assert!(session.undo_available());
        assert_eq!(session.selected, Some(1));
        source.push_str("% изменение вручную\n");
        let edited = source.clone();
        session.note_manual_source_edit(&source);
        assert!(!session.undo_available());
        assert_eq!(session.selected, None);
        assert!(session.undo(&mut source).is_err());
        assert_eq!(source, edited);
        // Re-selection is deliberate and uses the same C-catalogue ownership proof.
        assert!(session.choose(&source, 1).is_ok());
        session.draft.values.insert("start_x".into(), "2cm".into());
        session.apply_parameters(&mut source).unwrap();
        assert!(source.contains("% изменение вручную"));
    }

    #[test]
    fn n2_package_and_arrows_library_are_one_visible_undoable_crlf_patch() {
        let mut source = SOURCE
            .replace("\\usepackage{tikz}\n", "")
            .replace("\\usetikzlibrary{arrows.meta}\n", "")
            .replace('\n', "\r\n");
        let original = source.clone();
        assert_eq!(requirements_status(&source, Tool::Arrow), Evidence::Absent);
        let preview = Session::propose_dependencies(&source, Tool::Arrow).unwrap();
        assert!(preview.contains("+ \\usepackage{tikz}"));
        assert!(preview.contains("+ \\usetikzlibrary{arrows.meta}"));
        let mut session = Session::default();
        session.reset(&source);
        let at_line = session.add_dependencies(&mut source, Tool::Arrow).unwrap();
        assert_eq!(at_line, 2);
        assert!(source.contains("\\usepackage{tikz}\r\n\\usetikzlibrary{arrows.meta}\r\n"));
        assert!(requirements_loaded(&source, Tool::Arrow));
        assert!(source.contains("% opaque user material\r\n\\myMacro{x}\r\n"));
        session.undo(&mut source).unwrap();
        assert_eq!(source, original);
    }

    #[test]
    fn n2_direct_imports_stay_confirmed_after_fontspec_and_opaque_macro() {
        let added = concat!(
            "\\usepackage{fontspec}\n",
            "\\usepackage{unicode-math}\n",
            "\\setmainfont{DejaVu Serif}\n",
            "\\setmathfont{Latin Modern Math}\n",
            "\\newcommand{\\myLabel}{x}\n",
        );
        let original = SOURCE.replacen(
            "\\begin{document}\n",
            &(added.to_owned() + "\\begin{document}\n"),
            1,
        );
        assert_eq!(
            requirements_status(&original, Tool::Arrow),
            Evidence::Confirmed
        );
        assert!(requirements_loaded(&original, Tool::Line));
        assert!(Session::propose_dependencies(&original, Tool::Arrow).is_err());
        for tool in TOOLS {
            let mut source = original.clone();
            let mut session = Session::default();
            session.reset(&source);
            session
                .insert(&mut source, tool, Draft::for_tool(tool))
                .unwrap();
            assert_eq!(owned(&source).len(), 1);
            assert!(source.contains(r"\newcommand{\myLabel}{x}"));
            session.undo(&mut source).unwrap();
            assert_eq!(source, original);
        }
    }

    #[test]
    fn n2_unknown_preamble_never_claims_loaded_or_overwrites_source() {
        let mut source = SOURCE.replace(
            "\\usepackage{tikz}\n",
            "\\myOpaquePreambleMacro\n\\usepackage{tikz}\n",
        );
        let original = source.clone();
        assert_eq!(requirements_status(&source, Tool::Arrow), Evidence::Unknown);
        assert!(!requirements_loaded(&source, Tool::Arrow));
        assert!(Session::propose_dependencies(&source, Tool::Arrow).is_err());
        let mut session = Session::default();
        session.reset(&source);
        assert!(session.add_dependencies(&mut source, Tool::Arrow).is_err());
        assert!(
            session
                .insert(&mut source, Tool::Arrow, Draft::for_tool(Tool::Arrow))
                .is_err()
        );
        assert_eq!(source, original);
        assert!(!session.undo_available());
    }

    #[test]
    fn generated_command_survives_document_save_and_reopen_using_real_document_api() {
        let mut doc = tikzarium_core::Document::scratch(SOURCE);
        let mut session = Session::default();
        session.reset(&doc.source);
        session
            .insert(
                &mut doc.source,
                Tool::Rectangle,
                Draft::for_tool(Tool::Rectangle),
            )
            .unwrap();
        let temp = tempfile::tempdir().unwrap();
        let file = temp.path().join("n2-authoring.tex");
        doc.save_to(&file).unwrap();
        let reopened = tikzarium_core::Document::load(&file).unwrap();
        assert_eq!(reopened.source, doc.source);
        assert!(reopened.source.contains(r"\myMacro{x}"));
        let mut reopened_session = Session::default();
        reopened_session.reset(&reopened.source);
        let line = reopened_session.choose(&reopened.source, 1).unwrap();
        assert_eq!(line, owned(&reopened.source)[0].line);
        reopened_session
            .draft
            .values
            .insert("end_x".into(), "4cm".into());
        let mut edited = reopened.source.clone();
        reopened_session.apply_parameters(&mut edited).unwrap();
        assert!(edited.contains("4cm"));
        reopened_session.undo(&mut edited).unwrap();
        assert_eq!(edited, reopened.source);
    }

    #[test]
    fn b20_compact_readable_metadata_survives_real_document_reopen_and_undo() {
        for tool in TOOLS {
            let mut source = SOURCE.replace('\n', "\r\n");
            let original = source.clone();
            let mut session = Session::default();
            session.reset(&source);
            let mut draft = Draft::for_tool(tool);
            if tool == Tool::Node {
                draft
                    .values
                    .insert("content".into(), "Привет % tikzarium:n1: текст".into());
            }
            session.insert(&mut source, tool, draft.clone()).unwrap();
            let items = owned(&source);
            assert_eq!(
                items.len(),
                1,
                "{tool:?}: valid compact marker lost ownership"
            );
            let (_, metadata) = items[0].text.split_once(MARKER).unwrap();
            assert!(metadata.starts_with("[2,"), "{tool:?}: unexpected schema");
            let old = generate_legacy(tool, &draft, 1).unwrap();
            let (_, opaque_hex) = old.split_once(MARKER).unwrap();
            assert!(
                metadata.len() < opaque_hex.len(),
                "{tool:?}: new metadata is not shorter"
            );
            if tool == Tool::Node {
                assert!(metadata.contains("Привет"), "Unicode must remain readable");
            }
            let doc = tikzarium_core::Document::scratch(source.clone());
            let tmp = tempfile::tempdir().unwrap();
            let file = tmp.path().join("b20-русский.tex");
            doc.save_to(&file).unwrap();
            let reopened = tikzarium_core::Document::load(&file).unwrap();
            assert_eq!(reopened.source, source);
            let mut editor = Session::default();
            editor.reset(&reopened.source);
            editor.choose(&reopened.source, 1).unwrap();
            let key = if tool == Tool::Circle {
                "radius"
            } else if tool == Tool::Node {
                "x"
            } else {
                "start_x"
            };
            editor.draft.values.insert(key.into(), "3.25cm".into());
            let mut changed = reopened.source.clone();
            editor.apply_parameters(&mut changed).unwrap();
            assert_ne!(changed, source);
            editor.undo(&mut changed).unwrap();
            assert_eq!(changed, source, "Undo must restore all original bytes");
            session.undo(&mut source).unwrap();
            assert_eq!(
                source, original,
                "original CRLF and opaque TeX were damaged"
            );
        }
    }

    #[test]
    fn b20_legacy_hex_reopens_without_reformatting_and_upgrades_only_on_real_edit() {
        let draft = Draft::for_tool(Tool::Circle);
        let old = generate_legacy(Tool::Circle, &draft, 7).unwrap();
        let mut source = SOURCE.replacen(
            "\\end{tikzpicture}",
            &format!("{old}\n\\end{{tikzpicture}}"),
            1,
        );
        let before = source.clone();
        assert_eq!(owned(&source).len(), 1);
        let mut session = Session::default();
        session.reset(&source);
        session.choose(&source, 7).unwrap();
        session.apply_parameters(&mut source).unwrap();
        assert_eq!(
            source, before,
            "no-op Apply must not rewrite legacy metadata"
        );
        assert!(!session.undo_available());
        session.draft.values.insert("radius".into(), "3cm".into());
        session.apply_parameters(&mut source).unwrap();
        assert_eq!(owned(&source).len(), 1);
        assert!(source.contains(&format!("{MARKER}[2,")));
        assert!(source.contains(r"\myMacro{x}"));
        session.undo(&mut source).unwrap();
        assert_eq!(source, before, "legacy bytes must survive Undo");
        assert_eq!(owned(&source)[0].id, 7);
    }

    #[test]
    fn b20_tampered_compact_payload_and_unknown_schema_fail_closed() {
        let draft = Draft::for_tool(Tool::Circle);
        let good = generate(Tool::Circle, &draft, 9).unwrap();
        assert_eq!(owned(&good).len(), 1);
        let wrong_values = {
            let mut values = draft.values.clone();
            values.insert("radius".into(), "987cm".into());
            serde_json::to_string(&(2_u8, 9_u64, "circle", values)).unwrap()
        };
        let command = command(Tool::Circle, &draft).unwrap();
        let tampered = format!("  {command}{MARKER}{wrong_values}");
        assert!(
            owned(&tampered).is_empty(),
            "marker cannot grant edit authority"
        );
        let future = good.replacen(&format!("{MARKER}[2,"), &format!("{MARKER}[99,"), 1);
        assert!(owned(&future).is_empty(), "unknown schema is source-first");
        assert!(owned(&format!("\\unknownMacro{{{good}}}")).is_empty());
    }

    #[test]
    fn ambiguous_picture_and_invalid_parameter_leave_source_unchanged() {
        let mut source = format!("{SOURCE}\\begin{{tikzpicture}}\n\\end{{tikzpicture}}\n");
        let original = source.clone();
        let mut session = Session::default();
        session.reset(&source);
        assert!(
            session
                .insert(&mut source, Tool::Line, Draft::for_tool(Tool::Line))
                .is_err()
        );
        assert_eq!(source, original);
        let mut draft = Draft::for_tool(Tool::Circle);
        draft.values.insert("radius".into(), "-1cm".into());
        assert!(command(Tool::Circle, &draft).is_err());
    }
}
