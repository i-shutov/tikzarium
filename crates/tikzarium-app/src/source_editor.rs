//! UX1 editor controls. Search/replace never interprets TeX, regex or $ captures.
use crate::source_navigation::{self as navigation, ReplacementPreview};
use eframe::egui;
use std::ops::Range;

#[derive(Default)]
pub struct SourceEditor {
    pub highlight: crate::source_highlight::SourceHighlightCache,
    pub find_open: bool,
    goto_open: bool,
    replace_open: bool,
    query: String,
    replacement: String,
    goto: String,
    cached_source: String,
    cached_query: String,
    matches: Vec<Range<usize>>,
    char_matches: Vec<Range<usize>>,
    lines: Vec<navigation::PhysicalLine>,
    char_count: usize,
    pub caret: usize,
    scroll_target: Option<usize>,
    active: Option<usize>,
    focus_find: bool,
    focus_goto: bool,
    pub focus_editor: bool,
    pub selection: Option<Range<usize>>,
    preview: Option<ReplacementPreview>,
    pub apply: Option<ReplacementPreview>,
    message: String,
    ime_composing: bool,
    ime_frame: bool,
}

impl SourceEditor {
    pub fn open_find(&mut self) {
        self.find_open = true;
        self.goto_open = false;
        self.focus_find = true;
    }
    pub fn open_goto(&mut self) {
        self.goto_open = true;
        self.find_open = false;
        self.focus_goto = true;
    }
    pub fn cursor_label(&self) -> String {
        let (line, column) = self.line_column(self.caret);
        format!("{line}:{column}")
    }
    pub fn shortcuts(&mut self, ui: &egui::Ui) {
        if !ui.is_enabled() {
            return;
        }
        self.ime_frame = false;
        ui.input(|i| {
            for event in &i.events {
                if let egui::Event::Ime(event) = event {
                    self.ime_frame = true;
                    match event {
                        egui::ImeEvent::Preedit(text) => self.ime_composing = !text.is_empty(),
                        egui::ImeEvent::Enabled => self.ime_composing = true,
                        egui::ImeEvent::Commit(_) | egui::ImeEvent::Disabled => {
                            self.ime_composing = false
                        }
                    }
                }
            }
        });
        if self.ime_composing || self.ime_frame {
            return;
        }
        let command = egui::Modifiers::COMMAND;
        if ui.input_mut(|i| i.consume_key(command, egui::Key::F)) {
            self.find_open = true;
            self.goto_open = false;
            self.focus_find = true;
        }
        if ui.input_mut(|i| i.consume_key(command, egui::Key::G)) {
            self.goto_open = true;
            self.find_open = false;
            self.focus_goto = true;
        }
        if (self.find_open || self.goto_open)
            && ui.input_mut(|i| i.consume_key(egui::Modifiers::NONE, egui::Key::Escape))
        {
            self.close();
        }
    }
    fn close(&mut self) {
        self.find_open = false;
        self.goto_open = false;
        self.preview = None;
        self.focus_editor = true;
    }
    pub fn refresh(&mut self, source: &str) {
        if self.cached_source != source || self.cached_query != self.query || self.lines.is_empty()
        {
            if self.cached_source != source || self.lines.is_empty() {
                self.preview = None;
                self.lines = navigation::physical_lines(source);
                self.char_count = source.chars().count();
            }
            self.selection = None;
            self.matches = navigation::matches(source, &self.query);
            self.char_matches = navigation::char_ranges(source, &self.matches);
            self.cached_source = source.into();
            self.cached_query.clone_from(&self.query);
            self.active = None;
        }
    }
    fn navigate(&mut self, backwards: bool) {
        if self.matches.is_empty() {
            self.active = None;
            return;
        }
        let count = self.matches.len();
        let index = match self.active {
            Some(index) if backwards => (index + count - 1) % count,
            Some(index) => (index + 1) % count,
            None if backwards => count - 1,
            None => 0,
        };
        self.active = Some(index);
        self.selection = Some(self.char_matches[index].clone());
    }
    pub fn toolbar(&mut self, ui: &mut egui::Ui, source: &str, revision: u64) {
        self.shortcuts(ui);
        self.refresh(source);
        self.refresh(source);
        if self.find_open {
            ui.horizontal_wrapped(|ui| {
                ui.label("Найти:");
                let response = ui.add(
                    egui::TextEdit::singleline(&mut self.query)
                        .return_key(None)
                        .id_salt("source-find")
                        .desired_width(120.0)
                        .hint_text("Точный текст"),
                );
                if self.focus_find {
                    response.request_focus();
                    self.focus_find = false;
                }
                if response.changed() {
                    self.refresh(source);
                    self.navigate(false);
                    self.preview = None;
                }
                let enter = !self.ime_composing
                    && !self.ime_frame
                    && response.has_focus()
                    && ui.input_mut(|i| i.consume_key(egui::Modifiers::NONE, egui::Key::Enter));
                let shift_enter = !self.ime_composing
                    && !self.ime_frame
                    && response.has_focus()
                    && ui.input_mut(|i| i.consume_key(egui::Modifiers::SHIFT, egui::Key::Enter));
                if ui
                    .add_enabled(!self.matches.is_empty(), egui::Button::new("Назад"))
                    .on_hover_text("Предыдущее · Shift+Enter")
                    .clicked()
                    || (shift_enter && !response.changed())
                {
                    self.navigate(true);
                }
                if ui
                    .add_enabled(!self.matches.is_empty(), egui::Button::new("Далее"))
                    .on_hover_text("Следующее · Enter")
                    .clicked()
                    || (enter && !response.changed())
                {
                    self.navigate(false);
                }
                ui.label(format!(
                    "{} / {}",
                    self.active.map_or(0, |i| i + 1),
                    self.matches.len()
                ));
                ui.checkbox(&mut self.replace_open, "Заменить");
                if ui
                    .small_button("×")
                    .on_hover_text("Закрыть · Escape; вернуться в исходник")
                    .clicked()
                {
                    self.close();
                }
            });
            if self.replace_open {
                ui.horizontal_wrapped(|ui| {
                    ui.label("На:");
                    if ui
                        .add(
                            egui::TextEdit::singleline(&mut self.replacement)
                                .id_salt("source-replace")
                                .desired_width(120.0),
                        )
                        .changed()
                    {
                        self.preview = None;
                    }
                    if ui
                        .add_enabled(self.active.is_some(), egui::Button::new("Заменить…"))
                        .clicked()
                    {
                        self.preview = Some(ReplacementPreview::new(
                            source,
                            revision,
                            &self.query,
                            &self.replacement,
                            self.active,
                        ));
                    }
                    if ui
                        .add_enabled(!self.matches.is_empty(), egui::Button::new("Все…"))
                        .clicked()
                    {
                        self.preview = Some(ReplacementPreview::new(
                            source,
                            revision,
                            &self.query,
                            &self.replacement,
                            None,
                        ));
                    }
                });
            }
            if let Some(preview) = self.preview.as_ref() {
                let count = preview.count();
                ui.horizontal_wrapped(|ui| {
                    ui.label(format!("Предпросмотр: замен будет {count}."));
                    if ui.button("Применить замену").clicked() {
                        self.apply = self.preview.take();
                    }
                    if ui.button("Отмена").clicked() {
                        self.preview = None;
                    }
                });
            }
        }
        if self.goto_open {
            ui.horizontal_wrapped(|ui| {
                ui.label(format!(
                    "Строка 1–{}:",
                    navigation::physical_lines(source).len()
                ));
                let response = ui.add(
                    egui::TextEdit::singleline(&mut self.goto)
                        .return_key(None)
                        .id_salt("source-goto")
                        .desired_width(72.0),
                );
                if self.focus_goto {
                    response.request_focus();
                    self.focus_goto = false;
                }
                let enter = !self.ime_composing
                    && !self.ime_frame
                    && response.has_focus()
                    && ui.input_mut(|i| i.consume_key(egui::Modifiers::NONE, egui::Key::Enter));
                if ui.button("Перейти").clicked() || enter {
                    let lines = navigation::physical_lines(source);
                    if let Some(line) = self
                        .goto
                        .trim()
                        .parse::<usize>()
                        .ok()
                        .and_then(|n| n.checked_sub(1))
                        .and_then(|n| lines.get(n))
                    {
                        self.selection = Some(line.character..line.character);
                        self.message.clear();
                        self.close();
                    } else {
                        self.message = "Такой строки нет в исходнике".into();
                    }
                }
                if ui.small_button("×").clicked() {
                    self.close();
                }
            });
        }
        if !self.message.is_empty() {
            ui.colored_label(ui.visuals().warn_fg_color, &self.message);
        }
    }
    pub fn error(&mut self, message: &str) {
        self.message = message.into();
    }
    #[cfg(test)]
    pub fn finish_frame(
        &mut self,
        ui: &egui::Ui,
        output: &mut egui::text_edit::TextEditOutput,
        source: &str,
        gutter: egui::Rect,
        editor_clip: egui::Rect,
        background: egui::layers::ShapeIdx,
    ) {
        self.finish_interaction(ui, output, source);
        self.paint(ui, output, gutter, editor_clip, background);
    }
    #[cfg(test)]
    pub fn finish_interaction(
        &mut self,
        ui: &egui::Ui,
        output: &mut egui::text_edit::TextEditOutput,
        source: &str,
    ) {
        self.finish_region_interaction(ui, output, source, 0, source.chars().count(), true);
    }

