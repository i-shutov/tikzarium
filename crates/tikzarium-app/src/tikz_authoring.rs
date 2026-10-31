//! B07: narrow TikZ-native source edits for a first egui authoring vertical.
//! This is NOT a TeX parser, a PDF coordinate mapper, or a geometry engine.
//! The source owns every generated object; unknown code is never rewritten.

use std::{
    collections::{BTreeMap, hash_map::DefaultHasher},
    hash::{Hash, Hasher},
    ops::Range,
    sync::OnceLock,
};
use tikzarium_extensions::primitives::{Catalog, SourcePatch};

pub const MARKER: &str = " % tikzarium:b08:";
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

/// The C-owned TOML catalogue is the sole source for tool names, requirements,
/// executable generation, parameter semantics, examples and F1/hover text.
pub fn catalog() -> &'static Catalog {
    static CATALOG: OnceLock<Catalog> = OnceLock::new();
    CATALOG.get_or_init(|| Catalog::bundled().expect("bundled primitive catalogue must validate"))
}
pub fn spec(tool: Tool) -> &'static tikzarium_extensions::primitives::ToolSpec {
    catalog().tool(tool.catalog_id()).expect("six stable C tool IDs")
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

#[derive(Clone, Debug, PartialEq)]
pub struct Draft {
    pub start: Point,
    pub end: Point,
    pub bend: f32,
    pub text: String,
    pub tip: String,
    pub mode: String,
}
impl Default for Draft {
    fn default() -> Self {
        Self {
            start: Point::new(1.0, 1.0),
            end: Point::new(3.0, 2.0),
            bend: 0.8,
            text: "Text".into(),
            tip: "Stealth".into(),
            mode: "text".into(),
        }
    }
}

fn safe_number(value: f32) -> bool {
    value.is_finite() && value.abs() <= 1000.0
}
fn safe_text(text: &str) -> bool {
    !text.is_empty() && text.chars().count() <= 80 && !text.chars().any(char::is_control)
}
fn literal_cm(value: f32) -> String {
    format!("{value:.2}cm")
}
/// B retains only pointer geometry. C owns the syntax, units and validation.
pub fn parameter_values(tool: Tool, draft: &Draft) -> Result<BTreeMap<String, String>, String> {
    if ![
        draft.start.x, draft.start.y, draft.end.x, draft.end.y, draft.bend,
    ]
    .into_iter()
    .all(safe_number)
    {
        return Err("Coordinates must be finite and within ±1000".into());
    }
    if tool == Tool::Node && !safe_text(&draft.text) {
        return Err("Node content must be 1–80 Unicode characters without control characters".into());
    }
    let mut p = BTreeMap::new();
    let a = draft.start;
    let b = draft.end;
    match tool {
        Tool::Line | Tool::Arrow | Tool::Rectangle | Tool::Cubic => {
            for (key, value) in [
                ("start_x", a.x), ("start_y", a.y),
                ("end_x", b.x), ("end_y", b.y),
            ] {
                p.insert(key.to_owned(), literal_cm(value));
            }
        }
        Tool::Circle => {
            p.insert("center_x".into(), literal_cm(a.x));
            p.insert("center_y".into(), literal_cm(a.y));
            p.insert("radius".into(), literal_cm((b.x - a.x).hypot(b.y - a.y).max(0.1)));
        }
        Tool::Node => {
            p.insert("x".into(), literal_cm(a.x));
            p.insert("y".into(), literal_cm(a.y));
            p.insert("content".into(), draft.text.clone());
            p.insert("mode".into(), draft.mode.clone());
        }
    }
    if tool == Tool::Arrow {
        p.insert("tip".into(), draft.tip.clone());
    }
    if tool == Tool::Cubic {
        let dx = (b.x - a.x) / 3.0;
        for (key, value) in [
            ("control1_x", a.x + dx),
            ("control1_y", a.y + draft.bend),
            ("control2_x", b.x - dx),
            ("control2_y", b.y + draft.bend),
        ] {
            p.insert(key.to_owned(), literal_cm(value));
        }
    }
    Ok(p)
}
pub fn generate(tool: Tool, draft: &Draft, id: u64) -> Result<String, String> {
    let params = parameter_values(tool, draft)?;
    let command = catalog()
        .generate(tool.catalog_id(), &params)
        .map_err(|error| error.to_string())?;
    Ok(format!("  {}{MARKER}{id}:{}", command.source, tool.id()))
}

