//! Raw egui event coverage for views onto the authoritative source buffer.
use super::*;
use source_editing::{BODY_ID, HistoryAction, PREAMBLE_ID, Region, SourceHistory};

fn key(key: egui::Key, modifiers: egui::Modifiers) -> egui::Event {
    egui::Event::Key {
        key,
        physical_key: None,
        pressed: true,
        repeat: false,
        modifiers,
    }
}

struct Workspace {
    source: String,
    editor: source_editor::SourceEditor,
    preamble_cache: source_highlight::SourceHighlightCache,
    body_cache: source_highlight::SourceHighlightCache,
    history: SourceHistory,
    input_queue: source_editing::SourceInputQueue,
    revision: u64,
    preamble_open: bool,
    soft_wrap: bool,
    active: &'static str,
}

impl Workspace {
    fn new(source: String) -> Self {
        let mut history = SourceHistory::default();
        history.reset(0);
        Self {
            source,
            editor: Default::default(),
            preamble_cache: Default::default(),
            body_cache: Default::default(),
            history,
            input_queue: Default::default(),
            revision: 0,
            preamble_open: false,
            soft_wrap: true,
            active: BODY_ID,
        }
    }
    fn select(&mut self, range: std::ops::Range<usize>) {
        self.editor.refresh(&self.source);
        self.editor.selection = Some(range);
        self.editor.focus_editor = true;
    }
}

#[derive(Default)]
struct Frame {
    cursor: egui::text::CCursorRange,
    preamble_cursor: Option<egui::text::CCursorRange>,
    galley_pos: egui::Pos2,
    numbers: Vec<(String, egui::Pos2, egui::Rect)>,
}

fn frame(ctx: &egui::Context, workspace: &mut Workspace, events: Vec<egui::Event>) -> Frame {
    let mut result = Frame::default();
    let mut raw = egui::RawInput {
        screen_rect: Some(egui::Rect::from_min_size(
            egui::Pos2::ZERO,
            egui::vec2(360.0, 1000.0),
        )),
        events,
        ..Default::default()
    };
    // Match App::raw_input_hook: dispatch before egui derives pointer/key state.
    for action in workspace.input_queue.prepare(ctx, &mut raw, true) {
        if let Some(caret) = workspace
            .history
            .apply(action, &mut workspace.source, workspace.revision)
            .unwrap()
        {
            workspace.revision += 1;
            workspace.editor.refresh(&workspace.source);
            workspace.editor.selection = Some(caret..caret);
            workspace.editor.focus_editor = true;
            source_editing::clear_native_histories(ctx);
        }
    }
    let output = ctx.run(raw, |ctx| {
        egui::CentralPanel::default().show(ctx, |ui| {
            let before = workspace.source.clone();
            workspace
                .editor
                .toolbar(ui, &workspace.source, workspace.revision);
            let mut sections = source_sections::analyze_source(&workspace.source);
            if workspace.preamble_open && sections.kind == source_sections::SectionKind::Document {
                let mut region = Region {
                    id: PREAMBLE_ID,
                    bytes: sections.preamble_range.clone(),
                    first_character: 0,
                    first_line: 1,
                };
                let output = show_source_region(
                    ui,
                    &mut workspace.source,
                    &mut region,
                    &mut workspace.editor,
                    &mut workspace.preamble_cache,
                    SourceViewStyle {
                        soft_wrap: workspace.soft_wrap,
                        theme: UiTheme::Midnight,
                        font_size: 14.0,
                        focus_owner: workspace.active == PREAMBLE_ID,
                    },
                );
                result.preamble_cursor = output.state.cursor.char_range();
                if output.response.has_focus() {
                    workspace.active = PREAMBLE_ID;
                }
                sections = source_sections::analyze_source(&workspace.source);
                ui.separator();
            }
            let mut region = if sections.kind == source_sections::SectionKind::Document {
                Region {
                    id: BODY_ID,
                    bytes: sections.body_range,
                    first_character: sections.boundary_char_offset.unwrap(),
                    first_line: sections.first_body_line,
                }
            } else {
                Region::whole(&workspace.source)
            };
            let style = SourceViewStyle {
                soft_wrap: workspace.soft_wrap,
                theme: UiTheme::Midnight,
                font_size: 14.0,
                focus_owner: workspace.active == region.id,
            };
            let output = egui::ScrollArea::vertical()
                .auto_shrink([false, false])
                .show(ui, |ui| {
                    show_source_region(
                        ui,
                        &mut workspace.source,
                        &mut region,
                        &mut workspace.editor,
                        &mut workspace.body_cache,
                        style,
                    )
                })
                .inner;
            if output.response.has_focus() {
                workspace.active = region.id;
            }
            result.cursor = output.state.cursor.char_range().unwrap_or_default();
            result.galley_pos = output.galley_pos;
            if before != workspace.source {
                workspace.history.record(
                    &before,
                    &workspace.source,
                    workspace.revision,
                    workspace.revision + 1,
                );
                workspace.revision += 1;
            }
        });
    });
    result.numbers = output
        .shapes
        .iter()
        .filter_map(|shape| {
            if let egui::Shape::Text(text) = &shape.shape {
                let value = text.galley.text();
                if !value.is_empty() && value.bytes().all(|b| b.is_ascii_digit()) {
                    return Some((value.to_owned(), text.pos, shape.clip_rect));
                }
            }
            None
        })
        .collect();
    result
}

