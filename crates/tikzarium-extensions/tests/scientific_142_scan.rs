//! SC2 source-only QA. Genuine owner Scientific-142 examples, no fake GUI PASS.
use sha2::{Digest, Sha256};
use tikzarium_extensions::scientific_scan::{
    EditRefusal, LiteralEditRequest, RecognitionConfidence, ScanRefusal, ScientificKind,
    SourceView, plan_literal_key_edit, scan_scientific_source, scientific_property_help,
};

const SV001: &str =
    include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-001/figure.tex");
const SV003: &str =
    include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-003/figure.tex");
const SV009: &str =
    include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-009/figure.tex");

fn source_hash(source: &str) -> String {
    format!("{:x}", Sha256::digest(source.as_bytes()))
}

#[test]
fn sv001_nested_pgfplots_samples_150_to_180_and_exact_inverse() {
    let view = SourceView {
        text: SV001,
        revision: 7,
    };
    let recognized = scan_scientific_source(view).unwrap();
    let axis = recognized
        .iter()
        .find(|instance| instance.kind == ScientificKind::Axis)
        .expect("original Sarov axis must be lexically recognized");
    assert_eq!(axis.confidence, RecognitionConfidence::Lexical);
    let addplot = recognized
        .iter()
        .find(|instance| instance.kind == ScientificKind::AddPlot)
        .expect("original Sarov addplot must be lexically recognized");
    assert!(addplot.parent_axis.is_some());
    assert!(
        SV001
            .get(axis.range.clone())
            .unwrap()
            .contains(r"\begin{axis}")
    );
    let patch = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: axis,
        key: "samples",
        expected_old: "150",
        replacement: "180",
    })
    .unwrap();
    assert_eq!(SV001.get(patch.range.clone()), Some("150"));
    assert_eq!(patch.expected_old, "150");
    assert_eq!(patch.replacement, "180");
    let before = source_hash(SV001);
    let mut source = SV001.to_owned();
    let mut revision = 7;
    let inverse = patch.apply(&mut source, &mut revision).unwrap();
    assert_eq!(revision, 8);
    assert!(source.contains("mark=none,samples=180,domain=-3:3,smooth"));
    assert!(source.contains(r"\pgfplotsset{compat=1.17}"));
    assert!(source.contains(r"\pgfmathdeclarefunction{gauss}"));
    inverse.apply(&mut source, &mut revision).unwrap();
    assert_eq!(revision, 9);
    assert_eq!(source_hash(&source), before);
    assert_eq!(source, SV001);
}

#[test]
fn sv003_opaque_foreach_does_not_expose_repeat_body_as_one_addplot() {
    let instances = scan_scientific_source(SourceView {
        text: SV003,
        revision: 1,
    })
    .unwrap();
    assert_eq!(
        instances
            .iter()
            .filter(|item| item.kind == ScientificKind::ForeachOpaque)
            .count(),
        1
    );
    assert_eq!(
        instances
            .iter()
            .filter(|item| item.kind == ScientificKind::AddPlot)
            .count(),
        4
    );
    for item in instances
        .iter()
        .filter(|item| item.kind == ScientificKind::AddPlot)
    {
        assert!(!SV003.get(item.range.clone()).unwrap().contains(r"\foreach"));
    }
}

#[test]
fn sv009_literal_domain_changes_only_the_series_option_value() {
    let view = SourceView {
        text: SV009,
        revision: 22,
    };
    let instances = scan_scientific_source(view).unwrap();
    let series = instances
        .iter()
        .find(|item| {
            item.kind == ScientificKind::AddPlot
                && SV009
                    .get(item.range.clone())
                    .is_some_and(|text| text.contains("domain=0:1.5"))
        })
        .unwrap();
    let patch = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: series,
        key: "domain",
        expected_old: "0:1.5",
        replacement: "0:1.4",
    })
    .unwrap();
    assert_eq!(SV009.get(patch.range.clone()), Some("0:1.5"));
    let mut source = SV009.to_owned();
    let mut rev = 22;
    let undo = patch.apply(&mut source, &mut rev).unwrap();
    assert!(source.contains(r"\addplot[red,name path=S,thick,domain=0:1.4]"));
    assert!(source.contains(r"coordinates {(\xo+.1,{ff(\xo)}) (0,{ff(\xo)})}"));
    undo.apply(&mut source, &mut rev).unwrap();
    assert_eq!(source.as_bytes(), SV009.as_bytes());
}

