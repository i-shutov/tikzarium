//! Scratch-only CPU comparison. No production files are changed.
#![allow(dead_code)]
use eframe::egui::{self, Color32, FontId};
use std::{hint::black_box, sync::Arc, time::Instant};
mod ui_theme {
    #[derive(Clone, Copy)]
    pub enum UiTheme { Light, Dark, Midnight, Paper }
}
mod tikz_authoring {
    // These fixtures contain no ownership marker. Abort if that assumption is
    // broken rather than substituting ownership semantics in the experiment.
    pub fn owned(_: &str) -> Vec<()> { panic!("ownership is outside this fixture"); }
}
#[path = "source_highlight_snapshot.rs"]
mod source_highlight;
use source_highlight::{SourceHighlightCache, palette};
use ui_theme::UiTheme;

fn timing(label: &str, n: usize, mut f: impl FnMut()) {
    let mut ms = Vec::new();
    for _ in 0..n { let t=Instant::now();f();ms.push(t.elapsed().as_secs_f64()*1000.0); }
    ms.sort_by(f64::total_cmp);
    println!("{label},median_ms={:.3},min_ms={:.3},max_ms={:.3},n={n}",ms[n/2],ms[0],ms[n-1]);
}
fn frame(ctx: &egui::Context, mut f: impl FnMut(&egui::Ui)) {
    let _=ctx.run(egui::RawInput::default(),|ctx|{egui::CentralPanel::default().show(ctx,|ui| f(ui));});
}
fn fixture(lines:usize, unique:bool)->String {
    let mut s=String::with_capacity(lines*80);
    for i in 0..lines {
        let mut line=format!("\\draw[red,thick] (1cm,2cm)--(3cm,4cm); % line {:06} ",if unique {i} else {0});
        line.push_str(&"x".repeat(80-line.len()-"α\r\n".len()));
        line.push_str("α\r\n");
        assert_eq!(line.len(),80);s.push_str(&line);
    }
    assert!(!s.contains("tikzarium:n1:"));s
}
fn job(source:&str,syntax:bool)->egui::text::LayoutJob {
    let font=FontId::monospace(14.0);
    if syntax { source_highlight::layout_job(source,font,palette(UiTheme::Midnight,Color32::WHITE),f32::INFINITY) }
    else {egui::text::LayoutJob::simple(source.to_owned(),font,Color32::WHITE,f32::INFINITY)}
}
fn main() {
    println!("profile=rustc-opt3-release-dependencies,debug_assertions={},clock=Instant-wall,renderer=none",cfg!(debug_assertions));
    for lines in [10_000,100_000] {
        if std::env::var("UX1_LINES").is_ok_and(|v|v.parse::<usize>().unwrap()==0 || v.parse::<usize>().unwrap()!=lines) {continue;}
        for unique in [false,true] {
            if std::env::var("UX1_UNIQUE").is_ok_and(|v|(v=="1")!=unique){continue;}
            let src=fixture(lines,unique);
            let tag=format!("lines={lines},unique={unique},bytes={}",src.len());
            timing(&format!("{tag},stage=tokenize"),3,||{black_box(source_highlight::tokenize(black_box(&src)));});
            let spans=source_highlight::tokenize(&src);
            timing(&format!("{tag},stage=syntax_job_from_cached_spans"),3,||{black_box(source_highlight::layout_spans(&src,&spans,FontId::monospace(14.0),palette(UiTheme::Midnight,Color32::WHITE),f32::INFINITY));});
            drop(spans);
            for syntax in [false,true] {
                if std::env::var_os("UX1_ROW_CLONE").is_some() && !syntax {continue;}
                let mut source=src.clone();
                let label=format!("{tag},syntax={syntax}");
                let original=job(&source,syntax);
                println!("{label},sections={}",original.sections.len());
                timing(&format!("{label},stage=hash_job"),3,||{black_box(egui::epaint::util::hash(black_box(&original)));});
                timing(&format!("{label},stage=clone_job"),3,||{black_box(original.clone());});
                drop(original);
                let ctx=egui::Context::default();
                let mut production=SourceHighlightCache::default();
                let mut held:Option<Arc<egui::Galley>>=None;
                let start=Instant::now();
                frame(&ctx,|ui| {held=Some(if syntax {production.galley(ui,&source,FontId::monospace(14.0),palette(UiTheme::Midnight,Color32::WHITE),f32::INFINITY)} else {ui.fonts_mut(|fonts|fonts.layout_job(job(&source,false)))});});
                println!("{label},stage=initial,total_ms={:.3}",start.elapsed().as_secs_f64()*1000.0);
                let g=held.as_ref().unwrap();
                let mut reconstructed=String::new();
                for row in &g.rows {for glyph in &row.glyphs {reconstructed.push(glyph.chr);} if row.ends_with_newline {reconstructed.push('\n');}}
                assert_eq!(reconstructed.as_bytes(),source.as_bytes(),"Galley glyph/newline reconstruction");
                println!("{label},stage=geometry,rows={},glyphs={},vertices={},indices={},source_bytes_verified=true",g.rows.len(),g.rows.iter().map(|r|r.glyphs.len()).sum::<usize>(),g.num_vertices,g.num_indices);
                if std::env::var_os("UX1_ROW_CLONE").is_some() {
                    timing(&format!("{label},stage=shallow_placed_rows_clone"),3,||{black_box(g.rows.clone());});
                    timing(&format!("{label},stage=deep_row_clone"),3,||{black_box(g.rows.iter().map(|r|r.row.as_ref().clone()).collect::<Vec<_>>());});
                    continue;
                }
                // Three no-source-layout frames clear egui's paragraph cache.
                // The production syntax cache keeps its source Galley Arc.
                timing(&format!("{label},stage=idle"),5,||{frame(&ctx,|ui| {
                    if syntax {held=Some(production.galley(ui,&source,FontId::monospace(14.0),palette(UiTheme::Midnight,Color32::WHITE),f32::INFINITY));}
                    else {black_box(ui.fonts_mut(|fonts|fonts.layout_no_wrap("M".into(),FontId::monospace(14.0),Color32::TRANSPARENT)));}
                });});
                let at=source.rfind('α').unwrap();source.replace_range(at..at+2,"β");
                let start=Instant::now();let mut job_ms=0.0;let mut font_ms=0.0;
                frame(&ctx,|ui| {
                    held=Some(if syntax {production.galley(ui,&source,FontId::monospace(14.0),palette(UiTheme::Midnight,Color32::WHITE),f32::INFINITY)}else{
                        let t=Instant::now();let j=job(&source,false);job_ms=t.elapsed().as_secs_f64()*1000.0;
                        let t=Instant::now();let g=ui.fonts_mut(|fonts|fonts.layout_job(j));font_ms=t.elapsed().as_secs_f64()*1000.0;g
                    });
                });
                println!("{label},stage=edit_after_idle,total_ms={:.3},mono_job_ms={job_ms:.3},mono_fonts_ms={font_ms:.3}",start.elapsed().as_secs_f64()*1000.0);
                let mut alternate=false;
                timing(&format!("{label},stage=sequential_edit"),3,||{
                    alternate=!alternate;source.replace_range(at..at+2,if alternate{"α"}else{"β"});
                    frame(&ctx,|ui|{held=Some(if syntax{production.galley(ui,&source,FontId::monospace(14.0),palette(UiTheme::Midnight,Color32::WHITE),f32::INFINITY)}else{ui.fonts_mut(|fonts|fonts.layout_job(job(&source,false)))});});
                });
                // Measure egui layout only with a prepared syntax job, outside
                // the source cache; this isolates its hash/split/layout cost.
                let prepared=job(&source,syntax);
                let expected=source.as_bytes().to_owned();
                let mut pending=Some(prepared);let mut font_elapsed=0.0;
                frame(&ctx,|ui|{let j=pending.take().unwrap();let t=Instant::now();let g=ui.fonts_mut(|fonts|fonts.layout_job(j));font_elapsed=t.elapsed().as_secs_f64()*1000.0;assert_eq!(g.job.text.as_bytes(),expected);held=Some(g);});
                println!("{label},stage=warm_prepared_fonts_only,total_ms={font_elapsed:.3}");
                source.replace_range(at..at+2,"γ");
                let mut pending=Some(job(&source,syntax));let mut elapsed=0.0;
                frame(&ctx,|ui|{let j=pending.take().unwrap();let t=Instant::now();let g=ui.fonts_mut(|fonts|fonts.layout_job(j));elapsed=t.elapsed().as_secs_f64()*1000.0;held=Some(g);});
                println!("{label},stage=changed_paragraph_prepared_fonts_only,total_ms={elapsed:.3}");
                for _ in 0..5 {frame(&ctx,|ui| {black_box(ui.fonts_mut(|fonts|fonts.layout_no_wrap("M".into(),FontId::monospace(14.0),Color32::TRANSPARENT)));});}
                source.replace_range(at..at+2,"δ");
                let mut pending=Some(job(&source,syntax));let mut elapsed=0.0;
                frame(&ctx,|ui|{let j=pending.take().unwrap();let t=Instant::now();let g=ui.fonts_mut(|fonts|fonts.layout_job(j));elapsed=t.elapsed().as_secs_f64()*1000.0;held=Some(g);});
                println!("{label},stage=after_idle_prepared_fonts_only,total_ms={elapsed:.3}");
                drop(held);
            }
        }
    }
}
