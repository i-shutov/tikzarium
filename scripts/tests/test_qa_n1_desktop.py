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

    def test_x11_query_keymap_bit_state(self):
        bits = bytearray(32)
        for code in (37, 52):
            bits[code // 8] |= (1 << (code % 8))
        self.assertTrue(desktop.x11_keycode_down(bytes(bits), 37))
        self.assertTrue(desktop.x11_keycode_down(bytes(bits), 52))
        self.assertFalse(desktop.x11_keycode_down(bytes(bits), 53))
        for keymap, code in ((b"", 37), (bytes(32), 7), (bytes(32), 256)):
            with self.subTest(code=code):
                with self.assertRaises(ValueError):
                    desktop.x11_keycode_down(keymap, code)

    def test_xtest_ctrl_z_has_only_key_events_and_balanced_releases(self):
        self.assertEqual(desktop.xtest_ctrl_z_sequence(37, 52),
                         ((37, True), (52, True), (52, False), (37, False)))
        self.assertNotIn(0, [code for code, _ in desktop.xtest_ctrl_z_sequence(37, 52)])

    def test_x11_button1_mask_detection_is_fail_closed(self):
        self.assertFalse(desktop.x11_button1_pressed(0))
        self.assertFalse(desktop.x11_button1_pressed(1 << 9))
        self.assertTrue(desktop.x11_button1_pressed(1 << 8))
        self.assertTrue(desktop.x11_button1_pressed((1 << 8) | (1 << 2)))

    def test_b38_real_n1_source_profile_is_exact_tree_pinned(self):
        profile_path = Path(__file__).resolve().parents[2] / "fixtures/qa/n1-desktop-x11-1366.json"
        profile = json.loads(profile_path.read_text(encoding="utf-8"))
        self.assertEqual(profile["reviewed_app_tree_sha"],
                         "c0e45c3445f25f365ca7ac4a2985b9a4261b7373")
        self.assertNotEqual(profile["reviewed_app_tree_sha"],
                            "af316d5e5452d74186b92d65c95c448253d0e61c")
        self.assertIn("B38 source-tree ref pinned", profile["layout_note"])
        self.assertIn("not yet independently calibrated", profile["layout_note"])
        self.assertTrue(profile["undo_held_pointer"])
        self.assertTrue(profile["b30_release_source_history_regression"])
        self.assertNotIn("b28_focused_textedit_regression", profile)
        self.assertNotIn("reviewed_app_source", profile)
        self.assertFalse(profile["b36_bootstrap_clicks_unreviewed"])
        self.assertEqual(len(profile["b36_focus_layouts"]), 2)
        self.assertEqual(
            {v["name"] for v in profile["b36_focus_layouts"]},
            {"ordinary_single_line", "two_line_fit_page_status"})
        self.assertEqual(profile["b36_focus_layouts"][0]["pdf_click"], [492, 98])
        self.assertEqual(profile["b36_focus_layouts"][1]["pdf_click"], [492, 114])
        self.assertEqual(profile["b36_focus_layouts"][1]["guide_probe"], [750, 87])
        self.assertIn("PDF_CONTENT_MANUAL_NOT_RUN", MODULE.read_text(encoding="utf-8"))
        self.assertEqual(profile["b37_preview_fidelity_visual_review"], "NOT_RUN_ON_B38")
        self.assertEqual(profile["fit_click"], [659, 99])
        self.assertEqual(profile["compact_fit_width_click"], [490, 125])
        self.assertEqual(profile["compact_fit_page_click"], [570, 125])
        self.assertNotEqual(profile["compact_fit_width_click"], profile["fit_click"])
        self.assertNotEqual(profile["compact_fit_page_click"], profile["fit_page_click"])
        self.assertEqual(profile["zoom_out_click"], [523, 99])
        self.assertEqual(profile["fit_page_click"], [739, 99])
        self.assertEqual(profile["responsive_resize"], [1180, 680])
        self.assertEqual(profile["restore_size"], [1366, 740])
        self.assertLess(profile["responsive_resize"][0], profile["restore_size"][0])
        self.assertEqual(profile["gestures"][0]["tool_click"], [599, 166])
        self.assertEqual(len(profile["gestures"]), 6)
        self.assertEqual({case["tool"] for case in profile["gestures"]}, desktop.TOOLS)

    def test_b36_selected_layout_requires_one_real_selected_variant(self):
        layouts = [
            {"name": "single", "guide_probe": [1, 1], "pdf_probe": [2, 1]},
            {"name": "wrapped", "guide_probe": [1, 2], "pdf_probe": [2, 2]},
        ]
        blue, gray = (31, 126, 162), (27, 27, 27)
        sample = {(1, 1): gray, (2, 1): gray,
                  (1, 2): blue, (2, 2): gray}
        getter = lambda p: sample[tuple(p)]
        selected, _ = desktop.b36_select_reviewed_layout(layouts, "guide", getter)
        self.assertEqual(selected["name"], "wrapped")
        sample[1, 2], sample[2, 2] = gray, blue
        selected, _ = desktop.b36_select_reviewed_layout(layouts, "pdf", getter)
        self.assertEqual(selected["name"], "wrapped")
        sample[1, 1], sample[2, 1] = blue, gray
        sample[1, 2], sample[2, 2] = blue, gray
        with self.assertRaisesRegex(RuntimeError, "not unique"):
            desktop.b36_select_reviewed_layout(layouts, "guide", getter)
        sample[1, 1], sample[1, 2] = gray, gray
        with self.assertRaisesRegex(RuntimeError, "not unique"):
            desktop.b36_select_reviewed_layout(layouts, "guide", getter)
        with self.assertRaises(ValueError):
            desktop.b36_select_reviewed_layout(layouts, "inverted", getter)

    def test_b36_default_dark_selected_color_is_fail_closed(self):
        self.assertTrue(desktop.default_dark_selected_rgb((31, 126, 162)))
        self.assertFalse(desktop.default_dark_selected_rgb((60, 60, 60)))
        self.assertFalse(desktop.default_dark_selected_rgb((180, 180, 180)))
        self.assertFalse(desktop.default_dark_selected_rgb((120, 80, 50)))
        self.assertIn("pixel:p", MODULE.read_text(encoding="utf-8"))

    def test_b27_real_undo_predicate_rejects_ghost_and_unrelated_mutation(self):
        original = desktop.FIXTURE.encode("utf-8")
        before = original.replace(b"\\end{tikzpicture}",
                                  line(version=2) + b"\\end{tikzpicture}")
        desktop.verify_held_undo(before, original, original)
        for bad in (before, before + line(2, version=2),
                    original.replace("Не менять".encode(), b"changed")):
            with self.subTest(bad=bad):
                with self.assertRaises(RuntimeError):
                    desktop.verify_held_undo(before, bad, original)
        with self.assertRaises(RuntimeError):
            desktop.verify_held_undo(original, original, original)

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
