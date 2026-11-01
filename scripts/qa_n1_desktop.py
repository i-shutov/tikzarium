#!/usr/bin/env python3
"""Drive a real TikZarium X11 process; never equate Xvfb with Win10/Mac QA.

Requires an isolated DISPLAY, xdotool, ImageMagick import, xclip and Poppler.
All artifacts/settings are written below an empty output folder. Production
source is never changed. Coordinate profiles are specific to a reviewed UI SHA.
"""
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import time

MARKER = " % tikzarium:n1:"
TOOLS = frozenset(("line", "arrow", "rectangle", "circle", "node", "cubic"))
FIXTURE = r"""\documentclass{standalone}
\usepackage{fontspec}
\setmainfont{DejaVu Serif}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
% KEEP: original user macro and Cyrillic must remain byte-identical.
\newcommand{\UserLabel}{Не менять}
\begin{document}
\begin{tikzpicture}
  \node at (0,0) {\UserLabel};
\end{tikzpicture}
\end{document}
"""


def x11_button1_mask() -> int:
    """Query X11 server Button1Mask (1<<8), not the QA driver's intent.

    Repeated xdotool commands are independent XTest clients. A screenshot
    taken before the driver's mouseup does not prove X11 still sees Button1
    pressed. Fail closed when XQueryPointer cannot establish the live mask.
    """
    x11 = ctypes.CDLL("libX11.so.6")
    ptr = ctypes.c_void_p
    window = ctypes.c_ulong
    integer = ctypes.c_int
    mask_type = ctypes.c_uint
    x11.XOpenDisplay.argtypes = [ctypes.c_char_p]
    x11.XOpenDisplay.restype = ptr
    x11.XDefaultScreen.argtypes = [ptr]
    x11.XDefaultScreen.restype = integer
    x11.XRootWindow.argtypes = [ptr, integer]
    x11.XRootWindow.restype = window
    x11.XQueryPointer.argtypes = [
        ptr, window, ctypes.POINTER(window), ctypes.POINTER(window),
        ctypes.POINTER(integer), ctypes.POINTER(integer),
        ctypes.POINTER(integer), ctypes.POINTER(integer),
        ctypes.POINTER(mask_type),
    ]
    x11.XQueryPointer.restype = integer
    x11.XCloseDisplay.argtypes = [ptr]
    x11.XCloseDisplay.restype = integer
    display = x11.XOpenDisplay(None)
    if not display:
        raise RuntimeError("XQueryPointer cannot open active X11 DISPLAY")
    try:
        root = x11.XRootWindow(display, x11.XDefaultScreen(display))
        root_reply, child = window(), window()
        root_x, root_y, win_x, win_y = integer(), integer(), integer(), integer()
        mask = mask_type()
        if not x11.XQueryPointer(
            display, root, ctypes.byref(root_reply), ctypes.byref(child),
            ctypes.byref(root_x), ctypes.byref(root_y),
            ctypes.byref(win_x), ctypes.byref(win_y), ctypes.byref(mask),
        ):
            raise RuntimeError("XQueryPointer did not return a pointer mask")
        return mask.value
    finally:
        x11.XCloseDisplay(display)


def x11_button1_pressed(mask: int) -> bool:
    return bool(mask & (1 << 8))


def xtest_ctrl_z_sequence(ctrl_keycode: int, z_keycode: int) -> tuple[tuple[int, bool], ...]:
    """Physical XTest key sequence; never sends a mouse button release."""
    return ((ctrl_keycode, True), (z_keycode, True),
            (z_keycode, False), (ctrl_keycode, False))


