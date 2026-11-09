//! Read-only lexical coverage of all 142 owner-provided TeX sources.
//! No file edits, no XeLaTeX and NO automatic visual recognition/L2 claim.
use std::{collections::BTreeMap, fs, path::PathBuf};
use tikzarium_extensions::scientific_scan::{SourceView, scan_scientific_source};

#[test]
fn original_142_sources_are_scanned_without_mutation_or_fabricated_l2() {
    let base = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../roadmap/Tikzarium_Scientific_142_R4/fixtures");
    let mut corpus = Vec::new();
    let mut families = BTreeMap::new();
    for label in ["AK", "SR"] {
        let dir = base.join(label);
        let mut folders = fs::read_dir(&dir)
            .expect("real owner fixtures")
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        folders.sort_by_key(|entry| entry.file_name());
        for folder in folders {
            if !folder.file_type().unwrap().is_dir() {
                continue;
            }
            let path = folder.path().join("figure.tex");
            if path.is_file() {
                corpus.push((label, folder.file_name().to_string_lossy().to_string(), path));
                *families.entry(label).or_insert(0usize) += 1;
            }
        }
    }
    assert_eq!(corpus.len(), 142, "owner fixture cardinality changed");
    assert_eq!(families.get("AK"), Some(&100));
    assert_eq!(families.get("SR"), Some(&42));
    let mut recognized = 0usize;
    let mut opaque = 0usize;
    let mut lexical_instances = 0usize;
    let mut kinds = BTreeMap::<String, usize>::new();
    let mut passed = Vec::new();
    for (family, id, path) in &corpus {
        let before = fs::read(path).unwrap();
        let source = String::from_utf8(before.clone()).expect("owner corpus is UTF-8");
        match scan_scientific_source(SourceView { text: &source, revision: 0 }) {
            Ok(items) => {
                recognized += 1;
                passed.push(format!("{family}/{id}"));
                lexical_instances += items.len();
                for item in &items {
                    assert!(item.range.start < item.range.end, "{family}/{id}");
                    assert!(source.get(item.range.clone()).is_some(), "{family}/{id}");
                    if let Some(opt) = &item.option_range {
                        assert!(source.get(opt.clone()).is_some(), "{family}/{id}");
                        assert!(opt.start >= item.range.start && opt.end <= item.range.end);
                    }
                    *kinds.entry(format!("{:?}", item.kind)).or_default() += 1;
                }
            }
            Err(reason) => {
                opaque += 1;
                // Refusal is an honest coverage gap, never a synthesized PASS.
                println!("SC3_OPAQUE,{family},{id},{}", reason.to_string().replace(',', ";"));
            }
        }
        assert_eq!(fs::read(path).unwrap(), before, "{family}/{id} was modified");
    }
    for id in ["SR/SV-001", "SR/SV-003", "SR/SV-009"] {
        assert!(passed.iter().any(|found| found == id), "reviewed sample {id} refused");
    }
    assert_eq!(recognized + opaque, 142);
    println!(
        "SC3_READONLY_LEXICAL_AUDIT,originals=142,scan_ok={recognized},opaque={opaque},lexical_instances={lexical_instances},L2=NOT_RUN,L3=NOT_RUN"
    );
    for (kind, count) in kinds {
        println!("SC3_RECOGNIZED_KIND,{kind},{count}");
    }
}
