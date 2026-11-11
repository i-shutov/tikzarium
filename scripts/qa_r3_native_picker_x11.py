#!/usr/bin/env python3
"""R3: exercise real system XDG/GTK file chooser via extracted Linux release ELF.

This is an Xvfb/Openbox + DBus + installed GTK portal regression, NOT physical
Linux acceptance. No mock portal and no app-provided typed-path fallback passes.
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


def cmd(*args: str, timeout: float = 30.0) -> str:
    r = subprocess.run(args, capture_output=True, timeout=timeout, check=False)
    if r.returncode:
        raise RuntimeError(f"{args}: exit={r.returncode}; stderr={r.stderr.decode('utf-8', 'replace')[-1200:]}")
    return r.stdout.decode("utf-8", "replace").strip()


def wait(predicate, what: str, timeout: float = 20.0) -> None:
    limit = time.monotonic() + timeout
    while time.monotonic() < limit:
        if predicate():
            return
        time.sleep(0.25)
    raise RuntimeError("Timed out: " + what)


def snap(folder: Path, name: str) -> None:
    path = folder / (name + ".png")
    cmd("import", "-window", "root", str(path), timeout=40)
    if path.stat().st_size < 5000:
        raise RuntimeError(f"Empty original GUI screenshot: {name}")


def windows() -> dict[str, str]:
    return {line.split(maxsplit=1)[0]: line for line in cmd("wmctrl", "-l").splitlines()
            if line.strip()}


def key(name: str) -> None:
    cmd("xdotool", "key", "--clearmodifiers", name)
    time.sleep(0.30)


def click(x: int, y: int) -> None:
    cmd("xdotool", "mousemove", "--sync", str(x), str(y), "click", "1")
    time.sleep(0.45)


def clipboard(text: str) -> None:
    # xclip forks a persistent X11 selection-owner. Capturing stdout/stderr
    # keeps the daemon's inherited pipes open and subprocess.communicate hangs,
    # even when the original xclip invocation succeeded.
    r = subprocess.run(["xclip", "-selection", "clipboard"], input=text.encode("utf-8"),
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=8)
    if r.returncode:
        raise RuntimeError(f"xclip could not own X11 clipboard (exit={r.returncode})")


def copied_tex() -> str:
    key("ctrl+a")
    key("ctrl+c")
    return cmd("xclip", "-selection", "clipboard", "-o")


def choose_path(dialog_id: str, path: Path) -> None:
    cmd("wmctrl", "-i", "-a", dialog_id)
    key("ctrl+l")
    clipboard(str(path))
    key("ctrl+v")
    key("Return")
    # GTK may first resolve the absolute location, then accept a filename.
    time.sleep(0.6)
    if dialog_id in windows():
        key("Return")
    wait(lambda: dialog_id not in windows(), f"GTK dialog to close for {path}", 15)


def dialog_after_click(baseline: set[str], label: str) -> str:
    selected = []
    def found():
        selected[:] = [k for k in windows() if k not in baseline]
        return bool(selected)
    wait(found, label + " native GTK window", 25)
    return selected[-1]


def open_file_menu(entry_y: int) -> str:
    # Coordinates refer to the real 1180x680 egui window moved to (0, 0).
    # A changed GUI must update this explicit click contract and source lease.
    click(320, 41)
    click(347, entry_y)
    return "clicked"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    a = parser.parse_args()
    out = a.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    if any(out.iterdir()):
        parser.error("Use an empty evidence directory")
    launcher = a.app.resolve(strict=True)
    report = {"kind": "R3_ACTUAL_XDG_GTK_FILE_CHOOSER",
              "status": "FAIL", "source_sha": os.getenv("SOURCE_SHA", "UNKNOWN"),
              "app_tree_sha": os.getenv("TIKZARIUM_APP_TREE_SHA", "UNKNOWN"),
              "app_launcher_sha256": hashlib.sha256(launcher.read_bytes()).hexdigest(),
              "host": platform.platform(), "environment": "HOSTED_XVFB_GTK_PORTAL_NOT_PHYSICAL",
              "steps": []}
    process = None
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
    original.write_bytes(original_bytes)
    with (out / "app.log").open("wb") as log:
        try:
            if not os.environ.get("DBUS_SESSION_BUS_ADDRESS"):
                raise RuntimeError("No session DBus; run under dbus-run-session")
            portal = cmd("gdbus", "introspect", "--session",
                         "--dest", "org.freedesktop.portal.Desktop",
                         "--object-path", "/org/freedesktop/portal/desktop")
            (out / "portal-introspection.txt").write_text(portal, encoding="utf-8")
            if "org.freedesktop.portal.FileChooser" not in portal:
                raise RuntimeError("XDG FileChooser portal is missing")
            env = os.environ.copy()
            env.update({"XDG_DATA_HOME": str(out / "data"), "XDG_CACHE_HOME": str(out / "cache"),
                        "LIBGL_ALWAYS_SOFTWARE": "1", "WINIT_UNIX_BACKEND": "x11"})
            env.pop("WAYLAND_DISPLAY", None)
            process = subprocess.Popen([str(launcher)], cwd=work, env=env,
                                       stdout=log, stderr=log)
            def app_windows() -> list[str]:
                p = subprocess.run(["xdotool", "search", "--onlyvisible",
                                    "--name", "TikZarium"], capture_output=True, timeout=5)
                return p.stdout.decode().splitlines() if p.returncode == 0 else []
            wait(lambda: process.poll() is None and bool(app_windows()), "native app", 40)
            app_id = app_windows()[-1]
            cmd("xdotool", "windowmove", app_id, "0", "0")
            cmd("wmctrl", "-i", "-a", app_id)
            time.sleep(1.0)
            # The bundled quickstart is initially dirty scratch. Save it first:
            # Open on a dirty source intentionally invokes the separately proven
            # R1 dirty-open confirmation, not an immediate file replacement.
            key("ctrl+s")
            wait((work / "figure.tex").exists, "initial scratch save", 12)
            snap(out, "01-before-dialog")

            existing = set(windows())
            open_file_menu(207)  # «Выбрать файл…»
            native_id = dialog_after_click(existing, "Open")
            (out / "open-dialog-window.txt").write_text(windows()[native_id] + "\n", encoding="utf-8")
            snap(out, "02-real-open-picker")
            report["steps"].append("genuine_portal_open_window_visible")
            choose_path(native_id, original)
            cmd("wmctrl", "-i", "-a", app_id)
            # UX1 source body below the navigation toolbar; original native
            # editor PNGs and bootstrap 42981807266 place y=209 above it.
            click(130, 260)
            source = copied_tex()
            if "R3-Picker-Canary" not in source:
                raise RuntimeError("Native Open selected file but app source has no canary")
            if original.read_bytes() != original_bytes:
                raise RuntimeError("Native Open changed original CRLF source on disk")
            (out / "open-clipboard-source.txt").write_text(source, encoding="utf-8")
            snap(out, "03-native-open-loaded-source")
            report["steps"].append("native_open_selected_unicode_CRLF_source")

            # Reopen picker, Escape cancels without destroying current source.
            existing = set(windows())
            open_file_menu(207)
            native_id = dialog_after_click(existing, "Cancel")
            snap(out, "04-real-cancel-picker")
            cmd("wmctrl", "-i", "-a", native_id)
            key("Escape")
            wait(lambda: native_id not in windows(), "Cancel closing picker", 12)
            cmd("wmctrl", "-i", "-a", app_id)
            click(130, 260)
            if copied_tex() != source:
                raise RuntimeError("Cancelled native dialog rewrote editor source")
            report["steps"].append("portal_cancel_keeps_editable_source")

            # Native Save As must use the OS picker and preserve the source file.
            click(130, 260)
            key("ctrl+End")
            key("Return")
            clipboard("%R3-Native-Save-Canary")
            key("ctrl+v")
            existing = set(windows())
            open_file_menu(239)  # «Сохранить через диалог…»
            native_id = dialog_after_click(existing, "Save")
            snap(out, "05-real-save-picker")
            # GTK portal Save adds the selected TeX filter extension when the
            # location is entered via Ctrl+L. Supply the stem, as a normal
            # Save As user does in the Name field; assert the resulting on-disk
            # path is the exact requested .tex (not .tex.tex).
            choose_path(native_id, saved.with_suffix(""))
            wait(saved.exists, "native Save As exact .tex output", 15)
            content = saved.read_bytes()
            if b"R3-Native-Save-Canary" not in content or original.read_bytes() != original_bytes:
                raise RuntimeError("Native save lost modified bytes or overwrote original")
            snap(out, "06-native-save-completed")
            report["steps"].append("native_save_unicode_new_file_no_overwrite")

            # Build the selected user source through the actual GUI and external
            # XeLaTeX. The existing toolbar exporter is used as a completion
            # signal; only the subsequent XDG picker qualifies native Export.
            selected_source_sha = hashlib.sha256(content).hexdigest()
            click(219, 39)  # Native Studio Build icon, proven in I61.
            time.sleep(3.0)
            click(73, 77)  # Exact PDF tab, source remains visible.
            time.sleep(1.5)
            click(259, 39)  # Existing explicit PDF export action.
            built_pdf = saved.with_suffix(".pdf")
            wait(built_pdf.exists, "actual XeLaTeX GUI PDF build and export", 25)
            if not built_pdf.read_bytes().startswith(b"%PDF-"):
                raise RuntimeError("GUI Build/Export did not produce a valid PDF")
            if hashlib.sha256(saved.read_bytes()).hexdigest() != selected_source_sha:
                raise RuntimeError("XeLaTeX GUI build changed saved user TeX bytes")
            snap(out, "07-real-xelatex-pdf-ready")

            native_pdf = work / "экспорт через XDG.pdf"
            existing = set(windows())
            open_file_menu(271)  # «Экспорт PDF через диалог…»
            native_id = dialog_after_click(existing, "PDF Export")
            snap(out, "08-real-native-pdf-export-picker")
            choose_path(native_id, native_pdf.with_suffix(""))
            wait(native_pdf.exists, "native PDF export exact .pdf filename", 20)
            if native_pdf.read_bytes() != built_pdf.read_bytes():
                raise RuntimeError("Native PDF export differs from GUI-generated XeLaTeX PDF")
            font_table = cmd("pdffonts", str(native_pdf))
            font_rows = [line.split() for line in font_table.splitlines()[2:] if line.strip()]
            if not font_rows or not any("DejaVu" in line for line in font_table.splitlines()):
                raise RuntimeError("No DejaVu fonts in exported GUI PDF")
            if any(len(row) < 5 or row[-5].lower() != "yes" for row in font_rows):
                raise RuntimeError("Native PDF export contains a non-embedded font")
            extracted_text = cmd("pdftotext", str(native_pdf), "-")
            if "Фигура" not in extracted_text or "R3-Picker-Canary" not in extracted_text:
                raise RuntimeError("Native PDF export does not preserve Unicode text")
            report["native_pdf_sha256"] = hashlib.sha256(native_pdf.read_bytes()).hexdigest()
            snap(out, "09-native-pdf-export-completed")
            report["steps"].append("native_export_exact_xelatex_pdf_unicode_embedded_fonts")
            report["status"] = "PASS_HOSTED_NATIVE_GTK_PORTAL_ORIGINAL_GUI_REVIEW_REQUIRED"
        except Exception as exc:
            report["error"] = repr(exc)
            try:
                snap(out, "failure-visible-desktop")
                (out / "visible-windows.txt").write_text(cmd("wmctrl", "-l") + "\n")
            except Exception:
                pass
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
            with (out / "SHA256SUMS").open("w", encoding="utf-8") as f:
                for path in sorted(out.iterdir()):
                    if path.is_file() and path.name != "SHA256SUMS":
                        f.write(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n")
            print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    raise SystemExit(main())
