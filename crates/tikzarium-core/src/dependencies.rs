//! Content-based freshness snapshots for `.fls` project inputs.
//! This is an opt-in project-scope check, NOT a global TeX cache validator.
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    ffi::OsString,
    fmt::Write as _,
    fs::{self, File},
    io::{self, Read},
    path::{Path, PathBuf},
};

/// Per-input cap avoids unbounded hashing of huge included resources on the UI thread.
/// Above this size, the path is deliberately *unverifiable*, never reported as fresh.
pub const MAX_TRACKED_FILE_BYTES: u64 = 64 * 1024 * 1024;
/// Bounded pre-build inventory limits. Hitting any limit fails build provenance closed.
pub const MAX_BUILD_INVENTORY_FILES: usize = 4096;
pub const MAX_BUILD_INVENTORY_BYTES: u64 = 256 * 1024 * 1024;
pub const MAX_BUILD_INVENTORY_ENTRIES: usize = 16_384;
pub const MAX_BUILD_INVENTORY_DIRECTORIES: usize = 4096;
pub const MAX_BUILD_INVENTORY_DEPTH: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BaselineAbort {
    Cancelled,
    Deadline,
}

/// A single author file is distinct from a dependency discovered via TeX's .fls recorder.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectInputOrigin {
    AuthorSource,
    FlsInput,
}

/// One local source/dependency checksum captured for the current build.
/// sha256 is the *captured* digest, never silently refreshed after changes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectInputRecord {
    pub origin: ProjectInputOrigin,
    pub recorded_path: PathBuf,
    pub resolved_path: PathBuf,
    pub sha256: Option<String>,
    pub bytes_current: bool,
}

#[derive(Debug, Clone)]
struct ProjectInput {
    /// Resolved target at capture time (retained for the existing public paths API).
    path: PathBuf,
    /// Original recorded spelling must survive to catch symlink retargeting.
    recorded_path: PathBuf,
    origin: ProjectInputOrigin,
    digest: Option<[u8; 32]>,
}

impl ProjectInput {
    fn bytes_current(&self) -> bool {
        self.digest.is_some()
            && canonicalize_existing_prefix(&self.recorded_path) == self.path
            && file_digest(&self.recorded_path).ok().flatten() == self.digest
    }
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
    build_input_verification: BuildInputVerification,
}

/// Whether every project-local input used by this build had matching bytes in
/// the bounded inventory captured before the engine started.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BuildInputVerification {
    Unverified(String),
    Verified,
}

/// Bounded recursive inventory of regular files beneath the explicitly
/// selected project root, captured before TeX runs. Matching pre/post hashes
/// detect persistent changes during the build, but cannot detect a file that
/// changes and reverts between observations. External TeX installation inputs
/// are not in this root inventory. Symlinks are never traversed; a build that
/// uses one cannot be verified by this inventory.
#[derive(Debug, Clone)]
pub struct ProjectBuildBaseline {
    root: PathBuf,
    root_spelling: PathBuf,
    files: Vec<(PathBuf, [u8; 32])>,
    complete: bool,
    reason: Option<String>,
}

impl ProjectBuildBaseline {
    pub fn capture(root: &Path) -> io::Result<Self> {
        Self::capture_with_checkpoint(root, || Ok(())).map_err(|error| match error {
            BaselineCaptureError::Io(error) => error,
            BaselineCaptureError::Aborted(_) => io::Error::other("inventory capture aborted"),
        })
    }

