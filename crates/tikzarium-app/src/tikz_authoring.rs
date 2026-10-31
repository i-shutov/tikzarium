//! B07: narrow TikZ-native source edits for a first egui authoring vertical.
//! This is NOT a TeX parser, a PDF coordinate mapper, or a geometry engine.
//! The source owns every generated object; unknown code is never rewritten.

use std::ops::Range;

pub const MARKER: &str = " % tikzarium:b07:";
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
    fn from_id(id: &str) -> Option<Self> {
        TOOLS.into_iter().find(|tool| tool.id() == id)
    }
}

/// Transitional B-side view until C publishes a versioned primitive schema.
/// One entry drives toolbar, inspector, hints and help; never infer from a
/// package being installed that an arbitrary TikZ expression is editable.
pub struct ToolSpec {
    pub tool: Tool,
    pub title: &'static str,
    pub explanation: &'static str,
    pub syntax: &'static str,
    pub parameters: &'static str,
    pub defaults: &'static str,
    pub effect: &'static str,
    pub example: &'static str,
    pub source: &'static str,
}

pub const SPECS: [ToolSpec; 6] = [
    ToolSpec {
        tool: Tool::Line,
        title: "Линия",
        explanation: "Прямой отрезок TikZ: путь из двух декартовых координат.",
        syntax: r"\draw (x1,y1) -- (x2,y2);",
        parameters: "x1, y1, x2, y2: decimal, сантиметры в примере; координаты TikZ без явной единицы используют текущие x/y-векторы.",
        defaults: "TikZ defaults зависят от picture/options — UNKNOWN; B07 задаёт только новые координаты.",
        effect: "Создаёт stroke без наконечника.",
        example: r"\draw (0,0) -- (2,1);",
        source: "PGF/TikZ Manual §14.2.1 Straight Lines: https://tikz.dev/tikz-paths",
    },
    ToolSpec {
        tool: Tool::Arrow,
        title: "Стрелка",
        explanation: "Прямая линия с наконечником, выбранным стилем TikZ.",
        syntax: r"\draw[->] (x1,y1) -- (x2,y2);",
        parameters: "x1, y1, x2, y2: decimal, базовые единицы координат; ->: arrow-tip shorthand.",
        defaults: "Конкретный тип наконечника зависит от текущих стилей — UNKNOWN.",
        effect: "Рисует путь с наконечником в конце.",
        example: r"\draw[->] (0,0) -- (2,1);",
        source: "PGF/TikZ Manual §16.2 Arrow Tips: https://tikz.dev/tikz-arrows",
    },
    ToolSpec {
        tool: Tool::Rectangle,
        title: "Прямоугольник",
        explanation: "TikZ rectangle между противоположными углами.",
        syntax: r"\draw (x1,y1) rectangle (x2,y2);",
        parameters: "x1, y1, x2, y2: decimal, относительные координаты выбранной picture.",
        defaults: "Толщина/цвет линий наследуются от стилей — UNKNOWN.",
        effect: "Замкнутый прямоугольный путь.",
        example: r"\draw (0,0) rectangle (2,1);",
        source: "PGF/TikZ Manual §14.4 Rectangle Operation: https://tikz.dev/tikz-paths",
    },
    ToolSpec {
        tool: Tool::Circle,
        title: "Окружность",
        explanation: "Окружность TikZ вокруг центра с явным радиусом.",
        syntax: r"\draw (x,y) circle[radius=r cm];",
        parameters: "x,y: координаты; radius: положительное число с единицей cm (B07).",
        defaults: "B07: radius=1cm при одиночном клике; это НЕ документированный default TikZ.",
        effect: "Рисует окружность, без заливки.",
        example: r"\draw (1,1) circle[radius=1cm];",
        source: "PGF/TikZ Manual §14.6 Circle and Ellipse: https://tikz.dev/tikz-paths",
    },
    ToolSpec {
        tool: Tool::Node,
        title: "Узел",
        explanation: "Текстовый узел \node с опорной точкой at.",
        syntax: r"\node at (x,y) {text};",
        parameters: "x,y: координаты; text: простой Unicode-текст без TeX-спецсимволов в B07.",
        defaults: "B07: text=Text; якорь/шрифт/внутренние отступы наследуются из TeX — UNKNOWN.",
        effect: "Создаёт текстовый TikZ node.",
        example: r"\node at (1,1) {Text};",
        source: "PGF/TikZ Manual §17.2.1 Node Syntax: https://tikz.dev/tikz-shapes",
    },
    ToolSpec {
        tool: Tool::Cubic,
        title: "Кривая Bézier",
        explanation: "Кубический путь TikZ с двумя контрольными точками.",
        syntax: r"\draw (x1,y1) .. controls (c1x,c1y) and (c2x,c2y) .. (x2,y2);",
        parameters: "Четыре пары координат; B07 bend (cm) лишь задаёт обе контрольные точки по шаблону.",
        defaults: "B07 bend=0.8cm (локальная настройка генератора, не default TikZ).",
        effect: "Кубическая кривая между двумя точками; контрольные точки явно записаны в источнике.",
        example: r"\draw (0,0) .. controls (1,1) and (2,1) .. (3,0);",
        source: "PGF/TikZ Manual §14.3 Cubic Curve-To: https://tikz.dev/tikz-paths",
    },
];

