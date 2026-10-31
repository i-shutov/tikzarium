#!/usr/bin/env python3
"""Drive a real TikZarium X11 process; never equate Xvfb with Win10/Mac QA.

Requires an isolated DISPLAY, xdotool, ImageMagick import, xclip and Poppler.
All artifacts/settings are written below an empty output folder. Production
source is never changed. Coordinate profiles are specific to a reviewed UI SHA.
"""
from __future__ import annotations

import argparse
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
    source = out / "drawing.tex"
    clipboard = out / "clipboard-input.txt"
    clipboard.write_bytes(FIXTURE.encode("utf-8"))
    report = {"schema": 1, "status": "FAIL", "host": platform.platform(),
              "source_head_sha": os.getenv("TIKZARIUM_SOURCE_SHA", "UNKNOWN"),
              "qa_head_sha": os.getenv("TIKZARIUM_QA_SHA", "UNKNOWN"),
              "app_sha256": sha256(app), "gui_backend": "X11/Xvfb/software-GL",
              "physical_win10_miktex": "NOT_RUN", "physical_m1_m4": "NOT_RUN",
              "pointer_authoring": "NOT_RUN", "manual_visual_review": "NOT_RUN",
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
        run(["xdotool", "type", "--clearmodifiers", "--delay", "1", str(source)])
        key("ctrl+s")
        wait_for(source.is_file, 10, "Ctrl+S did not save the entered path")
        if source.read_bytes() != FIXTURE.encode("utf-8"):
            raise RuntimeError("Saved buffer differs from actual pasted Unicode source")
        report["steps"].append({"case": "keyboard_paste_save", "status": "PASS",
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
            # X11 event delivery and egui frames are asynchronous. Keep the
            # exact source/count assertion; retry only Save, never the gesture.
            deadline = time.monotonic() + 8
            save_attempts = 0
            found = []
            while time.monotonic() < deadline:
                save_attempts += 1
                key("ctrl+s")
                time.sleep(0.2)
                after = source.read_bytes()
                found = owners(after)
                if len(found) == len(before_owners) + 1 and found[-1]["tool"] == case["tool"]:
                    break
            else:
                raise RuntimeError(f"Pointer {case['tool']} was not saved after {save_attempts} attempts")
            if not original_preserved(FIXTURE.encode("utf-8"), after):
                raise RuntimeError("Pointer authoring changed unrelated user TeX")
            if case["tool"] == "cubic" and b".. controls " not in after:
                raise RuntimeError("Cubic gesture lacks real TikZ Bézier controls")
            report["steps"].append({"case": "pointer_" + case["tool"], "status": "PASS",
                                    "sha256": sha256(source), "id": found[-1]["id"],
                                    "save_attempts": save_attempts})
            screenshot("pointer-" + case["tool"] + ".png")
        if profile.get("gestures"):
            names = [case["tool"] for case in profile["gestures"]]
            if len(names) != len(TOOLS) or set(names) != TOOLS:
                raise RuntimeError("Real desktop requires all six unique C-native tools")
            persisted = owners(source.read_bytes())
            if len(persisted) != len(TOOLS) or set(x["tool"] for x in persisted) != TOOLS:
                raise RuntimeError("Persisted N1 source is not six real unique tools")
            report["pointer_authoring"] = "PASS_SIX_RECORDED_GESTURES"
        key("F1")
        screenshot("03-f1-panel.png")
        report["steps"].append({"case": "F1_event_sent", "status": "SENT_NOT_VISUALLY_VERIFIED"})
        key("F1")
        screenshot("03b-f1-second-toggle.png")
        if "export_click" in profile:
            key("ctrl+Return")
            pdf = source.with_suffix("pdf")
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
            if not original_preserved(FIXTURE.encode("utf-8"), source.read_bytes()):
                raise RuntimeError("GUI compilation changed original source bytes")
            if "fit_click" in profile:
                click(profile["fit_click"])
            screenshot("04-exact-pdf.png")
        report["status"] = "PASS_POINTER" if profile.get("gestures") else "PASS_BOOTSTRAP_ONLY"
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
