//! C/N2 single-schema library panel contract; no B UI or package installation.
use std::collections::BTreeMap;
use tikzarium_extensions::{
    primitive_edit::SourceTarget,
    primitives::{Catalog, Evidence, N2_LIBRARY_NAMES},
    project_disconnect::{DisconnectDecision, plan_library_disconnect},
    project_imports::{ImportDecision, ImportKind, capabilities_for_library, inspect, plan_import},
};

fn target(source: &str, revision: u64) -> SourceTarget {
    inspect(source)
        .begin_document_target(revision)
        .expect("complete literal preamble")
}

#[test]
fn four_libraries_are_in_the_same_schema_as_six_native_tools() {
    let catalog = Catalog::bundled().unwrap();
    assert_eq!(catalog.tools.len(), 6);
    assert_eq!(catalog.libraries.len(), 4);
    for name in N2_LIBRARY_NAMES {
        let record = catalog.library(name).expect("declarative record");
        assert_eq!(record.name, name);
        assert_eq!(record.syntax, format!("\\usetikzlibrary{{{name}}}"));
        assert_eq!(record.requirements.libraries, [name]);
        assert_eq!(record.requirements.packages, ["tikz"]);
        assert_eq!(record.requirements.engine, "xelatex");
        assert_eq!(record.requirements.pgf_version_min, "UNKNOWN");
        assert!(!record.help_ru.trim().is_empty());
        assert!(!record.warning_ru.trim().is_empty());
        assert!(!record.interaction_ru.trim().is_empty());
        assert!(!record.manual_section.trim().is_empty());
        assert!(record.manual_url.starts_with("https://tikz.dev/"));
        assert!(record.example.contains("\\begin{tikzpicture}"));
        assert!(record.example.contains("\\end{tikzpicture}"));
    }
    // Shared library additions never rewrite the original N1 source output.
    let original_fixture = include_str!("../../../extensions/primitives/fixtures/all-six.tex");
    assert_eq!(
        catalog.fixture_document().unwrap(),
        original_fixture.replace("\r\n", "\n")
    );
    for tool in &catalog.tools {
        assert_eq!(
            catalog.generate(&tool.id, &BTreeMap::new()).unwrap().source,
            tool.example
        );
    }
}

#[test]
fn installation_loaded_engine_tool_and_help_remain_five_independent_states() {
    let catalog = Catalog::bundled().unwrap();
    let source = "\\documentclass{article}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta,calc}\n\\begin{document}\n";
    let project = inspect(source);
    for name in N2_LIBRARY_NAMES {
        let states =
            capabilities_for_library(&catalog, name, &project, Evidence::Unknown, Some("xelatex"))
                .unwrap();
        assert_eq!(states.installed, Evidence::Unknown);
        assert_eq!(states.engine_compatible, Evidence::Confirmed);
        assert_eq!(states.help_available, Evidence::Confirmed);
        assert!(!states.visual_editable);
        assert_eq!(
            states.project_loaded,
            if ["arrows.meta", "calc"].contains(&name) {
                Evidence::Confirmed
            } else {
                Evidence::Absent
            }
        );
        assert_eq!(
            states.tool_implemented,
            if name == "arrows.meta" {
                Evidence::Confirmed
            } else {
                Evidence::Absent
            }
        );
    }
    let different_engine = capabilities_for_library(
        &catalog,
        "fit",
        &project,
        Evidence::Confirmed,
        Some("lualatex"),
    )
    .unwrap();
    assert_eq!(different_engine.installed, Evidence::Confirmed);
    assert_eq!(different_engine.engine_compatible, Evidence::Absent);
    assert_eq!(different_engine.project_loaded, Evidence::Absent);
    assert!(
        capabilities_for_library(
            &catalog,
            "graphdrawing",
            &project,
            Evidence::Confirmed,
            Some("xelatex")
        )
        .is_err()
    );
}

#[test]
fn opaque_conditional_import_is_unknown_not_missing_or_installed() {
    let catalog = Catalog::bundled().unwrap();
    let source = "\\documentclass{article}\n\\iftrue\n\\usepackage{tikz}\n\\usetikzlibrary{fit}\n\\fi\n\\begin{document}\n";
    let project = inspect(source);
    let capabilities = capabilities_for_library(
        &catalog,
        "fit",
        &project,
        Evidence::Unknown,
        Some("xelatex"),
    )
    .unwrap();
    assert_eq!(capabilities.project_loaded, Evidence::Unknown);
    assert_eq!(capabilities.installed, Evidence::Unknown);
    assert!(
        project
            .declaration_sites(ImportKind::TikzLibrary, "fit")
            .is_empty()
    );
    assert!(matches!(
        plan_import(
            source,
            SourceTarget::new(0..0, 8),
            ImportKind::TikzLibrary,
            "fit"
        ),
        ImportDecision::Refused { .. }
    ));
    assert!(matches!(
        plan_library_disconnect(source, SourceTarget::new(0..0, 8), "fit"),
        DisconnectDecision::Refused { .. }
    ));
}

