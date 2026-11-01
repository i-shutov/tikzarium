//! B38: existing C/N2 library source transactions and N3 offline help in egui.
//! The external XeLaTeX PDF, not the provisional guide, is authoritative.
use crate::tikz_authoring::{self, LibraryChange, Session};
use eframe::egui;
use tikzarium_extensions::{
    help_search::{self, HelpEntry},
    primitives::Evidence,
    project_imports::{self, ImportKind, capabilities_for_library},
};

fn evidence_label(value: Evidence) -> &'static str {
    match value {
        Evidence::Confirmed => "CONFIRMED",
        Evidence::Absent => "ABSENT",
        Evidence::Unknown => "UNKNOWN",
    }
}

pub fn show_help_search(ui: &mut egui::Ui, query: &mut String) {
    egui::CollapsingHeader::new("Найти команду/параметр · единый C-каталог")
        .default_open(false)
        .show(ui, |ui| {
            ui.add(egui::TextEdit::singleline(query).hint_text("смещение и якоря"));
            let text = query.trim();
            if text.is_empty() {
                ui.small("Офлайн: русские описания, синтаксис, параметры, исходные TikZ ID.");
                return;
            }
            if text.len() > 256 {
                ui.colored_label(
                    ui.visuals().error_fg_color,
                    "Запрос слишком длинный (256 байт)",
                );
                return;
            }
            let entries = help_search::search(tikz_authoring::catalog(), text);
            ui.small(format!(
                "Найдено: {} · установка и совместимость НЕ проверяются",
                entries.len()
            ));
            let truncated = entries.len() > 12;
            for entry in entries.into_iter().take(12) {
                egui::CollapsingHeader::new(entry.id()).show(ui, |ui| {
                    ui.label(entry.description_ru());
                    ui.label("Синтаксис:");
                    ui.code(entry.syntax());
                    ui.label("Пример:");
                    ui.code(entry.example());
                    ui.small(entry.warning());
                    ui.small(entry.interaction());
                    let requirements = entry.requirements();
                    ui.small(format!(
                        "Движок: {} · пакеты: {} · библиотеки: {} · PGF {} · минимум {}",
                        requirements.engine,
                        requirements.packages.join(", "),
                        requirements.libraries.join(", "),
                        requirements.documented_against,
                        requirements.pgf_version_min
                    ));
                    if let HelpEntry::Parameter(_, parameter) = entry {
                        ui.small(format!(
                            "Тип: {} · единицы: {} · значения: {}",
                            parameter.kind,
                            parameter.units.join(", "),
                            parameter.allowed_values.join(", ")
                        ));
                        if parameter.default_provenance == "editor_preset" {
                            ui.small(format!(
                                "Пресет редактора: {} (НЕ default TikZ)",
                                parameter.default
                            ));
                        } else {
                            ui.small("Default TikZ: UNKNOWN");
                        }
                    }
                    let (section, url) = entry.manual();
                    ui.hyperlink_to(format!("PGF/TikZ §{section}"), url);
                });
            }
            if truncated {
                ui.small("Показаны первые 12 результатов; уточните запрос.");
            }
        });
}

/// Individual library installation stays UNKNOWN until a specific file probe.
/// A matching catalogue engine target does not establish successful compilation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum LibraryUiTarget {
    Panel,
    Entry(usize),
    Action(usize, LibraryChange),
}

pub fn show_library_panel(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    has_xelatex: bool,
) -> Option<usize> {
    show_library_panel_tracking(ui, session, source, has_xelatex, |_, _| {})
}

