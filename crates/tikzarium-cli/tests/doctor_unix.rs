#![cfg(unix)]
//! CLI-level doctor/build contract using a fake MiKTeX process, not a
//! substitute for genuine Windows 10/MiKTeX validation.
use std::{
    fs,
    os::unix::fs::PermissionsExt,
    path::{Path, PathBuf},
    process::{Command, Output},
};

fn write_executable(path: &Path, script: &str) {
    fs::write(path, script).unwrap();
    let mut permissions = fs::metadata(path).unwrap().permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions).unwrap();
}

fn fake_engine(directory: &Path) -> PathBuf {
    let engine = directory.join("xelatex");
    write_executable(
        &engine,
        r#"#!/bin/sh
set -eu
if [ "$#" -eq 1 ] && [ "$1" = "--version" ]; then
    printf 'MiKTeX-XeTeX 4.20 (MiKTeX 25.12)\n'
    exit 0
fi
offline=no
shell_disabled=no
output=""
last=""
for arg in "$@"; do
    case "$arg" in
        --disable-installer) offline=yes ;;
        -no-shell-escape) shell_disabled=yes ;;
        -output-directory=*) output=$(printf '%s' "$arg" | sed 's/^-output-directory=//') ;;
        *) last="$arg" ;;
    esac
done
[ "$offline" = yes ] && [ "$shell_disabled" = yes ] || exit 11
name=$(basename "$last")
stem=$(printf '%s' "$name" | sed 's/\.tex$//')
printf '%%PDF-1.4\n' > "$output/$stem.pdf"
case "$name" in
    *glyph*) printf 'Missing character: There is no Ж (U+0416) in font Example!\n' > "$output/$stem.log" ;;
    *) printf 'Transcript for %s\n' "$name" > "$output/$stem.log" ;;
esac
printf 'PWD %s\nINPUT ./%s\n' "$PWD" "$name" > "$output/$stem.fls"
"#,
    );
    engine
}

fn fake_findtexmf(directory: &Path, marker: &Path, packages: &Path) {
    let script = format!(
        r#"#!/bin/sh
printf '%s\n' "$*" >> "{}"
case "$1" in
    standalone.cls|tikz.sty|tikzlibrarycalc.code.tex|tikzlibrarypositioning.code.tex|tikzlibraryarrows.meta.code.tex|fontspec.sty|unicode-math.sty)
        if [ -f "{}/$1" ]; then
            printf '%s/%s\n' "{}" "$1"
            exit 0
        fi
        exit 1 ;;
    *) exit 8 ;;
esac
"#,
        marker.display(),
        packages.display(),
        packages.display()
    );
    write_executable(&directory.join("findtexmf"), &script);
}

fn cli(engine: &Path, arguments: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_tikzarium-cli"))
        .env("TIKZARIUM_XELATEX", engine)
        .args(arguments)
        .output()
        .unwrap()
}

#[test]
fn doctor_reports_present_and_missing_without_installer_invocation() {
    let directory = tempfile::tempdir().unwrap();
    let bin = directory.path().join("MiKTeX user с пробелом");
    fs::create_dir_all(&bin).unwrap();
    let engine = fake_engine(&bin);
    let packages = directory.path().join("packages");
    fs::create_dir_all(&packages).unwrap();
    let marker = directory.path().join("lookup argv.txt");
    fake_findtexmf(&bin, &marker, &packages);
    for name in [
        "standalone.cls",
        "tikz.sty",
        "tikzlibrarycalc.code.tex",
        "tikzlibrarypositioning.code.tex",
        "tikzlibraryarrows.meta.code.tex",
        "fontspec.sty",
        "unicode-math.sty",
    ] {
        fs::write(packages.join(name), b"installed").unwrap();
    }

    let present = cli(&engine, &["doctor"]);
    assert_eq!(present.status.code(), Some(0));
    let stdout = String::from_utf8(present.stdout).unwrap();
    assert!(stdout.contains("Distribution: MiKTeX"));
    assert!(stdout.contains("unicode-math.sty: present"));
    assert!(stdout.contains("tikzlibraryarrows.meta.code.tex: present"));
    assert!(stdout.contains("MiKTeX user с пробелом"));
    let calls = fs::read_to_string(&marker).unwrap();
    assert_eq!(calls.lines().count(), 7);
    assert!(!calls.contains("--must-exist"));
    assert!(!calls.contains("--enable-installer"));

    fs::remove_file(packages.join("unicode-math.sty")).unwrap();
    let missing = cli(&engine, &["doctor"]);
    assert_eq!(missing.status.code(), Some(3));
    assert!(String::from_utf8(missing.stderr)
        .unwrap()
        .contains("unicode-math.sty: MISSING"));
}

