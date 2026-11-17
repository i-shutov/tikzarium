#!/usr/bin/env python3
"""R3 genuine XDG/GTK Open/Cancel/Save/PDF-export dialogs in packaged production.

Hosted Xvfb/Openbox + session DBus + installed GTK portal. A typed app path or
mock portal cannot satisfy this contract. Original sources, desktops and native
window metadata survive failures; physical native qualification remains open.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import platform
import time

from qa_n2_studio_x11 import APP_TREE, Native, POINTS, audit_embedded_fonts, run, screenshot, sha, wait

# main.rs::studio_file_menu: compact top menu; native operations occur after
# Open/Save, separator, project label/path, manual Open/SaveAs, separator.
# The actual OS-window guard below makes a mistaken manual-path click fail.
PICKER_POINTS = {"open": (66, 232), "save": (96, 262), "export": (102, 292)}


def windows() -> dict[str, str]:
    return {line.split(maxsplit=1)[0]: line for line in run("wmctrl", "-l").splitlines() if line.strip()}


def native_dialog(baseline: set[str], label: str, out: Path) -> str:
    selected = []
    def found():
        selected[:] = [key for key in windows() if key not in baseline]
        if len(selected) > 1:
            raise RuntimeError("Ambiguous new native dialog windows: " + label)
        return bool(selected)
    wait(found, label + " actual OS file chooser window did not appear", 25)
    dialog = selected[0]
    properties = run("xprop", "-id", dialog, "WM_CLASS", "_NET_WM_WINDOW_TYPE", "_NET_WM_PID", "WM_TRANSIENT_FOR")
    (out / (label + "-dialog-window.txt")).write_text(windows()[dialog] + "\n" + properties + "\n", encoding="utf-8")
    # Positive OS-native dialog metadata, in addition to FileChooser introspect
    # and original screenshots. An egui popup has no distinct WM dialog window.
    if ("_NET_WM_WINDOW_TYPE_DIALOG" not in properties
            and not any(value in properties.lower() for value in ("xdg-desktop-portal", "gtk"))):
        raise RuntimeError("New window lacks native GTK/dialog metadata")
    return dialog


def choose_path(native: Native, dialog: str, path: Path) -> None:
    native.key("ctrl+l", window=dialog)
    native.clipboard(str(path).encode("utf-8"), "actual-dialog-location")
    native.key("ctrl+v", window=dialog)
    native.key("Return", window=dialog)
    time.sleep(0.6)
    if dialog in windows():
        native.key("Return", window=dialog)
    wait(lambda: dialog not in windows(), "GTK dialog did not accept selected path", 15)
    native.focus()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    if any(out.iterdir()):
        parser.error("Use an empty evidence directory")
    launcher = args.app.resolve(strict=True)
    report = {"kind": "R3_ACTUAL_XDG_GTK_FILE_CHOOSER", "status": "FAIL",
              "source_sha": os.getenv("SOURCE_SHA", "UNKNOWN"), "app_tree_sha": APP_TREE,
              "app_launcher_sha256": sha(launcher), "host": platform.platform(),
              "environment": "HOSTED_XVFB_GTK_PORTAL_NOT_PHYSICAL", "steps": [],
              "picker_client_coordinates": PICKER_POINTS}
    work = out / "project"
    work.mkdir()
    original = work / "исходный пример.tex"
    saved = work / "новая фигура с пробелами.tex"
    original_bytes = (r"\documentclass{standalone}" + "\r\n"
                      + r"\usepackage{fontspec}" + "\r\n"
                      + r"\usepackage{tikz}" + "\r\n"
                      + r"\setmainfont{DejaVu Serif}" + "\r\n"
                      + r"\begin{document}" + "\r\n"
                      + r"\begin{tikzpicture}" + "\r\n"
                      + r"\node at (0,0) {Фигура R3-Picker-Canary};" + "\r\n"
                      + r"\end{tikzpicture}" + "\r\n"
                      + r"\end{document}" + "\r\n").encode("utf-8")
    original.write_bytes(original_bytes)  # Original test input before GUI launch.
    native = Native(launcher, out, report)
    def picker(operation, label):
        baseline = set(windows())
        native.click(*POINTS["file_menu"])
        screenshot(out, label + "-actual-file-menu")
        native.click(*PICKER_POINTS[operation])
        return native_dialog(baseline, label, out)
    try:
        if not os.environ.get("DBUS_SESSION_BUS_ADDRESS"):
            raise RuntimeError("No session DBus; run under dbus-run-session")
        portal = run("gdbus", "introspect", "--session", "--dest", "org.freedesktop.portal.Desktop",
                     "--object-path", "/org/freedesktop/portal/desktop")
        (out / "portal-introspection.txt").write_text(portal, encoding="utf-8")
        if "org.freedesktop.portal.FileChooser" not in portal:
            raise RuntimeError("XDG FileChooser portal missing")
        # Preserve the session's installed portal selection/configuration.
        native.start(work, preserve_config=True)
        native.key("ctrl+s")
        wait((work / "figure.tex").exists, "Initial dirty scratch Save failed", 12)
        screenshot(out, "01-before-dialog")
        dialog = picker("open", "open")
        screenshot(out, "02-real-open-picker")
        report["steps"].append("genuine_portal_open_window_visible")
        choose_path(native, dialog, original)
        time.sleep(0.6)
        native.full_source()
        source = native.copy("open-full-editor")
        if source != original_bytes or original.read_bytes() != original_bytes:
            raise RuntimeError("Native Open/editor copy did not preserve exact Unicode CRLF input")
        screenshot(out, "03-native-open-loaded-source")
        report["steps"].append("native_open_selected_unicode_CRLF_source")
        dialog = picker("open", "cancel")
        screenshot(out, "04-real-cancel-picker")
        native.key("Escape", window=dialog)
        wait(lambda: dialog not in windows(), "Native Cancel did not close picker", 12)
        if native.copy("cancel-full-editor") != source:
            raise RuntimeError("Cancelled native chooser altered source")
        report["steps"].append("portal_cancel_keeps_editable_source")
        native.click(*POINTS["source"])
        native.key("ctrl+End")
        marker = b"%R3-Native-Save-Canary"
        native.paste(marker, "native-save-marker")
        expected_saved = original_bytes + marker
        if native.copy("before-save-full-editor") != expected_saved:
            raise RuntimeError("Native source edit changed unrelated CRLF bytes")
        dialog = picker("save", "save")
        screenshot(out, "05-real-save-picker")
        # Native GTK Save applies selected .tex filter to a filename stem.
        choose_path(native, dialog, saved.with_suffix(""))
        wait(saved.exists, "Native Save As did not create exact .tex filename", 15)
        content = saved.read_bytes()
        if content != expected_saved or original.read_bytes() != original_bytes:
            raise RuntimeError("Native Save changed modified bytes or original input")
        screenshot(out, "06-native-save-completed")
        report["steps"].append("native_save_unicode_new_file_no_overwrite")
        selected_source_sha = sha(saved)
        built_pdf = saved.with_suffix(".pdf")
        if built_pdf.exists():
            raise RuntimeError("PDF unexpectedly existed before actual native GUI build")
        native.key("ctrl+Return")
        until = time.monotonic() + 180
        while time.monotonic() < until and not built_pdf.exists():
            native.alive()
            native.click(*POINTS["export"])
            time.sleep(1)
        if not built_pdf.exists() or not built_pdf.read_bytes().startswith(b"%PDF-"):
            raise RuntimeError("Actual GUI XeLaTeX/current PDF export failed")
        if sha(saved) != selected_source_sha:
            raise RuntimeError("Native GUI build changed saved user source bytes")
        native.click(*POINTS["pdf"])
        screenshot(out, "07-real-xelatex-pdf-ready")
        built_source = out / "original-r3-built-source.tex"
        built_source.write_bytes(saved.read_bytes())
        if built_source.read_bytes() != expected_saved:
            raise RuntimeError("R3 built source differs from actual saved native source edit")
        gui_log = native.capture_xelatex_log("r3-build", saved, expected_saved)
        report["build_originals"] = {
            "source": built_source.name, "source_sha256": sha(built_source),
            "gui_xelatex_log": gui_log.name, "gui_xelatex_log_sha256": sha(gui_log),
        }
        native_pdf = work / "экспорт через XDG.pdf"
        dialog = picker("export", "export")
        screenshot(out, "08-real-native-pdf-export-picker")
        choose_path(native, dialog, native_pdf.with_suffix(""))
        wait(native_pdf.exists, "Native PDF Export did not create exact .pdf filename", 20)
        if native_pdf.read_bytes() != built_pdf.read_bytes():
            raise RuntimeError("Native Export differs from actual current GUI XeLaTeX PDF")
        font_table = run("pdffonts", str(native_pdf))
        if not any("DejaVu" in row for row in audit_embedded_fonts(font_table)):
            raise RuntimeError("No embedded DejaVu fonts in actual native Export")
        extracted = run("pdftotext", str(native_pdf), "-")
        if "Фигура" not in extracted or "R3-Picker-Canary" not in extracted:
            raise RuntimeError("Native Export lost actual Unicode text")
        (out / "pdffonts.txt").write_text(font_table + "\n", encoding="utf-8")
        (out / "pdfinfo.txt").write_text(run("pdfinfo", str(native_pdf)) + "\n", encoding="utf-8")
        (out / "pdftotext.txt").write_text(extracted + "\n", encoding="utf-8")
        run("pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-png", "-r", "120", str(native_pdf), str(out / "native-pdf-render"))
        report["native_pdf_sha256"] = sha(native_pdf)
        screenshot(out, "09-native-pdf-export-completed")
        report["steps"].append("native_export_exact_xelatex_pdf_unicode_embedded_fonts")
        report["status"] = "PASS_HOSTED_NATIVE_GTK_PORTAL_ORIGINAL_GUI_REVIEW_REQUIRED"
    except Exception as error:
        native.fail(error)
        try:
            (out / "failure-visible-windows.txt").write_text(run("wmctrl", "-l") + "\n", encoding="utf-8")
        except Exception as capture_error:
            report["failure_window_capture_error"] = str(capture_error)
    finally:
        native.stop()
        report["exit_code"] = native.process.returncode if native.process else None
        (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        with (out / "SHA256SUMS").open("w", encoding="utf-8") as stream:
            for path in sorted(out.rglob("*")):
                if path.is_file() and path.name != "SHA256SUMS":
                    stream.write(f"{sha(path)}  {path.relative_to(out)}\n")
        print(json.dumps(report, ensure_ascii=False))
    return 0 if report["status"].startswith("PASS_") else 1


if __name__ == "__main__":
    raise SystemExit(main())
