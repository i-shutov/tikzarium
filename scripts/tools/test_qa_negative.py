"""D04 negative XeLaTeX QA: reject error results from malformed compiler argv.

Pure stdlib, deliberately no Rust/TeX requirement. Regression from I05
Windows Server 2022 Actions 41180076260: '.\\main.tex' is interpreted as
a TeX control sequence and must NOT satisfy an intentionally bad fixture.
"""
from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import patch
import json
import tempfile
import unittest

from qa_smoke import load_manifest, run_case


MACRO = r"\TikzariumIntentionallyUndefinedCommand"
EXPECTED_ERROR = (
    "Build failed: XeLaTeX exited with Some(1): "
    "./main.tex:3: Undefined control sequence.\n"
    "TeX log tail:\nl.3 " + MACRO
)
BROKEN_WINDOWS_OPERAND = (
    "Build failed: XeLaTeX exited with Some(1): Undefined control sequence.\n"
    "TeX log tail:\n! Undefined control sequence.\n<*> .\\main\n"
    "          .tex\nNo pages of output.\n"
)


class NegativeTeXProofTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory()
        self.addCleanup(self.scratch.cleanup)
        self.root = Path(self.scratch.name)
        self.project = self.root / "g08"
        self.project.mkdir()
        (self.project / "main.tex").write_text(
            "\\documentclass{article}\n\\begin{document}\n" +
            MACRO + "\n\\end{document}\n", encoding="utf-8"
        )
        self.out = self.root / "out"
        self.out.mkdir()
        self.case = {
            "id": "g08-intentional-tex-error", "project_dir": "g08",
            "source": "main.tex", "expect": "tex-error", "error_expect": MACRO,
        }

    def run_negative(self, stderr: str, exit_code: int = 3, publish_pdf: bool = False):
        proc = CompletedProcess(["tikzarium-cli"], exit_code, "", stderr)
        if publish_pdf:
            def fake_command(argv, **_kwargs):
                Path(argv[-1]).write_bytes(b"%PDF-1.7\n" + b"x" * 200 + b"\n%%EOF\n")
                return proc
            mock = fake_command
        else:
            mock = lambda argv, **_kwargs: proc
        with patch("qa_smoke.command", side_effect=mock):
            return run_case(self.root, self.out, self.case, Path("fake-cli"))

    def write_manifest(self, case=None):
        path = self.root / "manifest.json"
        path.write_text(json.dumps({
            "schema_version": 1, "cases": [case or self.case]
        }), encoding="utf-8")
        return path

    def test_real_intentional_undefined_macro_is_accepted(self):
        outcome = self.run_negative(EXPECTED_ERROR)
        self.assertEqual(outcome["status"], "PASS")
        self.assertTrue(all(outcome["error_checks"].values()))
        self.assertTrue(outcome["source_unchanged"])

    def test_windows_bad_argv_undefined_sequence_is_not_accepted(self):
        outcome = self.run_negative(BROKEN_WINDOWS_OPERAND)
        self.assertEqual(outcome["status"], "FAIL")
        self.assertFalse(outcome["error_checks"]["expected_command"])
        self.assertTrue(outcome["error_checks"]["undefined_control_sequence"])
        self.assertTrue(outcome["error_checks"]["no_pdf"])

    def test_wrong_undefined_command_is_not_accepted(self):
        wrong = EXPECTED_ERROR.replace(MACRO, r"\UnrelatedUndefinedCommand")
        outcome = self.run_negative(wrong)
        self.assertEqual(outcome["status"], "FAIL")

    def test_generic_cli_failure_is_not_accepted(self):
        outcome = self.run_negative("XeLaTeX exited: file not found")
        self.assertEqual(outcome["status"], "FAIL")

    def test_unrelated_error_even_with_macro_mentioned_is_not_accepted(self):
        outcome = self.run_negative(
            "XeLaTeX exited: file missing, while reading " + MACRO
        )
        self.assertEqual(outcome["status"], "FAIL")
        self.assertFalse(outcome["error_checks"]["undefined_control_sequence"])

    def test_no_pdf_requirement_is_independent(self):
        outcome = self.run_negative(EXPECTED_ERROR, publish_pdf=True)
        self.assertEqual(outcome["status"], "FAIL")
        self.assertFalse(outcome["error_checks"]["no_pdf"])

    def test_manifest_requires_specific_error_expect(self):
        case = dict(self.case)
        del case["error_expect"]
        with self.assertRaisesRegex(ValueError, "error_expect"):
            load_manifest(self.root, self.write_manifest(case))

    def test_manifest_rejects_error_command_not_in_fixture_source(self):
        case = dict(self.case, error_expect=r"\UnknownUndefinedCommand")
        with self.assertRaisesRegex(ValueError, "not present in source"):
            load_manifest(self.root, self.write_manifest(case))

    def test_manifest_disallows_negative_expectation_on_positive_fixture(self):
        case = dict(self.case, expect="pdf")
        with self.assertRaisesRegex(ValueError, "only allowed for tex-error"):
            load_manifest(self.root, self.write_manifest(case))


if __name__ == "__main__":
    unittest.main()
