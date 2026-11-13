#!/usr/bin/env python3
"""Bounded production-GUI scientific mixed-history driver for hosted Linux/X11.

Run under an already started 1366x768 Xvfb desktop with Openbox. This sends
actual owned-window X11 input, retains original screenshots/clipboard/source,
and delegates artifact checks to qa_sci_compact_native. It does not implement
the old six-primitive I61 suite and never modifies its historical pins.
"""
from __future__ import annotations

import argparse
from contextlib import redirect_stdout
from io import StringIO
import json
import os
from pathlib import Path
import platform
import re
import shutil
import signal
import subprocess
import sys
import time
from types import SimpleNamespace

import qa_sci_compact_native as audit

CLIENT = (1180, 680)
# Client pixels for the compact two-row production UI. This is a new, scoped
# scientific path: actual original images and source/clipboard checks must
# independently confirm every operation on the recorded source tree.
POINTS = {
    "file_menu": (23, 15), "file_path": (143, 135),
    "source_settings": (405, 80), "source_full_source": (490, 150),
    "source": (200, 230), "dirty_discard": (505, 407),
    "inspector_properties": (960, 81), "scan": (1015, 273),
    "candidate": (1020, 305), "first_axis": (1000, 333),
    "samples_value": (1020, 419), "apply": (958, 449),
    "undo": (109, 49), "export": (291, 49), "pdf_view": (439, 49),
    "console": (1118, 48), "raw_log": (235, 527), "copy_log": (370, 527),
}


def run_bytes(*argv: str, timeout: float = 15) -> bytes:
    result = subprocess.run(argv, capture_output=True, timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError(f"{argv[0]} exit {result.returncode}: "
                           + result.stderr.decode("utf-8", "replace")[-1000:])
    return result.stdout


def run(*argv: str, timeout: float = 15) -> str:
    return run_bytes(*argv, timeout=timeout).decode("utf-8", "strict").strip()


def wait_for(predicate, seconds: float, detail: str) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.20)
    raise RuntimeError(detail)


def source_provenance(root: Path, app: Path) -> dict:
    head = run("git", "-C", str(root), "rev-parse", "HEAD")
    tree = run("git", "-C", str(root), "rev-parse", "HEAD:crates/tikzarium-app/src")
    if os.environ.get("TIKZARIUM_SOURCE_SHA") != head:
        raise ValueError("TIKZARIUM_SOURCE_SHA must equal the actual source HEAD")
    if os.environ.get("TIKZARIUM_APP_TREE_SHA") != tree:
        raise ValueError("TIKZARIUM_APP_TREE_SHA must equal the actual production app tree")
    dirty = run("git", "-C", str(root), "status", "--porcelain", "--",
                "crates", "extensions", "Cargo.toml", "Cargo.lock")
    if dirty:
        raise ValueError("Protected production source differs from committed build source: " + dirty)
    if app.name == "tikzarium-qa-control":
        raise ValueError("Scientific native driver requires the production tikzarium-app binary")
    return {"source_head_sha": head, "app_tree_sha": tree, "app_sha256": audit.sha(app)}


