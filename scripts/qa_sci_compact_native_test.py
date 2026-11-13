#!/usr/bin/env python3
"""Offline validator regressions only. These tests produce no native evidence."""
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import tempfile
import struct
from types import SimpleNamespace
import unittest
import zlib

import qa_sci_compact_native as qa


class ArtifactContracts(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="sci-compact-unit-only-")
        self.root = Path(self.temporary.name)
        self.fixture = self.root / "unit-input.tex"
        self.fixture.write_bytes(b"\\begin{document}\n\\begin{axis}[samples=150]\n\\end{axis}\n\\end{document}\n")
        self.out = self.root / "audit"

    def tearDown(self):
        self.temporary.cleanup()

    def prepare(self):
        with redirect_stdout(StringIO()):
            qa.prepare(SimpleNamespace(out=self.out, fixture=self.fixture))

    def unit_png(self, path, dimensions=(1366, 768)):
        """Valid uniform UNIT image in temporary test storage; no desktop claim."""
        width, height = dimensions
        def chunk(kind, data):
            return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
        pixels = (b"\x00" + b"\x12\x34\x56" * width) * height
        path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
                         + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b""))

    def test_prepare_separates_inputs_and_expected_without_observed_results(self):
        self.prepare()
        original = (self.out / "expected/original.tex").read_bytes()
        self.assertEqual(original, (self.out / "inputs/compact-pgfplots.tex").read_bytes())
        self.assertNotIn(b"\n", original.replace(b"\r\n", b""))
        self.assertIn("Привет α".encode(), original)
        self.assertEqual((self.out / "expected/typed.tex").read_bytes(), original + qa.MARKER)
        self.assertNotIn(b"\n", qa.MARKER)
        self.assertNotIn(b"\r", qa.MARKER)
        self.assertEqual((self.out / "expected/applied.tex").read_bytes(), original.replace(b"samples=150", b"samples=151") + qa.MARKER)
        self.assertEqual(list((self.out / "observed").iterdir()), [])
        self.assertEqual(qa.read_json(self.out / "manifest.json")["native_acceptance"], "NOT_RUN")

    def test_prepare_rejects_ambiguous_samples_target(self):
        self.fixture.write_bytes(self.fixture.read_bytes() + b"% samples=150\n")
        with self.assertRaisesRegex(ValueError, "exactly one"):
            self.prepare()
        self.assertFalse(self.out.exists())

    def test_record_rejects_expected_file_as_observed_gui_source(self):
        self.prepare()
        args = SimpleNamespace(out=self.out, stage="opened", source=self.out / "expected/original.tex")
        with self.assertRaisesRegex(ValueError, "separate live GUI"):
            qa.record(args)

    def test_record_retains_mismatched_source_as_failed_original_observation(self):
        self.prepare()
        live = self.root / "live.tex"
        live.write_bytes(b"deliberately mismatched UNIT input; no GUI claim")
        screenshot = self.root / "unit-only.png"
        self.unit_png(screenshot)
        visible = self.root / "visible.txt"
        visible.write_bytes(live.read_bytes())
        args = SimpleNamespace(out=self.out, stage="opened", source=live,
                               screenshot=screenshot, visible_source=visible,
                               action="UNIT test; no native GUI action")
        with redirect_stdout(StringIO()):
            with self.assertRaisesRegex(ValueError, "original failure snapshot preserved"):
                qa.record(args)
        observed = self.out / "observed/opened"
        self.assertEqual((observed / "saved-source.tex").read_bytes(), live.read_bytes())
        self.assertFalse(qa.read_json(observed / "stage.json")["expected_source_match"])

    def test_record_retains_mismatched_clipboard_with_source_and_screenshot(self):
        self.prepare()
        live = self.root / "live.tex"
        live.write_bytes((self.out / "expected/original.tex").read_bytes())
        screenshot = self.root / "unit-only.png"
        self.unit_png(screenshot)
        visible = self.root / "wrong-editor.txt"
        visible.write_bytes(b"UNIT_ONLY different document in the editor")
        args = SimpleNamespace(out=self.out, stage="opened", source=live,
                               screenshot=screenshot, visible_source=visible,
                               action="UNIT negative test, no native action")
        with redirect_stdout(StringIO()):
            with self.assertRaisesRegex(ValueError, "source-editor text differs"):
                qa.record(args)
        observed = self.out / "observed/opened"
        self.assertEqual((observed / "saved-source.tex").read_bytes(), live.read_bytes())
        self.assertEqual((observed / "screenshot.original.png").read_bytes(), screenshot.read_bytes())
        self.assertEqual((observed / "visible-source.txt").read_bytes(), visible.read_bytes())
        metadata = qa.read_json(observed / "stage.json")
        self.assertTrue(metadata["expected_source_match"])
        self.assertFalse(metadata["editor_source_matches"])
        self.assertIn("Captured source-editor text differs from saved source", metadata["failure_reasons"])

    def unit_observations(self):
        """Construct UNIT-only stage inputs; never invoke a native action."""
        self.prepare()
        live = self.root / "unit-live.tex"
        screenshot = self.root / "unit-only.png"
        self.unit_png(screenshot)
        clipboard = self.root / "unit-editor.txt"
        with redirect_stdout(StringIO()):
            for index, (stage, expectation) in enumerate(qa.STAGES.items()):
                live.write_bytes((self.out / "expected" / (expectation + ".tex")).read_bytes())
                clipboard.write_bytes(live.read_bytes())
                qa.record(SimpleNamespace(out=self.out, stage=stage, source=live,
                                          screenshot=screenshot, visible_source=clipboard,
                                          action="UNIT test only; no native GUI action"))
                self.update_stage(stage, captured_utc=f"2026-11-13T10:00:{index:02d}+00:00")

    def update_stage(self, folder, **changes):
        path = self.out / "observed" / folder / "stage.json"
        metadata = qa.read_json(path)
        metadata.update(changes)
        qa.write_json(path, metadata)

    def assert_failed_audit(self, message):
        with redirect_stdout(StringIO()):
            with self.assertRaisesRegex(ValueError, "Artifact validation failed"):
                qa.validate(SimpleNamespace(out=self.out))
        report = qa.read_json(self.out / "audit-report.json")
        self.assertEqual(report["status"], "FAIL")
        self.assertIn(message, report["error"])
        self.assertEqual(report["native_acceptance"], "NOT_VERIFIED")
        self.assertEqual(report["pdf_to_source_binding"], "REQUIRES_INDEPENDENT_REVIEW")

    def test_validate_rejects_stage_folder_metadata_identity_mismatch(self):
        self.unit_observations()
        self.update_stage("typed", stage="applied")
        self.assert_failed_audit("Stage metadata identity differs from folder: typed")

    def test_validate_rejects_false_expected_match_even_when_saved_bytes_match(self):
        self.unit_observations()
        self.update_stage("typed", expected_source_match=False)
        self.assert_failed_audit("Stage does not affirm expected source match: typed")

    def test_validate_rejects_mixed_live_documents_even_when_all_bytes_match(self):
        self.unit_observations()
        self.update_stage("typed", live_source_path=str(self.root / "another-document.tex"))
        self.assert_failed_audit("Mixed live source documents across stages: typed")

    def test_validate_rejects_changed_manifest_order(self):
        self.unit_observations()
        path = self.out / "manifest.json"
        metadata = qa.read_json(path)
        metadata["stages"] = list(reversed(qa.STAGE_ORDER))
        qa.write_json(path, metadata)
        self.assert_failed_audit("Manifest stages must exactly match the allowed stage order")

    def test_validate_rejects_naive_timestamp(self):
        self.unit_observations()
        self.update_stage("typed", captured_utc="2026-11-13T10:00:01")
        self.assert_failed_audit("Captured timestamp must include a timezone: typed")

    def test_validate_rejects_invalid_timestamp(self):
        self.unit_observations()
        self.update_stage("typed", captured_utc="not a timestamp")
        self.assert_failed_audit("Invalid captured timestamp: typed")

    def test_validate_compares_timestamp_instants_instead_of_iso_text_order(self):
        self.unit_observations()
        # Lexically later, but actually one hour BEFORE the opened stage.
        self.update_stage("typed", captured_utc="2026-11-13T11:00:00+02:00")
        self.assert_failed_audit("Stage timestamps are not monotonic: typed")

    def test_validate_rejects_contradictory_visible_match_flag(self):
        self.unit_observations()
        self.update_stage("opened", editor_source_matches=False)
        self.assert_failed_audit("Stage does not affirm visible editor source match: opened")

    @unittest.skipIf(qa.Image is None, "JPEG unit fixture uses already available Pillow")
    def test_original_jpeg_is_retained_without_conversion_and_screen_scope_is_explicit(self):
        with redirect_stdout(StringIO()):
            qa.prepare(SimpleNamespace(out=self.out, fixture=self.fixture,
                                       screen_size=(1364, 1024), client_size=(1180, 680)))
        live = self.root / "unit-live.tex"
        live.write_bytes((self.out / "expected/original.tex").read_bytes())
        jpeg = self.root / "unit-original.jpg"
        qa.Image.new("RGB", (1364, 1024), (18, 52, 86)).save(jpeg, format="JPEG")
        visible = self.root / "unit-editor.txt"
        visible.write_bytes(live.read_bytes())
        with redirect_stdout(StringIO()):
            qa.record(SimpleNamespace(out=self.out, stage="opened", source=live,
                                      screenshot=jpeg, visible_source=visible,
                                      action="UNIT test only, no native desktop"))
        metadata = qa.read_json(self.out / "observed/opened/stage.json")
        self.assertEqual(metadata["screenshot_file"], "screenshot.original.jpg")
        self.assertEqual(metadata["screenshot_size"], [1364, 1024])
        self.assertEqual(metadata["client_size_operator_reported"], [1180, 680])
        retained = self.out / "observed/opened/screenshot.original.jpg"
        self.assertEqual(retained.read_bytes(), jpeg.read_bytes())
        self.assertEqual(metadata["screenshot_sha256"], qa.sha(jpeg))
        self.assertFalse(qa.read_json(self.out / "manifest.json")["matches_target_screen"])

    def test_record_preserves_wrong_screen_size_as_failed_observation(self):
        self.prepare()
        live = self.root / "unit-live.tex"
        live.write_bytes((self.out / "expected/original.tex").read_bytes())
        png = self.root / "unit-only.png"
        self.unit_png(png, (1364, 1024))
        visible = self.root / "unit-editor.txt"
        visible.write_bytes(live.read_bytes())
        with redirect_stdout(StringIO()):
            with self.assertRaisesRegex(ValueError, "Expected declared screen"):
                qa.record(SimpleNamespace(out=self.out, stage="opened", source=live,
                                          screenshot=png, visible_source=visible,
                                          action="UNIT test only, no native desktop"))
        retained = self.out / "observed/opened/screenshot.original.png"
        self.assertEqual(retained.read_bytes(), png.read_bytes())
        self.assertTrue(qa.read_json(self.out / "manifest.json")["matches_target_screen"])

    def test_missing_stages_can_only_produce_failed_audit_without_native_pass(self):
        self.prepare()
        with redirect_stdout(StringIO()), self.assertRaisesRegex(ValueError, "Artifact validation failed"):
            qa.validate(SimpleNamespace(out=self.out))
        report = qa.read_json(self.out / "audit-report.json")
        self.assertEqual(report["status"], "FAIL")
        self.assertEqual(report["native_acceptance"], "NOT_VERIFIED")
        self.assertEqual(report["manual_image_pdf_review"], "NOT_RUN")


if __name__ == "__main__":
    unittest.main()
