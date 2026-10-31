//! Content-based freshness snapshots for `.fls` project inputs.
//! This is an opt-in project-scope check, NOT a global TeX cache validator.
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    ffi::OsString,
    fs::{self, File},
    io::{self, Read},
    path::{Path, PathBuf},
};

/// Per-input cap avoids unbounded hashing of huge included resources on the UI thread.
/// Above this size, the path is deliberately *unverifiable*, never reported as fresh.
pub const MAX_TRACKED_FILE_BYTES: u64 = 64 * 1024 * 1024;

#[derive(Debug, Clone)]
struct ProjectInput {
    /// Resolved target at capture time (retained for the existing public paths API).
    path: PathBuf,
    /// Original recorded spelling must survive to catch symlink retargeting.
    recorded_path: PathBuf,
    digest: Option<[u8; 32]>,
}

/// A read-only snapshot of inputs inside a selected project root.
///
/// Local author sources are hashed; a source resolving outside `root`
/// (including a symlink escape) fails closed. External TeX installation
/// dependencies are listed but not checked. Missing, unreadable and oversized
/// local inputs also invalidate the snapshot.
#[derive(Debug, Clone)]
pub struct ProjectDependencySnapshot {
    root: PathBuf,
    project_inputs: Vec<ProjectInput>,
    ignored_external: Vec<PathBuf>,
    recorder_complete: bool,
    /// An external/symlinked-away author source cannot certify freshness.
    source_is_project_local: bool,
    /// A project-spelled .fls input resolving outside root is unverifiable.
    escaped_project_input: bool,
}

impl ProjectDependencySnapshot {
    /// The author source is mandatory even if the recorder omits it. If it
    /// resolves outside root, freshness fails closed rather than silently
    /// ignoring the source. Recorder spelling is retained for filesystem-aware
    /// checks, while equivalent path components are deduplicated.
    pub fn capture(
        root: &Path,
        source: &Path,
        dependencies: &[PathBuf],
        recorder_complete: bool,
    ) -> io::Result<Self> {
        // Keep the caller's root spelling for relative INPUTs. On macOS,
        // /var and /private/var may name the same directory; mixing the
        // original source spelling with a canonical root created duplicates.
        let root_spelling = if root.is_absolute() {
            root.to_path_buf()
        } else {
            std::env::current_dir()?.join(root)
        };
        let root = root.canonicalize()?;
        let mut seen = HashSet::new();
        let mut project_inputs = Vec::new();
        let mut ignored_external = Vec::new();
        let mut source_is_project_local = false;
        let mut escaped_project_input = false;

        for (index, input) in std::iter::once(source)
            .chain(dependencies.iter().map(PathBuf::as_path))
            .enumerate()
        {
            let absolute = if input.is_absolute() {
                input.to_path_buf()
            } else {
                root_spelling.join(input)
            };
            // Preserve filesystem traversal: link/../file may resolve outside
            // this project after following a directory symlink.
            let recorded_path = absolute;
            let resolved = canonicalize_existing_prefix(&recorded_path);
            let is_local = resolved.starts_with(&root);
            if !is_local
                && (recorded_path.starts_with(&root_spelling) || recorded_path.starts_with(&root))
            {
                escaped_project_input = true;
            }
            if index == 0 {
                source_is_project_local = is_local;
            }
            if !seen.insert(recorded_path.clone()) {
                continue;
            }
            if is_local {
                project_inputs.push(ProjectInput {
                    digest: file_digest(&recorded_path).ok().flatten(),
                    path: resolved,
                    recorded_path,
                });
            } else {
                ignored_external.push(resolved);
            }
        }
        Ok(Self {
            root,
            project_inputs,
            ignored_external,
            recorder_complete,
            source_is_project_local,
            escaped_project_input,
        })
    }

    /// False when the runner could not read a usable .fls INPUT record.
    /// An incomplete recorder never certifies a fresh project.
    #[must_use]
    pub fn recorder_complete(&self) -> bool {
        self.recorder_complete
    }

    #[must_use]
    pub fn root(&self) -> &Path {
        &self.root
    }

