#!/usr/bin/env python3
"""R1 exact-package X11 regression: native WM close must not lose a dirty .tex.

Uses real xdotool X11 input, external app ELF via its portable launcher,
and clipboard bytes. No source fixture is modified by this harness.
Xvfb/Openbox is a hosted regression, NOT physical Linux qualification.
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


def run(*argv: str, timeout: int = 20) -> str:
    result = subprocess.run(argv, capture_output=True, timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError(f"{argv[0]} exited {result.returncode}: "
                           + result.stderr.decode("utf-8", "replace")[-1000:])
    return result.stdout.decode("utf-8", "replace").strip()


def wait(test, label: str, seconds: float = 10.0) -> None:
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        if test():
            return
        time.sleep(0.2)
    raise RuntimeError("Timed out waiting for " + label)


def screenshot(out: Path, label: str) -> None:
    png = out / (label + ".png")
    run("import", "-window", "root", str(png), timeout=35)
    if png.stat().st_size < 5000:
        raise RuntimeError("Missing original X11 screenshot " + label)


def key(value: str) -> None:
    run("xdotool", "key", "--clearmodifiers", value)
    time.sleep(0.35)


def copied_source() -> str:
    key("ctrl+a")
    key("ctrl+c")
    return run("xclip", "-selection", "clipboard", "-o")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    out = args.out.resolve()
    if out.exists() and any(out.iterdir()):
        parser.error("Evidence directory must be empty")
    out.mkdir(parents=True, exist_ok=True)
    launcher = args.app.resolve(strict=True)
    report = {
        "kind": "R1_NATIVE_WM_CLOSE_DIRTY_SOURCE",
        "status": "FAIL",
        "source_sha": os.getenv("SOURCE_SHA", "UNKNOWN"),
        "app_tree_sha": os.getenv("TIKZARIUM_APP_TREE_SHA", "UNKNOWN"),
        "launcher_sha256": hashlib.sha256(launcher.read_bytes()).hexdigest(),
        "host": platform.platform(),
        "environment": "HOSTED_XVFB_OPENBOX_NOT_PHYSICAL",
        "canary": "releasecanary",
        "steps": [],
    }
    process = None
    with (out / "app.log").open("wb") as log:
        try:
            env = os.environ.copy()
            env.update({
                "XDG_CONFIG_HOME": str(out / "config"),
                "XDG_DATA_HOME": str(out / "data"),
                "XDG_CACHE_HOME": str(out / "cache"),
                "LIBGL_ALWAYS_SOFTWARE": "1",
                "WINIT_UNIX_BACKEND": "x11",
            })
            env.pop("WAYLAND_DISPLAY", None)
            process = subprocess.Popen([str(launcher)], cwd=out, env=env,
                                       stdout=log, stderr=log)
            def window_ids() -> list[str]:
                found = subprocess.run(
                    ["xdotool", "search", "--onlyvisible", "--name", "TikZarium"],
                    capture_output=True, timeout=5, check=False)
                return found.stdout.decode("ascii", "replace").splitlines() if found.returncode == 0 else []
            wait(lambda: process.poll() is None and bool(window_ids()),
                 "native TikZarium X11 window", 40)
            window = window_ids()[-1]
            run("xdotool", "windowmove", window, "0", "0")
            run("xdotool", "windowactivate", "--sync", window)
            time.sleep(1.1)
            screenshot(out, "01-before-edit")

            # UX1 source body, reviewed in the original native editor PNGs
            # and bootstrap 42981807266; y=209 is now above the TextEdit.
            # This regression intentionally fails if the reviewed app layout moves.
            run("xdotool", "mousemove", "--sync", "130", "260", "click", "1")
            run("xdotool", "type", "--clearmodifiers", "--delay", "70", "releasecanary")
            time.sleep(0.5)
            source_before = copied_source()
            if "releasecanary" not in source_before:
                raise RuntimeError("Canary absent from real source TextEdit")
            (out / "source-before-close.txt").write_bytes(source_before.encode("utf-8"))
            screenshot(out, "02-dirty-before-close")
            report["steps"].append("real_source_edit_and_clipboard_verified")

            # xdotool windowclose invokes XDestroyWindow, bypassing native
            # save confirmation and potentially crashing the winit X11 client.
            # Ubuntu 24.04 xdotool lacks windowquit. Request _NET_CLOSE_WINDOW
            # through Openbox: this is the actual WM_DELETE_WINDOW close path.
            run("wmctrl", "-i", "-c", window)
            time.sleep(1.1)
            if process.poll() is not None or not window_ids():
                raise RuntimeError("DATA LOSS: dirty WM close terminated the process")
            screenshot(out, "03-native-close-confirmation")
            report["steps"].append("dirty_WM_close_intercepted_process_alive")

            key("Escape")  # Cancel the native close, keep the buffer.
            run("xdotool", "mousemove", "--sync", "130", "260", "click", "1")
            source_after = copied_source()
            if source_after != source_before:
                raise RuntimeError("Cancel altered the source buffer")
            screenshot(out, "04-cancel-keeps-source")
            report["steps"].append("escape_cancel_preserves_exact_source_bytes")

            # Normal desktop Alt+F4 must take the same guarded path.
            key("alt+F4")
            time.sleep(0.8)
            if process.poll() is not None or not window_ids():
                raise RuntimeError("DATA LOSS: Alt+F4 closed dirty source")
            screenshot(out, "05-keyboard-close-confirmation")
            key("Escape")
            run("xdotool", "mousemove", "--sync", "130", "260", "click", "1")
            if copied_source() != source_before:
                raise RuntimeError("Keyboard close Cancel changed source")
            report["steps"].append("Alt_F4_cancel_preserves_source")

            # A subsequent ordinary Save must work; clean close must exit.
            key("ctrl+s")
            output = out / "figure.tex"
            wait(output.exists, "Save .tex", 12)
            if "releasecanary" not in output.read_text("utf-8"):
                raise RuntimeError("Saved document lacks the canary")
            run("wmctrl", "-i", "-c", window)
            wait(lambda: process.poll() is not None, "clean WM close", 12)
            report["steps"].append("save_then_clean_WM_close")
            report["status"] = "PASS_HOSTED_X11_MANUAL_REVIEW_REQUIRED"
        except Exception as error:
            report["error"] = repr(error)
            raise
        finally:
            if process and process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            report["exit_code"] = process.returncode if process else None
            (out / "report.json").write_text(
                json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            proof = sorted(p for p in out.iterdir() if p.is_file())
            with (out / "SHA256SUMS").open("w", encoding="utf-8") as f:
                for path in proof:
                    f.write(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n")
            print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    raise SystemExit(main())
