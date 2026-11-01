//! Offline Russian help from the C-owned catalogue. Does not discover TeX.
use tikzarium_extensions::{
    help_search::{self, HelpEntry},
    primitives::Catalog,
};

fn detail(entry: HelpEntry<'_>) -> String {
    let mut out = format!(
        "{}\n{}\nПояснение: {}\nСинтаксис: {}\nПример: {}\n",
        entry.id(),
        entry.title(),
        entry.description_ru(),
        entry.syntax(),
        entry.example()
    );
    let req = entry.requirements();
    out.push_str(&format!(
        "Пакеты: {}\nБиблиотеки: {}\nДвижок: {}\nСверено с PGF/TikZ: {}\nМинимальная версия: {}\n",
        req.packages.join(", "),
        if req.libraries.is_empty() {
            "core".to_owned()
        } else {
            req.libraries.join(", ")
        },
        req.engine,
        req.documented_against,
        req.pgf_version_min
    ));
    if let HelpEntry::Parameter(_, parameter) = entry {
        out.push_str(&format!(
            "Тип: {}\nЕдиницы: {}\nДопустимые варианты: {}\n",
            parameter.kind,
            if parameter.units.is_empty() {
                "не применяются".to_owned()
            } else {
                parameter.units.join(", ")
            },
            if parameter.allowed_values.is_empty() {
                "не перечислены".to_owned()
            } else {
                parameter.allowed_values.join(", ")
            }
        ));
        if parameter.default_provenance == "editor_preset" {
            out.push_str(&format!(
                "Начальное значение редактора: {} (НЕ default TikZ)\n",
                parameter.default
            ));
        } else {
            out.push_str("Документированное значение по умолчанию: UNKNOWN\n");
        }
        out.push_str(&format!(
            "Унаследованные требования: {}\n",
            parameter.requirements_inherit
        ));
    }
    out.push_str(&format!(
        "Ограничения: {}\nВзаимодействие: {}\n",
        entry.warning(),
        entry.interaction()
    ));
    let (section, url) = entry.manual();
    out.push_str(&format!("Руководство PGF/TikZ: §{} · {}\n", section, url));
    out.push_str("Состояние установки пакета и подключения в проекте: NOT_CHECKED (офлайн-справка, не doctor).\n");
    out
}

/// Called without a project or engine. Unknown terms are errors, never
/// invented commands. Normal user TeX is not opened or rewritten.
pub fn render(query: Option<&str>) -> Result<String, String> {
    let catalog = Catalog::bundled().map_err(|error| error.to_string())?;
    match query {
        None | Some("--all") => {
            let mut out = String::from("TikZarium · офлайн-справка из общего каталога GUI\n");
            for entry in help_search::entries(&catalog) {
                out.push_str(&format!("{} · {}\n", entry.id(), entry.title()));
            }
            out.push_str("Поиск: tikzarium-cli help <фрагмент>; подробности: help <точный ID>.\n");
            Ok(out)
        }
        Some(value) if value.trim().is_empty() || value.len() > 256 => {
            Err("Пустой или слишком длинный запрос справки.".into())
        }
        Some(value) => {
            if let Some(entry) = help_search::exact(&catalog, value) {
                return Ok(detail(entry));
            }
            let matches = help_search::search(&catalog, value);
            if matches.is_empty() {
                return Err(format!("Нет записи в общем каталоге TikZ: {value}"));
            }
            let mut out = format!("Результаты поиска «{}»:\n", value.trim());
            for entry in matches {
                out.push_str(&format!("{} · {}\n", entry.id(), entry.title()));
            }
            out.push_str("Для полного пояснения укажите точный ID.\n");
            Ok(out)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_all_native_tools_libraries_and_parameters_offline() {
        let output = render(Some("--all")).unwrap();
        for id in [
            "tikz.line",
            "tikz.bezier-cubic",
            "tikz.arrow:tip",
            "tikz.library.positioning",
            "tikz.library.fit",
        ] {
            assert!(output.contains(id), "{id} missing");
        }
    }

    #[test]
    fn exact_parameter_reports_provenance_not_an_invented_tikz_default() {
        let output = render(Some("tikz.arrow:tip")).unwrap();
        assert!(output.contains("Начальное значение редактора: Stealth (НЕ default TikZ)"));
        assert!(output.contains("https://tikz.dev/tikz-arrows"));
        assert!(output.contains("NOT_CHECKED"));
    }

    #[test]
    fn exact_tool_and_library_explain_and_search_full_russian_text() {
        let tool = render(Some("tikz.line")).unwrap();
        assert!(tool.contains("Пояснение: Создаёт прямой отрезок"));
        assert!(tool.contains("Синтаксис:"));
        let library = render(Some("tikz.library.positioning")).unwrap();
        assert!(library.contains("Пояснение: Позволяет задавать положение узла"));
        assert!(library.contains("смещение и якоря"));
        assert!(render(Some("СМЕЩЕНИЕ И ЯКОРЯ")).unwrap()
            .contains("tikz.library.positioning"));
        assert!(render(Some("СОЗДАЁТ ПРЯМОЙ ОТРЕЗОК")).unwrap()
            .contains("tikz.line"));
    }

    #[test]
    fn unicode_search_and_unknown_entries_are_honest() {
        assert!(render(Some("ОКРУЖНОСТЬ")).unwrap().contains("tikz.circle"));
        assert!(render(Some("unknown-nonexistent-tikz-tool")).is_err());
        assert!(render(Some("")).is_err());
        assert!(render(Some(&"x".repeat(257))).is_err());
    }
}
