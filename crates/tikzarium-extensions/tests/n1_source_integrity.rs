//! F01: independent source-preservation tests against the merged N1 public API.
//! Base: main 6b0fe3551cb6ded5cf737e28a7a74326f0b4fe49 (#44).
//! No TeX parsing, pointer simulation, or implicit ownership after reopening.

use std::{collections::BTreeMap, fs, ops::Range};

use tikzarium_extensions::primitive_edit::{SourceTarget, plan_parameter_edit};
use tikzarium_extensions::primitives::{Catalog, PrimitiveError, SourcePatch};

const CRLF: &str = include_str!("../../../fixtures/n1-source-integrity/opaque-crlf.tex");
const DUPLICATES: &str = include_str!("../../../fixtures/n1-source-integrity/duplicate-lf.tex");
const ORIGINAL_LINE: &str = r"\draw (0cm,0cm) -- (2cm,1cm);";

fn generated(tool: &str, values: &[(&str, &str)]) -> String {
    let values: BTreeMap<String, String> = values
        .iter()
        .map(|(key, value)| ((*key).into(), (*value).into()))
        .collect();
    Catalog::bundled()
        .unwrap()
        .generate(tool, &values)
        .unwrap()
        .source
}

fn nth_span(source: &str, needle: &str, index: usize) -> Range<usize> {
    let start = source
        .match_indices(needle)
        .nth(index)
        .expect("required fixture occurrence")
        .0;
    start..start + needle.len()
}

fn patch(
    source: &str,
    old: &str,
    occurrence: usize,
    replacement: String,
    revision: u64,
) -> SourcePatch {
    SourcePatch {
        range: nth_span(source, old, occurrence),
        expected_old: old.to_owned(),
        replacement,
        source_revision: revision,
    }
}

fn assert_conflict_without_mutation(patch: &SourcePatch, source: &mut String, revision: &mut u64) {
    let before = source.as_bytes().to_vec();
    let old_revision = *revision;
    assert!(matches!(
        patch.apply(source, revision),
        Err(PrimitiveError::SourceConflict)
    ));
    assert_eq!(source.as_bytes(), before);
    assert_eq!(*revision, old_revision);
}

#[test]
fn six_generator_results_replace_only_one_span_in_cyrillic_crlf_tex() {
    assert!(CRLF.contains("Кириллица"));
    assert!(CRLF.contains("\r\n"));
    assert!(!CRLF.replace("\r\n", "").contains('\n'));

    let catalog = Catalog::bundled().unwrap();
    for tool in &catalog.tools {
        let original = CRLF.to_owned();
        let mut source = original.clone();
        let region = nth_span(&source, ORIGINAL_LINE, 0);
        let prefix = original[..region.start].to_owned();
        let suffix = original[region.end..].to_owned();
        let replacement = catalog.generate(&tool.id, &BTreeMap::new()).unwrap().source;
        let change = patch(&source, ORIGINAL_LINE, 0, replacement.clone(), 41);
        let mut revision = 41;
        let inverse = change.apply(&mut source, &mut revision).unwrap();

        assert_eq!(revision, 42, "{}", tool.id);
        assert_eq!(source, format!("{prefix}{replacement}{suffix}"));
        assert_eq!(&source[..region.start], prefix);
        assert_eq!(&source[region.start + replacement.len()..], suffix);
        assert!(source.contains(r"\unknownUserMacro{ничего не трогать}"));
        assert!(source.contains("% Кириллица"));
        assert!(source.contains("\r\n"));

        inverse.apply(&mut source, &mut revision).unwrap();
        assert_eq!(revision, 43, "{}", tool.id);
        assert_eq!(source.as_bytes(), original.as_bytes(), "{}", tool.id);
    }
}

#[test]
fn stale_revision_rejects_even_if_expected_text_is_identical() {
    let mut source = CRLF.to_owned();
    let mut revision = 8;
    let change = patch(&source, ORIGINAL_LINE, 0, generated("tikz.circle", &[]), 7);
    assert_conflict_without_mutation(&change, &mut source, &mut revision);
}

