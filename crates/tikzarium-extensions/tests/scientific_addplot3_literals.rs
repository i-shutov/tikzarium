//! Source-only PGFPlots 3D literal contracts, never native GUI acceptance.
use sha2::{Digest, Sha256};
use tikzarium_extensions::scientific_scan::{
    EditRefusal, LiteralEditRequest, RecognitionConfidence, ScanRefusal, ScientificKind,
    SourceView, literal_key_value, plan_literal_key_edit, scan_scientific_source,
};

// Unchanged AT4 originals 55/56; include bytes to check CRLF and provenance.
const SURFACE: &[u8] =
    include_bytes!("../../../roadmap/AI_TIKZ_SKILLS_2026-11-10/examples/surface-gaussian.tex");
const HELIX: &[u8] =
    include_bytes!("../../../roadmap/AI_TIKZ_SKILLS_2026-11-10/examples/parametric-helix.tex");

fn check_patch(source: &str, plot_index: usize, key: &str, old: &str, new: &str) {
    let view = SourceView {
        text: source,
        revision: 17,
    };
    let instances = scan_scientific_source(view).unwrap();
    let plot = instances
        .iter()
        .filter(|item| item.kind == ScientificKind::AddPlot)
        .nth(plot_index)
        .expect("literal plot descriptor");
    assert_eq!(plot.confidence, RecognitionConfidence::Lexical);
    let parent = &instances[plot.parent_axis.expect("plot remains axis-owned")];
    assert_eq!(parent.kind, ScientificKind::Axis);
    assert_eq!(literal_key_value(view, plot, key).unwrap(), old);
    let patch = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: plot,
        key,
        expected_old: old,
        replacement: new,
    })
    .unwrap();
    assert_eq!(
        source.get(patch.range.clone()),
        Some(patch.expected_old.as_str())
    );
    assert!(
        plot.option_range
            .as_ref()
            .unwrap()
            .contains(&patch.range.start)
    );
    assert!(patch.range.end <= plot.option_range.as_ref().unwrap().end);
    let expected = format!(
        "{}{}{}",
        &source[..patch.range.start],
        patch.replacement,
        &source[patch.range.end..]
    );
    let mut edited = source.to_owned();
    let mut revision = 17;
    let inverse = patch.apply(&mut edited, &mut revision).unwrap();
    assert_eq!(edited.as_bytes(), expected.as_bytes());
    assert_eq!(revision, 18);
    inverse.apply(&mut edited, &mut revision).unwrap();
    assert_eq!(edited.as_bytes(), source.as_bytes());
    assert_eq!(revision, 19);
}

#[test]
fn at4_55_original_surface_samples_and_domain_have_exact_patch_and_inverse() {
    assert_eq!(
        format!("{:x}", Sha256::digest(SURFACE)),
        "19a9b97ea74710a4e9b218bbe7901e6b41474e2e8100bf77578ed6d42a86465d"
    );
    let source = std::str::from_utf8(SURFACE).unwrap();
    assert_eq!(source.matches('\n').count(), source.matches("\r\n").count());
    check_patch(source, 0, "samples", "21", "25");
    check_patch(source, 0, "domain", "-2:2", "-3:3");
    let view = SourceView {
        text: source,
        revision: 17,
    };
    let items = scan_scientific_source(view).unwrap();
    assert_eq!(items.len(), 2);
    assert_eq!(
        &source[items[1].range.clone()],
        r"\addplot3[surf,domain=-2:2,domain y=-2:2,samples=21]{exp(-x^2-y^2)};"
    );
    // No invented marker/default and no additional 3D property support.
    assert_eq!(
        literal_key_value(view, &items[1], "mark"),
        Err(EditRefusal::Opaque)
    );
    assert_eq!(
        literal_key_value(view, &items[1], "domain y"),
        Err(EditRefusal::UnsupportedKey)
    );
}

#[test]
fn at4_56_original_helix_preserves_parametric_body_and_samples_y() {
    assert_eq!(
        format!("{:x}", Sha256::digest(HELIX)),
        "f8b301977a879cc567720a1b68d1847eb22d6860da6c6f9fecf07ab297229b31"
    );
    let source = std::str::from_utf8(HELIX).unwrap();
    assert_eq!(source.matches('\n').count(), source.matches("\r\n").count());
    check_patch(source, 0, "samples", "181", "201");
    check_patch(source, 0, "domain", "0:720", "0:360");
    let view = SourceView {
        text: source,
        revision: 17,
    };
    let items = scan_scientific_source(view).unwrap();
    assert_eq!(items.len(), 2);
    assert_eq!(
        &source[items[1].range.clone()],
        r"\addplot3[blue,thick,domain=0:720,samples=181,samples y=0]({cos(x)},{sin(x)},{x/360});"
    );
    assert_eq!(
        literal_key_value(view, &items[1], "samples y"),
        Err(EditRefusal::UnsupportedKey)
    );
}

