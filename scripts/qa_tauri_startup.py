#!/usr/bin/env python3
"""Observe a production Tauri binary on X11; not full GUI/scientific acceptance."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time


def run(*args: str) -> str:
    return subprocess.check_output(args, text=True, timeout=10).strip()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--source-sha", required=True)
    args = parser.parse_args()
    app = args.app.resolve(strict=True)
    args.out.mkdir(parents=True, exist_ok=False)
    report = {"schema_version": 1, "status": "NOT_RUN", "source_sha": args.source_sha,
              "platform": "HOSTED_LINUX_X11", "desktop": "1366x768",
              "manual_review": "NOT_RUN", "scientific_acceptance": "NOT_ESTABLISHED",
              "physical_win10_ime_dpi": "NOT_RUN", "subagents_launched": 0}
    process = None
    try:
        assert len(args.source_sha) == 40 and all(c in "0123456789abcdef" for c in args.source_sha)
        with (args.out / "application.log").open("wb") as output:
            process = subprocess.Popen([str(app)], stdout=output, stderr=subprocess.STDOUT,
                                       env={**os.environ, "GDK_BACKEND": "x11"})
            report["pid"] = process.pid
            window = None
            for _ in range(100):
                if process.poll() is not None:
                    raise RuntimeError(f"Tauri exited before window: {process.returncode}")
                try:
                    windows = run("xdotool", "search", "--onlyvisible", "--pid", str(process.pid), "--name", "TikZarium")
                    if windows:
                        window = windows.splitlines()[0]
                        break
                except subprocess.CalledProcessError:
                    pass
                time.sleep(0.3)
            if window is None:
                raise RuntimeError("No visible owned Tauri window within bounded startup interval")
            exe = Path(f"/proc/{process.pid}/exe").resolve(strict=True)
            assert exe == app, (exe, app)
            report.update({"window_id": window, "title": run("xdotool", "getwindowname", window),
                           "observed_executable": str(exe),
                           "executable_sha256": hashlib.sha256(exe.read_bytes()).hexdigest()})
            subprocess.run(["wmctrl", "-ir", hex(int(window)), "-e", "0,0,0,1180,680"], check=True, timeout=10)
            time.sleep(5)  # Rendering observation, not a human latency measurement.
            report["geometry"] = run("xwininfo", "-id", window)
            subprocess.run(["import", "-window", "root", str(args.out / "desktop.original.png")], check=True, timeout=15)
            assert process.poll() is None, "Tauri exited during capture"
            report["status"] = "HOSTED_TAURI_STARTUP_OBSERVED_REQUIRES_VISUAL_REVIEW"
            subprocess.run(["wmctrl", "-ic", hex(int(window))], check=True, timeout=10)
            try:
                report["close_exit_code"] = process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                report["close_exit_code"] = "TIMEOUT_HARNESS_CLEANUP"
    except Exception as error:
        report["status"] = "FAIL"
        report["error"] = repr(error)
        raise
    finally:
        if process is not None and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
            report["harness_cleanup"] = True
        report["files"] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in args.out.iterdir() if p.is_file() and p.name != "startup-report.json"}
        (args.out / "startup-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
