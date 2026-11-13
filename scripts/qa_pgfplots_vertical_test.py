#!/usr/bin/env python3
"""UNIT_EVENT contracts and hostile evidence checks, never native acceptance."""
from __future__ import annotations

from dataclasses import replace
from pathlib import Path
import tempfile
import unittest

import qa_pgfplots_vertical_evidence as qa
from qa_pgfplots_vertical_x11 import recorder_inputs, RecorderWatcher

try:
    from PIL import Image
except ImportError:
    Image = None


class OperationContracts(unittest.TestCase):
    def test_inventory_covers_all_axis_and_addplot_properties_and_named_musts(self):
        formula = qa.operations("formula")
        self.assertEqual(tuple(op.key for op in formula if op.kind == "axis"), qa.AXIS_KEYS)
        self.assertEqual(tuple(op.key for op in formula if op.kind == "addplot"), qa.ADDPLOT_KEYS)
        self.assertEqual(len(qa.OPERATIONS), 26)
        for name in qa.NAMED_SV[:-1]:
            self.assertEqual(len(qa.operations(name)), 1)
        self.assertEqual(qa.operations("SV-040"), ())

    def test_every_patch_has_exact_inverse_and_preserves_all_unrelated_bytes(self):
        for operation in qa.OPERATIONS:
            with self.subTest(operation=operation.name):
                original = qa.fixture_bytes(operation.fixture)
                patched = operation.patch(original)
                old = (operation.key + "=" + operation.before).encode()
                new = (operation.key + "=" + operation.after).encode()
                self.assertEqual(patched.replace(new, old, 1), original)
                self.assertNotEqual(patched, original)

    def test_ambiguous_or_missing_fixture_literal_is_rejected(self):
        operation = qa.OPERATIONS[0]
        original = qa.fixture_bytes(operation.fixture)
        with self.assertRaisesRegex(ValueError, "unique existing"):
            operation.patch(original + b"samples=41")
        with self.assertRaisesRegex(ValueError, "unique existing"):
            operation.patch(original.replace(b"samples=41", b"samples=42"))
        with self.assertRaisesRegex(ValueError, "unique existing"):
            replace(operation, after=operation.before).patch(original)

    def test_synthetic_inputs_keep_crlf_formula_and_explicit_errorbar_namespace(self):
        for fixture in ("formula", "external-tables"):
            raw = qa.fixture_bytes(fixture)
            self.assertNotIn(b"\n", raw.replace(b"\r\n", b""))
            self.assertIn("Привет α".encode(), raw)
            self.assertIn(rb"\UnexecutedPgfVtwo", raw)
        self.assertIn(b"{exp(-x*x)}", qa.fixture_bytes("formula"))
        table = qa.fixture_bytes("external-tables")
        self.assertIn(b"/pgfplots/error bars/y explicit", table)
        self.assertNotIn(b"/.cd", table)
        self.assertIn(b"table[x=x,y=y,y error=dy] {measurements.dat}", table)
        self.assertIn(b"table[x=x,y=y,col sep=comma] {reference.csv}", table)

    def test_named_sources_are_byte_identical_with_original_declared_font(self):
        for fixture in qa.NAMED_SV:
            original = qa.fixture_path(fixture).read_bytes()
            self.assertEqual(qa.fixture_bytes(fixture), original)
            self.assertIn(b"{Charis SIL}", original)
        self.assertEqual([name for name, _ in qa.expected_sequence("SV-040")], ["opened", "reopened", "built"])


