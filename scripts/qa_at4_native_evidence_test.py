#!/usr/bin/env python3
"""Offline contracts for eight exact AI88 AT4 originals; no GUI claim."""
from __future__ import annotations

from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import qa_pgfplots_vertical_evidence as qa

try:
    from PIL import Image
except ImportError:
    Image = None


class AT4InventoryContracts(unittest.TestCase):
    def test_suite_selection_is_closed_and_v2_default_remains_26_operations(self):
        self.assertEqual(qa.fixtures_for_suite(), qa.fixtures_for_suite("v2"))
        self.assertEqual(len(qa.fixtures_for_suite("v2")), 8)
        self.assertEqual(len(qa.operation_inventory("v2")), 26)
        self.assertEqual(qa.operation_inventory("v2"), qa.OPERATIONS)
        self.assertEqual(qa.fixtures_for_suite("at4"), tuple(qa.AT4_CASES))
        self.assertEqual(qa.operation_inventory("at4"), qa.AT4_OPERATIONS)
        self.assertEqual(len(qa.operation_inventory("at4")), 8)
        for call in (lambda: qa.fixtures_for_suite("all"),
                     lambda: qa.operation_inventory("custom"),
                     lambda: qa.suite_scope("v2+at4"),
                     lambda: qa.prepare(Path("/tmp/unused-at4-suite"), "any"),
                     lambda: qa.validate_all(Path("/tmp/unused-at4-suite"), "all")):
            with self.assertRaisesRegex(ValueError, "Unsupported PGFPlots evidence suite"):
                call()

    def test_default_prepare_manifest_remains_the_v2_eight_fixture_suite(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / "evidence"
            manifest = qa.prepare(out)
            self.assertEqual(manifest["suite"], "v2")
            self.assertEqual(manifest["scope"], qa.suite_scope())
            self.assertEqual(manifest["fixtures"], list(qa.fixtures_for_suite("v2")))
            self.assertEqual(len(manifest["operations"]), 26)
            self.assertFalse(any(name.startswith("AT4-") for name in manifest["fixtures"]))

    def test_eight_original_hashes_paths_and_scoped_operations_match_proposal(self):
        expected = {
            "AT4-09": ("scientific-plot.tex", "samples", "161", "181", "addplot", 1),
            "AT4-48": ("error-bars.tex", "width", "10cm", "11cm", "axis", 0),
            "AT4-49": ("loglog-convergence.tex", "width", "10cm", "11cm", "axis", 0),
            "AT4-50": ("confidence-band.tex", "width", "10cm", "11cm", "axis", 0),
            "AT4-55": ("surface-gaussian.tex", "samples", "21", "25", "addplot", 1),
            "AT4-56": ("parametric-helix.tex", "samples", "181", "201", "addplot", 1),
            "AT4-58": ("discontinuous-function.tex", "width", "10cm", "11cm", "axis", 0),
            "AT4-61": ("bode-magnitude.tex", "samples", "161", "201", "addplot", 1),
        }
        self.assertEqual(set(qa.AT4_CASES), set(expected))
        for fixture, (filename, key, before, after, kind, command) in expected.items():
            with self.subTest(fixture=fixture):
                operation, = qa.operations(fixture)
                case = qa.AT4_CASES[fixture]
                self.assertEqual(case["filename"], filename)
                self.assertEqual((operation.key, operation.before, operation.after,
                                  operation.kind, operation.command),
                                 (key, before, after, kind, command))
                original = qa.fixture_bytes(fixture)
                self.assertEqual(qa.sha(qa.fixture_path(fixture)), case["sha256"])
                self.assertEqual(operation.patch(original).replace(
                    (key + "=" + after).encode(), (key + "=" + before).encode(), 1), original)
                self.assertTrue(qa.fixture_path(fixture).is_relative_to(qa.AT4_EXAMPLES))

    def test_3d_original_intake_crlf_and_only_samples_patch_are_preserved(self):
        intake = qa.read_json(qa.SOURCE_ROOT / "roadmap/AI_TIKZ_SKILLS_2026-11-10/AT4_SOURCE_INTAKE.json")
        records = {record["case_id"]: record for record in intake["files"]}
        for fixture in ("AT4-55", "AT4-56"):
            with self.subTest(fixture=fixture):
                case = qa.AT4_CASES[fixture]
                record = records[case["case_id"]]
                original = qa.fixture_bytes(fixture)
                self.assertEqual((case["sha256"], len(original)), (record["sha256"], record["bytes"]))
                self.assertEqual(record["path"], "examples/" + case["filename"])
                self.assertNotIn(b"\n", original.replace(b"\r\n", b""))
                operation, = qa.operations(fixture)
                self.assertEqual((operation.kind, operation.command, operation.key, operation.property_index),
                                 ("addplot", 1, "samples", 0))
                old = ("samples=" + operation.before).encode()
                new = ("samples=" + operation.after).encode()
                self.assertEqual(operation.patch(original), original.replace(old, new, 1))
                self.assertEqual(original.count(old), 1)
                self.assertIn(b"\\addplot3[", original)
                self.assertEqual(qa.dependency_hashes(qa.AT4_EXAMPLES, fixture), {})

    def test_at4_sequence_has_one_apply_undo_and_final_inverse_per_original(self):
        for fixture in qa.fixtures_for_suite("at4"):
            stages = [name for name, _ in qa.expected_sequence(fixture)]
            self.assertEqual(stages, ["opened", qa.operations(fixture)[0].name + "-draft",
                qa.operations(fixture)[0].name + "-applied", qa.operations(fixture)[0].name + "-undo",
                "final-applied", "reopened", "built"])
            operation, = qa.operations(fixture)
            original = qa.fixture_bytes(fixture)
            self.assertEqual(dict(qa.expected_sequence(fixture))["opened"], original)
            self.assertEqual(dict(qa.expected_sequence(fixture))["final-applied"], operation.patch(original))


@unittest.skipIf(Image is None, "Pillow required for original screenshot contracts")
class AT4ManifestContracts(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.out = self.root / "evidence"
        qa.prepare(self.out, suite="at4")
        self.png = self.root / "screen.png"
        Image.new("RGB", qa.SCREEN, (15, 20, 30)).save(self.png)

    def tearDown(self):
        self.temporary.cleanup()

    def complete_fixture(self, fixture):
        live = self.out / "live" / fixture / (fixture + ".tex")
        editor = self.root / (fixture + ".editor.txt")
        for stage, expected in qa.expected_sequence(fixture):
            live.write_bytes(expected)
            editor.write_bytes(expected)
            qa.record(self.out, fixture, stage, live, editor, self.png,
                      action="UNIT_EVENT only; no native GUI evidence")

    def test_prepare_records_exact_original_attribution_and_no_synthetic_substitution(self):
        manifest = qa.read_json(self.out / "manifest.json")
        self.assertEqual((manifest["suite"], manifest["scope"], manifest["fixtures"]),
                         ("at4", qa.suite_scope("at4"), list(qa.fixtures_for_suite("at4"))))
        self.assertEqual(len(manifest["operations"]), 8)
        self.assertEqual(manifest["fixture_origin"], "EIGHT_EXACT_ORIGINAL_AI88_AT4_CORPUS_INPUTS")
        self.assertEqual(manifest["independent_visual_review"], "REQUIRED")
        self.assertEqual(set(manifest["named_corpus_inputs"]), set(qa.fixtures_for_suite("at4")))
        for fixture, case in qa.AT4_CASES.items():
            entry = manifest["named_corpus_inputs"][fixture]
            source_path = f"{qa.AT4_RELATIVE_EXAMPLES}/{case['filename']}"
            self.assertEqual(entry["path"], source_path)
            self.assertEqual(entry["source_path"], source_path)
            self.assertEqual(entry["original_sha256"], case["sha256"])
            self.assertEqual(entry["runtime_sha256"], case["sha256"])
            self.assertIs(entry["runtime_source_identical_to_original"], True)
            self.assertEqual(entry["source_kind"], "ORIGINAL_AI88_AT4_CORPUS")
            self.assertEqual((self.out / "inputs" / (fixture + ".tex")).read_bytes(), qa.fixture_bytes(fixture))
            self.assertEqual((self.out / "inputs" / (fixture + ".original-corpus.tex")).read_bytes(), qa.fixture_bytes(fixture))

    def test_full_at4_manifest_validates_only_after_all_original_stages_are_retained(self):
        for fixture in qa.fixtures_for_suite("at4"):
            self.complete_fixture(fixture)
        result = qa.validate_all(self.out, suite="at4")
        self.assertEqual(result["suite"], "at4")
        self.assertEqual(result["operations_observed"], 8)
        self.assertEqual(result["native_acceptance"], "REQUIRES_INDEPENDENT_REVIEW")

    def test_legacy_six_or_incomplete_3d_stages_cannot_certify_expanded_suite(self):
        for fixture in qa.fixtures_for_suite("at4"):
            if fixture not in {"AT4-55", "AT4-56"}:
                self.complete_fixture(fixture)
        with self.assertRaisesRegex(ValueError, "Observed fixture inventory differs"):
            qa.validate_all(self.out, "at4")
        self.complete_fixture("AT4-55")
        with self.assertRaisesRegex(ValueError, "Observed fixture inventory differs"):
            qa.validate_all(self.out, "at4")
        self.complete_fixture("AT4-56")
        applied = qa.operations("AT4-55")[0].name + "-applied"
        shutil.rmtree(self.out / "observed" / "AT4-55" / applied)
        with self.assertRaisesRegex(ValueError, "Incomplete or extra stage inventory"):
            qa.validate_all(self.out, "at4")

    def test_tampered_runtime_or_original_corpus_bytes_are_rejected(self):
        for relative_path, expected_error in (
                ("inputs/AT4-09.tex", "Original fixture input changed"),
                ("inputs/AT4-09.original-corpus.tex", "Original named corpus changed")):
            with self.subTest(path=relative_path):
                fresh = self.root / ("fresh-" + Path(relative_path).name)
                qa.prepare(fresh, "at4")
                input_source = fresh / relative_path
                input_source.write_bytes(input_source.read_bytes() + b"% tampered\n")
                with self.assertRaisesRegex(ValueError, expected_error):
                    qa.validate_all(fresh, "at4")

    def test_tampered_canonical_original_fails_before_prepare(self):
        for fixture in ("AT4-09", "AT4-55", "AT4-56"):
            with self.subTest(fixture=fixture):
                alternate = self.root / ("tampered-examples-" + fixture)
                shutil.copytree(qa.AT4_EXAMPLES, alternate)
                target = alternate / qa.AT4_CASES[fixture]["filename"]
                target.write_bytes(target.read_bytes() + b"% changed original\n")
                with patch.object(qa, "AT4_EXAMPLES", alternate):
                    with self.assertRaisesRegex(ValueError, "Original AI88 AT4 case bytes/hash mismatch"):
                        qa.prepare(self.root / ("reject-" + fixture), "at4")

    def test_retained_wrong_source_is_kept_and_rejected_as_not_the_original(self):
        fixture = "AT4-09"
        live = self.out / "live" / fixture / (fixture + ".tex")
        editor = self.root / "wrong.editor.txt"
        live.write_bytes(b"wrong retained revision")
        editor.write_bytes(live.read_bytes())
        with self.assertRaisesRegex(ValueError, "Unexpected source bytes"):
            qa.record(self.out, fixture, "opened", live, editor, self.png,
                      action="UNIT_EVENT hostile wrong revision")
        retained = self.out / "observed" / fixture / "opened/source.tex"
        self.assertEqual(retained.read_bytes(), b"wrong retained revision")
        self.assertTrue((retained.parent / "desktop.original.png").is_file())

    def test_changed_suite_fixture_scope_or_operation_inventory_fails_closed(self):
        original = qa.read_json(self.out / "manifest.json")
        mutations = (
            ("suite", "v2"),
            ("fixtures", ["AT4-09"]),
            ("scope", qa.SCOPE),
            ("operations", original["operations"][:-1]),
        )
        manifest_path = self.out / "manifest.json"
        for key, value in mutations:
            with self.subTest(key=key):
                qa.write_json(manifest_path, {**original, key: value})
                with self.assertRaisesRegex(ValueError, "Manifest suite, fixture, scope, or operation inventory differs"):
                    qa.validate_all(self.out, "at4")
        qa.write_json(manifest_path, original)

    def test_missing_extra_observation_fixture_is_rejected(self):
        (self.out / "observed" / "unexpected-fixture").mkdir(parents=True)
        with self.assertRaisesRegex(ValueError, "Observed fixture inventory differs"):
            qa.validate_all(self.out, "at4")


if __name__ == "__main__":
    unittest.main()
