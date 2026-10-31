//! Execute the SAME app authoring state as egui, without claiming GUI interaction.
#[allow(dead_code)]
#[path = "../tikz_authoring.rs"]
mod tikz_authoring;
use std::{env, error::Error, fs, path::PathBuf};
use tikz_authoring::{Draft, Point, Session, TOOLS, Tool, owned};

const SOURCE: &str = r"\documentclass{standalone}
\usepackage{fontspec}
\usepackage{unicode-math}
\setmainfont{DejaVu Serif}
\setmathfont{latinmodern-math.otf}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
\newcommand{\UserPath}{\path (0,0);}
\begin{document}
\begin{tikzpicture}
% Непрозрачный пользовательский макрос — сохранить без изменений.
\UserPath
\end{tikzpicture}
\end{document}
";

fn main() -> Result<(), Box<dyn Error>> {
    let mut args = env::args_os().skip(1);
    let directory = PathBuf::from(
        args.next()
            .ok_or("usage: n1-authoring-proof <NEW-output-directory>")?,
    );
    if args.next().is_some() {
        return Err("Only one output directory is accepted".into());
    }
    fs::create_dir(&directory)?;
    let mut source = SOURCE.to_owned();
    let mut session = Session::default();
    session.reset(&source);
    let gestures = [
        (Point::new(0.0, 0.0), Point::new(2.0, 1.0)),
        (Point::new(0.0, 2.0), Point::new(2.0, 3.0)),
        (Point::new(3.0, 0.0), Point::new(5.0, 1.0)),
        (Point::new(4.0, 3.0), Point::new(5.0, 3.0)),
        (Point::new(1.0, 4.0), Point::new(1.0, 4.0)),
        (Point::new(0.0, 5.0), Point::new(4.0, 5.0)),
    ];
    for (tool, (start, end)) in TOOLS.into_iter().zip(gestures) {
        let mut draft = Draft::from_gesture(tool, start, end, &Draft::for_tool(tool));
        if tool == Tool::Node {
            draft
                .values
                .insert("content".into(), "Геометрия_1 & оптика 25%".into());
        }
        session.insert(&mut source, tool, draft)?;
    }
    if owned(&source).len() != 6
        || !source.contains("\\newcommand{\\UserPath}{\\path (0,0);}")
        || !source.contains(
            "% Непрозрачный пользовательский макрос — сохранить без изменений.\n\\UserPath\n",
        )
    {
        return Err("Six commands or opaque source preservation failed".into());
    }
    let created = source.clone();
    session.choose(&source, 4)?;
    session.draft.values.insert("radius".into(), "0.8cm".into());
    session.apply_parameters(&mut source)?;
    if !source.contains("radius=0.8cm") {
        return Err("Circle parameter did not update".into());
    }
    session.undo(&mut source)?;
    if source != created {
        return Err("Parameter undo did not restore the exact source".into());
    }
    fs::write(directory.join("authoring.tex"), &source)?;
    let mut reloaded = fs::read_to_string(directory.join("authoring.tex"))?;
    let mut reopened = Session::default();
    reopened.reset(&reloaded);
    for id in 1..=6 {
        reopened.choose(&reloaded, id)?;
    }
    if reloaded != source {
        return Err("Source changed during reopen selection".into());
    }
    reopened.choose(&reloaded, 5)?;
    reopened.draft.values.insert("mode".into(), "math".into());
    reopened.draft.values.insert(
        "content".into(),
        r"E=\hbar\omega,\quad\alpha+\beta=\gamma".into(),
    );
    reopened.apply_parameters(&mut reloaded)?;
    fs::write(directory.join("math-authoring.tex"), &reloaded)?;
    reopened.undo(&mut reloaded)?;
    if reloaded != source {
        return Err("Math-node undo did not restore text mode".into());
    }
    let saved = source.clone();
    // Inject a hand edit: source ownership must no longer permit a visual replacement.
    source = source.replace("\\draw (0.00cm", "\\draw[red] (0.00cm");
    let modified = source.clone();
    session.draft.values.insert("radius".into(), "2cm".into());
    if session.apply_parameters(&mut source).is_ok() || source != modified {
        return Err("Stale source was overwritten".into());
    }
    let evidence = serde_json::json!({
        "schema_version": 1,
        "source_head_sha": env::var("TIKZARIUM_SOURCE_SHA").unwrap_or_else(|_| "UNKNOWN".into()),
        "status": "PASS_AUTHORING_STATE_ONLY",
        "tools": TOOLS.map(Tool::catalog_id),
        "command_count": owned(&saved).len(),
        "generator": "tikzarium_extensions::primitives::Catalog",
        "save_reopen": "PASS", "parameter_undo": "PASS", "math_undo": "PASS",
        "opaque_source_preservation": "PASS", "manual_edit_conflict": "PASS",
        "gui_pointer_clicks": "NOT_RUN", "physical_win10_miktex": "NOT_RUN",
        "physical_mac_m1_m4": "NOT_RUN", "xelatex_compile": "SEPARATE_CI_STEP"
    });
    fs::write(
        directory.join("authoring-state.json"),
        serde_json::to_vec_pretty(&evidence)?,
    )?;
    println!("{}", serde_json::to_string_pretty(&evidence)?);
    Ok(())
}