    /// Translate a local TextEdit cursor into the single document's scalar
    /// coordinates. Search, F1 and diagnostics always use global coordinates.
    pub fn finish_region_interaction(
        &mut self,
        ui: &egui::Ui,
        output: &mut egui::text_edit::TextEditOutput,
        source: &str,
        first: usize,
        count: usize,
        focus_owner: bool,
    ) {
        // Native input can invalidate all cached byte ranges before painting.
        self.refresh(source);
        let end = first + count;
        let navigation_pending = self.navigation_target().is_some();
        let owns_end = output.response.id != egui::Id::new(crate::source_editing::PREAMBLE_ID);
        let owns_character = |character: usize| {
            character >= first
                && (character < end || owns_end && end == self.char_count && character == end)
        };
        let routed_selection = self
            .selection
            .as_ref()
            .is_some_and(|r| owns_character(r.start) && r.end <= end);
        if routed_selection && let Some(range) = self.selection.take() {
            output
                .state
                .cursor
                .set_char_range(Some(egui::text::CCursorRange::two(
                    egui::text::CCursor::new(range.start - first),
                    egui::text::CCursor::new(range.end - first),
                )));
            output.state.clone().store(ui.ctx(), output.response.id);
            self.scroll_target = Some(range.start);
        }
        if self.scroll_target.is_some_and(owns_character)
            && let Some(character) = self.scroll_target.take()
        {
            // This runs inside the horizontal code viewport, so navigation
            // reveals a no-wrap match without moving the fixed gutter.
            ui.scroll_to_rect(
                crate::source_caret_target(&output.galley, output.galley_pos, character - first),
                Some(egui::Align::Center),
            );
            ui.ctx().request_repaint();
        }
        if self.focus_editor && (routed_selection || focus_owner && !navigation_pending) {
            self.focus_editor = false;
            output.response.request_focus();
        }
        if output.response.has_focus() || routed_selection || first == 0 && focus_owner {
            self.caret = first
                + output
                    .state
                    .cursor
                    .char_range()
                    .map_or(0, |r| r.primary.index);
        }
    }
    pub fn navigation_target(&self) -> Option<usize> {
        self.selection
            .as_ref()
            .map(|range| range.start)
            .or(self.scroll_target)
    }
    #[cfg(test)]
    pub fn external_jump(&mut self, caret: usize, scroll_target: usize) {
        self.caret = caret;
        self.scroll_target = Some(scroll_target);
    }
    pub fn document_changed(&mut self) {
        self.preview = None;
        self.apply = None;
        self.selection = None;
        self.matches.clear();
        self.char_matches.clear();
        self.lines.clear();
        self.cached_source.clear();
        self.active = None;
        self.caret = 0;
        self.scroll_target = None;
    }
    pub fn line_count(&self) -> usize {
        self.lines.len().max(1)
    }
    fn line_column(&self, character: usize) -> (usize, usize) {
        let character = character.min(self.char_count);
        let line = self
            .lines
            .partition_point(|line| line.character <= character)
            .saturating_sub(1);
        (
            line + 1,
            character - self.lines.get(line).map_or(0, |line| line.character) + 1,
        )
    }
    #[cfg(test)]
    pub fn paint(
        &self,
        ui: &egui::Ui,
        output: &egui::text_edit::TextEditOutput,
        gutter: egui::Rect,
        editor_clip: egui::Rect,
        background: egui::layers::ShapeIdx,
    ) {
        paint_navigation(
            ui,
            output,
            (&self.lines, 1),
            gutter,
            editor_clip,
            background,
            if self.find_open {
                &self.char_matches
            } else {
                &[]
            },
        );
    }

