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


class ActualRunOnePopupRegression(unittest.TestCase):
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
        content = 15 * 30 - 4
        handle = max(viewport * viewport / content, 12)
        ideal = top + offset / (content - viewport) * (viewport - handle)
        for x in (self.record["right_client_x"] - 7, self.record["right_client_x"] - 6):
            result.columns[x][top:top + viewport] = [MENU_BACKGROUND] * viewport
            for y in range(math.ceil(ideal) + inset, math.floor(ideal + handle) - inset):
                result.columns[x][y] = (146, 156, 169)
        return result


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
            "status": "PASS_AUTOMATED_ORIGINAL_REVIEW_REQUIRED", "operations_observed": 26,
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


if __name__ == "__main__":
    unittest.main()