#[test]
fn user_changes_inside_the_expected_range_are_not_overwritten() {
    let mut source = CRLF.to_owned();
    let region = nth_span(&source, ORIGINAL_LINE, 0);
    let change = patch(
        &source,
        ORIGINAL_LINE,
        0,
        generated("tikz.rectangle", &[]),
        20,
    );
    let edited = ORIGINAL_LINE.replace("2cm", "3cm");
    source.replace_range(region, &edited);
    let mut revision = 20;
    assert_conflict_without_mutation(&change, &mut source, &mut revision);
    assert!(source.contains(&edited));
}

#[test]
fn bad_ranges_and_utf8_mid_codepoint_offsets_fail_without_panicking() {
    let mut source = CRLF.to_owned();
    let mut revision = 7;
    let unicode_start = source.find("Кириллица").unwrap();
    let len = source.len();
    let invalid = [
        unicode_start + 1..unicode_start + 2,
        len..0,
        len + 1..len + 5,
    ];
    for range in invalid {
        let change = SourcePatch {
            range,
            expected_old: String::new(),
            replacement: generated("tikz.line", &[]),
            source_revision: revision,
        };
        assert_conflict_without_mutation(&change, &mut source, &mut revision);
    }
}

#[test]
fn revision_overflow_is_rejected_before_mutation() {
    let mut source = CRLF.to_owned();
    let mut revision = u64::MAX;
    let change = patch(
        &source,
        ORIGINAL_LINE,
        0,
        generated("tikz.line", &[]),
        revision,
    );
    assert_conflict_without_mutation(&change, &mut source, &mut revision);
}

#[test]
fn an_explicit_empty_range_inserts_a_command_without_touching_preamble() {
    let original = CRLF.to_owned();
    let mut source = original.clone();
    let at = source.find(r"\end{tikzpicture}").unwrap();
    let inserted = format!("{}\r\n", generated("tikz.arrow", &[]));
    let mut revision = 0;
    let change = SourcePatch {
        range: at..at,
        expected_old: String::new(),
        replacement: inserted.clone(),
        source_revision: revision,
    };
    let inverse = change.apply(&mut source, &mut revision).unwrap();
    assert_eq!(
        source,
        format!("{}{}{}", &original[..at], inserted, &original[at..])
    );
    assert_eq!(&source[..at], &original[..at]);
    assert_eq!(&source[at + inserted.len()..], &original[at..]);
    inverse.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source.as_bytes(), original.as_bytes());
}

#[test]
fn duplicate_commands_are_selected_by_exact_byte_range_not_first_match() {
    let original = DUPLICATES.to_owned();
    let mut source = original.clone();
    assert_eq!(source.matches(ORIGINAL_LINE).count(), 2);
    let region = nth_span(&source, ORIGINAL_LINE, 1);
    let prefix = original[..region.start].to_owned();
    let suffix = original[region.end..].to_owned();
    let replacement = generated("tikz.circle", &[("radius", "12mm")]);
    let change = patch(&source, ORIGINAL_LINE, 1, replacement.clone(), 9);
    let mut revision = 9;
    let inverse = change.apply(&mut source, &mut revision).unwrap();

    assert_eq!(&source[..region.start], prefix);
    assert_eq!(&source[region.start + replacement.len()..], suffix);
    assert_eq!(source.matches(ORIGINAL_LINE).count(), 1);
    assert_eq!(source.matches(&replacement).count(), 1);
    inverse.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source.as_bytes(), original.as_bytes());
}

#[test]
fn two_edits_need_fresh_spans_and_undo_revisions_are_not_automatically_rebased() {
    let original = DUPLICATES.to_owned();
    let mut source = original.clone();
    let mut revision = 100;

    let first = generated("tikz.rectangle", &[("end_x", "9cm")]);
    let change1 = patch(&source, ORIGINAL_LINE, 0, first.clone(), revision);
    let undo1 = change1.apply(&mut source, &mut revision).unwrap();

    // Find the remaining original line again: the first replacement changed offsets.
    let second = generated("tikz.arrow", &[("tip", "Latex")]);
    let change2 = patch(&source, ORIGINAL_LINE, 0, second.clone(), revision);
    let undo2 = change2.apply(&mut source, &mut revision).unwrap();
    assert!(source.contains(&first));
    assert!(source.contains(&second));

    undo2.apply(&mut source, &mut revision).unwrap();
    assert_conflict_without_mutation(&undo1, &mut source, &mut revision);

    // The caller may rebase an inverse only after checking its expected span.
    let rebased_undo1 = SourcePatch {
        source_revision: revision,
        ..undo1
    };
    rebased_undo1.apply(&mut source, &mut revision).unwrap();
    assert_eq!(revision, 104);
    assert_eq!(source.as_bytes(), original.as_bytes());
}

