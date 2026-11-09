//! SC3 axis ticks / dimensions / labels / marks, source first, byte exact.
//! These are Rust transactions only: no physical GUI or L3 claim.
use sha2::{Digest, Sha256};
use tikzarium_extensions::scientific_scan::{
    EditRefusal, LiteralEditRequest, ScientificKind, SourceView, literal_key_value,
    plan_literal_key_edit, scan_scientific_source, scientific_property_help,
};

const SV001: &str =
    include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-001/figure.tex");
const SV003: &str =
    include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-003/figure.tex");

fn digest(source: &str) -> String {
    format!("{:x}", Sha256::digest(source.as_bytes()))
}

#[test]
fn sv001_axis_tick_spacing_roundtrips_exact_original_sha() {
    for (key, old, new) in [
        ("xtick distance", "1", "2"),
        ("ytick distance", "0.5", "1"),
    ] {
        let view = SourceView {
            text: SV001,
            revision: 8,
        };
        let items = scan_scientific_source(view).unwrap();
        let axis = items.iter().find(|x| x.kind == ScientificKind::Axis).unwrap();
        let patch = plan_literal_key_edit(LiteralEditRequest {
            view,
            instance: axis,
            key,
            expected_old: old,
            replacement: new,
        })
        .unwrap();
        assert_eq!(SV001.get(patch.range.clone()), Some(old));
        let original_sha = digest(SV001);
        let mut source = SV001.to_owned();
        let mut revision = 8;
        let inverse = patch.apply(&mut source, &mut revision).unwrap();
        assert!(source.contains(&format!("{key}={new}")));
        inverse.apply(&mut source, &mut revision).unwrap();
        assert_eq!(source.as_bytes(), SV001.as_bytes());
        assert_eq!(digest(&source), original_sha);
        assert_eq!(revision, 10);
    }
}

#[test]
fn sv001_dimensions_preserve_textwidth_unit_without_regenerating_tex() {
    for (key, old, new) in [
        ("width", r"1\textwidth", r"0.8\textwidth"),
        ("height", r"0.62\textwidth", r"0.75\textwidth"),
    ] {
        let view = SourceView {
            text: SV001,
            revision: 4,
        };
        let items = scan_scientific_source(view).unwrap();
        let axis = items.iter().find(|x| x.kind == ScientificKind::Axis).unwrap();
        let patch = plan_literal_key_edit(LiteralEditRequest {
            view,
            instance: axis,
            key,
            expected_old: old,
            replacement: new,
        })
        .unwrap();
        assert!(!patch.expected_old.contains(r"\textwidth"));
        assert!(!patch.replacement.contains(r"\textwidth"));
        let mut source = SV001.to_owned();
        let mut revision = 4;
        let inverse = patch.apply(&mut source, &mut revision).unwrap();
        assert!(source.contains(&format!("{key}={new}")));
        assert!(source.contains(r"\pgfplotsset{compat=1.17}"));
        inverse.apply(&mut source, &mut revision).unwrap();
        assert_eq!(source.as_bytes(), SV001.as_bytes());
    }
}

#[test]
fn sv001_nested_style_mark_is_editable_with_unmodified_formula() {
    let view = SourceView {
        text: SV001,
        revision: 0,
    };
    let items = scan_scientific_source(view).unwrap();
    let axis = items.iter().find(|x| x.kind == ScientificKind::Axis).unwrap();
    let patch = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: axis,
        key: "mark",
        expected_old: "none",
        replacement: "*",
    })
    .unwrap();
    let mut source = SV001.to_owned();
    let mut revision = 0;
    let undo = patch.apply(&mut source, &mut revision).unwrap();
    assert!(source.contains("mark=*,samples=150,domain=-3:3,smooth"));
    assert!(source.contains(r"\addplot[red,name path=S,thick] {.05 + 2.4*gauss(x,0,1)};"));
    undo.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source.as_bytes(), SV001.as_bytes());
}

#[test]
fn sarov_math_labels_remain_opaque_and_no_defaults_are_invented() {
    let view = SourceView {
        text: SV001,
        revision: 0,
    };
    let items = scan_scientific_source(view).unwrap();
    let axis = items.iter().find(|x| x.kind == ScientificKind::Axis).unwrap();
    for key in ["xlabel", "ylabel"] {
        assert!(matches!(literal_key_value(view, axis, key), Err(EditRefusal::Opaque)));
        assert_eq!(scientific_property_help(key).unwrap().verified_tex_default, "UNKNOWN");
    }
    let source = SV003;
    let view = SourceView {
        text: source,
        revision: 0,
    };
    let items = scan_scientific_source(view).unwrap();
    let axis = items.iter().find(|x| x.kind == ScientificKind::Axis).unwrap();
    assert!(matches!(literal_key_value(view, axis, "xtick"), Err(EditRefusal::Opaque)));
}

