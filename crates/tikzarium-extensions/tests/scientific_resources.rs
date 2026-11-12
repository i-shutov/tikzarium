use sha2::{Digest, Sha256};
use tikzarium_extensions::{
    scientific_resources::{
        MAX_SCIENTIFIC_RESOURCE_REFERENCES, ScientificResourceKind, ScientificResourceScanRefusal,
        ScientificResourceStatus, scan_scientific_resources,
    },
    scientific_scan::{MAX_SCIENTIFIC_SOURCE_BYTES, SourceView},
};

#[test]
fn genuine_f14_3_reports_three_read_only_macro_paths_without_resolution_claims() {
    let source =
        include_str!("../../../roadmap/Tikzarium_Scientific_142_R4/fixtures/AK/F14_3/figure.tex");
    let original = source.as_bytes().to_vec();
    let found = scan_scientific_resources(SourceView {
        text: source,
        revision: 19,
    })
    .unwrap();
    assert_eq!(found.len(), 3);
    assert_eq!(
        found.iter().map(|r| r.kind).collect::<Vec<_>>(),
        vec![ScientificResourceKind::TikzPlotFile; 3]
    );
    for (index, (reference, filename)) in found
        .iter()
        .zip(["F14_3_left.dat", "F14_3_middle.dat", "F14_3_right.dat"])
        .enumerate()
    {
        assert_eq!(reference.path, format!("\\datadir/{filename}"));
        assert_eq!(reference.status, ScientificResourceStatus::MacroContaining);
        assert_eq!(reference.revision, 19);
        assert_eq!(reference.path, source[reference.path_range.clone()]);
        assert_eq!(reference.line, 23 + index);
    }
    assert_eq!(source.as_bytes(), original.as_slice());
}

#[test]
fn comments_unicode_crlf_and_escaped_percent_preserve_ranges_and_lines() {
    let source = concat!(
        "% \\input{commented.tex}\r\n",
        "\\begin{tikzpicture}\\draw plot file {данные/a.dat}; % \\include{hidden.tex}\r\n",
        "\\end{tikzpicture}\r\n",
        "\\input{literal\\%name.tex}\r\n",
        "\\include{folder/часть.tex}\r\n",
    );
    let references = scan_scientific_resources(SourceView {
        text: source,
        revision: 7,
    })
    .unwrap();
    assert_eq!(references.len(), 3);
    assert_eq!(references[0].path, "данные/a.dat");
    assert_eq!(references[0].line, 2);
    assert_eq!(references[1].path, "literal\\%name.tex");
    assert_eq!(
        references[1].status,
        ScientificResourceStatus::MacroContaining
    );
    assert_eq!(references[1].line, 4);
    assert_eq!(references[2].path, "folder/часть.tex");
    assert_eq!(references[2].line, 5);
    for reference in references {
        assert_eq!(reference.path, source[reference.path_range.clone()]);
        assert_eq!(
            reference.source_sha256,
            Sha256::digest(source.as_bytes()).as_slice()
        );
    }
}

#[test]
fn inline_verb_and_listings_literals_do_not_create_resource_references() {
    let source = concat!(
        r"\verb|\input{verb-only.tex}| ",
        r"\verb*+plot file {verb-only.dat}+ ",
        r"\lstinline[language=TeX]!\include{listing-only.tex}! ",
        r"\lstinline*[language={TeX[plain]}]|\input{also-listing-only.tex}| ",
        r"\input{real.tex}",
    );
    let references = scan_scientific_resources(SourceView {
        text: source,
        revision: 4,
    })
    .unwrap();
    assert_eq!(references.len(), 1);
    assert_eq!(references[0].path, "real.tex");
}

