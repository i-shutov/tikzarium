"""Pure-stdlib tests of fixture validation without TeX or Rust toolchains."""
import json
from pathlib import Path
import tempfile
import unittest

from qa_smoke import checked_child, inspect_pdf, load_manifest


class FixtureHarnessTests(unittest.TestCase):
    def test_rejects_traversal_and_absolute_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for value in ("../secret.tex", "/tmp/file.tex", "a/../../secret.tex"):
                with self.subTest(value=value), self.assertRaises(ValueError):
                    checked_child(root, value)

    def test_pdf_header_eof_and_hash_validation(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "a.pdf"
            path.write_bytes(b"%PDF-1.4\n" + b"a" * 120 + b"\n%%EOF\n")
            passed, data = inspect_pdf(path, None)
            self.assertTrue(passed)
            self.assertEqual(len(data["sha256"]), 64)
            path.write_bytes(b"%PDF-1.4\n" + b"a" * 140)
            passed, _ = inspect_pdf(path, None)
            self.assertFalse(passed)

    def test_manifest_rejects_duplicates(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "fixtures").mkdir()
            (root / "fixtures" / "main.tex").write_text("test", encoding="utf-8")
            case = {"id": "g00-a", "project_dir": "fixtures", "source": "main.tex", "expect": "pdf"}
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({"schema_version": 1, "cases": [case, case]}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Duplicate"):
                load_manifest(root, manifest)


if __name__ == "__main__":
    unittest.main()