const PLUS_SOURCE: &str = concat!(
    "% Привет; unknown command bodies are authoritative\r\n",
    "\\begin{tikzpicture}\r\n\\begin{axis}[samples=41]\r\n",
    "\\addplot3+[% samples=999\r\n samples % trivia=99\r\n =21,domain=-2:2,mark=*,",
    "custom={\\Unknown},domain y=-3:3,samples y=0] ({\\OpaqueX},{y},{z});\r\n",
    "\\end{axis}\r\n\\end{tikzpicture}\r\n",
);

#[test]
fn addplot3_and_plus_reuse_only_samples_domain_mark_and_preserve_all_other_bytes() {
    let bare = PLUS_SOURCE.replace(r"\addplot3+", r"\addplot3");
    for source in [PLUS_SOURCE, bare.as_str()] {
        for (key, old, new) in [
            ("samples", "21", "23"),
            ("domain", "-2:2", "-1:1"),
            ("mark", "*", "x"),
        ] {
            check_patch(source, 0, key, old, new);
        }
    }
}

#[test]
fn mixed_2d_and_3d_series_have_distinct_exact_descriptors_in_their_own_axes() {
    let source = concat!(
        "\\begin{tikzpicture}\\begin{axis}",
        "\\addplot[samples=21]{x};\\addplot3[samples=21]{x*y};\\end{axis}",
        "\\begin{axis}\\addplot3+[samples=21] coordinates {(0,0,0)};",
        "\\end{axis}\\end{tikzpicture}",
    );
    let items = scan_scientific_source(SourceView {
        text: source,
        revision: 17,
    })
    .unwrap();
    assert_eq!(
        items
            .iter()
            .map(|item| item.parent_axis)
            .collect::<Vec<_>>(),
        vec![None, Some(0), Some(0), None, Some(3)]
    );
    for plot_index in 0..3 {
        check_patch(source, plot_index, "samples", "21", "25");
    }
}

#[test]
fn comments_macros_foreach_and_outside_axis_never_expose_fake_3d_options() {
    let source = concat!(
        "\\newcommand{\\hidden}{\\begin{tikzpicture}\\begin{axis}",
        "\\addplot3[samples=99]{x};\\end{axis}\\end{tikzpicture}}\r\n",
        "\\begin{tikzpicture}\r\n\\addplot3[samples=98]{x};\r\n",
        "\\begin{axis}\r\n% \\addplot3[samples=97]{x};\r\n",
        "\\def\\other{\\addplot3+[samples=96]{x};}\r\n",
        "\\foreach \\i in {1,2} {\\addplot3[samples=95]{x};}\r\n",
        "\\addplot3[samples=21]{x};\\end{axis}\\end{tikzpicture}",
    );
    let items = scan_scientific_source(SourceView {
        text: source,
        revision: 17,
    })
    .unwrap();
    assert_eq!(
        items
            .iter()
            .filter(|item| item.kind == ScientificKind::AddPlot)
            .count(),
        1
    );
    check_patch(source, 0, "samples", "21", "23");
}

#[test]
fn nonexact_3d_suffixes_and_macro_literal_values_do_not_gain_editability() {
    for suffix in ["30", "3x", "3@foo", "3.0", "3_", "3++"] {
        let source = format!(
            "\\begin{{tikzpicture}}\\begin{{axis}}\\addplot{suffix}[samples=21]{{x}};\\end{{axis}}\\end{{tikzpicture}}"
        );
        let view = SourceView {
            text: &source,
            revision: 17,
        };
        assert!(
            scan_scientific_source(view)
                .unwrap()
                .iter()
                .all(|item| item.kind != ScientificKind::AddPlot),
            "unsupported suffix {suffix} must not expose a plot descriptor"
        );
    }
    for key in ["samples", "domain", "mark"] {
        let source = format!(
            "\\begin{{tikzpicture}}\\begin{{axis}}\\addplot3+[{key}=\\Unknown]{{x}};\\end{{axis}}\\end{{tikzpicture}}"
        );
        let view = SourceView {
            text: &source,
            revision: 17,
        };
        let items = scan_scientific_source(view).unwrap();
        assert_eq!(
            literal_key_value(view, &items[1], key),
            Err(EditRefusal::Opaque)
        );
        assert_eq!(
            plan_literal_key_edit(LiteralEditRequest {
                view,
                instance: &items[1],
                key,
                expected_old: r"\Unknown",
                replacement: "21"
            })
            .unwrap_err(),
            EditRefusal::InvalidLiteral
        );
    }
}

