use tikzarium_extensions::{
    primitive_edit::SourceTarget,
    primitives::{Catalog, Evidence},
    project_imports::{ImportDecision, ImportKind, capabilities_for_tool, inspect, plan_import},
};

fn preamble() -> String {
    "\\documentclass[12pt]{article}\n\\usepackage{tikz,xcolor}\n\\begin{document}\n\\unknownbodymacro{не трогать}\n\\end{document}\n".to_owned()
}

fn target(source: &str, revision: u64) -> SourceTarget {
    inspect(source).begin_document_target(revision).unwrap()
}

#[test]
fn explicit_package_and_library_lists_are_not_installation_evidence() {
    let src = "\\documentclass[border=2pt]{standalone}\n\\usepackage[foo=bar]{tikz,xcolor}\n\\usetikzlibrary{arrows.meta, calc}\n\\begin{document}\n";
    let p = inspect(src);
    assert_eq!(p.uncertain_reason, None);
    assert_eq!(p.status(ImportKind::Package, "tikz"), Evidence::Confirmed);
    assert_eq!(p.status(ImportKind::Package, "xcolor"), Evidence::Confirmed);
    assert_eq!(
        p.status(ImportKind::TikzLibrary, "arrows.meta"),
        Evidence::Confirmed
    );
    assert_eq!(
        p.status(ImportKind::TikzLibrary, "calc"),
        Evidence::Confirmed
    );
    assert_eq!(
        p.status(ImportKind::TikzLibrary, "positioning"),
        Evidence::Absent
    );
    assert_eq!(
        p.status(ImportKind::Package, "circuitikz"),
        Evidence::Absent
    );
}

#[test]
fn commented_declarations_are_not_loaded_and_escaped_percent_is_not_a_comment() {
    let src = "\\documentclass{article}\n% \\usetikzlibrary{arrows.meta}\n\\usepackage{tikz} % \\usetikzlibrary{fit}\n\\begin{document}\n\\node{100\\%};\n";
    let p = inspect(src);
    assert_eq!(p.uncertain_reason, None);
    assert_eq!(
        p.status(ImportKind::TikzLibrary, "arrows.meta"),
        Evidence::Absent
    );
    assert_eq!(p.status(ImportKind::TikzLibrary, "fit"), Evidence::Absent);
    assert_eq!(p.status(ImportKind::Package, "tikz"), Evidence::Confirmed);
}

#[test]
fn mixed_indirect_macro_or_conditional_imports_are_unknown_not_missing() {
    let cases = [
        "\\documentclass{article}\n\\newcommand{\\myimports}{\\usetikzlibrary{arrows.meta}}\n\\begin{document}\n",
        "\\documentclass{article}\n\\iftrue\n\\usetikzlibrary{calc}\n\\fi\n\\begin{document}\n",
        "\\documentclass{article}\n\\usepackage{\\mypackage}\n\\begin{document}\n",
        "\\documentclass{article}\n\\input{external-preamble}\n\\begin{document}\n",
        "\\documentclass{article}\n\\usetikzlibrary{calc}\n\\mystery\n\\begin{document}\n",
        "\\documentclass{article}\r\n\\begin{document}\n",
        "\\documentclass{article}\n\\begin{document}\\relax\n",
        "\\usepackage{tikz}\n\\begin{document}\n",
        "\\documentclass{article}\n\\usepackage{tikz}\n",
    ];
    for source in cases {
        let p = inspect(source);
        assert!(p.uncertain_reason.is_some(), "case: {source:?}");
        assert_eq!(p.status(ImportKind::Package, "tikz"), Evidence::Unknown);
        assert_eq!(p.status(ImportKind::TikzLibrary, "calc"), Evidence::Unknown);
        assert!(p.begin_document_target(2).is_none());
        assert!(matches!(
            plan_import(
                source,
                SourceTarget::new(0..0, 2),
                ImportKind::TikzLibrary,
                "calc"
            ),
            ImportDecision::Refused { .. }
        ));
    }
}

