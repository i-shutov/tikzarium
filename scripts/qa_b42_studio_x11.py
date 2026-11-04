#!/usr/bin/env python3
"""B42 bootstrap ONLY: inspect the real egui Studio window and floating palette.

Screenshot success is NOT six-gesture, XeLaTeX, Win10, or physical GUI PASS.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

def cmd(*args: str, timeout: int = 25) -> str:
    done = subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=True)
    return done.stdout.strip()

def snapshot(destination: Path) -> None:
    subprocess.run(
        ["import", "-window", "root", str(destination)],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30
    )
    if destination.stat().st_size < 5000:
        raise RuntimeError(f"Screenshot unexpectedly empty: {destination}")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    options = parser.parse_args()
    options.out.mkdir(parents=True, exist_ok=True)
    report = {
        "schema_version": 1,
        "kind": "B42_ACTUAL_EGUI_BOOTSTRAP",
        "source_ui": "REAL_X11_PROCESS",
        "six_native_gestures": "NOT_RUN",
        "actual_xelatex_pdf": "NOT_RUN",
        "physical_windows10": "NOT_RUN",
        "physical_mac_m1_m4": "NOT_RUN",
        "manual_screenshot_review": "NOT_RUN",
        "status": "FAIL",
    }
    app_log = (options.out / "app.log").open("w", encoding="utf-8")
    process = None
    try:
        env = os.environ.copy()
        env["TIKZARIUM_XELATEX"] = "/nonexistent/offline-studio-bootstrap"
        process = subprocess.Popen(
            [str(options.app.resolve())],
            env=env, stdout=app_log, stderr=subprocess.STDOUT,
        )
        window = cmd("xdotool", "search", "--sync", "--onlyvisible",
                     "--name", "TikZarium", timeout=35).splitlines()[-1]
        cmd("xdotool", "windowmove", window, "0", "0")
        cmd("xdotool", "windowsize", "--sync", window, "1366", "768")
        cmd("xdotool", "windowactivate", "--sync", window)
        time.sleep(2.0)
        snapshot(options.out / "01-studio-workspace.png")
        # Candidate click only; its actual position and visual result require
        # manual screenshot review before calling ANY palette selected.
        cmd("xdotool", "mousemove", "--window", window, "30", "146")
        cmd("xdotool", "click", "1")
        time.sleep(0.8)
        snapshot(options.out / "02-group-palette-candidate.png")
        report["palette_selection"] = "CANDIDATE_COORDINATE_NOT_VERIFIED"

        # B43 layout PROBE, not a source-integrity acceptance: paste a long
        # Unicode/opaque sample through the real X11 clipboard into the live
        # editor, then capture where the visible code/canvas/right dock land.
        # No new source is written to the user's filesystem or compiled.
        specimen = (
            "% " + "ДлинныйКомментарий_TikZ_".join(["неизвестный_макрос"] * 24)
            + "\n\\myOpaque{не менять}\n"
            + "\\draw[rounded corners=2pt, line width=1pt, opacity=0.7] "
            + "(0,0) -- (1,1);\n"
        )
        specimen_path = options.out / "b43-clipboard-source.txt"
        specimen_path.write_text(specimen, encoding="utf-8")
        subprocess.run(
            ["xclip", "-selection", "clipboard", "-i", str(specimen_path)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            timeout=8, check=True,
        )
        # Source pane receives the click: the titlebar and panel coordinates
        # are visible in the 01 screenshot. No guessed checkbox click.
        cmd("xdotool", "mousemove", "--sync", "175", "268")
        cmd("xdotool", "click", "1")
        cmd("xdotool", "key", "--clearmodifiers", "ctrl+a")
        cmd("xdotool", "key", "--clearmodifiers", "ctrl+v")
        time.sleep(1.2)
        snapshot(options.out / "03-long-unicode-source-default-wrap-candidate.png")
        report["b43_long_source"] = "REAL_CLIPBOARD_PASTE_CANDIDATE_MANUAL_GUI_REVIEW"
        report["b43_source_wrap_toggle"] = "NOT_RUN_PENDING_REVIEWED_CHECKBOX_COORDINATES"
        report["status"] = "BOOTSTRAP_CAPTURED_REQUIRES_MANUAL_VISUAL_REVIEW"
        report["window_id"] = window
    except Exception as error:
        report["error"] = f"{type(error).__name__}: {error}"
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        app_log.close()
        report["files"] = {
            item.name: hashlib.sha256(item.read_bytes()).hexdigest()
            for item in options.out.iterdir()
            if item.is_file() and item.name != "report.json"
        }
        (options.out / "report.json").write_text(
            json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report["status"].startswith("BOOTSTRAP_CAPTURED") else 1

if __name__ == "__main__":
    raise SystemExit(main())
