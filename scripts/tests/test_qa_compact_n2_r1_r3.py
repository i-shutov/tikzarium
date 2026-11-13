"""Offline native-driver failure guards; these never establish GUI acceptance."""
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import qa_n2_studio_x11 as n2
import qa_r3_native_picker_x11 as r3


def geometry(x=1, y=20, width=1180, height=680):
    return (f"  Absolute upper-left X:  {x}\n  Absolute upper-left Y:  {y}\n"
            f"  Width: {width}\n  Height: {height}\n")


class CompactGeometry(unittest.TestCase):
    def test_uses_absolute_origin_even_when_relative_origin_disagrees(self):
        parsed = n2.parse_geometry(geometry() + "  Relative upper-left X: 999\n  Relative upper-left Y: 999\n")
        self.assertEqual(parsed, {"X": 1, "Y": 20, "WIDTH": 1180, "HEIGHT": 680})

    def test_rejects_clipped_or_wrong_client_and_missing_absolute_origin(self):
        for raw in (geometry(x=-1), geometry(y=100), geometry(x=190), geometry(width=1366),
                    "Relative upper-left X: 0\nRelative upper-left Y: 0\nWidth: 1180\nHeight: 680\n"):
            with self.subTest(raw=raw), self.assertRaises(RuntimeError):
                n2.parse_geometry(raw)

    def test_packaged_launcher_names_actual_adjacent_elf(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            launcher = root / "launch.sh"
            elf = root / "tikzarium-app"
            launcher.write_text("exec ./tikzarium-app\n")
            elf.write_bytes(b"\x7fELF production test input")
            self.assertEqual(n2.expected_elf(launcher), elf)
            self.assertEqual(n2.expected_elf(elf), elf)
            elf.unlink()
            with self.assertRaises(FileNotFoundError):
                n2.expected_elf(launcher)


class NativeGuards(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.app = self.root / "tikzarium-app"
        self.app.write_bytes(b"\x7fELF")
        self.native = n2.Native(self.app, self.root, {})
        self.native.process = Mock(pid=42)
        self.native.process.poll.return_value = None
        self.native.window = "1234"
        self.native.geometry = {"X": 1, "Y": 20, "WIDTH": 1180, "HEIGHT": 680}

    def tearDown(self):
        self.native.process = None
        self.native.stop()
        self.temp.cleanup()

    def test_foreign_pid_is_rejected_before_activation(self):
        with patch.object(n2, "run", return_value="999") as command:
            with self.assertRaisesRegex(RuntimeError, "launched PID"):
                self.native.focus()
        command.assert_called_once_with("xdotool", "getwindowpid", "1234")

    def test_native_dialog_hex_id_and_decimal_active_id_are_same_window(self):
        with patch.object(n2, "run", side_effect=["", "1234"]):
            self.native.focus("0x000004d2")

    def test_wrong_active_native_dialog_is_rejected(self):
        with patch.object(n2, "run", side_effect=["", "1235"]):
            with self.assertRaisesRegex(RuntimeError, "acquire focus"):
                self.native.focus("0x000004d2")

    def test_pointer_mismatch_prevents_click_and_retains_server_location(self):
        self.native.focus = Mock()
        with patch.object(n2, "run", side_effect=["", "X=201\nY=251\nWINDOW=1234\n"]) as command:
            with self.assertRaisesRegex(RuntimeError, "absolute client origin"):
                self.native.click(200, 230)
        self.assertFalse(any(call.args[1] == "click" for call in command.call_args_list))
        self.assertNotIn("--sync", command.call_args_list[0].args)
        self.assertIn('"root_xy": [201, 251]', (self.root / "native-actions.jsonl").read_text())

    def test_copy_retains_unstripped_crlf_and_requires_fresh_clipboard(self):
        self.native.clipboard = Mock()
        self.native.click = Mock()
        self.native.key = Mock()
        exact = b"% Unicode \xd0\xaf\r\n\r\n  "
        with patch.object(n2.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, exact)):
            self.assertEqual(self.native.copy("exact-source"), exact)
        self.assertEqual((self.root / "exact-source-observed.txt").read_bytes(), exact)
        self.native.click.assert_called_once_with(*n2.POINTS["source"])
        sentinel = b"__NATIVE_COPY_SENTINEL__stale"
        with patch.object(n2.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, sentinel)):
            with self.assertRaisesRegex(RuntimeError, "fresh clipboard sentinel"):
                self.native.copy("stale")
        self.assertEqual((self.root / "stale-observed.txt").read_bytes(), sentinel)

    def test_selected_caret_copy_does_not_change_selection(self):
        self.native.clipboard = Mock()
        self.native.click = Mock()
        self.native.key = Mock()
        with patch.object(n2.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, b"arro")):
            self.assertEqual(self.native.copy("caret", focus_source=False), b"arro")
        self.native.click.assert_not_called()
        self.native.key.assert_called_once_with("ctrl+c")

    def test_wrong_app_tree_fails_before_any_native_process(self):
        with patch.dict(n2.os.environ, {"TIKZARIUM_APP_TREE_SHA": "0" * 40}):
            with patch.object(n2.subprocess, "Popen") as launch:
                with self.assertRaisesRegex(RuntimeError, "source-tree lease"):
                    self.native.start(self.root)
                launch.assert_not_called()


