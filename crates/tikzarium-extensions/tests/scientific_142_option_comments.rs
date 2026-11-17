//! Comment-adjacent PGFPlots literals must retain source ownership and bytes.
use tikzarium_extensions::scientific_scan::{
    EditRefusal, LiteralEditRequest, ScientificKind, SourceView, literal_key_value,
    plan_literal_key_edit, scan_scientific_source,
};

const SOURCE: &str = concat!(
    "% Русский source; unknown macros and external resources stay authoritative.\r\n",
    "\\pgfplotsset{compat=1.17}\r\n",
    "\\begin{tikzpicture}\r\n",
    "\\begin{axis}[% samples=999, fake=value\r\n",
    "  xmin % ignored=123\r\n = % ignored=456\r\n 0 % trailing=789\r\n",
    "  ,xlabel={Время},custom key={\\unknownMacro}]\r\n",
    "\\addplot+[% domain=99:100\r\n domain= % note=ignored\r\n -3:3 % end\r\n",
    "  ,samples=150,mark=*] {sin(deg(x))};\r\n",
    "\\addplot+[error bars/.cd,y dir=both,y explicit] table[x=x,y=y,y error=e] {observations.dat};\r\n",
    "\\addplot table[col sep=comma,x=x,y=y] {measurements.csv};\r\n",
    "\\end{axis}\r\n\\end{tikzpicture}\r\n",
);

#[test]
fn axis_and_addplot_boundary_comments_allow_only_exact_literal_patch_and_inverse() {
    for (kind, key, old, replacement) in [
        (ScientificKind::Axis, "xmin", "0", "-1"),
        (ScientificKind::AddPlot, "domain", "-3:3", "-2:2"),
    ] {
        let view = SourceView {
            text: SOURCE,
            revision: 41,
        };
        let instances = scan_scientific_source(view).unwrap();
        let instance = instances.iter().find(|item| item.kind == kind).unwrap();
        assert_eq!(literal_key_value(view, instance, key).unwrap(), old);
        let patch = plan_literal_key_edit(LiteralEditRequest {
            view,
            instance,
            key,
            expected_old: old,
            replacement,
        })
        .unwrap();
        assert_eq!(SOURCE.get(patch.range.clone()), Some(old));
        assert_eq!(patch.expected_old, old);
        assert_eq!(patch.replacement, replacement);
        let expected = format!(
            "{}{}{}",
            &SOURCE[..patch.range.start],
            replacement,
            &SOURCE[patch.range.end..]
        );
        let mut edited = SOURCE.to_owned();
        let mut revision = 41;
        let inverse = patch.apply(&mut edited, &mut revision).unwrap();
        assert_eq!(edited.as_bytes(), expected.as_bytes());
        inverse.apply(&mut edited, &mut revision).unwrap();
        assert_eq!(edited.as_bytes(), SOURCE.as_bytes());
        assert_eq!(revision, 43);
    }
}

#[test]
fn comments_cannot_hide_duplicate_or_split_property_keys() {
    for (options, expected) in [
        (
            "samples=150,% duplicate with fake=999\r\n samples=180",
            EditRefusal::AmbiguousKey,
        ),
        (
            "samples=150,samples % duplicate before equals=ignored\r\n =180",
            EditRefusal::AmbiguousKey,
        ),
        (
            "samples=150,sam% source token is split\r\nples=180",
            EditRefusal::Opaque,
        ),
        (
            "every axis plot/.style={samples=150},% duplicate style\r\n every axis plot post/.style={samples=180}",
            EditRefusal::AmbiguousKey,
        ),
    ] {
        let source = format!(
            "\\begin{{tikzpicture}}\\begin{{axis}}[{options}]\\end{{axis}}\\end{{tikzpicture}}"
        );
        let view = SourceView {
            text: &source,
            revision: 7,
        };
        let instances = scan_scientific_source(view).unwrap();
        let axis = &instances[0];
        assert_eq!(literal_key_value(view, axis, "samples"), Err(expected));
        assert!(
            plan_literal_key_edit(LiteralEditRequest {
                view,
                instance: axis,
                key: "samples",
                expected_old: "150",
                replacement: "151",
            })
            .is_err()
        );
    }
}