#[test]
fn rejected_3d_suffix_skips_its_entire_balanced_body_without_exposing_nested_commands() {
    for suffix in ["30", "3x", "3@foo", "3.0", "3_", "3++"] {
        let source = format!(
            concat!(
                "\\begin{{tikzpicture}}\\begin{{axis}}[samples=41]\r\n",
                "\\addplot{}[samples=99,custom={{\\draw (0,0)--(1,1);}}] ",
                "{{\\draw (0,0)--(2,2);\\begin{{axis}}[samples=97]",
                "\\addplot3[samples=96]{{x}};\\end{{axis}}}};\r\n",
                "\\addplot3[samples=21]{{x*y}};\\end{{axis}}\\end{{tikzpicture}}"
            ),
            suffix
        );
        let items = scan_scientific_source(SourceView {
            text: &source,
            revision: 17,
        })
        .unwrap();
        assert_eq!(
            items.iter().map(|item| item.kind).collect::<Vec<_>>(),
            [ScientificKind::Axis, ScientificKind::AddPlot],
            "suffix {suffix}"
        );
        assert_eq!(items[1].parent_axis, Some(0));
        assert_eq!(
            &source[items[1].range.clone()],
            r"\addplot3[samples=21]{x*y};"
        );
        check_patch(&source, 0, "samples", "21", "23");

        let unbalanced = format!(
            "\\begin{{tikzpicture}}\\begin{{axis}}\\addplot{suffix}[samples=99]{{\\draw (0,0)--(1,1);"
        );
        assert_eq!(
            scan_scientific_source(SourceView {
                text: &unbalanced,
                revision: 17
            }),
            Err(ScanRefusal::UnbalancedSource)
        );
    }
}

#[test]
fn namespace_duplicate_and_foreign_style_guards_still_apply_to_3d_series() {
    for (options, refusal) in [
        ("samples=21,error bars/.cd", EditRefusal::Opaque),
        ("/custom/.cd,samples=21", EditRefusal::Opaque),
        ("samples=21,.cd", EditRefusal::Opaque),
        ("samples=21,samples=25", EditRefusal::AmbiguousKey),
        (
            "samples=21,sam% do not join\r\nples=25",
            EditRefusal::Opaque,
        ),
        ("custom/.style={samples=21}", EditRefusal::Opaque),
    ] {
        let source = format!(
            "\\begin{{tikzpicture}}\\begin{{axis}}\\addplot3+[{options}]{{x}};\\end{{axis}}\\end{{tikzpicture}}"
        );
        let view = SourceView {
            text: &source,
            revision: 17,
        };
        let items = scan_scientific_source(view).unwrap();
        assert_eq!(
            literal_key_value(view, &items[1], "samples").unwrap_err(),
            refusal
        );
        assert_eq!(
            plan_literal_key_edit(LiteralEditRequest {
                view,
                instance: &items[1],
                key: "samples",
                expected_old: "21",
                replacement: "23"
            })
            .unwrap_err(),
            refusal
        );
    }
}

#[test]
fn stale_or_forged_3d_descriptors_and_stale_patches_refuse_without_mutation() {
    let view = SourceView {
        text: PLUS_SOURCE,
        revision: 17,
    };
    let items = scan_scientific_source(view).unwrap();
    let plot = &items[1];
    let drift = PLUS_SOURCE.replace("Привет", "Пока");
    for changed in [
        SourceView {
            text: PLUS_SOURCE,
            revision: 18,
        },
        SourceView {
            text: &drift,
            revision: 17,
        },
    ] {
        assert_eq!(
            literal_key_value(changed, plot, "samples"),
            Err(EditRefusal::SourceConflict)
        );
    }
    let mut forged = plot.clone();
    forged.option_range = items[0].option_range.clone();
    assert_eq!(
        literal_key_value(view, &forged, "samples"),
        Err(EditRefusal::SourceConflict)
    );
    let patch = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: plot,
        key: "samples",
        expected_old: "21",
        replacement: "23",
    })
    .unwrap();
    let mut unchanged = PLUS_SOURCE.to_owned();
    let mut stale_revision = 18;
    assert!(patch.apply(&mut unchanged, &mut stale_revision).is_err());
    assert_eq!(unchanged, PLUS_SOURCE);
    assert_eq!(stale_revision, 18);
    let mut changed_literal = PLUS_SOURCE.replacen("=21,", "=25,", 1);
    let before = changed_literal.clone();
    let mut revision = 17;
    assert!(patch.apply(&mut changed_literal, &mut revision).is_err());
    assert_eq!(changed_literal, before);
    assert_eq!(revision, 17);
}