@unittest.skipIf(Image is None, "Already installed Pillow required for original screenshot contracts")
class OriginalEvidenceContracts(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.out = self.root / "evidence"
        qa.prepare(self.out)
        self.image = self.root / "unit-only-original.png"
        Image.new("RGB", qa.SCREEN, (18, 25, 39)).save(self.image)
        self.editor = self.root / "unit-only-editor.txt"
        self.fixture = "external-tables"
        self.source = self.out / "live" / self.fixture / (self.fixture + ".tex")

    def tearDown(self):
        self.temporary.cleanup()

    def capture(self, stage="opened", raw=None):
        if raw is not None:
            self.source.write_bytes(raw)
        self.editor.write_bytes(self.source.read_bytes())
        return qa.record(self.out, self.fixture, stage, self.source, self.editor, self.image,
                         action="UNIT_EVENT synthetic observation; NO native GUI")

    def metadata(self):
        return self.out / "observed" / self.fixture / "opened/stage.json"

    def test_wrong_source_is_preserved_before_failure(self):
        with self.assertRaisesRegex(ValueError, "Unexpected source bytes"):
            self.capture(raw=b"wrong revision")
        retained = self.metadata().parent / "source.tex"
        self.assertEqual(retained.read_bytes(), b"wrong revision")
        self.assertTrue((self.metadata().parent / "desktop.original.png").is_file())

    def test_changed_resource_is_preserved_and_rejected(self):
        (self.source.parent / "measurements.dat").write_bytes(b"x y\n0 999\n")
        with self.assertRaisesRegex(ValueError, "Dependency metadata changed"):
            self.capture()
        self.assertEqual((self.metadata().parent / "measurements.dat").read_bytes(), b"x y\n0 999\n")

    def test_stage_cannot_be_overwritten(self):
        self.capture()
        with self.assertRaises(FileExistsError):
            self.capture()

    def test_identity_timezone_and_observed_document_path_must_match(self):
        self.capture()
        original = qa.read_json(self.metadata())
        for key, value, error in (("stage", "built", "identity mismatch"),
                ("fixture", "formula", "identity mismatch"),
                ("captured_utc", "2026-11-13T09:00:00", "timezone aware"),
                ("live_source", str(self.out / "inputs/external-tables.tex"), "separate fixture live")):
            with self.subTest(key=key):
                qa.write_json(self.metadata(), {**original, key: value})
                with self.assertRaisesRegex(ValueError, error):
                    qa.validate_stage(self.out, self.fixture, "opened")

    def test_editor_readback_must_match_even_if_its_hash_is_updated(self):
        self.capture()
        path = self.metadata().parent / "editor.txt"
        path.write_bytes(b"stale or wrong editor")
        metadata = qa.read_json(self.metadata())
        metadata["files"]["editor.txt"] = qa.sha(path)
        qa.write_json(self.metadata(), metadata)
        with self.assertRaisesRegex(ValueError, "Editor clipboard differs"):
            qa.validate_stage(self.out, self.fixture, "opened")

    def test_original_png_hash_and_geometry_are_independent_guards(self):
        self.capture()
        path = self.metadata().parent / "desktop.original.png"
        Image.new("RGB", (100, 100)).save(path)
        with self.assertRaisesRegex(ValueError, "original hash mismatch"):
            qa.validate_stage(self.out, self.fixture, "opened")
        metadata = qa.read_json(self.metadata())
        metadata["files"]["desktop.original.png"] = qa.sha(path)
        qa.write_json(self.metadata(), metadata)
        with self.assertRaisesRegex(ValueError, "desktop geometry"):
            qa.validate_stage(self.out, self.fixture, "opened")

    def test_incomplete_run_cannot_become_accepted(self):
        self.capture()
        with self.assertRaises((ValueError, FileNotFoundError)):
            qa.validate_all(self.out)

    def test_manifest_cannot_drop_fixture_hash(self):
        path = self.out / "manifest.json"
        manifest = qa.read_json(path)
        del manifest["fixture_hashes"]["measurements.dat"]
        qa.write_json(path, manifest)
        with self.assertRaisesRegex(ValueError, "hash inventory differs"):
            qa.validate_all(self.out)


class EngineRecorderContracts(unittest.TestCase):
    def test_pwd_and_input_paths_are_resolved_from_actual_records(self):
        self.assertEqual(recorder_inputs(b"PWD /tmp/project\nINPUT ./figure.tex\nINPUT /tmp/shared/a.dat\n", Path("/wrong")),
                         {Path("/tmp/project/figure.tex"), Path("/tmp/shared/a.dat")})

    def test_incomplete_fls_cannot_certify_dependency(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            source = root / "external-tables.tex"
            source.write_bytes(b"author")
            (root / "measurements.dat").write_bytes(b"x y\n0 1\n")
            (root / "reference.csv").write_bytes(b"x,y\n0,1\n")
            watcher = RecorderWatcher(root / "temp", root / "retained")
            path = watcher.out / "partial.original.fls"
            path.write_bytes((f"PWD {root}\nINPUT ./external-tables.tex\nINPUT ./measurements.dat\n").encode())
            captured = root / "compiled-input-source.original.tex"
            captured.write_bytes(b"author")
            watcher.records.append({"retained": str(path), "sha256": qa.sha(path),
                "captured_sources": {str(source): {"retained": str(captured), "sha256": qa.sha(captured)}}})
            with self.assertRaisesRegex(RuntimeError, "all actual table inputs"):
                watcher.proof(source, b"author", qa.dependency_hashes(root, "external-tables"))
            path.write_bytes(path.read_bytes() + b"INPUT ./reference.csv\n")
            watcher.records[0]["sha256"] = qa.sha(path)
            proof = watcher.proof(source, b"author", qa.dependency_hashes(root, "external-tables"))
            self.assertEqual(proof["compiled_source_sha256"], qa.digest(b"author"))
            source.write_bytes(b"newer author")
            with self.assertRaisesRegex(RuntimeError, "source/dependencies changed"):
                watcher.proof(source, b"author", qa.dependency_hashes(root, "external-tables"))


if __name__ == "__main__":
    unittest.main()