#[test]
fn verbatim_environments_are_bounded_and_mask_fake_tikz_scopes() {
    let source = concat!(
        "\\begin{Verbatim}\r\n",
        "\\begin{tikzpicture}\\draw plot file {fake.dat};\r\n",
        "\\input{fake.tex}\r\n",
        "\\end{tikzpicture}\r\n",
        "\\end{Verbatim}\r\n",
        "\\begin{lstlisting}\r\n",
        "plot file {also-fake.dat} \\end{lstlisting} \\input{midline-fake.tex}\r\n",
        "\\end{lstlisting}\r\n",
        "\\begin{minted}{tex}\r\n",
        "\\include{minted-fake.tex}\r\n",
        "\\end{minted}\r\n",
        "\\input{real.tex}\r\n",
    );
    let references = scan_scientific_resources(SourceView {
        text: source,
        revision: 5,
    })
    .unwrap();
    assert_eq!(references.len(), 1);
    assert_eq!(references[0].path, "real.tex");
    assert_eq!(references[0].line, 12);
    for source in [
        "\\begin{verbatim}\\input{hidden.tex}",
        "\\begin{minted}{tex}no close",
    ] {
        assert_eq!(
            scan_scientific_resources(SourceView {
                text: source,
                revision: 1
            }),
            Err(ScientificResourceScanRefusal::UnbalancedSource)
        );
    }
}

#[test]
fn string_skips_space_and_comments_before_its_token() {
    let source = concat!(
        "\\string  \\input{shown.tex}\r\n",
        "\\string% comment consumed with the next token\r\n",
        "  \\include{also-shown.tex}\r\n",
        "\\input{real.tex}\r\n",
    );
    let references = scan_scientific_resources(SourceView {
        text: source,
        revision: 12,
    })
    .unwrap();
    assert_eq!(references.len(), 1);
    assert_eq!(references[0].path, "real.tex");
    assert_eq!(references[0].line, 4);
}

#[test]
fn plot_file_is_only_reported_from_top_level_active_tikz_path_commands() {
    let source = concat!(
        "plot file {prose.dat}\n",
        "\\caption{plot file {caption.dat}}\n",
        "\\begin{tikzpicture}\n",
        "\\draw node {plot file {node-label.dat} ",
        "\\begin{tikzpicture}\\draw plot file {nested-fake.dat};\\end{tikzpicture}} ",
        "-- plot file {draw.dat};\n",
        "\\path node \"plot file {quoted.dat}\" plot file {path.dat};\n",
        "\\fill plot file {fill.dat};\n",
        "\\clip plot file {clip.dat};\n",
        "\\end{tikzpicture}\n",
    );
    let references = scan_scientific_resources(SourceView {
        text: source,
        revision: 6,
    })
    .unwrap();
    assert_eq!(
        references
            .iter()
            .map(|r| r.path.as_str())
            .collect::<Vec<_>>(),
        ["draw.dat", "path.dat", "fill.dat", "clip.dat"]
    );
    assert!(
        references
            .iter()
            .all(|r| r.kind == ScientificResourceKind::TikzPlotFile)
    );
}

#[test]
fn comment_and_grouped_paths_are_not_mislabelled_as_literal_filenames() {
    let source = concat!(
        "\\input{curve% removed by TeX\n.dat}\n",
        "\\include{{folder}.tex}\n",
        "\\input{plain.tex}\n"
    );
    let references = scan_scientific_resources(SourceView {
        text: source,
        revision: 2,
    })
    .unwrap();
    assert_eq!(references.len(), 3);
    assert_eq!(references[0].path, "curve% removed by TeX\n.dat");
    assert_eq!(
        references[0].status,
        ScientificResourceStatus::MacroContaining
    );
    assert_eq!(references[1].path, "{folder}.tex");
    assert_eq!(
        references[1].status,
        ScientificResourceStatus::MacroContaining
    );
    assert_eq!(references[2].path, "plain.tex");
    assert_eq!(
        references[2].status,
        ScientificResourceStatus::UnresolvedLiteral
    );
}

