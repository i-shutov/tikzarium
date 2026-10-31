//! C/N2 read-only literal declaration provenance: source spans are evidence,
//! not project package installation and not permission for unreviewed edits.
use tikzarium_extensions::{
    primitive_edit::SourceTarget,
    primitives::{Catalog, Evidence},
    project_disconnect::{DisconnectDecision, plan_library_disconnect},
    project_imports::{ImportDecision, ImportKind, capabilities_for_tool, inspect, plan_import},
};

#[test]
fn byte_ranges_point_at_exact_names_across_crlf_unicode_options_and_comments() {
    let source = concat!(
        "\\documentclass{article}\r\n",
        "% русский комментарий: \\usepackage{fake}\r\n",
        "  \\usepackage[draft]{tikz, xcolor}\r\n",
        "\\usetikzlibrary{arrows.meta,  calc,fit} % пользователь\r\n",
        "\\begin{document}\r\n",
    );
    let project = inspect(source);
    assert_eq!(project.uncertain_reason, None);
    for (kind, name, expected_line) in [
        (ImportKind::Package, "tikz", "\\usepackage[draft]"),
        (ImportKind::Package, "xcolor", "\\usepackage[draft]"),
        (ImportKind::TikzLibrary, "arrows.meta", "\\usetikzlibrary"),
        (ImportKind::TikzLibrary, "calc", "\\usetikzlibrary"),
        (ImportKind::TikzLibrary, "fit", "\\usetikzlibrary"),
    ] {
        let sites = project.declaration_sites(kind, name);
        assert_eq!(sites.len(), 1, "{name}");
        let site = &sites[0];
        assert_eq!(&source[site.name_range.clone()], name);
        assert!(source[site.line_range.clone()].contains(expected_line));
        assert!(!source[site.line_range.clone()].contains('\r'));
        assert_eq!(project.status(kind, name), Evidence::Confirmed);
    }
    assert!(
        project
            .declaration_sites(ImportKind::Package, "fake")
            .is_empty()
    );
    assert_eq!(
        project.status(ImportKind::Package, "fake"),
        Evidence::Absent
    );
    assert!(
        project
            .declaration_sites(ImportKind::TikzLibrary, "xcolor")
            .is_empty()
    );
    assert_eq!(
        project.status(ImportKind::TikzLibrary, "xcolor"),
        Evidence::Absent
    );
}

#[test]
fn utf8_bom_and_indented_declarations_preserve_original_byte_offsets() {
    let source = "\u{feff}  \\documentclass{article}\n\\usepackage{tikz}\n  \\usetikzlibrary{calc}\n\\begin{document}\n";
    let project = inspect(source);
    assert_eq!(project.uncertain_reason, None);
    let sites = project.declaration_sites(ImportKind::TikzLibrary, "calc");
    assert_eq!(sites.len(), 1);
    assert_eq!(&source[sites[0].name_range.clone()], "calc");
    assert_eq!(
        &source[sites[0].line_range.clone()],
        "  \\usetikzlibrary{calc}"
    );
    assert_eq!(
        project.status(ImportKind::Package, "tikz"),
        Evidence::Confirmed
    );
}

#[test]
fn trusted_prefix_is_attributed_but_later_opaque_declarations_remain_unknown() {
    let source = concat!(
        "\\documentclass{article}\n",
        "\\usepackage{fontspec}\n",
        "\\setmainfont{DejaVu Serif}\n",
        "\\usepackage{tikz}\n",
        "\\usetikzlibrary{calc}\n",
        "\\newcommand{\\user}{not a library}\n",
        "\\usetikzlibrary{fit}\n",
        "\\begin{document}\n",
    );
    let project = inspect(source);
    assert!(project.uncertain_reason.is_some());
    assert_eq!(
        project.status(ImportKind::TikzLibrary, "calc"),
        Evidence::Confirmed
    );
    assert_eq!(
        project
            .declaration_sites(ImportKind::TikzLibrary, "calc")
            .len(),
        1
    );
    assert_eq!(
        project.status(ImportKind::TikzLibrary, "fit"),
        Evidence::Unknown
    );
    assert!(
        project
            .declaration_sites(ImportKind::TikzLibrary, "fit")
            .is_empty()
    );
    assert_eq!(
        project.status(ImportKind::TikzLibrary, "arrows.meta"),
        Evidence::Unknown
    );
    assert!(
        project
            .declaration_sites(ImportKind::TikzLibrary, "arrows.meta")
            .is_empty()
    );
    assert!(project.begin_document_target(9).is_none());
    assert!(matches!(
        plan_import(
            source,
            SourceTarget::new(0..0, 9),
            ImportKind::TikzLibrary,
            "arrows.meta"
        ),
        ImportDecision::Refused { .. }
    ));
}

