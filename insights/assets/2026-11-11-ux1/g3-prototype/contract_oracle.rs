//! Drop-in correctness oracle for the standalone paragraph prototype.
//! Call with two galleys produced in the same Fonts instance/atlas generation.
use eframe::egui::{self, Galley};
use std::sync::Arc;

pub const CASES: &[&str] = &[
    "",
    "\n",
    "\n\n",
    "\r\n",
    "\r\n\r\n",
    "a",
    "a\n",
    "a\n\n",
    "\na",
    "a\r\nb",
    "a\rb",
    "Ж🧪 e\u{301}\r\n\\draw (0,0)--(1,2);\r\n",
    "\\begin{verbatim}\n% opaque -- {x}\n\\end{verbatim}\n\\draw (0,0)--(1,2);",
    "\\catcode`\\%=12\n% opaque --\n",
    "  \t \r\n\t\n",
];

pub fn assert_equivalent(source: &str, native: &Galley, candidate: &Galley) {
    assert_eq!(native.job.text, source);
    assert_eq!(
        candidate.job.text, source,
        "true editable source must own the composite job"
    );
    assert_eq!(
        candidate.job.as_ref(),
        native.job.as_ref(),
        "full source formatting contract"
    );
    assert!(
        !candidate.elided,
        "TextEdit source cannot elide unrepresented text"
    );
    assert_eq!(candidate.elided, native.elided);
    assert_eq!(candidate.pixels_per_point, native.pixels_per_point);
    assert_eq!(
        candidate.intrinsic_size(),
        native.intrinsic_size(),
        "private intrinsic metadata must match exactly"
    );
    assert_eq!(
        candidate.rect, native.rect,
        "TextEdit sizing and scroll extent"
    );
    assert_eq!(
        candidate.mesh_bounds, native.mesh_bounds,
        "paint culling bounds"
    );
    assert_eq!(candidate.num_vertices, native.num_vertices);
    assert_eq!(candidate.num_indices, native.num_indices);
    assert_eq!(candidate.rows.len(), native.rows.len());
    assert_eq!(
        candidate
            .rows
            .iter()
            .map(|row| row.char_count_including_newline())
            .sum::<usize>(),
        source.chars().count()
    );
    let reconstruct = |g: &Galley| {
        let mut s = String::new();
        for row in &g.rows {
            s.extend(row.glyphs.iter().map(|glyph| glyph.chr));
            if row.ends_with_newline {
                s.push('\n');
            }
        }
        s
    };
    assert_eq!(reconstruct(candidate).as_bytes(), source.as_bytes());
    assert!(!candidate.rows.last().unwrap().ends_with_newline);
    for (index, (expected, actual)) in native.rows.iter().zip(&candidate.rows).enumerate() {
        assert_eq!(
            expected.pos, actual.pos,
            "placed row {index} and fractional DPI rounding"
        );
        assert_eq!(
            expected.row.as_ref(),
            actual.row.as_ref(),
            "row {index}: glyph metrics, CR, newline flag, colors, mesh/UV, selection indices"
        );
    }
    for index in 0..=source.chars().count() {
        for prefer_next_row in [false, true] {
            let cursor = egui::text::CCursor {
                index,
                prefer_next_row,
            };
            assert_eq!(
                candidate.layout_from_cursor(cursor),
                native.layout_from_cursor(cursor)
            );
            assert_eq!(
                candidate.pos_from_cursor(cursor),
                native.pos_from_cursor(cursor)
            );
            let rect = native.pos_from_cursor(cursor);
            // At soft-wrap/zero-width CR boundaries a pointer roundtrip need
            // not return the original cursor. Compare it with the native oracle.
            for dx in [-0.25, 0.0, 0.25] {
                let p = rect.center().to_vec2() + egui::vec2(dx, 0.0);
                assert_eq!(candidate.cursor_from_pos(p), native.cursor_from_pos(p));
            }
        }
    }
    for row in &native.rows {
        for x in [
            -100.0,
            0.0,
            row.size.x * 0.5,
            row.size.x,
            row.size.x + 100.0,
        ] {
            for y in [
                row.pos.y - 0.25,
                row.pos.y + row.size.y * 0.5,
                row.pos.y + row.size.y + 0.25,
            ] {
                assert_eq!(
                    candidate.cursor_from_pos(egui::vec2(x, y)),
                    native.cursor_from_pos(egui::vec2(x, y))
                );
            }
        }
    }
}

pub fn assert_selection_copy_on_write(base: &Arc<Galley>, visuals: &egui::Visuals) {
    let before = base.as_ref().clone();
    let mut painted = base.clone();
    let selection = egui::text::CCursorRange::two(egui::text::CCursor::new(0), base.end());
    egui::text_selection::visuals::paint_text_selection(&mut painted, visuals, &selection, None);
    assert_eq!(
        base.as_ref(),
        &before,
        "native selection must not contaminate cached paragraph rows"
    );
}

/// Three actual egui TextEdit paint frames, following Find's real state.cursor
/// selection path: select, paint selection, collapse and paint again. This is a
/// state/paint contract test, not OS IME or physical input acceptance.
pub fn assert_textedit_copy_on_write(
    source: &str,
    mut layout: impl FnMut(&egui::Ui, &str, f32) -> Arc<Galley>,
) {
    let ctx = egui::Context::default();
    let id = egui::Id::new("g3-textedit-contract");
    let mut buffer = source.to_owned();
    let mut before: Option<Galley> = None;
    for phase in 0..3 {
        let _ = ctx.run(egui::RawInput::default(), |ctx| {
            egui::CentralPanel::default().show(ctx, |ui| {
                let mut retained = None;
                let mut layouter = |ui: &egui::Ui, text: &dyn egui::TextBuffer, width| {
                    let original = layout(ui, text.as_str(), width);
                    retained = Some(original.clone());
                    original
                };
                let mut output = egui::TextEdit::multiline(&mut buffer)
                    .id(id)
                    .code_editor()
                    .desired_width(70.0)
                    .layouter(&mut layouter)
                    .show(ui);
                output.response.request_focus();
                let original = retained.unwrap();
                if phase == 0 {
                    before = Some(original.as_ref().clone());
                }
                assert_eq!(
                    original.as_ref(),
                    before.as_ref().unwrap(),
                    "selection must not mutate the cache returned to TextEdit"
                );
                if phase == 2 {
                    assert_eq!(
                        output.galley.as_ref(),
                        before.as_ref().unwrap(),
                        "collapsed native editor must return to pristine glyph meshes"
                    );
                }
                let selection = if phase == 0 {
                    egui::text::CCursorRange::two(egui::text::CCursor::new(0), original.end())
                } else {
                    egui::text::CCursorRange::one(egui::text::CCursor::new(0))
                };
                output.state.cursor.set_char_range(Some(selection));
                output.state.store(ctx, id);
            });
        });
        assert_eq!(buffer.as_bytes(), source.as_bytes());
    }
}
