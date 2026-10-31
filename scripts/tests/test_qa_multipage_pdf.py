"""Offline negative controls for exact two-page XeLaTeX/Poppler evidence."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts.qa_multipage_pdf import (
    EvidenceError,
    PNG_SIGNATURE,
    parse_page_count,
    require_distinct_png,
    source_unchanged,
    validate_output_dir,
    verify_page_text,
)


class MultipageEvidenceTests(unittest.TestCase):
    def test_pdfinfo_exact_two_pages(self):
        self.assertEqual(parse_page_count("Title: test\nPages: 2\nPage size: A4"), 2)

    def test_page_count_rejects_missing_zero_and_nonnumeric(self):
        for text in ("", "Pages: 0", "Pages: many", "SubPages: 2", "Pages: -1"):
            with self.subTest(text=text), self.assertRaises(EvidenceError):
                parse_page_count(text)

    def test_page_count_rejects_ambiguous_duplicate_fields(self):
        with self.assertRaises(EvidenceError):
            parse_page_count("Pages: 2\nPages: 4\n")

    def test_unicode_markers_must_be_on_correct_pages(self):
        verify_page_text("First — Привет", "Second — Геометрия", "Привет", "Геометрия")
        with self.assertRaises(EvidenceError):
            verify_page_text("First — Геометрия", "Second — Привет", "Привет", "Геометрия")
        with self.assertRaises(EvidenceError):
            verify_page_text("First — Привет Геометрия", "Second — Геометрия", "Привет", "Геометрия")

    def test_unicode_markers_cannot_be_empty_or_equal(self):
        for first, second in (("", "A"), ("A", ""), ("A", "A")):
            with self.subTest(first=first, second=second), self.assertRaises(EvidenceError):
                verify_page_text("A", "A", first, second)

    def test_png_images_must_be_real_signatures_and_distinct(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            a, b = base / "one.png", base / "two.png"
            a.write_bytes(PNG_SIGNATURE + b"first")
            b.write_bytes(PNG_SIGNATURE + b"second")
            sha_a, sha_b = require_distinct_png(a, b)
            self.assertNotEqual(sha_a, sha_b)
            b.write_bytes(a.read_bytes())
            with self.assertRaises(EvidenceError):
                require_distinct_png(a, b)

    def test_png_must_not_be_empty_or_fake(self):
        with tempfile.TemporaryDirectory() as directory:
            a, b = Path(directory) / "one.png", Path(directory) / "two.png"
            a.write_bytes(PNG_SIGNATURE + b"A")
            b.write_bytes(b"GIF89a")
            with self.assertRaises(EvidenceError):
                require_distinct_png(a, b)
            b.unlink()
            with self.assertRaises(EvidenceError):
                require_distinct_png(a, b)

    def test_teX_source_mutation_is_detected(self):
        import hashlib
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.tex"
            path.write_bytes(b"\\documentclass{article}\n")
            before = hashlib.sha256(path.read_bytes()).hexdigest()
            source_unchanged(path, before)
            path.write_bytes(b"changed")
            with self.assertRaises(EvidenceError):
                source_unchanged(path, before)

    def test_output_cannot_overwrite_or_contain_author_source(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "input.tex"
            source.write_bytes(b"original")
            with self.assertRaises(EvidenceError):
                validate_output_dir(source.parent, source)
            with self.assertRaises(EvidenceError):
                validate_output_dir(source.parent.parent, source)
            safe = Path(directory) / "evidence"
            validate_output_dir(safe, source)
            self.assertTrue(safe.is_dir())
            self.assertEqual(source.read_bytes(), b"original")


if __name__ == "__main__":
    unittest.main()