pub fn spec(tool: Tool) -> &'static ToolSpec {
    SPECS
        .iter()
        .find(|item| item.tool == tool)
        .expect("built-in tool")
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
}
impl Default for Draft {
    fn default() -> Self {
        Self {
            start: Point::new(1.0, 1.0),
            end: Point::new(3.0, 2.0),
            bend: 0.8,
            text: "Text".into(),
        }
    }
}

fn safe_number(value: f32) -> bool {
    value.is_finite() && value.abs() <= 1000.0
}
fn safe_text(text: &str) -> bool {
    !text.is_empty()
        && text.chars().count() <= 80
        && !text
            .chars()
            .any(|c| c.is_control() || "#$%&_{}~^\\".contains(c))
}
pub fn generate(tool: Tool, draft: &Draft, id: u64) -> Result<String, String> {
    if ![
        draft.start.x,
        draft.start.y,
        draft.end.x,
        draft.end.y,
        draft.bend,
    ]
    .into_iter()
    .all(safe_number)
    {
        return Err("Coordinates must be finite and within ±1000".into());
    }
    if tool == Tool::Node && !safe_text(&draft.text) {
        return Err("Node text must be plain Unicode (1–80 chars; TeX special characters require source editing)".into());
    }
    let a = draft.start;
    let b = draft.end;
    let source = match tool {
        Tool::Line => format!(
            r"  \draw ({:.2},{:.2}) -- ({:.2},{:.2});",
            a.x, a.y, b.x, b.y
        ),
        Tool::Arrow => format!(
            r"  \draw[->] ({:.2},{:.2}) -- ({:.2},{:.2});",
            a.x, a.y, b.x, b.y
        ),
        Tool::Rectangle => format!(
            r"  \draw ({:.2},{:.2}) rectangle ({:.2},{:.2});",
            a.x, a.y, b.x, b.y
        ),
        Tool::Circle => {
            let radius = ((b.x - a.x).hypot(b.y - a.y)).max(0.1);
            format!(
                r"  \draw ({:.2},{:.2}) circle[radius={:.2}cm];",
                a.x, a.y, radius
            )
        }
        Tool::Node => format!(r"  \node at ({:.2},{:.2}) {{{}}};", a.x, a.y, draft.text),
        Tool::Cubic => {
            let dx = (b.x - a.x) / 3.0;
            format!(
                r"  \draw ({:.2},{:.2}) .. controls ({:.2},{:.2}) and ({:.2},{:.2}) .. ({:.2},{:.2});",
                a.x,
                a.y,
                a.x + dx,
                a.y + draft.bend,
                b.x - dx,
                b.y + draft.bend,
                b.x,
                b.y
            )
        }
    };
    Ok(format!("{source}{MARKER}{id}:{}", tool.id()))
}