fn fixture() -> (String, String) {
    (
        "% Преамбула α🙂\r\n\\begin{document} % начало\r\n".into(),
        "Жук🙂\r\nsecond λ\r\n".into(),
    )
}

#[test]
fn body_selection_caret_goto_and_gutter_use_full_unicode_crlf_document_coordinates() {
    let (prefix, body) = fixture();
    let original = format!("{prefix}{body}");
    let first = prefix.chars().count();
    assert!(
        prefix.len() > first,
        "fixture distinguishes byte and character offsets"
    );
    let ctx = egui::Context::default();
    let mut workspace = Workspace::new(original.clone());
    let initial = frame(&ctx, &mut workspace, vec![]);
    let numbers: Vec<_> = initial.numbers.iter().map(|(n, _, _)| n.as_str()).collect();
    assert_eq!(
        numbers,
        ["3", "4", "5"],
        "gutter starts at the body's full-source line"
    );
    workspace.select(first + 1..first + 4);
    let selected = frame(&ctx, &mut workspace, vec![]);
    assert_eq!(selected.cursor.as_sorted_char_range(), 1..4);
    assert_eq!(
        workspace.editor.caret,
        first + selected.cursor.primary.index
    );
    assert!(ctx.memory(|m| m.has_focus(egui::Id::new(BODY_ID))));
    workspace.select(first + 2..first + 2);
    frame(&ctx, &mut workspace, vec![]);
    let moved = frame(
        &ctx,
        &mut workspace,
        vec![key(egui::Key::ArrowRight, egui::Modifiers::NONE)],
    );
    assert_eq!(moved.cursor.primary.index, 3);
    assert_eq!(workspace.editor.caret, first + 3);
    assert_eq!(workspace.editor.cursor_label(), "3:4");

    workspace.editor.open_goto();
    frame(&ctx, &mut workspace, vec![]);
    frame(&ctx, &mut workspace, vec![egui::Event::Text("4".into())]);
    let jumped = frame(
        &ctx,
        &mut workspace,
        vec![key(egui::Key::Enter, egui::Modifiers::NONE)],
    );
    assert_eq!(jumped.cursor.primary.index, "Жук🙂\r\n".chars().count());
    assert_eq!(workspace.editor.cursor_label(), "4:1");
    assert!(ctx.memory(|m| m.has_focus(egui::Id::new(BODY_ID))));
    assert_eq!(workspace.source.as_bytes(), original.as_bytes());
}

#[test]
fn native_body_typing_and_selection_replace_preserve_every_preamble_byte() {
    let (prefix, body) = fixture();
    let ctx = egui::Context::default();
    let mut workspace = Workspace::new(format!("{prefix}{body}"));
    frame(&ctx, &mut workspace, vec![]);
    let first = prefix.chars().count();
    workspace.select(first + 2..first + 2);
    frame(&ctx, &mut workspace, vec![]);
    let inserted = frame(&ctx, &mut workspace, vec![egui::Event::Text("🌿".into())]);
    assert_eq!(workspace.source, format!("{prefix}Жу🌿к🙂\r\nsecond λ\r\n"));
    assert_eq!(inserted.cursor.primary.index, 3);
    assert_eq!(
        &workspace.source.as_bytes()[..prefix.len()],
        prefix.as_bytes()
    );
    workspace.select(first + 1..first + 4);
    frame(&ctx, &mut workspace, vec![]);
    frame(&ctx, &mut workspace, vec![egui::Event::Text("два".into())]);
    assert_eq!(workspace.source, format!("{prefix}Ждва🙂\r\nsecond λ\r\n"));
    assert_eq!(
        &workspace.source.as_bytes()[..prefix.len()],
        prefix.as_bytes()
    );
    assert_eq!(workspace.revision, 2);
}

