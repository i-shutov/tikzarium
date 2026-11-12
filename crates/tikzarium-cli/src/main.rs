mod help;

use std::{
    env, fs,
    io::{self, Write},
    path::{Path, PathBuf},
    process::ExitCode,
};
use tikzarium_core::{
    BuildArtifact, BuildInputVerification, BuildOptions, BuildRequest, BuildService, PackageProbe,
    TexDistribution, TexEnvironment, audit_font_log, inspect_xelatex,
};

fn usage() {
    eprintln!(
        "Usage: tikzarium-cli doctor | help [--all|query|exact-id] | build <source.tex> <output.pdf> [--log <logfile.log>] [--project-root <dir>]"
    );
}

fn safe_pdf_target(source: &Path, destination: &Path) -> bool {
    if !destination
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("pdf"))
    {
        return false;
    }
    match (source.canonicalize(), destination.canonicalize()) {
        (Ok(source), Ok(destination)) => source != destination,
        _ => true,
    }
}

fn write_pdf(destination: &Path, pdf: &[u8]) -> io::Result<()> {
    let directory = destination
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    fs::create_dir_all(directory)?;
    let mut temporary = tempfile::NamedTempFile::new_in(directory)?;
    temporary.write_all(pdf)?;
    temporary.flush()?;
    temporary.as_file().sync_all()?;
    temporary
        .persist(destination)
        .map_err(|error| error.error)?;
    Ok(())
}

#[derive(Debug, PartialEq, Eq)]
struct BuildArgs {
    source: PathBuf,
    destination: PathBuf,
    log_path: Option<PathBuf>,
    project_root: Option<PathBuf>,
}

fn parse_build_args(args: &[String]) -> Result<BuildArgs, String> {
    if args.len() < 2 {
        return Err("build requires a source and PDF destination.".into());
    }
    let mut parsed = BuildArgs {
        source: PathBuf::from(&args[0]),
        destination: PathBuf::from(&args[1]),
        log_path: None,
        project_root: None,
    };
    let mut index = 2;
    while index < args.len() {
        let flag = args[index].as_str();
        let value = args
            .get(index + 1)
            .ok_or_else(|| format!("Missing value for {flag}."))?;
        if value.starts_with("--") {
            return Err(format!("Missing value for {flag}."));
        }
        match flag {
            "--log" if parsed.log_path.is_none() => parsed.log_path = Some(PathBuf::from(value)),
            "--project-root" if parsed.project_root.is_none() => {
                parsed.project_root = Some(PathBuf::from(value));
            }
            "--log" | "--project-root" => return Err(format!("Duplicate option: {flag}.")),
            _ => return Err(format!("Unknown build option: {flag}.")),
        }
        index += 2;
    }
    if let Some(path) = parsed.log_path.as_deref()
        && !path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("log"))
    {
        return Err("Persistent build log must use the .log extension.".into());
    }
    Ok(parsed)
}

fn artifact_verification_error(artifact: &BuildArtifact) -> Option<String> {
    if !artifact.project_dependencies.build_inputs_verified() {
        let detail = match artifact.project_dependencies.build_input_verification() {
            BuildInputVerification::Unverified(reason) => reason.as_str(),
            BuildInputVerification::Verified => "verification did not complete",
        };
        return Some(format!(
            "Refusing to publish PDF: project build inputs were not verified ({detail})."
        ));
    }
    if !artifact.project_dependencies.is_project_fresh() {
        return Some("Refusing to publish PDF: project inputs changed or could not be verified during the build.".into());
    }
    None
}

fn publish_artifact(destination: &Path, artifact: &BuildArtifact) -> Result<(), String> {
    if let Some(reason) = artifact_verification_error(artifact) {
        return Err(reason);
    }
    write_pdf(destination, &artifact.pdf)
        .map_err(|error| format!("Cannot atomically publish PDF: {error}"))
}

fn report_missing_engine() {
    if let Some(configured) = env::var_os("TIKZARIUM_XELATEX") {
        eprintln!(
            "XeLaTeX: INVALID TIKZARIUM_XELATEX={} (no fallback to another PATH engine)",
            Path::new(&configured).display()
        );
    } else {
        eprintln!("XeLaTeX: MISSING (install external MiKTeX on Windows or XeLaTeX on macOS)");
    }
}

