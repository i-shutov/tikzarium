//! Offline JSON-lines QA control over the real egui widgets and authoring Session.
//! No socket, native window, GPU, TeX execution, package installation or hidden file writes.
//! This is UNIT_EVENT testing, never proof of an actual Windows desktop.
#![allow(dead_code)]
#[path = "../studio_ui.rs"]
mod studio_ui;
#[path = "../tikz_authoring.rs"]
mod tikz_authoring;
#[path = "../tikz_canvas.rs"]
mod tikz_canvas;
#[path = "../tikz_libraries.rs"]
mod tikz_libraries;
#[path = "../ui_state.rs"]
mod ui_state;

use eframe::egui::{self, Event, Key, Modifiers, PointerButton, Pos2, Rect, Vec2};
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    io::{self, BufRead, Write},
    path::{Component, Path, PathBuf},
};
use tikz_authoring::{Draft, LibraryChange, Point, Session, TOOLS, Tool};
const INITIAL_SOURCE: &str = include_str!("../../../../examples/quickstart.tex");
const MAX_JSON_LINE_BYTES: usize = 1_048_576;
const MAX_SOURCE_BYTES: usize = 1_048_576;

fn string<'a>(v: &'a Value, k: &str) -> Result<&'a str, String> {
    v.get(k)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("{k}: string required"))
}
fn integer(v: &Value, k: &str) -> Result<u64, String> {
    v.get(k)
        .and_then(Value::as_u64)
        .ok_or_else(|| format!("{k}: unsigned integer required"))
}
fn truth(v: &Value, k: &str) -> Result<bool, String> {
    match v.get(k) {
        None => Ok(false),
        Some(Value::Bool(b)) => Ok(*b),
        _ => Err(format!("{k}: boolean required")),
    }
}
fn finite(v: &Value, k: &str) -> Result<f32, String> {
    let n = v
        .get(k)
        .and_then(Value::as_f64)
        .ok_or_else(|| format!("{k}: number required"))?;
    if !n.is_finite() || n.abs() > f64::from(f32::MAX) {
        return Err(format!("{k}: non-finite number"));
    }
    Ok(n as f32)
}
fn position(v: &Value, k: &str, scale: f32) -> Result<Pos2, String> {
    let a = v
        .get(k)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("{k}: [x,y] required"))?;
    if a.len() != 2 {
        return Err(format!("{k}: expected exactly two coordinates"));
    }
    let parse = |i: usize| -> Result<f32, String> {
        let n = a[i]
            .as_f64()
            .ok_or_else(|| format!("{k}[{i}]: number required"))?;
        if !n.is_finite() || n.abs() > f64::from(f32::MAX) {
            return Err(format!("{k}[{i}]: non-finite number"));
        }
        Ok(n as f32 / scale)
    };
    Ok(Pos2::new(parse(0)?, parse(1)?))
}
fn tool(id: &str) -> Result<Tool, String> {
    TOOLS
        .into_iter()
        .find(|t| t.id() == id || t.catalog_id() == id)
        .ok_or_else(|| format!("unknown TikZ catalogue tool: {id}"))
}
fn group_id(group: studio_ui::StudioGroup) -> &'static str {
    use studio_ui::StudioGroup;
    match group {
        StudioGroup::Geometry => "geometry",
        StudioGroup::Connections => "connections",
        StudioGroup::Text => "text",
        StudioGroup::Extensions => "extensions",
    }
}
fn observed(layout: &mut BTreeMap<String, Rect>, id: String, rect: Rect) {
    if rect.is_positive() {
        layout.insert(id, rect);
    }
}