#[test]
fn exact_fold_boundary_navigation_is_owned_by_body_even_with_preamble_open() {
    let (prefix, body) = fixture();
    let first = prefix.chars().count();
    let ctx = egui::Context::default();
    let mut workspace = Workspace::new(format!("{prefix}{body}"));
    workspace.preamble_open = true;
    frame(&ctx, &mut workspace, vec![]);
    workspace.active = PREAMBLE_ID;
    workspace.select(first..first);
    let routed = frame(&ctx, &mut workspace, vec![]);
    assert_eq!(routed.cursor.primary.index, 0);
    assert!(
        workspace.editor.selection.is_none(),
        "the body consumes the jump"
    );
    assert!(
        ctx.memory(|m| m.has_focus(egui::Id::new(BODY_ID))),
        "preamble must not consume its exclusive end boundary"
    );
    assert_eq!(workspace.editor.caret, first);
    assert_eq!(workspace.editor.cursor_label(), "3:1");
    assert!(
        routed
            .preamble_cursor
            .is_none_or(|cursor| cursor.primary.index != first),
        "unfocused preamble can have no cursor, but must not consume the boundary"
    );
}

#[test]
fn native_edits_share_undo_redo_across_views_and_delimiter_deletion() {
    let (prefix, body) = fixture();
    let initial = format!("{prefix}{body}");
    let ctx = egui::Context::default();
    let mut workspace = Workspace::new(initial.clone());
    workspace.preamble_open = true;
    frame(&ctx, &mut workspace, vec![]);
    let alpha = initial[..initial.find('α').unwrap()].chars().count();
    workspace.select(alpha..alpha + 1);
    frame(&ctx, &mut workspace, vec![]);
    frame(&ctx, &mut workspace, vec![egui::Event::Text("β🌿".into())]);
    let preamble_edited = workspace.source.clone();
    assert_eq!(preamble_edited, initial.replace('α', "β🌿"));
    let first = source_sections::analyze_source(&workspace.source)
        .boundary_char_offset
        .unwrap();
    workspace.select(first..first);
    frame(&ctx, &mut workspace, vec![]);
    frame(
        &ctx,
        &mut workspace,
        vec![egui::Event::Text("body edit: ".into())],
    );
    let body_edited = workspace.source.clone();
    assert_eq!(
        body_edited,
        preamble_edited.replace("Жук", "body edit: Жук")
    );
    let opening_byte = workspace.source.find("\\begin{document}").unwrap();
    let opening = workspace.source[..opening_byte].chars().count();
    let boundary = source_sections::analyze_source(&workspace.source)
        .boundary_char_offset
        .unwrap();
    workspace.select(opening..boundary);
    frame(&ctx, &mut workspace, vec![]);
    frame(
        &ctx,
        &mut workspace,
        vec![key(egui::Key::Backspace, egui::Modifiers::NONE)],
    );
    let delimiter_deleted = workspace.source.clone();
    assert_eq!(
        source_sections::analyze_source(&delimiter_deleted).kind,
        source_sections::SectionKind::Fragment
    );
    assert_eq!(
        delimiter_deleted,
        format!(
            "{}{}",
            &body_edited[..opening_byte],
            &body_edited[source_sections::analyze_source(&body_edited)
                .boundary_byte_offset
                .unwrap()..]
        )
    );
    // Request whole-source focus when the split disappears, as the app does.
    workspace.active = source_editing::WHOLE_ID;
    workspace.editor.focus_editor = true;
    frame(&ctx, &mut workspace, vec![]);
    for expected in [&body_edited, &preamble_edited, &initial] {
        frame(
            &ctx,
            &mut workspace,
            vec![key(egui::Key::Z, egui::Modifiers::COMMAND)],
        );
        assert_eq!(
            &workspace.source, expected,
            "one shortcut reverses exactly one transaction"
        );
    }
    for expected in [&preamble_edited, &body_edited, &delimiter_deleted] {
        frame(
            &ctx,
            &mut workspace,
            vec![key(
                egui::Key::Z,
                egui::Modifiers::COMMAND | egui::Modifiers::SHIFT,
            )],
        );
        assert_eq!(&workspace.source, expected);
    }
    assert!(
        workspace
            .history
            .available(HistoryAction::Undo, workspace.revision)
    );
    assert!(
        !workspace
            .history
            .available(HistoryAction::Redo, workspace.revision)
    );
}

