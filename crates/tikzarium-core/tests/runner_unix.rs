#![cfg(unix)]
//! Fake executable integration tests. The production runner never invokes a shell.
use std::{
    fs,
    os::unix::fs::PermissionsExt,
    path::{Path, PathBuf},
    thread,
    time::{Duration, Instant},
};
use tikzarium_core::{BuildError, BuildOptions, BuildRequest, BuildService, Severity};

fn fake_xelatex(directory: &Path) -> PathBuf {
    let executable = directory.join("fake xelatex");
    let script = r#"#!/bin/sh
set -eu
out=""
last=""
for arg in "$@"; do
    case "$arg" in
        -output-directory=*) out=$(printf '%s' "$arg" | sed 's/^-output-directory=//') ;;
        *) last="$arg" ;;
    esac
done
name=$(basename "$last")
stem=$(printf '%s' "$name" | sed 's/\.tex$//')
case "$name" in
    broken.tex)
        printf '! Undefined control sequence.\nl.9 \\badmacro\n' > "$out/$stem.log"
        printf 'simulated engine failure\n' >&2
        exit 1
        ;;
    slow.tex)
        printf 'Starting slow compilation\n' > "$out/$stem.log"
        printf 'ready\n' > "$PWD/fake-engine-ready"
        while :; do :; done
        ;;
esac
printf 'LaTeX Warning: Integration fixture.\nCommand: %s\n' "$*" > "$out/$stem.log"
printf 'PWD %s\nINPUT ./%s\nINPUT ./assets/shape.tex\nINPUT %s/%s.aux\n' "$PWD" "$name" "$out" "$stem" > "$out/$stem.fls"
printf '%%PDF-1.4\n' > "$out/$stem.pdf"
"#;
    fs::write(&executable, script).unwrap();
    let mut permissions = fs::metadata(&executable).unwrap().permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(&executable, permissions).unwrap();
    executable
}

fn request(source: &Path, engine: &Path) -> BuildRequest {
    BuildRequest {
        source: source.to_path_buf(),
        xelatex: engine.to_path_buf(),
        pdf_renderer: None,
        options: BuildOptions {
            rasterize_first_page: false,
            ..BuildOptions::default()
        },
    }
}

fn wait_for_engine_start(directory: &Path) {
    let marker = directory.join("fake-engine-ready");
    let started = Instant::now();
    while !marker.exists() && started.elapsed() < Duration::from_secs(5) {
        thread::sleep(Duration::from_millis(25));
    }
    assert!(marker.exists(), "fake engine did not start");
}

#[test]
fn dotted_job_name_dependencies_and_direct_argv_are_preserved() {
    let directory = tempfile::tempdir().unwrap();
    let assets = directory.path().join("assets");
    fs::create_dir_all(&assets).unwrap();
    fs::write(assets.join("shape.tex"), "% shape").unwrap();
    let source = directory.path().join("figure.v2.tex");
    fs::write(&source, "% source remains unchanged\n").unwrap();
    let original = fs::read(&source).unwrap();
    let engine = fake_xelatex(directory.path());

    let artifact = BuildService::new().run(&request(&source, &engine)).unwrap();
    assert_eq!(artifact.pdf, b"%PDF-1.4\n");
    assert_eq!(fs::read(&source).unwrap(), original);
    assert!(artifact.log.contains("-no-shell-escape"));
    assert!(
        artifact
            .diagnostics
            .iter()
            .any(|item| item.severity == Severity::Warning)
    );
    assert!(
        artifact
            .dependencies
            .contains(&source.canonicalize().unwrap())
    );
    assert!(
        artifact
            .dependencies
            .contains(&assets.join("shape.tex").canonicalize().unwrap())
    );
    assert_eq!(artifact.dependencies.len(), 2);
}

#[test]
fn leading_dash_source_is_a_file_argument_not_a_tex_option() {
    let directory = tempfile::tempdir().unwrap();
    fs::create_dir_all(directory.path().join("assets")).unwrap();
    fs::write(directory.path().join("assets/shape.tex"), "").unwrap();
    let source = directory.path().join("-shell-escape.tex");
    fs::write(&source, "% sensitive filename").unwrap();
    let engine = fake_xelatex(directory.path());

    let artifact = BuildService::new().run(&request(&source, &engine)).unwrap();
    assert!(artifact.log.contains("./-shell-escape.tex"));
    assert_eq!(fs::read_to_string(&source).unwrap(), "% sensitive filename");
}

#[test]
fn failure_reports_source_line_and_retains_full_log_on_request() {
    let directory = tempfile::tempdir().unwrap();
    let source = directory.path().join("broken.tex");
    fs::write(&source, "\\badmacro\n").unwrap();
    let engine = fake_xelatex(directory.path());
    let log_path = directory.path().join("diagnostics.log");
    let mut build = request(&source, &engine);
    build.options.log_path = Some(log_path.clone());

    let failure = BuildService::new().run(&build).unwrap_err();
    assert!(matches!(failure, BuildError::TeXFailure { .. }));
    assert!(failure.to_string().contains("line 9"));
    assert!(failure.to_string().contains("simulated engine failure"));
    assert!(
        fs::read_to_string(&log_path)
            .unwrap()
            .contains("Undefined control sequence")
    );
    assert_eq!(fs::read_to_string(&source).unwrap(), "\\badmacro\n");
}

#[test]
fn timeout_retains_partial_log() {
    let directory = tempfile::tempdir().unwrap();
    let source = directory.path().join("slow.tex");
    fs::write(&source, "% wait").unwrap();
    let engine = fake_xelatex(directory.path());
    let log_path = directory.path().join("slow-run.log");
    let mut build = request(&source, &engine);
    build.options.timeout = Duration::from_secs(2);
    build.options.log_path = Some(log_path.clone());

    assert!(matches!(
        BuildService::new().run(&build),
        Err(BuildError::Timeout(_))
    ));
    assert!(directory.path().join("fake-engine-ready").exists());
    assert!(
        fs::read_to_string(log_path)
            .unwrap()
            .contains("Starting slow compilation")
    );
}

#[test]
fn cancelling_active_compilation_stops_the_child() {
    let directory = tempfile::tempdir().unwrap();
    let source = directory.path().join("slow.tex");
    fs::write(&source, "% wait").unwrap();
    let engine = fake_xelatex(directory.path());
    let mut build = request(&source, &engine);
    build.options.timeout = Duration::from_secs(10);
    let service = BuildService::new();
    let worker = service.clone();
    let thread = thread::spawn(move || worker.run(&build));
    wait_for_engine_start(directory.path());
    service.cancel();
    assert!(matches!(thread.join().unwrap(), Err(BuildError::Cancelled)));
}
