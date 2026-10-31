//! Emit a real XeLaTeX input fixture via the same C/N2 import planner.
//! Usage: cargo run -q -p tikzarium-extensions --bin project-import-fixtures -- arrows.meta
//! Redirect stdout to a .tex file; this utility never compiles or installs TeX.

use tikzarium_extensions::project_imports::{
    inspect, plan_import, ImportDecision, ImportKind,
};

fn main() {
    let name = std::env::args().nth(1).unwrap_or_default();
    let drawing = match name.as_str() {
        "arrows.meta" => "\\draw[-{Stealth}] (0,0) -- (2,0);",
        "positioning" => "\\node (a) at (0,0) {A}; \\node[right=of a] {B};",
        "calc" => "\\draw ($(0,0)+(1,0)$) -- (2,0);",
        "fit" => "\\node (a) at (0,0) {A}; \\node (b) at (2,0) {B}; \\node[draw,fit=(a)(b)] {};",
        _ => {
            eprintln!("Expected one of: arrows.meta, positioning, calc, fit");
            std::process::exit(2);
        }
    };
    let prefix = "\\documentclass{article}\n\\pagestyle{empty}\n\\begin{document}\n\\begin{tikzpicture}\n";
    let suffix = "\n\\end{tikzpicture}\n\\end{document}\n";
    let mut source = format!("{prefix}{drawing}{suffix}");
    let mut revision = 0;
    let target = inspect(&source)
        .begin_document_target(revision)
        .expect("known literal fixture preamble");
    let proposal = plan_import(&source, target, ImportKind::TikzLibrary, &name);
    match proposal {
        ImportDecision::Proposed(plan) => {
            plan.apply(&mut source, &mut revision)
                .expect("fixture source and revision match");
        }
        _ => panic!("expected an import proposal for this known fixture"),
    }
    print!("{source}");
}
