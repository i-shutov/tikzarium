#!/usr/bin/env python3
"""UNIT_EVENT contracts and hostile evidence checks, never native acceptance."""
from __future__ import annotations

from dataclasses import replace
import math
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import qa_pgfplots_vertical_evidence as qa
from qa_pgfplots_vertical_x11 import (Driver, MENU_BACKGROUND, observe_property_popup, popup_strip_bounds,
                                     property_menu_plan, recorder_inputs, RecorderWatcher,
                                     run_suite, StrictXeLaTeXWarningError)

try:
    from PIL import Image
except ImportError:
    Image = None


class OperationContracts(unittest.TestCase):
    def test_inventory_covers_all_axis_and_addplot_properties_and_named_musts(self):
        formula = qa.operations("formula")
        self.assertEqual(tuple(op.key for op in formula if op.kind == "axis"), qa.AXIS_KEYS)
        self.assertEqual(tuple(op.key for op in formula if op.kind == "addplot"), qa.ADDPLOT_KEYS)
        self.assertEqual(len(qa.OPERATIONS), 27)
        for name in qa.NAMED_SV:
            self.assertEqual(len(qa.operations(name)), 1)
        self.assertEqual(qa.operations("SV-040"),
                         (qa.Operation("SV-040", 0, "nativeplot", "samples", "50", "80"),))

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
        name = qa.operations("SV-040")[0].name
        self.assertEqual([stage for stage, _ in qa.expected_sequence("SV-040")],
                         ["opened", name + "-draft", name + "-applied", name + "-undo",
                          "final-applied", "reopened", "built"])
        self.assertEqual(qa.digest(qa.fixture_bytes("SV-040")), qa.NATIVE_PLOT_ORIGINAL_SHA256)

    def test_clean_suite_is_separate_and_shared_operations_are_not_duplicated(self):
        self.assertEqual(qa.fixtures_for_suite("v2-clean"),
            ("formula", "external-tables", "SV-001", "SV-003-clean", "SV-022",
             "SV-029-clean", "SV-040", "SV-009-clean"))
        self.assertNotEqual(qa.suite_scope("v2-clean"), qa.suite_scope("v2"))
        self.assertEqual(len(qa.operation_inventory("v2-clean")), 27)
        self.assertEqual(len(qa.operations("formula")), 18)
        for original, derivative in qa.CLEAN_REPLACEMENTS.items():
            op, = qa.operations(derivative)
            original_op, = qa.operations(original)
            self.assertEqual(replace(op, fixture=original), original_op)
            raw = qa.fixture_bytes(derivative)
            self.assertNotEqual(raw, qa.fixture_bytes(original))
            self.assertEqual(qa.original_fixture_bytes(derivative), qa.fixture_bytes(original))
            self.assertIn(b"{Charis SIL}", raw)
            self.assertEqual(len(qa.fixture_bytes(original)) - len(raw), 2)
            self.assertEqual(op.patch(raw).replace((op.key + "=" + op.after).encode(),
                                                  (op.key + "=" + op.before).encode(), 1), raw)

    def test_kind_specific_property_inventories_preserve_axis_and_series_order(self):
        self.assertEqual(qa.PROPERTY_KEYS["groupplot"], qa.AXIS_KEYS)
        self.assertEqual(qa.PROPERTY_KEYS["nextgroupplot"], qa.AXIS_KEYS)
        self.assertEqual(qa.PROPERTY_KEYS["tabletypeset"], ("columns",))
        self.assertEqual(qa.PROPERTY_KEYS["nativeplot"], ("samples",))
        with self.assertRaises(KeyError):
            replace(qa.OPERATIONS[0], kind="unknown").property_index

    def test_cp09_inventory_keeps_all_original_at4_cases_and_exact_native_plot_scope(self):
        self.assertEqual(qa.fixtures_for_suite("at4"),
            ("AT4-09", "AT4-34", "AT4-35", "AT4-48", "AT4-49", "AT4-50",
             "AT4-51", "AT4-52", "AT4-53", "AT4-54", "AT4-55", "AT4-56",
             "AT4-57", "AT4-58", "AT4-59", "AT4-60", "AT4-61"))
        self.assertEqual(sum(len(qa.expected_sequence(f)) for f in qa.fixtures_for_suite("at4")), 119)
        self.assertEqual(sum(len(qa.expected_sequence(f)) for f in qa.fixtures_for_suite("v2")), 113)
        for fixture, expected in (("AT4-34", ("samples", "301", "401")),
                                  ("AT4-35", ("samples", "251", "301")),
                                  ("AT4-57", ("height", "6cm", "7cm"))):
            operation, = qa.operations(fixture)
            self.assertEqual((operation.key, operation.before, operation.after), expected)
        for op in qa.operation_inventory("at4"):
            original = qa.fixture_bytes(op.fixture)
            patched = op.patch(original)
            self.assertEqual(patched.replace((op.key + "=" + op.after).encode(),
                                            (op.key + "=" + op.before).encode(), 1), original)

    def test_native_plot_original_hash_refuses_modified_corpus_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "figure.tex"
            path.write_bytes(qa.fixture_bytes("SV-040").replace(b"samples=50", b"samples=51"))
            with patch.object(qa, "fixture_path", return_value=path):
                with self.assertRaisesRegex(ValueError, "native TikZ plot bytes/hash"):
                    qa.fixture_bytes("SV-040")


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


