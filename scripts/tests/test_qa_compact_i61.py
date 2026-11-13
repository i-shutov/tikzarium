"""Offline compact I61 negative contracts. These are not native GUI evidence."""
from pathlib import Path
import json
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import qa_i61_b42_studio_x11 as native

class CompactInputContracts(unittest.TestCase):
    """Offline fail-closed fences; none of these results assert native GUI PASS."""
    geometry = ("Absolute upper-left X: 1\nAbsolute upper-left Y: 20\n"
                "Width: 1180\nHeight: 680\n")

    def test_true_absolute_client_origin_is_retained(self):
        self.assertEqual(native.parse_client_geometry(self.geometry),
                         {"X": 1, "Y": 20, "WIDTH": 1180, "HEIGHT": 680})

    def test_relative_frame_geometry_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "Missing true"):
            native.parse_client_geometry(self.geometry.replace("Absolute", "Relative"))

    def test_wrong_client_size_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "differs"):
            native.parse_client_geometry(self.geometry.replace("1180", "1366"))

    def test_clipped_client_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "clipped"):
            native.parse_client_geometry(self.geometry.replace("X: 1", "X: 200"))

    def test_wrong_pid_refuses_input_before_activation(self):
        session = native.NativeSession.__new__(native.NativeSession)
        session.process = SimpleNamespace(pid=123, poll=lambda: None)
        session.window = "456"
        with patch.object(native, "run", return_value="999") as run:
            with self.assertRaisesRegex(RuntimeError, "belongs"):
                session.focus()
            self.assertEqual(run.call_args_list[0].args,
                             ("xdotool", "getwindowpid", "456"))
            self.assertEqual(run.call_count, 1)

    def test_pointer_mismatch_refuses_click(self):
        session = native.NativeSession.__new__(native.NativeSession)
        session.window = "456"
        session.geometry = {"X": 1, "Y": 20}
        session.focus = lambda: None
        session.event = lambda *args, **kwargs: None
        with patch.object(native, "run", side_effect=["", "X=2\nY=3\nWINDOW=456"]) as run:
            with self.assertRaisesRegex(RuntimeError, "Actual server pointer"):
                session.move(10, 20)
            self.assertEqual(run.call_args_list[0].args,
                             ("xdotool", "mousemove", "--window", "456", "10", "20"))
            self.assertNotIn("--sync", run.call_args_list[0].args)

    def test_still_focused_clipboard_requires_exact_field_value(self):
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            with patch.object(native, "key") as keys, patch.object(native.subprocess, "run",
                    side_effect=[SimpleNamespace(), SimpleNamespace(stdout=b"10.50cm")]):
                self.assertEqual(native.copy_focused(b"10.50cm", out, "draft"), b"10.50cm")
                self.assertEqual([call.args[0] for call in keys.call_args_list], ["ctrl+a", "ctrl+c"])
                self.assertEqual((out / "draft-clipboard.txt").read_bytes(), b"10.50cm")

    def test_unchanged_clipboard_sentinel_cannot_prove_field_focus(self):
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            observed = b"I61_NATIVE_CLIPBOARD_SENTINEL_NOT_A_FIELD"
            with patch.object(native, "key"), patch.object(native.subprocess, "run",
                    side_effect=[SimpleNamespace(), SimpleNamespace(stdout=observed)]):
                with self.assertRaisesRegex(RuntimeError, "actual focused"):
                    native.copy_focused(b"10.50cm", out, "wrong-field")
                self.assertEqual((out / "wrong-field-clipboard.txt").read_bytes(), observed)

    @staticmethod
    def source():
        lines = [b"% keep opaque \\macro{\xd0\x9d\xd0\xb5} and CRLF\r\n"]
        for index, tool in enumerate(("line", "rectangle", "circle", "cubic", "arrow", "node"), 1):
            values = {"x": "9.25cm", "y": "4.00cm", "content": "Текст"} if tool == "node" else {}
            code = "\\node at (9.25cm,4.00cm) {Текст};" if tool == "node" else "\\draw (0,0) -- (1,1);"
            metadata = json.dumps([2, index, tool, values], ensure_ascii=False, separators=(",", ":"))
            lines.append(("  " + code + " % tikzarium:n1:" + metadata + "\r\n").encode())
        return b"".join(lines)

    def test_node_patch_changes_exactly_native_and_metadata_x_bytes(self):
        before = self.source()
        after = native.expected_node_x_patch(before, "10.50cm")
        self.assertEqual(after, before.replace(b"9.25cm", b"10.50cm"))
        self.assertEqual(after.count(b"\r\n"), before.count(b"\r\n"))
        self.assertEqual(after.splitlines(keepends=True)[:-1], before.splitlines(keepends=True)[:-1])
        self.assertIn("Текст".encode(), after)

    def test_noop_numeric_draft_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "must change"):
            native.expected_node_x_patch(self.source(), "9.25cm")

    def test_command_metadata_coordinate_disagreement_is_rejected(self):
        before = self.source().replace(b"at (9.25cm", b"at (3.00cm")
        with self.assertRaisesRegex(RuntimeError, "must each occur once"):
            native.expected_node_x_patch(before, "10.50cm")

    def test_duplicate_native_owner_is_rejected(self):
        before = self.source()
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            native.expected_node_x_patch(before + before.splitlines(keepends=True)[-1], "10.50cm")

    def test_failed_source_capture_keeps_original_bytes_and_prior_state(self):
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            source = out / "figure.tex"
            source.write_bytes(self.source())
            session = native.NativeSession.__new__(native.NativeSession)
            session.out, session.serial = out, 0
            session.snapshots = out / "source-states"
            session.snapshots.mkdir()
            session.event = lambda *args, **kwargs: None
            session.retain_sources("before")
            prior = next(session.snapshots.iterdir())
            expected = prior.read_bytes()
            source.write_bytes(b"failed-mutated-by-gui")
            session.retain_sources("failure")
            self.assertEqual(prior.read_bytes(), expected)
            self.assertEqual(len(list(session.snapshots.iterdir())), 2)
            self.assertEqual((session.snapshots / "002-failure-figure.tex").read_bytes(), b"failed-mutated-by-gui")


if __name__ == "__main__":
    unittest.main()
