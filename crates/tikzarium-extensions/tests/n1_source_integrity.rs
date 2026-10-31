//! F01: integration-level source integrity contracts for the public C07 API.
//! This suite deliberately does not parse arbitrary TeX or test egui pointer input.
//! Its parent is C07 #39 commit cc0e478d055824aecaa89a3b7b2d3b9ae4d51228.

use std::{collections::BTreeMap, fs, ops::Range};

use tikzarium_extensions::primitives::{Catalog, PrimitiveError, SourcePatch};

const CRLF: &str = include_str!("../../../fixtures/n1-source-integrity/opaque-crlf.tex");
const DUPLICATES: &str =
    include_str!("../../../fixtures/n1-source-integrity/duplicate-lf.tex");
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

fn assert_conflict_without_mutation(
    patch: &SourcePatch,
    source: &mut String,
    revision: &mut u64,
) {
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
        let replacement = catalog
            .generate(&tool.id, &BTreeMap::new())
            .unwrap()
            .source;
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
    let change = patch(
        &source,
        ORIGINAL_LINE,
        0,
        generated("tikz.circle", &[]),
        7,
    );
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
        10..3,
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
    assert_eq!(source, format!("{}{}{}", &original[..at], inserted, &original[at..]));
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
    let literal = generated(
        "tikz.node",
        &[("content", r"Привет #$%&_{}~^\")],
    );
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
    inverse.apply(&mut reopened, &mut revision).unwrap();
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
