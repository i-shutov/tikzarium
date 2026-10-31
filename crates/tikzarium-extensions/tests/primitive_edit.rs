use std::collections::BTreeMap;
use tikzarium_extensions::primitive_edit::{plan_parameter_edit, SourceTarget};
use tikzarium_extensions::primitives::{Catalog, PrimitiveError};

fn enclosed_command(
    catalog: &Catalog,
    tool_id: &str,
    values: &BTreeMap<String, String>,
) -> (String, std::ops::Range<usize>) {
    let command = catalog.generate(tool_id, values).unwrap().source;
    let mut document = String::from(
        "\\documentclass{article}\n% user's unknown macro must survive\n\\mystery{z}\n",
    );
    let start = document.len();
    document.push_str(&command);
    let end = document.len();
    document.push_str("\n\\myCustomScope{untouched} % suffix\n");
    (document, start..end)
}

#[test]
fn every_tool_can_change_a_literal_property_with_undo_and_unrelated_bytes_intact() {
    let catalog = Catalog::bundled().unwrap();
    let cases = [
        ("tikz.line", "start_x", "9mm"),
        ("tikz.arrow", "end_x", "-8pt"),
        ("tikz.rectangle", "end_y", "3.5cm"),
        ("tikz.circle", "radius", "4mm"),
        ("tikz.node", "x", "-1in"),
        ("tikz.bezier-cubic", "control2_y", "7cm"),
    ];
    for (tool_id, key, value) in cases {
        let values = BTreeMap::new();
        let (mut source, command_range) = enclosed_command(&catalog, tool_id, &values);
        let original = source.clone();
        let mut revision = 200;
        let patch = plan_parameter_edit(
            &catalog,
            tool_id,
            &values,
            key,
            value,
            &source,
            SourceTarget::new(command_range.clone(), revision),
        )
        .unwrap();

        assert!(patch.range.start >= command_range.start);
        assert!(patch.range.end <= command_range.end);
        let undo = patch.apply(&mut source, &mut revision).unwrap();
        assert_eq!(revision, 201);
        let updated_values = BTreeMap::from([(key.to_owned(), value.to_owned())]);
        assert!(source.contains(&catalog.generate(tool_id, &updated_values).unwrap().source));
        assert!(source.starts_with("\\documentclass{article}\n% user's unknown macro"));
        assert!(source.ends_with("\\myCustomScope{untouched} % suffix\n"));

        undo.apply(&mut source, &mut revision).unwrap();
        assert_eq!(revision, 202);
        assert_eq!(source, original);
    }
}

#[test]
fn changed_or_ambiguous_source_is_not_edited_even_with_a_valid_literal() {
    let catalog = Catalog::bundled().unwrap();
    let values = BTreeMap::new();
    let (mut source, command_range) = enclosed_command(&catalog, "tikz.circle", &values);
    let original = source.clone();
    let patch = plan_parameter_edit(
        &catalog,
        "tikz.circle",
        &values,
        "radius",
        "2cm",
        &source,
        SourceTarget::new(command_range.clone(), 12),
    )
    .unwrap();
    let mut wrong_revision = 13;
    assert!(patch.apply(&mut source, &mut wrong_revision).is_err());
    assert_eq!(source, original);

    let changed = source.replacen("8mm", "9mm", 1);
    assert!(matches!(
        plan_parameter_edit(
            &catalog,
            "tikz.circle",
            &values,
            "radius",
            "2cm",
            &changed,
            SourceTarget::new(command_range.clone(), 12),
        ),
        Err(PrimitiveError::SourceConflict)
    ));
    assert!(
        plan_parameter_edit(
            &catalog,
            "tikz.circle",
            &values,
            "radius",
            "2cm",
            &source,
            SourceTarget::new(0..source.len(), 12),
        )
        .is_err()
    );
    assert!(
        plan_parameter_edit(
            &catalog,
            "tikz.circle",
            &values,
            "radius",
            "0cm",
            &source,
            SourceTarget::new(command_range, 12),
        )
        .is_err()
    );
}

#[test]
fn math_mode_and_utf8_node_content_only_change_the_owned_command() {
    let catalog = Catalog::bundled().unwrap();
    let values = BTreeMap::from([("content".to_owned(), "Привет".to_owned())]);
    let (mut source, command_range) = enclosed_command(&catalog, "tikz.node", &values);
    let original = source.clone();
    let mut revision = 17;
    let patch = plan_parameter_edit(
        &catalog,
        "tikz.node",
        &values,
        "content",
        "График $x_1$",
        &source,
        SourceTarget::new(command_range, revision),
    )
    .unwrap();
    let undo = patch.apply(&mut source, &mut revision).unwrap();
    assert!(source.contains("График \\$x\\_1\\$"));
    assert!(source.contains("\\myCustomScope{untouched}"));
    undo.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source, original);
}

#[test]
fn unsupported_or_no_op_parameter_edits_are_rejected_without_mutation() {
    let catalog = Catalog::bundled().unwrap();
    let values = BTreeMap::new();
    let (source, range) = enclosed_command(&catalog, "tikz.line", &values);
    assert!(matches!(
        plan_parameter_edit(
            &catalog,
            "tikz.line",
            &values,
            "missing_key",
            "1cm",
            &source,
            SourceTarget::new(range.clone(), 1),
        ),
        Err(PrimitiveError::UnknownParameter(_))
    ));
    assert!(matches!(
        plan_parameter_edit(
            &catalog,
            "tikz.line",
            &values,
            "start_x",
            "0cm",
            &source,
            SourceTarget::new(range, 1),
        ),
        Err(PrimitiveError::SourceConflict)
    ));
}