#[test]
fn source_conflict_and_opaque_values_reject_without_modification() {
    let text = "\\begin{tikzpicture}\r\n\\begin{axis}[samples=150]\r\n".to_owned()
        + "\\addplot[domain=\\myRange,samples=120] {x};\r\n"
        + "\\end{axis}\r\n\\end{tikzpicture}\r\n";
    let view = SourceView {
        text: &text,
        revision: 1,
    };
    let items = scan_scientific_source(view).unwrap();
    let axis = items
        .iter()
        .find(|item| item.kind == ScientificKind::Axis)
        .unwrap();
    let result = plan_literal_key_edit(LiteralEditRequest {
        view: SourceView {
            text: &text,
            revision: 2,
        },
        instance: axis,
        key: "samples",
        expected_old: "150",
        replacement: "180",
    });
    assert!(matches!(result, Err(EditRefusal::SourceConflict)));
    let drift = text.replace("domain=\\myRange", "domain=\\myOtherRange");
    let result = plan_literal_key_edit(LiteralEditRequest {
        view: SourceView {
            text: &drift,
            revision: 1,
        },
        instance: axis,
        key: "samples",
        expected_old: "150",
        replacement: "180",
    });
    assert!(matches!(result, Err(EditRefusal::SourceConflict)));
    let series = items
        .iter()
        .find(|item| item.kind == ScientificKind::AddPlot)
        .unwrap();
    let result = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: series,
        key: "domain",
        expected_old: r"\myRange",
        replacement: "0:1.5",
    });
    assert!(matches!(result, Err(EditRefusal::InvalidLiteral)));
    assert!(text.contains("domain=\\myRange"));
}

#[test]
fn comments_macro_bodies_unicode_crlf_and_node_groups_are_not_fake_draws() {
    let source = String::from(
        "% \\draw (0,0) -- (2,2);\r\n\
         \\begin{tikzpicture}\r\n\
         \\node[draw] at (0,0) {Русский \\draw (1,1) -- (3,3);};\r\n\
         \\def\\foo{\\draw (1,1) -- (4,4);};\r\n\
         \\foreach \\i in {1,2} {\\draw (0,0) -- (1,1);}\r\n\
         \\draw[red] (0,0) -- (2,2); % \\draw ignored\r\n\
         \\end{tikzpicture}\r\n",
    );
    let items = scan_scientific_source(SourceView {
        text: &source,
        revision: 9,
    })
    .unwrap();
    assert_eq!(
        items
            .iter()
            .filter(|instance| instance.kind == ScientificKind::Draw)
            .count(),
        1
    );
    assert_eq!(
        items
            .iter()
            .filter(|instance| instance.kind == ScientificKind::Node)
            .count(),
        1
    );
    assert_eq!(
        items
            .iter()
            .filter(|instance| instance.kind == ScientificKind::ForeachOpaque)
            .count(),
        1
    );
    for item in items {
        assert!(source.is_char_boundary(item.range.start));
        assert!(source.is_char_boundary(item.range.end));
    }
}

#[test]
fn duplicate_options_and_unsafe_ranges_fail_closed() {
    let text = "\\begin{tikzpicture}\n\\begin{axis}[samples=100,samples=150]\n\\end{axis}\n\\end{tikzpicture}";
    let view = SourceView { text, revision: 0 };
    let items = scan_scientific_source(view).unwrap();
    let axis = &items[0];
    let error = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: axis,
        key: "samples",
        expected_old: "100",
        replacement: "180",
    })
    .unwrap_err();
    assert_eq!(error, EditRefusal::AmbiguousKey);
    let error = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: axis,
        key: "samples",
        expected_old: "100",
        replacement: "99999",
    })
    .unwrap_err();
    assert_eq!(error, EditRefusal::AmbiguousKey);
    let error = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: axis,
        key: "color",
        expected_old: "blue",
        replacement: "red",
    })
    .unwrap_err();
    assert_eq!(error, EditRefusal::UnsupportedKey);
}

