#!/usr/bin/env python3
"""I61: real UX2 Studio X11 direct-click -> six native gestures -> saved TeX/PDF.

Compact production candidate; no prior scientific screenshot accepts this suite.
Never infer PASS from a screenshot alone; this script requires actual process
events and bytes that the running GUI persisted. Independent manual inspection
of screenshots/PDF remains mandatory. Linux/Xvfb != physical Win10 or Mac ARM.
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

from qa_n1_desktop import (FIXTURE, original_preserved, owners,
                           x11_button1_mask, x11_button1_pressed)

# Compact production coordinates derived from app layout and the independently
# reviewed CP05 native original (43370706180). Candidate until THIS full run's
# originals are reviewed: CP05 scientific acceptance does not accept I61.
APP_TREE = "7d35e7b8064a651084fef931a827ac46b3448c6a"
CLIENT = (1180, 680)
SCREEN = (1366, 768)
POINTS = {
    "file_menu": (23, 15), "file_path": (143, 135),
    "source_settings": (405, 80), "source_full_source": (490, 174),
    "source": (200, 230), "save": (61, 49), "open": (24, 49),
    "build": (224, 49), "export": (291, 49),
    "guide": (381, 49), "pdf": (439, 49), "undo": (109, 49),
    # Current fixed-width Help dock wraps the Inspector's Apply control to a
    # second row and pushes Position fields down. From retained 1366x768
    # originals, Node X center is root≈(1051,507), Apply center≈(1000,171);
    # subtract the observed client origin (1,20) for xdotool window coords.
    "properties": (960, 81), "node_x": (1050, 487), "apply": (999, 151),
}
BUTTONS = [
    # CP05 observed direct rail x448, six 30px icons with 4px row spacing.
    # Leave Node selected for the Inspector draft/Apply/Undo proof.
    ("line", (448, 113), (550, 275), (650, 300)),
    ("rectangle", (448, 181), (580, 350), (665, 400)),
    ("circle", (448, 215), (740, 275), (770, 275)),
    ("cubic", (448, 283), (700, 410), (825, 400)),
    ("arrow", (448, 147), (530, 485), (660, 500)),
    ("node", (448, 249), (790, 500), (791, 500)),
]
NATIVE = None


def parse_client_geometry(output: str) -> dict:
    """Only xwininfo's absolute CLIENT origin; WM frame coordinates are unsafe."""
    labels = {"X": "Absolute upper-left X", "Y": "Absolute upper-left Y",
              "WIDTH": "Width", "HEIGHT": "Height"}
    parsed = {}
    for name, label in labels.items():
        match = re.search(r"^\s*" + re.escape(label) + r":\s*(-?\d+)\s*$", output, re.MULTILINE)
        if match is None:
            raise RuntimeError("Missing true xwininfo client geometry: " + label)
        parsed[name] = int(match.group(1))
    if (parsed["WIDTH"], parsed["HEIGHT"]) != CLIENT:
        raise RuntimeError("Client geometry differs from reviewed compact coordinates")
    if (parsed["X"] < 0 or parsed["Y"] < 0 or parsed["X"] + CLIENT[0] > SCREEN[0]
            or parsed["Y"] + CLIENT[1] > SCREEN[1]):
        raise RuntimeError("Production client is clipped by the hosted desktop")
    return parsed


class NativeSession:
    """Real production PID/window input with an append-only action/evidence log."""
    def __init__(self, process, window, out, app, report):
        self.process, self.window, self.out = process, window, out
        self.report = report
        self.serial = 0
        self.log = (out / "native-actions.log").open("w", encoding="utf-8", buffering=1)
        self.snapshots = out / "source-states"
        self.snapshots.mkdir()
        observed = Path(f"/proc/{process.pid}/exe").resolve(strict=True)
        expected = app.resolve(strict=True)
        if expected.name == "launch.sh":
            expected = expected.with_name("tikzarium-app").resolve(strict=True)
        proc_executable_sha = sha(Path(f"/proc/{process.pid}/exe"))
        if observed != expected or proc_executable_sha != sha(expected):
            raise RuntimeError("Owned process executable differs from expected production ELF")
        report.update({"running_executable_path": str(observed),
                       "running_executable_sha256": proc_executable_sha, "running_pid": process.pid})
        absolute = run("xwininfo", "-id", window)
        (out / "owned-window-xwininfo.txt").write_text(absolute + "\n", encoding="utf-8")
        self.geometry = parse_client_geometry(absolute)
        report.update({"window_geometry": self.geometry, "window_geometry_source": "XWININFO_ABSOLUTE_CLIENT",
                       "client_size": CLIENT, "screen_size": SCREEN, "coordinates": POINTS,
                       "coordinate_scope": "CANDIDATE_COMPACT_REQUIRES_CURRENT_ORIGINAL_IMAGE_REVIEW"})
        self.focus()
        report["window_title"] = run("xdotool", "getwindowname", window)
        self.event("owned_production_window", geometry=self.geometry, executable_sha256=proc_executable_sha)

    def event(self, kind, **fields):
        self.log.write(json.dumps({"time_monotonic": time.monotonic(), "event": kind,
                                  "pid": self.process.pid, "window_id": self.window, **fields}, ensure_ascii=False) + "\n")

    def focus(self):
        if self.process.poll() is not None:
            raise RuntimeError("Production app exited before native sequence completed")
        if run("xdotool", "getwindowpid", self.window) != str(self.process.pid):
            raise RuntimeError("X11 window no longer belongs to production PID")
        run("xdotool", "windowactivate", "--sync", self.window)
        if run("xdotool", "getactivewindow") != self.window:
            raise RuntimeError("Production app is not the active X11 client")

    def move(self, x, y):
        if not (0 <= x < CLIENT[0] and 0 <= y < CLIENT[1]):
            raise RuntimeError("Pointer candidate lies outside production client")
        self.focus()
        run("xdotool", "mousemove", "--window", self.window, str(x), str(y))
        actual = dict(line.split("=", 1) for line in run("xdotool", "getmouselocation", "--shell").splitlines() if "=" in line)
        root = (int(actual["X"]), int(actual["Y"]))
        self.event("pointer_position", client_xy=(x, y), actual_root_xy=root)
        if root != (self.geometry["X"] + x, self.geometry["Y"] + y):
            raise RuntimeError("Actual server pointer differs from true client origin plus candidate")

    def retain_sources(self, label):
        self.serial += 1
        for path in sorted(self.out.glob("*.tex")):
            target = self.snapshots / f"{self.serial:03d}-{label}-{path.name}"
            target.write_bytes(path.read_bytes())
            self.event("original_gui_source_state", file=str(target.relative_to(self.out)), sha256=sha(target))


