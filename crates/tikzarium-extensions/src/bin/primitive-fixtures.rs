//! Emit the canonical six-tool XeLaTeX smoke source to stdout for D/QA.
use tikzarium_extensions::primitives::Catalog;
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let c = Catalog::bundled()?;
    print!("{}", c.fixture_document()?);
    Ok(())
}
