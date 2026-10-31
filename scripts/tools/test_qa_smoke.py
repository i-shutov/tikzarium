"""Pure-stdlib tests of fixture validation without TeX or Rust toolchains."""
import json
from subprocess import CompletedProcess
from unittest.mock import patch
from pathlib import Path
import tempfile
import unittest

from qa_smoke import checked_child, inspect_pdf, load_manifest, run_case, source_snapshot


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

    def test_source_snapshot_detects_mutation_not_aux(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            original = root / "main.tex"
            original.write_text("before", encoding="utf-8")
            before = source_snapshot(root)
            (root / "main.aux").write_text("temporary", encoding="utf-8")
            self.assertEqual(before, source_snapshot(root))
            original.write_text("after", encoding="utf-8")
            self.assertNotEqual(before, source_snapshot(root))

    def test_manifest_rejects_malformed_cases(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({"schema_version": 1, "cases": [
                {"id": "bad", "source": 12, "project_dir": ".", "expect": "pdf"}
            ]}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "non-string"):
                load_manifest(root, manifest)

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


    def test_windows_pdf_text_is_explicit_utf8_not_ansi_codepage(self):
        """Reproduce Windows Server D#9 red: correct PDF, wrong implicit cp1252 decode."""
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "unicode.pdf"
            path.write_bytes(b"%PDF-1.7\n" + b"x" * 160 + b"\n%%EOF\n")
            text = "Тест XeLaTeX и Unicode. Кириллица."
            response = CompletedProcess(["pdftotext"], 0, text.encode("utf-8"), b"")
            with patch("qa_smoke.shutil.which", side_effect=lambda x: "pdftotext.exe" if x == "pdftotext" else None):
                with patch("qa_smoke.subprocess.run", return_value=response) as invoked:
                    valid, info = inspect_pdf(path, None, [text, "Кириллица."])
            self.assertTrue(valid)
            self.assertTrue(info["text_found"])
            self.assertEqual(info["text_extraction_preview"], text)
            args, kwargs = invoked.call_args
            self.assertEqual(args[0][1:3], ["-enc", "UTF-8"])
            self.assertNotIn("text", kwargs)  # byte-mode, never locale-dependent

    def test_unicode_check_fails_closed_without_pdftotext(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "no-tool.pdf"
            path.write_bytes(b"%PDF-1.7\n" + b"x" * 160 + b"\n%%EOF\n")
            with patch("qa_smoke.shutil.which", return_value=None):
                valid, info = inspect_pdf(path, None, "Кириллица")
            self.assertFalse(valid)
            self.assertFalse(info["text_found"])
            self.assertFalse(info["text_extraction_checked"])

    def test_invalid_utf8_extraction_is_a_failure_not_a_glyph_pass(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "invalid.pdf"
            path.write_bytes(b"%PDF-1.7\n" + b"x" * 160 + b"\n%%EOF\n")
            response = CompletedProcess(["pdftotext"], 0, b"\xff\xfe", b"")
            with patch("qa_smoke.shutil.which", side_effect=lambda x: "pdftotext.exe" if x == "pdftotext" else None):
                with patch("qa_smoke.subprocess.run", return_value=response):
                    valid, info = inspect_pdf(path, None, "Кириллица")
            self.assertFalse(valid)
            self.assertIn("text_decode_error", info)

    def test_font_embedding_probe_does_not_call_unavailable_tools(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "embedded.pdf"
            path.write_bytes(b"%PDF-1.7\n" + b"x" * 160 + b"\n%%EOF\n")
            sample = (
                "name type encoding emb sub uni object ID\n"
                "-------------------------------------------\n"
                "XYZ+DejaVuSerif CID TrueType Identity-H yes yes yes 5 0\n"
                "XYZ+LatinModernMath-Regular-Identity-H CID Type 0C Identity-H yes yes yes 7 0\n"
            ).encode("utf-8")
            response = CompletedProcess(["pdffonts"], 0, sample, b"")
            with patch("qa_smoke.shutil.which", side_effect=lambda x: "pdffonts" if x == "pdffonts" else None):
                with patch("qa_smoke.subprocess.run", return_value=response):
                    valid, info = inspect_pdf(path, None, font_expect=["DejaVuSerif", "LatinModernMath"])
            self.assertTrue(valid)
            self.assertEqual(info["font_embedded"], {"DejaVuSerif": True, "LatinModernMath": True})

    def test_manifest_rejects_unchecked_glyph_options(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "fixture").mkdir()
            (root / "fixture" / "main.tex").write_text("Hello", encoding="utf-8")
            case = {"id": "g00-font", "project_dir": "fixture", "source": "main.tex",
                    "expect": "pdf", "text_expect": [], "font_expect": "not-a-list"}
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({"schema_version": 1, "cases": [case]}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Invalid text_expect"):
                load_manifest(root, manifest)


    def test_known_font_limit_is_visible_not_a_false_pass(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project = root / "legacy"
            output = root / "artifacts"
            project.mkdir()
            output.mkdir()
            (project / "main.tex").write_text("fontspec", encoding="utf-8")
            case = {"id": "g00-legacy-cyrillic-pdf-only", "project_dir": "legacy",
                    "source": "main.tex", "expect": "pdf",
                    "known_limitation": "Upstream OS font family absent"}
            stderr = 'The font "DejaVu Serif" cannot be found'
            proc = CompletedProcess(["tikzarium-cli"], 3, "", stderr)
            with patch("qa_smoke.command", return_value=proc):
                result = run_case(root, output, case, Path("dummy-cli"))
            self.assertEqual(result["status"], "KNOWN_LIMITATION")
            self.assertEqual(result["observed_status"], "FAIL")
            self.assertEqual(result["exit_code"], 3)
            self.assertTrue(result["source_unchanged"])

    def test_known_font_limit_cannot_mask_unrelated_tex_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project = root / "legacy"
            output = root / "artifacts"
            project.mkdir()
            output.mkdir()
            (project / "main.tex").write_text("fontspec", encoding="utf-8")
            case = {"id": "g00-legacy-cyrillic-pdf-only", "project_dir": "legacy",
                    "source": "main.tex", "expect": "pdf",
                    "known_limitation": "Upstream OS font family absent"}
            proc = CompletedProcess(["tikzarium-cli"], 3, "", "Unexpected undefined control sequence")
            with patch("qa_smoke.command", return_value=proc):
                result = run_case(root, output, case, Path("dummy-cli"))
            self.assertEqual(result["status"], "FAIL")
            self.assertNotIn("observed_status", result)



if __name__ == "__main__":
    unittest.main()