#[test]
fn crlf_proposal_is_visible_then_undo_restores_every_original_byte() {
    let mut source = "\\documentclass{article}\r\n\\usepackage{tikz}\r\n% пользовательский комментарий\r\n\\begin{document}\r\n\\unknown{raw TeX}\r\n\\end{document}\r\n".to_owned();
    let before = source.clone();
    let mut revision = 41;
    let plan = match plan_import(
        &source,
        target(&source, revision),
        ImportKind::TikzLibrary,
        "arrows.meta",
    ) {
        ImportDecision::Proposed(plan) => plan,
        other => panic!("expected proposal, got {other:?}"),
    };
    assert_eq!(plan.declarations, ["\\usetikzlibrary{arrows.meta}"]);
    assert_eq!(plan.patch.replacement, "\\usetikzlibrary{arrows.meta}\r\n");
    assert_eq!(source, before, "planning must not edit the document");
    let inverse = plan.apply(&mut source, &mut revision).unwrap();
    assert!(source.contains("\\usetikzlibrary{arrows.meta}\r\n\\begin{document}"));
    assert!(source.contains("% пользовательский комментарий\r\n"));
    assert!(source.contains("\\unknown{raw TeX}\r\n"));
    assert!(!source.replace("\r\n", "").contains('\n'));
    assert_eq!(revision, 42);
    inverse.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source, before);
    assert_eq!(revision, 43);
}

#[test]
fn literal_package_is_added_only_when_tikz_is_truly_absent() {
    let mut source = "\\documentclass{article}\n% unrelated\n\\begin{document}\nHi\n".to_owned();
    let before = source.clone();
    let mut revision = 0;
    let proposed = plan_import(
        &source,
        target(&source, revision),
        ImportKind::TikzLibrary,
        "positioning",
    );
    let plan = match proposed {
        ImportDecision::Proposed(p) => p,
        other => panic!("expected proposal, got {other:?}"),
    };
    assert_eq!(
        plan.declarations,
        ["\\usepackage{tikz}", "\\usetikzlibrary{positioning}"]
    );
    assert!(plan.patch.replacement.ends_with("\n"));
    let inverse = plan.apply(&mut source, &mut revision).unwrap();
    assert!(source.contains(
        "% unrelated\n\\usepackage{tikz}\n\\usetikzlibrary{positioning}\n\\begin{document}"
    ));
    inverse.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source, before);
}

#[test]
fn four_supported_libraries_have_source_patches_and_duplicates_are_noops() {
    for lib in ["arrows.meta", "positioning", "calc", "fit"] {
        let mut source = preamble();
        let mut revision = 5;
        let plan = match plan_import(
            &source,
            target(&source, revision),
            ImportKind::TikzLibrary,
            lib,
        ) {
            ImportDecision::Proposed(p) => p,
            other => panic!("failed {lib}: {other:?}"),
        };
        assert_eq!(plan.declarations, [format!("\\usetikzlibrary{{{lib}}}")]);
        let _undo = plan.apply(&mut source, &mut revision).unwrap();
        assert_eq!(
            inspect(&source).status(ImportKind::TikzLibrary, lib),
            Evidence::Confirmed
        );
        assert_eq!(
            plan_import(
                &source,
                target(&source, revision),
                ImportKind::TikzLibrary,
                lib
            ),
            ImportDecision::AlreadyLoaded
        );
    }
}

#[test]
fn stale_revision_wrong_anchor_and_manual_anchor_edits_are_rejected() {
    let original = preamble();
    let plan = match plan_import(
        &original,
        target(&original, 7),
        ImportKind::TikzLibrary,
        "fit",
    ) {
        ImportDecision::Proposed(p) => p,
        other => panic!("expected proposal, got {other:?}"),
    };
    let mut changed = original.clone();
    let mut current_revision = 8;
    assert!(plan.apply(&mut changed, &mut current_revision).is_err());
    assert_eq!(changed, original);
    let mut wrong_anchor = original.replacen("\\begin{document}", "\\beg1n{document}", 1);
    let before = wrong_anchor.clone();
    let mut revision = 7;
    assert!(plan.apply(&mut wrong_anchor, &mut revision).is_err());
    assert_eq!(wrong_anchor, before);
    let wrong_range = SourceTarget::new(0..0, 7);
    assert!(matches!(
        plan_import(&original, wrong_range, ImportKind::TikzLibrary, "fit"),
        ImportDecision::Refused { .. }
    ));
}

