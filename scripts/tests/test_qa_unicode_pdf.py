"""Offline tests for the PDF Unicode gate; no TeX installation required."""

import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / "qa_unicode_pdf.py"
SPEC = importlib.util.spec_from_file_location("qa_unicode_pdf", MODULE)
assert SPEC and SPEC.loader
qa = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(qa)


class UnicodePdfAuditTests(unittest.TestCase):
    def test_canonical_unicode_and_whitespace(self):
        self.assertEqual(qa.normalize_text("  И\u0306  \n  Точка\t"), "Й Точка")

    def test_missing_cyrillic_does_not_pass_latin_only_pdf(self):
        missing = qa.missing_fragments("XeLaTeX Unicode", ["XeLaTeX", "Кириллица", "Точка"])
        self.assertEqual(missing, ["Кириллица", "Точка"])

    def test_wrap_and_combining_character_are_accepted(self):
        self.assertEqual(qa.missing_fragments("Кириллица.\nТочка. И\u0306", ["Кириллица. Точка.", "Й"]), [])

    def test_invalid_pdf_header_fails_without_poppler(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "not.pdf"
            path.write_bytes(b"plain text pretending to be pdf")
            with self.assertRaisesRegex(ValueError, "Invalid PDF signature"):
                qa.extract_text(path)

    def test_poppler_error_is_not_masked(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "example.pdf"
            path.write_bytes(b"%PDF-1.7\n")
            with patch.object(qa.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, "", "decode error")):
                with self.assertRaisesRegex(ValueError, "pdftotext exit=1"):
                    qa.extract_text(path)

    def test_missing_pdf_is_error(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "does not exist"):
                qa.extract_text(Path(directory) / "missing.pdf")

    def test_cli_saves_extracted_text_even_on_missing_glyph(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "example.pdf"
            output = Path(directory) / "record.txt"
            pdf.write_bytes(b"%PDF-1.7\n")
            with patch.object(qa, "extract_text", return_value="XeLaTeX"):
                self.assertEqual(qa.main([str(pdf), "--expect", "Кириллица", "--extracted-out", str(output)]), 1)
            self.assertEqual(output.read_text(encoding="utf-8"), "XeLaTeX")


if __name__ == "__main__":
    unittest.main()
