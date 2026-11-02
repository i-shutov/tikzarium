"""I56 negative contract tests: C-owned four-library real XeLaTeX fixture runner."""
from pathlib import Path
import unittest
import tomllib

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "scripts" / "qa_n2_four_library_pdf.sh"
CATALOGUE = ROOT / "extensions" / "primitives" / "catalog-v1.toml"
WORKFLOW = ROOT / ".github" / "workflows" / "n1-authoring.yml"

class N2FourLibraries(unittest.TestCase):
    def test_examples_are_from_one_real_c_catalogue(self):
        spec = tomllib.loads(CATALOGUE.read_text(encoding="utf-8"))
        names = [item["name"] for item in spec["libraries"]]
        self.assertEqual(names, ["arrows.meta", "positioning", "calc", "fit"])
        source = SOURCE.read_text(encoding="utf-8")
        self.assertIn("for name in arrows.meta positioning calc fit;", source)
        self.assertIn("--bin n2-library-fixture", source)
        self.assertNotIn("cat > ", source)
        self.assertNotIn("printf '\\\\documentclass", source)
    def test_independent_real_engine_and_pdf_proof(self):
        source = SOURCE.read_text(encoding="utf-8")
        for required in ("-no-shell-escape", "xelatex -interaction=nonstopmode",
                         "pdfinfo", "pdffonts", "pdftotext", "pdftoppm",
                         "sha256sum -c source-before.sha256", "kpsewhich tikz.sty"):
            self.assertIn(required, source)
        for forbidden in ("tlmgr install", "mpm --install", "curl ", "wget ", "lualatex ",
                          "pdflatex ", "tectonic "):
            self.assertNotIn(forbidden, source)
    def test_workflow_proves_same_exact_branch_and_postmerge(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("branches: [main]", workflow)
        self.assertIn("scripts/qa_n2_four_library_pdf.sh", workflow)
        self.assertIn("test_qa_n2_four_libs.py", workflow)
        self.assertIn("N2 four original C catalogue libraries", workflow)

if __name__ == "__main__":
    unittest.main()
