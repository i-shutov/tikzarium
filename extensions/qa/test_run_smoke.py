"""Unit tests for C02 evidence runner (no TeX installation necessary)."""
from pathlib import Path
import tempfile
import unittest

from run_smoke import verdict, valid_pdf, write_record


class FixtureRunnerTests(unittest.TestCase):
    def test_positive_needs_pdf_page_source_and_glyphs(self):
        args = dict(
            negative=False, exit_code=0, pdf_valid=True, page_count=1,
            log_text="", source_preserved=True,
        )
        self.assertEqual(verdict(**args), "rendered_pdf")
        for change in (
            {"exit_code": 1}, {"pdf_valid": False}, {"page_count": None},
            {"page_count": 2}, {"source_preserved": False},
            {"log_text": "Missing character: There is no й"},
        ):
            self.assertEqual(verdict(**(args | change)), "failed")

    def test_lua_negative_requires_specific_diagnostic(self):
        args = dict(
            negative=True, exit_code=1, pdf_valid=False, page_count=None,
            log_text="Need to run LuaTeX to use the graph \ndrawing library",
            source_preserved=True,
        )
        self.assertEqual(verdict(**args), "expected_engine_error")
        for change in (
            {"exit_code": 0}, {"pdf_valid": True},
            {"log_text": "Some unrelated TeX error"},
        ):
            self.assertEqual(verdict(**(args | change)), "failed")

    def test_pdf_header_and_eof_required(self):
        with tempfile.TemporaryDirectory() as temp:
            pdf = Path(temp) / "sample.pdf"
            pdf.write_bytes(b"%PDF-1.7\n" + b"A" * 60 + b"\n%%EOF\n")
            self.assertTrue(valid_pdf(pdf))
            pdf.write_bytes(b"%PDF-1.7\n" + b"A" * 60)
            self.assertFalse(valid_pdf(pdf))

    def test_emitted_record_is_valid_toml(self):
        import tomllib
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "observation.toml"
            write_record(out, {
                "schema_version": 1, "fixture_id": "core",
                "host_os": "Darwin", "source_preserved": True,
                "notes": "кириллица",
            })
            parsed = tomllib.loads(out.read_text(encoding="utf-8"))
            self.assertTrue(parsed["source_preserved"])
            self.assertEqual(parsed["notes"], "кириллица")


if __name__ == "__main__":
    unittest.main()