#[test]
fn unsupported_names_refuse_without_touching_source_or_installation() {
    let source = preamble();
    assert!(matches!(
        plan_import(
            &source,
            target(&source, 0),
            ImportKind::TikzLibrary,
            "graphdrawing"
        ),
        ImportDecision::Refused { .. }
    ));
    assert!(matches!(
        plan_import(
            &source,
            target(&source, 0),
            ImportKind::Package,
            "circuitikz"
        ),
        ImportDecision::Refused { .. }
    ));
    assert!(matches!(
        plan_import(&source, target(&source, 0), ImportKind::Package, "tikz"),
        ImportDecision::AlreadyLoaded
    ));
}

#[test]
fn generated_primitive_requirements_keep_five_independent_states() {
    let c = Catalog::bundled().unwrap();
    let p = inspect(&preamble());
    let arrow =
        capabilities_for_tool(&c, "tikz.arrow", &p, Evidence::Confirmed, Some("xelatex")).unwrap();
    assert_eq!(arrow.installed, Evidence::Confirmed);
    assert_eq!(arrow.project_loaded, Evidence::Absent);
    assert_eq!(arrow.engine_compatible, Evidence::Confirmed);
    assert_eq!(arrow.tool_implemented, Evidence::Confirmed);
    assert_eq!(arrow.help_available, Evidence::Confirmed);
    assert!(!arrow.visual_editable);
    let line =
        capabilities_for_tool(&c, "tikz.line", &p, Evidence::Unknown, Some("xelatex")).unwrap();
    assert_eq!(line.installed, Evidence::Unknown);
    assert_eq!(line.project_loaded, Evidence::Confirmed);
    let math = capabilities_for_tool(&c, "tikz.node", &p, Evidence::Confirmed, None).unwrap();
    assert_eq!(math.engine_compatible, Evidence::Unknown);
}

#[test]
fn core_existing_fixture_does_not_regress_to_unknown_for_pagestyle() {
    let fixture = include_str!("../../../extensions/primitives/fixtures/all-six.tex");
    let p = inspect(fixture);
    assert_eq!(p.uncertain_reason, None);
    assert_eq!(p.status(ImportKind::Package, "tikz"), Evidence::Confirmed);
    assert_eq!(
        p.status(ImportKind::TikzLibrary, "arrows.meta"),
        Evidence::Confirmed
    );
}

#[test]
fn library_before_tikz_is_unknown_and_refused_not_silently_reordered() {
    let source = "\\documentclass{article}\n\\usetikzlibrary{calc}\n\\begin{document}\n".to_owned();
    let before = source.clone();
    let p = inspect(&source);
    assert!(p.uncertain_reason.is_some());
    assert_eq!(p.status(ImportKind::TikzLibrary, "calc"), Evidence::Unknown);
    assert!(matches!(
        plan_import(
            &source,
            SourceTarget::new(0..0, 3),
            ImportKind::TikzLibrary,
            "calc"
        ),
        ImportDecision::Refused { .. }
    ));
    assert_eq!(source, before);
}

#[test]
fn standalone_usepackage_import_is_a_reversible_literal_patch() {
    let mut source = "\\documentclass{article}\n\\begin{document}\n".to_owned();
    let before = source.clone();
    let mut revision = 15;
    let plan = match plan_import(
        &source,
        target(&source, revision),
        ImportKind::Package,
        "tikz",
    ) {
        ImportDecision::Proposed(p) => p,
        other => panic!("expected package proposal, got {other:?}"),
    };
    assert_eq!(plan.declarations, ["\\usepackage{tikz}"]);
    let inverse = plan.apply(&mut source, &mut revision).unwrap();
    assert_eq!(
        inspect(&source).status(ImportKind::Package, "tikz"),
        Evidence::Confirmed
    );
    inverse.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source, before);
}