#[test]
fn four_library_connect_disconnect_proposals_are_reversible_with_crlf_and_unicode() {
    let catalog = Catalog::bundled().unwrap();
    for name in N2_LIBRARY_NAMES {
        let mut source = "\\documentclass{article}\r\n% Живой комментарий\r\n\\begin{document}\r\n\\Unknown{сохранить}\r\n\\end{document}\r\n".to_owned();
        let original = source.clone();
        let mut revision = 31;
        let plan = match plan_import(
            &source,
            target(&source, revision),
            ImportKind::TikzLibrary,
            name,
        ) {
            ImportDecision::Proposed(plan) => plan,
            other => panic!("expected literal import proposal: {other:?}"),
        };
        assert_eq!(
            plan.declarations,
            [
                "\\usepackage{tikz}".to_owned(),
                format!("\\usetikzlibrary{{{name}}}")
            ]
        );
        assert_eq!(source, original);
        let undo_import = plan.apply(&mut source, &mut revision).unwrap();
        assert_eq!(revision, 32);
        assert_eq!(
            capabilities_for_library(
                &catalog,
                name,
                &inspect(&source),
                Evidence::Unknown,
                Some("xelatex")
            )
            .unwrap()
            .project_loaded,
            Evidence::Confirmed
        );
        assert!(source.contains("% Живой комментарий\r\n"));
        assert!(source.contains("\\Unknown{сохранить}\r\n"));
        assert!(!source.replace("\r\n", "").contains('\n'));
        let disconnect = match plan_library_disconnect(&source, target(&source, revision), name) {
            DisconnectDecision::Proposed(plan) => plan,
            other => panic!("expected literal disconnect proposal: {other:?}"),
        };
        let after_import = source.clone();
        let undo_disconnect = disconnect.apply(&mut source, &mut revision).unwrap();
        assert_eq!(revision, 33);
        assert_eq!(
            inspect(&source).status(ImportKind::TikzLibrary, name),
            Evidence::Absent
        );
        undo_disconnect.apply(&mut source, &mut revision).unwrap();
        assert_eq!(source, after_import);
        // The imported state has changed revision; a fresh revision-correct inverse
        // patch is needed. Older undo_import is intentionally stale now.
        assert!(undo_import.apply(&mut source, &mut revision).is_err());
        assert_eq!(source, after_import);
    }
}

#[test]
fn unmodified_inverse_import_restores_every_byte_and_rejects_stale_revision() {
    let mut source = "\\documentclass{article}\n\\begin{document}\n".to_owned();
    let original = source.clone();
    let mut revision = 8;
    let plan = match plan_import(
        &source,
        target(&source, revision),
        ImportKind::TikzLibrary,
        "positioning",
    ) {
        ImportDecision::Proposed(plan) => plan,
        other => panic!("proposal expected: {other:?}"),
    };
    let inverse = plan.apply(&mut source, &mut revision).unwrap();
    let inserted = source.clone();
    let mut wrong_revision = revision + 1;
    assert!(inverse.apply(&mut source, &mut wrong_revision).is_err());
    assert_eq!(source, inserted);
    inverse.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source, original);
}

#[test]
fn already_connected_and_missing_are_distinct_from_unknown() {
    let catalog = Catalog::bundled().unwrap();
    let source =
        "\\documentclass{article}\n\\usepackage{tikz}\n\\usetikzlibrary{calc}\n\\begin{document}\n";
    let state = inspect(source);
    assert_eq!(
        capabilities_for_library(&catalog, "calc", &state, Evidence::Absent, Some("xelatex"))
            .unwrap()
            .project_loaded,
        Evidence::Confirmed
    );
    assert_eq!(
        state.status(ImportKind::TikzLibrary, "fit"),
        Evidence::Absent
    );
    assert_eq!(
        plan_import(source, target(source, 0), ImportKind::TikzLibrary, "calc"),
        ImportDecision::AlreadyLoaded
    );
    assert_eq!(
        plan_library_disconnect(source, target(source, 0), "fit"),
        DisconnectDecision::AlreadyAbsent
    );
}