#[test]
fn malformed_nested_options_catcode_and_large_source_are_explicitly_refused() {
    let malformed = r"\begin{tikzpicture}\begin{axis}[samples={15]\end{axis}\end{tikzpicture}";
    assert_eq!(
        scan_scientific_source(SourceView {
            text: malformed,
            revision: 1,
        })
        .unwrap_err(),
        ScanRefusal::UnbalancedSource
    );
    let malicious = r"\begin{tikzpicture}\catcode\foo=1 \draw (0,0)--(1,1);\end{tikzpicture}";
    assert_eq!(
        scan_scientific_source(SourceView {
            text: malicious,
            revision: 1,
        })
        .unwrap_err(),
        ScanRefusal::UnsupportedTeXControl
    );
    let huge = "x".repeat(2 * 1024 * 1024 + 1);
    assert_eq!(
        scan_scientific_source(SourceView {
            text: &huge,
            revision: 1,
        })
        .unwrap_err(),
        ScanRefusal::SourceTooLarge
    );
}

#[test]
fn macro_definitions_styles_and_overlapping_edits_cannot_claim_a_draw() {
    let source = r"\begin{tikzpicture}
\newcommand{\helper}{\draw (0,0)--(99,99);}
\newcommand\other[1]{\draw (0,0)--(88,88);}
\tikzset{mydraw/.style={execute at begin node={\draw (0,0)--(77,77);}}}
\draw[blue] (0,0)--(1,1);
\end{tikzpicture}";
    let recognized = scan_scientific_source(SourceView {
        text: source,
        revision: 4,
    })
    .unwrap();
    assert_eq!(
        recognized
            .iter()
            .filter(|item| item.kind == ScientificKind::Draw)
            .count(),
        1
    );

    let view = SourceView {
        text: SV001,
        revision: 7,
    };
    let items = scan_scientific_source(view).unwrap();
    let axis = items
        .iter()
        .find(|item| item.kind == ScientificKind::Axis)
        .unwrap();
    let patch = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: axis,
        key: "samples",
        expected_old: "150",
        replacement: "180",
    })
    .unwrap();
    let mut changed = SV001.replace("samples=150", "samples=151");
    let original = changed.clone();
    let mut revision = 7;
    assert!(patch.apply(&mut changed, &mut revision).is_err());
    assert_eq!(changed, original);
    assert_eq!(revision, 7);
}

#[test]
fn preamble_macro_and_verbatim_pictures_are_never_active_editable_figures() {
    let source = r"\newcommand{\fake}{\begin{tikzpicture}\draw (0,0)--(20,20);\end{tikzpicture}}
\pgfmathdeclarefunction{dummy}{3}{\begin{tikzpicture}\draw (0,0)--(99,99);\end{tikzpicture}}
\begin{verbatim}
\begin{tikzpicture}\draw (0,0)--(88,88);\end{tikzpicture}
\end{verbatim}
\begin{tikzpicture}
\draw (0,0)--(1,1);
\end{tikzpicture}";
    let instances = scan_scientific_source(SourceView {
        text: source,
        revision: 0,
    })
    .unwrap();
    assert_eq!(
        instances
            .iter()
            .filter(|x| x.kind == ScientificKind::Draw)
            .count(),
        1
    );
    assert_eq!(instances.len(), 1);
    assert!(
        source
            .get(instances[0].range.clone())
            .unwrap()
            .contains("(0,0)--(1,1)")
    );
}

#[test]
fn preamble_catcode_changes_refuse_even_if_later_tikz_looks_literal() {
    let source = r"\catcode\foo=12
\begin{tikzpicture}
\draw (0,0)--(1,1);
\end{tikzpicture}";
    let got = scan_scientific_source(SourceView {
        text: source,
        revision: 0,
    });
    assert_eq!(got.unwrap_err(), ScanRefusal::UnsupportedTeXControl);
}

#[test]
fn scientific_parameter_help_is_versioned_source_limited_and_never_invents_defaults() {
    let samples = scientific_property_help("samples").unwrap();
    assert_eq!(samples.package, "pgfplots");
    assert_eq!(samples.verified_tex_default, "UNKNOWN");
    assert!(samples.editor_limit.contains("4096"));
    assert!(samples.manual_section.contains("UNKNOWN"));
    let domain = scientific_property_help("domain").unwrap();
    assert!(domain.example.contains(":"));
    assert_eq!(domain.verified_tex_default, "UNKNOWN");
    assert!(scientific_property_help("unsupported PGFPlots key").is_none());
}
