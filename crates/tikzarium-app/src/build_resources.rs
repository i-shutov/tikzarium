//! Captured, project-local input hashes for one completed build.
//! Rechecking is explicit; drawing this view performs no filesystem IO.

use eframe::egui;
use std::path::{Path, PathBuf};
use tikzarium_core::{ProjectDependencySnapshot, ProjectInputOrigin, ProjectInputRecord};

#[derive(Default)]
pub struct BuildResources {
    snapshot: Option<ProjectDependencySnapshot>,
    captured_records: Vec<ProjectInputRecord>,
    unverified_external: Vec<PathBuf>,
    current: bool,
    report: String,
}

impl BuildResources {
    pub fn capture(
        &mut self,
        snapshot: ProjectDependencySnapshot,
        source_path: Option<&Path>,
        source: &str,
    ) {
        self.snapshot = Some(snapshot);
        self.current = false;
        self.captured_records.clear();
        self.unverified_external.clear();
        self.report.clear();
        let _ = self.recheck(source_path, source);
    }

    /// Explicitly hash current project-local inputs and compare the open source
    /// bytes with the author source recorded at build time.
    pub fn recheck(&mut self, source_path: Option<&Path>, source: &str) -> bool {
        let Some(snapshot) = self.snapshot.as_ref() else {
            self.captured_records.clear();
            self.unverified_external.clear();
            self.current = false;
            self.report = "Нет снимка входных файлов для текущей сборки.".into();
            return false;
        };
        let records = snapshot.project_input_records();
        let external = snapshot.ignored_external_paths().to_vec();
        let Some(source_path) = source_path else {
            self.captured_records = records;
            self.unverified_external = external;
            self.current = false;
            self.report = "Не удалось проверить исходный файл: путь проекта отсутствует.".into();
            return false;
        };
        let recorder_complete = snapshot.recorder_complete();
        let build_inputs_verified = snapshot.build_inputs_verified();
        let source_matches = snapshot.matches_author_source_bytes(source_path, source.as_bytes());
        let project_fresh = snapshot.is_project_fresh();
        self.current =
            recorder_complete && build_inputs_verified && source_matches && project_fresh;
        self.captured_records = records;
        self.unverified_external = external;
        self.report = if self.current {
            "Локальные входные файлы совпали до и после сборки и остаются актуальными.".into()
        } else if !recorder_complete {
            "Снимок неполон: список входных файлов TeX не подтверждён.".into()
        } else if !build_inputs_verified {
            "Входные файлы до и после сборки не подтверждены. Проверьте папку проекта и соберите PDF заново.".into()
        } else if !source_matches {
            "Открытый исходник или файл проекта изменился после сборки.".into()
        } else {
            "Локальные входные файлы изменились или недоступны.".into()
        };
        self.current
    }

    #[must_use]
    pub fn is_current(&self) -> bool {
        self.current
    }

    #[must_use]
    pub fn report(&self) -> &str {
        &self.report
    }

    pub fn verification_details(&self) -> String {
        self.snapshot
            .as_ref()
            .map(|snapshot| format!("{:?}", snapshot.build_input_verification()))
            .unwrap_or_else(|| "No build input snapshot".into())
    }

