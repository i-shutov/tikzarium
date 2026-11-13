//! Views of one authoritative source buffer and bounded, revision-checked source Undo.
//! Folding changes presentation only; it never owns or regenerates a second document.
use eframe::egui;
use std::{collections::VecDeque, ops::Range};
use tikzarium_extensions::primitives::SourcePatch;

pub const WHOLE_ID: &str = "tikz-source-editor";
pub const PREAMBLE_ID: &str = "tikz-source-preamble";
pub const BODY_ID: &str = "tikz-source-body";

#[derive(Clone, Debug)]
pub struct Region {
    pub id: &'static str,
    pub bytes: Range<usize>,
    pub first_character: usize,
    pub first_line: usize,
}

impl Region {
    pub fn whole(source: &str) -> Self {
        Self {
            id: WHOLE_ID,
            bytes: 0..source.len(),
            first_character: 0,
            first_line: 1,
        }
    }
}

/// TextEdit sees local scalar indices. Mutations patch the original UTF-8
/// string in place and cannot reach the bytes outside this view.
pub struct SectionBuffer<'a> {
    pub source: &'a mut String,
    pub bytes: Range<usize>,
}

impl egui::TextBuffer for SectionBuffer<'_> {
    fn is_mutable(&self) -> bool {
        true
    }
    fn as_str(&self) -> &str {
        &self.source[self.bytes.clone()]
    }
    fn insert_text(&mut self, text: &str, char_index: usize) -> usize {
        let byte = self
            .as_str()
            .char_indices()
            .nth(char_index)
            .map_or(self.bytes.len(), |(b, _)| b);
        self.source.insert_str(self.bytes.start + byte, text);
        self.bytes.end += text.len();
        text.chars().count()
    }
    fn delete_char_range(&mut self, chars: Range<usize>) {
        assert!(chars.start <= chars.end);
        let start = self
            .as_str()
            .char_indices()
            .nth(chars.start)
            .map_or(self.bytes.len(), |(b, _)| b);
        let end = self
            .as_str()
            .char_indices()
            .nth(chars.end)
            .map_or(self.bytes.len(), |(b, _)| b);
        self.source
            .replace_range(self.bytes.start + start..self.bytes.start + end, "");
        self.bytes.end -= end - start;
    }
    fn type_id(&self) -> std::any::TypeId {
        std::any::TypeId::of::<SectionBuffer<'static>>()
    }
}

pub fn clear_native_histories(ctx: &egui::Context) {
    for name in [WHOLE_ID, PREAMBLE_ID, BODY_ID] {
        let id = egui::Id::new(name);
        if let Some(mut state) = egui::text_edit::TextEditState::load(ctx, id) {
            state.clear_undoer();
            state.store(ctx, id);
        }
    }
}

