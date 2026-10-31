//! C/N2 source-disconnect contract: literal-only, byte-minimal, reversible.
use tikzarium_extensions::{
    primitive_edit::SourceTarget,
    primitives::Evidence,
    project_disconnect::{DisconnectDecision, DisconnectPlan, plan_library_disconnect},
    project_imports::{ImportKind, inspect},
};

fn target(source: &str, revision: u64) -> SourceTarget {
    inspect(source)
        .begin_document_target(revision)
        .expect("safe literal preamble")
}

fn planned(source: &str, revision: u64, name: &str) -> DisconnectPlan {
    match plan_library_disconnect(source, target(source, revision), name) {
        DisconnectDecision::Proposed(plan) => plan,
        other => panic!("expected safe proposal for {name}: {other:?}"),
    }
}

fn preamble(libs: &str) -> String {
    format!(
        "\\documentclass{{article}}\n\\usepackage{{tikz}}\n\\usetikzlibrary{{{libs}}}\n\\begin{{document}}\n\\unknown{{сырой TeX}}\n\\end{{document}}\n"
    )
}

#[test]
fn standalone_crlf_disconnect_requires_confirmed_diff_and_undo_restores_every_byte() {
    let mut source = "\\documentclass{article}\r\n\\usepackage{tikz}\r\n% русский комментарий\r\n\\usetikzlibrary{calc}\r\n\\begin{document}\r\n\\unknown{сохранить}\r\n\\end{document}\r\n".to_owned();
    let before = source.clone();
    let mut revision = 12;
    let plan = planned(&source, revision, "calc");
    assert_eq!(plan.patch.expected_old, "\\usetikzlibrary{calc}\r\n");
    assert_eq!(plan.patch.replacement, "");
    assert!(plan.remaining_on_line.is_empty());
    assert_eq!(source, before, "planning cannot mutate the source");
    let inverse = plan.apply(&mut source, &mut revision).unwrap();
    assert_eq!(revision, 13);
    assert_eq!(
        inspect(&source).status(ImportKind::TikzLibrary, "calc"),
        Evidence::Absent
    );
    assert!(source.contains("% русский комментарий\r\n"));
    assert!(source.contains("\\unknown{сохранить}\r\n"));
    assert!(!source.replace("\r\n", "").contains('\n'));
    inverse.apply(&mut source, &mut revision).unwrap();
    assert_eq!(before, source);
    assert_eq!(revision, 14);
}

#[test]
fn all_four_known_libraries_disconnect_without_changing_other_declarations() {
    for selected in ["arrows.meta", "positioning", "calc", "fit"] {
        let mut source = "\\documentclass{article}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta}\n\\usetikzlibrary{positioning}\n\\usetikzlibrary{calc}\n\\usetikzlibrary{fit}\n\\begin{document}\n".to_owned();
        let before = source.clone();
        let mut revision = 5;
        let plan = planned(&source, revision, selected);
        assert_eq!(
            plan.patch.expected_old,
            format!("\\usetikzlibrary{{{selected}}}\n")
        );
        let inverse = plan.apply(&mut source, &mut revision).unwrap();
        for candidate in ["arrows.meta", "positioning", "calc", "fit"] {
            assert_eq!(
                inspect(&source).status(ImportKind::TikzLibrary, candidate),
                if candidate == selected {
                    Evidence::Absent
                } else {
                    Evidence::Confirmed
                },
                "selected={selected}, candidate={candidate}"
            );
        }
        inverse.apply(&mut source, &mut revision).unwrap();
        assert_eq!(source, before);
    }
}

#[test]
fn first_middle_last_in_comma_lists_remove_only_one_literal() {
    let cases = [
        ("arrows.meta", "positioning, calc, fit"),
        ("calc", "arrows.meta, positioning, fit"),
        ("fit", "arrows.meta, positioning, calc"),
    ];
    for (selected, expected) in cases {
        let mut source = preamble("arrows.meta, positioning, calc, fit");
        let original = source.clone();
        let mut revision = 0;
        let plan = planned(&source, revision, selected);
        assert_eq!(plan.remaining_on_line.len(), 3);
        let inverse = plan.apply(&mut source, &mut revision).unwrap();
        assert!(
            source.contains(&format!("\\usetikzlibrary{{{expected}}}")),
            "selected={selected}, source={source:?}"
        );
        assert_eq!(
            inspect(&source).status(ImportKind::TikzLibrary, selected),
            Evidence::Absent
        );
        assert!(source.contains("\\unknown{сырой TeX}"));
        inverse.apply(&mut source, &mut revision).unwrap();
        assert_eq!(source, original);
    }
}

