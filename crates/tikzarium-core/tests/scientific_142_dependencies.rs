//! Scientific-142 SC1: test the *real* checked-in AK source/dependency bytes.
//! No TeX engine, GUI, rasterizer, installation or corpus mutation is involved.
use std::{fs, path::PathBuf};
use tikzarium_core::{ProjectDependencySnapshot, ProjectInputOrigin};

fn corpus_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../roadmap/Tikzarium_Scientific_142_R4/fixtures/AK")
}

#[test]
fn scientific_ak_five_real_figures_have_traceable_dependency_sha256() {
    let root = corpus_root();
    let cases: [(&str, &str, &[&str]); 5] = [
        (
            "F6_4",
            "bbb44f4d9a9a1d94ab6829dfe783b3f60fd63c709cabcb51b5f9c62333e90f33",
            &["optics-common.tex"],
        ),
        (
            "F6_5",
            "d6beb75c26e1ed17a9630b78c3e3c81463c9bc55c38454572fbec8235670887c",
            &["optics-common.tex"],
        ),
        (
            "F14_3",
            "ec3b7bafb9f36c690c2e86bcd22c665f5c669e1f5d990ee310987f24b6f2880c",
            &[
                "../data/F14_3_left.dat",
                "../data/F14_3_middle.dat",
                "../data/F14_3_right.dat",
                "../data/F20_1_heat.dat",
            ],
        ),
        (
            "F15_1",
            "da9374c750a2ec82cf3451a16a5852125f5472d88d8444e32fd69a08cc27b308",
            &[
                "../data/F15_1_U1.dat",
                "../data/F15_1_U2.dat",
                "../data/F15_1_U3.dat",
                "../data/F15_1_U4.dat",
                "../data/F20_1_heat.dat",
            ],
        ),
        (
            "F21_2",
            "1400e8d483d5c925b2a2ffe544fc7e199bf96899c2891b57490b927b635704d5",
            &[
                "../data/F20_1_heat.dat",
                "../data/F21_2_0_abs.dat",
                "../data/F21_2_0_disp.dat",
                "../data/F21_2_1_abs.dat",
                "../data/F21_2_1_disp.dat",
                "../data/F21_2_ref_abs.dat",
                "../data/F21_2_ref_disp.dat",
            ],
        ),
    ];
    for (name, expected_source_sha, dependencies) in cases {
        let source = root.join(name).join("figure.tex");
        let source_before = fs::read(&source).expect("real fixture source");
        let inputs = dependencies
            .iter()
            .map(|name| source.parent().unwrap().join(name))
            .collect::<Vec<_>>();
        let snapshot = ProjectDependencySnapshot::capture(&root, &source, &inputs, true)
            .expect("snapshot real fixture");
        assert!(
            snapshot.is_project_fresh(),
            "{name}: tracked files are intact"
        );
        assert!(
            snapshot.ignored_external_paths().is_empty(),
            "{name}: local data escaped"
        );
        let records = snapshot.project_input_records();
        assert_eq!(records.len(), dependencies.len() + 1, "{name}");
        assert_eq!(records[0].origin, ProjectInputOrigin::AuthorSource);
        assert_eq!(records[0].sha256.as_deref(), Some(expected_source_sha));
        for (index, (record, dependency)) in records.iter().skip(1).zip(dependencies).enumerate() {
            assert_eq!(
                record.origin,
                ProjectInputOrigin::FlsInput,
                "{name} dep {index}"
            );
            assert!(
                record.recorded_path.ends_with(dependency),
                "{name}: original spelling lost: {}",
                record.recorded_path.display()
            );
            assert!(
                record.resolved_path.is_file(),
                "{name}: file missing: {}",
                record.resolved_path.display()
            );
            assert_eq!(record.sha256.as_ref().map(String::len), Some(64));
            assert!(record.bytes_current, "{name}: digest invalidated");
        }
        assert_eq!(
            fs::read(&source).unwrap(),
            source_before,
            "{name}: source mutated"
        );
    }
}

#[test]
fn scientific_dat_delete_and_same_length_edit_invalidate_without_touching_tex() {
    let root = corpus_root();
    let original_source = root.join("F14_3/figure.tex");
    let original_dat = root.join("data/F14_3_left.dat");
    let scratch = tempfile::tempdir().unwrap();
    let figure = scratch.path().join("F14_3");
    let data = scratch.path().join("data");
    fs::create_dir_all(&figure).unwrap();
    fs::create_dir_all(&data).unwrap();
    let source = figure.join("figure.tex");
    let local_dat = data.join("F14_3_left.dat");
    fs::copy(&original_source, &source).unwrap();
    fs::copy(&original_dat, &local_dat).unwrap();
    let source_before = fs::read(&source).unwrap();
    let dependency = figure.join("../data/F14_3_left.dat");
    let snap =
        ProjectDependencySnapshot::capture(scratch.path(), &source, &[dependency], true).unwrap();
    assert!(snap.is_project_fresh());
    let digest = snap.project_input_records()[1].sha256.clone();

    let mut altered = fs::read(&local_dat).unwrap();
    assert!(!altered.is_empty());
    altered[0] ^= 1;
    fs::write(&local_dat, altered).unwrap();
    assert!(
        !snap.is_project_fresh(),
        "same-length data change was missed"
    );
    assert!(!snap.project_input_records()[1].bytes_current);
    assert_eq!(
        snap.project_input_records()[1].sha256,
        digest,
        "record must not rewrite history"
    );

    fs::remove_file(&local_dat).unwrap();
    assert!(!snap.is_project_fresh(), "missing data was accepted");
    assert!(!snap.project_input_records()[1].bytes_current);
    assert_eq!(
        fs::read(&source).unwrap(),
        source_before,
        "source changed on failed data lookup"
    );
}