    pub(crate) fn capture_with_checkpoint(
        root: &Path,
        mut checkpoint: impl FnMut() -> Result<(), BaselineAbort>,
    ) -> Result<Self, BaselineCaptureError> {
        let root_spelling = if root.is_absolute() {
            root.to_path_buf()
        } else {
            std::env::current_dir()?.join(root)
        };
        let root = root.canonicalize()?;
        let mut baseline = Self {
            root: root.clone(),
            root_spelling,
            files: Vec::new(),
            complete: true,
            reason: None,
        };
        let mut pending = vec![(root.clone(), 0_usize)];
        let mut total = 0_u64;
        let mut visited_entries = 0_usize;
        let mut visited_directories = 1_usize;
        while let Some(directory) = pending.pop() {
            checkpoint().map_err(BaselineCaptureError::Aborted)?;
            let (_, depth) = &directory;
            let path_dir = &directory.0;
            let entries = match fs::read_dir(path_dir) {
                Ok(entries) => entries,
                Err(error) => {
                    baseline.fail(format!("cannot read {}: {error}", path_dir.display()));
                    break;
                }
            };
            for entry in entries {
                checkpoint().map_err(BaselineCaptureError::Aborted)?;
                let entry = match entry {
                    Ok(entry) => entry,
                    Err(error) => {
                        baseline.fail(format!("cannot enumerate {}: {error}", path_dir.display()));
                        break;
                    }
                };
                visited_entries += 1;
                if visited_entries > MAX_BUILD_INVENTORY_ENTRIES {
                    baseline.fail("project inventory exceeds entry limit".into());
                    break;
                }
                let path = entry.path();
                let metadata = match fs::symlink_metadata(&path) {
                    Ok(metadata) => metadata,
                    Err(error) => {
                        baseline.fail(format!("cannot inspect {}: {error}", path.display()));
                        break;
                    }
                };
                if metadata.file_type().is_symlink() {
                    continue;
                }
                if metadata.is_dir() {
                    if *depth + 1 > MAX_BUILD_INVENTORY_DEPTH {
                        baseline.fail("project inventory exceeds directory depth limit".into());
                        break;
                    }
                    visited_directories += 1;
                    if visited_directories > MAX_BUILD_INVENTORY_DIRECTORIES {
                        baseline.fail("project inventory exceeds directory limit".into());
                        break;
                    }
                    pending.push((path, *depth + 1));
                    continue;
                }
                if !metadata.is_file() {
                    continue;
                }
                if baseline.files.len() >= MAX_BUILD_INVENTORY_FILES {
                    baseline.fail("project inventory exceeds file limit".into());
                    break;
                }
                if metadata.len() > MAX_TRACKED_FILE_BYTES
                    || metadata.len() > MAX_BUILD_INVENTORY_BYTES.saturating_sub(total)
                {
                    baseline.fail("project inventory exceeds byte limit".into());
                    break;
                }
                match file_digest_checked(&path, &mut total, &mut checkpoint) {
                    Ok(Some(digest)) => baseline.files.push((path, digest)),
                    Ok(None) => {
                        baseline.fail(format!("cannot hash {}", path.display()));
                        break;
                    }
                    Err(BaselineCaptureError::Io(error)) => {
                        baseline.fail(format!("cannot hash {}: {error}", path.display()));
                        break;
                    }
                    Err(BaselineCaptureError::Aborted(reason)) => {
                        return Err(BaselineCaptureError::Aborted(reason));
                    }
                }
            }
            if !baseline.complete {
                break;
            }
        }
        Ok(baseline)
    }

    fn fail(&mut self, reason: String) {
        self.complete = false;
        if self.reason.is_none() {
            self.reason = Some(reason);
        }
    }

    pub fn validate(&self, snapshot: &ProjectDependencySnapshot) -> BuildInputVerification {
        if !self.complete {
            return BuildInputVerification::Unverified(
                self.reason
                    .clone()
                    .unwrap_or_else(|| "project inventory incomplete".into()),
            );
        }
        if snapshot.root != self.root {
            return BuildInputVerification::Unverified(
                "build root differs from pre-build inventory".into(),
            );
        }
        if !snapshot.recorder_complete {
            return BuildInputVerification::Unverified("TeX input recorder incomplete".into());
        }
        if !snapshot.source_is_project_local
            || snapshot.escaped_project_input
            || !snapshot
                .project_inputs
                .iter()
                .any(|input| input.origin == ProjectInputOrigin::AuthorSource)
        {
            return BuildInputVerification::Unverified(
                "author source is outside the selected project root or could not be recorded"
                    .into(),
            );
        }
        for input in &snapshot.project_inputs {
            let Some(digest) = input.digest else {
                return BuildInputVerification::Unverified(format!(
                    "input could not be hashed: {}",
                    input.recorded_path.display()
                ));
            };
            if has_symlink_component_within_project(
                &input.recorded_path,
                &self.root,
                &self.root_spelling,
            ) || input.path != input.recorded_path.canonicalize().unwrap_or_default()
            {
                return BuildInputVerification::Unverified(format!(
                    "input path changed or uses an unsupported symlink: {}",
                    input.recorded_path.display()
                ));
            }
            match self.files.iter().find(|(path, _)| path == &input.path) {
                Some((_, before)) if *before == digest => {}
                Some(_) => {
                    return BuildInputVerification::Unverified(format!(
                        "input changed during build: {}",
                        input.recorded_path.display()
                    ));
                }
                None => {
                    return BuildInputVerification::Unverified(format!(
                        "input was not present in pre-build inventory: {}",
                        input.recorded_path.display()
                    ));
                }
            }
        }
        BuildInputVerification::Verified
    }