pub fn source_has_focus(ctx: &egui::Context) -> bool {
    ctx.memory(|m| {
        [WHOLE_ID, PREAMBLE_ID, BODY_ID]
            .iter()
            .any(|name| m.has_focus(egui::Id::new(name)))
    })
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HistoryAction {
    Undo,
    Redo,
}

pub fn history_action(event: &egui::Event) -> Option<HistoryAction> {
    match event {
        egui::Event::Key {
            key,
            pressed: true,
            modifiers,
            ..
        } if modifiers.command && !modifiers.alt => match (key, modifiers.shift) {
            (egui::Key::Z, false) => Some(HistoryAction::Undo),
            (egui::Key::Z, true) | (egui::Key::Y, false) => Some(HistoryAction::Redo),
            _ => None,
        },
        _ => None,
    }
}

/// Dispatch source history in native event order. A text/focus-changing prefix
/// is rendered before a subsequent Undo; the remaining raw events are carried
/// to an immediate repaint, never reordered ahead of that text mutation.
/// Call only before Context::run/begin_pass (eframe raw_input_hook), so retained
/// pointer and key events enter egui exactly once and rebuild derived state.
#[derive(Default)]
pub struct SourceInputQueue {
    deferred: Vec<egui::Event>,
    composing: bool,
}

impl SourceInputQueue {
    pub fn prepare(
        &mut self,
        ctx: &egui::Context,
        raw: &mut egui::RawInput,
        allowed: bool,
    ) -> Vec<HistoryAction> {
        let owns_source = allowed && source_has_focus(ctx);
        let mut actions = Vec::new();
        let mut events = std::mem::take(&mut self.deferred);
        events.append(&mut raw.events);
        let mut prefix_has_effect = false;
        let mut events = events.into_iter();
        while let Some(event) = events.next() {
            let history = history_action(&event);
            if owns_source
                && !self.composing
                && let Some(action) = history
            {
                if prefix_has_effect {
                    self.deferred.push(event);
                    self.deferred.extend(events);
                    break;
                }
                actions.push(action);
                continue;
            }
            // Present the new undo cursor/focus before any following
            // native input. TextEdit installs programmatic navigation at
            // the end of its frame, so replay that suffix next frame.
            if !actions.is_empty()
                && matches!(
                    &event,
                    egui::Event::Text(_)
                        | egui::Event::Paste(_)
                        | egui::Event::Cut
                        | egui::Event::Ime(_)
                        | egui::Event::Key { pressed: true, .. }
                        | egui::Event::PointerButton { .. }
                        | egui::Event::PointerMoved(_)
                        | egui::Event::WindowFocused(_)
                )
            {
                self.deferred.push(event);
                self.deferred.extend(events);
                break;
            }
            if let egui::Event::Ime(ime) = &event {
                self.composing = match ime {
                    egui::ImeEvent::Enabled => true,
                    egui::ImeEvent::Preedit(text) => !text.is_empty(),
                    egui::ImeEvent::Commit(_) | egui::ImeEvent::Disabled => false,
                };
            }
            prefix_has_effect |= matches!(
                &event,
                egui::Event::Text(_)
                    | egui::Event::Paste(_)
                    | egui::Event::Cut
                    | egui::Event::Ime(_)
                    | egui::Event::Key { pressed: true, .. }
                    | egui::Event::PointerButton { pressed: true, .. }
                    | egui::Event::WindowFocused(_)
            );
            raw.events.push(event);
        }
        if !self.deferred.is_empty() {
            ctx.request_repaint();
        }
        actions
    }
}

/// Text views and authored operations share the existing SourcePatch contract.
/// Each input frame is one text transaction; search/replace is likewise one transaction. The
/// history keeps at most 100 patches / 16 MiB, retaining the latest patch even
/// when a single large replacement exceeds that budget. No full-source clones
/// accumulate in an additional native per-view undo stack.
#[derive(Default)]
pub struct SourceHistory {
    undo: VecDeque<SourcePatch>,
    redo: Vec<SourcePatch>,
    revision: Option<u64>,
}

impl SourceHistory {
    pub fn reset(&mut self, revision: u64) {
        self.undo.clear();
        self.redo.clear();
        self.revision = Some(revision);
    }
    pub fn available(&self, action: HistoryAction, revision: u64) -> bool {
        self.revision == Some(revision)
            && match action {
                HistoryAction::Undo => !self.undo.is_empty(),
                HistoryAction::Redo => !self.redo.is_empty(),
            }
    }
    pub fn record(&mut self, before: &str, after: &str, previous_revision: u64, revision: u64) {
        if before == after {
            return;
        }
        if self.revision != Some(previous_revision) {
            self.reset(previous_revision);
        }
        let mut start = before
            .bytes()
            .zip(after.bytes())
            .take_while(|(a, b)| a == b)
            .count();
        while !before.is_char_boundary(start) || !after.is_char_boundary(start) {
            start -= 1;
        }
        let mut suffix = before[start..]
            .bytes()
            .rev()
            .zip(after[start..].bytes().rev())
            .take_while(|(a, b)| a == b)
            .count();
        while !before.is_char_boundary(before.len() - suffix)
            || !after.is_char_boundary(after.len() - suffix)
        {
            suffix -= 1;
        }
        self.push_inverse(SourcePatch {
            range: start..after.len() - suffix,
            expected_old: after[start..after.len() - suffix].into(),
            replacement: before[start..before.len() - suffix].into(),
            source_revision: revision,
        });
    }
    /// Take an inverse already produced by the revision-checked authoring
    /// adapter. No whole-document clone/diff is needed on idle UI frames.
    pub fn record_inverse(
        &mut self,
        inverse: SourcePatch,
        previous_revision: u64,
    ) -> Result<(), &'static str> {
        if previous_revision.checked_add(1) != Some(inverse.source_revision) {
            return Err("Авторская транзакция имеет неверную цепочку ревизий");
        }
        if self.revision != Some(previous_revision) {
            self.reset(previous_revision);
        }
        self.push_inverse(inverse);
        Ok(())
    }
    fn push_inverse(&mut self, inverse: SourcePatch) {
        self.revision = Some(inverse.source_revision);
        self.undo.push_back(inverse);
        self.redo.clear();
        let mut bytes: usize = self
            .undo
            .iter()
            .map(|p| p.expected_old.len() + p.replacement.len())
            .sum();
        while self.undo.len() > 1 && (self.undo.len() > 100 || bytes > 16 * 1024 * 1024) {
            let p = self.undo.pop_front().expect("nonempty bounded history");
            bytes -= p.expected_old.len() + p.replacement.len();
        }
    }
    pub fn apply(
        &mut self,
        action: HistoryAction,
        source: &mut String,
        revision: u64,
    ) -> Result<Option<usize>, &'static str> {
        if self.revision != Some(revision) {
            self.reset(revision);
            return Err("Исходник изменён другой операцией: текстовая история сброшена");
        }
        let patch = match action {
            HistoryAction::Undo => self.undo.back(),
            HistoryAction::Redo => self.redo.last(),
        };
        let Some(mut patch) = patch.cloned() else {
            return Ok(None);
        };
        // The ledger checks the current source revision before rebasing the
        // next inverse patch after a previous undo. Bytes are checked by apply.
        patch.source_revision = revision;
        let mut next_revision = revision;
        let inverse = patch
            .apply(source, &mut next_revision)
            .map_err(|_| "Отмена отклонена: диапазон исходника изменился")?;
        let caret = source[..patch.range.start].chars().count();
        match action {
            HistoryAction::Undo => {
                self.undo.pop_back();
                self.redo.push(inverse);
            }
            HistoryAction::Redo => {
                self.redo.pop();
                self.undo.push_back(inverse);
            }
        }
        self.revision = Some(next_revision);
        Ok(Some(caret))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use egui::TextBuffer;

    #[test]
    fn view_edits_and_native_replace_cannot_touch_adjacent_unicode_crlf_sections() {
        let prefix = "% Преамбула 🦀\r\n\\begin{document}\r\n";
        let suffix = "\\end{document}\r\n";
        let mut source = format!("{prefix}Жук\r\n{suffix}");
        let mut view = SectionBuffer {
            bytes: prefix.len()..prefix.len() + "Жук\r\n".len(),
            source: &mut source,
        };
        assert_eq!(view.insert_text("🌿", 1), 1);
        view.delete_char_range(2..3);
        assert_eq!(view.as_str(), "Ж🌿к\r\n");
        view.replace_with("другая строка\r\n");
        assert_eq!(source, format!("{prefix}другая строка\r\n{suffix}"));
    }

    #[test]
    fn text_history_undoes_across_preamble_body_and_split_boundary_changes() {
        let a = "% Жук\r\n\\begin{document}\r\nbody\r\n";
        let b = a.replace("Жук", "Свет 🌿");
        let c = b.replace("body", "body + рисунок");
        let d = c.replace("\\begin{document}", "\\begin{other}");
        let mut h = SourceHistory::default();
        h.record(a, &b, 0, 1);
        h.record(&b, &c, 1, 2);
        h.record(&c, &d, 2, 3);
        let mut s = d.clone();
        for (revision, expected) in [(3, c.as_str()), (4, b.as_str()), (5, a)] {
            h.apply(HistoryAction::Undo, &mut s, revision).unwrap();
            assert_eq!(s, expected);
        }
        for (revision, expected) in [(6, b.as_str()), (7, c.as_str()), (8, d.as_str())] {
            h.apply(HistoryAction::Redo, &mut s, revision).unwrap();
            assert_eq!(s, expected);
        }
    }

    #[test]
    fn stale_revision_cannot_restore_text_from_another_document_or_external_patch() {
        let mut h = SourceHistory::default();
        h.record("old", "old!", 0, 1);
        let mut s = "new document".to_owned();
        assert!(h.apply(HistoryAction::Undo, &mut s, 2).is_err());
        assert_eq!(s, "new document");
        assert!(!h.available(HistoryAction::Undo, 2));
    }

    #[test]
    fn unicode_shared_byte_prefix_and_new_edit_after_undo_are_safe() {
        let mut h = SourceHistory::default();
        h.record("\u{1000}", "\u{1001}", 0, 1);
        let mut s = "\u{1001}".to_owned();
        h.apply(HistoryAction::Undo, &mut s, 1).unwrap();
        assert_eq!(s, "\u{1000}");
        h.record(&s, "Ж", 2, 3);
        s = "Ж".into();
        assert!(!h.available(HistoryAction::Redo, 3));
        h.apply(HistoryAction::Undo, &mut s, 3).unwrap();
        assert_eq!(s, "\u{1000}");
    }
}