#[test]
fn text_nodes_escape_tex_metacharacters_but_math_is_deliberate_raw_tex() {
    let literal = generated("tikz.node", &[("content", r"Привет #$%&_{}~^\")]);
    assert_eq!(
        literal,
        r"\node at (0cm,0cm) {Привет \#\$\%\&\_\{\}\textasciitilde{}\textasciicircum{}\textbackslash{}};"
    );
    assert_eq!(
        generated("tikz.node", &[("content", r"\input{private}")]),
        r"\node at (0cm,0cm) {\textbackslash{}input\{private\}};"
    );
    let math = generated(
        "tikz.node",
        &[("mode", "math"), ("content", r"\alpha^2 + x_1")],
    );
    assert_eq!(math, r"\node at (0cm,0cm) {$\alpha^2 + x_1$};");
    assert!(!math.contains(r"\textbackslash"));
}

#[test]
fn save_reopen_and_undo_real_tex_file_preserve_all_original_bytes() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("Рисунок с пробелами.tex");
    fs::write(&path, CRLF.as_bytes()).unwrap();
    let before = fs::read(&path).unwrap();

    let mut source = fs::read_to_string(&path).unwrap();
    let mut revision = 400;
    let change = patch(
        &source,
        ORIGINAL_LINE,
        0,
        generated("tikz.bezier-cubic", &[]),
        revision,
    );
    let inverse = change.apply(&mut source, &mut revision).unwrap();
    fs::write(&path, source.as_bytes()).unwrap();

    let mut reopened = fs::read_to_string(&path).unwrap();
    assert_eq!(reopened.as_bytes(), source.as_bytes());
    assert!(reopened.contains(r"\unknownUserMacro{ничего не трогать}"));
    // Reloading text alone does not restore the prior process's undo stack.
    let mut fresh_revision = 0;
    assert_conflict_without_mutation(&inverse, &mut reopened, &mut fresh_revision);
    // An explicitly selected, byte-exact source span can still be edited in source mode.
    let generated_bezier = generated("tikz.bezier-cubic", &[]);
    let selected_span = nth_span(&reopened, &generated_bezier, 0);
    let explicit_source_edit = SourcePatch {
        range: selected_span,
        expected_old: generated_bezier,
        replacement: ORIGINAL_LINE.into(),
        source_revision: fresh_revision,
    };
    explicit_source_edit
        .apply(&mut reopened, &mut fresh_revision)
        .unwrap();
    fs::write(&path, reopened.as_bytes()).unwrap();
    assert_eq!(fs::read(&path).unwrap(), before);
}

#[test]
fn successive_edits_same_range_require_revision_rebase_to_undo_older_changes() {
    let original = CRLF.to_owned();
    let mut source = original.clone();
    let mut revision = 0;

    let rectangle = generated("tikz.rectangle", &[]);
    let change1 = patch(&source, ORIGINAL_LINE, 0, rectangle.clone(), revision);
    let undo1 = change1.apply(&mut source, &mut revision).unwrap();

    let circle = generated("tikz.circle", &[]);
    let change2 = patch(&source, &rectangle, 0, circle, revision);
    let undo2 = change2.apply(&mut source, &mut revision).unwrap();

    undo2.apply(&mut source, &mut revision).unwrap();
    assert_conflict_without_mutation(&undo1, &mut source, &mut revision);
    let undo1 = SourcePatch {
        source_revision: revision,
        ..undo1
    };
    undo1.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source.as_bytes(), original.as_bytes());
}

#[test]
fn typed_source_target_plans_all_six_parameter_edits_without_touching_crlf_opaque_tex() {
    let catalog = Catalog::bundled().unwrap();
    let cases = [
        ("tikz.line", "start_x", "9mm"),
        ("tikz.arrow", "end_x", "-8pt"),
        ("tikz.rectangle", "end_y", "3.5cm"),
        ("tikz.circle", "radius", "4mm"),
        ("tikz.node", "x", "-1in"),
        ("tikz.bezier-cubic", "control2_y", "7cm"),
    ];
    for (tool, parameter, new_value) in cases {
        let before_command = generated(tool, &[]);
        let original = CRLF.replacen(ORIGINAL_LINE, &before_command, 1);
        let command_span = nth_span(&original, &before_command, 0);
        let before_prefix = &original[..command_span.start];
        let before_suffix = &original[command_span.end..];
        let mut source = original.clone();
        let mut revision = 71;
        let change = plan_parameter_edit(
            &catalog,
            tool,
            &BTreeMap::new(),
            parameter,
            new_value,
            &source,
            SourceTarget::new(command_span.clone(), revision),
        )
        .unwrap();
        assert!(change.range.start >= command_span.start, "{tool}");
        assert!(change.range.end <= command_span.end, "{tool}");
        let inverse = change.apply(&mut source, &mut revision).unwrap();
        let new_values = BTreeMap::from([(parameter.to_owned(), new_value.to_owned())]);
        let after_command = catalog.generate(tool, &new_values).unwrap().source;
        assert!(source.starts_with(before_prefix), "{tool}");
        assert!(source.ends_with(before_suffix), "{tool}");
        assert_eq!(
            &source[command_span.start..command_span.start + after_command.len()],
            after_command,
            "{tool}"
        );
        assert!(source.contains(r"\unknownUserMacro{ничего не трогать}"));
        assert!(source.contains("% Кириллица"));
        inverse.apply(&mut source, &mut revision).unwrap();
        assert_eq!(source.as_bytes(), original.as_bytes(), "{tool}");
        assert_eq!(revision, 73);
    }
}

#[test]
fn plan_rejects_manually_changed_generated_command_without_reformatting_surroundings() {
    let catalog = Catalog::bundled().unwrap();
    let command = generated("tikz.circle", &[]);
    let original = CRLF.replacen(ORIGINAL_LINE, &command, 1);
    let range = nth_span(&original, &command, 0);
    let modified = original.replacen("8mm", "9mm", 1);
    assert_ne!(modified, original);
    let before = modified.as_bytes().to_vec();
    assert!(matches!(
        plan_parameter_edit(
            &catalog,
            "tikz.circle",
            &BTreeMap::new(),
            "radius",
            "2cm",
            &modified,
            SourceTarget::new(range, 51),
        ),
        Err(PrimitiveError::SourceConflict)
    ));
    assert_eq!(modified.as_bytes(), before);
}

#[test]
fn typed_targets_reject_non_utf8_boundaries_invalid_offsets_and_false_full_document_ranges() {
    let catalog = Catalog::bundled().unwrap();
    let values = BTreeMap::from([("content".to_owned(), "Привет".to_owned())]);
    let command = catalog.generate("tikz.node", &values).unwrap().source;
    let source = format!("\\unknown{{x}}\r\n{command}\r\n\\tail{{y}}\r\n");
    let range = nth_span(&source, &command, 0);
    let cyrillic = source.find("Привет").unwrap();
    let invalid = [
        cyrillic + 1..cyrillic + 2,
        range.end..range.start,
        usize::MAX - 1..usize::MAX,
        0..source.len(),
    ];
    for bad_range in invalid {
        assert!(matches!(
            plan_parameter_edit(
                &catalog,
                "tikz.node",
                &values,
                "content",
                "Новое",
                &source,
                SourceTarget::new(bad_range, 8),
            ),
            Err(PrimitiveError::SourceConflict)
        ));
    }
}

#[test]
fn identical_generated_commands_edit_the_exact_second_target_not_the_first_match() {
    let catalog = Catalog::bundled().unwrap();
    let command = generated("tikz.line", &[]);
    let original =
        format!("\\documentclass{{article}}\n{command}\n\\unknown{{не трогать}}\n{command}\n");
    let second = nth_span(&original, &command, 1);
    let mut source = original.clone();
    let mut revision = 14;
    let change = plan_parameter_edit(
        &catalog,
        "tikz.line",
        &BTreeMap::new(),
        "end_x",
        "6cm",
        &source,
        SourceTarget::new(second.clone(), revision),
    )
    .unwrap();
    assert!(change.range.start >= second.start);
    let inverse = change.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source.matches(&command).count(), 1);
    assert!(source[..second.start].contains(&command));
    assert!(source.contains(r"\unknown{не трогать}"));
    inverse.apply(&mut source, &mut revision).unwrap();
    assert_eq!(source.as_bytes(), original.as_bytes());
}

