#!/usr/bin/env python3
"""Retain original X11 geometry and bind an N5 viewport to the running ELF.

This is a hosted geometry/identity guard, not a visual or physical DPI verdict.
Openbox's absolute client coordinates come from xwininfo, never from adding
xdotool's decoration-relative coordinates. Raw observations survive failure.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


def parse_geometry(raw: str) -> dict[str, int]:
    fields = {
        "x": "Absolute upper-left X",
        "y": "Absolute upper-left Y",
        "width": "Width",
        "height": "Height",
    }
    result = {}
    for name, label in fields.items():
        values = re.findall(rf"^\s*{re.escape(label)}:\s*(-?\d+)\s*$", raw, re.M)
        if len(values) != 1:
            raise ValueError(f"Expected one actual {label}, found {len(values)}")
        result[name] = int(values[0])
    return result


def validate_geometry(
    geometry: dict[str, int], screen_width: int, screen_height: int,
    min_width: int = 850, min_height: int = 440,
) -> None:
    x, y, width, height = (geometry[k] for k in ("x", "y", "width", "height"))
    if min(screen_width, screen_height, min_width, min_height) <= 0:
        raise ValueError("Screen and minimum client sizes must be positive")
    if x < 0 or y < 0 or width < min_width or height < min_height:
        raise ValueError(f"Inaccessible or undersized client: {geometry}")
    if x + width > screen_width or y + height > screen_height:
        raise ValueError(f"Client lies outside {screen_width}x{screen_height}: {geometry}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--window", required=True)
    parser.add_argument("--pid", type=int, required=True)
    parser.add_argument("--executable", type=Path, required=True)
    parser.add_argument("--screen-width", type=int, required=True)
    parser.add_argument("--screen-height", type=int, required=True)
    parser.add_argument("--min-height", type=int, default=440)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    out = args.out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        parser.error("Refuse to replace existing viewport evidence")
    report = {
        "schema_version": 1, "status": "FAIL",
        "scope": "HOSTED_X11_GEOMETRY_IDENTITY_NOT_PHYSICAL_DPI",
        "source_sha": os.environ.get("SOURCE_SHA", "UNKNOWN"),
        "app_tree_sha": os.environ.get("TIKZARIUM_APP_TREE_SHA", "UNKNOWN"),
        "window_id": args.window, "pid": args.pid,
        "screen": [args.screen_width, args.screen_height],
        "requested_winit_scale": os.environ.get("WINIT_X11_SCALE_FACTOR", "1.0"),
        "manual_image_review": "NOT_RUN",
    }

    def observation(label: str, *command: str) -> str:
        result = subprocess.run(command, capture_output=True, timeout=15, check=False)
        # Original stdout/stderr are retained unchanged, including failed probes.
        out.with_suffix(f".{label}.original.txt").write_bytes(result.stdout)
        out.with_suffix(f".{label}.stderr.original.txt").write_bytes(result.stderr)
        if result.returncode:
            raise RuntimeError(f"{command[0]} failed with exit {result.returncode}")
        return result.stdout.decode("utf-8", "strict")

    try:
        for key in ("source_sha", "app_tree_sha"):
            if not re.fullmatch(r"[0-9a-f]{40}", report[key]):
                raise ValueError(f"Missing exact {key}")
        observed_pid = int(observation("pid", "xdotool", "getwindowpid", args.window).strip())
        if observed_pid != args.pid:
            raise RuntimeError(f"Window belongs to PID {observed_pid}, expected {args.pid}")
        expected = args.executable.resolve(strict=True)
        proc_exe = Path(f"/proc/{args.pid}/exe")
        running = proc_exe.resolve(strict=True)
        if running != expected:
            raise RuntimeError(f"Running executable {running} differs from expected {expected}")
        digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
        running_hash, expected_hash = digest(proc_exe), digest(expected)
        if running_hash != expected_hash:
            raise RuntimeError("Running ELF bytes differ from extracted package")
        report.update({"running_executable": str(running), "running_executable_sha256": running_hash})
        display = observation("display", "xdotool", "getdisplaygeometry").split()
        if display != [str(args.screen_width), str(args.screen_height)]:
            raise RuntimeError(f"Actual X11 display {display} differs from requested screen")
        geometry = parse_geometry(observation("xwininfo", "xwininfo", "-id", args.window))
        # Diagnostic only: its X/Y must never override the absolute observation.
        observation("xdotool", "xdotool", "getwindowgeometry", "--shell", args.window)
        report["client"] = geometry
        validate_geometry(geometry, args.screen_width, args.screen_height, min_height=args.min_height)
        report["status"] = "PASS_HOSTED_GEOMETRY_IDENTITY_MANUAL_IMAGE_REVIEW_REQUIRED"
    except Exception as error:
        report["error"] = repr(error)
        raise
    finally:
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
