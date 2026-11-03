#!/usr/bin/env python3
"""Real N2 Studio library Connect/Disconnect/Undo/Save/Open/XeLaTeX GUI acceptance.

No headless Session or synthetic source writes may satisfy a GUI proof.
Capture originals + SHA on FAIL, including positioning/calibration failures.
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

from qa_i61_b42_studio_x11 import (
    APP_TREE, audit_embedded_fonts, click, key, paste, run, screenshot, sha, wait,
)

FIXTURE = (
    "\\documentclass{standalone}\r\n"
    "\\usepackage{tikz}\r\n"
    "\\usepackage{fontspec}\r\n"
    "% N2 сохранить CRLF и кириллицу\r\n"
    "\\begin{document}\r\n"
    "\\setmainfont{DejaVu Serif}\r\n"
    "\\newcommand{\\OpaqueNtwo}{Фигура}\r\n"
    "\\begin{tikzpicture}\r\n"
    "\\node at (0,0) {\\OpaqueNtwo};\r\n"
    "\\end{tikzpicture}\r\n"
    "\\end{document}\r\n"
).encode("utf-8")
IMPORT = b"\\usetikzlibrary{arrows.meta}\r\n"


def launch(app: Path, out: Path, app_log):
    env = os.environ.copy()
    env.update({
        "XDG_CONFIG_HOME": str(out / "config"),
        "XDG_DATA_HOME": str(out / "data"),
        "XDG_CACHE_HOME": str(out / "cache"),
        "LIBGL_ALWAYS_SOFTWARE": "1",
        "WINIT_UNIX_BACKEND": "x11",
    })
    env.pop("WAYLAND_DISPLAY", None)
    proc = subprocess.Popen([str(app.resolve(strict=True))], cwd=out,
                            env=env, stdout=app_log, stderr=app_log)
    until = time.monotonic() + 45
    window = None
    while time.monotonic() < until:
        if proc.poll() is not None:
            raise RuntimeError(f"Rust/egui Studio exited early: {proc.returncode}")
        found = subprocess.run(
            ["xdotool", "search", "--onlyvisible", "--pid", str(proc.pid),
             "--name", "TikZarium"], capture_output=True, timeout=5, check=False)
        if found.returncode == 0 and found.stdout.strip():
            window = found.stdout.decode().splitlines()[-1]
            break
        time.sleep(0.25)
    if not window:
        proc.terminate()
        raise RuntimeError("No visible native TikZarium Studio window")
    run("xdotool", "windowmove", window, "0", "0")
    run("xdotool", "windowsize", "--sync", window, "1366", "768")
    run("xdotool", "windowactivate", "--sync", window)
    time.sleep(1.5)
    return proc, window


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    out = args.out.resolve()
    if out.exists() and any(out.iterdir()):
        parser.error("N2 evidence directory must be empty")
    out.mkdir(parents=True, exist_ok=True)
    if os.environ.get("TIKZARIUM_APP_TREE_SHA") != APP_TREE:
        parser.error("N2 source-tree lease must match independent I61")
    source = out / "n2-crlf.tex"
    source.write_bytes(FIXTURE)
    report = {
        "schema_version": 1, "kind": "N2_N3_REAL_STUDIO_SOURCE_LIBRARIES",
        "status": "FAIL", "host": platform.platform(),
        "source_head_sha": os.environ.get("TIKZARIUM_SOURCE_SHA", "UNKNOWN"),
        "app_tree_sha": APP_TREE, "real_gui": "NOT_RUN",
        "library_panel": "NOT_RUN", "library_entry": "NOT_RUN",
        "library_connect": "NOT_RUN", "library_disconnect": "NOT_RUN",
        "library_undo": "NOT_RUN", "gui_save_open": "NOT_RUN",
        "xelatex_pdf": "NOT_RUN", "manual_artifact_review": "NOT_RUN",
        "five_statuses": "MANUAL_SCREENSHOT_REVIEW_REQUIRED",
        "physical_windows10_miktex": "NOT_RUN", "physical_mac_arm": "NOT_RUN",
    }
    process = None
    app_log = (out / "app.log").open("wb")
    try:
        process, window = launch(args.app, out, app_log)
        report["real_gui"] = "HOSTED_LINUX_X11_WINDOW_OPENED"
        report["app_sha256"] = sha(args.app)
        report["window_id"] = window
        screenshot(out, "01-studio-initial")
        # Open an independently prepared existing CRLF+opaque source in actual GUI.
        click(window, 321, 40)
        screenshot(out, "02-file-popup")
        click(window, 440, 93)
        key("ctrl+a")
        paste(b"n2-crlf.tex", out / "clipboard-open.txt")
        screenshot(out, "03-open-target")
        click(window, 351, 124)
        time.sleep(0.5)
        screenshot(out, "04-scratch-dirty-open-modal")
        # A new scratch buffer is deliberately DIRTY. Opening another file
        # triggers the correct product confirmation; this QA driver must
        # explicitly click the genuine "Отбросить и открыть" button.
        # B42 I64 already accepted this modal; never treat it as a bug.
        click(window, 601, 478)
        time.sleep(0.6)
        screenshot(out, "04a-after-gui-open-confirmed")
        if sha(out / "04-scratch-dirty-open-modal.png") == sha(
            out / "04a-after-gui-open-confirmed.png"
        ):
            raise RuntimeError("N2 initial dirty-scratch Open modal was not dismissed")
        if source.read_bytes() != FIXTURE:
            raise RuntimeError("Open modified initial CRLF fixture")

        # Right-hand Libraries dock: coordinate lease from accepted B42 image.
        click(window, 1190, 109)
        screenshot(out, "05-libraries-tab")
        if sha(out / "05-libraries-tab.png") == sha(out / "04a-after-gui-open-confirmed.png"):
            raise RuntimeError("Real Libraries tab click did not change the Studio dock")
        click(window, 1200, 203)
        screenshot(out, "06-libraries-catalogue")
        report["library_panel"] = "REAL_X11_CATALOGUE_SCREENSHOT_RECORDED"
        # The original 41544280356 screenshot puts the first arrows.meta
        # HEADER at y≈286. The former (1165,244) clicked explanatory text,
        # so no library action had ever been exercised.
        click(window, 1150, 286)
        screenshot(out, "07-arrows-meta-help")
        # Compare only the entry/details area, excluding title/hover. A
        # mistaken explanatory-text click must fail BEFORE Connect is tried.
        def detail_sig(name):
            return run(
                "convert", str(out / (name + ".png")), "-crop",
                "300x440+1060+280", "+repage", "-format", "%#", "info:",
            )
        if detail_sig("06-libraries-catalogue") == detail_sig("07-arrows-meta-help"):
            raise RuntimeError(
                "N2 arrows.meta entry did not expand in actual Studio; "
                "recalibrate from original screenshots before Connect"
            )
        report["library_entry"] = "HOSTED_X11_EXPANDED_DETAILS_MANUAL_REVIEW_REQUIRED"
        report["five_statuses"] = "EXPANDED_ENTRY_SCREENSHOT_REVIEW_REQUIRED"
        # Scroll only the right dock, keeping the editable source visible.
        run("xdotool", "mousemove", "--sync", "1250", "540")
        for _ in range(3):
            run("xdotool", "click", "5")
        time.sleep(0.45)
        screenshot(out, "08-connect-button-target")

        click(window, 1212, 635)  # PROVISIONAL from B42 dock; source bytes decide, never synthetic PASS.
        screenshot(out, "09-after-connect")
        click(window, 177, 39)  # GUI Save, not direct disk patch.
        wait(lambda: IMPORT in source.read_bytes(),
             "N2 real Studio Connect button did not persist a library source patch")
        connected = source.read_bytes()
        if connected.count(IMPORT) != 1 or connected.replace(IMPORT, b"", 1) != FIXTURE:
            raise RuntimeError("Library Connect changed unrelated CRLF/opaque source bytes")
        report["library_connect"] = "PASS_REAL_X11_C_CATALOGUE_SOURCE_PATCH"
        report["connected_source_sha256"] = sha(source)
        screenshot(out, "10-connect-saved")

        # Same expanded row supplies Disconnect; its action does not uninstall PGF.
        click(window, 1212, 635)
        screenshot(out, "11-after-disconnect")
        click(window, 177, 39)
        wait(lambda: source.read_bytes() == FIXTURE,
             "N2 real Studio Disconnect did not exactly restore source")
        report["library_disconnect"] = "PASS_REAL_X11_INVERSE_SOURCE_BYTES"
        click(window, 1052, 109)  # Properties dock.
        click(window, 1085, 157)  # Visual transaction Undo, not TextEdit Ctrl+Z.
        click(window, 177, 39)
        wait(lambda: source.read_bytes() == connected,
             "N2 visual Undo of library disconnect did not restore source")
        report["library_undo"] = "PASS_REAL_X11_VISUAL_UNDO"
        screenshot(out, "12-undo-restored-source")

        # Independently modify disk before Ctrl+O, then use GUI Save.
        external = connected.replace(b"% N2 ", b"% N2 EXTERNAL ", 1)
        if external == connected:
            raise RuntimeError("No external fixture marker")
        source.write_bytes(external)
        key("ctrl+o")
        time.sleep(0.75)
        screenshot(out, "13-reopened-external-change")
        # Equality to an externally modified disk file is a tautology; it
        # does not prove the GUI actually reopened that file. Following the
        # independently accepted I64 user workflow, append via the ACTUAL
        # source TextEdit after Ctrl+O and verify all preceding disk bytes.
        reopened_append = b"% N2_GUI_AFTER_REAL_REOPEN"
        click(window, 177, 380)
        key("ctrl+End")
        paste(reopened_append, out / "clipboard-reopen-edit.txt")
        screenshot(out, "13a-gui-edited-reopened-source")
        click(window, 177, 39)
        wait(lambda: reopened_append in source.read_bytes(),
             "N2 GUI re-opened source could not be edited and saved")
        if source.read_bytes() != external + reopened_append:
            raise RuntimeError(
                "N2 GUI Ctrl+O did not reload the external CRLF revision "
                "or Save altered unrelated user bytes"
            )
        report["gui_save_open"] = "PASS_REAL_X11_GUI_CRLF_OPEN_EDIT_SAVE"

        click(window, 219, 39)  # Actual external XeLaTeX Build.
        time.sleep(3)
        screenshot(out, "14-build-status")
        click(window, 73, 77)  # Exact PDF tab, editable source still visible.
        time.sleep(1.2)
        screenshot(out, "15-exact-pdf-tab")
        click(window, 259, 39)  # GUI PDF Export.
        pdf = source.with_suffix(".pdf")
        wait(pdf.is_file, "N2 real Studio external XeLaTeX did not export PDF", 20)
        info = run("pdfinfo", str(pdf))
        if "Pages:           1" not in info:
            raise RuntimeError("N2 XeLaTeX PDF not one page")
        if "Фигура" not in run("pdftotext", "-enc", "UTF-8", str(pdf), "-"):
            raise RuntimeError("N2 PDF Cyrillic opaque macro missing")
        fonts = run("pdffonts", str(pdf))
        if not any("DejaVu" in row for row in audit_embedded_fonts(fonts)):
            raise RuntimeError("N2 PDF not embedded with DejaVu")
        (out / "pdffonts.txt").write_text(fonts + "\n", encoding="utf-8")
        (out / "pdfinfo.txt").write_text(info + "\n", encoding="utf-8")
        run("pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-png",
            "-r", "120", str(pdf), str(out / "16-rendered-pdf"))
        report["xelatex_pdf"] = "PASS_EXTERNAL_XELATEX_UNICODE_EMBEDDED_FONTS"
        report["pdf_sha256"] = sha(pdf)
        report["real_gui"] = "PASS_AUTOMATED_MANUAL_ARTIFACT_REVIEW_REQUIRED"
        report["status"] = "PASS_AUTOMATED_REAL_STUDIO_REQUIRES_MANUAL_REVIEW"
    except Exception as exc:
        report["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        if process:
            process.terminate()
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        app_log.close()
        report["files"] = {
            p.name: hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(out.iterdir()) if p.is_file() and p.name != "report.json"
        }
        (out / "report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report["status"].startswith("PASS_AUTOMATED") else 1


if __name__ == "__main__":
    raise SystemExit(main())