#[test]
fn real_body_horizontal_scroll_moves_code_but_keeps_global_gutter_fixed() {
    let (prefix, _) = fixture();
    let original = format!("{prefix}{}\r\nsecond line", "0123456789".repeat(100));
    let ctx = egui::Context::default();
    let mut workspace = Workspace::new(original.clone());
    workspace.soft_wrap = false;
    let before = frame(&ctx, &mut workspace, vec![]);
    let number_before = before
        .numbers
        .iter()
        .find(|(n, _, _)| n == "3")
        .unwrap()
        .clone();
    let pointer = egui::pos2(180.0, before.galley_pos.y + 6.0);
    frame(
        &ctx,
        &mut workspace,
        vec![
            egui::Event::PointerMoved(pointer),
            egui::Event::MouseWheel {
                unit: egui::MouseWheelUnit::Point,
                delta: egui::vec2(-240.0, 0.0),
                modifiers: egui::Modifiers::NONE,
            },
        ],
    );
    for _ in 0..30 {
        frame(&ctx, &mut workspace, vec![]);
    }
    let scrolled = frame(&ctx, &mut workspace, vec![]);
    let number_scrolled = scrolled.numbers.iter().find(|(n, _, _)| n == "3").unwrap();
    assert!(
        scrolled.galley_pos.x < before.galley_pos.x - 20.0,
        "real native wheel must scroll the body code"
    );
    assert_eq!(number_before.1.x, number_scrolled.1.x);
    assert_eq!(number_before.2.min.x, number_scrolled.2.min.x);
    assert_eq!(number_before.2.max.x, number_scrolled.2.max.x);
    assert!(
        number_scrolled.2.right() < before.galley_pos.x,
        "gutter owns a separate fixed clip"
    );
    assert_eq!(workspace.source, original);
}

#[test]
fn queued_text_then_undo_reverses_new_typing_before_any_prior_transaction() {
    let (prefix, _) = fixture();
    let initial = format!("{prefix}abc");
    let first = prefix.chars().count();
    let ctx = egui::Context::default();
    let mut workspace = Workspace::new(initial.clone());
    frame(&ctx, &mut workspace, vec![]);
    workspace.select(first..first);
    frame(&ctx, &mut workspace, vec![]);
    frame(&ctx, &mut workspace, vec![egui::Event::Text("Q".into())]);
    let prior = workspace.source.clone();
    assert_eq!(prior, format!("{prefix}Qabc"));
    frame(
        &ctx,
        &mut workspace,
        vec![
            egui::Event::Text("x".into()),
            key(egui::Key::Z, egui::Modifiers::COMMAND),
        ],
    );
    assert_eq!(
        workspace.source,
        format!("{prefix}Qxabc"),
        "text prefix is recorded before deferred undo"
    );
    frame(&ctx, &mut workspace, vec![]);
    assert_eq!(
        workspace.source, prior,
        "deferred undo reverses x, preserving the older Q transaction"
    );
    frame(
        &ctx,
        &mut workspace,
        vec![key(egui::Key::Z, egui::Modifiers::COMMAND)],
    );
    assert_eq!(workspace.source, initial);
}

#[test]
fn queued_undo_text_undo_keeps_native_order_and_restores_undo_caret_before_typing() {
    let (prefix, _) = fixture();
    let initial = format!("{prefix}abc");
    let first = prefix.chars().count();
    let ctx = egui::Context::default();
    let mut workspace = Workspace::new(initial.clone());
    frame(&ctx, &mut workspace, vec![]);
    workspace.select(first..first);
    frame(&ctx, &mut workspace, vec![]);
    frame(&ctx, &mut workspace, vec![egui::Event::Text("Q".into())]);
    assert_eq!(workspace.source, format!("{prefix}Qabc"));
    frame(
        &ctx,
        &mut workspace,
        vec![
            key(egui::Key::Z, egui::Modifiers::COMMAND),
            egui::Event::Text("x".into()),
            key(egui::Key::Z, egui::Modifiers::COMMAND),
        ],
    );
    assert_eq!(
        workspace.source, initial,
        "undo is applied before deferred typing"
    );
    frame(&ctx, &mut workspace, vec![]);
    assert_eq!(
        workspace.source,
        format!("{prefix}xabc"),
        "undo restores the transaction's insertion caret before following text input"
    );
    frame(&ctx, &mut workspace, vec![]);
    assert_eq!(
        workspace.source, initial,
        "second undo reverses x on the deferred frame"
    );
    assert!(
        !workspace
            .history
            .available(HistoryAction::Undo, workspace.revision)
    );
    frame(
        &ctx,
        &mut workspace,
        vec![key(
            egui::Key::Z,
            egui::Modifiers::COMMAND | egui::Modifiers::SHIFT,
        )],
    );
    assert_eq!(
        workspace.source,
        format!("{prefix}xabc"),
        "redo follows the new branch, not the abandoned Q edit"
    );
}