def x11_keycode_down(keymap: bytes, keycode: int) -> bool:
    """The XQueryKeymap 256-bit server state, independent of app focus."""
    if len(keymap) != 32 or not 8 <= keycode <= 255:
        raise ValueError("X11 keymap must be 32 bytes with a valid keycode")
    return bool(keymap[keycode // 8] & (1 << (keycode % 8)))


def xtest_ctrl_z_preserving_pointer() -> dict:
    """Send X11 Ctrl+Z with physically observable key-down dwell.

    A burst of four XTest key events can elide the hotkey from the GUI
    event-loop without ever releasing the mouse. Each event is XSync'd,
    its XQueryKeymap state verified, and held for > one typical GUI frame.
    This is a QA-only server-side keyboard input, not a Session call.
    """
    x11 = ctypes.CDLL("libX11.so.6")
    xtest = ctypes.CDLL("libXtst.so.6")
    ptr = ctypes.c_void_p
    x11.XOpenDisplay.argtypes = [ctypes.c_char_p]
    x11.XOpenDisplay.restype = ptr
    x11.XKeysymToKeycode.argtypes = [ptr, ctypes.c_ulong]
    x11.XKeysymToKeycode.restype = ctypes.c_ubyte
    x11.XSync.argtypes = [ptr, ctypes.c_int]
    x11.XSync.restype = ctypes.c_int
    x11.XQueryKeymap.argtypes = [ptr, ptr]
    x11.XQueryKeymap.restype = ctypes.c_int
    x11.XGetInputFocus.argtypes = [
        ptr, ctypes.POINTER(ctypes.c_ulong), ctypes.POINTER(ctypes.c_int)]
    x11.XGetInputFocus.restype = ctypes.c_int
    x11.XCloseDisplay.argtypes = [ptr]
    x11.XCloseDisplay.restype = ctypes.c_int
    xtest.XTestFakeKeyEvent.argtypes = [
        ptr, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
    xtest.XTestFakeKeyEvent.restype = ctypes.c_int
    display = x11.XOpenDisplay(None)
    if not display:
        raise RuntimeError("XTest Ctrl+Z cannot open active X11 DISPLAY")
    try:
        ctrl = x11.XKeysymToKeycode(display, 0xFFE3)  # XK_Control_L
        z = x11.XKeysymToKeycode(display, ord("z"))
        if not ctrl or not z or ctrl == z:
            raise RuntimeError("XTest Ctrl+Z keycodes unavailable")
        focused = ctypes.c_ulong()
        revert_to = ctypes.c_int()
        x11.XGetInputFocus(display, ctypes.byref(focused), ctypes.byref(revert_to))
        trace = {"focus_window": focused.value, "key_events": []}
        for code, pressed in xtest_ctrl_z_sequence(ctrl, z):
            if not xtest.XTestFakeKeyEvent(display, code, int(pressed), 0):
                raise RuntimeError("XTestFakeKeyEvent rejected Ctrl+Z")
            x11.XSync(display, 0)
            keymap = ctypes.create_string_buffer(32)
            x11.XQueryKeymap(display, keymap)
            actual = x11_keycode_down(keymap.raw, code)
            button_mask = x11_button1_mask()
            trace["key_events"].append({
                "keycode": code, "expected_pressed": pressed,
                "server_pressed": actual, "button1_mask": button_mask,
                "button1": x11_button1_pressed(button_mask),
            })
            if actual != pressed:
                raise RuntimeError("X11 server failed to register Ctrl+Z key state")
            if not x11_button1_pressed(button_mask):
                raise RuntimeError("X11 server dropped held Button1 during Ctrl+Z")
            time.sleep(0.08)
        return trace
    finally:
        x11.XCloseDisplay(display)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(argv: list[str], *, timeout: float = 20) -> str:
    result = subprocess.run(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError(f"{argv[0]} exit {result.returncode}: "
                           + result.stderr.decode("utf-8", "replace")[-1800:])
    return result.stdout.decode("utf-8", "replace").strip()


def parse_owner_line(line: str) -> dict | None:
    """Read exact trailing N1 metadata, without changing native TikZ bytes.

    The first marker starts the comment: the JSON payload itself may contain
    marker-like Cyrillic node text. V1 is legacy hex JSON, V2 a compact tuple.
    This checks source provenance for the desktop fixture, not a TeX parser.
    """
    if MARKER not in line:
        return None
    prefix, payload = line.split(MARKER, 1)
    if not prefix.startswith("  \\") or not prefix.rstrip().endswith(";"):
        raise ValueError("N1 marker is not attached to a native command line")
    if payload.startswith("["):
        value = json.loads(payload)
        if not isinstance(value, list) or len(value) != 4:
            raise ValueError("Invalid compact N1 tuple")
        schema, owner_id, tool, values = value
        if type(schema) is not int or schema != 2:
            raise ValueError("Unsupported compact N1 schema")
    else:
        value = json.loads(bytes.fromhex(payload))
        if not isinstance(value, dict) or set(value) != {"schema", "id", "tool", "draft"}:
            raise ValueError("Invalid legacy N1 object")
        schema, owner_id, tool = value["schema"], value["id"], value["tool"]
        draft = value["draft"]
        if type(schema) is not int or schema != 1 or not isinstance(draft, dict):
            raise ValueError("Unsupported legacy N1 schema")
        values = draft.get("values")
    if type(owner_id) is not int or owner_id <= 0 or tool not in TOOLS:
        raise ValueError("Invalid N1 owner ID or native tool")
    if not isinstance(values, dict) or not all(
        isinstance(k, str) and isinstance(v, str) for k, v in values.items()
    ):
        raise ValueError("Invalid typed N1 parameter values")
    return {"schema": schema, "id": owner_id, "tool": tool, "values": values}


def owners(source: bytes) -> list[dict]:
    found = []
    for line in source.decode("utf-8").splitlines():
        owner = parse_owner_line(line)
        if owner is not None:
            found.append(owner)
    ids = [record["id"] for record in found]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate N1 owner ID across schema versions")
    return found


def original_preserved(original: bytes, current: bytes) -> bool:
    # Strip only independently validated complete native N1 command lines.
    # Any altered unrelated byte, including Unicode/CRLF, fails closed.
    remainder = []
    for line in current.splitlines(keepends=True):
        if MARKER.encode() in line:
            parse_owner_line(line.decode("utf-8").rstrip("\r\n"))
        else:
            remainder.append(line)
    return b"".join(remainder) == original


def verify_held_undo(before: bytes, after: bytes, original: bytes) -> None:
    """Both source rollback and non-insertion of a held gesture are required."""
    if len(owners(before)) != 1 or owners(before)[0]["tool"] != "line":
        raise RuntimeError("B30 setup must contain exactly the original line")
    if after != original:
        raise RuntimeError("B30 Undo/mouse-up did not restore exact source bytes or inserted a ghost")
    if owners(after):
        raise RuntimeError("B30 cancelled gesture left an owned native command")


def default_dark_selected_rgb(rgb: tuple[int, int, int]) -> bool:
    """Conservative egui default-dark blue selection, not semantic PDF proof.

    Used only for SOURCE-TREE-pinned, screenshot-calibrated X11 profile. An
    accent mismatch should fail, never silently classify a wrong button hit.
    """
    red, green, blue = rgb
    return green > red + 45 and blue > red + 70 and blue > green + 20


def screenshot_pixel_rgb(path: Path, xy: tuple[int, int]) -> tuple[int, int, int]:
    """Read a physically captured PNG pixel using existing ImageMagick."""
    import re
    pixel = run(["identify", "-format",
                 f"%[pixel:p{{{xy[0]},{xy[1]}}}]", str(path)])
    match = re.fullmatch(r"(?:srgb|rgb)\((\d+),(\d+),(\d+)\)", pixel)
    if match is None:
        raise RuntimeError(f"Unexpected screenshot RGB format: {pixel!r}")
    return tuple(int(value) for value in match.groups())


def wait_for(predicate, seconds: float, message: str) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.15)
    raise RuntimeError(message)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--profile", type=Path)
    args = parser.parse_args()
    app = args.app.resolve(strict=True)
    out = args.output.resolve()
    if out.exists() and any(out.iterdir()):
        parser.error("Output must be empty; never reuse prior evidence")
    out.mkdir(parents=True, exist_ok=True)
    profile = json.loads(args.profile.read_text()) if args.profile else {
        "path_click": [310, 18], "source_click": [120, 190], "gestures": []}
    if args.profile and profile.get("reviewed_app_tree_sha") != os.getenv("TIKZARIUM_APP_TREE_SHA"):
        parser.error("Coordinate profile was not reviewed for this exact app source tree")
    source = out / "drawing.tex"
    clipboard = out / "clipboard-input.txt"
    clipboard.write_bytes(FIXTURE.encode("utf-8"))
    report = {"schema": 1, "status": "FAIL", "host": platform.platform(),
              "source_head_sha": os.getenv("TIKZARIUM_SOURCE_SHA", "UNKNOWN"),
              "qa_head_sha": os.getenv("TIKZARIUM_QA_SHA", "UNKNOWN"),
              "app_sha256": sha256(app), "gui_backend": "X11/Xvfb/software-GL",
              "physical_win10_miktex": "NOT_RUN", "physical_m1_m4": "NOT_RUN",
              "pointer_authoring": "NOT_RUN", "manual_visual_review": "NOT_RUN",
              "gui_pdf_export": "NOT_RUN", "fit_width": "NOT_RUN", "full_page": "NOT_RUN",
              "fit_page": "NOT_RUN", "responsive_fit": "NOT_RUN",
              "compact_fit_page": "NOT_RUN", "compact_fit_width": "NOT_RUN",
              "b30_held_pointer_undo": "NOT_RUN",
              "x11_button1_mask_trace": [],
              "f1_help_visual": "NOT_RUN",
              "reviewed_app_tree_sha": os.getenv("TIKZARIUM_APP_TREE_SHA", "UNKNOWN"),
              "steps": []}
    env = os.environ.copy()
    env.update({"XDG_CONFIG_HOME": str(out / "config"),
                "XDG_DATA_HOME": str(out / "data"), "XDG_CACHE_HOME": str(out / "cache"),
                "LIBGL_ALWAYS_SOFTWARE": "1", "WINIT_UNIX_BACKEND": "x11"})
    env.pop("WAYLAND_DISPLAY", None)
    process = None
    window = None
    log = (out / "app.log").open("wb")
    try:
        process = subprocess.Popen([str(app)], env=env, stdout=log, stderr=log)
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError(f"GUI exited during startup: {process.returncode}")
            probe = subprocess.run(["xdotool", "search", "--onlyvisible", "--pid",
                                    str(process.pid), "--name", "TikZarium"],
                                   capture_output=True, check=False, timeout=5)
            if probe.returncode == 0 and probe.stdout.strip():
                window = probe.stdout.decode().splitlines()[-1]
                break
            time.sleep(0.2)
        if window is None:
            raise RuntimeError("No visible app window for the launched PID")
        run(["xdotool", "windowsize", "--sync", window, "1366", "740"])
        run(["xdotool", "windowmove", window, "0", "0"])
        run(["xdotool", "windowactivate", "--sync", window])
        time.sleep(1)
        report["window_geometry"] = run(["xdotool", "getwindowgeometry", "--shell", window])

        def screenshot(name: str) -> None:
            run(["import", "-window", window, str(out / name)])
            if (out / name).read_bytes()[:8] != b"\x89PNG\r\n\x1a\n":
                raise RuntimeError("Screen capture is not PNG")

        def click(xy: list[int]) -> None:
            run(["xdotool", "mousemove", "--sync", "--window", window,
                 str(xy[0]), str(xy[1]), "click", "1"])
            time.sleep(0.15)

        def key(value: str) -> None:
            run(["xdotool", "key", "--clearmodifiers", value])
            time.sleep(0.15)

        screenshot("01-startup.png")
        report["steps"].append({"case": "visible_window", "status": "PASS"})
        # Populate the editor with real clipboard/keyboard events, not a Session call.
        subprocess.run(["xclip", "-selection", "clipboard", "-i", str(clipboard)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       timeout=5, check=True)
        click(profile["source_click"])
        key("ctrl+a")
        key("ctrl+v")
        click(profile["path_click"])
        key("ctrl+a")
        run(["xdotool", "type", "--clearmodifiers", "--delay", "5", str(source)])
        time.sleep(0.4)
        screenshot("02a-path-typed.png")
        # A path TextEdit may consume the shortcut while it owns keyboard
        # focus. Leave the path editor explicitly before triggering actual
        # global Save; never synthesize a file from this test driver.
        click(profile["source_click"])
        # Observe the Ctrl+S path, but do not let a flaky focused-TextEdit
        # shortcut conceal the separate user-required *GUI Save* vertical.
        # Explicitly record the shortcut as unverified when the file was not
        # persisted; never fabricate the TeX document in QA.
        key("ctrl+s")
        try:
            wait_for(source.is_file, 2.0,
                     "Ctrl+S after source focus did not persist entered path")
            report["keyboard_save_shortcut"] = "PASS_REAL_X11"
        except RuntimeError:
            report["keyboard_save_shortcut"] = "DID_NOT_PERSIST_IN_2S_NOT_ACCEPTED"
            screenshot("02b-before-explicit-gui-save.png")
            click(profile["save_click"])
            wait_for(source.is_file, 10,
                     "Visible GUI Save button did not persist entered path")
        if source.read_bytes() != FIXTURE.encode("utf-8"):
            raise RuntimeError("Saved buffer differs from actual pasted Unicode source")
        report["steps"].append({"case": "gui_paste_save", "status": "PASS",
                                "keyboard_save": report["keyboard_save_shortcut"],
                                "sha256": sha256(source)})
        screenshot("02-saved-source.png")
        for case in profile.get("gestures", []):
            before = source.read_bytes()
            before_owners = owners(before)
            click(case["tool_click"])
            screenshot("selected-" + case["tool"] + ".png")
            start, end = case["start"], case["end"]
            run(["xdotool", "mousemove", "--sync", "--window", window,
                 str(start[0]), str(start[1]), "mousedown", "1"])
            time.sleep(0.2)
            run(["xdotool", "mousemove", "--sync", "--window", window,
                 str(end[0]), str(end[1])])
            time.sleep(0.2)
            run(["xdotool", "mouseup", "1"])
            time.sleep(0.3)
            # The editor TextEdit can own Ctrl+S after source line focus.
            # Initial Ctrl+S was tested above. For each actual pointer gesture
            # explicitly click the visible GUI Save button; only retry Save,
            # never a gesture, and inspect bytes the app really persisted.
            deadline = time.monotonic() + 8
            save_attempts = 0
            found = []
            while time.monotonic() < deadline:
                save_attempts += 1
                click(profile["save_click"])
                time.sleep(0.3)
                after = source.read_bytes()
                found = owners(after)
                if len(found) == len(before_owners) + 1 and found[-1]["tool"] == case["tool"]:
                    break
            else:
                raise RuntimeError(f"Pointer {case['tool']} not persisted by GUI Save button after {save_attempts} attempts")
            if not original_preserved(FIXTURE.encode("utf-8"), after):
                raise RuntimeError("Pointer authoring changed unrelated user TeX")
            if case["tool"] == "cubic" and b".. controls " not in after:
                raise RuntimeError("Cubic gesture lacks real TikZ Bézier controls")
            report["steps"].append({"case": "pointer_" + case["tool"], "status": "PASS",
                                    "sha256": sha256(source), "id": found[-1]["id"],
                                    "save_attempts": save_attempts})
            screenshot("pointer-" + case["tool"] + ".png")
            if case["tool"] == "line" and profile.get("undo_held_pointer"):
                # B30: actual X11 keyboard Undo WHILE the pointer remains held
                # over the guide; then a real mouse-up, Save, and source-byte
                # inspection. Never fabricate the restored TeX file in QA.
                for moved in (False, True):
                    prior = source.read_bytes()
                    verify_seed = owners(prior)
                    if len(verify_seed) != 1 or verify_seed[0]["tool"] != "line":
                        raise RuntimeError("B30 expected one persisted line before Ctrl+Z")
                    click(case["tool_click"])
                    run(["xdotool", "mousemove", "--sync", "--window", window,
                         str(start[0]), str(start[1]), "mousedown", "1"])
                    if moved:
                        time.sleep(0.2)
                        run(["xdotool", "mousemove", "--sync", "--window", window,
                             str(end[0]), str(end[1])])
                    time.sleep(0.25)
                    variant = "drag" if moved else "click"
                    mask_before = x11_button1_mask()
                    report["x11_button1_mask_trace"].append({
                        "case": variant, "phase": "before_ctrl_z",
                        "mask": mask_before, "button1": x11_button1_pressed(mask_before)})
                    screenshot("b30-" + variant + "-held.png")
                    if not x11_button1_pressed(mask_before):
                        raise RuntimeError("QA XTest Button1 was UP before Ctrl+Z; held-pointer scenario not established")
                    report["x11_held_undo_key_events"] = xtest_ctrl_z_preserving_pointer()
                    report["x11_held_undo_key_input"] = "XTestFakeKeyEvent Control_L+z, each event XSync/80ms XQueryKeymap"
                    time.sleep(0.3)
                    mask_after = x11_button1_mask()
                    report["x11_button1_mask_trace"].append({
                        "case": variant, "phase": "after_ctrl_z_before_explicit_mouseup",
                        "mask": mask_after, "button1": x11_button1_pressed(mask_after)})
                    screenshot("b30-" + variant + "-undo-held.png")
                    if not x11_button1_pressed(mask_after):
                        raise RuntimeError("QA XTest Button1 was released before explicit mouseup; cannot attribute ghost to production")
                    run(["xdotool", "mouseup", "1"])
                    time.sleep(0.3)
                    click(profile["save_click"])
                    wait_for(lambda: source.read_bytes() != prior, 10,
                             "B30 Ctrl+Z did not undo saved first line")
                    reverted = source.read_bytes()
                    verify_held_undo(prior, reverted, FIXTURE.encode("utf-8"))
                    screenshot("b30-" + ("drag" if moved else "click") + "-after-release.png")
                    report["steps"].append({
                        "case": "b30_undo_held_" + ("drag" if moved else "click"),
                        "status": "PASS_REAL_X11_UNDO_RELEASE_NO_GHOST",
                        "sha256": sha256(source)})
                    # Continue the original six-primitive authoring vertical:
                    # one fresh intentional line must still work after Undo.
                    click(case["tool_click"])
                    run(["xdotool", "mousemove", "--sync", "--window", window,
                         str(start[0]), str(start[1]), "mousedown", "1"])
                    time.sleep(0.2)
                    run(["xdotool", "mousemove", "--sync", "--window", window,
                         str(end[0]), str(end[1])])
                    time.sleep(0.2)
                    run(["xdotool", "mouseup", "1"])
                    time.sleep(0.3)
                    click(profile["save_click"])
                    wait_for(lambda: len(owners(source.read_bytes())) == 1, 10,
                             "B30 fresh guide gesture after Undo did not save")
                    restored = source.read_bytes()
                    if (owners(restored)[0]["tool"] != "line"
                            or not original_preserved(FIXTURE.encode("utf-8"), restored)):
                        raise RuntimeError("B30 fresh gesture damaged unrelated TikZ")
                    screenshot("b30-" + ("drag" if moved else "click") + "-fresh-line.png")
                    report["steps"].append({
                        "case": "b30_fresh_after_undo_" + ("drag" if moved else "click"),
                        "status": "PASS_REAL_X11_FRESH_GESTURE", "sha256": sha256(source)})
                report["b30_held_pointer_undo"] = "PASS_REAL_X11_CLICK_AND_DRAG"
        if profile.get("gestures"):
            names = [case["tool"] for case in profile["gestures"]]
            if len(names) != len(TOOLS) or set(names) != TOOLS:
                raise RuntimeError("Real desktop requires all six unique C-native tools")
            persisted = owners(source.read_bytes())
            if len(persisted) != len(TOOLS) or set(x["tool"] for x in persisted) != TOOLS:
                raise RuntimeError("Persisted N1 source is not six real unique tools")
            report["pointer_authoring"] = "PASS_SIX_RECORDED_GESTURES"
        screenshot("03a-f1-before.png")
        key("F1")
        screenshot("03-f1-panel.png")
        if sha256(out / "03a-f1-before.png") == sha256(out / "03-f1-panel.png"):
            raise RuntimeError("Actual F1 key had no visible frame effect")
        key("F1")
        screenshot("03b-f1-second-toggle.png")
        if sha256(out / "03-f1-panel.png") == sha256(out / "03b-f1-second-toggle.png"):
            raise RuntimeError("Second F1 key had no visible frame effect")
        report["f1_help_visual"] = "EVENT_FRAMES_DIFFER_RUSSIAN_CONTENT_REVIEW_REQUIRED"
        report["steps"].append({"case": "F1_frame_toggle", "status": "PASS_FRAMES_DIFFER_CONTENT_UNREVIEWED"})
        if "export_click" in profile:
            # Exercise the production GUI Build control (not a direct
            # xelatex invocation or an unverified shortcut while TextEdit is
            # focused); then the GUI Export PDF control once it is enabled.
            click(profile["build_click"])
            report["steps"].append({"case": "gui_build_button_clicked",
                                    "status": "SENT_NOT_PDF_VERIFIED"})
            screenshot("03c-build-triggered.png")
            pdf = source.with_suffix(".pdf")
            deadline = time.monotonic() + 150
            while time.monotonic() < deadline and not pdf.is_file():
                time.sleep(2)
                click(profile["export_click"])
            if not pdf.is_file() or pdf.read_bytes()[:5] != b"%PDF-":
                raise RuntimeError("Build/export through GUI produced no PDF")
            report["pdf_info"] = run(["pdfinfo", str(pdf)])
            report["pdf_fonts"] = run(["pdffonts", str(pdf)])
            if "emb" not in report["pdf_fonts"] or "yes" not in report["pdf_fonts"]:
                raise RuntimeError("PDF font embedding evidence missing")
            report["pdf_text"] = run(["pdftotext", "-enc", "UTF-8", str(pdf), "-"])
            if "Не менять" not in report["pdf_text"]:
                raise RuntimeError("GUI PDF lost original Cyrillic macro text")
            report["steps"].append({"case": "gui_build_export", "status": "PASS", "sha256": sha256(pdf)})
            report["gui_pdf_export"] = "PASS_REAL_GUI_EXPORT"
            # Canonical external-PDF raster is a visual reference, never a
            # synthesized GUI screenshot or evidence of PDF viewport fit.
            run(["pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-png",
                 "-scale-to", "900", str(pdf), str(out / "04-pdf-reference")], timeout=30)
            if not original_preserved(FIXTURE.encode("utf-8"), source.read_bytes()):
                raise RuntimeError("GUI compilation changed original source bytes")
            time.sleep(1.0)
            screenshot("04a-preview-before-fit.png")
            if "fit_click" in profile:
                click(profile["fit_click"])
                time.sleep(0.4)
            screenshot("04-exact-pdf.png")
            if sha256(out / "04a-preview-before-fit.png") == sha256(out / "04-exact-pdf.png"):
                raise RuntimeError("Fit width click had no visible UI frame effect")
            report["fit_width"] = "FRAMES_DIFFER_MANUAL_WHOLE_PAGE_REVIEW_REQUIRED"
            report["steps"].append({"case": "fit_width_frame_change",
                                    "status": "FRAMES_DIFFER_NOT_VISUAL_PASS"})
            # Fit WIDTH shows all six primitives but cuts off the source's
            # original \\UserLabel at the bottom in a 1366x740 Split window.
            # Test the existing user's one-step Zoom Out control, not invented
            # Fit-page behavior: capture the real frame for independent review.
            if "zoom_out_click" in profile:
                click(profile["zoom_out_click"])
                time.sleep(0.4)
                screenshot("04b-entire-page-candidate.png")
                if sha256(out / "04-exact-pdf.png") == sha256(out / "04b-entire-page-candidate.png"):
                    raise RuntimeError("Zoom Out click had no visible UI frame effect")
                report["full_page"] = "ZOOM_OUT_FRAME_MANUAL_REVIEW_REQUIRED"
                report["steps"].append({"case": "zoom_out_entire_page",
                                        "status": "FRAMES_DIFFER_NOT_VISUAL_PASS"})
            # B25: actual new whole-PDF-page control, separate from Zoom Out.
            # Candidate coordinates require screenshot review on exact app tree.
            if "fit_page_click" in profile:
                before_source = source.read_bytes()
                screenshot("04c-fit-page-before.png")
                click(profile["fit_page_click"])
                time.sleep(0.5)
                screenshot("04d-fit-page-candidate.png")
                if source.read_bytes() != before_source:
                    raise RuntimeError("Fit-page click modified original TeX")
                if sha256(out / "04c-fit-page-before.png") == sha256(out / "04d-fit-page-candidate.png"):
                    raise RuntimeError("Fit-page click had no visible frame effect")
                report["fit_page"] = "FRAME_CHANGED_MANUAL_FULL_PAGE_REVIEW_REQUIRED"
                report["steps"].append({"case": "b25_fit_page_button",
                                        "status": "FRAMES_DIFFER_NOT_VISUAL_PASS"})
        # B26: drive a REAL window resize while the production Fit Page mode
        # remains selected, then restore its original dimensions. Screenshots
        # need independent PDF-versus-GUI visual review; varying pixel arrays
        # alone do NOT prove that the whole PDF remains visible.
        if "responsive_resize" in profile and "fit_page_click" in profile:
            before_resize_source = source.read_bytes()
            run(["xdotool", "windowsize", "--sync", window,
                 str(profile["responsive_resize"][0]),
                 str(profile["responsive_resize"][1])])
            time.sleep(0.7)
            screenshot("04e-b26-resized-fit-page.png")
            report["resized_window_geometry"] = run(["xdotool", "getwindowgeometry", "--shell", window])
            if not all(str(n) in report["resized_window_geometry"]
                       for n in profile["responsive_resize"]):
                raise RuntimeError("Actual window dimensions do not match B26 resize")
            # B31: actual compact GUI controls; differing frames are NOT visual PASS.
            if "compact_fit_width_click" in profile:
                compact_original = source.read_bytes()
                click(profile["compact_fit_width_click"])
                time.sleep(0.5)
                screenshot("04e2-b31-compact-fit-width-candidate.png")
                if (sha256(out / "04e-b26-resized-fit-page.png")
                        == sha256(out / "04e2-b31-compact-fit-width-candidate.png")):
                    raise RuntimeError("Compact Fit width no frame effect; coordinate may be stale")
                if source.read_bytes() != compact_original:
                    raise RuntimeError("Compact Fit width modified TikZ source")
                report["compact_fit_width"] = "FRAME_CHANGED_MANUAL_PDF_WIDTH_REVIEW_REQUIRED"
                report["steps"].append({"case": "b31_compact_fit_width",
                                        "status": "FRAMES_DIFFER_NOT_VISUAL_PASS"})
                click(profile["compact_fit_page_click"])
                time.sleep(0.5)
                screenshot("04e3-b31-compact-fit-page-restored.png")
                if (sha256(out / "04e2-b31-compact-fit-width-candidate.png")
                        == sha256(out / "04e3-b31-compact-fit-page-restored.png")):
                    raise RuntimeError("Compact Fit Page no frame effect; coordinate may be stale")
                if source.read_bytes() != compact_original:
                    raise RuntimeError("Compact mode switches modified TikZ source")
                report["compact_fit_page"] = "FRAME_CHANGED_MANUAL_WHOLE_PAGE_REVIEW_REQUIRED"
                report["steps"].append({"case": "b31_compact_fit_page_restored",
                                        "status": "FRAMES_DIFFER_NOT_VISUAL_PASS"})
            run(["xdotool", "windowsize", "--sync", window,
                 str(profile["restore_size"][0]), str(profile["restore_size"][1])])
            # I45: capture both the restored-size PDF and a later settled
            # frame. Human inspection must compare the printed toolbar zoom
            # against the actual PDF raster/page fit; frame differences alone
            # never prove a corrected zoom label or that the whole page fits.
            time.sleep(0.25)
            screenshot("04f-b26-restored-fit-page.png")
            time.sleep(0.75)
            screenshot("04g-b31-zoom-readout-settled.png")
            report["zoom_readout_review"] = "MANUAL_COMPARE_TOOLBAR_AND_PDF_SCALE_REQUIRED"
            report["steps"].append({"case": "b31_zoom_readout_after_restore",
                                    "status": "TWO_REAL_FRAMES_NEED_VISUAL_QA"})
            if source.read_bytes() != before_resize_source:
                raise RuntimeError("B26 responsive PDF fit modified user's TikZ source")
            if sha256(out / "04e-b26-resized-fit-page.png") == sha256(out / "04f-b26-restored-fit-page.png"):
                raise RuntimeError("B26 window resize and restore produced identical frames")
            report["responsive_fit"] = "ACTUAL_RESIZE_RESTORE_FRAMES_MANUAL_FULLPAGE_REVIEW_REQUIRED"
            report["steps"].append({"case": "b26_live_resize_restore_fit_page",
                                    "status": "FRAMES_CAPTURED_NOT_VISUAL_PASS"})
        # I51/B36: physically clicked Split center toggle. Button coordinates
        # were independently calibrated from first failed B36 GUI screenshots.
        # Selection color plus source-byte guards catch old B35 wrong clicks;
        # only manual external-PDF-vs-GUI review can establish legible page.
        if "b36_pdf_focus_click" in profile:
            before_focus = source.read_bytes()
            run(["xdotool", "windowsize", "--sync", window, "1180", "680"])
            time.sleep(0.75)
            screenshot("05a-b36-drawing-before-toggle.png")
            pdf_probe = (460, 98)  # left blue inset of wrapped PDF крупно button
            guide_probe = (750, 72)  # left blue inset of Рисовать TikZ
            initial_pdf = screenshot_pixel_rgb(out / "05a-b36-drawing-before-toggle.png", pdf_probe)
            initial_draw = screenshot_pixel_rgb(out / "05a-b36-drawing-before-toggle.png", guide_probe)
            if default_dark_selected_rgb(initial_pdf) or not default_dark_selected_rgb(initial_draw):
                raise RuntimeError("B36 bootstrap drawing mode is not selected at reviewed coordinates")
            click(profile["b36_pdf_focus_click"])
            time.sleep(0.9)
            screenshot("05b-b36-pdf-large-candidate.png")
            large_pdf = screenshot_pixel_rgb(out / "05b-b36-pdf-large-candidate.png", pdf_probe)
            large_draw = screenshot_pixel_rgb(out / "05b-b36-pdf-large-candidate.png", guide_probe)
            if not default_dark_selected_rgb(large_pdf) or default_dark_selected_rgb(large_draw):
                raise RuntimeError("B36 real X11 PDF крупно control did not become selected")
            if source.read_bytes() != before_focus:
                raise RuntimeError("B36 PDF focus click changed user source bytes")
            if sha256(out / "05a-b36-drawing-before-toggle.png") == sha256(out / "05b-b36-pdf-large-candidate.png"):
                raise RuntimeError("B36 selected PDF focus has no visible frame difference")
            click(profile["b36_return_guide_click"])
            time.sleep(0.65)
            screenshot("05c-b36-return-guide-candidate.png")
            returned_pdf = screenshot_pixel_rgb(out / "05c-b36-return-guide-candidate.png", pdf_probe)
            returned_draw = screenshot_pixel_rgb(out / "05c-b36-return-guide-candidate.png", guide_probe)
            if default_dark_selected_rgb(returned_pdf) or not default_dark_selected_rgb(returned_draw):
                raise RuntimeError("B36 return-to-guide real X11 control did not become selected")
            if source.read_bytes() != before_focus:
                raise RuntimeError("B36 return-to-guide changed user source bytes")
            report["b36_focus_button_rgb"] = {
                "drawing": {"pdf": initial_pdf, "guide": initial_draw},
                "pdf_focus": {"pdf": large_pdf, "guide": large_draw},
                "restored": {"pdf": returned_pdf, "guide": returned_draw},
            }
            report["b36_pdf_focus"] = "REAL_X11_SELECTED_TOGGLE_AND_SOURCE_BYTES_PROVEN_PDF_CONTENT_MANUAL_NOT_RUN"
            report["steps"].append({"case": "b36_compact_pdf_focus_and_return",
                                    "status": "SOURCE_AND_SELECTION_PROVEN_WHOLE_PAGE_MANUAL_NOT_RUN"})
            run(["xdotool", "windowsize", "--sync", window,
                 str(profile["restore_size"][0]), str(profile["restore_size"][1])])
            time.sleep(0.4)
        report["status"] = ("PASS_DESKTOP_AUTOMATED_VISUAL_REVIEW_PENDING"
                            if profile.get("gestures") else "PASS_BOOTSTRAP_ONLY")
    except Exception as exc:
        report["error"] = str(exc)
        if window:
            try:
                run(["import", "-window", window, str(out / "failure.png")], timeout=5)
            except Exception:
                pass
    finally:
        if process and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        log.close()
        report["files"] = {path.name: sha256(path) for path in out.iterdir()
                           if path.is_file() and path.name != "desktop-report.json"}
        (out / "desktop-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                                                  encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"].startswith("PASS_") else 1


if __name__ == "__main__":
    raise SystemExit(main())
