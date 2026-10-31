use serde::Deserialize;
use std::collections::{BTreeMap, HashSet};
use tikzarium_extensions::primitives::{Catalog, Evidence, SourcePatch};

#[derive(Deserialize)]
struct NegativeFixtures {
    schema_version: u32,
    case: Vec<NegativeCase>,
}
#[derive(Deserialize)]
struct NegativeCase {
    id: String,
    tool_id: String,
    parameter: String,
    value: String,
}
#[test]
fn catalog_is_complete_and_examples_match_executable_schema() {
    let c = Catalog::bundled().unwrap();
    assert_eq!(c.tools.len(), 6);
    let mut ids = HashSet::new();
    for t in &c.tools {
        assert!(ids.insert(t.id.as_str()));
        assert!(!t.help_ru.trim().is_empty());
        assert!(!t.warning_ru.trim().is_empty());
        assert!(!t.manual_section.trim().is_empty());
        assert!(t.manual_url.starts_with("https://tikz.dev/"));
        let mut parameter_ids = HashSet::new();
        for p in &t.parameter {
            assert!(parameter_ids.insert(p.id.as_str()));
            assert!(!p.help_ru.trim().is_empty());
            assert!(!p.syntax.is_empty());
            assert!(!p.example.is_empty());
            assert!(!p.warning_ru.is_empty());
            assert_eq!(p.requirements_inherit, "tool");
            assert_eq!(p.default_provenance, "editor_preset");
        }
        let generated = c.generate(&t.id, &BTreeMap::new()).unwrap();
        assert_eq!(generated.source, t.example);
        assert_eq!(generated.usepackage, ["tikz"]);
    }
}
#[test]
fn six_commands_match_real_xelatex_fixture() {
    let c = Catalog::bundled().unwrap();
    assert_eq!(
        c.fixture_document().unwrap(),
        include_str!("../../../extensions/primitives/fixtures/all-six.tex").replace("\r\n", "\n")
    );
    assert!(
        c.generate("tikz.arrow", &BTreeMap::new())
            .unwrap()
            .usetikzlibrary
            .contains(&"arrows.meta".to_owned())
    );
}
#[test]
fn negative_literals_cannot_enter_tikz_template() {
    let c = Catalog::bundled().unwrap();
    let fixture: NegativeFixtures = toml::from_str(include_str!(
        "../../../extensions/primitives/fixtures/negative-cases.toml"
    ))
    .unwrap();
    assert_eq!(fixture.schema_version, 1);
    assert!(fixture.case.len() >= 6);
    let mut ids = HashSet::new();
    for test in fixture.case {
        assert!(ids.insert(test.id.clone()));
        let input = BTreeMap::from([(test.parameter, test.value)]);
        assert!(c.generate(&test.tool_id, &input).is_err(), "{}", test.id);
    }
    let unknown = BTreeMap::from([("malicious_option".to_owned(), "x".to_owned())]);
    assert!(c.generate("tikz.line", &unknown).is_err());
}
#[test]
fn text_is_escaped_but_math_is_intentional_raw_user_tex() {
    let c = Catalog::bundled().unwrap();
    let plain = BTreeMap::from([("content".to_owned(), "x_50% & y".to_owned())]);
    assert!(
        c.generate("tikz.node", &plain)
            .unwrap()
            .source
            .contains("x\\_50\\% \\& y")
    );
    let math = BTreeMap::from([
        ("content".to_owned(), "\\alpha^2 + x_1".to_owned()),
        ("mode".to_owned(), "math".to_owned()),
    ]);
    assert!(
        c.generate("tikz.node", &math)
            .unwrap()
            .source
            .contains("{$\\alpha^2 + x_1$}")
    );
}
#[test]
fn known_range_patch_is_minimal_reversible_and_conflict_checked() {
    let mut source = "\\unknownmacro{123}\n\\draw (0cm,0cm) -- (2cm,1cm);\n\\another\n".to_owned();
    let original = source.clone();
    let original_line = "\\draw (0cm,0cm) -- (2cm,1cm);";
    let start = source.find(original_line).unwrap();
    let replacement = Catalog::bundled()
        .unwrap()
        .generate("tikz.rectangle", &BTreeMap::new())
        .unwrap()
        .source;
    let patch = SourcePatch {
        range: start..start + original_line.len(),
        expected_old: original_line.to_owned(),
        replacement,
        source_revision: 41,
    };
    let mut rev = 41;
    let inverse = patch.apply(&mut source, &mut rev).unwrap();
    assert!(source.starts_with("\\unknownmacro{123}\n"));
    assert!(source.ends_with("\n\\another\n"));
    assert_eq!(rev, 42);
    assert!(patch.apply(&mut source, &mut rev).is_err());
    inverse.apply(&mut source, &mut rev).unwrap();
    assert_eq!(source, original);
    assert_eq!(rev, 43);
    let wrong = SourcePatch {
        source_revision: 43,
        expected_old: "other".into(),
        ..patch
    };
    assert!(wrong.apply(&mut source, &mut rev).is_err());
    assert_eq!(source, original);
}
#[test]
fn installed_loaded_engine_and_tool_are_five_separate_dimensions() {
    let c = Catalog::bundled().unwrap();
    let status = c
        .capabilities(
            "tikz.arrow",
            Evidence::Confirmed,
            Evidence::Unknown,
            Some("xelatex"),
        )
        .unwrap();
    assert_eq!(status.installed, Evidence::Confirmed);
    assert_eq!(status.project_loaded, Evidence::Unknown);
    assert_eq!(status.engine_compatible, Evidence::Confirmed);
    assert_eq!(
        c.capabilities(
            "tikz.arrow",
            Evidence::Confirmed,
            Evidence::Unknown,
            Some("lualatex")
        )
        .unwrap()
        .engine_compatible,
        Evidence::Absent
    );
    assert_eq!(status.tool_implemented, Evidence::Confirmed);
    assert_eq!(status.help_available, Evidence::Confirmed);
    assert!(!status.visual_editable);
    assert_eq!(
        c.capabilities("tikz.line", Evidence::Unknown, Evidence::Unknown, None)
            .unwrap()
            .engine_compatible,
        Evidence::Unknown
    );
}