#[test]
fn definitions_foreach_and_input_arguments_do_not_create_fake_plot_scopes() {
    let source = r#"
\newcommand{\drawdata}{\input{definition-only.tex} \begin{tikzpicture}\draw plot file {hidden.dat};\end{tikzpicture}}
\foreach \x in {1,2} {\include{loop-only.tex} plot file {also-hidden.dat}}
\input{\begin{tikzpicture}\draw plot file {input-path-fake.dat};\end{tikzpicture}}
\begin{tikzpicture}\draw plot file {visible.dat};\end{tikzpicture}
"#;
    let references = scan_scientific_resources(SourceView {
        text: source,
        revision: 3,
    })
    .unwrap();
    assert_eq!(
        references
            .iter()
            .filter(|r| r.kind == ScientificResourceKind::TikzPlotFile)
            .map(|r| r.path.as_str())
            .collect::<Vec<_>>(),
        ["visible.dat"]
    );
    assert_eq!(
        references
            .iter()
            .filter(|r| r.kind == ScientificResourceKind::TexInput)
            .count(),
        1
    );
    assert_eq!(
        references[0].status,
        ScientificResourceStatus::MacroContaining
    );
}

#[test]
fn environment_definitions_string_and_detokenize_are_opaque_but_later_refs_remain() {
    let source = concat!(
        "\\newenvironment{demo}{\\input{begin-only.tex}\\begin{tikzpicture}\\draw plot file {fake.dat};}{\\include{end-only.tex}}\r\n",
        "\\renewenvironment{demo}[1][x]{\\input{renew-only.tex}}{\\input{renew-end-only.tex}}\r\n",
        "\\string\\input{shown-only.tex} \r\n",
        "\\detokenize{\\input{also-shown-only.tex} \\begin{tikzpicture}\\draw plot file {hidden.dat};} \r\n",
        "\\begin{tikzpicture}\\draw plot file {реальный.dat};\\end{tikzpicture}\r\n",
        "\\input{real.tex}\r\n",
    );
    let references = scan_scientific_resources(SourceView {
        text: source,
        revision: 11,
    })
    .unwrap();
    assert_eq!(
        references
            .iter()
            .map(|r| r.path.as_str())
            .collect::<Vec<_>>(),
        ["реальный.dat", "real.tex"]
    );
    assert_eq!(references[0].kind, ScientificResourceKind::TikzPlotFile);
    assert_eq!(references[0].path, source[references[0].path_range.clone()]);
    assert_eq!(references[0].line, 5);
    assert_eq!(references[1].kind, ScientificResourceKind::TexInput);
    assert_eq!(references[1].line, 6);
}

#[test]
fn malformed_references_and_unprovable_inline_literals_fail_closed() {
    for (source, expected) in [
        (
            "\\input{missing-close",
            ScientificResourceScanRefusal::UnbalancedSource,
        ),
        (
            "\\include",
            ScientificResourceScanRefusal::MalformedReference,
        ),
        (
            "\\verb|unterminated",
            ScientificResourceScanRefusal::MalformedReference,
        ),
        (
            "\\lstinline[language=TeX!unterminated",
            ScientificResourceScanRefusal::UnbalancedSource,
        ),
        (
            "\\begin{minted}{tex}unclosed",
            ScientificResourceScanRefusal::UnbalancedSource,
        ),
    ] {
        assert_eq!(
            scan_scientific_resources(SourceView {
                text: source,
                revision: 1
            }),
            Err(expected),
            "{source}"
        );
    }
}

#[test]
fn source_occurrence_and_group_depth_limits_are_bounded() {
    let large = "x".repeat(MAX_SCIENTIFIC_SOURCE_BYTES + 1);
    assert_eq!(
        scan_scientific_resources(SourceView {
            text: &large,
            revision: 1
        }),
        Err(ScientificResourceScanRefusal::SourceTooLarge)
    );
    let many = "\\input{x}\n".repeat(MAX_SCIENTIFIC_RESOURCE_REFERENCES + 1);
    assert_eq!(
        scan_scientific_resources(SourceView {
            text: &many,
            revision: 1
        }),
        Err(ScientificResourceScanRefusal::TooManyReferences)
    );
    let nested = format!("\\input{{{}x{}}}", "{".repeat(64), "}".repeat(64));
    assert_eq!(
        scan_scientific_resources(SourceView {
            text: &nested,
            revision: 1
        }),
        Err(ScientificResourceScanRefusal::UnbalancedSource)
    );
}