#[test]
fn empty_body_boundary_at_document_eof_still_belongs_to_body() {
    let (prefix, _) = fixture();
    let first = prefix.chars().count();
    let ctx = egui::Context::default();
    let mut workspace = Workspace::new(prefix.clone());
    workspace.preamble_open = true;
    frame(&ctx, &mut workspace, vec![]);
    workspace.active = PREAMBLE_ID;
    workspace.select(first..first);
    let routed = frame(&ctx, &mut workspace, vec![]);
    assert_eq!(routed.cursor.primary.index, 0);
    assert!(
        ctx.memory(|m| m.has_focus(egui::Id::new(BODY_ID))),
        "an empty body owns its insertion caret at document EOF"
    );
    assert_eq!(workspace.editor.caret, first);
    frame(&ctx, &mut workspace, vec![egui::Event::Text("x".into())]);
    assert_eq!(workspace.source, format!("{prefix}x"));
    assert!(ctx.memory(|m| m.has_focus(egui::Id::new(BODY_ID))));
}

fn shell_frame(ctx: &egui::Context, app: &mut TikzariumApp, events: Vec<egui::Event>) {
    let mut raw = egui::RawInput {
        screen_rect: Some(egui::Rect::from_min_size(
            egui::Pos2::ZERO,
            egui::vec2(520.0, 1000.0),
        )),
        events,
        ..Default::default()
    };
    eframe::App::raw_input_hook(app, ctx, &mut raw);
    let _ = ctx.run(raw, |ctx| {
        egui::CentralPanel::default().show(ctx, |ui| app.show_source_editor(ui));
    });
}

fn shell_app(ctx: &egui::Context, source: &str) -> TikzariumApp {
    let mut app = TikzariumApp::with_preferences(ctx, UiPreferences::default(), None);
    app.document = Document::scratch(source);
    app.authoring.reset(source);
    app.source_history.reset(app.authoring.source_revision());
    app.source_preamble_open = true;
    app
}

#[test]
fn full_shell_typing_after_preamble_eof_migrates_to_body_without_reversing_input() {
    let (prefix, _) = fixture();
    let first = prefix.chars().count();
    let ctx = egui::Context::default();
    let mut app = shell_app(&ctx, &format!("{prefix}body"));
    shell_frame(&ctx, &mut app, vec![]);
    // Native preamble TextEdit can place a caret in its trailing empty row.
    // Install that actual local state, rather than a global boundary jump
    // (whose correct destination is already the body).
    let id = egui::Id::new(PREAMBLE_ID);
    let mut state = egui::text_edit::TextEditState::load(&ctx, id).unwrap();
    state
        .cursor
        .set_char_range(Some(egui::text::CCursorRange::one(
            egui::text::CCursor::new(first),
        )));
    state.store(&ctx, id);
    ctx.memory_mut(|memory| memory.request_focus(id));
    app.source_active_region = PREAMBLE_ID;
    app.source_editor.caret = first;
    shell_frame(&ctx, &mut app, vec![egui::Event::Text("x".into())]);
    assert_eq!(app.document.source, format!("{prefix}xbody"));
    assert_eq!(app.source_active_region, BODY_ID);
    assert!(ctx.memory(|m| m.has_focus(egui::Id::new(BODY_ID))));
    shell_frame(&ctx, &mut app, vec![egui::Event::Text("y".into())]);
    assert_eq!(
        app.document.source,
        format!("{prefix}xybody"),
        "second frame typing follows x at the migrated body caret"
    );
    assert_eq!(app.source_editor.caret, first + 2);
    assert_eq!(
        &app.document.source.as_bytes()[..prefix.len()],
        prefix.as_bytes()
    );
}

#[test]
fn full_shell_empty_body_owns_boundary_focus_and_native_input() {
    let (prefix, _) = fixture();
    let first = prefix.chars().count();
    let ctx = egui::Context::default();
    let mut app = shell_app(&ctx, &prefix);
    shell_frame(&ctx, &mut app, vec![]);
    app.source_active_region = PREAMBLE_ID;
    app.source_editor.refresh(&app.document.source);
    app.source_editor.selection = Some(first..first);
    app.source_editor.focus_editor = true;
    shell_frame(&ctx, &mut app, vec![]);
    assert_eq!(app.source_active_region, BODY_ID);
    assert!(ctx.memory(|m| m.has_focus(egui::Id::new(BODY_ID))));
    shell_frame(&ctx, &mut app, vec![egui::Event::Text("xy".into())]);
    assert_eq!(app.document.source, format!("{prefix}xy"));
    assert_eq!(app.source_editor.caret, first + 2);
}