    pub fn paint_region(
        &self,
        ui: &egui::Ui,
        output: &egui::text_edit::TextEditOutput,
        geometry: (egui::Rect, egui::Rect, egui::layers::ShapeIdx),
        first_character: usize,
        first_line: usize,
    ) {
        let count = output.galley.text().chars().count();
        let last = first_character + count;
        let lines: Vec<_> = self
            .lines
            .iter()
            .filter(|line| {
                line.character >= first_character
                    && (line.character < last
                        || output.response.id != egui::Id::new(crate::source_editing::PREAMBLE_ID)
                            && line.character == last)
            })
            .map(|line| navigation::PhysicalLine {
                character: line.character - first_character,
            })
            .collect();
        let matches: Vec<_> = if self.find_open {
            self.char_matches
                .iter()
                .filter(|range| range.start < last && range.end > first_character)
                .map(|range| {
                    range.start.max(first_character) - first_character
                        ..range.end.min(last) - first_character
                })
                .collect()
        } else {
            Vec::new()
        };
        paint_navigation(
            ui,
            output,
            (&lines, first_line),
            geometry.0,
            geometry.1,
            geometry.2,
            &matches,
        );
    }
}

/// Paint using the actual galley row geometry. Every physical line has exactly
/// one number; wrapped continuations have no new line numbers.
fn paint_navigation(
    ui: &egui::Ui,
    output: &egui::text_edit::TextEditOutput,
    line_context: (&[navigation::PhysicalLine], usize),
    gutter: egui::Rect,
    editor_clip: egui::Rect,
    background: egui::layers::ShapeIdx,
    matches: &[Range<usize>],
) {
    let (lines, first_line) = line_context;
    let cursor = output
        .state
        .cursor
        .char_range()
        .map(|r| r.primary.index)
        .unwrap_or(0);
    let current = lines
        .partition_point(|line| line.character <= cursor)
        .saturating_sub(1);
    let selection = output
        .state
        .cursor
        .char_range()
        .map(|r| r.as_sorted_char_range());
    let mut shapes = vec![egui::Shape::rect_filled(
        output.response.rect.intersect(editor_clip),
        0.0,
        ui.visuals().text_edit_bg_color(),
    )];
    let mut row_start = 0;
    let mut match_index = 0;
    let mut physical = 0;
    for row in &output.galley.rows {
        while physical + 1 < lines.len() && lines[physical + 1].character <= row_start {
            physical += 1;
        }
        let top = output.galley_pos.y + row.pos.y;
        let bottom = top + row.size.y;
        let visible = bottom >= ui.clip_rect().top() && top <= ui.clip_rect().bottom();
        if visible {
            if lines
                .get(physical)
                .is_some_and(|line| line.character == row_start)
            {
                let color = if physical == current {
                    ui.visuals().strong_text_color()
                } else {
                    ui.visuals().weak_text_color()
                };
                ui.painter()
                    .with_clip_rect(gutter.intersect(ui.clip_rect()))
                    .text(
                        egui::pos2(gutter.right() - 5.0, top),
                        egui::Align2::RIGHT_TOP,
                        format!("{}", physical + first_line),
                        egui::FontId::monospace(12.0),
                        color,
                    );
            }
            if physical == current {
                shapes.push(egui::Shape::rect_filled(
                    egui::Rect::from_min_max(
                        egui::pos2(gutter.left(), top),
                        egui::pos2(editor_clip.right(), bottom),
                    ),
                    0.0,
                    ui.visuals().selection.bg_fill.gamma_multiply(0.16),
                ));
            }
        }
        let row_end = row_start + row.char_count_excluding_newline();
        while match_index < matches.len() && matches[match_index].end <= row_start {
            match_index += 1;
        }
        if visible {
            for range in matches[match_index..]
                .iter()
                .take_while(|range| range.start < row_end)
            {
                let start = range.start.max(row_start);
                let end = range.end.min(row_end);
                if start < end
                    && !selection
                        .as_ref()
                        .is_some_and(|s| s.start < end && start < s.end)
                {
                    let left = row.x_offset(start - row_start) + output.galley_pos.x;
                    let right = row.x_offset(end - row_start) + output.galley_pos.x;
                    shapes.push(egui::Shape::rect_filled(
                        egui::Rect::from_min_max(egui::pos2(left, top), egui::pos2(right, bottom))
                            .intersect(editor_clip),
                        1.0,
                        egui::Color32::from_rgba_unmultiplied(210, 155, 20, 70),
                    ));
                }
            }
        }
        row_start += row.char_count_including_newline();
    }
    ui.painter().set(background, egui::Shape::Vec(shapes));
}