fn read_point(raw: &str) -> Option<Point> {
    let (x, y) = raw.split_once(',')?;
    let point = Point::new(x.parse().ok()?, y.parse().ok()?);
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
fn parse_line(line: &str, start: usize, number: usize) -> Option<Owned> {
    let (command, tag) = line.split_once(MARKER)?;
    let (id, kind) = tag.split_once(':')?;
    let id: u64 = id.parse().ok()?;
    let tool = Tool::from_id(kind)?;
    let coords = points(command)?;
    let mut draft = Draft::default();
    match tool {
        Tool::Line | Tool::Arrow | Tool::Rectangle if coords.len() == 2 => {
            draft.start = coords[0];
            draft.end = coords[1];
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
            let text = command.split(" {").nth(1)?.strip_suffix("};")?;
            draft.start = coords[0];
            draft.text = text.into();
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
        if c == '%' && backslashes % 2 == 0 {
            return &line[..i];
        }
        backslashes = if c == '\\' { backslashes + 1 } else { 0 };
    }
    line
}

pub fn tikz_loaded(source: &str) -> bool {
    source.lines().map(unescaped_comment).any(|line| {
        let compact: String = line.chars().filter(|c| !c.is_whitespace()).collect();
        [r"\usepackage{tikz}", r"\RequirePackage{tikz}"]
            .iter()
            .any(|token| compact.starts_with(token))
    })
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

#[derive(Clone, Debug)]
struct Patch {
    before: String,
    after: String,
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
    undo: Vec<Patch>,
}

impl Session {
    pub fn reset(&mut self, source: &str) {
        self.active = None;
        self.selected = None;
        self.draft = Draft::default();
        self.drag_start = None;
        self.undo.clear();
        self.next_id = owned(source)
            .iter()
            .map(|item| item.id)
            .max()
            .unwrap_or(0)
            .saturating_add(1)
            .max(1);
        self.status = "Source-first: arbitrary macros remain untouched".into();
    }

    pub fn undo_available(&self) -> bool {
        !self.undo.is_empty()
    }

    pub fn choose(&mut self, source: &str, id: u64) -> Result<usize, String> {
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
        if !tikz_loaded(source) {
            return Err(
                "TikZ not explicitly loaded; use the proposed \\usepackage diff first".into(),
            );
        }
        let at = insertion_offset(source)?;
        let id = self.next_id.max(1);
        if source.contains(&format!("{MARKER}{id}:")) {
            return Err("Ownership ID conflict".into());
        }
        let line = generate(tool, &draft, id)?;
        let after = format!("{}{}", line, eol(source));
        let number = source[..at].bytes().filter(|b| *b == b'\n').count() + 1;
        source.insert_str(at, &after);
        self.undo.push(Patch {
            before: String::new(),
            after,
        });
        self.next_id = id.saturating_add(1);
        self.active = Some(tool);
        self.selected = Some(id);
        self.draft = draft;
        self.status = format!(
            "Inserted native TikZ {} · Build XeLaTeX to update exact PDF",
            tool.id()
        );
        Ok(number)
    }

    pub fn apply_parameters(&mut self, source: &mut String) -> Result<usize, String> {
        let id = self.selected.ok_or("Select one B07-owned command first")?;
        let old = one_owned(source, id)?;
        let after = generate(old.tool, &self.draft, id)?;
        if old.text != after {
            source.replace_range(old.range, &after);
            self.undo.push(Patch {
                before: old.text,
                after,
            });
        }
        self.status =
            "Changed only selected B07-owned source line; exact PDF requires XeLaTeX Build".into();
        Ok(old.line)
    }

    pub fn propose_usepackage(source: &str) -> Result<String, String> {
        if tikz_loaded(source) {
            return Err("TikZ is already explicitly loaded".into());
        }
        unique_line_start(source, r"\begin{document}", true)?;
        Ok(format!("+ \\usepackage{{tikz}}{}", eol(source)))
    }

    pub fn add_usepackage(&mut self, source: &mut String) -> Result<(), String> {
        Self::propose_usepackage(source)?;
        let at = unique_line_start(source, r"\begin{document}", true)?;
        let after = format!("\\usepackage{{tikz}}{}", eol(source));
        source.insert_str(at, &after);
        self.undo.push(Patch {
            before: String::new(),
            after,
        });
        self.status = "Added \\usepackage{tikz}; Undo visual restores it. Build to verify.".into();
        Ok(())
    }

    pub fn undo(&mut self, source: &mut String) -> Result<(), String> {
        let patch = self.undo.last().ok_or("No visual patch to undo")?.clone();
        let mut hits = source.match_indices(&patch.after);
        let Some((at, _)) = hits.next() else {
            return Err("Undo refused: owned source was edited since patch".into());
        };
        if hits.next().is_some() {
            return Err("Undo refused: ambiguous source match".into());
        }
        source.replace_range(at..at + patch.after.len(), &patch.before);
        self.undo.pop();
        self.selected = None;
        self.status = "Undo: reverted only the exact B07 source patch".into();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const SOURCE: &str = "\\documentclass{standalone}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\n% user opaque code\n\\myMacro{x}\n\\end{tikzpicture}\n\\end{document}\n";

    #[test]
    fn all_six_tools_generate_reparse_and_preserve_other_source() {
        for tool in TOOLS {
            let mut src = SOURCE.to_owned();
            let mut session = Session::default();
            session.reset(&src);
            let line = session.insert(&mut src, tool, Draft::default()).unwrap();
            assert_eq!(line, 7);
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
        assert!(src.contains("rectangle (5.25,2.00)"));
        assert!(src.contains("\\myMacro{x}"));
        session.undo(&mut src).unwrap();
        assert_eq!(src, inserted);
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
        src = src.replace(r"\draw (1.00,1.00)", r"\draw[red] (1.00,1.00)");
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
    fn unsafe_node_text_and_invalid_numbers_are_refused() {
        let mut draft = Draft::default();
        draft.text = r"a_b".to_owned();
        assert!(generate(Tool::Node, &draft, 1).is_err());
        draft.text = "Привет".into();
        assert!(generate(Tool::Node, &draft, 1).is_ok());
        draft.start.x = f32::NAN;
        assert!(generate(Tool::Line, &draft, 1).is_err());
    }
}