#[test]
fn n1_fontspec_source_keeps_direct_import_evidence_and_all_six_tools() {
    // Exact direct-import structure from the app's N1 authoring proof.
    // The user macro is opaque; it does not invalidate already-observed
    // literal imports, but any *missing* import remains UNKNOWN.
    let source = r"\documentclass{standalone}
\usepackage{fontspec}
\usepackage{unicode-math}
\setmainfont{DejaVu Serif}
\setmathfont{latinmodern-math.otf}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
\newcommand{\UserPath}{\path (0,0);}
\begin{document}
\begin{tikzpicture}
\UserPath
\end{tikzpicture}
\end{document}
";
    for text in [source.to_owned(), source.replace('\n', "\r\n")] {
        let project = inspect(&text);
        assert!(project.uncertain_reason.is_some());
        assert_eq!(
            project.status(ImportKind::Package, "tikz"),
            Evidence::Confirmed
        );
        assert_eq!(
            project.status(ImportKind::Package, "fontspec"),
            Evidence::Confirmed
        );
        assert_eq!(
            project.status(ImportKind::TikzLibrary, "arrows.meta"),
            Evidence::Confirmed
        );
        assert_eq!(
            project.status(ImportKind::TikzLibrary, "calc"),
            Evidence::Unknown
        );
        assert!(
            project.begin_document_target(8).is_none(),
            "no unsafe auto import"
        );
        let catalog = Catalog::bundled().unwrap();
        for id in [
            "tikz.line",
            "tikz.arrow",
            "tikz.rectangle",
            "tikz.circle",
            "tikz.node",
            "tikz.bezier-cubic",
        ] {
            let state =
                capabilities_for_tool(&catalog, id, &project, Evidence::Unknown, Some("xelatex"))
                    .unwrap();
            assert_eq!(state.project_loaded, Evidence::Confirmed, "{id}");
            assert_eq!(state.installed, Evidence::Unknown, "{id}");
            assert_eq!(state.engine_compatible, Evidence::Confirmed, "{id}");
            assert_eq!(state.tool_implemented, Evidence::Confirmed, "{id}");
            assert_eq!(state.help_available, Evidence::Confirmed, "{id}");
        }
        let before = text.clone();
        assert!(matches!(
            plan_import(
                &text,
                SourceTarget::new(0..0, 8),
                ImportKind::TikzLibrary,
                "calc"
            ),
            ImportDecision::Refused { .. }
        ));
        assert_eq!(text, before, "refused proposals never change user source");
    }
}

#[test]
fn unknown_macro_or_conditional_before_direct_import_is_not_positive_evidence() {
    for prefix in [
        r"\iftrue",
        r"\newcommand{\UserPath}{\usetikzlibrary{arrows.meta}}",
        r"\setmainfont{\CustomFontMacro}",
    ] {
        let source = format!(
            "\\documentclass{{article}}\n{prefix}\n\\usepackage{{tikz}}\n\\usetikzlibrary{{arrows.meta}}\n\\begin{{document}}\n"
        );
        let state = inspect(&source);
        assert!(state.uncertain_reason.is_some());
        assert_eq!(state.status(ImportKind::Package, "tikz"), Evidence::Unknown);
        assert_eq!(
            state.status(ImportKind::TikzLibrary, "arrows.meta"),
            Evidence::Unknown
        );
        assert!(state.begin_document_target(4).is_none());
    }
}

#[test]
fn direct_package_before_conditional_remains_known_but_conditional_library_unknown() {
    let source = r"\documentclass{article}
\usepackage{tikz}
\iftrue
\usetikzlibrary{calc}
\fi
\begin{document}
";
    let state = inspect(source);
    assert_eq!(
        state.status(ImportKind::Package, "tikz"),
        Evidence::Confirmed
    );
    assert_eq!(
        state.status(ImportKind::TikzLibrary, "calc"),
        Evidence::Unknown
    );
    assert_eq!(
        state.status(ImportKind::TikzLibrary, "fit"),
        Evidence::Unknown
    );
    assert!(matches!(
        plan_import(
            source,
            SourceTarget::new(0..0, 3),
            ImportKind::TikzLibrary,
            "calc"
        ),
        ImportDecision::Refused { .. }
    ));
}