#[test]
fn explicit_numeric_tick_list_and_unicode_plain_label_patch_without_other_changes() {
    let source = r"\begin{tikzpicture}
\begin{axis}[xtick={0,1,2},xlabel={Время}]
\addplot[mark=*] coordinates {(0,0) (1,1)};
\end{axis}
\end{tikzpicture}";
    for (kind, key, old, new) in [
        (ScientificKind::Axis, "xtick", "{0,1,2}", "{0,2,4}"),
        (ScientificKind::Axis, "xlabel", "{Время}", "{Частота}"),
        (ScientificKind::AddPlot, "mark", "*", "+"),
    ] {
        let view = SourceView {
            text: source,
            revision: 11,
        };
        let items = scan_scientific_source(view).unwrap();
        let instance = items.iter().find(|x| x.kind == kind).unwrap();
        let patch = plan_literal_key_edit(LiteralEditRequest {
            view,
            instance,
            key,
            expected_old: old,
            replacement: new,
        })
        .unwrap();
        if key == "xlabel" {
            assert!(!patch.expected_old.contains('{'));
            assert!(!patch.replacement.contains('}'));
        }
        let mut edited = source.to_owned();
        let mut revision = 11;
        let inverse = patch.apply(&mut edited, &mut revision).unwrap();
        assert!(edited.contains(&format!("{key}={new}")));
        inverse.apply(&mut edited, &mut revision).unwrap();
        assert_eq!(source.as_bytes(), edited.as_bytes());
    }
}

#[test]
fn deliberate_unsafe_edits_fail_closed_on_original_and_synthetic_sources() {
    let view = SourceView {
        text: SV001,
        revision: 21,
    };
    let instances = scan_scientific_source(view).unwrap();
    let axis = instances.iter().find(|x| x.kind == ScientificKind::Axis).unwrap();
    let forbidden: [(&str, &str, &str); 9] = [
        ("width", r"1\textwidth", "5cm"),
        ("height", r"0.62\textwidth", "0"),
        ("xtick distance", "1", "0.000001"),
        ("ytick distance", "0.5", r"\yStep"),
        ("xlabel", r"$\beta^{1/2}\tau_0$", "{Время}"),
        ("mark", "none", r"\badmark"),
        ("width", r"1\textwidth", r"0.3\write18"),
        ("domain", "-3:3", "0:1e999"),
        ("samples", "150", "9000000000"),
    ];
    for (key, old, replacement) in forbidden {
        let result = plan_literal_key_edit(LiteralEditRequest {
            view,
            instance: axis,
            key,
            expected_old: old,
            replacement,
        });
        assert!(result.is_err(), "{key} accepted unsafe {replacement:?}");
    }
    let source = r"\begin{tikzpicture}
\begin{axis}[mark=none,mark=*]
\end{axis}
\end{tikzpicture}";
    let view = SourceView {
        text: &source,
        revision: 21,
    };
    let items = scan_scientific_source(view).unwrap();
    let axis = items.iter().find(|x| x.kind == ScientificKind::Axis).unwrap();
    let duplicate = plan_literal_key_edit(LiteralEditRequest {
        view,
        instance: axis,
        key: "mark",
        expected_old: "none",
        replacement: "*",
    });
    assert_eq!(duplicate.unwrap_err(), EditRefusal::AmbiguousKey);
}

#[test]
#[ignore = "External XeLaTeX evidence runs only on disposable hosted Linux"]
fn sc3_export_style_patch_to_ephemeral_sarov_copy() {
    use std::{fs, io::Write, path::PathBuf};
    let temp = PathBuf::from(std::env::var_os("RUNNER_TEMP").expect("ephemeral hosted runner"));
    assert!(temp.is_absolute());
    let root = temp.canonicalize().unwrap();
    let output = root.join("tikzarium-sc3-style-edited");
    fs::create_dir_all(&output).unwrap();
    assert!(output.canonicalize().unwrap().starts_with(&root));
    let mut text = SV001.to_owned();
    let mut revision = 40;
    let mut inverse_patches = Vec::new();
    for (key, expected_old, replacement) in [
        ("xtick distance", "1", "2"),
        ("height", r"0.62\textwidth", r"0.75\textwidth"),
        ("mark", "none", "*"),
    ] {
        let view = SourceView {
            text: &text,
            revision,
        };
        let instances = scan_scientific_source(view).unwrap();
        let axis = instances
            .iter()
            .find(|item| item.kind == ScientificKind::Axis)
            .unwrap();
        let patch = plan_literal_key_edit(LiteralEditRequest {
            view,
            instance: axis,
            key,
            expected_old,
            replacement,
        })
        .unwrap();
        inverse_patches.push(patch.apply(&mut text, &mut revision).unwrap());
    }
    assert!(text.contains("xtick distance=2"));
    assert!(text.contains(r"height=0.75\textwidth"));
    assert!(text.contains("mark=*,samples=150"));
    let edited_sha = digest(&text);
    let original_sha = digest(SV001);
    assert_ne!(edited_sha, original_sha);
    let file = output.join("figure.tex");
    let mut handle = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&file)
        .unwrap();
    handle.write_all(text.as_bytes()).unwrap();
    handle.sync_all().unwrap();
    assert_eq!(fs::read(&file).unwrap(), text.as_bytes());
    for mut inverse in inverse_patches.into_iter().rev() {
        inverse.source_revision = revision;
        inverse.apply(&mut text, &mut revision).unwrap();
    }
    assert_eq!(text.as_bytes(), SV001.as_bytes());
    assert_eq!(digest(&text), original_sha);
    println!(
        "SC3_STYLE_EXTERNAL_SOURCE=PASS,original_sha={original_sha},modified_sha={edited_sha},file={}",
        file.display()
    );
}