    /// Inputs outside the project root (including TeX installation files)
    /// were NOT checked. Do not treat `is_project_fresh` as global freshness.
    #[must_use]
    pub fn ignored_external_paths(&self) -> &[PathBuf] {
        &self.ignored_external
    }

    #[must_use]
    pub fn tracked_project_paths(&self) -> Vec<&Path> {
        self.project_inputs
            .iter()
            .map(|item| item.path.as_path())
            .collect()
    }

    /// Paths whose bytes changed, disappeared, became unreadable, or could
    /// not be fingerprinted at capture time (e.g. over the size cap).
    /// Content hashing detects same-length edits with unchanged timestamps.
    #[must_use]
    pub fn invalidated_project_paths(&self) -> Vec<PathBuf> {
        self.project_inputs
            .iter()
            .filter(|item| {
                item.digest.is_none()
                    || canonicalize_existing_prefix(&item.recorded_path) != item.path
                    || file_digest(&item.recorded_path).ok().flatten() != item.digest
            })
            .map(|item| item.path.clone())
            .collect()
    }

    /// Project-only freshness requires the author source inside root.
    /// External dependencies are not tracked; inspect ignored_external_paths.
    #[must_use]
    pub fn is_project_fresh(&self) -> bool {
        self.recorder_complete
            && self.source_is_project_local
            && !self.escaped_project_input
            && self.invalidated_project_paths().is_empty()
    }
}

/// Canonicalize the nearest existing parent when the leaf has disappeared.
/// Do not lexically simplify "..": a directory symlink changes its meaning.
/// For a missing leaf, resolve the real existing prefix before appending the
/// unresolved suffix. This also handles macOS /var -> /private/var aliases.
fn canonicalize_existing_prefix(path: &Path) -> PathBuf {
    let mut ancestor = path;
    let mut missing_components: Vec<OsString> = Vec::new();
    loop {
        if let Ok(mut existing) = ancestor.canonicalize() {
            for component in missing_components.iter().rev() {
                existing.push(component);
            }
            return existing;
        }
        let Some(name) = ancestor.file_name() else {
            return path.to_path_buf();
        };
        missing_components.push(name.to_os_string());
        let Some(parent) = ancestor.parent() else {
            return path.to_path_buf();
        };
        ancestor = parent;
    }
}