    pub fn validate_and_mark(&self, snapshot: &mut ProjectDependencySnapshot) {
        let status = self.validate(snapshot);
        snapshot.set_build_input_verification(status);
    }
}

fn file_digest_checked(
    path: &Path,
    total_bytes_read: &mut u64,
    checkpoint: &mut impl FnMut() -> Result<(), BaselineAbort>,
) -> Result<Option<[u8; 32]>, BaselineCaptureError> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut bytes_read = 0_u64;
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        checkpoint().map_err(BaselineCaptureError::Aborted)?;
        let count = file.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        bytes_read = bytes_read.saturating_add(count as u64);
        // Count actual reads, not only the earlier metadata: a concurrently
        // growing resource must not evade the total inventory budget.
        *total_bytes_read = total_bytes_read.saturating_add(count as u64);
        if bytes_read > MAX_TRACKED_FILE_BYTES || *total_bytes_read > MAX_BUILD_INVENTORY_BYTES {
            return Ok(None);
        }
        hasher.update(&buffer[..count]);
    }
    Ok(Some(hasher.finalize().into()))
}

#[derive(Debug)]
pub(crate) enum BaselineCaptureError {
    Io(io::Error),
    Aborted(BaselineAbort),
}

impl From<io::Error> for BaselineCaptureError {
    fn from(error: io::Error) -> Self {
        Self::Io(error)
    }
}