class Driver:
    def __init__(self, args, provenance):
        self.args = args
        self.out = args.out.resolve()
        self.raw = self.out / "raw"
        self.raw.mkdir()
        self.live = self.out / "live"
        self.live.mkdir()
        self.source = self.live / "compact-pgfplots.tex"
        # This is explicit original test INPUT, before any GUI action. All
        # subsequent source modifications must be persisted by the GUI.
        shutil.copyfile(self.out / "inputs/compact-pgfplots.tex", self.source)
        self.expected = {name: (self.out / "expected" / (name + ".tex")).read_bytes()
                         for name in ("original", "typed", "applied")}
        self.provenance = provenance
        self.points = POINTS.copy()
        if args.coordinates:
            coordinates = audit.read_json(args.coordinates.resolve(strict=True))
            if coordinates.get("app_tree_sha") != provenance["app_tree_sha"]:
                raise ValueError("Coordinate override must name the actual reviewed app tree")
            for name, point in coordinates["points"].items():
                if name not in self.points or len(point) != 2 or any(type(value) is not int for value in point):
                    raise ValueError("Invalid client-coordinate override: " + name)
                self.points[name] = tuple(point)
            shutil.copyfile(args.coordinates, self.raw / "coordinate-override.json")
        if any(not (0 <= x < CLIENT[0] and 0 <= y < CLIENT[1]) for x, y in self.points.values()):
            raise ValueError("Client coordinates exceed the bounded app client")
        self.action_file = (self.out / "native-actions.log").open("w", encoding="utf-8", buffering=1)
        self.app_log = (self.out / "app.log").open("wb")
        self.process = None
        self.window = None
        self.geometry = None
        self.serial = 0
        self.current_stage = "startup"
        self.report = {"kind": "SCI_COMPACT_X11_PRODUCTION_DRIVER", "status": "NOT_RUN",
                       "gui": "HOSTED_GUI_LINUX_X11", "phase": args.phase,
                       "host": platform.platform(), "screen_size": audit.TARGET_SCREEN,
                       "client_size": CLIENT, "physical_win10": "NOT_RUN", "mac_m1_m4": "NOT_RUN",
                       "native_acceptance": "REQUIRES_INDEPENDENT_REVIEW",
                       "coordinate_scope": "CURRENT_COMPACT_CLIENT_CANDIDATES_REQUIRE_ORIGINAL_IMAGE_REVIEW",
                       "coordinates": self.points, "artifact_audit_report": "audit-report.json",
                       **provenance}

    def event(self, kind: str, **fields) -> None:
        item = {"utc": audit.now(), "event": kind, "stage": self.current_stage,
                "window_id": self.window, "pid": self.process.pid if self.process else None,
                "source_sha256": audit.sha(self.source) if self.source.is_file() else None,
                **fields}
        self.action_file.write(json.dumps(item, ensure_ascii=False) + "\n")

    def alive(self) -> None:
        if self.process is None or self.process.poll() is not None:
            raise RuntimeError("Production GUI process exited before the native sequence completed")

    def owned_focus(self) -> None:
        self.alive()
        if run("xdotool", "getwindowpid", self.window) != str(self.process.pid):
            raise RuntimeError("X11 window is no longer owned by the production app PID")
        run("xdotool", "windowactivate", "--sync", self.window)
        if run("xdotool", "getactivewindow") != self.window:
            raise RuntimeError("Production app window did not become the active X11 client")

    def key(self, chord: str) -> None:
        self.owned_focus()
        self.event("x11_key", chord=chord)
        run("xdotool", "key", "--clearmodifiers", "--delay", "90", chord)
        time.sleep(0.20)

    def click(self, name: str) -> None:
        self.owned_focus()
        x, y = self.points[name]
        # --sync can block indefinitely when the pointer is already at the
        # requested target (observed first hosted run, before marker input).
        # Move, query the actual server pointer, then send the real click.
        run("xdotool", "mousemove", "--window", self.window, str(x), str(y))
        location = run("xdotool", "getmouselocation", "--shell")
        pointer = dict(line.split("=", 1) for line in location.splitlines() if "=" in line)
        actual_root = (int(pointer["X"]), int(pointer["Y"]))
        self.event("x11_click", control=name, client_xy=(x, y),
                   actual_pointer_root_xy=actual_root,
                   pointer_window=pointer.get("WINDOW"),
                   reported_geometry_xy=(self.geometry["X"], self.geometry["Y"]))
        if actual_root != (self.geometry["X"] + x, self.geometry["Y"] + y):
            raise RuntimeError("Actual pointer differs from absolute client origin plus requested client point")
        run("xdotool", "click", "1")
        time.sleep(0.28)

    def clipboard(self, data: bytes, detail: str) -> None:
        self.serial += 1
        path = self.raw / f"clipboard-input-{self.serial:03d}-{detail}.txt"
        path.write_bytes(data)
        self.event("x11_clipboard_input", detail=detail, input_file=str(path.relative_to(self.out)),
                   input_sha256=audit.sha(path))
        # xclip backgrounds its clipboard owner; detached inherited pipes must
        # not be captured, or a successful paste appears to time out.
        subprocess.run(["xclip", "-selection", "clipboard", "-i", str(path)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       timeout=8, check=True)

    def paste(self, data: bytes, detail: str) -> None:
        self.clipboard(data, detail)
        self.key("ctrl+v")

    def screenshot(self, label: str) -> Path:
        self.alive()
        self.serial += 1
        path = self.raw / f"{self.serial:03d}-{label}.png"
        run("import", "-window", "root", str(path), timeout=30)
        if audit.original_image_size(path) != audit.TARGET_SCREEN:
            raise RuntimeError("Original X11 desktop image is not the declared 1366x768 scope")
        self.event("original_desktop_png", file=str(path.relative_to(self.out)), sha256=audit.sha(path))
        return path

    def copy_editor(self, detail: str) -> Path:
        self.clipboard(b"SCI_NATIVE_CLIPBOARD_SENTINEL_NOT_EDITOR", "copy-sentinel")
        self.click("source")
        self.key("ctrl+a")
        self.key("ctrl+c")
        observed = run_bytes("xclip", "-selection", "clipboard", "-o")
        self.serial += 1
        path = self.raw / f"{self.serial:03d}-{detail}-editor.txt"
        path.write_bytes(observed)
        self.event("actual_editor_clipboard", file=str(path.relative_to(self.out)), sha256=audit.sha(path))
        return path

    def stage(self, name: str, description: str, *, visible: Path | None = None) -> None:
        self.current_stage = name
        self.key("ctrl+s")
        expected = self.expected[audit.STAGES[name]]
        # Wait only for asynchronous GUI persistence. Even a mismatch is then
        # passed to record(), which retains original failed source/PNG/text.
        until = time.monotonic() + 4
        while time.monotonic() < until and self.source.read_bytes() != expected:
            self.alive()
            time.sleep(0.20)
        image = self.screenshot(name)
        with redirect_stdout(StringIO()):
            audit.record(SimpleNamespace(out=self.out, stage=name, source=self.source,
                                         screenshot=image, visible_source=visible,
                                         client_size=CLIENT, action=description))
        self.event("stage_originals_recorded", name=name, expected_source_sha256=audit.digest(expected))

    def start(self) -> None:
        if run("xdotool", "getdisplaygeometry") != "1366 768":
            raise RuntimeError("Driver requires actual 1366x768 X11 desktop")
        if not run("wmctrl", "-m").startswith("Name: Openbox"):
            raise RuntimeError("Openbox must be ready before production launch")
        env = os.environ.copy()
        env.update({"XDG_CONFIG_HOME": str(self.out / "config"),
                    "XDG_DATA_HOME": str(self.out / "data"),
                    "XDG_CACHE_HOME": str(self.out / "cache"),
                    "LIBGL_ALWAYS_SOFTWARE": "1", "WINIT_UNIX_BACKEND": "x11",
                    "WINIT_X11_SCALE_FACTOR": "1.0"})
        env.pop("WAYLAND_DISPLAY", None)
        self.process = subprocess.Popen([str(self.args.app.resolve(strict=True))], cwd=self.live,
                                        env=env, stdout=self.app_log, stderr=self.app_log,
                                        start_new_session=True)
        self.event("production_process_started", app=str(self.args.app.resolve()),
                   app_sha256=self.provenance["app_sha256"])
        def find_window():
            self.alive()
            result = subprocess.run(["xdotool", "search", "--onlyvisible", "--pid", str(self.process.pid),
                                     "--name", "TikZarium"], capture_output=True, timeout=5, check=False)
            matches = result.stdout.decode("ascii", "strict").split()
            if len(matches) > 1:
                raise RuntimeError("Ambiguous production-PID visible windows")
            if matches:
                self.window = matches[0]
                return True
            return False
        wait_for(find_window, 45, "No visible production-PID TikZarium window")
        run("xdotool", "windowsize", "--sync", self.window, str(CLIENT[0]), str(CLIENT[1]))
        run("xdotool", "windowmove", "--sync", self.window, "0", "0")
        self.owned_focus()
        time.sleep(2)
        geometry = run("xdotool", "getwindowgeometry", "--shell", self.window)
        (self.raw / "owned-window-geometry.txt").write_text(geometry + "\n", encoding="utf-8")
        values = dict(line.split("=", 1) for line in geometry.splitlines() if "=" in line)
        self.geometry = {key: int(values[key]) for key in ("X", "Y", "WIDTH", "HEIGHT")}
        self.report["window_geometry_source"] = "XDOTOOL_REPORTED_MAY_INCLUDE_FRAME_TRANSLATION"
        if shutil.which("xwininfo"):
            absolute = run("xwininfo", "-id", self.window)
            (self.raw / "owned-window-xwininfo.txt").write_text(absolute + "\n", encoding="utf-8")
            labels = {"X": "Absolute upper-left X", "Y": "Absolute upper-left Y",
                      "WIDTH": "Width", "HEIGHT": "Height"}
            parsed = {}
            for key, label in labels.items():
                match = re.search(r"^\s*" + re.escape(label) + r":\s*(-?\d+)\s*$", absolute, re.MULTILINE)
                if match is None:
                    raise RuntimeError("Cannot parse true xwininfo client geometry: " + label)
                parsed[key] = int(match.group(1))
            self.geometry = parsed
            self.report["window_geometry_source"] = "XWININFO_ABSOLUTE_CLIENT"
        if (self.geometry["WIDTH"], self.geometry["HEIGHT"]) != CLIENT:
            raise RuntimeError("Production client geometry differs from reviewed compact coordinates")
        if (self.geometry["X"] < 0 or self.geometry["Y"] < 0
                or self.geometry["X"] + CLIENT[0] > audit.TARGET_SCREEN[0]
                or self.geometry["Y"] + CLIENT[1] > audit.TARGET_SCREEN[1]):
            raise RuntimeError("Production client is clipped by the hosted desktop")
        self.event("owned_window_fit", geometry=self.geometry)
        self.screenshot("startup-production")

    def enable_full_source_after_load(self) -> None:
        # Production load_path resets source_full_view=false on EVERY Open.
        # Toggle exactly once after that load; the actual full-editor copy is
        # still required to prove the setting and opened document took effect.
        self.click("source_settings")
        self.screenshot("source-settings-before-full-source")
        self.click("source_full_source")
        self.key("Escape")
        self.screenshot("full-source-after-native-load")

    def open_input(self) -> None:
        self.click("file_menu")
        self.screenshot("file-menu-before-native-path")
        self.click("file_path")
        self.key("ctrl+a")
        self.paste(str(self.source).encode("utf-8"), "live-filepath")
        self.screenshot("typed-native-filepath")
        self.key("Escape")
        self.key("ctrl+o")
        time.sleep(0.7)
        self.screenshot("native-open-before-dirty-decision")
        # Fresh production startup is Document::scratch(QUICKSTART): its
        # saved_source is empty, so it is known dirty before this first Open.
        # Only this explicit test scratch is discarded, never a user document.
        self.event("fresh_quickstart_scratch_explicit_discard")
        self.click("dirty_discard")
        time.sleep(0.7)
        self.enable_full_source_after_load()
        observed = self.copy_editor("after-initial-discard-and-full-source")
        self.stage("opened", "Typed native File path; Ctrl+O; explicit fresh scratch Discard; full-source setting after load; editor Select All/Copy; GUI Save", visible=observed)

    def inspect(self) -> None:
        self.current_stage = "typed"
        self.click("source")
        self.key("ctrl+End")
        self.paste(audit.MARKER, "eof-history-marker")
        self.stage("typed", "Source-editor EOF marker pasted as one native text transaction; GUI Save")
        self.current_stage = "draft"
        self.click("inspector_properties")
        self.screenshot("before-scientific-scan")
        self.click("scan")
        self.screenshot("scientific-scan-results")
        self.click("candidate")
        self.screenshot("scientific-command-options")
        self.click("first_axis")
        self.screenshot("axis-samples-original")
        self.click("samples_value")
        self.key("ctrl+a")
        self.paste(b"151", "samples-draft")
        self.stage("draft", "Scientific axis samples draft 151; GUI Save without Apply; source must retain150+typed marker")

    def finish(self) -> None:
        self.current_stage = "applied"
        self.click("apply")
        self.stage("applied", "Actual scientific Apply; GUI Save; unique samples150→151 and typed comment retained")
        self.current_stage = "undo-inspector"
        self.click("undo")
        self.stage("undo-inspector", "Actual common toolbar Undo; GUI Save; samples150 and typed comment retained")
        self.current_stage = "undo-typing"
        self.click("undo")
        self.stage("undo-typing", "Actual common toolbar Undo again; GUI Save; byte-exact original derivative restored")
        self.current_stage = "reopened"
        self.key("ctrl+o")
        time.sleep(0.7)
        self.enable_full_source_after_load()
        observed = self.copy_editor("native-reopen")
        self.stage("reopened", "Native Ctrl+O reload; actual full editor Select All/Copy; GUI Save", visible=observed)
        self.current_stage = "built"
        # TeX detection is asynchronous. A build/export can succeed only when
        # the actual app obtains current output; no CLI compiler is substituted.
        self.key("Escape")
        self.key("ctrl+Return")
        self.screenshot("gui-build-started")
        pdf = self.source.with_suffix(".pdf")
        if pdf.exists():
            raise RuntimeError("GUI PDF output unexpectedly existed before Export")
        deadline = time.monotonic() + self.args.build_timeout
        while time.monotonic() < deadline and not pdf.is_file():
            self.alive()
            if self.source.read_bytes() != self.expected["original"]:
                raise RuntimeError("Source changed during actual GUI Build/Export")
            self.click("export")
            time.sleep(1.0)
        if not pdf.is_file():
            raise RuntimeError("GUI Build/Export did not persist the current PDF before bounded timeout")
        self.event("actual_gui_export_pdf", path=str(pdf.relative_to(self.out)), sha256=audit.sha(pdf))
        self.click("pdf_view")
        self.screenshot("exact-pdf-view-exported")
        self.click("console")
        self.screenshot("actual-build-console")
        self.click("raw_log")
        self.screenshot("actual-raw-xelatex-log")
        self.clipboard(b"SCI_NATIVE_LOG_CLIPBOARD_SENTINEL", "log-copy-sentinel")
        self.click("copy_log")
        copied = run_bytes("xclip", "-selection", "clipboard", "-o")
        log = self.raw / "gui-xelatex.log"
        log.write_bytes(copied)
        self.event("actual_gui_raw_log_clipboard", file=str(log.relative_to(self.out)), sha256=audit.sha(log))
        self.stage("built", "Actual GUI Build, current PDF Export and PDF view; copied actual raw XeLaTeX log; source unchanged")
        if b"XeTeX" not in copied or b"Output written on" not in copied:
            raise RuntimeError("GUI Copy log did not expose the actual successful XeLaTeX output")

    def stop(self) -> None:
        if self.process is not None and self.process.poll() is None:
            self.event("production_process_terminated_after_capture")
            os.killpg(self.process.pid, signal.SIGTERM)
            try:
                self.process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                os.killpg(self.process.pid, signal.SIGKILL)
                self.process.wait(timeout=5)
        self.app_log.close()
        self.action_file.close()

    def capture_failure(self, error) -> None:
        self.report.update({"status": "FAIL", "error": f"{type(error).__name__}: {error}",
                            "failed_stage": self.current_stage})
        self.event("driver_failure", error=self.report["error"])
        if self.source.is_file():
            shutil.copyfile(self.source, self.raw / "failure-live-source.tex")
        # Retain the actual desktop even when the app has already exited or
        # never created a visible window. Capture failure must not erase the
        # primary driver error or claim that an empty desktop was a GUI PASS.
        try:
            path = self.raw / "failure-original-desktop.png"
            run("import", "-window", "root", str(path), timeout=30)
            self.event("failure_original_desktop", file=str(path.relative_to(self.out)),
                       sha256=audit.sha(path), size=audit.original_image_size(path))
        except Exception as capture_error:
            self.report["failure_capture_error"] = str(capture_error)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--source-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--fixture", type=Path, default=Path(__file__).resolve().parents[1] / "roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-001/figure.tex")
    parser.add_argument("--phase", choices=("startup", "inspect", "full"), default="full")
    parser.add_argument("--coordinates", type=Path, help="Optional explicit app-tree-bound reviewed client-coordinate JSON")
    parser.add_argument("--build-provenance", type=Path, required=True)
    parser.add_argument("--engine", type=Path, default=Path(os.environ.get("TIKZARIUM_XELATEX") or shutil.which("xelatex") or "/missing-xelatex"))
    parser.add_argument("--build-timeout", type=float, default=180)
    parser.add_argument("--pdf-text", action="append", help="Expected rendered text; repeatable, default SV001 β and v")
    args = parser.parse_args()
    driver = None
    try:
        for executable in ("xdotool", "xclip", "wmctrl", "xwininfo", "import", "pdfinfo", "pdffonts", "pdftotext", "pdftoppm"):
            if shutil.which(executable) is None:
                raise ValueError("Missing preinstalled native QA prerequisite: " + executable)
        if not (1 <= args.build_timeout <= 600):
            raise ValueError("Build timeout must be bounded to1..600 seconds")
        app = args.app.resolve(strict=True)
        provenance = source_provenance(args.source_root.resolve(strict=True), app)
        receipt = audit.read_json(args.build_provenance.resolve(strict=True))
        if any(receipt.get(key) != value for key, value in provenance.items()) or receipt.get("production_binary") is not True:
            raise ValueError("Build receipt does not match the exact production source/binary")
        with redirect_stdout(StringIO()):
            audit.prepare(SimpleNamespace(out=args.out, fixture=args.fixture,
                                          screen_size=audit.TARGET_SCREEN, client_size=CLIENT))
        driver = Driver(args, provenance)
        try:
            driver.start()
            driver.open_input()
            if args.phase in ("inspect", "full"):
                driver.inspect()
            if args.phase == "full":
                driver.finish()
            driver.report["status"] = "HOSTED_GUI_SEQUENCE_CAPTURED_REQUIRES_INDEPENDENT_REVIEW"
        except Exception as error:
            driver.capture_failure(error)
        finally:
            driver.stop()
        audit.write_json(driver.out / "driver-report.json", driver.report)
        print(json.dumps(driver.report, ensure_ascii=False))
        if driver.report["status"] == "FAIL":
            return 1
        if args.phase == "full":
            audit.validate(SimpleNamespace(out=driver.out, source_root=args.source_root, app=args.app,
                                           build_provenance=args.build_provenance, engine=args.engine,
                                           pdf=driver.source.with_suffix(".pdf"), xelatex_log=driver.raw / "gui-xelatex.log",
                                           action_log=driver.out / "native-actions.log", pdf_text=args.pdf_text or ["β", "v"]))
        return 0
    except (ValueError, OSError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