def enable_full_source(window: str, out: Path, label: str) -> None:
    # Every native Open resets this option. Always toggle after that load;
    # actual editor clipboard equality below proves the whole document is live.
    click(window, *POINTS["source_settings"])
    screenshot(out, label + "-source-settings")
    click(window, *POINTS["source_full_source"])
    key("Escape")


def copy_focused(expected: bytes, out: Path, label: str) -> bytes:
    sentinel = out / (label + "-sentinel.txt")
    sentinel.write_bytes(b"I61_NATIVE_CLIPBOARD_SENTINEL_NOT_A_FIELD")
    subprocess.run(["xclip", "-selection", "clipboard", "-i", str(sentinel)],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=8, check=True)
    key("ctrl+a")
    key("ctrl+c")
    result = subprocess.run(["xclip", "-selection", "clipboard", "-o"],
                            capture_output=True, timeout=8, check=True).stdout
    (out / (label + "-clipboard.txt")).write_bytes(result)
    if NATIVE:
        NATIVE.event("actual_focused_clipboard", label=label, matches=result == expected,
                     sha256=hashlib.sha256(result).hexdigest())
    if result != expected:
        raise RuntimeError(label + ": actual focused field/editor bytes differ from expected")
    return result


def draft_node_x(window: str, out: Path, node: dict, new_x: bytes) -> None:
    # Original native run 43386874361 settled at a wider Inspector than the
    # initial UNIT_EVENT probe: Apply shares Undo's row, and old y484 hit Y.
    # Prove the original X value from the selected source owner BEFORE typing;
    # the subsequent proposed-value copy alone cannot distinguish X from Y.
    click(window, *POINTS["node_x"])
    copy_focused(node["values"]["x"].encode("utf-8"), out, "28a-focused-original-node-x")
    key("ctrl+a")
    paste(new_x, out / "clipboard-inspector-node-x.txt")
    copy_focused(new_x, out, "28b-focused-node-x")


def verify_editor(window: str, out: Path, expected: bytes, label: str) -> None:
    click(window, *POINTS["source"])
    copy_focused(expected, out, label)


def expected_node_x_patch(before: bytes, new_x: str) -> bytes:
    """Byte-minimal current v2 Node patch, preserving all other native bytes."""
    items = owners(before)
    if len(items) != 6 or items[-1]["tool"] != "node":
        raise RuntimeError("Expected uniquely selected Node #6")
    old_x = items[-1]["values"]["x"]
    if old_x == new_x:
        raise RuntimeError("Inspector candidate must change the Node x literal")
    lines = before.splitlines(keepends=True)
    hits = [index for index, line in enumerate(lines) if b' % tikzarium:n1:[2,6,"node",' in line]
    if len(hits) != 1:
        raise RuntimeError("Expected exactly one current Node #6 source owner")
    index = hits[0]
    line = lines[index]
    native = ("\\node at (" + old_x + ",").encode()
    meta = ('"x":"' + old_x + '"').encode()
    if line.count(native) != 1 or line.count(meta) != 1:
        raise RuntimeError("Node x native command and metadata must each occur once")
    lines[index] = line.replace(native, ("\\node at (" + new_x + ",").encode(), 1).replace(meta, ('"x":"' + new_x + '"').encode(), 1)
    return b"".join(lines)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()



def audit_embedded_fonts(output: str) -> list[str]:
    """Require all PDF fonts embedded; parse the rightmost pdffonts columns.

    Type may have spaces (CID TrueType). The five final columns are
    emb, sub, uni, object, ID. One nonembedded font fails the audit.
    """
    rows = [line for line in output.splitlines()[2:] if line.strip()]
    if not rows:
        raise RuntimeError("No font records in pdffonts")
    for line in rows:
        columns = line.split()
        flags = columns[-5:]
        if (
            len(columns) < 8 or len(flags) != 5
            or any(flag.lower() not in ("yes", "no") for flag in flags[:3])
            or not flags[3].isdigit() or not flags[4].isdigit()
        ):
            raise RuntimeError("Unparseable PDF font row: " + line)
        if flags[0].lower() != "yes":
            raise RuntimeError("Nonembedded PDF font: " + line)
    return rows