#[test]
fn minimal_comma_range_preserves_surviving_spacing_and_unicode_body() {
    let mut source = preamble("arrows.meta,  calc  ,  fit");
    let before = source.clone();
    let mut revision = 1;
    let plan = planned(&source, revision, "calc");
    assert_eq!(plan.patch.expected_old, ",  calc  ");
    let inverse = plan.apply(&mut source, &mut revision).unwrap();
    assert!(source.contains("\\usetikzlibrary{arrows.meta,  fit}"));
    inverse.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source, before);
}

#[test]
fn duplicate_imports_are_refused_instead_of_claiming_disconnected() {
    for source in [
        preamble("calc,calc"),
        "\\documentclass{article}\n\\usepackage{tikz}\n\\usetikzlibrary{calc}\n\\usetikzlibrary{calc}\n\\begin{document}\n".to_owned(),
    ] {
        assert_eq!(
            inspect(&source).status(ImportKind::TikzLibrary, "calc"),
            Evidence::Confirmed
        );
        assert!(matches!(
            plan_library_disconnect(&source, target(&source, 3), "calc"),
            DisconnectDecision::Refused { .. }
        ));
    }
}

#[test]
fn inline_comments_are_preserved_by_refusing_to_edit_them() {
    for tail in [
        "\\usetikzlibrary{calc} % моя пометка",
        "\\usetikzlibrary{calc, fit} % keep this",
    ] {
        let source = format!(
            "\\documentclass{{article}}\n\\usepackage{{tikz}}\n{tail}\n\\begin{{document}}\n"
        );
        assert_eq!(
            inspect(&source).status(ImportKind::TikzLibrary, "calc"),
            Evidence::Confirmed
        );
        assert!(matches!(
            plan_library_disconnect(&source, target(&source, 0), "calc"),
            DisconnectDecision::Refused { .. }
        ));
    }
}

#[test]
fn opaque_macros_conditional_imports_and_mixed_line_endings_are_unknown() {
    for source in [
        "\\documentclass{article}\n\\usepackage{tikz}\n\\newcommand{\\loadcalc}{\\usetikzlibrary{calc}}\n\\begin{document}\n",
        "\\documentclass{article}\n\\usepackage{tikz}\n\\iftrue\n\\usetikzlibrary{calc}\n\\fi\n\\begin{document}\n",
        "\\documentclass{article}\r\n\\usepackage{tikz}\n\\usetikzlibrary{calc}\n\\begin{document}\n",
    ] {
        assert!(inspect(source).uncertain_reason.is_some());
        assert!(matches!(
            plan_library_disconnect(source, SourceTarget::new(0..0, 0), "calc"),
            DisconnectDecision::Refused { .. }
        ));
    }
}

#[test]
fn absent_names_and_unsupported_packages_never_trigger_hidden_changes() {
    let source = preamble("positioning");
    assert_eq!(
        plan_library_disconnect(&source, target(&source, 0), "calc"),
        DisconnectDecision::AlreadyAbsent
    );
    assert!(matches!(
        plan_library_disconnect(&source, target(&source, 0), "graphdrawing"),
        DisconnectDecision::Refused { .. }
    ));
    assert!(matches!(
        plan_library_disconnect(&source, SourceTarget::new(0..0, 0), "calc"),
        DisconnectDecision::Refused { .. }
    ));
}

#[test]
fn changed_anchor_stale_revision_and_undo_conflicts_fail_without_mutation() {
    let original = preamble("calc");
    let plan = planned(&original, 7, "calc");
    let mut changed = original.clone();
    let mut revision = 8;
    assert!(plan.apply(&mut changed, &mut revision).is_err());
    assert_eq!(changed, original);

    let mut damaged_anchor = original.replacen("\\begin{document}", "\\beg1n{document}", 1);
    let before = damaged_anchor.clone();
    let mut revision = 7;
    assert!(plan.apply(&mut damaged_anchor, &mut revision).is_err());
    assert_eq!(damaged_anchor, before);

    let mut intact = original.clone();
    let mut revision = 7;
    let inverse = plan.apply(&mut intact, &mut revision).unwrap();
    let modified = intact.clone();
    revision += 1; // simulated manual source edit invalidates visual undo
    assert!(inverse.apply(&mut intact, &mut revision).is_err());
    assert_eq!(intact, modified);
}
