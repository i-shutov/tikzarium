#![allow(dead_code)]
use eframe::egui::{self, Color32, FontId};
use egui::emath::GuiRounding;
use std::{
    collections::{HashMap, HashSet},
    hint::black_box,
    mem::size_of,
    sync::Arc,
    time::Instant,
};
mod ui_theme {
    #[derive(Clone, Copy)]
    pub enum UiTheme {
        Light,
        Dark,
        Midnight,
        Paper,
    }
}
mod tikz_authoring {
    pub fn owned(_: &str) -> Vec<()> {
        panic!("ownership fixture outside spike");
    }
}
#[path = "source_highlight_snapshot.rs"]
mod source_highlight;
use source_highlight::palette;
use ui_theme::UiTheme;
#[path = "contract_oracle.rs"]
mod oracle;
type Job = egui::text::LayoutJob;
type Galley = egui::Galley;
#[derive(Clone)]
struct Entry {
    newline: bool,
    g: Arc<Galley>,
}
#[derive(Default)]
struct DerivedCache {
    active: HashMap<u64, Vec<Entry>>,
    full: Option<Arc<Galley>>,
    witness: Option<Arc<Galley>>,
    ppp: u32,
    reflows: usize,
    reused: usize,
}
fn full_job(s: &str, w: f32) -> Job {
    source_highlight::layout_job(
        s,
        FontId::monospace(14.0),
        palette(UiTheme::Midnight, Color32::WHITE),
        w,
    )
}
impl DerivedCache {
    fn layout(&mut self, ui: &egui::Ui, source: &str, width: f32) -> Arc<Galley> {
        let ppp = ui.ctx().pixels_per_point();
        let witness = ui.fonts_mut(|f| {
            f.layout_no_wrap("M".into(), FontId::monospace(14.0), Color32::TRANSPARENT)
        });
        let same_fonts = self.ppp == ppp.to_bits()
            && self
                .witness
                .as_ref()
                .is_some_and(|w| Arc::ptr_eq(w, &witness));
        if !same_fonts {
            self.active.clear();
            self.full = None;
        }
        self.witness = Some(witness);
        self.ppp = ppp.to_bits();
        if let Some(g) = &self.full {
            if g.job.text == source && g.job.wrap.max_width == width {
                return g.clone();
            }
        }
        let job = Arc::new(full_job(source, width));
        let mut ranges = Vec::new();
        let mut at = 0;
        for text in source.split_inclusive('\n') {
            let end = at + text.len();
            ranges.push((
                at,
                end - text.ends_with('\n') as usize,
                text.ends_with('\n'),
            ));
            at = end;
        }
        if source.is_empty() || source.ends_with('\n') {
            ranges.push((source.len(), source.len(), false));
        }
        let mut active: HashMap<u64, Vec<Entry>> = HashMap::new();
        let mut parts = Vec::with_capacity(ranges.len());
        let mut section_at = 0;
        self.reflows = 0;
        self.reused = 0;
        for (start, end, newline) in ranges {
            while section_at < job.sections.len()
                && job.sections[section_at].byte_range.end <= start
            {
                section_at += 1;
            }
            let mut local = Job {
                text: source[start..end].to_owned(),
                wrap: job.wrap.clone(),
                ..Default::default()
            };
            // Match native paragraph splitting's inclusive section overlap boundaries.
            let from = section_at.saturating_sub(1);
            for section in &job.sections[from..] {
                if section.byte_range.start > end {
                    break;
                }
                if section.byte_range.end < start {
                    continue;
                }
                let mut section = section.clone();
                section.byte_range = section.byte_range.start.saturating_sub(start)
                    ..section.byte_range.end.min(end).saturating_sub(start);
                local.sections.push(section);
            }
            if local.sections.is_empty() {
                local.sections.push(egui::text::LayoutSection {
                    leading_space: 0.0,
                    byte_range: 0..0,
                    format: egui::TextFormat::simple(FontId::monospace(14.0), Color32::WHITE),
                });
            }
            let hash = egui::epaint::util::hash((&local, newline));
            let found = active
                .get(&hash)
                .and_then(|v| v.iter().find(|e| e.newline == newline && *e.g.job == local))
                .or_else(|| {
                    self.active
                        .get(&hash)
                        .and_then(|v| v.iter().find(|e| e.newline == newline && *e.g.job == local))
                })
                .cloned();
            let entry = if let Some(e) = found {
                self.reused += 1;
                e
            } else {
                local.sections.shrink_to_fit();
                let local = Arc::new(local);
                let mut g = ui.fonts_mut(|f| egui::epaint::text::layout(f.fonts, ppp, local));
                if newline {
                    let last = g.rows.last_mut().expect("native empty row");
                    Arc::get_mut(&mut last.row)
                        .expect("raw layout unique row")
                        .ends_with_newline = true;
                }
                for row in &mut g.rows {
                    let row = Arc::get_mut(&mut row.row).expect("raw unique ownership");
                    row.glyphs.shrink_to_fit();
                    row.visuals.mesh.vertices.shrink_to_fit();
                    row.visuals.mesh.indices.shrink_to_fit();
                }
                self.reflows += 1;
                Entry {
                    newline,
                    g: Arc::new(g),
                }
            };
            active.entry(hash).or_default().push(entry.clone());
            parts.push(entry.g);
        }
        // Metadata-only native galleys preserve inaccessible intrinsic_size exactly;
        // concat has no Rows to clone, then public Row geometry is filled below.
        let skeletons: Vec<_> = parts
            .iter()
            .map(|g| {
                let mut s = g.as_ref().clone();
                s.rows.clear();
                s.num_vertices = 0;
                s.num_indices = 0;
                s.mesh_bounds = egui::Rect::NOTHING;
                Arc::new(s)
            })
            .collect();
        let mut result = Galley::concat(job, &skeletons, ppp);
        result.rows = Vec::with_capacity(parts.iter().map(|g| g.rows.len()).sum());
        result.rect = egui::Rect::ZERO;
        result.mesh_bounds = egui::Rect::NOTHING;
        for child in &parts {
            let offset = result.rect.height();
            for row in &child.rows {
                let pos = egui::pos2(
                    (row.pos.x * ppp).round() / ppp,
                    ((row.pos.y + offset) * ppp).round() / ppp,
                );
                result.mesh_bounds |= row.visuals.mesh_bounds.translate(pos.to_vec2());
                result.rect |= egui::Rect::from_min_size(pos, row.size);
                result.rows.push(egui::epaint::text::PlacedRow {
                    pos,
                    row: row.row.clone(),
                });
            }
            result.num_vertices += child.num_vertices;
            result.num_indices += child.num_indices;
        }
        let exceeded = result.rect.width() > width + 1.0;
        result.rect = result.rect.round_ui();
        if !exceeded {
            result.rect.max.x = result.rect.max.x.min(result.rect.min.x + width).floor_ui();
        }
        let result = Arc::new(result);
        self.active = active;
        self.full = Some(result.clone());
        result
    }
    fn memory(&self) -> (usize, usize, usize, usize) {
        let mut ptrs = HashSet::new();
        let mut mesh = 0;
        let mut glyph = 0;
        let mut job = 0;
        for e in self.active.values().flatten() {
            if let Some(g) = self.full.as_ref() {
                let _ = g;
            }
            for r in &e.g.rows {
                if ptrs.insert(Arc::as_ptr(&r.row)) {
                    mesh += r.visuals.mesh.vertices.capacity() * size_of::<egui::epaint::Vertex>()
                        + r.visuals.mesh.indices.capacity() * 4;
                    glyph += r.glyphs.capacity() * size_of::<egui::epaint::text::Glyph>();
                }
            }
        }
        let mut jobs = HashSet::new();
        for e in self.active.values().flatten() {
            if jobs.insert(Arc::as_ptr(&e.g.job)) {
                job += e.g.job.text.capacity()
                    + e.g.job.sections.capacity() * size_of::<egui::text::LayoutSection>();
            }
        }
        if let Some(g) = &self.full {
            job += g.job.text.capacity()
                + g.job.sections.capacity() * size_of::<egui::text::LayoutSection>();
            for r in &g.rows {
                assert!(
                    ptrs.contains(&Arc::as_ptr(&r.row)),
                    "composite mesh not shared"
                );
            }
        }
        (ptrs.len(), mesh, glyph, job)
    }
}
fn frame(ctx: &egui::Context, mut f: impl FnMut(&egui::Ui)) {
    let _ = ctx.run(egui::RawInput::default(), |ctx| {
        egui::CentralPanel::default().show(ctx, |ui| f(ui));
    });
}
fn reconstruct(g: &Galley) -> String {
    let mut s = String::new();
    for r in &g.rows {
        for ch in &r.glyphs {
            s.push(ch.chr);
        }
        if r.ends_with_newline {
            s.push('\n');
        }
    }
    s
}
fn compare(a: &Galley, b: &Galley, s: &str) {
    assert_eq!(a.job.text, s);
    assert_eq!(reconstruct(a).as_bytes(), s.as_bytes());
    assert_eq!(a.rows.len(), b.rows.len(), "rows {s:?}");
    assert_eq!(a.intrinsic_size(), b.intrinsic_size(), "intrinsic");
    assert_eq!(a.num_vertices, b.num_vertices);
    assert_eq!(a.num_indices, b.num_indices);
    assert!(
        (a.mesh_bounds.min - b.mesh_bounds.min).length() < 0.05 || a.mesh_bounds == b.mesh_bounds,
        "mesh bounds min"
    );
    assert!(
        (a.mesh_bounds.max - b.mesh_bounds.max).length() < 0.05 || a.mesh_bounds == b.mesh_bounds,
        "mesh bounds max"
    );
    assert!(
        (a.size() - b.size()).length() < 0.05,
        "size {:?} {:?}",
        a.size(),
        b.size()
    );
    for (i, (x, y)) in a.rows.iter().zip(&b.rows).enumerate() {
        assert!(
            (x.pos - y.pos).length() < 0.05,
            "row {i} pos {:?} {:?}",
            x.pos,
            y.pos
        );
        assert_eq!(x.ends_with_newline, y.ends_with_newline);
        assert_eq!(x.glyphs.len(), y.glyphs.len());
        for (p, q) in x.glyphs.iter().zip(&y.glyphs) {
            assert_eq!(p.chr, q.chr);
            assert!((p.pos - q.pos).length() < 0.05);
        }
    }
    for index in 0..=s.chars().count() {
        for prefer in [false, true] {
            let c = egui::text::CCursor {
                index,
                prefer_next_row: prefer,
            };
            assert_eq!(
                a.layout_from_cursor(c),
                b.layout_from_cursor(c),
                "cursor {index} prefer{prefer}"
            );
            assert!((a.pos_from_cursor(c).min - b.pos_from_cursor(c).min).length() < 0.05);
            let p = a.pos_from_cursor(c).center();
            assert_eq!(
                a.cursor_from_pos(p.to_vec2()),
                b.cursor_from_pos(p.to_vec2())
            );
        }
    }
}
fn oracle_cases() {
    let ctx = egui::Context::default();
    let mut cache = DerivedCache::default();
    let long = "a\n".repeat(1001);
    let cases = [
        "\n",
        "\n\n",
        "\r\n",
        "a\n\n",
        "\na",
        long.as_str(),
        "",
        "Ж🧪 e\u{301}\r\n\\draw (0,0)--(1,2);\r\n",
        "insert Ж🧪 e\u{301}\r\n\\draw (0,0)--(1,2);\r\n",
        "insert Ж🧪 e\u{301}\r\n\\draw (0,0)--(1,2);",
        "insert Ж🧪\n e\u{301}\r\n\\draw (0,0)--(1,2);",
        "Ж🧪 e\u{301}\r\n\\draw (0,0)--(1,2);\r\n",
        "\\verb|% opaque|\r\n\\begin{verbatim}\n% literal --\n\\end{verbatim}\n",
        "\\catcode`\\%=12\n% literal --\n",
    ];
    let mut n = 0;
    for ppp in [1.0, 1.25, 2.0] {
        ctx.set_pixels_per_point(ppp);
        for width in [f32::INFINITY, 8.0, 70.0, 180.0] {
            for s in cases {
                frame(&ctx, |ui| {
                    let a = cache.layout(ui, s, width);
                    let b = ui.fonts_mut(|f| f.layout_job(full_job(s, width)));
                    compare(&a, &b, s);
                    oracle::assert_equivalent(s, &b, &a);
                    oracle::assert_selection_copy_on_write(&a, ui.visuals());
                });
                n += 1;
            }
        }
    }
    oracle::assert_textedit_copy_on_write("Ж🧪 a\r\n\nwrapped text text text\n", |ui, s, w| {
        cache.layout(ui, s, w)
    });
    println!("TEXTEDIT_SELECTION_COW_PASS frames=3 source_bytes_unchanged=true");
    println!(
        "ORACLE_PASS cases={n} unicode_crlf_insert_delete_newline_wrap_dpi=true source_and_intrinsic_and_all_cursor_positions=true"
    );
}
fn fixture(n: usize, unique: bool) -> String {
    let mut s = String::new();
    for i in 0..n {
        let mut line = format!(
            "\\draw[red,thick] (1cm,2cm)--(3cm,4cm); % line {:06} ",
            if unique { i } else { 0 }
        );
        line.push_str(&"x".repeat(80 - line.len() - "α\r\n".len()));
        line.push_str("α\r\n");
        s.push_str(&line);
    }
    s
}
fn run_bench() {
    for n in [10000, 100000] {
        if std::env::var("UX1_LINES").is_ok_and(|v| v.parse::<usize>().unwrap() != n) {
            continue;
        }
        for unique in [false, true] {
            if std::env::var("UX1_UNIQUE").is_ok_and(|v| (v == "1") != unique) {
                continue;
            }
            let mut s = fixture(n, unique);
            let ctx = egui::Context::default();
            let mut cache = DerivedCache::default();
            let t = Instant::now();
            frame(&ctx, |ui| {
                black_box(cache.layout(ui, &s, f32::INFINITY));
            });
            println!(
                "lines={n} unique={unique} initial_ms={:.3} reflows={} reused={}",
                t.elapsed().as_secs_f64() * 1000.0,
                cache.reflows,
                cache.reused
            );
            let (rows, mesh, glyph, job) = cache.memory();
            println!(
                "MEMORY lines={n} unique={unique} unique_rows={rows} mesh_capacity_bytes={mesh} glyph_capacity_bytes={glyph} job_capacity_bytes={job} active_entries={} composite_rows={}",
                cache.active.values().map(Vec::len).sum::<usize>(),
                cache.full.as_ref().unwrap().rows.len()
            );
            for _ in 0..5 {
                frame(&ctx, |ui| {
                    black_box(cache.layout(ui, &s, f32::INFINITY));
                });
            }
            let at = s.rfind('α').unwrap();
            s.replace_range(at..at + 2, "β");
            let t = Instant::now();
            frame(&ctx, |ui| {
                let g = cache.layout(ui, &s, f32::INFINITY);
                assert_eq!(g.job.text, s);
            });
            println!(
                "lines={n} unique={unique} after_idle_edit_ms={:.3} reflows={} reused={}",
                t.elapsed().as_secs_f64() * 1000.0,
                cache.reflows,
                cache.reused
            );
            let mut times = Vec::new();
            for i in 0..3 {
                s.replace_range(at..at + 2, if i % 2 == 0 { "α" } else { "β" });
                let t = Instant::now();
                frame(&ctx, |ui| {
                    black_box(cache.layout(ui, &s, f32::INFINITY));
                });
                times.push(t.elapsed().as_secs_f64() * 1000.0);
            }
            times.sort_by(f64::total_cmp);
            println!(
                "lines={n} unique={unique} sequential_median_ms={:.3} min={:.3} max={:.3} reflows={} reused={}",
                times[1], times[0], times[2], cache.reflows, cache.reused
            );
        }
    }
}
fn main() {
    oracle_cases();
    if std::env::args().any(|x| x == "--bench") {
        run_bench();
    }
}
