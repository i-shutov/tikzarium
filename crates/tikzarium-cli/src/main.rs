use std::{env, fs, path::PathBuf, process::ExitCode};
use tikzarium_core::{TexEnvironment, BuildRequest, BuildService, BuildOptions};

fn usage() { eprintln!("Usage: tikzarium-cli doctor | build <source.tex> <output.pdf>"); }

fn main() -> ExitCode {
    let args: Vec<String> = env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("doctor") => {
            let env = TexEnvironment::discover();
            println!("XeLaTeX: {:?}", env.xelatex);
            println!("Version: {:?}", env.xelatex_version);
            println!("kpsewhich: {:?}", env.kpsewhich);
            println!("pdftoppm: {:?}", env.pdf_renderer);
            println!("PGF: {:?}", env.package_file("pgf.sty"));
            if env.xelatex.is_some() { ExitCode::SUCCESS } else { ExitCode::from(2) }
        }
        Some("build") if args.len() == 4 => {
            let env = TexEnvironment::discover();
            let Some(xelatex) = env.xelatex else {
                eprintln!("XeLaTeX missing. Install TeX Live/MiKTeX, or set TIKZARIUM_XELATEX.");
                return ExitCode::from(2);
            };
            let req = BuildRequest {
                source: PathBuf::from(&args[2]), xelatex, pdf_renderer: env.pdf_renderer,
                options: BuildOptions { rasterize_first_page:false, ..BuildOptions::default() }
            };
            match BuildService::new().run(&req) {
                Ok(artifact) => match fs::write(&args[3], &artifact.pdf) {
                    Ok(()) => {
                        println!("Built {} bytes in {:?}; {} dependencies", artifact.pdf.len(), artifact.elapsed, artifact.dependencies.len());
                        ExitCode::SUCCESS
                    }
                    Err(error) => {eprintln!("Cannot write output: {error}"); ExitCode::from(4)}
                },
                Err(error) => {eprintln!("Build failed: {error}"); ExitCode::from(3)}
            }
        }
        _ => { usage(); ExitCode::from(1) }
    }
}