// The observer only records the actual egui hit rectangles for UNIT_EVENT
// tests. Both production and tests execute this same click/change handler.
fn show_library_panel_tracking(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    has_xelatex: bool,
    mut observe: impl FnMut(LibraryUiTarget, egui::Rect),
) -> Option<usize> {
    let mut jump = None;
    let panel = egui::CollapsingHeader::new("Библиотеки TikZ · подключение в исходнике")
        .default_open(false)
        .show(ui, |ui| {
            ui.small("Installed / loaded / engine / tool / help независимы. Без автоустановки.");
            let catalog = tikz_authoring::catalog();
            let project = project_imports::inspect(source);
            for (index, library) in catalog.libraries.iter().enumerate() {
                let capabilities = capabilities_for_library(
                    catalog,
                    &library.name,
                    &project,
                    Evidence::Unknown,
                    if has_xelatex { Some("xelatex") } else { None },
                ).expect("bundled C library record");
                let direct = project.status(ImportKind::TikzLibrary, &library.name);
                // The status changes ABSENT ↔ CONFIRMED after a click.
                // Without a stable ID the open details immediately collapse,
                // hiding the inverse action and making Undo appear lost.
                let entry = egui::CollapsingHeader::new(format!(
                    "{} · {}", library.title_ru, evidence_label(direct)
                ))
                .id_salt(("tikz-library", library.name.as_str()))
                .show(ui, |ui| {
                    ui.label(&library.help_ru);
                    ui.code(&library.syntax);
                    ui.small(format!(
                        "installed={} · project-loaded={} · engine-target={} · tool-implemented={} · help={}",
                        evidence_label(capabilities.installed),
                        evidence_label(capabilities.project_loaded),
                        evidence_label(capabilities.engine_compatible),
                        evidence_label(capabilities.tool_implemented),
                        evidence_label(capabilities.help_available)
                    ));
                    ui.small("Installed UNKNOWN: файл библиотеки отдельно не проверялся. Engine target ≠ XeLaTeX PASS; tool ≠ полный визуальный адаптер.");
                    ui.label(&library.warning_ru);
                    ui.hyperlink_to(
                        format!("PGF/TikZ §{}", library.manual_section),
                        &library.manual_url
                    );
                    let action = if direct == Evidence::Confirmed {
                        LibraryChange::Disconnect
                    } else {
                        LibraryChange::Connect
                    };
                    match tikz_authoring::library_proposal(source, &library.name, action) {
                        Ok(Some(preview)) => {
                            ui.strong("Исходник: точно проверенные до/после · ещё не применено");
                            ui.code(preview);
                            let label = match action {
                                LibraryChange::Connect => "Подключить библиотеку в преамбуле",
                                LibraryChange::Disconnect => "Отключить только это прямое подключение",
                            };
                            let button = ui.button(label);
                            observe(LibraryUiTarget::Action(index, action), button.rect);
                            if button.clicked() {
                                match session.change_library(source, &library.name, action) {
                                    Ok(line) => {
                                        jump = Some(line);
                                        ui.ctx().request_repaint();
                                    }
                                    Err(error) => session.status = error,
                                }
                            }
                            ui.small("Только подтверждённый C/N2 SourcePatch с Undo; никакой установки пакетов.");
                        }
                        Ok(None) => { ui.small("Уже в требуемом состоянии."); }
                        Err(reason) => {
                            ui.small(format!(
                                "Правка заблокирована: {reason}. Редактируйте .tex вручную."
                            ));
                        }
                    }
                });
                observe(LibraryUiTarget::Entry(index), entry.header_response.rect);
            }
        });
    observe(LibraryUiTarget::Panel, panel.header_response.rect);
    jump
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn b38_capability_axes_remain_independent_and_help_is_from_c() {
        let catalog = tikz_authoring::catalog();
        let src = "\\documentclass{standalone}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta}\n\\begin{document}\n\\end{document}\n";
        let project = project_imports::inspect(src);
        for library in &catalog.libraries {
            let c = capabilities_for_library(
                catalog,
                &library.name,
                &project,
                Evidence::Unknown,
                Some("xelatex"),
            )
            .unwrap();
            assert_eq!(c.installed, Evidence::Unknown);
            assert_eq!(c.help_available, Evidence::Confirmed);
            assert_eq!(c.engine_compatible, Evidence::Confirmed);
            assert!(!c.visual_editable);
            if library.name == "arrows.meta" {
                assert_eq!(c.project_loaded, Evidence::Confirmed);
                assert_eq!(c.tool_implemented, Evidence::Confirmed);
            } else {
                assert_eq!(c.project_loaded, Evidence::Absent);
                assert_eq!(c.tool_implemented, Evidence::Absent);
            }
        }
        assert!(
            help_search::search(catalog, "СМЕЩЕНИЕ И ЯКОРЯ")
                .iter()
                .any(|entry| entry.id() == "tikz.library.positioning")
        );
    }

    #[test]
    fn b38_egui_frame_with_opaque_source_never_mutates_bytes() {
        // UNIT_EVENT only; this is not real X11 pointer or physical OS evidence.
        let ctx = egui::Context::default();
        let original =
            "\\documentclass{standalone}\n\\opaque{source}\n\\begin{document}\n\\end{document}\n";
        let mut source = original.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        let mut query = String::new();
        let _ = ctx.run(egui::RawInput::default(), |ctx| {
            egui::CentralPanel::default().show(ctx, |ui| {
                show_help_search(ui, &mut query);
                show_library_panel(ui, &mut session, &mut source, false);
            });
        });
        assert_eq!(source, original);
        assert!(!session.undo_available());
    }

    #[test]
    fn b39_actual_egui_pointer_connect_disconnect_keeps_details_open_and_undo_safe() {
        // UNIT_EVENT: genuine Context::run frames and Response::clicked()
        // with observed hit rectangles, NOT an X11 or physical Win/Mac run.
        fn primary(pos: egui::Pos2, pressed: bool) -> egui::Event {
            egui::Event::PointerButton {
                pos,
                button: egui::PointerButton::Primary,
                pressed,
                modifiers: egui::Modifiers::default(),
            }
        }
        fn frame(
            ctx: &egui::Context,
            session: &mut Session,
            source: &mut String,
            events: Vec<egui::Event>,
        ) -> (Option<usize>, Vec<(LibraryUiTarget, egui::Rect)>) {
            let mut found = Vec::new();
            let mut jumped = None;
            let _ = ctx.run(
                egui::RawInput {
                    screen_rect: Some(egui::Rect::from_min_size(
                        egui::Pos2::ZERO,
                        egui::vec2(980.0, 1200.0),
                    )),
                    events,
                    ..Default::default()
                },
                |ctx| {
                    egui::CentralPanel::default().show(ctx, |ui| {
                        jumped = show_library_panel_tracking(
                            ui,
                            session,
                            source,
                            false,
                            |target, rect| found.push((target, rect)),
                        );
                    });
                },
            );
            (jumped, found)
        }
        fn click(
            ctx: &egui::Context,
            session: &mut Session,
            source: &mut String,
            rect: egui::Rect,
        ) -> Option<usize> {
            assert!(rect.is_positive(), "click target must have a real hit rect");
            let pos = rect.center();
            frame(
                ctx,
                session,
                source,
                vec![egui::Event::PointerMoved(pos), primary(pos, true)],
            );
            frame(ctx, session, source, vec![primary(pos, false)]).0
        }
        fn target(found: &[(LibraryUiTarget, egui::Rect)], kind: LibraryUiTarget) -> egui::Rect {
            found
                .iter()
                .find(|(name, _)| *name == kind)
                .map(|(_, rect)| *rect)
                .unwrap_or_else(|| panic!("expected actual egui target {kind:?}; got {found:?}"))
        }

        let ctx = egui::Context::default();
        ctx.style_mut(|style| style.animation_time = 0.0);
        let original = concat!(
            "\\documentclass{standalone}\r\n",
            "\\usepackage{tikz}\r\n",
            "\\begin{document}\r\n",
            "\\opaqueMacro{текст и % знак}\r\n",
            "\\end{document}\r\n",
        );
        let mut source = original.to_owned();
        let mut session = Session::default();
        session.reset(&source);
        let (_, initial) = frame(&ctx, &mut session, &mut source, vec![]);
        click(
            &ctx,
            &mut session,
            &mut source,
            target(&initial, LibraryUiTarget::Panel),
        );
        let (_, panel_open) = frame(&ctx, &mut session, &mut source, vec![]);
        click(
            &ctx,
            &mut session,
            &mut source,
            target(&panel_open, LibraryUiTarget::Entry(0)),
        );
        let (_, entry_open) = frame(&ctx, &mut session, &mut source, vec![]);
        assert_eq!(source, original, "opening UI must never patch TeX");
        let connected = click(
            &ctx,
            &mut session,
            &mut source,
            target(
                &entry_open,
                LibraryUiTarget::Action(0, LibraryChange::Connect),
            ),
        );
        assert!(
            connected.is_some(),
            "actual egui Connect button did not fire"
        );
        assert!(session.undo_available());
        assert!(source.contains("\\usetikzlibrary{arrows.meta}\r\n"));
        assert!(source.contains("\\opaqueMacro{текст и % знак}\r\n"));

        // The status-bearing label has changed; the same row MUST remain
        // expanded, so Disconnect is available without clicking the row again.
        let (_, after_connect) = frame(&ctx, &mut session, &mut source, vec![]);
        let disconnected = click(
            &ctx,
            &mut session,
            &mut source,
            target(
                &after_connect,
                LibraryUiTarget::Action(0, LibraryChange::Disconnect),
            ),
        );
        assert!(
            disconnected.is_some(),
            "actual egui Disconnect button did not fire"
        );
        assert_eq!(source, original);
        session.undo(&mut source).unwrap();
        assert!(source.contains("\\usetikzlibrary{arrows.meta}\r\n"));
        session.undo(&mut source).unwrap();
        assert_eq!(source, original);
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("b39-library-clicks.tex");
        std::fs::write(&file, &source).unwrap();
        assert_eq!(std::fs::read_to_string(file).unwrap(), original);
    }

}