fn has_symlink_component_within_project(path: &Path, root: &Path, root_spelling: &Path) -> bool {
    let mut current = PathBuf::new();
    for component in path.components() {
        current.push(component.as_os_str());
        if fs::symlink_metadata(&current).is_ok_and(|metadata| metadata.file_type().is_symlink()) {
            let parent_is_project_local = current.parent().is_some_and(|parent| {
                parent
                    .canonicalize()
                    .is_ok_and(|resolved| resolved.starts_with(root))
            });
            let target_is_project_child = current
                .canonicalize()
                .is_ok_and(|resolved| resolved.starts_with(root) && resolved != root);
            if current.starts_with(root)
                || (current != root_spelling && current.starts_with(root_spelling))
                || parent_is_project_local
                || target_is_project_child
            {
                return true;
            }
        }
    }
    false
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
                    origin: if index == 0 {
                        ProjectInputOrigin::AuthorSource
                    } else {
                        ProjectInputOrigin::FlsInput
                    },
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
            build_input_verification: BuildInputVerification::Unverified(
                "no pre-build inventory".into(),
            ),
        })
    }

    pub(crate) fn set_build_input_verification(&mut self, status: BuildInputVerification) {
        self.build_input_verification = status;
    }

    #[must_use]
    pub fn build_input_verification(&self) -> &BuildInputVerification {
        &self.build_input_verification
    }

    #[must_use]
    pub fn build_inputs_verified(&self) -> bool {
        self.build_input_verification == BuildInputVerification::Verified
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

    /// Captured local author and .fls INPUT checksum ledger for one figure.
    /// Records retain their original spelling (including relative components)
    /// and canonical target; external TeX-distribution inputs remain explicitly
    /// unverified via ignored_external_paths(), never falsely certified fresh.
    #[must_use]
    pub fn project_input_records(&self) -> Vec<ProjectInputRecord> {
        self.project_inputs
            .iter()
            .map(|item| {
                let sha256 = item.digest.map(|bytes| {
                    let mut value = String::with_capacity(64);
                    for byte in bytes {
                        // Writing to a String cannot fail.
                        let _ = write!(&mut value, "{byte:02x}");
                    }
                    value
                });
                ProjectInputRecord {
                    origin: item.origin,
                    recorded_path: item.recorded_path.clone(),
                    resolved_path: item.path.clone(),
                    sha256,
                    bytes_current: item.bytes_current(),
                }
            })
            .collect()
    }

    /// Confirm that an externally built figure actually used this exact open
    /// author source, not merely an unrelated or older .fls snapshot. A clean
    /// source on disk must match the caller's current UTF-8 bytes and the
    /// captured SHA-256. Recorder completion is checked by the caller.
    #[must_use]
    pub fn matches_author_source_bytes(&self, source: &Path, bytes: &[u8]) -> bool {
        let Ok(resolved) = source.canonicalize() else {
            return false;
        };
        let digest: [u8; 32] = Sha256::digest(bytes).into();
        self.source_is_project_local
            && self.project_inputs.iter().any(|input| {
                input.origin == ProjectInputOrigin::AuthorSource
                    && input.path == resolved
                    && input.digest == Some(digest)
                    && input.bytes_current()
            })
    }

    /// Paths whose bytes changed, disappeared, became unreadable, or could
    /// not be fingerprinted at capture time (e.g. over the size cap).
    /// Content hashing detects same-length edits with unchanged timestamps.
    #[must_use]
    pub fn invalidated_project_paths(&self) -> Vec<PathBuf> {
        self.project_inputs
            .iter()
            .filter(|item| !item.bytes_current())
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

#[cfg(test)]
mod build_baseline_regression {
    use super::*;

    #[test]
    fn growth_after_metadata_consumes_the_actual_total_read_budget() {
        let project = tempfile::tempdir().unwrap();
        let data = project.path().join("growing.dat");
        fs::write(&data, b"").unwrap();
        assert_eq!(fs::metadata(&data).unwrap().len(), 0);
        let mut total_read = MAX_BUILD_INVENTORY_BYTES - 2;
        let mut changed = false;
        let result = file_digest_checked(&data, &mut total_read, &mut || {
            if !changed {
                // Simulate another process extending a resource after its
                // metadata was accepted but before the first content read.
                fs::write(&data, b"abcd").unwrap();
                changed = true;
            }
            Ok(())
        })
        .unwrap();
        assert!(result.is_none());
        assert!(total_read > MAX_BUILD_INVENTORY_BYTES);
    }

    #[test]
    fn pre_build_bytes_reject_persistent_mutation_of_first_build_data_input() {
        let project = tempfile::tempdir().unwrap();
        let data_dir = project.path().join("data");
        fs::create_dir_all(&data_dir).unwrap();
        let source = project.path().join("figures/main.tex");
        fs::create_dir_all(source.parent().unwrap()).unwrap();
        let data = data_dir.join("curve.dat");
        fs::write(&source, b"% keep CRLF\r\n\\input{../data/curve.dat}\r\n").unwrap();
        fs::write(&data, b"0 0\n1 1\n").unwrap();

        let baseline = ProjectBuildBaseline::capture(project.path()).unwrap();
        fs::write(&data, b"0 0\n1 2\n").unwrap();
        // The after-build snapshot alone looks fresh; comparison with the
        // pre-build inventory correctly refuses to pair the PDF with new data.
        let snapshot = ProjectDependencySnapshot::capture(
            project.path(),
            &source,
            std::slice::from_ref(&data),
            true,
        )
        .unwrap();
        assert!(snapshot.is_project_fresh());
        assert_eq!(
            baseline.validate(&snapshot),
            BuildInputVerification::Unverified(format!(
                "input changed during build: {}",
                data.display()
            ))
        );
        assert_eq!(
            fs::read(&source).unwrap(),
            b"% keep CRLF\r\n\\input{../data/curve.dat}\r\n"
        );
    }

    #[test]
    fn unchanged_first_build_inputs_including_source_are_verified() {
        let project = tempfile::tempdir().unwrap();
        let source = project.path().join("figure.tex");
        let data = project.path().join("curve.dat");
        fs::write(&source, b"% opaque\r\n").unwrap();
        fs::write(&data, b"0 0\n").unwrap();
        let baseline = ProjectBuildBaseline::capture(project.path()).unwrap();
        let snapshot = ProjectDependencySnapshot::capture(
            project.path(),
            &source,
            std::slice::from_ref(&data),
            true,
        )
        .unwrap();
        assert_eq!(
            baseline.validate(&snapshot),
            BuildInputVerification::Verified
        );
    }

    #[cfg(unix)]
    #[test]
    fn used_symlink_input_cannot_be_certified() {
        use std::os::unix::fs::symlink;
        let project = tempfile::tempdir().unwrap();
        let source = project.path().join("figure.tex");
        let target = project.path().join("real.dat");
        let link = project.path().join("curve.dat");
        fs::write(&source, "source").unwrap();
        fs::write(&target, "data").unwrap();
        symlink(&target, &link).unwrap();
        let baseline = ProjectBuildBaseline::capture(project.path()).unwrap();
        let snapshot = ProjectDependencySnapshot::capture(
            project.path(),
            &source,
            std::slice::from_ref(&link),
            true,
        )
        .unwrap();
        assert!(matches!(
            baseline.validate(&snapshot),
            BuildInputVerification::Unverified(_)
        ));
    }

    #[test]
    fn deep_directory_tree_fails_closed_at_the_depth_limit() {
        let project = tempfile::tempdir().unwrap();
        let mut nested = project.path().to_path_buf();
        for _ in 0..=MAX_BUILD_INVENTORY_DEPTH {
            nested.push("d");
        }
        fs::create_dir_all(&nested).unwrap();
        fs::write(nested.join("file.tex"), "source").unwrap();
        let baseline = ProjectBuildBaseline::capture(project.path()).unwrap();
        assert!(!baseline.complete);
        assert!(baseline.reason.as_deref().unwrap().contains("depth"));
    }

    #[test]
    fn inventory_checkpoint_can_abort_for_cancellation_or_deadline() {
        let project = tempfile::tempdir().unwrap();
        let cancelled = ProjectBuildBaseline::capture_with_checkpoint(project.path(), || {
            Err(BaselineAbort::Cancelled)
        });
        assert!(matches!(
            cancelled,
            Err(BaselineCaptureError::Aborted(BaselineAbort::Cancelled))
        ));
        let deadline = ProjectBuildBaseline::capture_with_checkpoint(project.path(), || {
            Err(BaselineAbort::Deadline)
        });
        assert!(matches!(
            deadline,
            Err(BaselineCaptureError::Aborted(BaselineAbort::Deadline))
        ));
    }

    #[cfg(unix)]
    #[test]
    fn selected_root_alias_is_allowed_but_project_internal_symlink_is_not() {
        use std::os::unix::fs::symlink;
        let owner = tempfile::tempdir().unwrap();
        let project = owner.path().join("project");
        fs::create_dir_all(&project).unwrap();
        let source = project.join("main.tex");
        let target = project.join("real.dat");
        let link = project.join("asset.dat");
        fs::write(&source, "source").unwrap();
        fs::write(&target, "data").unwrap();
        symlink(&target, &link).unwrap();
        let alias = owner.path().join("project-alias");
        symlink(&project, &alias).unwrap();
        let baseline = ProjectBuildBaseline::capture(&alias).unwrap();
        let snapshot = ProjectDependencySnapshot::capture(
            &alias,
            &alias.join("main.tex"),
            std::slice::from_ref(&alias.join("asset.dat")),
            true,
        )
        .unwrap();
        assert!(matches!(
            baseline.validate(&snapshot),
            BuildInputVerification::Unverified(_)
        ));
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
