"""Negative controls for fail-closed PDF embedded-font proof (D ownership).

These tests do not claim to open a GUI or prove host font availability.
"""
from pathlib import Path
import tempfile
import unittest
from subprocess import CompletedProcess
from unittest.mock import patch

from qa_smoke import inspect_pdf


class FontRecordTests(unittest.TestCase):
    def inspect_with_records(self, rows: str, family: str = "DejaVuSerif", exit_code: int = 0):
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "controlled.pdf"
            pdf.write_bytes(b"%PDF-1.7\n" + b"a" * 180 + b"\n%%EOF\n")
            header = "name type encoding emb sub uni object ID\n" + "-" * 80 + "\n"
            process = CompletedProcess(
                ["pdffonts", str(pdf)], exit_code, (header + rows).encode("utf-8"), b"",
            )
            with patch("qa_smoke.shutil.which", side_effect=lambda name: "pdffonts" if name == "pdffonts" else None):
                with patch("qa_smoke.subprocess.run", return_value=process):
                    return inspect_pdf(pdf, None, font_expect=[family])

    def test_expected_subset_family_embedded(self):
        valid, evidence = self.inspect_with_records(
            "ABCDEF+DejaVuSerif CID TrueType Identity-H yes yes yes 7 0\n"
        )
        self.assertTrue(valid)
        self.assertTrue(evidence["font_embedded"]["DejaVuSerif"])
        self.assertEqual(evidence["font_records_count"], 1)

    def test_expected_regular_suffix_embedded(self):
        valid, _ = self.inspect_with_records(
            "ABCDEF+LatinModernMath-Regular-Identity-H CID Type 0C Identity-H yes yes yes 6 0\n",
            family="LatinModernMath",
        )
        self.assertTrue(valid)

    def test_nonembedded_expected_font_does_not_match_other_embedded_font(self):
        valid, evidence = self.inspect_with_records(
            "ABCDEF+DejaVuSerif CID TrueType Identity-H no no yes 7 0\n"
            "GHIJKL+DejaVuSans CID TrueType Identity-H yes yes yes 9 0\n"
        )
        self.assertFalse(valid)
        self.assertFalse(evidence["font_embedded"]["DejaVuSerif"])

    def test_embedded_similarly_named_font_does_not_count(self):
        valid, evidence = self.inspect_with_records(
            "ABCDEF+DejaVuSerifFake CID TrueType Identity-H yes yes yes 7 0\n"
            "GHIJKL+NotDejaVuSerif CID TrueType Identity-H yes yes yes 9 0\n"
        )
        self.assertFalse(valid)
        self.assertFalse(evidence["font_embedded"]["DejaVuSerif"])

    def test_unparseable_font_records_fail_closed(self):
        valid, evidence = self.inspect_with_records("a malformed line without PDF font columns\n")
        self.assertFalse(valid)
        self.assertEqual(evidence["font_records_count"], 0)

    def test_nonzero_pdffonts_exit_fails_even_with_valid_looking_rows(self):
        valid, evidence = self.inspect_with_records(
            "ABCDEF+DejaVuSerif CID TrueType Identity-H yes yes yes 7 0\n",
            exit_code=1,
        )
        self.assertFalse(valid)
        self.assertTrue(evidence["font_embedded"]["DejaVuSerif"])


if __name__ == "__main__":
    unittest.main()