struct Control {
    root: PathBuf,
    doc: tikzarium_core::Document,
    authoring: Session,
    ctx: egui::Context,
    width: u32,
    height: u32,
    dpi: f32,
    group: Option<studio_ui::StudioGroup>,
    anchor: Pos2,
    dock: studio_ui::StudioDock,
    inspector: bool,
    help_query: String,
    extension_filter: String,
    last_layout: BTreeMap<String, Rect>,
    frames: u64,
    notice: String,
}
impl Control {
    fn new(root: PathBuf) -> Result<Self, String> {
        let root = root.canonicalize().map_err(|e| format!("--root: {e}"))?;
        if !root.is_dir() {
            return Err("--root must be an existing directory".into());
        }
        let doc = tikzarium_core::Document::scratch(INITIAL_SOURCE);
        let mut authoring = Session::default();
        authoring.reset(&doc.source);
        Ok(Self {
            root,
            doc,
            authoring,
            ctx: egui::Context::default(),
            width: 1180,
            height: 720,
            dpi: 1.0,
            group: None,
            anchor: Pos2::ZERO,
            dock: studio_ui::StudioDock::Properties,
            inspector: true,
            help_query: String::new(),
            extension_filter: String::new(),
            last_layout: BTreeMap::new(),
            frames: 0,
            notice: String::new(),
        })
    }
    fn file(&self, name: &str) -> Result<PathBuf, String> {
        let path = Path::new(name);
        if name.is_empty()
            || path
                .components()
                .any(|c| !matches!(c, Component::Normal(_)))
        {
            return Err("file path must be relative to --root, with no '..' components".into());
        }
        let joined = self.root.join(path);
        let parent = joined.parent().ok_or("no parent")?;
        let actual_parent = parent.canonicalize().map_err(|e| format!("parent: {e}"))?;
        if !actual_parent.starts_with(&self.root) {
            return Err("file path escapes --root".into());
        }
        if joined.exists()
            && joined
                .symlink_metadata()
                .map_err(|e| e.to_string())?
                .file_type()
                .is_symlink()
        {
            return Err("file symlinks are not permitted in headless QA".into());
        }
        Ok(joined)
    }
    fn state(&self) -> Value {
        json!({
            "source":self.doc.source,
            "revision":self.authoring.source_revision(),
            "selected":self.authoring.selected,
            "tool":self.authoring.active.map(Tool::id),
            "draft":self.authoring.draft.values,
            "owned_count":tikz_authoring::owned(&self.doc.source).len(),
            "undo_available":self.authoring.undo_available(),
            "dirty":self.doc.dirty(),
            "file":self.doc.path.as_ref().map(|p|p.display().to_string()),
            "help":self.authoring.help,
            "dock":format!("{:?}",self.dock),
            "group":self.group.map(group_id),
            "frames":self.frames,
            "notice":self.notice,
            "viewport":{"width":self.width,"height":self.height,"dpi":self.dpi},
            "evidence":{"native_window":"NOT_RUN","gpu":"NOT_RUN","os_file_picker":"NOT_RUN",
                "external_xelatex_pdf":"NOT_RUN","physical_windows10":"NOT_RUN"}
        })
    }
    fn layout(&self) -> Value {
        let mut map = serde_json::Map::new();
        for (id, rect) in &self.last_layout {
            map.insert(id.clone(),json!({
                "points":[rect.min.x,rect.min.y,rect.max.x,rect.max.y],
                "pixels":[rect.min.x*self.dpi,rect.min.y*self.dpi,rect.max.x*self.dpi,rect.max.y*self.dpi],
                "center_px":[rect.center().x*self.dpi,rect.center().y*self.dpi]
            }));
        }
        Value::Object(map)
    }
    fn frame(&mut self, events: Vec<Event>, modifiers: Modifiers) -> Value {
        let ctx = self.ctx.clone();
        ctx.set_pixels_per_point(self.dpi);
        let raw = egui::RawInput {
            screen_rect: Some(Rect::from_min_size(
                Pos2::ZERO,
                Vec2::new(self.width as f32 / self.dpi, self.height as f32 / self.dpi),
            )),
            modifiers,
            events,
            ..Default::default()
        };
        // Fixed-width QA panels must not consume the entire logical
        // viewport at 200% DPI. Observe responsive real egui geometry.
        let logical_width = self.width as f32 / self.dpi;
        let source_width = (logical_width * 0.38).clamp(210.0, 375.0);
        let inspector_width = (logical_width * 0.24).clamp(180.0, 285.0);
        let mut layout = BTreeMap::new();
        let mut next_anchor = None;
        let mut notice = String::new();
        let source = &mut self.doc.source;
        let session = &mut self.authoring;
        let group = &mut self.group;
        let dock = &mut self.dock;
        let inspector = &mut self.inspector;
        let help_query = &mut self.help_query;
        let extension_filter = &mut self.extension_filter;
        let anchor = &mut self.anchor;
        let output = ctx.run(raw, |ctx| {
            let help_before = session.help;
            tikz_canvas::handle_help_shortcut(ctx, session);
            studio_ui::route_studio_help_toggle(help_before, session.help, dock, inspector);
            if let Some(line) = tikz_canvas::handle_visual_undo_shortcut(ctx, session, source) {
                notice = format!("visual source undo at line {line}");
            }
            egui::SidePanel::left("qa-source")
                .exact_width(source_width)
                .show(ctx, |ui| {
                    let source_panel = ui.max_rect();
                    observed(&mut layout, "panel.source".into(), source_panel);
                    ui.horizontal(|ui| {
                        ui.vertical(|ui| {
                            if let Some(pos) = studio_ui::show_group_rail_observed(
                                ui,
                                group,
                                true,
                                |kind, rect| {
                                    observed(
                                        &mut layout,
                                        format!("group.{}", group_id(kind)),
                                        rect,
                                    );
                                },
                            ) {
                                next_anchor = Some(studio_ui::palette_anchor_at_source_edge(
                                    source_panel,
                                    pos,
                                ));
                            }
                        });
                        ui.vertical(|ui| {
                            ui.label("Editable .tex");
                            let response = ui.add(
                                egui::TextEdit::multiline(source)
                                    .desired_width(270.0)
                                    .desired_rows(28)
                                    .id_salt("qa-tex-editor"),
                            );
                            observed(&mut layout, "source.editor".into(), response.rect);
                            tikz_canvas::observe_source_text_edit(&response, session, source);
                        });
                    });
                });
            if let Some(pos) = next_anchor {
                *anchor = pos;
            }
            if *inspector {
                egui::SidePanel::right("qa-inspector")
                    .exact_width(inspector_width)
                    .show(ctx, |ui| {
                        observed(&mut layout, "panel.inspector".into(), ui.max_rect());
                        ui.horizontal(|ui| {
                            for choice in studio_ui::StudioDock::ALL {
                                let response = ui.selectable_value(dock, choice, choice.label());
                                observed(
                                    &mut layout,
                                    format!("dock.{choice:?}").to_lowercase(),
                                    response.rect,
                                );
                            }
                        });
                        let mut undo = Rect::NOTHING;
                        let mut help = Rect::NOTHING;
                        let mut apply = Rect::NOTHING;
                        let _ = tikz_canvas::show_inspector_action_bar_frame(
                            ui,
                            session,
                            source,
                            Some(&mut undo),
                            Some(&mut help),
                            Some(&mut apply),
                        );
                        observed(&mut layout, "authoring.undo".into(), undo);
                        observed(&mut layout, "authoring.apply".into(), apply);
                        observed(&mut layout, "help.summary".into(), help);
                        ui.separator();
                        egui::ScrollArea::vertical().show(ui, |ui| match *dock {
                            studio_ui::StudioDock::Properties => {
                                let loaded = tikzarium_extensions::project_imports::inspect(source)
                                    .status(
                                        tikzarium_extensions::project_imports::ImportKind::Package,
                                        "tikz",
                                    );
                                let _ = tikz_canvas::show_inspector(
                                    ui,
                                    session,
                                    source,
                                    tikz_canvas::Capabilities {
                                        installed: false,
                                        loaded,
                                        engine_compatible: false,
                                        implemented: true,
                                    },
                                );
                            }
                            studio_ui::StudioDock::Libraries => {
                                let _ = tikz_libraries::show_library_panel_tracking(
                                    ui,
                                    session,
                                    source,
                                    false,
                                    &BTreeMap::new(),
                                    |target, rect| {
                                        use tikz_libraries::LibraryUiTarget;
                                        let id = match target {
                                            LibraryUiTarget::Panel => "library.panel".to_owned(),
                                            LibraryUiTarget::Entry(i) => format!(
                                                "library.entry.{}",
                                                tikz_authoring::catalog().libraries[i].name
                                            ),
                                            LibraryUiTarget::Action(i, action) => format!(
                                                "library.{}.{}",
                                                if action == LibraryChange::Connect {
                                                    "connect"
                                                } else {
                                                    "disconnect"
                                                },
                                                tikz_authoring::catalog().libraries[i].name
                                            ),
                                        };
                                        observed(&mut layout, id, rect);
                                    },
                                );
                            }
                            studio_ui::StudioDock::Help => {
                                tikz_libraries::show_help_search(ui, help_query);
                                studio_ui::show_context_help(ui, session);
                            }
                        });
                    });
            }
            egui::CentralPanel::default().show(ctx, |ui| {
                let loaded = tikzarium_extensions::project_imports::inspect(source).status(
                    tikzarium_extensions::project_imports::ImportKind::Package,
                    "tikz",
                );
                let (_, rect) = tikz_canvas::show_guide_frame_mode(
                    ui,
                    session,
                    source,
                    tikz_canvas::Capabilities {
                        installed: false,
                        loaded,
                        engine_compatible: false,
                        implemented: true,
                    },
                    None,
                    false,
                );
                observed(&mut layout, "guide.canvas".into(), rect);
            });
            let mut open_libraries = false;
            studio_ui::show_palette_observed(
                ctx,
                group,
                *anchor,
                session,
                studio_ui::PaletteData {
                    source,
                    extensions: &[],
                    filter: extension_filter,
                },
                &mut open_libraries,
                |kind, rect| {
                    observed(&mut layout, format!("tool.{}", kind.id()), rect);
                },
            );
            if open_libraries {
                *dock = studio_ui::StudioDock::Libraries;
                *inspector = true;
            }
        });
        self.frames += 1;
        self.last_layout = layout;
        if !notice.is_empty() {
            self.notice = notice;
        }
        json!({"frame":self.frames,"shape_count":output.shapes.len(),
            "layout":self.layout(),"revision":self.authoring.source_revision(),
            "owned_count":tikz_authoring::owned(&self.doc.source).len(),
            "note":"real production egui handlers in a virtual context; no OS window"})
    }
    fn click(&mut self, pos: Pos2, modifiers: Modifiers) -> Value {
        // egui routes pointer events using the previous frame's layer order.
        // A floating palette opened on release needs one pointer-hover frame
        // before it can receive an independent synthetic press. Never invoke
        // the semantic command directly as a fallback for a missed click.
        self.frame(vec![Event::PointerMoved(pos)], modifiers);
        self.frame(
            vec![
                Event::PointerMoved(pos),
                Event::PointerButton {
                    pos,
                    button: PointerButton::Primary,
                    pressed: true,
                    modifiers,
                },
            ],
            modifiers,
        );
        self.frame(
            vec![
                Event::PointerMoved(pos),
                Event::PointerButton {
                    pos,
                    button: PointerButton::Primary,
                    pressed: false,
                    modifiers,
                },
            ],
            modifiers,
        );
        // Return the settled coordinates (the click itself was already
        // delivered to the production egui Response handler).
        self.frame(vec![], modifiers)
    }
    fn handle(&mut self, req: &Value) -> Result<Value, String> {
        let op = string(req, "op")?;
        let result = match op {
            "api.describe" => {
                json!({"version":1,"protocol":"JSONL stdin/stdout","network_listener":false,
                "operations":["api.describe","state.snapshot","layout.snapshot","window.set","frame.run",
                    "input.click","input.pointer","input.drag","input.key","input.text",
                    "document.new","document.open","document.save","document.save_as",
                    "source.replace","tool.select","tool.insert","tool.gesture","object.select",
                    "parameter.set","parameter.apply","authoring.undo","library.connect",
                    "library.disconnect","help.search","view.dock"],
                "evidence":"UNIT_EVENT, not a real operating-system window or hardware renderer"})
            }
            "state.snapshot" => self.state(),
            "layout.snapshot" => self.layout(),
            "window.set" => {
                let w = integer(req, "width")?;
                let h = integer(req, "height")?;
                let dpi = finite(req, "dpi")?;
                if !(320..=7680).contains(&w)
                    || !(240..=4320).contains(&h)
                    || !(0.5..=4.0).contains(&dpi)
                {
                    return Err("window width 320..7680, height 240..4320, dpi 0.5..4".into());
                }
                self.width = w as u32;
                self.height = h as u32;
                self.dpi = dpi;
                self.frame(vec![], Modifiers::default())
            }
            "frame.run" => self.frame(vec![], Modifiers::default()),
            "input.click" => {
                let pos = if let Some(id) = req.get("target").and_then(Value::as_str) {
                    self.last_layout
                        .get(id)
                        .map(|r| r.center())
                        .ok_or_else(|| format!("no observed visible widget: {id}"))?
                } else {
                    position(req, "pos", self.dpi)?
                };
                let modifiers = Modifiers::default();
                let output = self.click(pos, modifiers);
                // The test API must not claim an action succeeded merely
                // because egui returned a nonempty widget rectangle.
                if let Some(name) = req.get("target").and_then(Value::as_str)
                    && let Some(tool_name) = name.strip_prefix("tool.")
                    && self.authoring.active.map(Tool::id) != Some(tool_name)
                {
                    return Err(format!(
                        "virtual click did not activate production tool: {name}"
                    ));
                }
                output
            }
            "input.pointer" => {
                let pos = position(req, "pos", self.dpi)?;
                let down = req
                    .get("down")
                    .and_then(Value::as_bool)
                    .ok_or("down must be boolean")?;
                self.frame(
                    vec![
                        Event::PointerMoved(pos),
                        Event::PointerButton {
                            pos,
                            button: PointerButton::Primary,
                            pressed: down,
                            modifiers: Modifiers::default(),
                        },
                    ],
                    Modifiers::default(),
                )
            }
            "input.drag" => {
                let first = position(req, "from", self.dpi)?;
                let last = position(req, "to", self.dpi)?;
                let mods = Modifiers::default();
                self.frame(
                    vec![
                        Event::PointerMoved(first),
                        Event::PointerButton {
                            pos: first,
                            button: PointerButton::Primary,
                            pressed: true,
                            modifiers: mods,
                        },
                    ],
                    mods,
                );
                for step in 1..=4 {
                    let t = step as f32 / 4.0;
                    self.frame(vec![Event::PointerMoved(first + (last - first) * t)], mods);
                }
                self.frame(
                    vec![Event::PointerButton {
                        pos: last,
                        button: PointerButton::Primary,
                        pressed: false,
                        modifiers: mods,
                    }],
                    mods,
                )
            }
            "input.key" => {
                let key = match string(req, "key")?.to_ascii_lowercase().as_str() {
                    "f1" => Key::F1,
                    "escape" | "esc" => Key::Escape,
                    "z" => Key::Z,
                    "s" => Key::S,
                    "o" => Key::O,
                    "enter" => Key::Enter,
                    "tab" => Key::Tab,
                    "a" => Key::A,
                    "delete" => Key::Delete,
                    "backspace" => Key::Backspace,
                    "arrowleft" => Key::ArrowLeft,
                    "arrowright" => Key::ArrowRight,
                    "arrowup" => Key::ArrowUp,
                    "arrowdown" => Key::ArrowDown,
                    other => return Err(format!("unsupported key: {other}")),
                };
                let ctrl = truth(req, "ctrl")?;
                let command = truth(req, "command")?;
                let mods = Modifiers {
                    ctrl,
                    command: ctrl || command,
                    mac_cmd: command,
                    shift: truth(req, "shift")?,
                    alt: truth(req, "alt")?,
                    ..Default::default()
                };
                let pressed = req
                    .get("down")
                    .and_then(Value::as_bool)
                    .ok_or("down must be bool")?;
                self.frame(
                    vec![Event::Key {
                        key,
                        physical_key: None,
                        pressed,
                        repeat: false,
                        modifiers: mods,
                    }],
                    mods,
                )
            }
            "input.text" => {
                let text = string(req, "text")?;
                if text.len() > 4096 {
                    return Err("input.text exceeds 4096 bytes".into());
                }
                self.frame(vec![Event::Text(text.into())], Modifiers::default())
            }
            "document.new" => {
                let text = string(req, "source")?;
                if text.len() > MAX_SOURCE_BYTES {
                    return Err("source exceeds 1 MiB".into());
                }
                self.doc = tikzarium_core::Document::scratch(text);
                self.authoring.reset(&self.doc.source);
                self.group = None;
                self.last_layout.clear();
                self.state()
            }
            "document.open" => {
                let path = self.file(string(req, "path")?)?;
                let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
                if metadata.len() > MAX_SOURCE_BYTES as u64 {
                    return Err("file exceeds 1 MiB".into());
                }
                let doc = tikzarium_core::Document::load(path).map_err(|e| e.to_string())?;
                self.doc = doc;
                self.authoring.reset(&self.doc.source);
                self.group = None;
                self.last_layout.clear();
                self.state()
            }
            "document.save" => {
                self.doc.save().map_err(|e| e.to_string())?;
                self.state()
            }
            "document.save_as" => {
                let path = self.file(string(req, "path")?)?;
                if path.exists() && self.doc.path.as_ref() != Some(&path) {
                    return Err("save_as refuses to overwrite an unrelated existing file".into());
                }
                self.doc.save_to(path).map_err(|e| e.to_string())?;
                self.state()
            }
            "source.replace" => {
                if self.authoring.source_revision() != integer(req, "revision")? {
                    return Err("stale source revision; no mutation".into());
                }
                let source = string(req, "source")?;
                if source.len() > MAX_SOURCE_BYTES {
                    return Err("source exceeds 1 MiB".into());
                }
                self.doc.source = source.into();
                self.authoring.note_manual_source_edit(&self.doc.source);
                self.state()
            }
            "tool.select" => {
                self.authoring.select_tool(tool(string(req, "tool")?)?);
                self.state()
            }
            "tool.insert" | "tool.gesture" => {
                let tool = tool(string(req, "tool")?)?;
                let mut draft = if op == "tool.gesture" {
                    let a = position(req, "from", 1.0)?;
                    let b = position(req, "to", 1.0)?;
                    Draft::from_gesture(
                        tool,
                        Point::new(a.x, a.y),
                        Point::new(b.x, b.y),
                        &Draft::for_tool(tool),
                    )
                } else {
                    Draft::for_tool(tool)
                };
                if let Some(obj) = req.get("values") {
                    let values = obj.as_object().ok_or("values must be a JSON object")?;
                    if values.len() > 64 {
                        return Err("too many parameters".into());
                    }
                    for (k, v) in values {
                        let text = v.as_str().ok_or("parameter values must be strings")?;
                        if text.len() > 2048 {
                            return Err("parameter exceeds 2048 bytes".into());
                        }
                        draft.values.insert(k.clone(), text.into());
                    }
                }
                self.authoring.insert(&mut self.doc.source, tool, draft)?;
                self.state()
            }
            "object.select" => {
                self.authoring
                    .choose(&self.doc.source, integer(req, "id")?)?;
                self.state()
            }
            "parameter.set" => {
                if self.authoring.selected.is_none() {
                    return Err("no owned object selected".into());
                }
                let name = string(req, "name")?;
                let value = string(req, "value")?;
                if name.len() > 128 || value.len() > 2048 {
                    return Err("parameter too large".into());
                }
                self.authoring
                    .draft
                    .values
                    .insert(name.into(), value.into());
                self.state()
            }
            "parameter.apply" => {
                self.authoring.apply_parameters(&mut self.doc.source)?;
                self.state()
            }
            "authoring.undo" => {
                self.authoring.undo(&mut self.doc.source)?;
                self.state()
            }
            "library.connect" | "library.disconnect" => {
                let name = string(req, "name")?;
                let action = if op == "library.connect" {
                    LibraryChange::Connect
                } else {
                    LibraryChange::Disconnect
                };
                self.authoring
                    .change_library(&mut self.doc.source, name, action)?;
                self.state()
            }
            "help.search" => {
                let query = string(req, "query")?;
                let hits =
                    tikzarium_extensions::help_search::search(tikz_authoring::catalog(), query);
                json!({"hits":hits.iter().take(100).map(|entry|json!({
                    "id":entry.id(),"title":entry.title(),"syntax":entry.syntax(),
                    "description_ru":entry.description_ru(),"example":entry.example()
                })).collect::<Vec<_>>()})
            }
            "view.dock" => {
                self.dock = match string(req, "dock")? {
                    "properties" => studio_ui::StudioDock::Properties,
                    "libraries" => studio_ui::StudioDock::Libraries,
                    "help" => studio_ui::StudioDock::Help,
                    _ => return Err("dock must be properties/libraries/help".into()),
                };
                self.inspector = true;
                self.frame(vec![], Modifiers::default())
            }
            other => return Err(format!("unknown operation: {other}")),
        };
        Ok(result)
    }
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = std::env::args_os().skip(1).collect::<Vec<_>>();
    if args.len() != 2 || args[0] != "--root" {
        eprintln!("usage: tikzarium-qa-control --root EXISTING_DIRECTORY");
        std::process::exit(2);
    }
    let root = PathBuf::from(&args[1]);
    let mut control = Control::new(root).map_err(io::Error::other)?;
    let stdin = io::stdin();
    let mut output = io::stdout().lock();
    for line in stdin.lock().lines() {
        let line = line?;
        let response = if line.len() > MAX_JSON_LINE_BYTES {
            json!({"ok":false,"error":"JSONL line exceeds 1 MiB"})
        } else {
            match serde_json::from_str::<Value>(&line) {
                Ok(value) => match control.handle(&value) {
                    Ok(result) => json!({"ok":true,"result":result}),
                    Err(error) => json!({"ok":false,"error":error}),
                },
                Err(error) => json!({"ok":false,"error":format!("invalid JSON: {error}")}),
            }
        };
        serde_json::to_writer(&mut output, &response)?;
        output.write_all(b"\n")?;
        output.flush()?;
    }
    Ok(())
}
#[cfg(test)]
mod api_tests {
    use super::*;
    #[test]
    fn virtual_window_reports_actual_native_egui_widget_rectangles() {
        let root = tempfile::tempdir().unwrap();
        let mut qa = Control::new(root.path().into()).unwrap();
        let output = qa
            .handle(&json!({"op":"window.set","width":1366,"height":768,"dpi":1.0}))
            .unwrap();
        assert!(output["layout"]["group.geometry"]["pixels"].is_array());
        assert!(output["layout"]["guide.canvas"]["center_px"].is_array());
        qa.handle(&json!({"op":"input.click","target":"group.geometry"}))
            .unwrap();
        let info = qa.layout();
        assert!(info["tool.line"]["center_px"].is_array());
        let tool_rect = qa.last_layout.get("tool.line").copied().unwrap();
        let source_rect = qa.last_layout.get("panel.source").copied().unwrap();
        let inspector_rect = qa.last_layout.get("panel.inspector").copied().unwrap();
        qa.handle(&json!({"op":"input.click","target":"tool.line"}))
            .unwrap();
        assert_eq!(
            qa.authoring.active,
            Some(Tool::Line),
            "virtual click did not route: popup group={:?} anchor={:?} tool_rect={:?} source={:?} inspector={:?} window={}x{} dpi={} after_layout={:?}",
            qa.group,
            qa.anchor,
            tool_rect,
            source_rect,
            inspector_rect,
            qa.width,
            qa.height,
            qa.dpi,
            qa.last_layout.get("tool.line")
        );
        assert_eq!(qa.authoring.selected, None);
        let scaled = qa
            .handle(&json!({"op":"window.set","width":1366,"height":768,"dpi":2.0}))
            .unwrap();
        assert!(scaled["layout"]["group.geometry"]["pixels"].is_array());
        assert!(scaled["layout"]["guide.canvas"]["center_px"].is_array());
    }
    #[test]
    fn all_six_semantic_actions_are_real_source_transactions() {
        let root = tempfile::tempdir().unwrap();
        let mut qa = Control::new(root.path().into()).unwrap();
        let initial = String::from(
            "\\documentclass{standalone}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta}\n\\begin{document}\n\\begin{tikzpicture}\n% opaque\n\\myMacro{Кириллица}\n\\end{tikzpicture}\n\\end{document}\n",
        );
        qa.handle(&json!({"op":"document.new","source":initial}))
            .unwrap();
        for t in TOOLS {
            qa.handle(&json!({"op":"tool.gesture","tool":t.id(),"from":[0.0,0.0],"to":[2.0,1.0]}))
                .unwrap();
        }
        assert_eq!(tikz_authoring::owned(&qa.doc.source).len(), 6);
        qa.handle(&json!({"op":"authoring.undo"})).unwrap();
        assert_eq!(tikz_authoring::owned(&qa.doc.source).len(), 5);
        assert!(qa.doc.source.contains("\\myMacro{Кириллица}"));
    }
    #[test]
    fn stale_source_and_unrelated_file_overwrite_are_rejected() {
        let root = tempfile::tempdir().unwrap();
        let mut qa = Control::new(root.path().into()).unwrap();
        let source = qa.doc.source.clone();
        assert!(
            qa.handle(&json!({"op":"source.replace","revision":1,"source":"MUTATED"}))
                .is_err()
        );
        assert_eq!(qa.doc.source, source);
        std::fs::write(root.path().join("occupied.tex"), b"DO NOT TOUCH").unwrap();
        assert!(
            qa.handle(&json!({"op":"document.save_as","path":"occupied.tex"}))
                .is_err()
        );
        assert_eq!(
            std::fs::read(root.path().join("occupied.tex")).unwrap(),
            b"DO NOT TOUCH"
        );
        assert!(
            qa.handle(&json!({"op":"document.save_as","path":"../outside.tex"}))
                .is_err()
        );
    }
}