#[test]
fn moved_generated_fragment_inside_unknown_macro_cannot_be_undone_by_global_search() {
    let catalog = Catalog::bundled().unwrap();
    let before_command = generated("tikz.circle", &[]);
    let original = format!("\\documentclass{{article}}\n{before_command}\n\\unknown{{keep}}\n");
    let mut source = original.clone();
    let mut revision = 91;
    let change = plan_parameter_edit(
        &catalog,
        "tikz.circle",
        &BTreeMap::new(),
        "radius",
        "2cm",
        &source,
        SourceTarget::new(nth_span(&source, &before_command, 0), revision),
    )
    .unwrap();
    let inverse = change.apply(&mut source, &mut revision).unwrap();
    let after_command = generated("tikz.circle", &[("radius", "2cm")]);
    let old_position = nth_span(&source, &after_command, 0);
    source.replace_range(old_position, "");
    source.push_str(&format!("\\userMacro{{{after_command}}}\n"));
    revision += 1; // The user edited the buffer outside a managed transaction.
    let moved = source.clone();
    assert!(source.contains(&after_command));
    assert_conflict_without_mutation(&inverse, &mut source, &mut revision);
    // Even a *revision-only* rebase may never search for matching text elsewhere.
    let rebase_without_range_validation = SourcePatch {
        source_revision: revision,
        ..inverse
    };
    assert_conflict_without_mutation(&rebase_without_range_validation, &mut source, &mut revision);
    assert_eq!(source, moved);
}