fn main() -> ExitCode {
    let args: Vec<String> = env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("help") if args.len() == 2 || args.len() == 3 => {
            match help::render(args.get(2).map(String::as_str)) {
                Ok(message) => {
                    print!("{message}");
                    ExitCode::SUCCESS
                }
                Err(error) => {
                    eprintln!("{error}");
                    ExitCode::from(1)
                }
            }
        }
        Some("doctor") if args.len() == 2 => {
            let environment = TexEnvironment::discover();
            let Some(xelatex) = environment.xelatex.as_deref() else {
                report_missing_engine();
                return ExitCode::from(2);
            };
            let identity = match inspect_xelatex(xelatex) {
                Ok(identity) => identity,
                Err(error) => {
                    eprintln!(
                        "XeLaTeX version probe failed at {}: {error}",
                        xelatex.display()
                    );
                    return ExitCode::from(2);
                }
            };
            println!("XeLaTeX path: {}", xelatex.display());
            println!("XeLaTeX version: {}", identity.version);
            println!("Distribution: {:?}", identity.distribution);
            println!(
                "Package lookup: read-only (MiKTeX findtexmf without --must-exist; TeX Live kpsewhich)"
            );
            println!(
                "Offline policy: MiKTeX build passes --disable-installer; no TeX settings are changed"
            );
            println!("Installation scope: not inferred (explicit user/shared paths are supported)");
            println!("PDF rasterizer: {:?}", environment.pdf_renderer);
            if identity.distribution == TexDistribution::Unknown {
                eprintln!(
                    "Unrecognized engine; refuse builds until the XeLaTeX distribution is identifiable."
                );
                return ExitCode::from(2);
            }
            let mut missing = false;
            let mut unavailable = false;
            for package in [
                "standalone.cls",
                "tikz.sty",
                "tikzlibrarycalc.code.tex",
                "tikzlibrarypositioning.code.tex",
                "pgflibraryarrows.meta.code.tex",
                "fontspec.sty",
                "unicode-math.sty",
            ] {
                match environment.probe_package(package) {
                    PackageProbe::Present(path) => {
                        println!("{package}: present ({})", path.display());
                    }
                    PackageProbe::Missing => {
                        eprintln!("{package}: MISSING (install manually in your TeX distribution)");
                        missing = true;
                    }
                    PackageProbe::Unavailable => {
                        eprintln!("{package}: NOT_CHECKED (read-only lookup unavailable)");
                        unavailable = true;
                    }
                }
            }
            println!(
                "Fonts: NOT_CHECKED by doctor; real XeLaTeX build diagnoses missing fontspec fonts/glyphs"
            );
            if missing {
                ExitCode::from(3)
            } else if unavailable {
                ExitCode::from(2)
            } else {
                ExitCode::SUCCESS
            }
        }
        Some("build") if args.len() >= 4 => {
            let parsed = match parse_build_args(&args[2..]) {
                Ok(parsed) => parsed,
                Err(error) => {
                    eprintln!("{error}");
                    usage();
                    return ExitCode::from(1);
                }
            };
            let source = parsed.source;
            let destination = parsed.destination;
            if !safe_pdf_target(&source, &destination) {
                eprintln!("Refusing output path: expected a .pdf that is not the TeX input.");
                return ExitCode::from(4);
            }
            let log_path = parsed.log_path;

            let env = TexEnvironment::discover();
            let Some(xelatex) = env.xelatex else {
                report_missing_engine();
                return ExitCode::from(2);
            };
            let req = BuildRequest {
                source,
                xelatex,
                pdf_renderer: env.pdf_renderer,
                options: BuildOptions {
                    rasterize_first_page: false,
                    log_path: log_path.clone(),
                    project_root: parsed.project_root,
                    ..BuildOptions::default()
                },
            };
            match BuildService::new().run(&req) {
                Ok(artifact) => match publish_artifact(&destination, &artifact) {
                    Ok(()) => {
                        println!(
                            "Built {} bytes in {:?}; {} dependencies",
                            artifact.pdf.len(),
                            artifact.elapsed,
                            artifact.dependencies.len()
                        );
                        for issue in audit_font_log(&artifact.log).issues {
                            eprintln!("Figure font {:?}: {}", issue.kind, issue.message);
                        }
                        if let Some(log) = log_path {
                            println!("Persistent TeX log: {}", log.display());
                        }
                        ExitCode::SUCCESS
                    }
                    Err(error) => {
                        eprintln!("{error}");
                        if error.starts_with("Refusing to publish PDF:") {
                            ExitCode::from(5)
                        } else {
                            ExitCode::from(4)
                        }
                    }
                },
                Err(error) => {
                    eprintln!("Build failed: {error}");
                    ExitCode::from(3)
                }
            }
        }
        _ => {
            usage();
            ExitCode::from(1)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn never_overwrite_input_or_non_pdf_with_compiled_bytes() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("example.tex");
        fs::write(&source, "source").unwrap();
        assert!(!safe_pdf_target(&source, &source));
        assert!(!safe_pdf_target(&source, &dir.path().join("included.tex")));
        assert!(safe_pdf_target(&source, &dir.path().join("result.pdf")));
    }

    #[test]
    fn atomic_pdf_write_does_not_mutate_source() {
        let dir = tempfile::tempdir().unwrap();
        let original = dir.path().join("original.tex");
        fs::write(&original, b"% original\r\n").unwrap();
        let output = dir.path().join("result.pdf");
        write_pdf(&output, b"%PDF-1.4\n").unwrap();
        assert_eq!(fs::read(&original).unwrap(), b"% original\r\n");
        assert_eq!(fs::read(&output).unwrap(), b"%PDF-1.4\n");
    }

    #[test]
    fn parses_build_options_in_either_order_and_rejects_bad_arguments() {
        let source = "figure.tex".to_string();
        let destination = "figure.pdf".to_string();
        let parsed = parse_build_args(&[
            source.clone(),
            destination.clone(),
            "--project-root".into(),
            "project".into(),
            "--log".into(),
            "build.log".into(),
        ])
        .unwrap();
        assert_eq!(parsed.project_root, Some(PathBuf::from("project")));
        assert_eq!(parsed.log_path, Some(PathBuf::from("build.log")));
        let reversed = parse_build_args(&[
            source,
            destination,
            "--log".into(),
            "build.log".into(),
            "--project-root".into(),
            "project".into(),
        ])
        .unwrap();
        assert_eq!(parsed, reversed);
        for invalid in [
            vec![
                "figure.tex".into(),
                "figure.pdf".into(),
                "--unknown".into(),
                "x".into(),
            ],
            vec!["figure.tex".into(), "figure.pdf".into(), "--log".into()],
            vec![
                "figure.tex".into(),
                "figure.pdf".into(),
                "--log".into(),
                "a.log".into(),
                "--log".into(),
                "b.log".into(),
            ],
            vec![
                "figure.tex".into(),
                "figure.pdf".into(),
                "--log".into(),
                "a.txt".into(),
            ],
        ] {
            assert!(parse_build_args(&invalid).is_err(), "accepted {invalid:?}");
        }
    }

    #[test]
    fn refuses_unverified_artifact_without_changing_existing_destination() {
        use std::time::Duration;
        use tikzarium_core::ProjectDependencySnapshot;

        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("figure.tex");
        fs::write(
            &source,
            b"\\documentclass{standalone}\\begin{document}x\\end{document}",
        )
        .unwrap();
        let snapshot = ProjectDependencySnapshot::capture(dir.path(), &source, &[], true).unwrap();
        let artifact = BuildArtifact {
            pdf: b"new pdf".to_vec(),
            log: String::new(),
            dependencies: vec![],
            project_dependencies: snapshot,
            diagnostics: vec![],
            preview: Ok(None),
            elapsed: Duration::ZERO,
        };
        let destination = dir.path().join("figure.pdf");
        fs::write(&destination, b"old pdf").unwrap();
        let refusal = publish_artifact(&destination, &artifact).unwrap_err();
        assert!(refusal.contains("project build inputs were not verified"));
        assert_eq!(fs::read(&destination).unwrap(), b"old pdf");
    }
}
