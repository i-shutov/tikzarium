from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
import os
import sys

from scripts import qa_pgfplots_clean_isolation as isolation


class CleanIsolationEvidenceTests(unittest.TestCase):
    def test_scope_is_compile_isolation_only(self) -> None:
        self.assertEqual(isolation.SCOPE,
                         "COMPILE_ISOLATION_ORIGINAL_VS_ATTRIBUTED_DERIVATIVE")
        self.assertIn("does not run the Studio GUI", isolation.__doc__ or "")

    def test_two_original_semicolon_warnings_are_the_only_allowed_diagnostics(self) -> None:
        warning = 'Missing character: There is no ; ("3B) in font nullfont!'
        result = isolation.classify_diagnostics("\n".join([warning, warning]), "original")
        self.assertTrue(result["acceptable"])
        self.assertEqual(result["target_warning_count"], 2)
        self.assertEqual(result["other_warning_lines"], [])
        too_many = isolation.classify_diagnostics("\n".join([warning, warning, warning]), "original")
        self.assertFalse(too_many["acceptable"])
        too_few = isolation.classify_diagnostics(warning, "original")
        self.assertFalse(too_few["acceptable"])

    def test_clean_accepts_no_target_warning_and_handles_unicode_codepoint_spelling(self) -> None:
        self.assertTrue(isolation.classify_diagnostics("No warnings.\n", "clean")["acceptable"])
        codepoint = "Missing character: There is no ; (U+003B) in font nullfont!"
        self.assertEqual(len(isolation.extract_expected_warning_lines(codepoint)), 1)
        self.assertFalse(isolation.classify_diagnostics(codepoint, "clean")["acceptable"])

    def test_unrelated_warning_or_fatal_error_is_rejected(self) -> None:
        warning = 'Missing character: There is no ; ("3B) in font nullfont!'
        log = warning + "\nLaTeX Warning: Reference `axis:1' undefined.\n"
        result = isolation.classify_diagnostics(log, "original")
        self.assertFalse(result["acceptable"])
        self.assertEqual(len(result["other_warning_lines"]), 1)
        fatal = isolation.classify_diagnostics("! Undefined control sequence.\n", "clean")
        self.assertFalse(fatal["acceptable"])
        self.assertEqual(fatal["fatal_lines"], ["! Undefined control sequence."])

    def test_bad_variant_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "variant must be"):
            isolation.classify_diagnostics("", "synthetic")

    def test_one_page_raster_comparison_requires_exact_hash_and_dimensions(self) -> None:
        a = {"sha256": "a" * 64, "width": 900, "height": 1200,
             "exit_code": 0, "timed_out": False}
        self.assertTrue(isolation.compare_pdf_pages(1, 1, a, dict(a))["render_equal_byte_for_byte"])
        changed_hash = {**a, "sha256": "b" * 64}
        changed_dimensions = {**a, "width": 901}
        self.assertFalse(isolation.compare_pdf_pages(1, 1, a, changed_hash)["render_equal_byte_for_byte"])
        self.assertFalse(isolation.compare_pdf_pages(1, 1, a, changed_dimensions)["render_equal_byte_for_byte"])
        self.assertFalse(isolation.compare_pdf_pages(1, 2, a, dict(a))["one_page_each"])
        failed_renderer = {**a, "exit_code": 1}
        self.assertFalse(isolation.compare_pdf_pages(1, 1, failed_renderer, failed_renderer)["render_equal_byte_for_byte"])
        invalid_dimensions = {**a, "height": 0, "exit_code": 0}
        self.assertFalse(isolation.compare_pdf_pages(1, 1, invalid_dimensions, invalid_dimensions)["render_equal_byte_for_byte"])

    def test_job_name_is_fixed_for_retained_tex_outputs(self) -> None:
        argv = isolation.xelatex_argv("/usr/bin/xelatex", Path("/tmp/out"), Path("/tmp/input.tex"))
        self.assertIn("-jobname=source", argv)
        self.assertIn("-recorder", argv)
        self.assertEqual(argv[-1], "/tmp/input.tex")

    def test_missing_postbuild_artifacts_fail_cleanly_instead_of_crashing(self) -> None:
        status, comparison = isolation.assess_pair({"status": "FAIL"}, {"status": "FAIL"})
        self.assertEqual(status, "FAIL")
        self.assertFalse(comparison["render_equal_byte_for_byte"])
        self.assertFalse(comparison["all_fonts_embedded"])

    def test_pdf_font_audit_requires_every_record_embedded(self) -> None:
        table = ("name type encoding emb sub uni object ID\n"
                 "------------------------------------\n"
                 "ABCDEF+CharisSIL-Regular Type 1C WinAnsi yes yes yes 6 0\n")
        good = isolation.audit_embedded_fonts(table)
        self.assertTrue(good["all_embedded"])
        bad = isolation.audit_embedded_fonts(table.replace("yes yes yes", "no yes yes"))
        self.assertFalse(bad["all_embedded"])
        self.assertEqual(len(bad["nonembedded_rows"]), 1)
        self.assertFalse(isolation.audit_embedded_fonts("name type emb sub uni object ID\n--\n")["all_embedded"])

    def test_recorder_must_bind_the_exact_requested_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            actual = root / "source.tex"
            actual.write_bytes(b"exact source")
            fls = root / "source.fls"
            fls.write_text(f"INPUT {actual}\nINPUT /texlive/tex/latex/base/article.cls\n")
            bound = isolation._fls_inputs(fls, actual)
            self.assertTrue(bound["source_bound"])
            self.assertEqual(bound["source_sha256"], isolation.sha256(b"exact source"))
            self.assertEqual(bound["source_match_count"], 1)
            fls.write_text(f"PWD {root}\nINPUT ./source.tex\nINPUT {actual}\n")
            repeated = isolation._fls_inputs(fls, actual)
            self.assertTrue(repeated["source_bound"])
            self.assertEqual(repeated["source_match_count"], 2)
            self.assertEqual(repeated["source_sha256"], bound["source_sha256"])
            self.assertEqual(bound["input_count"], 2)
            other = root / "other.tex"
            other.write_bytes(b"wrong source")
            unbound = isolation._fls_inputs(fls, other)
            self.assertFalse(unbound["source_bound"])
            # A hostile/mismatched PWD must override the .fls file's parent.
            fls.write_text("PWD /definitely/not/the/source-directory\nINPUT ./source.tex\n")
            self.assertFalse(isolation._fls_inputs(fls, actual)["source_bound"])

    def test_expected_source_must_match_copy_after_build_and_recorder_hash(self) -> None:
        expected = b"pinned input"
        bound = {"source_bound": True, "source_sha256": isolation.sha256(expected)}
        self.assertTrue(isolation.assess_source_integrity(expected, expected, bound)["ok"])
        changed_file = isolation.assess_source_integrity(expected, b"modified input", bound)
        self.assertFalse(changed_file["ok"])
        self.assertFalse(changed_file["source_file_matches_expected"])
        changed_recorder = {"source_bound": True, "source_sha256": isolation.sha256(b"other input")}
        changed_input = isolation.assess_source_integrity(expected, expected, changed_recorder)
        self.assertFalse(changed_input["ok"])
        self.assertFalse(changed_input["recorder_input_matches_expected"])

    @unittest.skipUnless(os.name == "posix", "process-group timeout contract is POSIX-specific")
    def test_timeout_kills_process_group_and_keeps_partial_console(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            child = "import time; print('child-started', flush=True); time.sleep(30)"
            parent = ("import subprocess, sys, time; "
                      f"subprocess.Popen([sys.executable, '-c', {child!r}]); "
                      "print('parent-started', flush=True); time.sleep(30)")
            result = isolation._run([sys.executable, "-c", parent], Path(tmp), 0.2)
            self.assertTrue(result["timed_out"])
            self.assertIsNone(result["exit_code"])
            self.assertIn(b"parent-started", result["console_bytes"])

    def test_tool_version_record_includes_real_binary_hash(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            record = isolation._tool_version("python3", Path(tmp), 5, ["--version"])
            self.assertTrue(record["available"])
            self.assertTrue(Path(record["binary_realpath"]).is_file())
            self.assertEqual(len(record["binary_sha256"]), 64)

    def test_png_dimension_reader_rejects_non_png_and_reads_ihdr(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "render.png"
            path.write_bytes(b"not a png")
            self.assertIsNone(isolation._png_dimensions(path))
            header = (b"\x89PNG\r\n\x1a\n" + (13).to_bytes(4, "big") + b"IHDR"
                      + (1500).to_bytes(4, "big") + (1000).to_bytes(4, "big") + b"\x08\x02\x00\x00\x00")
            path.write_bytes(header)
            self.assertEqual(isolation._png_dimensions(path), (1500, 1000))


if __name__ == "__main__":
    unittest.main()
