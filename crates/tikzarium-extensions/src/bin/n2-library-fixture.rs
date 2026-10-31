//! C-owned generated TeX documents for independent N2 XeLaTeX verification.
//! Usage: cargo run -p tikzarium-extensions --bin n2-library-fixture -- calc
use std::{env, process};
use tikzarium_extensions::primitives::Catalog;

fn main() {
    let name = env::args().nth(1).unwrap_or_default();
    let catalog = Catalog::bundled().expect("valid bundled declarative catalogue");
    match catalog.library(&name) {
        Some(library) => print!("{}", library.example),
        None => {
            eprintln!("unknown N2 library; select arrows.meta, positioning, calc or fit");
            process::exit(2);
        }
    }
}
