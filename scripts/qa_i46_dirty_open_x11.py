#!/usr/bin/env python3
"""Independent real-X11 B34 dirty-Open source-integrity acceptance.

Only XTest/xdotool/xclip operate the actual egui process. The QA driver writes
victim and occupied fixture files BEFORE GUI actions; the saved scratch source
and compiled PDF MUST be created by TikZarium itself. Frame changes are not a
manual visual PASS. Linux/Xvfb is not physical Win10 or macOS acceptance.
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

VICTIM = "\r\n".join((
    r"\documentclass{standalone}",
    r"\usepackage{fontspec}",
    r"\setmainfont{DejaVu Serif}",
    r"\usepackage{tikz}",
    r"% CRLF + opaque macro: do not rewrite",
    r"\newcommand{\OpaqueLabel}{Не менять}",
    r"\begin{document}",
    r"\begin{tikzpicture}",
    r"  \node at (0,0) {\OpaqueLabel};",
    r"\end{tikzpicture}",
    r"\end{document}",
    "",
)).encode("utf-8")
SCRATCH = "\n".join((
    r"\documentclass{standalone}",
    r"\usepackage{tikz}",
    r"% UNSAVED SCRATCH: do not overwrite opening target",
    r"\begin{document}",
    r"\begin{tikzpicture}",
    r"  \draw (0,0) -- (1,1);",
    r"\end{tikzpicture}",
    r"\end{document}",
    "",
)).encode("utf-8")
OCCUPIED = b"% Another existing user file must not be overwritten\r\n"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def command(*args: str, timeout: float = 15) -> str:
    p = subprocess.run(args, capture_output=True, timeout=timeout, check=False)
    if p.returncode:
        raise RuntimeError(f"{args!r}: rc={p.returncode}, stderr="
                           + p.stderr.decode("utf-8", "replace")[-1500:])
    return p.stdout.decode("utf-8", "replace").strip()


def wait_for(predicate, reason: str, seconds: float = 15) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.2)
    raise RuntimeError(reason)


def same_bytes(path: Path, expected: bytes, label: str) -> None:
    if not path.is_file() or path.read_bytes() != expected:
        raise RuntimeError(f"{label}: byte/hash mismatch; original user source corrupted")


def profile_check(profile: dict, app_tree_sha: str) -> None:
    if profile.get("reviewed_app_tree_sha") != app_tree_sha:
        raise ValueError("Unreviewed app/src Git tree; coordinates may target wrong controls")
    for key in ("source", "path", "open_path", "save", "build", "export",
                "modal_input", "modal_save"):
        xy = profile.get(key)
        if (not isinstance(xy, list) or len(xy) != 2
                or any(type(v) is not int or v < 0 for v in xy)):
            raise ValueError(f"Missing reviewed X11 control coordinates: {key}")
    # Bounds measured from actual B34 modal screenshot, failed X11 41307868676.
    # Do not count a click OUTSIDE the button as a rejection-path test.
    rect = profile.get("modal_save_reviewed_rect")
    if (not isinstance(rect, list) or len(rect) != 4
            or any(type(v) is not int for v in rect)
            or not (0 <= rect[0] < rect[2] < 1366 and 0 <= rect[1] < rect[3] < 740)):
        raise ValueError("Missing manually reviewed B34 modal Save button bounds")
    x, y = profile["modal_save"]
    if not (rect[0] <= x <= rect[2] and rect[1] <= y <= rect[3]):
        raise ValueError("Modal Save click is outside reviewed real-X11 button bounds")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--profile", type=Path, required=True)
    args = parser.parse_args()
    app = args.app.resolve(strict=True)
    out = args.out.resolve()
    if out.exists() and any(out.iterdir()):
        parser.error("Evidence directory must be initially empty")
    out.mkdir(parents=True, exist_ok=True)
    profile = json.loads(args.profile.read_text(encoding="utf-8"))
    checked_tree = os.getenv("TIKZARIUM_APP_TREE_SHA", "")
    profile_check(profile, checked_tree)
    victim = out / "victim.tex"
    occupied = out / "occupied.tex"
    scratch = out / "saved-scratch.tex"
    victim.write_bytes(VICTIM)
    occupied.write_bytes(OCCUPIED)
    clipboard = out / "scratch-clipboard.txt"
    clipboard.write_bytes(SCRATCH)
    report = {
        "schema": 1, "status": "FAIL", "source_head": os.getenv("TIKZARIUM_SOURCE_SHA", "UNKNOWN"),
        "qa_head": os.getenv("TIKZARIUM_QA_SHA", "UNKNOWN"),
        "reviewed_app_tree_sha": checked_tree,
        "app_binary_sha256": sha(app.read_bytes()),
        "host": platform.platform(), "desktop": "real egui process on X11/Xvfb",
        "physical_windows_10_miktex": "NOT_RUN",
        "physical_macos_arm_xelatex": "NOT_RUN",
        "manual_screenshot_review": "NOT_RUN",
        "victim_fixture_sha256": sha(VICTIM),
        "occupied_fixture_sha256": sha(OCCUPIED),
        "scratch_clipboard_sha256": sha(SCRATCH),
        "gui_save_before_open": "NOT_RUN",
        "source_undo_fence": "NOT_RUN",
        "gui_xelatex_pdf": "NOT_RUN",
        "steps": [],
    }
    env = os.environ.copy()
    env.update({
        "XDG_CONFIG_HOME": str(out / "config"),
        "XDG_DATA_HOME": str(out / "data"),
        "XDG_CACHE_HOME": str(out / "cache"),
        "LIBGL_ALWAYS_SOFTWARE": "1",
        "WINIT_UNIX_BACKEND": "x11",
    })
    env.pop("WAYLAND_DISPLAY", None)
    process = None
    window = None
    log = (out / "app.log").open("wb")
    try:
        process = subprocess.Popen([str(app)], env=env, stdout=log, stderr=log)
        def locate() -> bool:
            nonlocal window
            if process.poll() is not None:
                raise RuntimeError(f"GUI exited before window: {process.returncode}")
            p = subprocess.run(
                ["xdotool", "search", "--onlyvisible", "--pid", str(process.pid),
                 "--name", "TikZarium"], capture_output=True, timeout=5, check=False)
            if p.returncode == 0 and p.stdout.strip():
                window = p.stdout.decode().splitlines()[-1]
                return True
            return False
        wait_for(locate, "Actual TikZarium egui window not found", 50)
        command("xdotool", "windowsize", "--sync", window, "1366", "740")
        command("xdotool", "windowmove", window, "0", "0")
        # openbox is started asynchronously by the workflow. EWMH
        # _NET_ACTIVE_WINDOW may not be published yet when the real egui
        # window appears. Focus directly as a bounded, independently
        # verified X11 fallback; never pretend an unfocused keyboard worked.
        try:
            command("xdotool", "windowactivate", "--sync", window)
            report["focus_method"] = "EWMH_NET_ACTIVE_WINDOW"
        except RuntimeError:
            command("xdotool", "windowfocus", "--sync", window)
            report["focus_method"] = "XSetInputFocus_direct"
        time.sleep(0.6)
        report["x11_focused_window"] = command("xdotool", "getwindowfocus")
        if int(report["x11_focused_window"]) != int(window):
            raise RuntimeError("X11 focused window differs from actual TikZarium app")
        report["window_geometry"] = command("xdotool", "getwindowgeometry", "--shell", window)

        def shot(name: str) -> None:
            destination = out / name
            command("import", "-window", window, str(destination), timeout=10)
            if destination.read_bytes()[:8] != b"\x89PNG\r\n\x1a\n":
                raise RuntimeError(f"Invalid PNG capture: {name}")

        def click(which: str) -> None:
            x, y = profile[which]
            command("xdotool", "mousemove", "--sync", "--window", window,
                    str(x), str(y), "click", "1")
            time.sleep(0.3)

        def key(sequence: str) -> None:
            command("xdotool", "key", "--clearmodifiers", sequence)
            time.sleep(0.25)

        def type_ascii(value: str) -> None:
            if not value.isascii():
                raise ValueError("Test paths must be ASCII; source Unicode uses real xclip")
            command("xdotool", "type", "--clearmodifiers", "--delay", "3", value, timeout=30)
            time.sleep(0.2)

        def assert_protected(label: str) -> None:
            same_bytes(victim, VICTIM, f"{label}/victim")
            same_bytes(occupied, OCCUPIED, f"{label}/occupied")

        def modal_field(value: Path) -> None:
            click("modal_input")
            key("ctrl+a")
            type_ascii(str(value))

        shot("01-startup.png")
        report["steps"].append({"case": "actual_window", "result": "PASS"})
        # xclip forks and keeps inherited pipes open: never capture its stdout/stderr.
        subprocess.run(["xclip", "-selection", "clipboard", "-i", str(clipboard)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       timeout=5, check=True)
        click("source")
        key("ctrl+a")
        key("ctrl+v")
        shot("02-scratch-edited.png")
        click("path")
        key("ctrl+a")
        type_ascii(str(victim))
        shot("03-open-target-typed.png")
        # B33 must also block direct toolbar Save / Ctrl+S / Build
        # against the occupied path typed for Open. The QA driver never
        # writes victim or an artificial saved TeX after startup.
        click("save")
        assert_protected("scratch_direct_gui_save")
        shot("03a-scratch-save-rejected.png")
        report["steps"].append({
            "case": "scratch_gui_save_occupied_target",
            "result": "VICTIM_HASH_UNCHANGED_MANUAL_STATUS_REVIEW_PENDING"})
        click("source")
        key("ctrl+s")
        assert_protected("scratch_keyboard_ctrl_s")
        shot("03b-scratch-ctrl-s-rejected.png")
        report["steps"].append({
            "case": "scratch_ctrl_s_occupied_target",
            "result": "VICTIM_HASH_UNCHANGED_MANUAL_STATUS_REVIEW_PENDING"})
        click("build")
        time.sleep(0.6)
        assert_protected("scratch_gui_build")
        shot("03c-scratch-build-rejected.png")
        report["steps"].append({
            "case": "scratch_gui_build_occupied_target",
            "result": "VICTIM_HASH_UNCHANGED_MANUAL_STATUS_REVIEW_PENDING"})
        click("open_path")
        time.sleep(0.6)
        shot("04-dirty-open-modal.png")
        report["steps"].append({"case": "actual_dirty_open_modal", "result": "CAPTURED_REVIEW_PENDING"})

        modal_field(victim)
        shot("05-reject-target-before.png")
        click("modal_save")
        time.sleep(0.4)
        assert_protected("reject_same_target")
        if scratch.exists():
            raise RuntimeError("Reject same target unexpectedly persisted scratch")
        shot("06-reject-target-after.png")
        report["steps"].append({"case": "reject_same_open_target", "result": "NO_USER_FILE_OVERWRITE; FRAME_REVIEW_PENDING"})

        modal_field(occupied)
        click("modal_save")
        time.sleep(0.4)
        assert_protected("reject_occupied")
        if scratch.exists():
            raise RuntimeError("Reject occupied file unexpectedly persisted scratch")
        shot("07-reject-other-occupied.png")
        report["steps"].append({"case": "reject_other_occupied_file", "result": "NO_USER_FILE_OVERWRITE; FRAME_REVIEW_PENDING"})

        if scratch.exists():
            raise RuntimeError("Scratch save destination already exists before GUI accept")
        modal_field(scratch)
        shot("08-accept-separate-before.png")
        click("modal_save")
        wait_for(scratch.is_file, "Production modal never saved scratch to separate file", 20)
        same_bytes(scratch, SCRATCH, "GUI saved scratch")
        assert_protected("accepted_separate_save")
        shot("09-opened-original-victim.png")
        report["gui_save_before_open"] = "APP_CREATED_SCRATCH_EXACT_BYTES_VICTIM_UNCHANGED"
        report["steps"].append({"case": "safe_save_and_open", "result": "PASS_REAL_GUI_AND_HASH"})

        # The new open document has a different source buffer. An egui native
        # Ctrl+Z must not resurrect the preceding scratch text from TextEdit.
        click("source")
        key("ctrl+z")
        click("save")
        time.sleep(0.8)
        assert_protected("after_foreign_buffer_ctrl_z_and_save")
        report["source_undo_fence"] = "ACTUAL_CTRL_Z_SAVE_VICTIM_HASH_UNCHANGED"
        shot("10-cross-document-undo-fence.png")
        report["steps"].append({"case": "cross_document_ctrl_z", "result": "VICTIM_HASH_UNCHANGED"})

        # Build and export only via production GUI, never run xelatex on the
        # victim from the QA driver. Prove actual PDF, original Cyrillic glyph,
        # and embedded fonts with independent Poppler readers.
        click("build")
        shot("11-gui-build-clicked.png")
        pdf = victim.with_suffix(".pdf")
        deadline = time.monotonic() + 170
        while time.monotonic() < deadline and not pdf.is_file():
            time.sleep(2)
            click("export")
        if not pdf.is_file() or not pdf.read_bytes().startswith(b"%PDF-"):
            raise RuntimeError("GUI Build/Export failed to create real XeLaTeX PDF")
        report["pdfinfo"] = command("pdfinfo", str(pdf))
        report["pdffonts"] = command("pdffonts", str(pdf))
        report["pdftotext"] = command("pdftotext", "-enc", "UTF-8", str(pdf), "-")
        if "Не менять" not in report["pdftotext"]:
            raise RuntimeError("XeLaTeX PDF missing original Cyrillic macro text")
        if "yes" not in report["pdffonts"]:
            raise RuntimeError("XeLaTeX PDF missing embedded font proof")
        assert_protected("after_gui_build_export")
        report["gui_xelatex_pdf"] = "REAL_GUI_BUILD_EXPORT_PDF_POPPLER_PASS"
        report["pdf_sha256"] = sha(pdf.read_bytes())
        shot("12-real-pdf-preview.png")
        report["steps"].append({"case": "gui_build_export", "result": "PASS_PDF_GLYPH_FONT_SOURCE_HASH"})
        report["status"] = "PASS_AUTOMATED_REAL_X11_SCREENSHOTS_NEED_MANUAL_QA"
    except Exception as exc:
        report["error"] = f"{type(exc).__name__}: {exc}"
        if window is not None:
            try:
                command("import", "-window", window, str(out / "failure.png"), timeout=7)
            except Exception:
                pass
    finally:
        if process is not None and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        log.close()
        report["files_sha256"] = {
            p.name: sha(p.read_bytes()) for p in out.iterdir()
            if p.is_file() and p.name != "i46-report.json"
        }
        (out / "i46-report.json").write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report["status"].startswith("PASS_") else 1


if __name__ == "__main__":
    raise SystemExit(main())