#[test]
fn conditional_or_macro_before_literal_import_creates_no_false_site() {
    for opaque in [
        "\\iftrue",
        "\\input{foreign-preamble}",
        "\\setmainfont{\\UserFont}",
    ] {
        let source = format!(
            "\\documentclass{{article}}\n{opaque}\n\\usepackage{{tikz}}\n\\usetikzlibrary{{calc}}\n\\begin{{document}}\n"
        );
        let project = inspect(&source);
        assert!(project.uncertain_reason.is_some());
        assert_eq!(
            project.status(ImportKind::Package, "tikz"),
            Evidence::Unknown
        );
        assert_eq!(
            project.status(ImportKind::TikzLibrary, "calc"),
            Evidence::Unknown
        );
        assert!(
            project
                .declaration_sites(ImportKind::Package, "tikz")
                .is_empty()
        );
        assert!(
            project
                .declaration_sites(ImportKind::TikzLibrary, "calc")
                .is_empty()
        );
    }
}

#[test]
fn packages_and_libraries_before_documentclass_are_not_claimed_loaded() {
    for source in [
        "\\usepackage{tikz}\n\\documentclass{article}\n\\begin{document}\n",
        "\\usepackage{tikz}\n\\usetikzlibrary{calc}\n\\documentclass{article}\n\\begin{document}\n",
    ] {
        let project = inspect(source);
        assert!(project.uncertain_reason.is_some());
        assert_eq!(
            project.status(ImportKind::Package, "tikz"),
            Evidence::Unknown
        );
        assert!(
            project
                .declaration_sites(ImportKind::Package, "tikz")
                .is_empty()
        );
        assert!(
            project
                .declaration_sites(ImportKind::TikzLibrary, "calc")
                .is_empty()
        );
        assert!(project.begin_document_target(0).is_none());
        assert!(matches!(
            plan_import(
                source,
                SourceTarget::new(0..0, 0),
                ImportKind::TikzLibrary,
                "fit"
            ),
            ImportDecision::Refused { .. }
        ));
    }
}

#[test]
fn multiple_literal_import_sites_are_reported_without_permitting_unsafe_disconnect() {
    let source = concat!(
        "\\documentclass{article}\n",
        "\\usepackage{tikz}\n",
        "\\usetikzlibrary{calc, fit}\n",
        "\\usetikzlibrary{calc}\n",
        "\\begin{document}\n",
    );
    let project = inspect(source);
    assert_eq!(project.uncertain_reason, None);
    let sites = project.declaration_sites(ImportKind::TikzLibrary, "calc");
    assert_eq!(sites.len(), 2);
    assert!(sites[0].name_range.start < sites[1].name_range.start);
    for site in &sites {
        assert_eq!(&source[site.name_range.clone()], "calc");
    }
    assert!(matches!(
        plan_library_disconnect(source, project.begin_document_target(17).unwrap(), "calc"),
        DisconnectDecision::Refused { .. }
    ));
}

#[test]
fn existing_six_primitive_capabilities_and_help_are_unchanged() {
    let source = include_str!("../../../extensions/primitives/fixtures/all-six.tex");
    let project = inspect(source);
    let catalog = Catalog::bundled().unwrap();
    assert_eq!(
        project.status(ImportKind::Package, "tikz"),
        Evidence::Confirmed
    );
    assert_eq!(
        project.declaration_sites(ImportKind::Package, "tikz").len(),
        1
    );
    for tool_id in [
        "tikz.line",
        "tikz.arrow",
        "tikz.rectangle",
        "tikz.circle",
        "tikz.node",
        "tikz.bezier-cubic",
    ] {
        let caps = capabilities_for_tool(
            &catalog,
            tool_id,
            &project,
            Evidence::Unknown,
            Some("xelatex"),
        )
        .unwrap();
        assert_eq!(caps.project_loaded, Evidence::Confirmed, "{tool_id}");
        assert_eq!(caps.installed, Evidence::Unknown, "{tool_id}");
        assert_eq!(caps.engine_compatible, Evidence::Confirmed, "{tool_id}");
        assert_eq!(caps.tool_implemented, Evidence::Confirmed, "{tool_id}");
        assert_eq!(caps.help_available, Evidence::Confirmed, "{tool_id}");
        assert!(!caps.visual_editable);
    }
}