fn read_point(raw: &str) -> Option<Point> {
    let (x, y) = raw.split_once(',')?;
    let read = |v: &str| -> Option<f32> { v.strip_suffix("cm")?.parse().ok() };
    let point = Point::new(read(x)?, read(y)?);
    (safe_number(point.x) && safe_number(point.y)).then_some(point)
}

fn points(source: &str) -> Option<Vec<Point>> {
    let mut remaining = source;
    let mut out = Vec::new();
    while let Some(open) = remaining.find('(') {
        remaining = &remaining[open + 1..];
        let close = remaining.find(')')?;
        out.push(read_point(&remaining[..close])?);
        remaining = &remaining[close + 1..];
    }
    Some(out)
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

/// An owned line is editable only if it still exactly matches B07's generator.
/// A hand-modified command, even with the marker left in place, is opaque.
/// Reverse only C's known text escaping, never TeX macro expansion.
fn decode_generated_text(raw: &str) -> String {
    let mut value = raw.to_owned();
    for (encoded, literal) in [
        (r"\textbackslash{}", r"\"),
        (r"\textasciicircum{}", "^"),
        (r"\textasciitilde{}", "~"),
        (r"\{", "{"), (r"\}", "}"), (r"\$", "$"),
        (r"\&", "&"), (r"\%", "%"), (r"\#", "#"),
        (r"\_", "_"),
    ] {
        value = value.replace(encoded, literal);
    }
    value
}

fn parse_line(line: &str, start: usize, number: usize) -> Option<Owned> {
    let (command, tag) = line.split_once(MARKER)?;
    let (id, kind) = tag.split_once(':')?;
    let id: u64 = id.parse().ok()?;
    let tool = Tool::from_id(kind)?;
    // Node content can contain parentheses; only the native coordinate prefix
    // is recognized. Generated source must still round-trip byte-for-byte.
    let coordinate_part = if tool == Tool::Node {
        command.split_once(" {")?.0
    } else {
        command
    };
    let coords = points(coordinate_part)?;
    let mut draft = Draft::default();
    match tool {
        Tool::Line | Tool::Arrow | Tool::Rectangle if coords.len() == 2 => {
            draft.start = coords[0];
            draft.end = coords[1];
            if tool == Tool::Arrow {
                draft.tip = command.split_once("[-{")?.1.split_once("}]")?.0.to_owned();
            }
        }
        Tool::Circle if coords.len() == 1 => {
            let radius: f32 = command
                .split("radius=")
                .nth(1)?
                .strip_suffix("cm];")?
                .parse()
                .ok()?;
            draft.start = coords[0];
            draft.end = Point::new(coords[0].x + radius, coords[0].y);
        }
        Tool::Node if coords.len() == 1 => {
            let text = command.split_once(" {")?.1.strip_suffix("};")?;
            draft.start = coords[0];
            if let Some(math) = text.strip_prefix('$').and_then(|v| v.strip_suffix('$')) {
                draft.mode = "math".into();
                draft.text = math.into();
            } else {
                draft.mode = "text".into();
                draft.text = decode_generated_text(text);
            }
        }
        Tool::Cubic if coords.len() == 4 => {
            draft.start = coords[0];
            draft.end = coords[3];
            draft.bend = ((coords[1].y - coords[0].y) * 100.0).round() / 100.0;
        }
        _ => return None,
    }
    // Exact round-trip is the guard against styling or user macro changes.
    if generate(tool, &draft, id).ok()?.as_str() != line {
        return None;
    }
    Some(Owned {
        id,
        tool,
        draft,
        line: number,
        text: line.into(),
        range: start..start + line.len(),
    })
}

pub fn owned(source: &str) -> Vec<Owned> {
    let mut offset = 0;
    let mut found = Vec::new();
    for (index, line) in source.split_inclusive('\n').enumerate() {
        let body = line.trim_end_matches(&['\r', '\n'][..]);
        if let Some(item) = parse_line(body, offset, index + 1) {
            found.push(item);
        }
        offset += line.len();
    }
    found
}

fn one_owned(source: &str, id: u64) -> Result<Owned, String> {
    let matches: Vec<_> = owned(source)
        .into_iter()
        .filter(|item| item.id == id)
        .collect();
    if matches.len() != 1 {
        return Err("Owned command absent, duplicated or manually changed: source-first".into());
    }
    let marker = format!("{MARKER}{id}:");
    if source.matches(&marker).count() != 1 {
        return Err(
            "Conflicting or modified ownership marker: manual source stays untouched".into(),
        );
    }
    Ok(matches[0].clone())
}

fn unescaped_comment(line: &str) -> &str {
    let mut backslashes = 0usize;
    for (i, c) in line.char_indices() {
        if c == '%' && backslashes.is_multiple_of(2) {
            return &line[..i];
        }
        backslashes = if c == '\\' { backslashes + 1 } else { 0 };
    }
    line
}

/// Macro-generated imports are UNKNOWN. Only literal project declarations
/// grant a visual tool permission to insert its package-dependent source.
fn has_declaration(line: &str, command: &str, name: &str) -> bool {
    let Some(mut rest) = line.strip_prefix(command) else { return false; };
    if let Some(options) = rest.strip_prefix('[') {
        let Some((_, remaining)) = options.split_once(']') else { return false; };
        rest = remaining;
    }
    let Some((names, _)) = rest.strip_prefix('{').and_then(|body| body.split_once('}')) else {
        return false;
    };
    names.split(',').any(|entry| entry == name)
}
fn literal_loaded(source: &str, commands: &[&str], name: &str) -> bool {
    source.lines().map(unescaped_comment).any(|line| {
        let compact: String = line.chars().filter(|c| !c.is_whitespace()).collect();
        commands.iter().any(|command| has_declaration(&compact, command, name))
    })
}
pub fn tikz_loaded(source: &str) -> bool {
    literal_loaded(source, &[r"\usepackage", r"\RequirePackage"], "tikz")
}
pub fn library_loaded(source: &str, library: &str) -> bool {
    literal_loaded(source, &[r"\usetikzlibrary"], library)
}

fn unique_line_start(source: &str, needle: &str, anchored: bool) -> Result<usize, String> {
    let mut offset = 0;
    let mut result = None;
    for line in source.split_inclusive('\n') {
        let code = unescaped_comment(line).trim();
        let found = if anchored {
            code.starts_with(needle)
        } else {
            code.contains(needle)
        };
        if found {
            if result.is_some() {
                return Err(format!(
                    "Multiple {needle} occurrences; edit source explicitly"
                ));
            }
            result = Some(offset);
        }
        offset += line.len();
    }
    result.ok_or_else(|| format!("No unambiguous {needle}; edit source explicitly"))
}

fn insertion_offset(source: &str) -> Result<usize, String> {
    let _begin = unique_line_start(source, r"\begin{tikzpicture}", true)?;
    let end = unique_line_start(source, r"\end{tikzpicture}", true)?;
    if end <= _begin {
        return Err("Invalid TikZ picture order".into());
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

fn source_fingerprint(source: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    source.hash(&mut hasher);
    hasher.finish()
}

/// The inverse is an exact source-range patch from C. A whole-source
/// fingerprint refuses undo after manual changes (without restoring a file).
#[derive(Clone, Debug)]
struct Patch {
    inverse: SourcePatch,
    after_fingerprint: u64,
}
fn minimal_changed_span(before: &str, after: &str, at: usize, rev: u64) -> Result<SourcePatch, String> {
    if before == after {
        return Err("No parameter change".into());
    }
    let prefix: usize = before
        .chars()
        .zip(after.chars())
        .take_while(|(a, b)| a == b)
        .map(|(c, _)| c.len_utf8())
        .sum();
    let mut old_end = before.len();
    let mut new_end = after.len();
    while old_end > prefix && new_end > prefix {
        let a = before[..old_end].chars().next_back().ok_or("Invalid old UTF-8")?;
        let b = after[..new_end].chars().next_back().ok_or("Invalid new UTF-8")?;
        if a != b { break; }
        old_end -= a.len_utf8();
        new_end -= b.len_utf8();
    }
    Ok(SourcePatch {
        range: at + prefix .. at + old_end,
        expected_old: before[prefix..old_end].to_owned(),
        replacement: after[prefix..new_end].to_owned(),
        source_revision: rev,
    })
}

#[derive(Default)]
pub struct Session {
    pub active: Option<Tool>,
    pub selected: Option<u64>,
    pub draft: Draft,
    pub drag_start: Option<Point>,
    pub status: String,
    pub help: bool,
    next_id: u64,
    revision: u64,
    source_fingerprint: u64,
    undo: Vec<Patch>,
}
impl Session {
    pub fn reset(&mut self, source: &str) {
        self.active = None;
        self.selected = None;
        self.draft = Draft::default();
        self.drag_start = None;
        self.undo.clear();
        self.revision = 0;
        self.source_fingerprint = source_fingerprint(source);
        self.next_id = owned(source).iter().map(|item| item.id)
            .max().unwrap_or(0).saturating_add(1).max(1);
        self.status = "Source-first: unknown TeX and macros remain unchanged".into();
    }
    /// Direct Source edits never get rewritten; they invalidate transient undo.
    fn adopt_external(&mut self, source: &str) {
        let current = source_fingerprint(source);
        if current != self.source_fingerprint {
            self.revision = self.revision.saturating_add(1);
            self.source_fingerprint = current;
            self.undo.clear();
            self.selected = None;
            self.next_id = owned(source).iter().map(|item| item.id)
                .max().unwrap_or(0).saturating_add(1).max(1);
            self.status = "Source edited manually; previous visual undo invalidated".into();
        }
    }
    pub fn note_manual_edit(&mut self, source: &str) {
        self.adopt_external(source);
    }
    fn apply_patch(&mut self, source: &mut String, patch: SourcePatch) -> Result<(), String> {
        if self.source_fingerprint != source_fingerprint(source) {
            return Err("Source changed after visual inspection; patch refused".into());
        }
        let inverse = patch.apply(source, &mut self.revision)
            .map_err(|e| e.to_string())?;
        self.source_fingerprint = source_fingerprint(source);
        self.undo.push(Patch { inverse, after_fingerprint: self.source_fingerprint });
        Ok(())
    }
    pub fn undo_available(&self) -> bool {
        !self.undo.is_empty()
    }
    pub fn choose(&mut self, source: &str, id: u64) -> Result<usize, String> {
        self.adopt_external(source);
        let item = one_owned(source, id)?;
        self.selected = Some(id);
        self.active = Some(item.tool);
        self.draft = item.draft;
        Ok(item.line)
    }
    pub fn insert(&mut self, source: &mut String, tool: Tool, draft: Draft) -> Result<usize, String> {
        self.adopt_external(source);
        if !tikz_loaded(source) {
            return Err("TikZ not explicitly loaded; approve the visible \\usepackage diff".into());
        }
        for library in &spec(tool).requirements.libraries {
            if !library_loaded(source, library) {
                return Err(format!("Missing project \\usetikzlibrary{{{library}}}; review source diff first"));
            }
        }
        let at = insertion_offset(source)?;
        let id = self.next_id.max(1);
        if source.contains(&format!("{MARKER}{id}:")) {
            return Err("Ownership ID conflict".into());
        }
        let line = generate(tool, &draft, id)?;
        let after = format!("{}{}", line, eol(source));
        let number = source[..at].bytes().filter(|b| *b == b'\n').count() + 1;
        self.apply_patch(source, SourcePatch {
            range: at..at,
            expected_old: String::new(),
            replacement: after,
            source_revision: self.revision,
        })?;
        self.next_id = id.saturating_add(1);
        self.active = Some(tool);
        self.selected = Some(id);
        self.draft = draft;
        self.status = format!("Created {} with C catalogue · Build XeLaTeX for exact PDF", tool.id());
        Ok(number)
    }
    pub fn apply_parameters(&mut self, source: &mut String) -> Result<usize, String> {
        self.adopt_external(source);
        let id = self.selected.ok_or("Select a C-backed B08 command first")?;
        let old = one_owned(source, id)?;
        let after = generate(old.tool, &self.draft, id)?;
        if old.text != after {
            let patch = minimal_changed_span(&old.text, &after, old.range.start, self.revision)?;
            self.apply_patch(source, patch)?;
        }
        self.status = "Edited only generated command parameters; PDF requires XeLaTeX Build".into();
        Ok(old.line)
    }
    pub fn propose_usepackage(source: &str) -> Result<String, String> {
        if tikz_loaded(source) { return Err("TikZ is already explicitly loaded".into()); }
        unique_line_start(source, r"\begin{document}", true)?;
        Ok(format!("+ \\usepackage{{tikz}}{}", eol(source)))
    }
    pub fn add_usepackage(&mut self, source: &mut String) -> Result<(), String> {
        self.adopt_external(source);
        Self::propose_usepackage(source)?;
        let at = unique_line_start(source, r"\begin{document}", true)?;
        let after = format!("\\usepackage{{tikz}}{}", eol(source));
        self.apply_patch(source, SourcePatch {
            range: at..at, expected_old: String::new(), replacement: after,
            source_revision: self.revision,
        })?;
        self.status = "Added \\usepackage{tikz} via visible diff; Undo available".into();
        Ok(())
    }
    pub fn propose_library(source: &str, library: &str) -> Result<String, String> {
        if library != "arrows.meta" {
            return Err("Only C-catalogue arrows.meta is supported in this B visual adapter".into());
        }
        if library_loaded(source, library) {
            return Err(format!("Library {library} already loaded"));
        }
        unique_line_start(source, r"\begin{document}", true)?;
        Ok(format!("+ \\usetikzlibrary{{{library}}}{}", eol(source)))
    }
    pub fn add_library(&mut self, source: &mut String, library: &str) -> Result<(), String> {
        self.adopt_external(source);
        Self::propose_library(source, library)?;
        let at = unique_line_start(source, r"\begin{document}", true)?;
        let after = format!("\\usetikzlibrary{{{library}}}{}", eol(source));
        self.apply_patch(source, SourcePatch {
            range: at..at, expected_old: String::new(), replacement: after,
            source_revision: self.revision,
        })?;
        self.status = format!("Added \\usetikzlibrary{{{library}}}; Undo available");
        Ok(())
    }
    pub fn undo(&mut self, source: &mut String) -> Result<(), String> {
        let patch = self.undo.last().ok_or("No visual patch to undo")?.clone();
        if source_fingerprint(source) != patch.after_fingerprint {
            return Err("Undo refused: source edited since visual patch".into());
        }
        patch.inverse.apply(source, &mut self.revision).map_err(|e| e.to_string())?;
        self.undo.pop();
        self.source_fingerprint = source_fingerprint(source);
        if let Some(id) = self.selected {
            if let Ok(current) = one_owned(source, id) {
                self.active = Some(current.tool);
                self.draft = current.draft;
            } else {
                self.selected = None;
                self.draft = Draft::default();
            }
        }
        self.status = "Undo: reverted exact C-validated source range".into();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const SOURCE: &str = "\\documentclass{standalone}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta}\n\\begin{document}\n\\begin{tikzpicture}\n% user opaque code\n\\myMacro{x}\n\\end{tikzpicture}\n\\end{document}\n";

    #[test]
    fn all_six_tools_generate_reparse_and_preserve_other_source() {
        for tool in TOOLS {
            let mut src = SOURCE.to_owned();
            let mut session = Session::default();
            session.reset(&src);
            let line = session.insert(&mut src, tool, Draft::default()).unwrap();
            assert_eq!(line, 8);
            assert!(src.contains("% user opaque code\n\\myMacro{x}\n"));
            assert_eq!(owned(&src).len(), 1, "failed to roundtrip {}", tool.id());
            assert!(src.contains(spec(tool).syntax.split_whitespace().next().unwrap()));
            session.undo(&mut src).unwrap();
            assert_eq!(src, SOURCE);
        }
    }

    #[test]
    fn parameter_patch_is_only_one_line_and_can_be_undone_twice() {
        let mut src = SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&src);
        session
            .insert(&mut src, Tool::Rectangle, Draft::default())
            .unwrap();
        let inserted = src.clone();
        session.draft.end.x = 5.25;
        session.apply_parameters(&mut src).unwrap();
        assert!(src.contains("rectangle (5.25cm,2.00cm)"));
        assert!(src.contains("\\myMacro{x}"));
        session.undo(&mut src).unwrap();
        assert_eq!(src, inserted);
        assert_eq!(session.selected, Some(1));
        assert_eq!(session.draft.end.x, 3.0);
        session.undo(&mut src).unwrap();
        assert_eq!(src, SOURCE);
    }

    #[test]
    fn reopening_source_can_select_owned_line_without_rewriting_it() {
        let mut src = SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&src);
        session
            .insert(&mut src, Tool::Circle, Draft::default())
            .unwrap();
        let before = src.clone();
        let mut reopened = Session::default();
        reopened.reset(&src);
        assert_eq!(reopened.choose(&src, 1).unwrap(), 7);
        assert_eq!(reopened.active, Some(Tool::Circle));
        assert_eq!(src, before);
    }

    #[test]
    fn manually_edited_or_duplicated_marker_fails_closed() {
        let mut src = SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&src);
        session
            .insert(&mut src, Tool::Line, Draft::default())
            .unwrap();
        src = src.replace(r"\draw (1.00cm,1.00cm)", r"\draw[red] (1.00cm,1.00cm)");
        assert!(session.apply_parameters(&mut src).is_err());
        assert!(session.undo(&mut src).is_err());
        let mut clean = SOURCE.to_owned();
        session.reset(&clean);
        session
            .insert(&mut clean, Tool::Line, Draft::default())
            .unwrap();
        let line = owned(&clean)[0].text.clone();
        clean.push_str(&format!("{line}\n"));
        assert!(session.apply_parameters(&mut clean).is_err());
    }

    #[test]
    fn source_with_two_pictures_or_no_preamble_never_gets_rewritten() {
        let mut src = SOURCE.replace(
            "\\end{document}",
            "\\begin{tikzpicture}\n\\end{tikzpicture}\n\\end{document}",
        );
        let before = src.clone();
        let mut session = Session::default();
        assert!(
            session
                .insert(&mut src, Tool::Node, Draft::default())
                .is_err()
        );
        assert_eq!(src, before);
        let mut unknown = "\\begin{document}\n\\myMacro\n\\end{document}\n".to_owned();
        let original = unknown.clone();
        assert!(
            session
                .insert(&mut unknown, Tool::Line, Draft::default())
                .is_err()
        );
        assert_eq!(unknown, original);
    }

    #[test]
    fn explicit_usepackage_diff_crlf_and_undo_preserve_original_bytes() {
        let mut src = "\\documentclass{standalone}\r\n\\begin{document}\r\n\\begin{tikzpicture}\r\n\\end{tikzpicture}\r\n\\end{document}\r\n".to_owned();
        let before = src.clone();
        let mut session = Session::default();
        assert!(
            Session::propose_usepackage(&src)
                .unwrap()
                .contains("+ \\usepackage{tikz}")
        );
        session.add_usepackage(&mut src).unwrap();
        assert!(tikz_loaded(&src));
        assert!(src.contains("\\usepackage{tikz}\r\n"));
        session.undo(&mut src).unwrap();
        assert_eq!(src, before);
    }

    #[test]
    fn escaped_and_commented_packages_are_not_loaded() {
        assert!(!tikz_loaded("% \\usepackage{tikz}\n\\% \\usepackage{x}"));
        assert!(tikz_loaded("\\usepackage{tikz}\n"));
    }

    #[test]
    fn node_text_escaping_and_invalid_numbers_are_checked() {
        let mut draft = Draft {
            text: r"a_b".to_owned(),
            ..Default::default()
        };
        assert!(generate(Tool::Node, &draft, 1).unwrap().contains(r"a\_b"));
        draft.text = "Привет".into();
        assert!(generate(Tool::Node, &draft, 1).is_ok());
        draft.start.x = f32::NAN;
        assert!(generate(Tool::Line, &draft, 1).is_err());
    }
    #[test]
    fn c_catalog_is_only_source_of_tool_commands_and_help() {
        let cat = catalog();
        for tool in TOOLS {
            let draft = Draft::default();
            let values = parameter_values(tool, &draft).unwrap();
            let command = cat.generate(tool.catalog_id(), &values).unwrap();
            assert_eq!(
                generate(tool, &draft, 9).unwrap(),
                format!("  {}{MARKER}9:{}", command.source, tool.id())
            );
            let help = spec(tool);
            assert!(!help.help_ru.is_empty());
            assert!(!help.manual_section.is_empty());
            assert!(!help.parameter.is_empty());
            assert!(help.requirements.packages.iter().any(|x| x == "tikz"));
        }
    }

    #[test]
    fn arrow_needs_explicit_arrows_meta_and_diff_is_reversible() {
        let mut source = SOURCE.replace("\\usetikzlibrary{arrows.meta}\n", "");
        let original = source.clone();
        let mut session = Session::default();
        session.reset(&source);
        assert!(!library_loaded(&source, "arrows.meta"));
        assert!(session.insert(&mut source, Tool::Arrow, Draft::default()).is_err());
        let diff = Session::propose_library(&source, "arrows.meta").unwrap();
        assert!(diff.contains("+ \\usetikzlibrary{arrows.meta}"));
        session.add_library(&mut source, "arrows.meta").unwrap();
        assert!(library_loaded(&source, "arrows.meta"));
        session.undo(&mut source).unwrap();
        assert_eq!(source, original);
    }

    #[test]
    fn literal_imports_and_opaque_macro_imports_remain_distinct() {
        assert!(tikz_loaded(r"\usepackage[utf8]{graphics,tikz,amsmath}"));
        assert!(library_loaded(r"\usetikzlibrary{calc,arrows.meta}", "arrows.meta"));
        assert!(!library_loaded("% \\usetikzlibrary{arrows.meta}", "arrows.meta"));
        assert!(!tikz_loaded(r"\myLoadTikZ"));
    }

    #[test]
    fn c_owned_node_math_and_cyrillic_roundtrip_through_source() {
        let mut source = SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        let math = Draft { text: r"\alpha+\beta".into(), mode: "math".into(), ..Default::default() };
        session.insert(&mut source, Tool::Node, math).unwrap();
        assert!(source.contains("$\\alpha+\\beta$"));
        assert_eq!(owned(&source).len(), 1);
        session.undo(&mut source).unwrap();
        assert_eq!(source, SOURCE);
        let text = Draft { text: "Привет_мир".into(), ..Default::default() };
        session.insert(&mut source, Tool::Node, text).unwrap();
        assert!(source.contains(r"Привет\_мир"));
        assert_eq!(owned(&source).len(), 1);
        session.undo(&mut source).unwrap();
        assert_eq!(source, SOURCE);
    }

    #[test]
    fn shortest_parameter_patch_changes_no_unrelated_coordinates() {
        let mut source = SOURCE.replace("% user opaque code\n", "% user opaque code\nx=5.25cm\n");
        let mut session = Session::default();
        session.reset(&source);
        session.insert(&mut source, Tool::Rectangle, Draft::default()).unwrap();
        let created = source.clone();
        session.draft.end.x = 5.25;
        session.apply_parameters(&mut source).unwrap();
        assert!(source.contains("rectangle (5.25cm,2.00cm)"));
        assert!(source.contains("x=5.25cm\n"));
        session.undo(&mut source).unwrap();
        assert_eq!(source, created);
        session.undo(&mut source).unwrap();
        assert!(source.contains("% user opaque code\nx=5.25cm\n"));
    }

    #[test]
    fn manual_source_edit_invalidates_visual_undo_without_rewriting_it() {
        let mut source = SOURCE.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        session.insert(&mut source, Tool::Circle, Draft::default()).unwrap();
        source.push_str("% user's final source edit\n");
        assert!(session.undo(&mut source).is_err());
        let edited = source.clone();
        session.note_manual_edit(&source);
        assert!(!session.undo_available());
        assert_eq!(source, edited);
    }

}
