//! Platform independent XeLaTeX build, project and preview services.
//! No GUI dependency, no implicit remote services and no implicit compiler fallback.
pub mod build;
pub mod dependencies;
pub mod diagnostics;
pub mod discovery;
pub mod document;
pub mod font_audit;
pub mod fonts;
pub mod preview;

pub use build::{
    BuildArtifact, BuildError, BuildOptions, BuildRequest, BuildService, parse_fls,
    parse_fls_with_cwd,
};
pub use dependencies::{MAX_TRACKED_FILE_BYTES, ProjectDependencySnapshot};
pub use diagnostics::{BuildDiagnostic, Severity, extract_diagnostics};
pub use discovery::{
    PackageProbe, TexDistribution, TexEngineIdentity, TexEnvironment, find_executable,
    inspect_xelatex,
};
pub use document::Document;
pub use font_audit::{FontIssue, FontIssueKind, FontLogAudit, audit_font_log};
pub use fonts::{
    FigureFonts, FontInputError, missing_glyph_messages, tex_escape_plain_text, validate_font_name,
};
pub use preview::{Preview, PreviewError, render_first_page};
