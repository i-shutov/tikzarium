"""Offline checks for real-desktop evidence predicates, not GUI acceptance."""
import importlib.util
import json
from pathlib import Path
import unittest

MODULE = Path(__file__).resolve().parents[1] / "qa_n1_desktop.py"
spec = importlib.util.spec_from_file_location("desktop", MODULE)
desktop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(desktop)


def line(owner_id=1, tool="line", version=1, values=None):
    values = {} if values is None else values
    if version == 1:
        payload = json.dumps({"schema": 1, "id": owner_id, "tool": tool,
                              "draft": {"values": values}}).encode().hex()
    else:
        payload = json.dumps([version, owner_id, tool, values], ensure_ascii=False,
                             separators=(",", ":"))
    return ("  \\draw (0,0)--(1,1);" + desktop.MARKER + payload + "\n").encode()


class DesktopEvidenceTests(unittest.TestCase):
    def test_legacy_v1_and_compact_v2(self):
        self.assertEqual(desktop.owners(line())[0]["schema"], 1)
        self.assertEqual(desktop.owners(line(2, "cubic", 2))[0]["tool"], "cubic")
        self.assertEqual(desktop.owners(line(2, "node", 2,
                                            {"content": "Привет % tikzarium:n1: мир"}))[0]["values"]["content"],
                         "Привет % tikzarium:n1: мир")

    def test_duplicate_across_schemas_fails(self):
        with self.assertRaises(ValueError):
            desktop.owners(line() + line(1, version=2))

    def test_malformed_unknown_and_invalid_types_fail(self):
        bad = [(desktop.MARKER + "zz\n").encode(), line(version=3),
               line(owner_id=0), line(owner_id=True, version=2),
               line(tool="unregistered", version=2),
               line(version=2, values={"radius": 3})]
        for candidate in bad:
            with self.subTest(candidate=candidate):
                with self.assertRaises((ValueError, TypeError, json.JSONDecodeError)):
                    desktop.owners(candidate)

    def test_b25_candidate_profile_is_exact_source_pinned(self):
        profile_path = Path(__file__).resolve().parents[2] / "fixtures/qa/n1-desktop-x11-1366.json"
        profile = json.loads(profile_path.read_text(encoding="utf-8"))
        self.assertEqual(profile["reviewed_app_tree_sha"],
                         "033ece8a178c5c7d315fb95267e348975fe4b5d5")
        self.assertNotIn("reviewed_app_source", profile)
        self.assertEqual(profile["fit_click"], [1027, 72])
        self.assertEqual(profile["zoom_out_click"], [882, 72])
        self.assertEqual(profile["fit_page_click"], [515, 97])
        self.assertEqual(profile["gestures"][0]["tool_click"], [599, 166])
        self.assertEqual(len(profile["gestures"]), 6)
        self.assertEqual({case["tool"] for case in profile["gestures"]}, desktop.TOOLS)

    def test_generated_lines_preserve_unicode_original(self):
        original = desktop.FIXTURE.encode()
        current = original.replace(b"\\end{tikzpicture}",
                                   line() + line(2, version=2) + b"\\end{tikzpicture}")
        self.assertTrue(desktop.original_preserved(original, current))

    def test_unrelated_byte_or_newline_mutation_fails(self):
        original = desktop.FIXTURE.encode()
        self.assertFalse(desktop.original_preserved(
            original, original.replace("Не менять".encode(), b"changed")))
        self.assertFalse(desktop.original_preserved(
            original, original.replace(b"\n", b"\r\n")))

    def test_unrelated_marker_comment_cannot_be_discarded(self):
        original = desktop.FIXTURE.encode()
        current = original.replace(b"\\end{tikzpicture}",
                                   b"% user % tikzarium:n1: fake\n\\end{tikzpicture}")
        with self.assertRaises(ValueError):
            desktop.original_preserved(original, current)


if __name__ == "__main__":
    unittest.main()