#[test]
fn comment_inside_value_or_changed_comment_never_grants_literal_ownership() {
    let source = "\\begin{tikzpicture}\\begin{axis}[samples=1% do not join digits\r\n50]\\end{axis}\\end{tikzpicture}";
    let view = SourceView {
        text: source,
        revision: 3,
    };
    let instances = scan_scientific_source(view).unwrap();
    assert_eq!(
        literal_key_value(view, &instances[0], "samples"),
        Err(EditRefusal::Opaque)
    );

    let view = SourceView {
        text: SOURCE,
        revision: 41,
    };
    let instances = scan_scientific_source(view).unwrap();
    let changed = SOURCE.replace("trailing=789", "trailing=788");
    assert_eq!(
        literal_key_value(
            SourceView {
                text: &changed,
                revision: 41
            },
            &instances[0],
            "xmin"
        ),
        Err(EditRefusal::SourceConflict)
    );
}

#[test]
fn path_switches_refuse_literal_ownership_before_or_after_the_switch() {
    for options in [
        "error bars/.cd,samples=150",
        "samples=150,error bars/.cd",
        "samples=150,error bars/.cd={},/pgfplots/.cd",
        "/custom/.cd,samples=150",
        "samples=150,% comment hides a naked control\r\n error bars/.cd",
        "samples=150,.cd",
        "every axis plot/.style={samples=150,error bars/.cd}",
    ] {
        for kind in [ScientificKind::Axis, ScientificKind::AddPlot] {
            let source = match kind {
                ScientificKind::Axis => format!(
                    "\\begin{{tikzpicture}}\\begin{{axis}}[{options}]\\end{{axis}}\\end{{tikzpicture}}"
                ),
                _ => format!(
                    "\\begin{{tikzpicture}}\\begin{{axis}}\\addplot+[{options}] table[x=x,y=y] {{source.dat}};\\end{{axis}}\\end{{tikzpicture}}"
                ),
            };
            let view = SourceView {
                text: &source,
                revision: 19,
            };
            let instances = scan_scientific_source(view).unwrap();
            let instance = instances.iter().find(|item| item.kind == kind).unwrap();
            assert_eq!(
                literal_key_value(view, instance, "samples"),
                Err(EditRefusal::Opaque),
                "{kind:?}: {options}"
            );
            assert_eq!(
                plan_literal_key_edit(LiteralEditRequest {
                    view,
                    instance,
                    key: "samples",
                    expected_old: "150",
                    replacement: "151",
                })
                .unwrap_err(),
                EditRefusal::Opaque
            );
        }
    }
}

#[test]
fn qualified_errorbar_keys_preserve_series_edit_and_axis_ownership_is_separate() {
    let source = "\\begin{tikzpicture}\r\n\\begin{axis}[samples=150,legend style={/custom/.cd,mark=*}]\r\n\\addplot+[samples=150,error bars/y dir=both,error bars/y explicit] table[x=x,y=y,y error=e] {source.dat};\r\n\\addplot+[error bars/.cd,samples=150] table[x=x,y=y] {source.csv};\r\n\\end{axis}\r\n\\end{tikzpicture}\r\n";
    let view = SourceView {
        text: source,
        revision: 6,
    };
    let instances = scan_scientific_source(view).unwrap();
    for instance in &instances[..2] {
        let patch = plan_literal_key_edit(LiteralEditRequest {
            view,
            instance,
            key: "samples",
            expected_old: "150",
            replacement: "151",
        })
        .unwrap();
        assert_eq!(patch.expected_old, "150");
        let mut edited = source.to_owned();
        let mut revision = 6;
        let inverse = patch.apply(&mut edited, &mut revision).unwrap();
        assert_eq!(
            edited.as_bytes(),
            format!(
                "{}151{}",
                &source[..patch.range.start],
                &source[patch.range.end..]
            )
            .as_bytes()
        );
        inverse.apply(&mut edited, &mut revision).unwrap();
        assert_eq!(edited.as_bytes(), source.as_bytes());
    }
    assert_eq!(
        literal_key_value(view, &instances[2], "samples"),
        Err(EditRefusal::Opaque)
    );
}