@unittest.skipIf(Image is None, "Pillow required for retained screenshot contracts")
class CleanDerivativeEvidenceContracts(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.out = self.root / "evidence"
        qa.prepare(self.out, "v2-clean")
        self.png = self.root / "unit-event.png"
        Image.new("RGB", qa.SCREEN, (20, 25, 30)).save(self.png)

    def tearDown(self):
        self.temporary.cleanup()

    def test_complete_derivative_stages_require_separate_original_attribution(self):
        manifest = qa.read_json(self.out / "manifest.json")
        for fixture in qa.fixtures_for_suite("v2-clean"):
            live = self.out / "live" / fixture / (fixture + ".tex")
            editor = self.root / "editor.txt"
            for stage, raw in qa.expected_sequence(fixture):
                live.write_bytes(raw)
                editor.write_bytes(raw)
                qa.record(self.out, fixture, stage, live, editor, self.png,
                          action="UNIT_EVENT synthetic retained observation; no GUI acceptance")
        result = qa.validate_all(self.out, "v2-clean")
        self.assertEqual(result["operations_observed"], 27)
        self.assertEqual(result["native_acceptance"], "REQUIRES_INDEPENDENT_REVIEW")
        for fixture in qa.CLEAN_REPLACEMENTS.values():
            entry = manifest["named_corpus_inputs"][fixture]
            self.assertIs(entry["runtime_source_identical_to_original"], False)
            self.assertEqual(entry["derivative"]["corpus_status"], "NOT_ORIGINAL_CORPUS")
            self.assertNotEqual(entry["original_sha256"], entry["runtime_sha256"])
        with self.assertRaisesRegex(ValueError, "Manifest suite"):
            qa.validate_all(self.out, "v2")

    def test_original_copy_cannot_be_replaced_by_clean_bytes_or_relabelled(self):
        fixture = "SV-003-clean"
        original = self.out / "inputs" / (fixture + ".original-corpus.tex")
        original.write_bytes(qa.fixture_bytes(fixture))
        with self.assertRaisesRegex(ValueError, "Original named corpus changed"):
            qa.validate_all(self.out, "v2-clean")
        original.write_bytes(qa.original_fixture_bytes(fixture))
        path = self.out / "manifest.json"
        manifest = qa.read_json(path)
        manifest["named_corpus_inputs"][fixture]["runtime_source_identical_to_original"] = True
        qa.write_json(path, manifest)
        with self.assertRaisesRegex(ValueError, "Original named corpus changed"):
            qa.validate_all(self.out, "v2-clean")

    def test_derivative_origin_and_acceptance_boundary_cannot_be_relabelled(self):
        path = self.out / "manifest.json"
        original = qa.read_json(path)
        for key, value in (("fixture_origin", "EIGHT_EXACT_ORIGINAL_AI88_AT4_CORPUS_INPUTS"),
                           ("synthetic_optical_scope", "NOT_APPLICABLE_NO_SYNTHETIC_AT4_INPUTS"),
                           ("aggregate_sc3_at4", "PASS"), ("physical_win10", "PASS"),
                           ("physical_mac_arm", "PASS"), ("independent_visual_review", "PASS"),
                           ("schema_version", 2), ("screen", [1920, 1080]), ("client", [1366, 768])):
            with self.subTest(key=key):
                qa.write_json(path, {**original, key: value})
                with self.assertRaisesRegex(ValueError, "Manifest provenance or acceptance boundary differs"):
                    qa.validate_all(self.out, "v2-clean")


class EngineRecorderContracts(unittest.TestCase):
    def test_pwd_and_input_paths_are_resolved_from_actual_records(self):
        self.assertEqual(recorder_inputs(b"PWD /tmp/project\nINPUT ./figure.tex\nINPUT /tmp/shared/a.dat\n", Path("/wrong")),
                         {Path("/tmp/project/figure.tex"), Path("/tmp/shared/a.dat")})

    def test_snapshot_budget_scales_with_closed_suite_without_dropping_originals(self):
        self.assertEqual(len(qa.fixtures_for_suite("at4")), 17)
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            old = RecorderWatcher(root / "temp8", root / "retained8")
            expanded = RecorderWatcher(root / "temp17", root / "retained17",
                                       expected_build_count=len(qa.fixtures_for_suite("at4")))
            self.assertEqual((old.max_snapshots, expanded.max_snapshots), (512, 1088))
            for index in range(513):
                raw = f"distinct snapshot{index}".encode()
                path = expanded.temporary / "engine.log"
                path.write_bytes(raw)
                expanded.capture(path)
                previous = old.temporary / "engine.log"
                previous.write_bytes(raw)
                if index < 512:
                    old.capture(previous)
                else:
                    with self.assertRaisesRegex(RuntimeError, "snapshot budget"):
                        old.capture(previous)
            self.assertEqual((len(old.records), len(expanded.records)), (512, 513))
            for index, record in enumerate(expanded.records):
                raw = f"distinct snapshot{index}".encode()
                self.assertEqual(Path(record["retained"]).read_bytes(), raw)
                self.assertEqual(record["sha256"], qa.digest(raw))
            expanded.capture(path)  # Same path+hash is still one original.
            self.assertEqual(len(expanded.records), 513)
            expanded.stop()
            report = qa.read_json(expanded.out / "recorder-captures.json")
            self.assertEqual(report["expected_build_count"], 17)
            self.assertEqual(report["max_retained_bytes"], 8_000_000 * 17)
            self.assertEqual(report["retained_bytes"], sum(Path(r["retained"]).stat().st_size for r in expanded.records))

    def test_recorder_rejects_invalid_build_counts_before_creating_directories(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            for count in (0, -1, 33, True, 17.0, "17", None):
                with self.subTest(count=count), self.assertRaises(ValueError):
                    RecorderWatcher(root / "temp", root / "retained", count)
            self.assertEqual(list(root.iterdir()), [])

    def test_snapshot_read_and_aggregate_bytes_are_bounded_without_eviction(self):
        with tempfile.TemporaryDirectory() as name, patch.object(RecorderWatcher, "MAX_SNAPSHOT_BYTES", 32):
            root = Path(name)
            watcher = RecorderWatcher(root / "temp", root / "retained", 1)
            path = watcher.temporary / "engine.log"
            path.write_bytes(b"x" * 33)
            with patch.object(Path, "open") as opened:
                reader = opened.return_value.__enter__.return_value.read
                reader.return_value = b"x" * 33
                with self.assertRaisesRegex(RuntimeError, "snapshot exceeded"):
                    watcher.read_bounded(path)
                reader.assert_called_once_with(33)  # MAX+1, never an unbounded read.
            with self.assertRaisesRegex(RuntimeError, "snapshot exceeded"):
                watcher.capture(path)
            self.assertEqual(list(watcher.out.iterdir()), [])
            path.write_bytes(b"x" * 20)
            watcher.capture(path)
            first = watcher.records[0].copy()
            path.write_bytes(b"y" * 13)
            with self.assertRaisesRegex(RuntimeError, "aggregate byte"):
                watcher.capture(path)
            self.assertEqual(watcher.retained_bytes, 20)
            self.assertEqual(watcher.records, [first])
            self.assertEqual(Path(first["retained"]).read_bytes(), b"x" * 20)
            watcher.done.wait = lambda _: watcher.done.set()
            watcher.watch()
            self.assertIn("aggregate byte", watcher.error)
            with self.assertRaisesRegex(RuntimeError, "watcher failed"):
                watcher.proof(root / "source.tex", b"author", {})
            watcher.stop()
            self.assertIn("aggregate byte", qa.read_json(watcher.out / "recorder-captures.json")["error"])

    def test_late_watcher_error_fails_finalization_after_production_cleanup(self):
        driver = object.__new__(Driver)
        calls = []
        driver.watcher = SimpleNamespace(stop=lambda: calls.append("retained metadata"), error="aggregate byte budget")
        with patch("qa_sci_compact_x11.Driver.stop") as cleanup:
            with self.assertRaisesRegex(RuntimeError, "watcher failed.*aggregate byte"):
                driver.stop()
            cleanup.assert_called_once()
        self.assertEqual(calls, ["retained metadata"])

    def test_captured_author_sources_count_toward_aggregate_and_keep_proof_binding(self):
        with tempfile.TemporaryDirectory() as name, patch.object(RecorderWatcher, "MAX_SNAPSHOT_BYTES", 1024):
            root = Path(name)
            source = root / "live" / "case" / "formula.tex"
            source.parent.mkdir(parents=True)
            source.write_bytes(b"author")
            watcher = RecorderWatcher(root / "temp", root / "retained", 1)
            path = watcher.temporary / "engine.fls"
            raw = f"PWD {source.parent}\nINPUT {source}\n".encode()
            path.write_bytes(raw)
            watcher.capture(path)
            self.assertEqual(watcher.retained_bytes, len(raw) + len(b"author"))
            proof = watcher.proof(source, b"author", {})
            self.assertEqual(proof["compiled_source_sha256"], qa.digest(b"author"))
            source.write_bytes(b"a" * 1000)
            path.write_bytes(raw + b"OUTPUT changed.pdf\n")
            with self.assertRaisesRegex(RuntimeError, "aggregate byte"):
                watcher.capture(path)
            self.assertEqual(len(watcher.records), 1)
            captured = next(iter(watcher.records[0]["captured_sources"].values()))
            self.assertEqual(Path(captured["retained"]).read_bytes(), b"author")

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
            dependencies = qa.dependency_hashes(root, "external-tables")
            (root / "measurements.dat").write_bytes(b"x y\n0 2\n")
            with self.assertRaisesRegex(RuntimeError, "source/dependencies changed"):
                watcher.proof(source, b"author", dependencies)
            (root / "measurements.dat").write_bytes(b"x y\n0 1\n")
            captured.write_bytes(b"forged compiled author")
            with self.assertRaisesRegex(RuntimeError, "all actual table inputs"):
                watcher.proof(source, b"author", dependencies)
            captured.write_bytes(b"author")
            source.write_bytes(b"newer author")
            with self.assertRaisesRegex(RuntimeError, "source/dependencies changed"):
                watcher.proof(source, b"author", qa.dependency_hashes(root, "external-tables"))


class ActualRunOnePopupRegression(unittest.TestCase):
    def test_single_table_property_geometry_is_bounded_without_scroll(self):
        # UNIT_EVENT proposed geometry; an actual original screenshot must still
        # establish these dimensions before any native click is accepted.
        plan = property_menu_plan(0, 1, 380, 36)
        self.assertEqual((plan["viewport_height"], plan["maximum_scroll"]), (26, 0))
        self.assertEqual(plan["target_client_y"], 398)
        with self.assertRaisesRegex(RuntimeError, "popup height"):
            property_menu_plan(0, 1, 380, 96)
        for count in (0, 2, 4, 14, 16):
            with self.assertRaisesRegex(ValueError, "outside approved"):
                property_menu_plan(0, count, 380, 36)

    def test_actual_run01_popup_strip_bounds_and_observed_first_row(self):
        raw = (qa.FIXTURES / "run01-candidate-popup-strip.rgb").read_bytes()
        metadata = qa.read_json(qa.FIXTURES / "run01-candidate-popup-strip.json")
        self.assertEqual(len(raw), 680 * 3)
        pixels = [tuple(raw[index:index + 3]) for index in range(0, len(raw), 3)]
        top, height = popup_strip_bounds(pixels)
        self.assertEqual((top, height), (metadata["expected_strip_top_client"], metadata["expected_strip_height"]))
        self.assertEqual(property_menu_plan(0, 3, top, height)["target_client_y"], metadata["observed_first_item_client_y"])

    def test_candidate_uses_actual_mouse_rows_without_keyboard_focus_assumption(self):
        clicks = []
        fake = SimpleNamespace(points={"first_axis": (1000, 336)}, fixture="formula", out=Path("/unit"),
            click=clicks.append, screenshot=lambda label: Path("/unit/" + label + ".png"), event=lambda *a, **k: None,
            key=lambda chord: self.fail("Run01 unsupported popup keyboard navigation repeated: " + chord))
        Driver.combo_index(fake, "candidate", 2)
        self.assertEqual(clicks, ["candidate", "menu_item"])
        self.assertEqual(fake.points["menu_item"], (1000, 396))

    def test_popup_geometry_refuses_blank_ambiguous_and_wrong_sized_menus(self):
        with self.assertRaisesRegex(RuntimeError, "observed 0"):
            popup_strip_bounds([(0, 0, 0)] * 680)
        with self.assertRaisesRegex(RuntimeError, "observed 2"):
            popup_strip_bounds([MENU_BACKGROUND] * 96 + [(0, 0, 0)] * 20 + [MENU_BACKGROUND] * 96)
        with self.assertRaisesRegex(RuntimeError, "popup height"):
            property_menu_plan(0, 3, 380, 210)
        with self.assertRaisesRegex(ValueError, "outside approved"):
            property_menu_plan(15, 15, 380, 210)


class PopupProbeImage:
    """Only actual retained RGB probe bytes; missing/unobserved pixels refuse."""
    size = qa.SCREEN

    def __init__(self, record):
        self.record = record
        self.origin = tuple(record["origin"])
        self.columns = {int(x): [tuple(raw[i:i + 3]) for i in range(0, len(raw), 3)]
                        for x, value in record["columns_rgb24_hex"].items()
                        for raw in [bytes.fromhex(value)]}
        raw = bytes.fromhex(record["header_row_rgb24_hex"])
        self.row = [tuple(raw[i:i + 3]) for i in range(0, len(raw), 3)]

    def getpixel(self, point):
        x, y = point[0] - self.origin[0], point[1] - self.origin[1]
        if x in self.columns:
            return self.columns[x][y]
        if y == self.record["header_row_client_y"]:
            return self.row[x - self.record["header_row_start_client_x"]]
        raise AssertionError("Pixel is outside retained native probe evidence: " + str(point))

    def convert(self, mode):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def with_synthetic_thumb(self, offset, *, inset=0):
        """UNIT_EVENT endpoint/raster coverage; never an original screenshot."""
        result = PopupProbeImage(self.record)
        viewport = self.record["strip_height"] - 10
        top = self.record["strip_top"] + 5
        content = self.record["count"] * 30 - 4
        handle = max(viewport * viewport / content, 12)
        ideal = top + offset / (content - viewport) * (viewport - handle)
        for x in (self.record["right_client_x"] - 7, self.record["right_client_x"] - 6):
            result.columns[x][top:top + viewport] = [MENU_BACKGROUND] * viewport
            for y in range(math.ceil(ideal) + inset, math.floor(ideal + handle) - inset):
                result.columns[x][y] = (146, 156, 169)
        return result


class ActualCp08SingleToSeriesPopupRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixture = qa.read_json(qa.FIXTURES / "cp08-single-to-series-popup-probes.json")
        if (fixture["kind"] != "DERIVED_RGB_PROBES_NOT_ORIGINAL_DESKTOP"
                or fixture["run_id"] != 44033024834
                or fixture["artifact_id"] != 14306388099
                or fixture["source_head_sha"] != "a245c8b501b805b4295e4416b0654785b5a8aa8f"):
            raise AssertionError("CP08 failed-run probe provenance must remain explicit")
        cls.table, cls.series = map(PopupProbeImage, fixture["records"])

    def test_original_table_menu_has_exact_single_choice_without_scroll(self):
        plan = observe_property_popup(self.table, self.table.origin, 0, 1)
        self.assertEqual((plan["strip_height"], plan["viewport_height"], plan["maximum_scroll"]), (36, 26, 0))
        self.assertEqual(plan["target_client_y"], 386)

    def test_original_series_menu_after_table_requires_observed_scrollbar(self):
        plan = observe_property_popup(self.series, self.series.origin, 0, 3, allow_hidden_scrollbar=True)
        self.assertEqual((plan["strip_height"], plan["viewport_height"], plan["content_height"],
                          plan["maximum_scroll"]), (74, 64, 86, 22))
        self.assertFalse(plan["scrollbar_observed"])
        self.assertIsNone(plan["target_client_y"])
        with self.assertRaisesRegex(RuntimeError, "bounded scrollbar thumb"):
            observe_property_popup(self.series, self.series.origin, 0, 3)

    def test_geometry_below_egui_minimum_and_expanded_single_choice_refuse(self):
        for count, height in ((3, 73), (15, 73), (1, 74)):
            with self.subTest(count=count, height=height), self.assertRaisesRegex(RuntimeError, "popup height"):
                property_menu_plan(0, count, 368, height)

    def test_short_series_click_stays_inside_row_for_entire_observed_scroll_interval(self):
        # UNIT_EVENT synthetic thumb endpoint probes, never native screenshots.
        for index, offset in ((0, 0), (1, 13), (2, 22)):
            for inset in (0, 1):
                image = self.series.with_synthetic_thumb(offset, inset=inset)
                plan = observe_property_popup(image, image.origin, index, 3)
                target = plan["target_client_y"]
                self.assertIsNotNone(target)
                low, high = plan["observed_scroll_interval"]
                self.assertLessEqual(low, offset + 1e-9)
                self.assertGreaterEqual(high, offset - 1e-9)
                for possible_offset in (low, offset, high):
                    row_start = plan["viewport_top"] + index * 30 - possible_offset
                    self.assertGreaterEqual(target, row_start + 2)
                    self.assertLessEqual(target, row_start + 24)


class ActualRunFourPopupRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixture = qa.read_json(qa.FIXTURES / "run04-popup-probes.json")
        if fixture["kind"] != "DERIVED_RGB_PROBES_NOT_ORIGINAL_DESKTOP" or fixture["run_id"] != 43410590342:
            raise AssertionError("Run04 probe provenance must remain explicit")
        cls.reset, cls.scrolled, cls.short = map(PopupProbeImage, fixture["records"])

    def observe(self, image, index=6, *, hidden=False):
        return observe_property_popup(image, image.origin, index, 15, allow_hidden_scrollbar=hidden)

    def test_actual_run04_scroll_is_eighty_points_and_rejects_old_wrong_row_coordinate(self):
        top = self.observe(self.reset)
        self.assertEqual((top["viewport_height"], top["thumb_top"], top["thumb_end"]), (200, 373, 463))
        self.assertLessEqual(top["observed_scroll_interval"][0], 0)
        moved = self.observe(self.scrolled)
        self.assertEqual((moved["thumb_top"], moved["thumb_end"]), (409, 499))
        low, high = moved["observed_scroll_interval"]
        self.assertLessEqual(low, 80)
        self.assertGreaterEqual(high, 80)
        self.assertGreaterEqual(moved["target_client_y"], 475)
        self.assertLessEqual(moved["target_client_y"], 497)
        self.assertNotEqual(moved["target_client_y"], 526)  # old click selected ytick distance
        self.assertGreaterEqual(top["target_client_y"], 555)  # index6 is already safely clickable at top
        self.assertLessEqual(top["target_client_y"], 571)

    def test_actual_short_axis_viewport_keeps_fifteen_choice_inventory_and_requires_observed_scroll(self):
        plan = self.observe(self.short, 10, hidden=True)
        self.assertEqual((plan["count"], plan["viewport_height"], plan["content_height"], plan["maximum_scroll"]),
                         (15, 86, 446, 360))
        self.assertFalse(plan["scrollbar_observed"])
        self.assertIsNone(plan["target_client_y"])
        with self.assertRaisesRegex(RuntimeError, "bounded scrollbar thumb"):
            self.observe(self.short, 10)

    def test_all_axis_rows_have_safe_interiors_from_observed_full_or_short_thumb_geometry(self):
        for base in (self.reset, self.short):
            for index in range(15):
                geometry = property_menu_plan(index, 15, base.record["strip_top"], base.record["strip_height"])
                offset = geometry["desired_scroll"]
                for inset in (0, 1):
                    with self.subTest(height=base.record["strip_height"], index=index, inset=inset):
                        plan = self.observe(base.with_synthetic_thumb(offset, inset=inset), index)
                        target = plan["target_client_y"]
                        self.assertIsNotNone(target)
                        low, high = plan["observed_scroll_interval"]
                        self.assertLessEqual(low, offset + 1e-9)
                        self.assertGreaterEqual(high, offset - 1e-9)
                        for possible_offset in (low, offset, high):
                            start = plan["viewport_top"] + index * 30 - possible_offset
                            self.assertGreaterEqual(target, start + 2)
                            self.assertLessEqual(target, start + 24)
                        self.assertGreaterEqual(target, plan["viewport_top"] + 2)
                        self.assertLessEqual(target, plan["viewport_top"] + plan["viewport_height"] - 2)
        for index in range(3):
            plan = property_menu_plan(index, 3, 318, 96)
            self.assertEqual(plan["target_client_y"], 336 + index * 30)

    def test_split_mismatched_or_wrong_length_thumbs_and_invalid_offsets_refuse(self):
        for variant, error in (("split", "split/ambiguous"), ("length", "thumb length"), ("columns", "both observed columns")):
            image = PopupProbeImage(self.reset.record)
            x = image.record["right_client_x"] - 7
            if variant == "split":
                image.columns[x][400] = MENU_BACKGROUND
            elif variant == "length":
                for column in (x, x + 1):
                    image.columns[column][373:493] = [(146, 156, 169)] * 120
            else:
                image.columns[x][373:383] = [MENU_BACKGROUND] * 10
            with self.subTest(variant=variant), self.assertRaisesRegex(RuntimeError, error):
                self.observe(image)
        with self.assertRaisesRegex(RuntimeError, "offset outside"):
            property_menu_plan(6, 15, 368, 210, (0, 247))

    def test_driver_positions_short_popup_from_thumb_then_reobserves_before_row_click(self):
        clicks, wheels, drags, events = [], [], [], []
        reset = self.short.with_synthetic_thumb(0)
        positioned = self.short.with_synthetic_thumb(270)
        images = iter([self.short, reset, positioned])
        points = {"property": (1020, 353)}
        fake = SimpleNamespace(points=points, fixture="AT4-48", out=Path("/unit"),
            geometry={"X": 1, "Y": 20},
            click=lambda name: clicks.append((name, points[name])),
            popup_wheel=lambda *args: wheels.append(args),
            popup_drag=lambda start, end: drags.append((start, end)),
            screenshot=lambda label: Path("/unit/" + label + ".png"),
            event=lambda *a, **k: events.append((a, k)),
            key=lambda chord: self.fail("No assumed popup keyboard focus: " + chord))
        with patch("qa_pgfplots_vertical_x11.common.audit.Image.open", side_effect=lambda path: next(images)):
            Driver.combo_index(fake, "property", 10, count=15)
        self.assertEqual([name for name, _ in clicks], ["property", "menu_item"])
        self.assertEqual(wheels, [(1020, 416, 4, 20)])
        self.assertEqual(len(drags), 1)
        self.assertEqual(drags[0][0][0], 1163)
        self.assertGreaterEqual(abs(drags[0][1][1] - drags[0][0][1]), 8)
        self.assertGreaterEqual(clicks[-1][1][1], 405)
        self.assertLessEqual(clicks[-1][1][1], 427)
        self.assertIn("positioned-target", events[-1][1]["final_observed_popup"])

    def test_native_drag_refuses_click_distance_and_always_releases_failed_button_proof(self):
        commands = []
        fake = SimpleNamespace(popup_pointer=lambda x, y: (x + 1, y + 20), event=lambda *a, **k: None)
        with self.assertRaisesRegex(RuntimeError, "click threshold"):
            Driver.popup_drag(fake, (1163, 380), (1163, 383))
        with patch("qa_pgfplots_vertical_x11.common.run", side_effect=lambda *args: commands.append(args)), \
             patch("qa_pgfplots_vertical_x11.time.sleep"), \
             patch("qa_pgfplots_vertical_x11.x11_button1_mask", return_value=0), \
             patch("qa_pgfplots_vertical_x11.x11_button1_pressed", return_value=False):
            with self.assertRaisesRegex(RuntimeError, "retain primary button"):
                Driver.popup_drag(fake, (1163, 380), (1163, 430))
        self.assertEqual(commands, [("xdotool", "mousedown", "1"), ("xdotool", "mouseup", "1")])
        commands.clear()
        def failing_press(*args):
            commands.append(args)
            if args[1] == "mousedown":
                raise RuntimeError("injected mousedown failure")
        with patch("qa_pgfplots_vertical_x11.common.run", side_effect=failing_press):
            with self.assertRaisesRegex(RuntimeError, "injected mousedown failure"):
                Driver.popup_drag(fake, (1163, 380), (1163, 430))
        self.assertEqual(commands, [("xdotool", "mousedown", "1"), ("xdotool", "mouseup", "1")])

    def test_stale_post_drag_thumb_refuses_before_any_property_row_click(self):
        reset = self.short.with_synthetic_thumb(0)
        images = iter([self.short, reset, reset])  # actual offset never changed
        clicks = []
        fake = SimpleNamespace(points={"property": (1020, 353)}, fixture="AT4-48", out=Path("/unit"),
            geometry={"X": 1, "Y": 20}, click=clicks.append,
            popup_wheel=lambda *args: None, popup_drag=lambda *args: None,
            screenshot=lambda label: Path("/unit/" + label + ".png"), event=lambda *a, **k: None)
        with patch("qa_pgfplots_vertical_x11.common.audit.Image.open", side_effect=lambda path: next(images)):
            with self.assertRaisesRegex(RuntimeError, "no safely visible interior"):
                Driver.combo_index(fake, "property", 10, count=15)
        self.assertEqual(clicks, ["property"])


class StrictWarningCollectionContracts(unittest.TestCase):
    """UNIT_EVENT only: strict failures remain failures after later case coverage."""

    def driver(self, errors=None, *, proven=True):
        errors = errors or {}
        fake = SimpleNamespace(out=Path("/unit-only"), report={"builds": {}},
                               current_stage="startup", calls=[], events=[])
        fake.event = lambda name, **fields: fake.events.append((name, fields))
        def run_case(fixture, *, initial=False):
            fake.calls.append((fixture, initial))
            fake.current_stage = fixture + ("/built" if proven else "/opened")
            error = errors.get(fixture)
            if isinstance(error, StrictXeLaTeXWarningError) and proven:
                fake.report["builds"][fixture] = {
                    "status": "FAIL_STRICT_XELATEX_WARNING_GATE",
                    "strict_xelatex_warning_gate": "FAIL"}
            if error is not None:
                raise error
        fake.run_case = run_case
        return fake

    def validation(self):
        return patch("qa_pgfplots_vertical_x11.evidence.validate_all", return_value={
            "status": "PASS_AUTOMATED_ORIGINAL_REVIEW_REQUIRED", "operations_observed": 27,
            "native_acceptance": "REQUIRES_INDEPENDENT_REVIEW"})

    def test_clean_suite_keeps_exact_order_and_validates_complete_inventory(self):
        fake = self.driver()
        with self.validation() as validate:
            run_suite(fake, "v2")
        self.assertEqual(fake.calls, [(f, i == 0) for i, f in enumerate(qa.fixtures_for_suite("v2"))])
        validate.assert_called_once_with(fake.out, suite="v2")
        self.assertEqual(fake.report["strict_warning_failures"], [])
        self.assertEqual(fake.report["status"], "PASS_AUTOMATED_ORIGINAL_REVIEW_REQUIRED")

    def test_two_retained_warning_cases_continue_but_cannot_be_overwritten_by_pass(self):
        fake = self.driver({f: StrictXeLaTeXWarningError("missing character, nullfont")
                            for f in ("SV-003", "SV-009")})
        with self.validation() as validate:
            run_suite(fake, "v2")
        self.assertEqual([f for f, _ in fake.calls], list(qa.fixtures_for_suite("v2")))
        self.assertEqual([f["fixture"] for f in fake.report["strict_warning_failures"]], ["SV-003", "SV-009"])
        self.assertEqual(len(fake.events), 2)
        self.assertEqual(fake.report["status"], "FAIL_STRICT_XELATEX_WARNING_GATE")
        self.assertFalse(fake.report["status"].startswith("PASS_AUTOMATED"))
        self.assertEqual(fake.report["native_acceptance"], "NOT_ACCEPTED_STRICT_XELATEX_WARNINGS")
        validate.assert_called_once_with(fake.out, suite="v2")

    def test_source_identity_or_engine_error_still_aborts_before_next_case(self):
        fake = self.driver({"external-tables": RuntimeError("recorder source mismatch")})
        with self.validation() as validate, self.assertRaisesRegex(RuntimeError, "recorder source mismatch"):
            run_suite(fake, "v2")
        self.assertEqual([f for f, _ in fake.calls], ["formula", "external-tables"])
        validate.assert_not_called()

    def test_typed_error_without_completed_build_proof_is_not_recoverable(self):
        fake = self.driver({"formula": StrictXeLaTeXWarningError("unproven warning")}, proven=False)
        with self.validation() as validate, self.assertRaisesRegex(RuntimeError, "lacks completed case proof"):
            run_suite(fake, "v2")
        self.assertEqual(fake.calls, [("formula", True)])
        self.assertEqual(fake.report["strict_warning_failures"], [])
        validate.assert_not_called()

    def test_later_hard_failure_keeps_earlier_warning_and_aborts(self):
        fake = self.driver({"SV-003": StrictXeLaTeXWarningError("nullfont"),
                            "SV-022": RuntimeError("clipboard mismatch")})
        with self.validation() as validate, self.assertRaisesRegex(RuntimeError, "clipboard mismatch"):
            run_suite(fake, "v2")
        self.assertEqual(fake.calls[-1][0], "SV-022")
        self.assertEqual(len(fake.report["strict_warning_failures"]), 1)
        validate.assert_not_called()

    def test_final_inventory_failure_still_propagates_after_warning(self):
        fake = self.driver({"SV-003": StrictXeLaTeXWarningError("nullfont")})
        with patch("qa_pgfplots_vertical_x11.evidence.validate_all", side_effect=ValueError("missing stage")):
            with self.assertRaisesRegex(ValueError, "missing stage"):
                run_suite(fake, "v2")
        self.assertEqual(fake.report["status"], "FAIL_STRICT_XELATEX_WARNING_GATE")
        self.assertEqual(len(fake.report["strict_warning_failures"]), 1)

    def test_derivative_warning_cannot_be_treated_as_an_expected_original_warning(self):
        fake = self.driver({"SV-003-clean": StrictXeLaTeXWarningError("unexpected derivative warning")})
        with self.validation() as validate:
            run_suite(fake, "v2-clean")
        validate.assert_called_once_with(fake.out, suite="v2-clean")
        self.assertEqual(fake.report["status"], "FAIL_STRICT_XELATEX_WARNING_GATE")
        self.assertEqual(fake.report["native_acceptance"], "NOT_ACCEPTED_STRICT_XELATEX_WARNINGS")
        self.assertEqual([item["fixture"] for item in fake.report["strict_warning_failures"]], ["SV-003-clean"])


if __name__ == "__main__":
    unittest.main()