#[test]
fn native_argv_build_keeps_unicode_source_bytes_and_never_installs() {
    let directory = tempfile::tempdir().unwrap();
    let bin = directory.path().join("MiKTeX shared");
    fs::create_dir_all(&bin).unwrap();
    let engine = fake_engine(&bin);
    let project = directory.path().join("Фигуры 2026 with spaces");
    fs::create_dir_all(&project).unwrap();
    let source = project.join("точка α.tex");
    let pdf = project.join("точка α.pdf");
    let log = project.join("точка α.log");
    let original = b"% opaque \r\n\\unknownmacro{do not rewrite}\r\n";
    fs::write(&source, original).unwrap();

    let result = cli(
        &engine,
        &[
            "build",
            source.to_str().unwrap(),
            pdf.to_str().unwrap(),
            "--log",
            log.to_str().unwrap(),
        ],
    );
    assert_eq!(
        result.status.code(),
        Some(0),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    assert_eq!(fs::read(&source).unwrap(), original);
    assert_eq!(fs::read(&pdf).unwrap(), b"%PDF-1.4\n");
    assert!(fs::read_to_string(&log).unwrap().contains("точка α.tex"));
}

#[test]
fn successful_pdf_with_missing_glyph_reports_explicit_cli_warning() {
    let directory = tempfile::tempdir().unwrap();
    let bin = directory.path().join("MiKTeX user");
    fs::create_dir_all(&bin).unwrap();
    let engine = fake_engine(&bin);
    let source = directory.path().join("glyph.tex");
    let pdf = directory.path().join("glyph.pdf");
    fs::write(&source, b"% glyph-warning fixture\n").unwrap();

    let result = cli(
        &engine,
        &[
            "build",
            source.to_str().unwrap(),
            pdf.to_str().unwrap(),
        ],
    );
    assert_eq!(result.status.code(), Some(0));
    assert!(pdf.is_file());
    let warning = String::from_utf8(result.stderr).unwrap();
    assert!(warning.contains("MissingGlyph"));
    assert!(warning.contains("U+0416"));
}

// Regression: a broken explicit MiKTeX path must never select a different
// xelatex found on PATH; the engine is a user-selected prerequisite.
#[test]
fn invalid_selected_engine_never_uses_path_fallback_for_doctor_or_build() {
    let directory = tempfile::tempdir().unwrap();
    let bin = directory.path().join("fallback TeX Live");
    fs::create_dir_all(&bin).unwrap();
    let path_engine = fake_engine(&bin);
    assert!(path_engine.is_file());

    let selected = directory.path().join("missing MiKTeX ユニコード/xelatex");
    let source = directory.path().join("original.tex");
    let pdf = directory.path().join("would-be-output.pdf");
    let original = b"% leave custom TeX untouched\r\n\\opaque{source}\r\n";
    fs::write(&source, original).unwrap();

    for args in [
        vec!["doctor".to_owned()],
        vec![
            "build".to_owned(),
            source.display().to_string(),
            pdf.display().to_string(),
        ],
    ] {
        let result = Command::new(env!("CARGO_BIN_EXE_tikzarium-cli"))
            .env("TIKZARIUM_XELATEX", &selected)
            .env("PATH", &bin)
            .args(args)
            .output()
            .unwrap();
        assert_eq!(result.status.code(), Some(2));
        let stderr = String::from_utf8_lossy(&result.stderr);
        assert!(stderr.contains("INVALID TIKZARIUM_XELATEX"), "{stderr}");
        assert!(stderr.contains("no fallback"), "{stderr}");
    }
    assert!(!pdf.exists());
    assert_eq!(fs::read(&source).unwrap(), original);
}
