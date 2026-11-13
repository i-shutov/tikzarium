"""Fail-closed absolute-client geometry contracts; no native PASS is inferred."""
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qa_n5_viewport import parse_geometry, validate_geometry


RAW = """xwininfo: Window id: 0x400001 "TikZarium"
  Absolute upper-left X:  1
  Absolute upper-left Y:  20
  Relative upper-left X:  1
  Relative upper-left Y:  20
  Width: 1180
  Height: 680
"""


class ViewportGuard(unittest.TestCase):
    def test_actual_origin_ignores_decoration_relative_fields(self):
        parsed = parse_geometry(RAW.replace("Relative upper-left X:  1", "Relative upper-left X:  999"))
        self.assertEqual(parsed, {"x": 1, "y": 20, "width": 1180, "height": 680})
        validate_geometry(parsed, 1366, 768, min_height=560)

    def test_clipped_old_full_screen_client_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "outside"):
            validate_geometry({"x": 1, "y": 20, "width": 1366, "height": 768}, 1366, 768)

    def test_missing_duplicate_or_relative_only_observations_are_rejected(self):
        for raw in (RAW.replace("Absolute upper-left X", "Untrusted X"),
                    RAW + "  Width: 1180\n", RAW.replace("Width: 1180", "Width: unknown")):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                parse_geometry(raw)

    def test_negative_origin_and_undersized_client_fail(self):
        for patch in ({"x": -1}, {"y": -1}, {"width": 849}, {"height": 439}):
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                validate_geometry(dict(parse_geometry(RAW), **patch), 1366, 768)


if __name__ == "__main__":
    unittest.main()
