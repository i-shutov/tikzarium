"""I60 proof predicates: synthetic source tests, not actual X11 or PDF."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import unittest

FILE = Path(__file__).resolve().parents[1] / "qa_i60_b41_inspector_x11.py"
spec = importlib.util.spec_from_file_location("i60_script", FILE)
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)

NATIVE = (
    b'  \\draw (1.25cm,2.50cm) circle[radius=1.00cm]; '
    b'% tikzarium:n1:[2,1,"circle",{"center_x":"1.25cm",'
    b'"center_y":"2.50cm","radius":"1.00cm"}]\n'
)


def authored(line=NATIVE, original=qa.SRC):
    return original.replace(b"\\end{tikzpicture}", line + b"\\end{tikzpicture}", 1)


class TestI60Proof(unittest.TestCase):
    def test_real_fixture_preserves_opaque_utf8_and_distinct_crlf(self):
        self.assertIn("Не менять".encode("utf-8"), qa.SRC)
        self.assertEqual(qa.SRC.count(b"\r\n"), 0)
        self.assertTrue(qa.CONTROL.count(b"\r\n") > 6)
        self.assertEqual(qa.CONTROL.replace(b"\r\n", b"\n").count(b"\r"), 0)
        self.assertNotEqual(qa.SRC, qa.CONTROL)

    def test_one_owned_circle_and_exact_unrelated_source(self):
        self.assertEqual(qa.owned_circle(authored()), NATIVE)
        self.assertIn(b"\\OpaqueLabel", authored())
        with self.assertRaises(AssertionError):
            qa.owned_circle(qa.SRC)
        with self.assertRaises(AssertionError):
            qa.owned_circle(authored(NATIVE + NATIVE))
        with self.assertRaises(AssertionError):
            qa.owned_circle(authored(original=qa.SRC + b"% foreign edit\n"))

    def test_only_radius_and_catalogue_metadata_changed(self):
        prior = authored()
        changed_line = NATIVE.replace(b"radius=1.00cm", b"radius=2.75cm")
        changed_line = changed_line.replace(b'"radius":"1.00cm"',
                                            b'"radius":"2.75cm"')
        after = authored(changed_line)
        qa.assert_only_circle_radius(prior, after)
        with self.assertRaises(AssertionError):
            qa.assert_only_circle_radius(prior, prior)
        with self.assertRaises(AssertionError):
            qa.assert_only_circle_radius(prior, authored(
                changed_line.replace(b"center_y", b"center_z")))
        with self.assertRaises(AssertionError):
            qa.assert_only_circle_radius(prior, authored(
                NATIVE.replace(b"radius=1.00cm", b"radius=2.75cm")))
        with self.assertRaises(AssertionError):
            qa.assert_only_circle_radius(prior, authored(
                NATIVE.replace(b'"radius":"1.00cm"', b'"radius":"2.75cm"')))


if __name__ == "__main__":
    unittest.main()
