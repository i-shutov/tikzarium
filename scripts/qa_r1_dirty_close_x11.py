#!/usr/bin/env python3
"""R1 exact-package native WM close/Alt+F4 Cancel→Save→clean-close regression.

Real owned-window X11 input and byte-exact fresh clipboard proof. No synthetic
source replacement. Hosted Xvfb/Openbox is not physical platform qualification.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import platform
import time

from qa_n2_studio_x11 import APP_TREE, Native, POINTS, run, screenshot, sha, wait


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
        "kind": "R1_NATIVE_WM_CLOSE_DIRTY_SOURCE", "status": "FAIL",
        "source_sha": os.getenv("SOURCE_SHA", "UNKNOWN"), "app_tree_sha": APP_TREE,
        "launcher_sha256": sha(launcher), "host": platform.platform(),
        "environment": "HOSTED_XVFB_OPENBOX_NOT_PHYSICAL", "canary": "releasecanary", "steps": [],
    }
    native = Native(launcher, out, report)
    try:
        native.start(out)
        native.full_source()
        screenshot(out, "01-before-edit")
        native.click(*POINTS["source"])
        native.key("ctrl+End")
        native.paste(b"%releasecanary", "canary-native-paste")
        source_before = native.copy("source-before-close")
        if b"releasecanary" not in source_before:
            raise RuntimeError("Canary absent from actual full source editor")
        screenshot(out, "02-dirty-before-close")
        report["steps"].append("real_source_edit_and_clipboard_verified")
        # wmctrl requests _NET_CLOSE_WINDOW/WM_DELETE_WINDOW through Openbox;
        # xdotool windowclose instead destroys the X window and bypasses it.
        run("wmctrl", "-i", "-c", native.window)
        time.sleep(1.1)
        native.alive()
        screenshot(out, "03-native-close-confirmation")
        report["steps"].append("dirty_WM_close_intercepted_process_alive")
        native.key("Escape")
        source_after = native.copy("source-after-wm-cancel")
        if source_after != source_before:
            raise RuntimeError("WM close Cancel altered exact source bytes")
        screenshot(out, "04-cancel-keeps-source")
        report["steps"].append("escape_cancel_preserves_exact_source_bytes")
        native.key("alt+F4")
        time.sleep(0.8)
        native.alive()
        screenshot(out, "05-keyboard-close-confirmation")
        native.key("Escape")
        if native.copy("source-after-alt-f4-cancel") != source_before:
            raise RuntimeError("Alt+F4 Cancel changed source bytes")
        report["steps"].append("Alt_F4_cancel_preserves_source")
        native.key("ctrl+s")
        output = out / "figure.tex"
        wait(output.exists, "Save .tex", 12)
        if output.read_bytes() != source_before:
            raise RuntimeError("Saved source differs from actual pre-close full editor bytes")
        screenshot(out, "06-saved-before-clean-close")
        run("wmctrl", "-i", "-c", native.window)
        wait(lambda: native.process.poll() is not None, "Clean WM close did not exit", 12)
        report["steps"].append("save_then_clean_WM_close")
        report["status"] = "PASS_HOSTED_X11_MANUAL_REVIEW_REQUIRED"
    except Exception as error:
        native.fail(error)
    finally:
        native.stop()
        report["exit_code"] = native.process.returncode if native.process else None
        (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        with (out / "SHA256SUMS").open("w", encoding="utf-8") as stream:
            for path in sorted(out.iterdir()):
                if path.is_file() and path.name != "SHA256SUMS":
                    stream.write(f"{sha(path)}  {path.name}\n")
        print(json.dumps(report, ensure_ascii=False))
    return 0 if report["status"].startswith("PASS_") else 1


if __name__ == "__main__":
    raise SystemExit(main())
