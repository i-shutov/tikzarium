#!/usr/bin/env python3
"""Real compact Studio N2/N3 libraries/caret/F1/Save/Open/XeLaTeX proof.

Only native production-window input can satisfy this scenario. Original desktop,
clipboard and saved-source evidence survives failure. Hosted X11 is not physical
Windows, macOS, Linux, IME or DPI acceptance; original review remains mandatory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import time

from qa_i61_b42_studio_x11 import audit_embedded_fonts, run, screenshot, sha, wait

APP_TREE = "fe40516186fb1728baceb40d0da137a780c1d9de"
CLIENT = (1180, 680)
SCREEN = (1366, 768)
# main.rs studio_file_menu/show_source_editor/show_studio_inspector. File path,
# source settings and tabs agree with CP05 run43370706180 originals. Library and
# completion points are bounded compact candidates, never an acceptance result.
POINTS = {
    "file_menu": (23, 15), "file_path": (143, 135),
    "source_settings": (405, 80), "source_full": (490, 150),
    "source": (200, 230), "dirty_discard": (505, 407),
    "libraries": (1030, 81), "properties": (960, 81),
    "library_panel": (1034, 543), "library_entry": (1024, 605),
    "library_connect": (1036, 581), "library_disconnect": (1014, 508),
    "complete": (989, 476), "undo": (109, 49),
    "export": (291, 49), "pdf": (439, 49),
}
FIXTURE = (
    "\\documentclass{standalone}\r\n"
    "\\usepackage{tikz}\r\n"
    "\\usepackage{fontspec}\r\n"
    "% N2 сохранить CRLF и кириллицу\r\n"
    "\\begin{document}\r\n"
    "\\setmainfont{DejaVu Serif}\r\n"
    "\\newcommand{\\OpaqueNtwo}{Фигура}\r\n"
    "\\begin{tikzpicture}\r\n"
    "\\node at (0,0) {\\OpaqueNtwo};\r\n"
    "\\end{tikzpicture}\r\n"
    "\\end{document}\r\n"
).encode("utf-8")
IMPORT = b"\\usetikzlibrary{arrows.meta}\r\n"


def parse_geometry(output: str) -> dict[str, int]:
    labels = {"X": "Absolute upper-left X", "Y": "Absolute upper-left Y",
              "WIDTH": "Width", "HEIGHT": "Height"}
    result = {}
    for key, label in labels.items():
        match = re.search(r"^\s*" + re.escape(label) + r":\s*(-?\d+)\s*$", output, re.MULTILINE)
        if match is None:
            raise RuntimeError("Cannot parse absolute X11 client geometry: " + label)
        result[key] = int(match.group(1))
    if (result["WIDTH"], result["HEIGHT"]) != CLIENT:
        raise RuntimeError("Unexpected compact client size")
    if (result["X"] < 0 or result["Y"] < 0 or result["X"] + CLIENT[0] > SCREEN[0]
            or result["Y"] + CLIENT[1] > SCREEN[1]):
        raise RuntimeError("Production client is clipped by hosted desktop")
    return result


def validate_xelatex_log(observed: bytes) -> None:
    """Accept only the actual successful GUI raw engine output, never a sentinel."""
    if b"XeTeX" not in observed or b"Output written on" not in observed:
        raise RuntimeError("Actual GUI raw log lacks successful XeLaTeX engine/output proof")
    if b"missing character:" in observed.lower() or re.search(rb"(?m)^!", observed):
        raise RuntimeError("Actual GUI XeLaTeX log reports missing glyphs or TeX errors")


def expected_elf(launcher: Path) -> Path:
    """Portable launch.sh must exec its adjacent production ELF, never QA control."""
    return (launcher.parent / "tikzarium-app" if launcher.name == "launch.sh" else launcher).resolve(strict=True)


class Native:
    """Native input/evidence shared by the three bounded N5 GUI scenarios."""
    def __init__(self, app: Path, out: Path, report: dict):
        self.app = app.resolve(strict=True)
        self.out = out
        self.report = report
        self.process = None
        self.window = None
        self.geometry = None
        self.serial = 0
        self.actions = (out / "native-actions.jsonl").open("w", encoding="utf-8", buffering=1)
        self.log = (out / "app.log").open("wb")

    def event(self, kind: str, **fields) -> None:
        self.actions.write(json.dumps({"monotonic": time.monotonic(), "event": kind,
                                       "pid": self.process.pid if self.process else None,
                                       "window": self.window, **fields}, ensure_ascii=False) + "\n")

    def alive(self):
        if self.process is None or self.process.poll() is not None:
            raise RuntimeError("Production process exited during native scenario")

    def focus(self, window=None):
        self.alive()
        target = window or self.window
        if target == self.window and run("xdotool", "getwindowpid", target) != str(self.process.pid):
            raise RuntimeError("Native app window no longer belongs to launched PID")
        run("xdotool", "windowactivate", "--sync", target)
        if int(run("xdotool", "getactivewindow"), 0) != int(target, 0):
            raise RuntimeError("Requested native window did not acquire focus")
        self.event("confirmed_focus", target=target)

    def start(self, cwd: Path, *, preserve_config=False):
        if os.environ.get("TIKZARIUM_APP_TREE_SHA") != APP_TREE:
            raise RuntimeError("Native compact source-tree lease differs from production tree")
        if run("xdotool", "getdisplaygeometry") != "1366 768":
            raise RuntimeError("Native compact drivers require actual 1366x768 desktop")
        def openbox_ready():
            observed = subprocess.run(["wmctrl", "-m"], capture_output=True, timeout=5, check=False)
            return observed.returncode == 0 and observed.stdout.startswith(b"Name: Openbox")
        wait(openbox_ready, "Openbox not ready", 12)
        env = os.environ.copy()
        env.update({"XDG_DATA_HOME": str(self.out / "data"), "XDG_CACHE_HOME": str(self.out / "cache"),
                    "LIBGL_ALWAYS_SOFTWARE": "1", "WINIT_UNIX_BACKEND": "x11",
                    "WINIT_X11_SCALE_FACTOR": "1.0"})
        if not preserve_config:
            env["XDG_CONFIG_HOME"] = str(self.out / "config")
        env.pop("WAYLAND_DISPLAY", None)
        self.process = subprocess.Popen([str(self.app)], cwd=cwd, env=env, stdout=self.log, stderr=self.log)
        def found():
            self.alive()
            result = subprocess.run(["xdotool", "search", "--onlyvisible", "--pid", str(self.process.pid),
                                     "--name", "TikZarium"], capture_output=True, timeout=5, check=False)
            matches = result.stdout.decode("ascii", "strict").split() if result.returncode == 0 else []
            if len(matches) > 1:
                raise RuntimeError("Ambiguous visible production-PID windows")
            self.window = matches[0] if matches else None
            return bool(self.window)
        wait(found, "No visible production-PID native window", 45)
        elf = expected_elf(self.app)
        proc_exe = Path(f"/proc/{self.process.pid}/exe")
        observed = proc_exe.resolve(strict=True)
        observed_hash = sha(proc_exe)
        if elf.name != "tikzarium-app" or observed != elf or observed_hash != sha(elf):
            raise RuntimeError("Observed production PID executable differs from exact intended ELF")
        self.report.update({"pid": self.process.pid, "window_id": self.window,
                            "app_sha256": sha(self.app), "app_elf_path": str(elf),
                            "app_elf_sha256": sha(elf), "observed_proc_exe": str(observed),
                            "observed_proc_exe_sha256": observed_hash})
        run("xdotool", "windowsize", "--sync", self.window, str(CLIENT[0]), str(CLIENT[1]))
        run("xdotool", "windowmove", "--sync", self.window, "0", "0")
        self.focus()
        time.sleep(1.5)
        geometry = run("xwininfo", "-id", self.window)
        (self.out / "owned-window-xwininfo.txt").write_text(geometry + "\n", encoding="utf-8")
        self.geometry = parse_geometry(geometry)
        self.report.update({"client_geometry": self.geometry, "screen_size": SCREEN,
                            "coordinate_scope": "COMPACT_CLIENT_CANDIDATES_REQUIRE_ORIGINAL_REVIEW"})
        self.event("owned_production_window", **self.report)

    def point(self, x: int, y: int):
        self.focus()
        if not (0 <= x < CLIENT[0] and 0 <= y < CLIENT[1]):
            raise RuntimeError("Pointer target outside reviewed compact client")
        run("xdotool", "mousemove", "--window", self.window, str(x), str(y))
        location = run("xdotool", "getmouselocation", "--shell")
        pointer = dict(line.split("=", 1) for line in location.splitlines() if "=" in line)
        actual = (int(pointer["X"]), int(pointer["Y"]))
        self.event("actual_pointer", client_xy=(x, y), root_xy=actual, raw_pointer=pointer)
        if actual != (self.geometry["X"] + x, self.geometry["Y"] + y):
            raise RuntimeError("Pointer differs from actual absolute client origin plus target")

    def click(self, x: int, y: int):
        self.point(x, y)
        run("xdotool", "click", "1")
        time.sleep(0.28)

    def key(self, chord: str, *, window=None):
        self.focus(window)
        self.event("native_key", chord=chord, target=window or self.window)
        run("xdotool", "key", "--clearmodifiers", "--delay", "90", chord)
        time.sleep(0.20)

    def clipboard(self, data: bytes, label: str):
        self.serial += 1
        path = self.out / f"clipboard-input-{self.serial:03d}-{label}.txt"
        path.write_bytes(data)
        subprocess.run(["xclip", "-selection", "clipboard", "-i", str(path)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=8, check=True)
        self.event("clipboard_input", file=path.name, sha256=sha(path))

    def paste(self, data: bytes, label: str):
        self.clipboard(data, label)
        self.key("ctrl+v")

    def copy(self, label: str, *, focus_source=True) -> bytes:
        sentinel = b"__NATIVE_COPY_SENTINEL__" + label.encode("utf-8")
        self.clipboard(sentinel, "copy-sentinel")
        if focus_source:
            self.click(*POINTS["source"])
            self.key("ctrl+a")
        self.key("ctrl+c")
        copied = subprocess.run(["xclip", "-selection", "clipboard", "-o"], capture_output=True,
                                timeout=8, check=True).stdout
        path = self.out / (label + "-observed.txt")
        path.write_bytes(copied)
        self.event("actual_clipboard_readback", file=path.name, sha256=sha(path))
        if copied == sentinel:
            raise RuntimeError("Native Copy did not replace fresh clipboard sentinel")
        return copied

    def full_source(self):
        # load_path resets source_full_view=false on EVERY Open. Never issue
        # Ctrl+A/Copy or prefix navigation against only the folded body field.
        self.click(*POINTS["source_settings"])
        screenshot(self.out, f"full-source-settings-{self.serial:03d}")
        self.click(*POINTS["source_full"])
        self.key("Escape")

    def dock_signature(self, label: str):
        return run("convert", str(self.out / (label + ".png")), "-crop",
                   f"252x29+{self.geometry['X'] + 921}+{self.geometry['Y'] + 67}",
                   "+repage", "-format", "%#", "info:")

    def capture_xelatex_log(self, label: str, source: Path, expected: bytes) -> Path:
        """Copy the real production Console/Raw-log UI, preserving failed originals."""
        if source.read_bytes() != expected:
            raise RuntimeError("Source differs from the revision whose GUI log is being captured")
        self.click(1118, 48)  # Actual compact Console toggle.
        screenshot(self.out, label + "-actual-console")
        self.click(158, 520)  # Actual Raw log tab.
        screenshot(self.out, label + "-actual-raw-xelatex")
        sentinel = b"__ACTUAL_GUI_XELATEX_LOG_SENTINEL__" + label.encode("utf-8")
        self.clipboard(sentinel, label + "-log-sentinel")
        self.click(246, 520)  # Product's Copy log action; no CLI compiler/log fallback.
        observed = subprocess.run(["xclip", "-selection", "clipboard", "-o"],
                                  capture_output=True, timeout=8, check=True).stdout
        path = self.out / (label + "-gui-xelatex.log")
        path.write_bytes(observed)
        self.event("actual_gui_raw_log_clipboard", file=path.name, sha256=sha(path))
        screenshot(self.out, label + "-actual-log-copied")
        # Close before validation, restoring the reviewed compact geometry even
        # when an actual failed raw log must subsequently stop the scenario.
        self.click(1118, 48)
        screenshot(self.out, label + "-console-closed")
        validate_xelatex_log(observed)
        if source.read_bytes() != expected:
            raise RuntimeError("GUI raw log capture changed the built source revision")
        return path

    def fail(self, error):
        self.report["error"] = f"{type(error).__name__}: {error}"
        self.event("failure", error=self.report["error"])
        try:
            screenshot(self.out, "failure-original-desktop")
        except Exception as capture_error:
            self.report["failure_capture_error"] = str(capture_error)

    def stop(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
        self.log.close()
        self.actions.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--coordinates", type=Path, help="Explicit app-tree-bound compact candidate points")
    args = parser.parse_args()
    out = args.out.resolve()
    if out.exists() and any(out.iterdir()):
        parser.error("N2 evidence directory must be empty")
    out.mkdir(parents=True, exist_ok=True)
    if os.environ.get("TIKZARIUM_APP_TREE_SHA") != APP_TREE:
        parser.error("N2 compact source-tree lease must match actual production tree")
    points = POINTS.copy()
    if args.coordinates:
        override = json.loads(args.coordinates.read_text(encoding="utf-8"))
        if override.get("app_tree_sha") != APP_TREE:
            parser.error("N2 coordinate override must name exact production tree")
        for name, point in override["points"].items():
            if name not in points or len(point) != 2 or any(type(x) is not int for x in point):
                parser.error("Invalid compact point override: " + name)
            if not (0 <= point[0] < CLIENT[0] and 0 <= point[1] < CLIENT[1]):
                parser.error("Compact point override outside client: " + name)
            points[name] = tuple(point)
        (out / "coordinate-input.json").write_bytes(args.coordinates.read_bytes())
    source = out / "n2-crlf.tex"
    source.write_bytes(FIXTURE)  # Original test input, before the native GUI starts.
    report = {
        "schema_version": 1, "kind": "N2_N3_REAL_STUDIO_SOURCE_LIBRARIES", "status": "FAIL",
        "host": platform.platform(), "source_head_sha": os.environ.get("TIKZARIUM_SOURCE_SHA", "UNKNOWN"),
        "app_tree_sha": APP_TREE, "real_gui": "NOT_RUN", "coordinates": points,
        "library_panel": "NOT_RUN", "library_entry": "NOT_RUN", "library_connect": "NOT_RUN",
        "library_disconnect": "NOT_RUN", "library_undo": "NOT_RUN", "gui_reopen": "NOT_RUN",
        "gui_save_open": "NOT_RUN", "xelatex_pdf": "NOT_RUN", "manual_artifact_review": "NOT_RUN",
        "five_statuses": "MANUAL_SCREENSHOT_REVIEW_REQUIRED", "n3_caret_target": "NOT_RUN",
        "physical_windows10_miktex": "NOT_RUN", "physical_mac_arm": "NOT_RUN",
    }
    native = Native(args.app, out, report)
    def click(name):
        native.click(*points[name])
    def save_expected(expected, detail):
        native.key("ctrl+s")
        wait(lambda: source.read_bytes() == expected, detail)
        (out / (detail + "-saved.tex")).write_bytes(source.read_bytes())
    def navigate_import(count):
        click("source")
        native.key("ctrl+Home")
        for _ in range(4):
            native.key("Down")
        native.key("Home")
        for _ in range(count):
            native.key("Right")
    def build_export(pdf, *, previous_mtime=None):
        native.key("ctrl+Return")
        screenshot(out, "build-started-" + str(native.serial))
        until = time.monotonic() + 180
        while time.monotonic() < until:
            native.alive()
            click("export")
            if pdf.is_file() and (previous_mtime is None or pdf.stat().st_mtime_ns != previous_mtime):
                return
            time.sleep(1)
        raise RuntimeError("Actual GUI XeLaTeX/current PDF export timed out")
    try:
        native.start(out)
        report["real_gui"] = "HOSTED_LINUX_X11_WINDOW_OPENED"
        screenshot(out, "01-studio-initial")
        click("file_menu")
        screenshot(out, "02-file-popup")
        click("file_path")
        native.key("ctrl+a")
        native.paste(str(source).encode("utf-8"), "native-open-path")
        screenshot(out, "03-open-target")
        native.key("Escape")
        native.key("ctrl+o")
        time.sleep(0.6)
        screenshot(out, "04-scratch-dirty-open-modal")
        click("dirty_discard")
        time.sleep(0.6)
        native.full_source()
        if native.copy("initial-open") != FIXTURE or source.read_bytes() != FIXTURE:
            raise RuntimeError("Actual native Open/full-source readback differs from original CRLF input")
        screenshot(out, "04a-after-gui-open-confirmed")
        report["initial_open_source_proof"] = "FRESH_SENTINEL_BYTE_EXACT_FULL_EDITOR_COPY"

        click("libraries")
        screenshot(out, "05-libraries-tab")
        click("library_panel")
        screenshot(out, "06-libraries-catalogue")
        report["library_panel"] = "REAL_X11_CATALOGUE_SCREENSHOT_RECORDED"
        click("library_entry")
        screenshot(out, "07-arrows-meta-help")
        report["library_entry"] = "HOSTED_X11_EXPANDED_DETAILS_MANUAL_REVIEW_REQUIRED"
        report["five_statuses"] = "EXPANDED_ENTRY_SCREENSHOT_REVIEW_REQUIRED"
        # Fixed bounded dock-only scroll; hosted originals must confirm action
        # geometry before the exact byte guard can establish a transaction.
        native.point(1100, 500)
        for _ in range(13):
            run("xdotool", "click", "5")
        native.event("dock_scroll", ticks=13, expected_points=520, reason="reveal-real-library-connect")
        time.sleep(0.65)
        screenshot(out, "08-connect-button-target")
        click("library_connect")
        screenshot(out, "09-after-connect")
        native.key("ctrl+s")
        wait(lambda: IMPORT in source.read_bytes(), "N2 native Connect produced no source patch")
        connected = source.read_bytes()
        if connected.count(IMPORT) != 1 or connected.replace(IMPORT, b"", 1) != FIXTURE:
            raise RuntimeError("Library Connect changed unrelated CRLF/opaque bytes")
        (out / "connected-source.tex").write_bytes(connected)
        report["library_connect"] = "PASS_REAL_X11_C_CATALOGUE_SOURCE_PATCH"
        screenshot(out, "10-connect-saved")
        native.point(1100, 500)
        for _ in range(6):
            run("xdotool", "click", "5")
        native.event("dock_scroll", ticks=6, expected_points=240, reason="reveal-disconnect-after-shared-history-row")
        time.sleep(0.65)
        screenshot(out, "10a-before-disconnect")
        click("library_disconnect")
        screenshot(out, "11-after-disconnect")
        save_expected(FIXTURE, "disconnect")
        report["library_disconnect"] = "PASS_REAL_X11_INVERSE_SOURCE_BYTES"
        click("undo")
        save_expected(connected, "undo-disconnect")
        report["library_undo"] = "PASS_REAL_X11_VISUAL_UNDO"
        screenshot(out, "12-undo-restored-source")

        # Deliberate independent on-disk test mutation; it cannot satisfy Open:
        # fresh full-editor readback AND a later GUI append/Save are required.
        external = connected.replace(b"% N2 ", b"% N2 EXTERNAL ", 1)
        if external == connected:
            raise RuntimeError("Missing independent external fixture marker")
        source.write_bytes(external)
        native.key("ctrl+o")
        time.sleep(0.7)
        native.full_source()
        if native.copy("external-reopened") != external:
            raise RuntimeError("Native Open did not replace actual full editor with external revision")
        screenshot(out, "13-reopened-external-change")
        reopened_append = b"% N2_GUI_AFTER_REAL_REOPEN"
        click("source")
        native.key("ctrl+End")
        native.paste(reopened_append, "reopen-edit")
        screenshot(out, "13a-gui-edited-reopened-source")
        save_expected(external + reopened_append, "reopen-edit")
        screenshot(out, "13b-after-gui-save")
        report["gui_reopen"] = "PASS_REAL_X11_EXTERNAL_RELOAD_AND_GUI_SAVE"
        report["gui_save_open"] = "PASS_REAL_X11_GUI_CRLF_OPEN_EDIT_SAVE"
        pdf = source.with_suffix(".pdf")
        if pdf.exists():
            raise RuntimeError("PDF unexpectedly existed before native build")
        build_export(pdf)
        click("pdf")
        screenshot(out, "15-exact-pdf-tab")
        info = run("pdfinfo", str(pdf))
        if "Pages:           1" not in info or "Фигура" not in run("pdftotext", "-enc", "UTF-8", str(pdf), "-"):
            raise RuntimeError("N2 actual PDF page/Unicode proof failed")
        fonts = run("pdffonts", str(pdf))
        if not any("DejaVu" in row for row in audit_embedded_fonts(fonts)):
            raise RuntimeError("N2 actual PDF lacks embedded DejaVu")
        (out / "pdffonts.txt").write_text(fonts + "\n", encoding="utf-8")
        (out / "pdfinfo.txt").write_text(info + "\n", encoding="utf-8")
        run("pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-png", "-r", "120", str(pdf), str(out / "16-rendered-pdf"))
        report["xelatex_pdf"] = "PASS_EXTERNAL_XELATEX_UNICODE_EMBEDDED_FONTS"
        report["pdf_sha256"] = sha(pdf)
        # The subsequent N3 export updates the working PDF. Preserve both real
        # engine outputs and their exact author-source revisions independently.
        original_n2 = out / "original-n2-before-completion.pdf"
        original_n2.write_bytes(pdf.read_bytes())
        built_n2 = out / "original-n2-built-source.tex"
        built_n2.write_bytes(source.read_bytes())
        if built_n2.read_bytes() != external + reopened_append:
            raise RuntimeError("N2 source changed during actual GUI Build/Export")
        n2_log = native.capture_xelatex_log("n2-build", source, built_n2.read_bytes())
        report["n2_build_originals"] = {
            "pdf": original_n2.name, "pdf_sha256": sha(original_n2),
            "source": built_n2.name, "source_sha256": sha(built_n2),
            "gui_xelatex_log": n2_log.name, "gui_xelatex_log_sha256": sha(n2_log),
        }
        if sha(original_n2) != report["pdf_sha256"]:
            raise RuntimeError("Preserved N2 original PDF differs from its audited hash")

        n3_full = source.read_bytes()
        if n3_full.count(IMPORT) != 1:
            raise RuntimeError("N3 requires exactly one connected arrows.meta")
        n3_prefix = n3_full.replace(IMPORT, b"\\usetikzlibrary{arro}\r\n", 1)
        navigate_import(len(r"\usetikzlibrary{"))
        for _ in range(len("arrows.meta")):
            native.key("shift+Right")
        native.paste(b"arro", "n3-prefix")
        screenshot(out, "17-n3-prefix-in-source-editor")
        save_expected(n3_prefix, "n3-prefix")
        report["n3_prefix_native_textedit"] = "PASS_REAL_X11_ONE_NAME_CRLF"
        navigate_import(len(r"\usetikzlibrary{arro"))
        for _ in range(len("arro")):
            native.key("shift+Left")
        if native.copy("n3-caret", focus_source=False) != b"arro":
            raise RuntimeError("Actual source caret selection is not literal arro")
        report["n3_caret_target"] = "PASS_REAL_X11_SELECTED_LITERAL_ARRO"
        native.key("Right")
        screenshot(out, "17a-n3-real-caret-before-brace")
        native.focus()
        run("xdotool", "keydown", "F1")
        time.sleep(0.34)
        run("xdotool", "keyup", "F1")
        time.sleep(0.48)
        screenshot(out, "18-n3-caret-f1")
        if native.dock_signature("17a-n3-real-caret-before-brace") == native.dock_signature("18-n3-caret-f1"):
            raise RuntimeError("N3 actual source F1 did not change dock tab")
        report["n3_caret_f1"] = "REAL_X11_HELP_SCREENSHOT_MANUAL_REVIEW_REQUIRED"
        native.point(1100, 500)
        for _ in range(13):
            run("xdotool", "click", "5")
        native.event("dock_scroll", ticks=13, expected_points=520, reason="native-help-completion-to-bounded-bottom")
        time.sleep(0.65)
        screenshot(out, "19-n3-caret-complete-target")
        click("complete")
        screenshot(out, "20-n3-complete-click")
        save_expected(n3_full, "n3-complete")
        if b"\n" in n3_full.replace(b"\r\n", b""):
            raise RuntimeError("N3 completed source lost CRLF")
        report["n3_caret_complete"] = "PASS_REAL_X11_C_SOURCEPATCH_MINIMAL_BYTES"
        old_pdf_mtime = pdf.stat().st_mtime_ns
        build_export(pdf, previous_mtime=old_pdf_mtime)
        click("pdf")
        screenshot(out, "22-n3-completed-exact-pdf")
        if "Фигура" not in run("pdftotext", "-enc", "UTF-8", str(pdf), "-"):
            raise RuntimeError("N3 actual PDF lacks opaque Cyrillic macro")
        n3_fonts = run("pdffonts", str(pdf))
        if not any("DejaVu" in row for row in audit_embedded_fonts(n3_fonts)):
            raise RuntimeError("N3 actual PDF lacks embedded DejaVu")
        (out / "n3-pdffonts.txt").write_text(n3_fonts + "\n", encoding="utf-8")
        run("pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-png", "-r", "120", str(pdf), str(out / "n3-rendered-pdf"))
        report["n3_xelatex_pdf"] = "PASS_REAL_GUI_EXTERNAL_XELATEX_CYRILLIC_FONTS"
        report["n3_pdf_sha256"] = sha(pdf)
        original_n3 = out / "original-n3-completed.pdf"
        original_n3.write_bytes(pdf.read_bytes())
        built_n3 = out / "original-n3-built-source.tex"
        built_n3.write_bytes(source.read_bytes())
        if built_n3.read_bytes() != n3_full:
            raise RuntimeError("N3 source changed during actual GUI Build/Export")
        n3_log = native.capture_xelatex_log("n3-build", source, n3_full)
        report["n3_build_originals"] = {
            "pdf": original_n3.name, "pdf_sha256": sha(original_n3),
            "source": built_n3.name, "source_sha256": sha(built_n3),
            "gui_xelatex_log": n3_log.name, "gui_xelatex_log_sha256": sha(n3_log),
        }
        if sha(original_n3) != report["n3_pdf_sha256"]:
            raise RuntimeError("Preserved N3 original PDF differs from its audited hash")
        click("undo")
        screenshot(out, "23-n3-visual-undo")
        save_expected(n3_prefix, "n3-undo")
        report["n3_visual_undo"] = "PASS_REAL_X11_BYTE_EXACT_INVERSE"
        report["real_gui"] = "PASS_AUTOMATED_MANUAL_ARTIFACT_REVIEW_REQUIRED"
        report["status"] = "PASS_AUTOMATED_N2_N3_REAL_STUDIO_REQUIRES_MANUAL_REVIEW"
    except Exception as exc:
        native.fail(exc)
        if source.exists():
            (out / "failure-live-source.tex").write_bytes(source.read_bytes())
    finally:
        native.stop()
        report["files"] = {p.name: sha(p) for p in sorted(out.iterdir()) if p.is_file() and p.name != "report.json"}
        (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report["status"].startswith("PASS_AUTOMATED") else 1


if __name__ == "__main__":
    raise SystemExit(main())
