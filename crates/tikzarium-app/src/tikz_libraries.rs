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
pub fn show_library_panel(
    ui: &mut egui::Ui,
    session: &mut Session,
    source: &mut String,
    has_xelatex: bool,
) -> Option<usize> {
    let mut jump = None;
    egui::CollapsingHeader::new("Библиотеки TikZ · подключение в исходнике")
        .default_open(false)
        .show(ui, |ui| {
            ui.small("Installed / loaded / engine / tool / help независимы. Без автоустановки.");
            let catalog = tikz_authoring::catalog();
            let project = project_imports::inspect(source);
            for library in &catalog.libraries {
                let capabilities = capabilities_for_library(
                    catalog,
                    &library.name,
                    &project,
                    Evidence::Unknown,
                    if has_xelatex { Some("xelatex") } else { None },
                ).expect("bundled C library record");
                let direct = project.status(ImportKind::TikzLibrary, &library.name);
                egui::CollapsingHeader::new(format!(
                    "{} · {}", library.title_ru, evidence_label(direct)
                )).show(ui, |ui| {
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
                            if ui.button(label).clicked() {
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
            }
        });
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
}
