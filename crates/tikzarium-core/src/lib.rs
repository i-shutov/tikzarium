//! Platform independent XeLaTeX build, project and preview services.
//! No GUI dependency, no implicit remote services and no implicit compiler fallback.
pub mod build;
pub mod diagnostics;
pub mod discovery;
pub mod document;
pub mod preview;

pub use build::{
    BuildArtifact, BuildError, BuildOptions, BuildRequest, BuildService, parse_fls,
    parse_fls_with_cwd,
};
pub use diagnostics::{BuildDiagnostic, Severity, extract_diagnostics};
pub use discovery::{TexEnvironment, find_executable};
pub use document::Document;
pub use preview::{Preview, PreviewError, render_first_page};
