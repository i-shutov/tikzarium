use std::{
    env, fs,
    io::{self, Write},
    path::{Path, PathBuf},
    process::ExitCode,
};
use tikzarium_core::{
    BuildOptions, BuildRequest, BuildService, PackageProbe, TexDistribution, TexEnvironment,
    audit_font_log, inspect_xelatex,
};

fn usage() {
    eprintln!(
        "Usage: tikzarium-cli doctor | build <source.tex> <output.pdf> [--log <logfile.log>]"
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
                "tikzlibraryarrows.meta.code.tex",
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
        Some("build") if args.len() == 4 || args.len() == 6 => {
            let source = PathBuf::from(&args[2]);
            let destination = PathBuf::from(&args[3]);
            if !safe_pdf_target(&source, &destination) {
                eprintln!("Refusing output path: expected a .pdf that is not the TeX input.");
                return ExitCode::from(4);
            }
            let log_path = if args.len() == 6 && args[4] == "--log" {
                let path = PathBuf::from(&args[5]);
                if !path
                    .extension()
                    .and_then(|extension| extension.to_str())
                    .is_some_and(|extension| extension.eq_ignore_ascii_case("log"))
                {
                    eprintln!("Persistent build log must use the .log extension.");
                    return ExitCode::from(1);
                }
                Some(path)
            } else if args.len() == 4 {
                None
            } else {
                usage();
                return ExitCode::from(1);
            };

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
                    ..BuildOptions::default()
                },
            };
            match BuildService::new().run(&req) {
                Ok(artifact) => match write_pdf(&destination, &artifact.pdf) {
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
                        eprintln!("Cannot atomically publish PDF: {error}");
                        ExitCode::from(4)
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
}