class ActualGuiXeLaTeXLog(unittest.TestCase):
    SUCCESS = b"This is XeTeX, Version 3.141592653\nOutput written on figure.pdf (1 page).\n"

    def test_success_requires_actual_engine_and_output_markers(self):
        n2.validate_xelatex_log(self.SUCCESS)
        for invalid in (b"__ACTUAL_GUI_XELATEX_LOG_SENTINEL__", b"Output written on figure.pdf",
                        b"This is XeTeX, Version 3\nEmergency stop."):
            with self.subTest(invalid=invalid), self.assertRaises(RuntimeError):
                n2.validate_xelatex_log(invalid)

    def test_successful_output_does_not_hide_missing_glyph_or_tex_error(self):
        for diagnostic in (b"Missing character: There is no X in font!\n",
                           b"missing CHARACTER: glyph absent\n", b"! Undefined control sequence.\n"):
            with self.subTest(diagnostic=diagnostic), self.assertRaisesRegex(RuntimeError, "missing glyphs or TeX errors"):
                n2.validate_xelatex_log(self.SUCCESS + diagnostic)

    def test_failed_raw_copy_retains_actual_bytes_and_closes_console(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            app = root / "tikzarium-app"
            app.write_bytes(b"\x7fELF")
            source = root / "figure.tex"
            source.write_bytes(b"exact user source\r\n")
            native = n2.Native(app, root, {})
            native.click = Mock()
            native.clipboard = Mock()
            observed = b"__ACTUAL_GUI_XELATEX_LOG_SENTINEL__n2-build"
            try:
                with patch.object(n2, "screenshot"), patch.object(n2.subprocess, "run", return_value=
                        subprocess.CompletedProcess([], 0, observed)):
                    with self.assertRaisesRegex(RuntimeError, "successful XeLaTeX"):
                        native.capture_xelatex_log("n2-build", source, source.read_bytes())
                self.assertEqual((root / "n2-build-gui-xelatex.log").read_bytes(), observed)
                self.assertEqual(native.click.call_args_list[-1].args, (1118, 48))
                self.assertEqual(source.read_bytes(), b"exact user source\r\n")
            finally:
                native.stop()

    def test_log_capture_refuses_wrong_built_source_before_ui_input(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            app = root / "tikzarium-app"
            app.write_bytes(b"\x7fELF")
            source = root / "figure.tex"
            source.write_bytes(b"unexpected newer revision")
            native = n2.Native(app, root, {})
            native.click = Mock()
            try:
                with self.assertRaisesRegex(RuntimeError, "revision"):
                    native.capture_xelatex_log("n3-build", source, b"expected completed revision")
                native.click.assert_not_called()
            finally:
                native.stop()


class NativePickerGuards(unittest.TestCase):
    def test_new_egui_or_unrelated_window_cannot_impersonate_native_picker(self):
        with TemporaryDirectory() as folder:
            out = Path(folder)
            with patch.object(r3, "windows", return_value={"0x10": "0x10 host Other"}), \
                 patch.object(r3, "run", return_value='WM_CLASS(STRING) = "Other", "Other"'):
                with self.assertRaisesRegex(RuntimeError, "native GTK/dialog metadata"):
                    r3.native_dialog(set(), "open", out)
            self.assertIn("Other", (out / "open-dialog-window.txt").read_text())

    def test_multiple_new_windows_are_not_arbitrarily_selected(self):
        with TemporaryDirectory() as folder:
            with patch.object(r3, "windows", return_value={"0x10": "one", "0x11": "two"}):
                with self.assertRaisesRegex(RuntimeError, "Ambiguous"):
                    r3.native_dialog(set(), "open", Path(folder))

    def test_actual_native_metadata_is_retained_for_review(self):
        with TemporaryDirectory() as folder:
            out = Path(folder)
            metadata = ('WM_CLASS(STRING) = "xdg-desktop-portal-gtk", "Xdg-desktop-portal-gtk"\n'
                        '_NET_WM_WINDOW_TYPE(ATOM) = _NET_WM_WINDOW_TYPE_DIALOG')
            with patch.object(r3, "windows", return_value={"0x10": "0x10 host Open File"}), \
                 patch.object(r3, "run", return_value=metadata):
                self.assertEqual(r3.native_dialog(set(), "open", out), "0x10")
            self.assertIn(metadata, (out / "open-dialog-window.txt").read_text())


if __name__ == "__main__":
    unittest.main()
