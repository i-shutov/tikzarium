"""C03 regression tests: audit actual output bytes, not only claimed TOML verdicts."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from run_smoke import SOURCES, write_record
from verify_smoke import audit, sha256


class EvidenceAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "result"
        self.root.mkdir()
        self.fixtures = Path(self.temp.name) / "fixtures"
        self.fixtures.mkdir()
        self.names = list(SOURCES)
        for name in self.names:
            (self.fixtures / f"{name}.tex").write_text(
                "\\documentclass{standalone}\n" + name + "\n", encoding="utf-8")
        self.emit()

    def emit(self, names=None):
        names = self.names if names is None else names
        for directory in self.root.iterdir():
            if directory.is_dir():
                for child in directory.iterdir():
                    child.unlink()
                directory.rmdir()
        records = []
        for name in names:
            directory = self.root / name
            directory.mkdir()
            console = directory / "console.log"
            texlog = directory / f"{name}.log"
            negative = name == "graphdrawing-lua"
            console.write_text("Need to run LuaTeX to use the graph drawing library"
                               if negative else "XeLaTeX completed", encoding="utf-8")
            texlog.write_text("test TeX log", encoding="utf-8")
            data = {
                "schema_version": 1, "fixture_id": name, "manifest_id": SOURCES[name],
                "tested_engine": "xelatex", "host_os": "Linux", "host_arch": "x86_64",
                "host_release": "6.12", "runner_kind": "local_unattested",
                "tex_version": "XeTeX 3.14", "source_sha256": sha256(self.fixtures / f"{name}.tex"),
                "log_sha256": sha256(console), "tex_log_sha256": sha256(texlog),
                "exit_code": 1 if negative else 0,
                "verdict": "expected_engine_error" if negative else "rendered_pdf",
                "source_preserved": True, "elapsed_ms": 40,
            }
            if not negative:
                pdf = directory / f"{name}.pdf"
                pdf.write_bytes(b"%PDF-1.7\n" + b"A" * 60 + b"\n%%EOF\n")
                data["pdf_sha256"] = sha256(pdf)
                data["pages"] = 1
            write_record(directory / "observation.toml", data)
            records.append({"fixture_id": name, "verdict": data["verdict"]})
        self.summary = {"schema_version": 1, "compiler_version": "XeTeX 3.14",
                        "fixture_results": records, "accepted": True}
        self.save_summary()

    def save_summary(self):
        (self.root / "summary.json").write_text(json.dumps(self.summary), encoding="utf-8")

    def verify(self, **kwargs):
        with patch("verify_smoke.subprocess.run", return_value=subprocess.CompletedProcess(
            args=[], returncode=0, stdout="Pages: 1\n", stderr="")):
            return audit(self.root, self.fixtures, "/fake/pdfinfo", **kwargs)

    def test_full_five_consistent_observations(self):
        result = self.verify()
        self.assertTrue(result["accepted"], result["errors"])
        self.assertTrue(result["complete_suite"])
        self.assertEqual(result["verified_fixtures"], 5)

    def test_partial_is_never_full_suite(self):
        self.emit(["core"])
        self.assertFalse(self.verify()["accepted"])
        partial = self.verify(allow_partial=True)
        self.assertTrue(partial["accepted"])
        self.assertFalse(partial["complete_suite"])
        self.assertEqual(partial["scope"], "selected_only")

    def test_modified_fixture_source_is_detected(self):
        (self.fixtures / "core.tex").write_text("modified", encoding="utf-8")
        result = self.verify()
        self.assertFalse(result["accepted"])
        self.assertIn("source_sha256", str(result["errors"]))

    def test_modified_log_is_detected(self):
        (self.root / "core" / "console.log").write_text("tampered", encoding="utf-8")
        result = self.verify()
        self.assertFalse(result["accepted"])
        self.assertIn("log_sha256", str(result["errors"]))

    def test_unexpected_negative_error_is_rejected_even_if_hashes_match(self):
        directory = self.root / "graphdrawing-lua"
        console = directory / "console.log"
        console.write_text("unrelated TeX failure", encoding="utf-8")
        record = directory / "observation.toml"
        record.write_text(record.read_text().replace(
            sha256_for_text("Need to run LuaTeX to use the graph drawing library"), sha256(console)))
        result = self.verify()
        self.assertFalse(result["accepted"])
        self.assertIn("expected engine error", str(result["errors"]))

    def test_summary_tampering_is_detected(self):
        self.summary["fixture_results"][0]["verdict"] = "failed"
        self.save_summary()
        self.assertFalse(self.verify()["accepted"])
        self.assertIn("summary observation", str(self.verify()["errors"]))

    def test_duplicate_names_are_rejected(self):
        self.summary["fixture_results"].append(self.summary["fixture_results"][0])
        self.save_summary()
        self.assertFalse(self.verify()["accepted"])

    def test_pdf_page_count_must_be_rechecked(self):
        with patch("verify_smoke.subprocess.run", return_value=subprocess.CompletedProcess(
            args=[], returncode=0, stdout="Pages: 2\n", stderr="")):
            result = audit(self.root, self.fixtures, "/fake/pdfinfo")
        self.assertFalse(result["accepted"])
        self.assertIn("exactly one page", str(result["errors"]))

    def test_symlinked_observation_is_rejected(self):
        src = self.root / "core" / "observation.toml"
        copy = self.root / "saved.toml"
        copy.write_bytes(src.read_bytes())
        src.unlink()
        try:
            src.symlink_to(copy)
        except (OSError, NotImplementedError):
            self.skipTest("symlink creation not allowed on this host")
        result = self.verify()
        self.assertFalse(result["accepted"])
        self.assertIn("symlinked", str(result["errors"]))

    def test_mixed_environment_is_rejected(self):
        record = self.root / "core" / "observation.toml"
        record.write_text(record.read_text().replace('host_arch = "x86_64"',
                                                   'host_arch = "arm64"'))
        result = self.verify()
        self.assertFalse(result["accepted"])
        self.assertIn("mixed host", str(result["errors"]))


def sha256_for_text(value):
    import hashlib
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    unittest.main()