/// Register both sides as explicit native undo points. The replacement is one
/// action, regardless of its number of matches, and cannot merge with typing.
#[cfg(test)]
pub fn apply_replacement(
    ctx: &egui::Context,
    source: &mut String,
    revision: u64,
    preview: &ReplacementPreview,
) -> Result<bool, &'static str> {
    let id = egui::Id::new("tikz-source-editor");
    let mut state = egui::text_edit::TextEditState::load(ctx, id).unwrap_or_default();
    let cursor = state.cursor.char_range().unwrap_or_default();
    let before = (cursor, source.clone());
    if !preview.apply(source, revision)? {
        return Ok(false);
    }
    let mut undoer = state.undoer();
    undoer.add_undo(&before);
    let mut cursor = cursor;
    let count = source.chars().count();
    cursor.primary.index = cursor.primary.index.min(count);
    cursor.secondary.index = cursor.secondary.index.min(count);
    state.cursor.set_char_range(Some(cursor));
    let after = (cursor, source.clone());
    undoer.feed_state(ctx.input(|i| i.time), &after);
    undoer.add_undo(&after);
    state.set_undoer(undoer);
    state.store(ctx, id);
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ui_theme::UiTheme;
    fn key(key: egui::Key, modifiers: egui::Modifiers) -> egui::Event {
        egui::Event::Key {
            key,
            physical_key: None,
            pressed: true,
            repeat: false,
            modifiers,
        }
    }
    fn frame(
        ctx: &egui::Context,
        editor: &mut SourceEditor,
        source: &mut String,
        reset: &mut bool,
        events: Vec<egui::Event>,
    ) -> egui::text::CCursorRange {
        let mut cursor = egui::text::CCursorRange::default();
        let _ = ctx.run(
            egui::RawInput {
                screen_rect: Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(460.0, 680.0),
                )),
                events,
                ..Default::default()
            },
            |ctx| {
                egui::CentralPanel::default().show(ctx, |ui| {
                    editor.toolbar(ui, source, 3);
                    let background = ui.painter().add(egui::Shape::Noop);
                    let mut output = crate::show_source_text_edit_cached(
                        ui,
                        source,
                        reset,
                        true,
                        UiTheme::Midnight,
                        14.0,
                        &mut editor.highlight,
                    );
                    let gutter = egui::Rect::from_min_size(
                        output.response.rect.min,
                        egui::vec2(30.0, output.response.rect.height()),
                    );
                    editor.finish_frame(
                        ui,
                        &mut output,
                        source,
                        gutter,
                        ui.clip_rect(),
                        background,
                    );
                    cursor = output.state.cursor.char_range().unwrap_or_default();
                });
            },
        );
        cursor
    }
    #[test]
    fn real_egui_find_goto_escape_preserve_unicode_crlf_and_focus() {
        let ctx = egui::Context::default();
        let mut editor = SourceEditor::default();
        let mut source = "Ж🦀\r\nsecond Ж🦀\r\n".to_owned();
        let before = source.clone();
        let mut reset = false;
        frame(&ctx, &mut editor, &mut source, &mut reset, vec![]);
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::F, egui::Modifiers::COMMAND)],
        );
        let selected = frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![egui::Event::Text("Ж🦀".into())],
        );
        assert_eq!(editor.matches.len(), 2);
        assert_eq!(selected.as_sorted_char_range(), 0..2);
        let selected = frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::Enter, egui::Modifiers::NONE)],
        );
        assert_eq!(selected.as_sorted_char_range(), 11..13);
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::Escape, egui::Modifiers::NONE)],
        );
        assert!(ctx.memory(|m| m.has_focus(egui::Id::new("tikz-source-editor"))));
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::G, egui::Modifiers::COMMAND)],
        );
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![egui::Event::Text("2".into())],
        );
        let cursor = frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::Enter, egui::Modifiers::NONE)],
        );
        assert_eq!(cursor.primary.index, 4);
        assert!(ctx.memory(|m| m.has_focus(egui::Id::new("tikz-source-editor"))));
        assert_eq!(source, before);
        assert!(!reset);
    }
    #[test]
    fn real_native_replace_all_one_undo_redo_then_document_fence() {
        let ctx = egui::Context::default();
        let mut editor = SourceEditor::default();
        let mut source = "\\opaque{Ж🦀}\r\nЖ🦀\r\n".to_owned();
        let before = source.clone();
        let mut reset = false;
        frame(&ctx, &mut editor, &mut source, &mut reset, vec![]);
        let preview = ReplacementPreview::new(&source, 3, "Ж🦀", "x", None);
        assert!(apply_replacement(&ctx, &mut source, 3, &preview).unwrap());
        let after = source.clone();
        editor.focus_editor = true;
        frame(&ctx, &mut editor, &mut source, &mut reset, vec![]);
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::Z, egui::Modifiers::COMMAND)],
        );
        assert_eq!(source, before, "one native Undo must reverse every match");
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(
                egui::Key::Z,
                egui::Modifiers::COMMAND | egui::Modifiers::SHIFT,
            )],
        );
        assert_eq!(source, after);
        source = "other document\r\n".into();
        let other = source.clone();
        reset = true;
        editor.document_changed();
        frame(&ctx, &mut editor, &mut source, &mut reset, vec![]);
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::Z, egui::Modifiers::COMMAND)],
        );
        assert_eq!(source, other);
        assert!(preview.apply(&mut source, 3).is_err());
    }
    #[test]
    fn stale_ranges_are_refreshed_before_unicode_paint_and_preview_is_revoked_on_open() {
        let ctx = egui::Context::default();
        let mut editor = SourceEditor {
            query: "aa".into(),
            find_open: true,
            ..Default::default()
        };
        let mut source = "aaa aa".to_owned();
        let mut reset = false;
        frame(&ctx, &mut editor, &mut source, &mut reset, vec![]);
        editor.preview = Some(ReplacementPreview::new(&source, 3, "aa", "x", None));
        source = "🦀".into();
        frame(&ctx, &mut editor, &mut source, &mut reset, vec![]);
        assert!(editor.matches.is_empty());
        assert!(
            editor.preview.is_none(),
            "source mutation revokes the preview count"
        );
        editor.document_changed();
        assert!(editor.preview.is_none());
        assert!(editor.selection.is_none());
    }
    #[test]
    fn wrapped_gutter_has_one_number_per_physical_line_including_trailing_empty() {
        let ctx = egui::Context::default();
        let mut editor = SourceEditor::default();
        let mut source = format!("{}\r\n\r\nlast\n", "Ж🦀 long ".repeat(12));
        let mut reset = false;
        let mut visual_rows = 0;
        let output = ctx.run(
            egui::RawInput {
                screen_rect: Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(280.0, 1200.0),
                )),
                ..Default::default()
            },
            |ctx| {
                egui::CentralPanel::default().show(ctx, |ui| {
                    let background = ui.painter().add(egui::Shape::Noop);
                    let mut output = crate::show_source_text_edit_cached(
                        ui,
                        &mut source,
                        &mut reset,
                        true,
                        UiTheme::Midnight,
                        14.0,
                        &mut editor.highlight,
                    );
                    visual_rows = output.galley.rows.len();
                    let gutter =
                        egui::Rect::from_min_max(egui::pos2(0.0, 0.0), egui::pos2(35.0, 1200.0));
                    editor.finish_frame(
                        ui,
                        &mut output,
                        &source,
                        gutter,
                        ui.clip_rect(),
                        background,
                    );
                });
            },
        );
        assert!(visual_rows > 4, "fixture must actually soft wrap");
        for number in 1..=4 {
            let count = output.shapes.iter().filter(|shape| matches!(&shape.shape, egui::Shape::Text(text) if text.galley.text() == number.to_string())).count();
            assert_eq!(count, 1, "one gutter label for physical line {number}");
        }
        assert_eq!(source, format!("{}\r\n\r\nlast\n", "Ж🦀 long ".repeat(12)));
    }
    #[test]
    fn real_ime_escape_does_not_close_find_until_composition_finishes() {
        let ctx = egui::Context::default();
        let mut editor = SourceEditor::default();
        let mut source = "unchanged\r\n".to_owned();
        let mut reset = false;
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::F, egui::Modifiers::COMMAND)],
        );
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![
                egui::Event::Ime(egui::ImeEvent::Enabled),
                egui::Event::Ime(egui::ImeEvent::Preedit("Ж".into())),
                key(egui::Key::Escape, egui::Modifiers::NONE),
            ],
        );
        assert!(editor.find_open);
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![
                egui::Event::Ime(egui::ImeEvent::Commit("Ж".into())),
                egui::Event::Ime(egui::ImeEvent::Disabled),
            ],
        );
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::Escape, egui::Modifiers::NONE)],
        );
        assert!(!editor.find_open);
        assert_eq!(source, "unchanged\r\n");
    }
    #[test]
    fn same_frame_find_text_and_enter_selects_first_match_once() {
        let ctx = egui::Context::default();
        let mut editor = SourceEditor::default();
        let mut source = "aa aa".to_owned();
        let mut reset = false;
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::F, egui::Modifiers::COMMAND)],
        );
        let cursor = frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![
                egui::Event::Text("aa".into()),
                key(egui::Key::Enter, egui::Modifiers::NONE),
            ],
        );
        assert_eq!(editor.active, Some(0));
        assert_eq!(cursor.as_sorted_char_range(), 0..2);
        let cursor = frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::Enter, egui::Modifiers::NONE)],
        );
        assert_eq!(cursor.as_sorted_char_range(), 3..5);
        assert_eq!(source, "aa aa");
    }
    #[test]
    fn actual_horizontal_scroll_keeps_gutter_fixed_and_navigation_reveals_match() {
        fn layout(
            ctx: &egui::Context,
            editor: &mut SourceEditor,
            source: &mut String,
            events: Vec<egui::Event>,
        ) -> (egui::Rect, egui::Rect, egui::Pos2) {
            let mut geometry = (egui::Rect::NOTHING, egui::Rect::NOTHING, egui::Pos2::ZERO);
            let mut reset = false;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(320.0, 800.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        egui::ScrollArea::vertical()
                            .auto_shrink([false, false])
                            .show(ui, |ui| {
                                let (output, gutter, viewport) = crate::show_source_with_gutter(
                                    ui,
                                    source,
                                    &mut reset,
                                    false,
                                    UiTheme::Midnight,
                                    14.0,
                                    editor,
                                );
                                geometry = (gutter, viewport, output.galley_pos);
                            });
                    });
                },
            );
            geometry
        }
        let ctx = egui::Context::default();
        let mut editor = SourceEditor::default();
        let mut source = format!("{}\r\nline two", "0123456789".repeat(100));
        let original = source.clone();
        let before = layout(&ctx, &mut editor, &mut source, vec![]);
        layout(
            &ctx,
            &mut editor,
            &mut source,
            vec![
                egui::Event::PointerMoved(before.1.center()),
                egui::Event::MouseWheel {
                    unit: egui::MouseWheelUnit::Point,
                    delta: egui::vec2(-240.0, 0.0),
                    modifiers: egui::Modifiers::NONE,
                },
            ],
        );
        // Let the actual wheel's smooth delta settle before issuing a new
        // navigation action; otherwise it legitimately continues scrolling.
        for _ in 0..30 {
            layout(&ctx, &mut editor, &mut source, vec![]);
        }
        let scrolled = layout(&ctx, &mut editor, &mut source, vec![]);
        assert!(
            scrolled.2.x < before.2.x - 20.0,
            "real code viewport must actually scroll horizontally"
        );
        assert_eq!(before.0.min.x, scrolled.0.min.x);
        assert_eq!(before.0.max.x, scrolled.0.max.x);
        assert!(scrolled.0.right() < scrolled.1.left());
        // A source/diagnostic jump routes through the code child's scroll state.
        editor.selection = Some(0..0);
        for _ in 0..8 {
            layout(&ctx, &mut editor, &mut source, vec![]);
        }
        let revealed = layout(&ctx, &mut editor, &mut source, vec![]);
        assert!(
            revealed.2.x > scrolled.2.x,
            "navigation must reveal the first code column: scrolled={:?}, revealed={:?}",
            scrolled.2,
            revealed.2
        );
        assert_eq!(revealed.0.min.x, before.0.min.x);
        assert_eq!(source, original);
    }
    #[test]
    fn external_jump_synchronizes_status_before_next_editor_frame() {
        let mut editor = SourceEditor::default();
        editor.refresh("Ж🦀\r\nsecond\r\n");
        editor.external_jump(4, 4);
        assert_eq!(editor.line_column(editor.caret), (2, 1));
        assert_eq!(editor.scroll_target, Some(4));
    }
    #[test]
    fn ime_preedit_enter_and_commit_enter_do_not_navigate_or_accept_goto() {
        let ctx = egui::Context::default();
        let mut editor = SourceEditor {
            find_open: true,
            focus_find: true,
            query: "a".into(),
            ..Default::default()
        };
        let mut source = "aaa aaa\n".repeat(30);
        let original = source.clone();
        let mut reset = false;
        frame(&ctx, &mut editor, &mut source, &mut reset, vec![]);
        editor.navigate(false);
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![
                egui::Event::Ime(egui::ImeEvent::Enabled),
                egui::Event::Ime(egui::ImeEvent::Preedit("a".into())),
                key(egui::Key::Enter, egui::Modifiers::NONE),
            ],
        );
        let active = editor.active;
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::Enter, egui::Modifiers::NONE)],
        );
        assert_eq!(
            editor.active, active,
            "Enter belongs to the active IME composition"
        );
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![
                egui::Event::Ime(egui::ImeEvent::Commit("a".into())),
                egui::Event::Ime(egui::ImeEvent::Disabled),
            ],
        );
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::G, egui::Modifiers::COMMAND)],
        );
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![
                egui::Event::Ime(egui::ImeEvent::Enabled),
                egui::Event::Ime(egui::ImeEvent::Preedit("2".into())),
                key(egui::Key::Enter, egui::Modifiers::NONE),
            ],
        );
        assert!(editor.goto_open, "preedit Enter cannot accept Go to line");
        frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![
                egui::Event::Ime(egui::ImeEvent::Commit("2".into())),
                egui::Event::Ime(egui::ImeEvent::Disabled),
                key(egui::Key::Enter, egui::Modifiers::NONE),
            ],
        );
        assert!(
            editor.goto_open,
            "commit Enter cannot also accept Go to line"
        );
        let cursor = frame(
            &ctx,
            &mut editor,
            &mut source,
            &mut reset,
            vec![key(egui::Key::Enter, egui::Modifiers::NONE)],
        );
        assert!(!editor.goto_open);
        assert_eq!(cursor.primary.index, 8);
        assert_eq!(source, original);
    }
}
