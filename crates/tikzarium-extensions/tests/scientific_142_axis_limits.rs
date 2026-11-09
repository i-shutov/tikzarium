//! SC3-01/02: real Sarov PGFPlots axes, exact byte-level edits and undo.
//! No actual desktop clicks, PDF claims or implicit TeX default assumptions.
use sha2::{Digest, Sha256};
use tikzarium_extensions::scientific_scan::{
    EditRefusal, LiteralEditRequest, ScientificKind, SourceView, literal_key_value,
    plan_literal_key_edit, scan_scientific_source, scientific_property_help,
};

const SV001: &str =
    include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-001/figure.tex");
const SV003: &str =
    include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-003/figure.tex");

fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn patch_axis_literal_exact(original: &str, key: &str, expected: &str, replacement: &str) {
    let view = SourceView {
        text: original,
        revision: 21,
    };
    let items = scan_scientific_source(view).unwrap();
    let axis = items
        .iter()
        .find(|x| x.kind == ScientificKind::Axis)
        .unwrap();
    assert_eq!(literal_key_value(view, axis, key).unwrap(), expected);
    let patch = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: axis,
        key,
        expected_old: expected,
        replacement,
    })
    .unwrap();
    assert_eq!(original.get(patch.range.clone()), Some(expected));
    let original_sha = hash(original.as_bytes());
    let mut edited = original.to_owned();
    let mut revision = 21;
    let inverse = patch.apply(&mut edited, &mut revision).unwrap();
    assert_eq!(revision, 22);
    assert!(edited.contains(&format!("{key}={replacement}")));
    assert!(edited.contains(r"\pgfplotsset{compat=1.17}"));
    assert!(edited.contains(r"\pgfmathdeclarefunction{gauss}"));
    inverse.apply(&mut edited, &mut revision).unwrap();
    assert_eq!(revision, 23);
    assert_eq!(edited.as_bytes(), original.as_bytes());
    assert_eq!(hash(edited.as_bytes()), original_sha);
}

#[test]
fn sv001_ymax_and_ymin_numeric_axis_limits_roundtrip() {
    patch_axis_literal_exact(SV001, "ymax", "1.4", "1.2");
    patch_axis_literal_exact(SV001, "ymin", "0", "-0.25");
}

#[test]
fn sv003_xmin_xmax_decimal_axis_limits_roundtrip() {
    patch_axis_literal_exact(SV003, "xmin", "0", "-1");
    patch_axis_literal_exact(SV003, "xmax", "1080", "1000");
}

#[test]
fn macros_duplicate_limits_and_nonfinite_values_are_rejected() {
    let source = "\\begin{tikzpicture}\n\\begin{axis}[ymax=\\myBound,ymin=-1,ymax=4]\n\\addplot[ymax=5] {x};\n\\end{axis}\n\\end{tikzpicture}";
    let view = SourceView {
        text: source,
        revision: 12,
    };
    let items = scan_scientific_source(view).unwrap();
    let axis = items
        .iter()
        .find(|x| x.kind == ScientificKind::Axis)
        .unwrap();
    let series = items
        .iter()
        .find(|x| x.kind == ScientificKind::AddPlot)
        .unwrap();
    let duplicate = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: axis,
        key: "ymax",
        expected_old: r"\myBound",
        replacement: "3",
    });
    assert_eq!(duplicate.unwrap_err(), EditRefusal::AmbiguousKey);
    let foreign_series = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: series,
        key: "ymax",
        expected_old: "5",
        replacement: "3",
    });
    assert_eq!(foreign_series.unwrap_err(), EditRefusal::UnsupportedKey);
    let invalid = [
        "NaN",
        "inf",
        r"\value",
        "1e9",
        "1;\\write18",
        "1,3",
        "   ",
        "1.2.3",
    ];
    for forbidden in invalid {
        let result = plan_literal_key_edit(LiteralEditRequest {
            view,
            instance: axis,
            key: "ymin",
            expected_old: "-1",
            replacement: forbidden,
        });
        assert_eq!(
            result.unwrap_err(),
            EditRefusal::InvalidLiteral,
            "{forbidden:?}"
        );
    }
    assert_eq!(literal_key_value(view, axis, "ymin").unwrap(), "-1");
}

#[test]
fn axis_help_does_not_invent_default_values() {
    for key in ["xmin", "xmax", "ymin", "ymax"] {
        let help = scientific_property_help(key).unwrap();
        assert_eq!(help.key, key);
        assert_eq!(help.package, "pgfplots");
        assert_eq!(help.verified_tex_default, "UNKNOWN");
        assert!(help.manual_section.contains("UNKNOWN"));
    }
}

#[test]
fn sv001_two_axis_bounds_source_patch_stack_reverts_exact_sha() {
    let original = hash(SV001.as_bytes());
    let mut source = SV001.to_owned();
    let mut revision = 31;
    let mut undo = Vec::new();
    for (key, previous, replacement) in [("ymax", "1.4", "1.2"), ("ymin", "0", "-0.5")] {
        // A real user re-selects the current command after a source change.
        let view = SourceView {
            text: &source,
            revision,
        };
        let found = scan_scientific_source(view).unwrap();
        let axis = found
            .iter()
            .find(|instance| instance.kind == ScientificKind::Axis)
            .unwrap();
        let patch = plan_literal_key_edit(LiteralEditRequest {
            view,
            instance: axis,
            key,
            expected_old: previous,
            replacement,
        })
        .unwrap();
        undo.push(patch.apply(&mut source, &mut revision).unwrap());
    }
    assert!(source.contains("ymax=1.2"));
    assert!(source.contains("ymin=-0.5"));
    for mut inverse in undo.into_iter().rev() {
        // Existing authoring Undo rebinds a verified inverse to the next
        // monotone revision, then lets SourcePatch verify the old bytes.
        inverse.source_revision = revision;
        inverse.apply(&mut source, &mut revision).unwrap();
    }
    assert_eq!(revision, 35);
    assert_eq!(hash(source.as_bytes()), original);
    assert_eq!(source.as_bytes(), SV001.as_bytes());
}