/// Return None for an oversized or non-regular file, and Err for an I/O error.
/// Both outcomes are conservatively treated as an unverified input by callers.
fn file_digest(path: &Path) -> io::Result<Option<[u8; 32]>> {
    let mut file = File::open(path)?;
    let before = file.metadata()?;
    if !before.is_file() || before.len() > MAX_TRACKED_FILE_BYTES {
        return Ok(None);
    }
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 16 * 1024];
    let mut read_total = 0_u64;
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        read_total += read as u64;
        if read_total > MAX_TRACKED_FILE_BYTES {
            return Ok(None);
        }
        hasher.update(&buffer[..read]);
    }
    let after = fs::metadata(path)?;
    if read_total != before.len() || after.len() != before.len() {
        return Ok(None);
    }
    Ok(Some(hasher.finalize().into()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn detects_same_size_include_edits_without_touching_source() {
        let project = tempfile::tempdir().unwrap();
        let source = project.path().join("рисунок.tex");
        let asset = project.path().join("shape.dat");
        fs::write(&source, b"% original\r\n").unwrap();
        fs::write(&asset, b"abcdef").unwrap();
        let before_source = fs::read(&source).unwrap();

        let inputs = std::slice::from_ref(&asset);
        let snapshot =
            ProjectDependencySnapshot::capture(project.path(), &source, inputs, true).unwrap();
        assert!(snapshot.is_project_fresh());
        assert_eq!(snapshot.tracked_project_paths().len(), 2);

        fs::write(&asset, b"abcXef").unwrap();
        assert_eq!(
            snapshot.invalidated_project_paths(),
            vec![asset.canonicalize().unwrap()]
        );
        assert!(!snapshot.is_project_fresh());
        assert_eq!(fs::read(source).unwrap(), before_source);
    }

    #[test]
    fn missing_input_and_deleted_source_fail_closed() {
        let project = tempfile::tempdir().unwrap();
        let source = project.path().join("main.tex");
        let absent = project.path().join("missing.tex");
        fs::write(&source, "original").unwrap();

        let inputs = std::slice::from_ref(&absent);
        let snapshot =
            ProjectDependencySnapshot::capture(project.path(), &source, inputs, true).unwrap();
        assert!(!snapshot.is_project_fresh());
        assert_eq!(
            snapshot.invalidated_project_paths(),
            vec![project.path().canonicalize().unwrap().join("missing.tex")]
        );

        let plain = ProjectDependencySnapshot::capture(project.path(), &source, &[], true).unwrap();
        let canonical_source = source.canonicalize().unwrap();
        fs::remove_file(&source).unwrap();
        assert_eq!(plain.invalidated_project_paths(), vec![canonical_source]);
    }

    #[test]
    fn external_paths_are_reported_but_not_claimed_checked() {
        let project = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let source = project.path().join("main.tex");
        let external = other.path().join("outside.sty");
        fs::write(&source, "source").unwrap();
        fs::write(&external, "external").unwrap();
        let inputs = std::slice::from_ref(&external);
        let snapshot =
            ProjectDependencySnapshot::capture(project.path(), &source, inputs, true).unwrap();
        assert!(snapshot.is_project_fresh());
        assert_eq!(
            snapshot.ignored_external_paths(),
            &[external.canonicalize().unwrap()]
        );
        assert_eq!(snapshot.tracked_project_paths().len(), 1);
    }

    #[test]
    fn huge_sparse_input_is_not_misreported_fresh() {
        let project = tempfile::tempdir().unwrap();
        let source = project.path().join("main.tex");
        let big = project.path().join("big.bin");
        fs::write(&source, "hello").unwrap();
        let mut file = File::create(&big).unwrap();
        file.set_len(MAX_TRACKED_FILE_BYTES + 1).unwrap();
        file.flush().unwrap();

        let inputs = std::slice::from_ref(&big);
        let snapshot =
            ProjectDependencySnapshot::capture(project.path(), &source, inputs, true).unwrap();
        assert_eq!(
            snapshot.invalidated_project_paths(),
            vec![big.canonicalize().unwrap()]
        );
        assert!(!snapshot.is_project_fresh());
    }

    #[test]
    fn same_input_and_relative_components_deduplicate() {
        let project = tempfile::tempdir().unwrap();
        let source = project.path().join("main.tex");
        fs::write(&source, "hello").unwrap();
        let snapshot = ProjectDependencySnapshot::capture(
            project.path(),
            &source,
            &[PathBuf::from("./main.tex"), source.clone()],
            true,
        )
        .unwrap();
        assert_eq!(snapshot.tracked_project_paths().len(), 1);
        assert!(snapshot.is_project_fresh());
    }

    #[cfg(unix)]
    #[test]
    fn retargeted_project_symlink_invalidates_even_when_previous_target_is_unchanged() {
        use std::os::unix::fs::symlink;
        let project = tempfile::tempdir().unwrap();
        let source = project.path().join("рисунок.tex");
        let first = project.path().join("first.tex");
        let second = project.path().join("second.tex");
        let link = project.path().join("asset.tex");
        let original = b"% user source\r\n\\unknownmacro{opaque}\r\n";
        fs::write(&source, original).unwrap();
        fs::write(&first, b"AAA").unwrap();
        fs::write(&second, b"BBB").unwrap();
        symlink(&first, &link).unwrap();

        let snapshot = ProjectDependencySnapshot::capture(
            project.path(),
            &source,
            std::slice::from_ref(&link),
            true,
        )
        .unwrap();
        assert!(snapshot.is_project_fresh());
        fs::remove_file(&link).unwrap();
        symlink(&second, &link).unwrap();

        assert_eq!(
            snapshot.invalidated_project_paths(),
            vec![first.canonicalize().unwrap()]
        );
        assert!(!snapshot.is_project_fresh());
        assert_eq!(fs::read(&first).unwrap(), b"AAA");
        assert_eq!(fs::read(&source).unwrap(), original);
    }

    #[cfg(unix)]
    #[test]
    fn symlink_target_outside_project_is_explicitly_untracked() {
        use std::os::unix::fs::symlink;
        let project = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let source = project.path().join("main.tex");
        let target = other.path().join("foreign.dat");
        let link = project.path().join("asset.dat");
        fs::write(&source, "hello").unwrap();
        fs::write(&target, "foreign").unwrap();
        symlink(&target, &link).unwrap();
        let snapshot =
            ProjectDependencySnapshot::capture(project.path(), &source, &[link], true).unwrap();
        assert_eq!(
            snapshot.ignored_external_paths(),
            &[target.canonicalize().unwrap()]
        );
        assert!(!snapshot.is_project_fresh());
    }
}

#[cfg(test)]
mod recorder_completeness_regression {
    use super::*;

    #[test]
    fn missing_recorder_cannot_certify_unchanged_source_as_fresh() {
        let project = tempfile::tempdir().unwrap();
        let source = project.path().join("main.tex");
        fs::write(&source, "valid TeX").unwrap();
        let snapshot =
            ProjectDependencySnapshot::capture(project.path(), &source, &[], false).unwrap();
        assert!(!snapshot.recorder_complete());
        assert!(!snapshot.is_project_fresh());
        assert!(snapshot.invalidated_project_paths().is_empty());
    }
}

#[cfg(all(test, unix))]
mod missing_symlink_root_regression {
    use super::*;
    use std::os::unix::fs::symlink;

    #[test]
    fn missing_local_input_under_symlinked_root_remains_local() {
        let actual = tempfile::tempdir().unwrap();
        let alias_owner = tempfile::tempdir().unwrap();
        let alias = alias_owner.path().join("project-link");
        symlink(actual.path(), &alias).unwrap();
        let source = alias.join("main.tex");
        fs::write(&source, "valid").unwrap();
        let missing = alias.join("nested").join("absent.tex");

        let snapshot =
            ProjectDependencySnapshot::capture(&alias, &source, &[missing], true).unwrap();
        assert!(!snapshot.is_project_fresh());
        assert!(snapshot.ignored_external_paths().is_empty());
        assert_eq!(
            snapshot.invalidated_project_paths(),
            vec![
                actual
                    .path()
                    .canonicalize()
                    .unwrap()
                    .join("nested/absent.tex")
            ]
        );
    }
}

#[cfg(test)]
mod source_boundary_regression {
    use super::*;

    #[test]
    fn external_author_source_never_certifies_freshness() {
        let project = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let source = outside.path().join("рисунок с пробелом.tex");
        let original = b"% preserve CRLF\r\n\\unknownmacro{value}\r\n";
        fs::write(&source, original).unwrap();
        let snapshot =
            ProjectDependencySnapshot::capture(project.path(), &source, &[], true).unwrap();
        assert!(snapshot.recorder_complete());
        assert!(!snapshot.is_project_fresh());
        assert!(snapshot.tracked_project_paths().is_empty());
        assert_eq!(
            snapshot.ignored_external_paths(),
            &[source.canonicalize().unwrap()]
        );
        assert_eq!(fs::read(source).unwrap(), original);
    }

    #[cfg(unix)]
    #[test]
    fn symlinked_author_source_escaping_root_is_never_fresh() {
        use std::os::unix::fs::symlink;
        let project = tempfile::tempdir().unwrap();
        let external = tempfile::tempdir().unwrap();
        let real_source = external.path().join("original.tex");
        fs::write(&real_source, b"% original\r\n").unwrap();
        let symlink_source = project.path().join("main.tex");
        symlink(&real_source, &symlink_source).unwrap();
        let snapshot =
            ProjectDependencySnapshot::capture(project.path(), &symlink_source, &[], true).unwrap();
        assert!(!snapshot.is_project_fresh());
        assert_eq!(
            snapshot.ignored_external_paths(),
            &[real_source.canonicalize().unwrap()]
        );
        fs::write(&real_source, b"% changed!\r\n").unwrap();
        assert!(!snapshot.is_project_fresh());
        assert_eq!(fs::read(&symlink_source).unwrap(), b"% changed!\r\n");
    }
}

#[cfg(all(test, unix))]
mod root_alias_dedup_regression {
    use super::*;
    use std::os::unix::fs::symlink;

    #[test]
    fn relative_recorder_input_and_absolute_source_share_root_alias_spelling() {
        let project = tempfile::tempdir().unwrap();
        let owner = tempfile::tempdir().unwrap();
        let alias = owner.path().join("project-link");
        symlink(project.path(), &alias).unwrap();
        let source = alias.join("main.tex");
        let original = b"% opaque user macro\r\n";
        fs::write(&source, original).unwrap();

        let snapshot = ProjectDependencySnapshot::capture(
            &alias,
            &source,
            &[PathBuf::from("./main.tex")],
            true,
        )
        .unwrap();
        assert_eq!(snapshot.tracked_project_paths().len(), 1);
        assert!(snapshot.is_project_fresh());
        assert_eq!(fs::read(&source).unwrap(), original);
    }
}

#[cfg(all(test, unix))]
mod symlinked_parent_component_regression {
    use super::*;
    use std::os::unix::fs::symlink;

    #[test]
    fn parent_after_symlink_hashes_the_real_local_target() {
        let project = tempfile::tempdir().unwrap();
        let nested = project.path().join("alternate/deep");
        fs::create_dir_all(&nested).unwrap();
        let local = project.path().join("data.tex");
        let real = project.path().join("alternate/data.tex");
        let link = project.path().join("link");
        let source = project.path().join("рисунок.tex");
        let original = b"% keep CRLF\r\n\\unknownmacro{opaque}\r\n";
        fs::write(&source, original).unwrap();
        fs::write(&local, b"LOCAL").unwrap();
        fs::write(&real, b"FIRST").unwrap();
        symlink(&nested, &link).unwrap();

        let input = link.join("../data.tex");
        assert_eq!(fs::read(&input).unwrap(), b"FIRST");
        let snapshot = ProjectDependencySnapshot::capture(
            project.path(),
            &source,
            std::slice::from_ref(&input),
            true,
        )
        .unwrap();
        assert!(snapshot.is_project_fresh());
        assert_eq!(snapshot.tracked_project_paths().len(), 2);
        let real = real.canonicalize().unwrap();
        assert!(snapshot.tracked_project_paths().contains(&real.as_path()));

        fs::write(&real, b"OTHER").unwrap();
        assert_eq!(snapshot.invalidated_project_paths(), vec![real]);
        assert!(!snapshot.is_project_fresh());
        assert_eq!(fs::read(local).unwrap(), b"LOCAL");
        assert_eq!(fs::read(source).unwrap(), original);
    }

    #[test]
    fn symlinked_ancestor_then_parent_is_not_falsely_fresh() {
        let project = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        fs::create_dir_all(outside.path().join("subdir")).unwrap();
        let source = project.path().join("рисунок с пробелом.tex");
        let original = b"% keep CRLF\r\n\\unknownmacro{opaque}\r\n";
        fs::write(&source, original).unwrap();
        fs::write(project.path().join("data.tex"), b"LOCAL").unwrap();
        let foreign = outside.path().join("data.tex");
        fs::write(&foreign, b"EXTERNAL").unwrap();
        let link = project.path().join("link");
        symlink(outside.path().join("subdir"), &link).unwrap();
        let input = link.join("../data.tex");
        assert_eq!(fs::read(&input).unwrap(), b"EXTERNAL");

        let snapshot = ProjectDependencySnapshot::capture(
            project.path(),
            &source,
            std::slice::from_ref(&input),
            true,
        )
        .unwrap();
        assert!(snapshot.recorder_complete());
        assert!(!snapshot.is_project_fresh());
        assert_eq!(snapshot.tracked_project_paths().len(), 1);
        assert_eq!(
            snapshot.ignored_external_paths(),
            &[foreign.canonicalize().unwrap()]
        );

        fs::write(&foreign, b"CHANGED!").unwrap();
        assert!(!snapshot.is_project_fresh());
        assert_eq!(fs::read(project.path().join("data.tex")).unwrap(), b"LOCAL");
        assert_eq!(fs::read(source).unwrap(), original);
    }
}
