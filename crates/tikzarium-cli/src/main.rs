use std::{
    env, fs,
    io::{self, Write},
    path::{Path, PathBuf},
    process::ExitCode,
};
use tikzarium_core::{BuildOptions, BuildRequest, BuildService, TexEnvironment};

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

fn main() -> ExitCode {
    let args: Vec<String> = env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("doctor") if args.len() == 2 => {
            let env = TexEnvironment::discover();
            println!("XeLaTeX: {:?}", env.xelatex);
            println!("Version: {:?}", env.xelatex_version);
            println!("kpsewhich: {:?}", env.kpsewhich);
            println!("pdftoppm: {:?}", env.pdf_renderer);
            println!("PGF: {:?}", env.package_file("pgf.sty"));
            if env.xelatex.is_some() {
                ExitCode::SUCCESS
            } else {
                ExitCode::from(2)
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
                eprintln!("XeLaTeX missing. Install TeX Live/MiKTeX, or set TIKZARIUM_XELATEX.");
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
