from __future__ import annotations

import json
from dataclasses import replace
import hashlib
import tempfile
import unittest
from pathlib import Path

from scripts import qa_pgfplots_clean_derivatives as clean


class CleanDerivativeTests(unittest.TestCase):
    def test_checked_in_inventory_is_attributed_and_byte_exact(self) -> None:
        manifest = clean.verify()
        self.assertEqual(manifest["manifest_kind"], "PGFPLOTS_CLEAN_DERIVATIVES_V1")
        self.assertEqual([entry["name"] for entry in manifest["derivatives"]], list(clean.SPECS))
        for name, spec in clean.SPECS.items():
            evidence = clean.fixture_evidence(name)
            original = evidence["original_bytes"]
            derived = evidence["derived_bytes"]
            entry = evidence["manifest"]
            self.assertEqual(entry["corpus_status"], "NOT_ORIGINAL_CORPUS")
            self.assertEqual(clean.sha256(original), spec.original_sha256)
            self.assertEqual(len(original) - len(derived), 2)
            self.assertEqual(entry["byte_difference_count"], 2)
            self.assertEqual(len(entry["removed_bytes"]), 2)
            self.assertEqual([r["expected_bytes_ascii"] for r in entry["removed_bytes"]], [";", ";"])
            self.assertTrue(all(r["context_before_hex"] and r["context_after_hex"] for r in entry["removed_bytes"]))
            self.assertEqual(clean.sha256(derived), entry["derived_sha256"])
            self.assertNotIn(b"NOT_ORIGINAL_CORPUS", derived)

    def test_changed_original_hash_is_rejected(self) -> None:
        spec = clean.SPECS["SV-003-clean"]
        with self.assertRaisesRegex(ValueError, "Pinned original hash mismatch"):
            clean.derive_bytes(spec, b"\n" + clean._original_bytes(spec))

    def test_wrong_definition_line_and_wrong_removal_count_fail_closed(self) -> None:
        spec = clean.SPECS["SV-029-clean"]
        original = clean._original_bytes(spec)
        with self.assertRaisesRegex(ValueError, "Pinned original hash mismatch"):
            clean.derive_bytes(spec, original.replace(b"\\def\\ql{-1};", b"\\def\\ql{-2};", 1))
        with self.assertRaisesRegex(ValueError, "Pinned original hash mismatch"):
            clean.derive_bytes(spec, original.replace(b"\\def\\qr{1};", b"\\def\\qr{1};;", 1))

    def test_anchor_cardinality_guards_are_reached_with_test_only_pinned_inputs(self) -> None:
        spec = clean.SPECS["SV-029-clean"]
        original = clean._original_bytes(spec)
        # UNIT-only alternate specs pin synthetic inputs so the test reaches
        # the anchor guard rather than stopping at the production SHA guard.
        missing = original.replace(b"  \\def\\ql{-1};\n", b"  \\def\\ql{-2};\n", 1)
        missing_spec = replace(spec, original_sha256=hashlib.sha256(missing).hexdigest())
        with self.assertRaisesRegex(ValueError, "exactly one anchored definition line"):
            clean.derive_bytes(missing_spec, missing)

        anchored_line = spec.removals[0].expected_line
        duplicate = original + anchored_line
        duplicate_spec = replace(spec, original_sha256=hashlib.sha256(duplicate).hexdigest())
        with self.assertRaisesRegex(ValueError, "exactly one anchored definition line"):
            clean.derive_bytes(duplicate_spec, duplicate)

    def test_unknown_derivative_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unknown clean derivative"):
            clean.fixture_evidence("SV-003")

    def test_verify_rejects_tampered_source_manifest_and_inventory(self) -> None:
        expected, _ = clean.expected_files()
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            for filename, contents in expected.items():
                (directory / filename).write_bytes(contents)
            clean.verify(directory)

            source = directory / "SV-003-clean.tex"
            source.write_bytes(source.read_bytes() + b"% drift\n")
            with self.assertRaisesRegex(ValueError, "Derivative or manifest mismatch"):
                clean.verify(directory)
            source.write_bytes(expected["SV-003-clean.tex"])

            manifest_path = directory / clean.MANIFEST_NAME
            document = json.loads(manifest_path.read_text())
            document["derivatives"][0]["corpus_status"] = "PASS"
            manifest_path.write_text(json.dumps(document, indent=2) + "\n")
            with self.assertRaisesRegex(ValueError, "Derivative or manifest mismatch"):
                clean.verify(directory)
            manifest_path.write_bytes(expected[clean.MANIFEST_NAME])

            (directory / "unexpected.tex").write_bytes(b"x")
            with self.assertRaisesRegex(ValueError, "file inventory mismatch"):
                clean.verify(directory)

            (directory / "unexpected.tex").unlink()
            (directory / "unexpected-directory").mkdir()
            with self.assertRaisesRegex(ValueError, "file inventory mismatch"):
                clean.verify(directory)

    def test_generate_refuses_unexpected_existing_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            (directory / "keep.txt").write_text("unrelated")
            with self.assertRaisesRegex(ValueError, "unexpected files"):
                clean.generate(directory)
            self.assertEqual((directory / "keep.txt").read_text(), "unrelated")
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            (directory / "nested").mkdir()
            with self.assertRaisesRegex(ValueError, "unexpected files"):
                clean.generate(directory)


if __name__ == "__main__":
    unittest.main()