    pub fn show(&self, ui: &mut egui::Ui) {
        egui::CollapsingHeader::new("Входные файлы сборки")
            .default_open(false)
            .show(ui, |ui| {
                if self.report.is_empty() {
                    ui.label("Снимок входных файлов появится после сборки.");
                } else {
                    ui.label(&self.report);
                }
                ui.small(
                    "Проверено при сборке/последней проверке; перед экспортом проверяется заново.",
                );
                if let Some(snapshot) = &self.snapshot {
                    ui.small(format!("Папка проекта: {}", snapshot.root().display()));
                    if !snapshot.build_inputs_verified() {
                        ui.collapsing(
                            "Подробности проверки файлов",
                            |ui| {
                                ui.small(self.verification_details());
                            },
                        );
                    }
                }
                for record in &self.captured_records {
                    let origin = match record.origin {
                        ProjectInputOrigin::AuthorSource => "Исходник",
                        ProjectInputOrigin::FlsInput => "Вход проекта (.fls)",
                    };
                    ui.small(format!(
                        "{origin}: {}\n→ {}\nSHA-256: {}\nБайты: {}",
                        record.recorded_path.display(),
                        record.resolved_path.display(),
                        record.sha256.as_deref().unwrap_or("не проверен"),
                        if record.bytes_current {
                            "совпадают"
                        } else {
                            "изменены / недоступны"
                        },
                    ));
                }
                if !self.captured_records.is_empty() {
                    ui.separator();
                }
                if self.unverified_external.is_empty() {
                    ui.small("Внешние входы TeX: отсутствуют в снимке.");
                } else {
                    ui.small("Внешние входы TeX (вне проекта) не проверялись:");
                    for path in &self.unverified_external {
                        ui.small(format!("НЕ ПРОВЕРЕНО: {}", path.display()));
                    }
                }
            });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tikzarium_core::ProjectBuildBaseline;

    fn fixture(root: &Path, complete: bool) -> (PathBuf, PathBuf, ProjectDependencySnapshot) {
        let source = root.join("figure.tex");
        let data = root.join("curve.dat");
        fs::write(&source, "source").unwrap();
        fs::write(&data, b"abc\n").unwrap();
        let baseline = ProjectBuildBaseline::capture(root).unwrap();
        let mut snapshot = ProjectDependencySnapshot::capture(
            root,
            &source,
            std::slice::from_ref(&data),
            complete,
        )
        .unwrap();
        baseline.validate_and_mark(&mut snapshot);
        (source, data, snapshot)
    }

    #[test]
    fn matching_snapshot_reports_author_and_project_data_hashes() {
        let dir = tempfile::tempdir().unwrap();
        let (source, data, snapshot) = fixture(dir.path(), true);
        let mut resources = BuildResources::default();
        resources.capture(snapshot, Some(&source), "source");
        assert!(resources.is_current());
        assert_eq!(resources.captured_records.len(), 2);
        assert_eq!(
            resources.captured_records[1].origin,
            ProjectInputOrigin::FlsInput
        );
        assert_eq!(resources.captured_records[1].recorded_path, data);
        assert_eq!(
            resources.captured_records[1]
                .sha256
                .as_ref()
                .map(String::len),
            Some(64)
        );
    }

    #[test]
    fn explicit_recheck_invalidates_same_length_edit_or_missing_input() {
        let dir = tempfile::tempdir().unwrap();
        let (source, data, snapshot) = fixture(dir.path(), true);
        let mut resources = BuildResources::default();
        resources.capture(snapshot, Some(&source), "source");
        assert!(resources.is_current());
        fs::write(&data, b"xyz\n").unwrap();
        assert!(resources.is_current(), "cached state must do no frame IO");
        assert!(!resources.recheck(Some(&source), "source"));
        assert!(!resources.captured_records[1].bytes_current);
        fs::remove_file(&data).unwrap();
        assert!(!resources.recheck(Some(&source), "source"));
    }

    #[test]
    fn mismatched_memory_source_missing_snapshot_path_and_incomplete_fls_fail_closed() {
        let dir = tempfile::tempdir().unwrap();
        let (source, _, snapshot) = fixture(dir.path(), true);
        let mut resources = BuildResources::default();
        resources.capture(snapshot, Some(&source), "different");
        assert!(!resources.is_current());
        assert!(!resources.recheck(None, "source"));
        let incomplete =
            ProjectDependencySnapshot::capture(dir.path(), &source, &[], false).unwrap();
        resources.capture(incomplete, Some(&source), "source");
        assert!(!resources.is_current());
        let mut empty = BuildResources::default();
        assert!(!empty.recheck(Some(&source), "source"));
    }

    #[test]
    fn external_inputs_are_explicitly_unverified_and_not_local_hash_rows() {
        let project = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let source = project.path().join("figure.tex");
        let class = outside.path().join("article.cls");
        fs::write(&source, "source").unwrap();
        fs::write(&class, b"class").unwrap();
        let baseline = ProjectBuildBaseline::capture(project.path()).unwrap();
        let mut snapshot = ProjectDependencySnapshot::capture(
            project.path(),
            &source,
            std::slice::from_ref(&class),
            true,
        )
        .unwrap();
        baseline.validate_and_mark(&mut snapshot);
        let mut resources = BuildResources::default();
        resources.capture(snapshot, Some(&source), "source");
        assert!(resources.is_current());
        assert_eq!(resources.captured_records.len(), 1);
        // External entries are resolved paths. macOS /var and /private/var
        // can spell the same temporary file without being byte-equal paths.
        assert!(
            resources
                .unverified_external
                .contains(&class.canonicalize().unwrap())
        );
    }

    #[test]
    fn post_build_bytes_alone_do_not_authorize_export_or_become_verified_on_recheck() {
        let project = tempfile::tempdir().unwrap();
        let source = project.path().join("figure.tex");
        let data = project.path().join("curve.dat");
        fs::write(&source, "source").unwrap();
        fs::write(&data, b"abc\n").unwrap();
        let baseline = ProjectBuildBaseline::capture(project.path()).unwrap();
        // The engine has read abc. Before its result is collected, another
        // process saves xyz with the same length: a post-only hash looks fresh.
        fs::write(&data, b"xyz\n").unwrap();
        let mut snapshot = ProjectDependencySnapshot::capture(
            project.path(),
            &source,
            std::slice::from_ref(&data),
            true,
        )
        .unwrap();
        assert!(snapshot.is_project_fresh());
        baseline.validate_and_mark(&mut snapshot);
        assert!(!snapshot.build_inputs_verified());
        let mut resources = BuildResources::default();
        resources.capture(snapshot, Some(&source), "source");
        assert!(!resources.is_current());
        assert!(!resources.recheck(Some(&source), "source"));
        assert!(resources.report().contains("до и после"));

        let legacy =
            ProjectDependencySnapshot::capture(project.path(), &source, &[data], true).unwrap();
        assert!(legacy.is_project_fresh());
        resources.capture(legacy, Some(&source), "source");
        assert!(
            !resources.is_current(),
            "a post-only snapshot has no build proof"
        );
    }

    #[test]
    fn selected_common_root_verifies_parent_data_on_first_build() {
        let project = tempfile::tempdir().unwrap();
        let figures = project.path().join("figures");
        let data_dir = project.path().join("data");
        fs::create_dir(&figures).unwrap();
        fs::create_dir(&data_dir).unwrap();
        let source = figures.join("figure.tex");
        let bytes = "\\def\\datadir{../data}\r\n";
        fs::write(&source, bytes).unwrap();
        fs::write(data_dir.join("curve.dat"), b"0 1\n").unwrap();
        let baseline = ProjectBuildBaseline::capture(project.path()).unwrap();
        let mut snapshot = ProjectDependencySnapshot::capture(
            project.path(),
            &source,
            &[figures.join("../data/curve.dat")],
            true,
        )
        .unwrap();
        baseline.validate_and_mark(&mut snapshot);
        let mut resources = BuildResources::default();
        resources.capture(snapshot, Some(&source), bytes);
        assert!(resources.is_current());
        assert_eq!(resources.captured_records.len(), 2);
        assert!(resources.unverified_external.is_empty());
        assert_eq!(fs::read_to_string(source).unwrap(), bytes);
    }
}