#[test]
fn stale_target_and_changed_prefix_do_not_authorize_edit_after_reopen() {
    let catalog = Catalog::bundled().unwrap();
    let original_command = generated("tikz.node", &[("content", "Начало")]);
    let original = CRLF.replacen(ORIGINAL_LINE, &original_command, 1);
    let old_range = nth_span(&original, &original_command, 0);
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("Сохранение и открытие.tex");
    fs::write(&path, original.as_bytes()).unwrap();
    let changed = original.replacen(
        r"\begin{tikzpicture}",
        "% inserted after save\r\n\\begin{tikzpicture}",
        1,
    );
    fs::write(&path, changed.as_bytes()).unwrap();
    let reopened = fs::read_to_string(&path).unwrap();
    assert_ne!(reopened, original);
    // A range from the pre-save source is not a freshly authenticated range.
    assert!(matches!(
        plan_parameter_edit(
            &catalog,
            "tikz.node",
            &BTreeMap::from([("content".to_owned(), "Начало".to_owned())]),
            "content",
            "Другое",
            &reopened,
            SourceTarget::new(old_range, 2),
        ),
        Err(PrimitiveError::SourceConflict)
    ));
    let confirmed_new_range = nth_span(&reopened, &original_command, 0);
    let patch = plan_parameter_edit(
        &catalog,
        "tikz.node",
        &BTreeMap::from([("content".to_owned(), "Начало".to_owned())]),
        "content",
        "Другое",
        &reopened,
        SourceTarget::new(confirmed_new_range, 0),
    )
    .unwrap();
    // Planning did not persist ownership or an undo stack.
    let mut loaded = reopened.clone();
    let mut fresh_revision = 0;
    let inverse = patch.apply(&mut loaded, &mut fresh_revision).unwrap();
    inverse.apply(&mut loaded, &mut fresh_revision).unwrap();
    assert_eq!(loaded.as_bytes(), reopened.as_bytes());
    assert_eq!(fs::read(&path).unwrap(), changed.as_bytes());
}