def run(*argv: str, timeout: int = 25) -> str:
    result = subprocess.run(argv, capture_output=True, timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError(f"{argv[0]} exit {result.returncode}: "
                           + result.stderr.decode("utf-8", "replace")[-1400:])
    return result.stdout.decode("utf-8", "replace").strip()


def wait(predicate, detail: str, seconds: float = 12.0) -> None:
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        if predicate():
            return
        time.sleep(0.20)
    raise RuntimeError(detail)


def paste(contents: bytes, path: Path) -> None:
    path.write_bytes(contents)
    # xclip backgrounds an X11 clipboard owner. Capturing its stdout/stderr
    # via run() keeps inherited pipes open, causing a false 25s timeout.
    # Do not capture the detached owner; match independently accepted I47 QA.
    subprocess.run(["xclip", "-selection", "clipboard", "-i", str(path)],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                   timeout=8, check=True)
    run("xdotool", "key", "--clearmodifiers", "ctrl+v")
    time.sleep(0.28)


def screenshot(out: Path, label: str) -> None:
    if NATIVE:
        NATIVE.retain_sources(label)
    filename = out / (label + ".png")
    run("import", "-window", "root", str(filename), timeout=35)
    if filename.stat().st_size < 5000:
        raise RuntimeError(f"Empty X11 screenshot: {label}")
    if NATIVE and run("identify", "-format", "%w %h", str(filename)) != "1366 768":
        raise RuntimeError("Original screenshot differs from declared 1366x768 scope")


def click(window: str, x: int, y: int) -> None:
    if NATIVE is None or window != NATIVE.window:
        raise RuntimeError("Native click requires the owned production session")
    NATIVE.move(x, y)
    NATIVE.event("x11_click", client_xy=(x, y))
    run("xdotool", "click", "1")
    time.sleep(0.28)
    if (x, y) == POINTS["save"]:
        NATIVE.retain_sources("gui-save")


def key(value: str) -> None:
    if NATIVE:
        NATIVE.focus()
        NATIVE.event("x11_key", chord=value)
    run("xdotool", "key", "--clearmodifiers", "--delay", "90", value)
    time.sleep(0.20)


def gesture(window: str, start: tuple[int, int], end: tuple[int, int]) -> None:
    if NATIVE is None or window != NATIVE.window:
        raise RuntimeError("Native gesture requires the owned production session")
    NATIVE.move(*start)
    NATIVE.event("x11_gesture_begin", start=start, end=end)
    run("xdotool", "mousedown", "1")
    try:
        time.sleep(0.20)
        for phase, point in (("pressed", start), ("moved", end)):
            if phase == "moved":
                NATIVE.move(*point)
                time.sleep(0.20)
            mask = x11_button1_mask()
            NATIVE.event("actual_server_primary_button", phase=phase, mask=mask)
            if not x11_button1_pressed(mask):
                raise RuntimeError("X11 server did not retain primary button during native gesture")
    finally:
        run("xdotool", "mouseup", "1")
    time.sleep(0.35)
    NATIVE.event("x11_gesture_end")


def held_f1() -> None:
    if NATIVE:
        NATIVE.focus()
        NATIVE.event("x11_held_f1")
    # An instantaneous key tap may miss egui's next input frame.
    run("xdotool", "keydown", "F1")
    time.sleep(0.34)
    run("xdotool", "keyup", "F1")
    time.sleep(0.48)


def dock_signature(out: Path, label: str) -> str:
    # Compare the right-hand actual Studio tab bar, not its changing canvas.
    origin = NATIVE.geometry if NATIVE else {"X": 1, "Y": 20}
    region = f"252x29+{origin['X'] + 921}+{origin['Y'] + 67}"
    return run("convert", str(out / (label + ".png")), "-crop",
               region, "+repage", "-format", "%#", "info:")


def modal_region_change(before: Path, after: Path) -> float:
    """Mean pixel difference over the actual central modal area, not cursor blink.

    The screenshot evidence still requires independent human inspection.
    We explicitly reject a top-only Build error banner as modal proof.
    """
    return float(run(
        "convert", str(before), str(after), "-compose", "difference",
        "-composite", "-crop", "520x280+440+200", "+repage",
        "-colorspace", "Gray", "-format", "%[fx:mean]", "info:",
    ))


def main() -> int:
    global NATIVE
    NATIVE = None
    arg = argparse.ArgumentParser(description=__doc__)
    arg.add_argument("--app", required=True, type=Path)
    arg.add_argument("--out", required=True, type=Path)
    args = arg.parse_args()
    out = args.out.resolve()
    if out.exists() and any(out.iterdir()):
        arg.error("I61 requires an empty evidence directory")
    out.mkdir(parents=True, exist_ok=True)
    root = Path(__file__).resolve().parents[1]
    actual_tree = run("git", "-C", str(root), "rev-parse", "HEAD:crates/tikzarium-app/src")
    actual_head = run("git", "-C", str(root), "rev-parse", "HEAD")
    if os.environ.get("TIKZARIUM_SOURCE_SHA") != actual_head:
        arg.error("Source SHA must equal actual checked-out HEAD")
    if run("git", "-C", str(root), "status", "--porcelain", "--", "crates", "extensions", "Cargo.toml", "Cargo.lock"):
        arg.error("Production source differs from committed candidate")
    if os.environ.get("TIKZARIUM_APP_TREE_SHA") != APP_TREE or actual_tree != APP_TREE:
        arg.error("Compact app/source tree changed: re-review actual layout before renewing candidate")
    # The real app's default file field is "figure.tex" (reviewed screenshot).
    # Use an isolated GUI process working directory instead of an unproved
    # popup path TextEdit click. The app must write this .tex via its Save icon.
    source = out / "figure.tex"
    fixture = FIXTURE.encode("utf-8")
    report = {
        "schema_version": 1, "kind": "I61_B42_REAL_STUDIO_GESTURES",
        "status": "FAIL", "gui": "LINUX_X11_HOSTED",
        "app_tree_sha": APP_TREE,
        "source_head_sha": os.environ.get("TIKZARIUM_SOURCE_SHA", "UNKNOWN"),
        "host": platform.platform(), "physical_win10_miktex": "NOT_RUN",
        "physical_mac_m1_m4": "NOT_RUN",
        "manual_image_review": "NOT_RUN", "gui_save": "NOT_RUN",
        "six_real_tools": "NOT_RUN", "real_xelatex_pdf": "NOT_RUN",
        "gui_open_reopen": "NOT_RUN", "keyboard_reopen": "NOT_RUN",
        "toolbar_reopen": "NOT_RUN", "visual_undo": "NOT_RUN",
        "native_text_undo": "NOT_RUN", "library_inspector": "NOT_RUN",
        "f1_two_state": "NOT_RUN", "source_parameter_f1": "NOT_RUN", "gui_two_file_crlf": "NOT_RUN",
        "dirty_open_cancel": "NOT_RUN", "inspector_apply": "NOT_RUN",
        "scratch_build_modal_cancel": "NOT_RUN",
        "steps": [],
    }
    process = None
    app_log = (out / "app.log").open("wb")
    try:
        env = os.environ.copy()
        env.update({
            "XDG_CONFIG_HOME": str(out / "config"),
            "XDG_DATA_HOME": str(out / "data"),
            "XDG_CACHE_HOME": str(out / "cache"),
            "LIBGL_ALWAYS_SOFTWARE": "1",
            "WINIT_UNIX_BACKEND": "x11",
            "WINIT_X11_SCALE_FACTOR": "1.0",
        })
        env.pop("WAYLAND_DISPLAY", None)
        process = subprocess.Popen([str(args.app.resolve(strict=True))],
                                   cwd=out, env=env, stdout=app_log, stderr=app_log)
        found = None
        until = time.monotonic() + 45
        while time.monotonic() < until:
            if process.poll() is not None:
                raise RuntimeError(f"Studio process exited {process.returncode}")
            match = subprocess.run(
                ["xdotool", "search", "--onlyvisible", "--pid", str(process.pid),
                 "--name", "TikZarium"],
                capture_output=True, timeout=5, check=False)
            if match.returncode == 0 and match.stdout.strip():
                windows = match.stdout.decode("ascii", "strict").splitlines()
                if len(windows) != 1:
                    raise RuntimeError("Ambiguous visible production-PID windows")
                found = windows[0]
                break
            time.sleep(0.25)
        if not found:
            raise RuntimeError("No real visible Studio process window")
        if run("xdotool", "getdisplaygeometry") != "1366 768":
            raise RuntimeError("I61 compact driver requires the reviewed 1366x768 desktop")
        run("xdotool", "windowsize", "--sync", found, str(CLIENT[0]), str(CLIENT[1]))
        run("xdotool", "windowmove", "--sync", found, "0", "0")
        run("xdotool", "windowactivate", "--sync", found)
        time.sleep(1.6)
        NATIVE = NativeSession(process, found, out, args.app, report)
        report["window_id"] = found
        report["app_sha256"] = sha(args.app)
        screenshot(out, "01-real-studio")

        # Candidate file-popup location requires original image review; it confirms "figure.tex" as app default.
        # GUI starts in out/, so clicking real Save writes out/figure.tex.
        # Popup's editable custom path is separately NOT_RUN.
        click(found, *POINTS["file_menu"])
        screenshot(out, "02-file-menu-default-path")
        key("Escape")
        enable_full_source(found, out, "03-initial")
        click(found, *POINTS["source"])
        key("ctrl+a")
        paste(fixture, out / "clipboard-source.txt")
        verify_editor(found, out, fixture, "04-fixture-editor")
        screenshot(out, "04-source-pasted")

        # W3 regression: click the real Build triangle on an UNSAVED
        # source before the ordinary Save path. The in-app modal must
        # visibly cover the central UI; a top-only missing-TeX warning
        # cannot pass this pixel-region check. Retrying permits bounded
        # asynchronous external TeX discovery, not fake GUI success.
        screenshot(out, "04a-before-scratch-build")
        before_modal = out / "04a-before-scratch-build.png"
        modal_seen = False
        for attempt in range(1, 6):
            click(found, *POINTS["build"])
            time.sleep(0.65)
            screenshot(out, f"04b-scratch-build-attempt-{attempt}")
            modal_image = out / f"04b-scratch-build-attempt-{attempt}.png"
            if modal_region_change(before_modal, modal_image) > 0.015:
                modal_seen = True
                break
            time.sleep(2.4)
        if not modal_seen:
            raise RuntimeError(
                "W3 scratch Build did not show a central in-app Save+Build modal; "
                "TeX discovery/missing-XeLaTeX banner is not modal evidence"
            )
        key("Escape")
        time.sleep(0.45)
        screenshot(out, "04c-scratch-build-cancelled")
        after_cancel = out / "04c-scratch-build-cancelled.png"
        if modal_region_change(modal_image, after_cancel) <= 0.015:
            raise RuntimeError("Escape did not visibly close the Save+Build modal")
        if source.exists():
            raise RuntimeError("Cancelled scratch Build wrote a TeX file")
        report["scratch_build_modal_cancel"] = (
            "PASS_REAL_X11_MODAL_VISIBLE_ESCAPE_NO_FILE_MANUAL_IMAGE_REVIEW_REQUIRED"
        )
        report["steps"].append({
            "case": "unsaved_build_in_app_modal_then_escape_no_source_file",
            "app_tree_sha": APP_TREE,
            "modal_visual_change": modal_region_change(before_modal, modal_image),
        })

        click(found, *POINTS["save"])
        wait(source.is_file, "Studio toolbar Save did not create default figure.tex in isolated cwd")
        if source.read_bytes() != fixture:
            raise RuntimeError("Real GUI Save altered opaque Unicode source")
        report["file_menu_path_edit"] = "NOT_RUN_DEFAULT_FIGURE_TEX_USED"
        report["gui_save"] = "PASS_REAL_X11_EXACT_BYTES"
        report["steps"].append({"case": "paste_and_save", "sha256": sha(source)})
        screenshot(out, "05-source-saved")

        for index, (tool, tool_button, start, end) in enumerate(BUTTONS, 1):
            before = source.read_bytes()
            count = len(owners(before))
            screenshot(out, f"{index:02d}-{tool}-rail-before")
            click(found, *tool_button)
            screenshot(out, f"{index:02d}-{tool}-selected")
            gesture(found, start, end)
            screenshot(out, f"{index:02d}-{tool}-pointer")
            # Save is the actual Studio toolbar button, no synthetic file edits.
            click(found, *POINTS["save"])
            time.sleep(0.5)
            after = source.read_bytes()
            authored = owners(after)
            if len(authored) != count + 1 or authored[-1]["tool"] != tool:
                raise RuntimeError(
                    f"{tool}: real one-click rail/pointer did not persist a new "
                    f"native owned command (before={count}, after={authored})")
            if not original_preserved(fixture, after):
                raise RuntimeError(f"{tool}: source bytes outside C command changed")
            if tool == "cubic" and b".. controls " not in after:
                raise RuntimeError("Cubic did not produce native TikZ Bezier")
            report["steps"].append({
                "case": "real_direct_rail_and_pointer_" + tool,
                "source_sha256": sha(source),
                "owner_count": len(authored),
                "owner_id": authored[-1]["id"],
            })
            screenshot(out, f"{index:02d}-{tool}-saved")

        report["six_real_tools"] = "PASS_REAL_X11_SAVED_SOURCE"
        key("F1")
        screenshot(out, "20-f1-help")
        key("F1")
        screenshot(out, "21-f1-closed")
        report["f1_keystrokes"] = "SENT_REAL_X11_VISUAL_REVIEW_REQUIRED"
        report["final_source_sha256"] = sha(source)
        click(found, *POINTS["build"])  # Real Studio Build icon, external XeLaTeX.
        pdf = source.with_suffix(".pdf")
        # The app may retain the build PDF in memory until Export; Build success
        # alone must not be interpreted as a persisted generated file.
        time.sleep(3.0)
        screenshot(out, "22-build-status")
        click(found, *POINTS["pdf"])  # Studio PDF tab, code pane still visible.
        time.sleep(1.5)
        screenshot(out, "23-pdf-view-before-export")
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline and not pdf.is_file():
            click(found, *POINTS["export"])
            if sha(source) != report["final_source_sha256"]:
                raise RuntimeError("Source changed during GUI Build/Export")
            time.sleep(1.0)
        if not pdf.is_file():
            raise RuntimeError("Studio Export did not write a real XeLaTeX PDF")
        if sha(source) != report["final_source_sha256"]:
            raise RuntimeError("Saved source changed during PDF export")
        metadata = run("pdfinfo", str(pdf))
        if "Pages:           1" not in metadata:
            raise RuntimeError("Expected one-page exact XeLaTeX PDF")
        run("pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-png",
            "-r", "120", str(pdf), str(out / "24-exact-pdf"))
        text = run("pdftotext", "-enc", "UTF-8", str(pdf), "-")
        if "Не менять" not in text:
            raise RuntimeError("Cyrillic opaque macro absent from real PDF")
        fonts = run("pdffonts", str(pdf))
        rows = audit_embedded_fonts(fonts)
        (out / "pdffonts.txt").write_text(fonts + "\n", encoding="utf-8")
        (out / "pdfinfo.txt").write_text(metadata + "\n", encoding="utf-8")
        if not any("DejaVu" in line for line in rows):
            raise RuntimeError("Expected DejaVu embedded font absent")
        report["real_xelatex_pdf"] = "PASS_EXTERNAL_XELATEX_PDF_CYRILLIC_AND_ALL_FONTS_EMBEDDED"
        report["pdf_sha256"] = sha(pdf)
        screenshot(out, "25-pdf-exported")
        # Copy the real GUI build log: PDF existence alone does not name the
        # external engine that this production process actually launched.
        click(found, 1118, 48)
        screenshot(out, "25a-build-console")
        click(found, 158, 520)
        screenshot(out, "25b-raw-build-log")
        sentinel = out / "build-log-sentinel.txt"
        sentinel.write_bytes(b"I61_BUILD_LOG_CLIPBOARD_SENTINEL")
        subprocess.run(["xclip", "-selection", "clipboard", "-i", str(sentinel)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=8, check=True)
        click(found, 246, 520)
        gui_log = subprocess.run(["xclip", "-selection", "clipboard", "-o"],
                                 capture_output=True, timeout=8, check=True).stdout
        (out / "gui-xelatex.log").write_bytes(gui_log)
        if b"XeTeX" not in gui_log or b"Output written on" not in gui_log:
            raise RuntimeError("Actual GUI log does not prove successful external XeLaTeX output")
        if re.search(rb"missing character|missing glyph|undefined control sequence|fatal error", gui_log, re.IGNORECASE):
            raise RuntimeError("Actual GUI XeLaTeX log contains a missing-glyph or compilation error")
        report["gui_xelatex_log_sha256"] = sha(out / "gui-xelatex.log")
        click(found, 1118, 48)  # Restore the full-height guide for later gestures.

        # I62: real desktop assertions follow the already-proven six gestures
        # and PDF. Source bytes and screenshots must be independently reviewed.
        click(found, *POINTS["guide"])  # Return to the guide from the PDF viewport.
        click(found, *POINTS["properties"])  # CP05 compact Properties tab candidate.
        held_f1()  # UIX2 layout moved the toolbar; use the real stable Help shortcut.
        held_f1()  # Return to Properties before the next independent F1 check.
        screenshot(out, "26-properties-before-f1")
        properties = dock_signature(out, "26-properties-before-f1")
        held_f1()
        screenshot(out, "27-f1-help-open")
        opened = dock_signature(out, "27-f1-help-open")
        held_f1()
        screenshot(out, "28-f1-help-closed")
        closed = dock_signature(out, "28-f1-help-closed")
        if opened == properties or closed != properties:
            raise RuntimeError("Real F1 failed Properties -> Help -> Properties tab transition")
        report["f1_two_state"] = "PASS_REAL_X11_TAB_CHANGE_MANUAL_LABEL_REVIEW_REQUIRED"

        # I64: an actual GUI Inspector edit, not a headless Rust event or
        # a direct Session patch. Node #6 is selected; use one shared-C draft.
        inspector_before = source.read_bytes()
        before_items = owners(inspector_before)
        if len(before_items) != 6 or before_items[-1]["tool"] != "node":
            raise RuntimeError("Inspector Apply requires selected native Node #6")
        screenshot(out, "28a-inspector-before-draft")
        draft_node_x(found, out, before_items[-1], b"10.50cm")
        expected_apply = expected_node_x_patch(inspector_before, "10.50cm")
        screenshot(out, "28b-inspector-draft-only")
        click(found, *POINTS["save"])  # GUI Save must NOT apply an inspector draft.
        if source.read_bytes() != inspector_before:
            raise RuntimeError("Inspector draft unexpectedly changed saved source")
        click(found, *POINTS["apply"])  # Compact candidate pinned Apply; exact source patch remains mandatory.
        screenshot(out, "28c-inspector-applied")
        click(found, *POINTS["save"])
        wait(lambda: source.read_bytes() != inspector_before,
             "Real pinned Inspector Apply did not persist a source patch")
        inspector_applied = source.read_bytes()
        if inspector_applied != expected_apply:
            raise RuntimeError("Inspector Apply changed bytes beyond exact native/metadata Node x literals")
        altered = [i for i, (left, right) in enumerate(zip(
            inspector_before.splitlines(keepends=True), inspector_applied.splitlines(keepends=True))) if left != right]
        report["steps"].append({
            "case": "real_pinned_inspector_node_x_apply_minimal_source_patch",
            "before_sha256": hashlib.sha256(inspector_before).hexdigest(),
            "after_sha256": sha(source),
            "changed_line_number": altered[0] + 1,
        })
        click(found, *POINTS["undo"])  # Common source-history toolbar Undo.
        screenshot(out, "28d-inspector-apply-undo")
        click(found, *POINTS["save"])
        wait(lambda: source.read_bytes() == inspector_before,
             "Visual Undo after pinned Inspector Apply failed byte-exact source restore")
        report["inspector_apply"] = "PASS_REAL_X11_C_CATALOGUE_NODE_X_APPLY_AND_UNDO"

        # Both source Ctrl+Z and the visible common Undo use the shared ledger.
        six_bytes = source.read_bytes()
        manual = b"% I62_NATIVE_UNDO_MARKER"
        click(found, *POINTS["source"])
        key("ctrl+End")
        paste(manual, out / "clipboard-manual-undo.txt")
        screenshot(out, "29-manual-source-edited")
        click(found, *POINTS["save"])
        wait(lambda: manual in source.read_bytes(), "Real manual GUI edit was not persisted")
        if source.read_bytes() != six_bytes + manual:
            raise RuntimeError("Manual edit rewrote unrelated source bytes")
        click(found, *POINTS["source"])
        key("ctrl+End")
        key("ctrl+z")
        screenshot(out, "30-native-ctrl-z")
        click(found, *POINTS["save"])
        wait(lambda: source.read_bytes() == six_bytes,
             "Native Ctrl+Z failed to restore exactly six-tool source")
        report["native_text_undo"] = "PASS_REAL_X11_SAVED_SOURCE_BYTES"

        click(found, 448, 113)  # UX2: direct C-owned Line, no group popup.
        gesture(found, (700, 325), (820, 350))
        click(found, *POINTS["save"])
        wait(lambda: len(owners(source.read_bytes())) == 7,
             "Seventh actual GUI gesture did not persist a native command")
        screenshot(out, "31-seven-before-visual-undo")
        click(found, *POINTS["undo"])  # Common source-history toolbar Undo.
        screenshot(out, "32-visual-undo-click")
        click(found, *POINTS["save"])
        wait(lambda: source.read_bytes() == six_bytes,
             "Visual inverse-patch Undo failed to restore six-tool source")
        report["visual_undo"] = "PASS_REAL_X11_INVERSE_SOURCE_BYTES"

        # The second file is an explicit test INPUT, never forged GUI output.
        secondary = out / "second-crlf.tex"
        secondary_input = (
            "\\documentclass{standalone}\r\n"
            "\\usepackage{tikz}\r\n"
            "% I62 preserve original CRLF comment\r\n"
            "\\newcommand{\\OpaqueSecond}{Не менять}\r\n"
            "\\begin{document}\r\n"
            "\\begin{tikzpicture}\r\n"
            "\\node at (0,0) {\\OpaqueSecond};\r\n"
            "\\end{tikzpicture}\r\n"
            "\\end{document}\r\n"
        ).encode("utf-8")
        secondary.write_bytes(secondary_input)
        click(found, *POINTS["file_menu"])
        time.sleep(0.45)
        screenshot(out, "33-file-menu-before-open")
        click(found, *POINTS["file_path"])  # CP05 compact client File TextEdit candidate.
        screenshot(out, "33a-file-path-focused")
        key("ctrl+a")
        screenshot(out, "33b-file-path-selected")
        paste(b"second-crlf.tex", out / "clipboard-open-path.txt")
        screenshot(out, "34-second-path-entered")
        key("Escape")
        key("ctrl+o")  # Real Open command uses the typed File path.
        time.sleep(0.75)
        enable_full_source(found, out, "35-second")
        verify_editor(found, out, secondary_input, "35-second-opened-editor")
        screenshot(out, "35-second-opened")
        append = b"% I62_GUI_SECOND_SAVED"
        click(found, *POINTS["source"])
        key("ctrl+End")
        paste(append, out / "clipboard-second-edit.txt")
        click(found, *POINTS["save"])
        wait(lambda: append in secondary.read_bytes(),
             "Real second-file GUI Open/Edit/Save did not persist")
        if secondary.read_bytes() != secondary_input + append:
            raise RuntimeError("Second-file GUI Save normalized CRLF or opaque bytes")
        if source.read_bytes() != six_bytes:
            raise RuntimeError("Second-file Save corrupted first document")
        screenshot(out, "36-second-crlf-saved")
        report["gui_two_file_crlf"] = "PASS_REAL_X11_TWO_FILE_GUI_OPEN_SAVE"
        report["file_menu_path_edit"] = "PASS_REAL_X11_EDITABLE_FILE_PATH"

        # External change is independent INPUT. Verify the native Ctrl+O
        # shortcut by observing the ACTUAL TextEdit via its X11 clipboard,
        # not merely an on-disk source comparison after a Save. A missed key
        # event must never be disguised as a successful keyboard shortcut.
        external = b"% I62_EXTERNAL_BEFORE_REOPEN"
        secondary.write_bytes(secondary_input + append + external)
        run("xdotool", "windowactivate", "--sync", found)
        key("ctrl+o")
        time.sleep(0.65)
        enable_full_source(found, out, "37-reopened")
        screenshot(out, "37-second-reopened")
        expected_reopen = secondary_input + append + external
        try:
            verify_editor(found, out, expected_reopen, "clipboard-after-ctrl-o")
            report["keyboard_reopen"] = "PASS_REAL_X11_CTRL_O_RELOAD"
        except RuntimeError:
            report["keyboard_reopen"] = "FAIL_REAL_X11_CTRL_O_SOURCE_NOT_RELOADED"
            # Retain the failed keyboard originals. A separate visible toolbar
            # recovery can exercise later cases, but final acceptance stays FAIL.
            screenshot(out, "37a-ctrl-o-missed-source")
            click(found, *POINTS["open"])
            time.sleep(0.75)
            enable_full_source(found, out, "37b-toolbar-reopened")
            screenshot(out, "37b-open-toolbar-recovery")
            verify_editor(found, out, expected_reopen, "clipboard-after-toolbar-open")
            report["toolbar_reopen"] = "PASS_REAL_X11_VISIBLE_OPEN_SOURCE_RELOAD"
        after_reopen = b"% I62_AFTER_GUI_REOPEN"
        click(found, *POINTS["source"])
        key("ctrl+End")
        paste(after_reopen, out / "clipboard-reopen-edit.txt")
        click(found, *POINTS["save"])
        wait(lambda: after_reopen in secondary.read_bytes(),
             "Reopened GUI document cannot be edited and saved")
        if secondary.read_bytes() != secondary_input + append + external + after_reopen:
            raise RuntimeError("GUI Open failed to reload external CRLF source")
        report["gui_open_reopen"] = "PASS_REAL_X11_BYTE_EXACT_RELOAD"

        # Real dirty Open -> Cancel: never discard the original unsaved edit.
        pending = b"% I62_DIRTY_CANCEL_SURVIVES"
        click(found, *POINTS["source"])
        key("ctrl+End")
        paste(pending, out / "clipboard-dirty-source.txt")
        screenshot(out, "38-dirty-source")
        click(found, *POINTS["file_menu"])
        time.sleep(0.44)
        click(found, *POINTS["file_path"])
        key("ctrl+a")
        paste(b"figure.tex", out / "clipboard-first-path.txt")
        key("Escape")
        key("ctrl+o")
        time.sleep(0.55)
        screenshot(out, "39-pending-dirty-open")
        if modal_region_change(out / "38-dirty-source.png", out / "39-pending-dirty-open.png") <= 0.015:
            raise RuntimeError("Dirty Open did not visibly show the central pending-decision modal")
        key("Escape")
        time.sleep(0.40)
        screenshot(out, "40-dirty-open-cancelled")
        if modal_region_change(out / "39-pending-dirty-open.png", out / "40-dirty-open-cancelled.png") <= 0.015:
            raise RuntimeError("Escape did not visibly dismiss the dirty-Open modal")
        click(found, *POINTS["save"])
        wait(lambda: pending in secondary.read_bytes(),
             "Dirty Open Cancel discarded unsaved source")
        if secondary.read_bytes() != secondary_input + append + external + after_reopen + pending:
            raise RuntimeError("Dirty Open cancel corrupted second source")
        if source.read_bytes() != six_bytes:
            raise RuntimeError("Dirty Open changed original first document")
        report["dirty_open_cancel"] = "PASS_REAL_X11_CANCEL_AND_SAVE_BYTES"
        report["steps"].append({
            "case": "f1_native_visual_undo_two_file_crlf_reopen_dirty_cancel",
            "first_source_sha256": sha(source), "second_source_sha256": sha(secondary)
        })

        # N3: actual TextEdit caret inside a literal C circle radius token,
        # followed by native F1. This is a THIRD input file, not a forged GUI
        # source output. Earlier six-tool and CRLF source proofs are unchanged.
        n3_file = out / "n3-source-parameter-crlf.tex"
        n3_input = (
            "\\documentclass{standalone}\r\n"
            "\\usepackage{tikz}\r\n"
            "\\begin{document}\r\n"
            "\\begin{tikzpicture}\r\n"
            "\\draw (1cm,1cm) circle[radius=8mm];\r\n"
            "\\end{tikzpicture}\r\n"
            "\\myOpaque{не менять}\r\n"
            "\\end{document}\r\n"
        ).encode("utf-8")
        n3_file.write_bytes(n3_input)
        click(found, *POINTS["file_menu"])  # Existing real File menu.
        time.sleep(0.36)
        click(found, *POINTS["file_path"])
        key("ctrl+a")
        paste(b"n3-source-parameter-crlf.tex", out / "clipboard-n3-file-path.txt")
        key("Escape")
        key("ctrl+o")
        time.sleep(0.65)
        enable_full_source(found, out, "41-n3")
        verify_editor(found, out, n3_input, "41-n3-opened-editor")
        screenshot(out, "41-n3-real-file-opened")
        click(found, *POINTS["properties"])  # Properties dock before F1 transition.
        click(found, *POINTS["source"])  # Real permanently editable code pane.
        key("ctrl+Home")
        for _ in range(4):  # Fifth physical source line is the C circle.
            key("Down")
        key("End")
        for _ in range(4):  # Four chars back from 8mm]; -> inside 8mm.
            key("Left")
        screenshot(out, "42-n3-caret-in-circle-radius")
        dock_before = dock_signature(out, "42-n3-caret-in-circle-radius")
        held_f1()
        screenshot(out, "43-n3-f1-catalogue-radius")
        dock_after = dock_signature(out, "43-n3-f1-catalogue-radius")
        if dock_after == dock_before:
            raise RuntimeError("N3 actual F1 did not switch the visible Help dock")
        # Read-only F1 may not modify the on-disk or in-editor source.
        click(found, *POINTS["save"])
        if n3_file.read_bytes() != n3_input:
            raise RuntimeError("N3 source caret help changed CRLF/opaque input")
        if source.read_bytes() != six_bytes:
            raise RuntimeError("N3 Help changed previously accepted six-tool document")
        report["source_parameter_f1"] = "REAL_X11_F1_AND_SOURCE_BYTES_PASS_LABEL_REVIEW_REQUIRED"
        report["steps"].append({
            "case": "real_source_textedit_circle_radius_f1_shared_c_help",
            "source_sha256": sha(n3_file),
            "help_screenshot": "43-n3-f1-catalogue-radius.png",
            "help_label_manual_review": "NOT_RUN",
        })

        if report["keyboard_reopen"].startswith("FAIL"):
            raise RuntimeError(
                "Ctrl+O Linux/X11 shortcut regression: toolbar recovery allowed "
                "remaining real N3/F1 tests, but exact-head acceptance is FAIL"
            )
        report["status"] = "PASS_AUTOMATED_REAL_X11_REQUIRES_MANUAL_ARTIFACT_REVIEW"
        report["native_acceptance"] = "REQUIRES_INDEPENDENT_CURRENT_ORIGINAL_REVIEW"
    except Exception as exc:
        report["error"] = f"{type(exc).__name__}: {exc}"
        if NATIVE:
            NATIVE.retain_sources("failure")
        try:
            screenshot(out, "failure-original-desktop")
        except Exception as capture_error:
            report["failure_capture_error"] = str(capture_error)
    finally:
        if process:
            process.terminate()
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        app_log.close()
        if NATIVE:
            NATIVE.log.close()
        report["files"] = {
            str(file.relative_to(out)): sha(file) for file in sorted(out.rglob("*"))
            if file.is_file() and file.name != "report.json"
        }
        (out / "report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report["status"].startswith("PASS_AUTOMATED") else 1


if __name__ == "__main__":
    raise SystemExit(main())
