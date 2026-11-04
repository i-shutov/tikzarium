#!/usr/bin/env python3
"""I61: real B42 Studio X11 group-click -> six native TikZ gestures -> saved TeX/PDF.

Never infer PASS from a screenshot alone; this script requires actual process
events and bytes that the running GUI persisted. Independent manual inspection
of screenshots/PDF remains mandatory. Linux/Xvfb != physical Win10 or Mac ARM.
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

from qa_n1_desktop import FIXTURE, original_preserved, owners

# Candidate click coordinates are tied to the exact app/src Git tree and
# previously inspected B42 bootstrap screenshots, not a general GUI contract.
APP_TREE = "48ed2245cd99c4c25b83fccbb81983deaed8247a"
BUTTONS = [
    ("line", (30, 150), (599, 169), (646, 350), (750, 377)),
    ("rectangle", (30, 150), (653, 169), (681, 425), (765, 477)),
    ("circle", (30, 150), (707, 169), (810, 351), (840, 351)),
    ("cubic", (30, 150), (761, 169), (777, 470), (902, 460)),
    ("arrow", (30, 199), (599, 216), (615, 535), (743, 552)),
    ("node", (30, 248), (599, 266), (850, 550), (851, 550)),
]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()



def audit_embedded_fonts(output: str) -> list[str]:
    """Require all PDF fonts embedded; parse the rightmost pdffonts columns.

    Type may have spaces (CID TrueType). The five final columns are
    emb, sub, uni, object, ID. One nonembedded font fails the audit.
    """
    rows = [line for line in output.splitlines()[2:] if line.strip()]
    if not rows:
        raise RuntimeError("No font records in pdffonts")
    for line in rows:
        columns = line.split()
        flags = columns[-5:]
        if (
            len(columns) < 8 or len(flags) != 5
            or any(flag.lower() not in ("yes", "no") for flag in flags[:3])
            or not flags[3].isdigit() or not flags[4].isdigit()
        ):
            raise RuntimeError("Unparseable PDF font row: " + line)
        if flags[0].lower() != "yes":
            raise RuntimeError("Nonembedded PDF font: " + line)
    return rows


def run(*argv: str, timeout: int = 25) -> str:
    result = subprocess.run(argv, capture_output=True, timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError(f"{argv[0]} exit {result.returncode}: "
                           + result.stderr.decode("utf-8", "replace")[-1400:])
    return result.stdout.decode("utf-8", "replace").strip()


def wait(predicate, detail: str, seconds: float = 12.0) -> None:
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        if predicate():
            return
        time.sleep(0.20)
    raise RuntimeError(detail)


def paste(contents: bytes, path: Path) -> None:
    path.write_bytes(contents)
    # xclip backgrounds an X11 clipboard owner. Capturing its stdout/stderr
    # via run() keeps inherited pipes open, causing a false 25s timeout.
    # Do not capture the detached owner; match independently accepted I47 QA.
    subprocess.run(["xclip", "-selection", "clipboard", "-i", str(path)],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                   timeout=8, check=True)
    run("xdotool", "key", "--clearmodifiers", "ctrl+v")
    time.sleep(0.28)


def screenshot(out: Path, label: str) -> None:
    filename = out / (label + ".png")
    run("import", "-window", "root", str(filename), timeout=35)
    if filename.stat().st_size < 5000:
        raise RuntimeError(f"Empty X11 screenshot: {label}")


def click(window: str, x: int, y: int) -> None:
    # Reviewed screenshots show ROOT pixels. xdotool --window instead uses
    # client-relative coordinates and double-counts the 20px WM titlebar.
    run("xdotool", "mousemove", "--sync", str(x), str(y), "click", "1")
    time.sleep(0.20)


def key(value: str) -> None:
    run("xdotool", "key", "--clearmodifiers", value)
    time.sleep(0.18)


def gesture(window: str, start: tuple[int, int], end: tuple[int, int]) -> None:
    run("xdotool", "mousemove", "--sync", str(start[0]), str(start[1]),
        "mousedown", "1")
    time.sleep(0.15)
    run("xdotool", "mousemove", "--sync", str(end[0]), str(end[1]))
    time.sleep(0.15)
    run("xdotool", "mouseup", "1")
    time.sleep(0.35)



def held_f1() -> None:
    # An instantaneous key tap may miss egui's next input frame.
    run("xdotool", "keydown", "F1")
    time.sleep(0.34)
    run("xdotool", "keyup", "F1")
    time.sleep(0.48)


def dock_signature(out: Path, label: str) -> str:
    # Compare the right-hand actual Studio tab bar, not its changing canvas.
    return run("convert", str(out / (label + ".png")), "-crop",
               "330x42+1025+94", "+repage", "-format", "%#", "info:")


def main() -> int:
    arg = argparse.ArgumentParser(description=__doc__)
    arg.add_argument("--app", required=True, type=Path)
    arg.add_argument("--out", required=True, type=Path)
    args = arg.parse_args()
    out = args.out.resolve()
    if out.exists() and any(out.iterdir()):
        arg.error("I61 requires an empty evidence directory")
    out.mkdir(parents=True, exist_ok=True)
    if os.environ.get("TIKZARIUM_APP_TREE_SHA") != APP_TREE:
        arg.error("B42 app/source tree changed: re-review screenshot coordinates first")
    # The real app's default file field is "figure.tex" (reviewed screenshot).
    # Use an isolated GUI process working directory instead of an unproved
    # popup path TextEdit click. The app must write this .tex via its Save icon.
    source = out / "figure.tex"
    fixture = FIXTURE.encode("utf-8")
    report = {
        "schema_version": 1, "kind": "I61_B42_REAL_STUDIO_GESTURES",
        "status": "FAIL", "gui": "LINUX_X11_HOSTED",
        "app_tree_sha": APP_TREE,
        "source_head_sha": os.environ.get("TIKZARIUM_SOURCE_SHA", "UNKNOWN"),
        "host": platform.platform(), "physical_win10_miktex": "NOT_RUN",
        "physical_mac_m1_m4": "NOT_RUN",
        "manual_image_review": "NOT_RUN", "gui_save": "NOT_RUN",
        "six_real_tools": "NOT_RUN", "real_xelatex_pdf": "NOT_RUN",
        "gui_open_reopen": "NOT_RUN", "keyboard_reopen": "NOT_RUN",
        "toolbar_reopen": "NOT_RUN", "visual_undo": "NOT_RUN",
        "native_text_undo": "NOT_RUN", "library_inspector": "NOT_RUN",
        "f1_two_state": "NOT_RUN", "source_parameter_f1": "NOT_RUN", "gui_two_file_crlf": "NOT_RUN",
        "dirty_open_cancel": "NOT_RUN", "inspector_apply": "NOT_RUN",
        "steps": [],
    }
    process = None
    app_log = (out / "app.log").open("wb")
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
        process = subprocess.Popen([str(args.app.resolve(strict=True))],
                                   cwd=out, env=env, stdout=app_log, stderr=app_log)
        found = None
        until = time.monotonic() + 45
        while time.monotonic() < until:
            if process.poll() is not None:
                raise RuntimeError(f"Studio process exited {process.returncode}")
            match = subprocess.run(
                ["xdotool", "search", "--onlyvisible", "--pid", str(process.pid),
                 "--name", "TikZarium"],
                capture_output=True, timeout=5, check=False)
            if match.returncode == 0 and match.stdout.strip():
                found = match.stdout.decode().splitlines()[-1]
                break
            time.sleep(0.25)
        if not found:
            raise RuntimeError("No real visible Studio process window")
        run("xdotool", "windowmove", found, "0", "0")
        run("xdotool", "windowsize", "--sync", found, "1366", "768")
        run("xdotool", "windowactivate", "--sync", found)
        time.sleep(1.6)
        report["window_id"] = found
        report["app_sha256"] = sha(args.app)
        screenshot(out, "01-real-studio")

        # Real File-popup screenshot confirms "figure.tex" as app default.
        # GUI starts in out/, so clicking real Save writes out/figure.tex.
        # Popup's editable custom path is separately NOT_RUN.
        click(found, 321, 40)
        screenshot(out, "02-file-menu-default-path")
        click(found, 130, 209)
        key("ctrl+a")
        paste(fixture, out / "clipboard-source.txt")
        screenshot(out, "04-source-pasted")
        click(found, 177, 39)
        wait(source.is_file, "Studio toolbar Save did not create default figure.tex in isolated cwd")
        if source.read_bytes() != fixture:
            raise RuntimeError("Real GUI Save altered opaque Unicode source")
        report["file_menu_path_edit"] = "NOT_RUN_DEFAULT_FIGURE_TEX_USED"
        report["gui_save"] = "PASS_REAL_X11_EXACT_BYTES"
        report["steps"].append({"case": "paste_and_save", "sha256": sha(source)})
        screenshot(out, "05-source-saved")

        for index, (tool, group, tool_button, start, end) in enumerate(BUTTONS, 1):
            before = source.read_bytes()
            count = len(owners(before))
            click(found, *group)
            screenshot(out, f"{index:02d}-{tool}-group-popup")
            click(found, *tool_button)
            screenshot(out, f"{index:02d}-{tool}-selected")
            gesture(found, start, end)
            screenshot(out, f"{index:02d}-{tool}-pointer")
            # Save is the actual Studio toolbar button, no synthetic file edits.
            click(found, 177, 39)
            time.sleep(0.5)
            after = source.read_bytes()
            authored = owners(after)
            if len(authored) != count + 1 or authored[-1]["tool"] != tool:
                raise RuntimeError(
                    f"{tool}: real group/tool/pointer did not persist a new "
                    f"native owned command (before={count}, after={authored})")
            if not original_preserved(fixture, after):
                raise RuntimeError(f"{tool}: source bytes outside C command changed")
            if tool == "cubic" and b".. controls " not in after:
                raise RuntimeError("Cubic did not produce native TikZ Bezier")
            report["steps"].append({
                "case": "real_group_and_pointer_" + tool,
                "source_sha256": sha(source),
                "owner_count": len(authored),
                "owner_id": authored[-1]["id"],
            })
            screenshot(out, f"{index:02d}-{tool}-saved")

        report["six_real_tools"] = "PASS_REAL_X11_SAVED_SOURCE"
        key("F1")
        screenshot(out, "20-f1-help")
        key("F1")
        screenshot(out, "21-f1-closed")
        report["f1_keystrokes"] = "SENT_REAL_X11_VISUAL_REVIEW_REQUIRED"
        report["final_source_sha256"] = sha(source)
        click(found, 219, 39)  # Real Studio Build icon, external XeLaTeX.
        pdf = source.with_suffix(".pdf")
        # The app may retain the build PDF in memory until Export; Build success
        # alone must not be interpreted as a persisted generated file.
        time.sleep(3.0)
        screenshot(out, "22-build-status")
        click(found, 73, 77)  # Studio PDF tab, code pane still visible.
        time.sleep(1.5)
        screenshot(out, "23-pdf-view-before-export")
        click(found, 259, 39)  # Real export action.
        wait(pdf.is_file, "Studio Export did not write a real XeLaTeX PDF", 20)
        if sha(source) != report["final_source_sha256"]:
            raise RuntimeError("Saved source changed during PDF export")
        metadata = run("pdfinfo", str(pdf))
        if "Pages:           1" not in metadata:
            raise RuntimeError("Expected one-page exact XeLaTeX PDF")
        run("pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-png",
            "-r", "120", str(pdf), str(out / "24-exact-pdf"))
        text = run("pdftotext", "-enc", "UTF-8", str(pdf), "-")
        if "Не менять" not in text:
            raise RuntimeError("Cyrillic opaque macro absent from real PDF")
        fonts = run("pdffonts", str(pdf))
        rows = audit_embedded_fonts(fonts)
        (out / "pdffonts.txt").write_text(fonts + "\n", encoding="utf-8")
        (out / "pdfinfo.txt").write_text(metadata + "\n", encoding="utf-8")
        if not any("DejaVu" in line for line in rows):
            raise RuntimeError("Expected DejaVu embedded font absent")
        report["real_xelatex_pdf"] = "PASS_EXTERNAL_XELATEX_PDF_CYRILLIC_AND_ALL_FONTS_EMBEDDED"
        report["pdf_sha256"] = sha(pdf)
        screenshot(out, "25-pdf-exported")

        # I62: real desktop assertions follow the already-proven six gestures
        # and PDF. Source bytes and screenshots must be independently reviewed.
        click(found, 28, 77)  # Return to the guide from the PDF viewport.
        click(found, 1055, 109)  # Real Properties tab.
        click(found, 402, 39)  # Help toolbar ON.
        click(found, 402, 39)  # Help toolbar OFF; deterministic initial state.
        screenshot(out, "26-properties-before-f1")
        properties = dock_signature(out, "26-properties-before-f1")
        held_f1()
        screenshot(out, "27-f1-help-open")
        opened = dock_signature(out, "27-f1-help-open")
        held_f1()
        screenshot(out, "28-f1-help-closed")
        closed = dock_signature(out, "28-f1-help-closed")
        if opened == properties or closed != properties:
            raise RuntimeError("Real F1 failed Properties -> Help -> Properties tab transition")
        report["f1_two_state"] = "PASS_REAL_X11_TAB_CHANGE_MANUAL_LABEL_REVIEW_REQUIRED"

        # I64: an actual GUI Inspector edit, not a headless Rust event or
        # a direct Session patch. Node #6 is selected; use one shared-C draft.
        inspector_before = source.read_bytes()
        before_items = owners(inspector_before)
        if len(before_items) != 6 or before_items[-1]["tool"] != "node":
            raise RuntimeError("Inspector Apply requires selected native Node #6")
        screenshot(out, "28a-inspector-before-draft")
        click(found, 1080, 560)  # Actual selected Node x TextEdit in Properties dock.
        key("ctrl+a")
        paste(b"10.50cm", out / "clipboard-inspector-node-x.txt")
        screenshot(out, "28b-inspector-draft-only")
        click(found, 177, 39)  # GUI Save must NOT apply an inspector draft.
        if source.read_bytes() != inspector_before:
            raise RuntimeError("Inspector draft unexpectedly changed saved source")
        click(found, 1235, 157)  # Actual pinned 'Применить параметры' control.
        screenshot(out, "28c-inspector-applied")
        click(found, 177, 39)
        wait(lambda: source.read_bytes() != inspector_before,
             "Real pinned Inspector Apply did not persist a source patch")
        inspector_applied = source.read_bytes()
        before_lines = inspector_before.splitlines(keepends=True)
        after_lines = inspector_applied.splitlines(keepends=True)
        if len(before_lines) != len(after_lines):
            raise RuntimeError("Inspector Apply changed source line count")
        altered = [i for i, (left, right) in enumerate(zip(before_lines, after_lines))
                   if left != right]
        if (
            len(altered) != 1
            or b"\\node at (10.50cm,5.00cm)" not in after_lines[altered[0]]
            or b'"x":"10.50cm"' not in after_lines[altered[0]]
            or len(owners(inspector_applied)) != 6
            or not original_preserved(fixture, inspector_applied)
        ):
            raise RuntimeError("Inspector Apply did not make a minimal C-owned Node x patch")
        report["steps"].append({
            "case": "real_pinned_inspector_node_x_apply_minimal_source_patch",
            "before_sha256": hashlib.sha256(inspector_before).hexdigest(),
            "after_sha256": sha(source),
            "changed_line_number": altered[0] + 1,
        })
        click(found, 1085, 157)  # Same real inspector's visual Undo.
        screenshot(out, "28d-inspector-apply-undo")
        click(found, 177, 39)
        wait(lambda: source.read_bytes() == inspector_before,
             "Visual Undo after pinned Inspector Apply failed byte-exact source restore")
        report["inspector_apply"] = "PASS_REAL_X11_C_CATALOGUE_NODE_X_APPLY_AND_UNDO"

        # TextEdit Ctrl+Z and Session visual inverse-patch Undo are different.
        six_bytes = source.read_bytes()
        manual = b"% I62_NATIVE_UNDO_MARKER"
        click(found, 180, 380)
        key("ctrl+End")
        paste(manual, out / "clipboard-manual-undo.txt")
        screenshot(out, "29-manual-source-edited")
        click(found, 177, 39)
        wait(lambda: manual in source.read_bytes(), "Real manual GUI edit was not persisted")
        if source.read_bytes() != six_bytes + manual:
            raise RuntimeError("Manual edit rewrote unrelated source bytes")
        click(found, 180, 380)
        key("ctrl+End")
        key("ctrl+z")
        screenshot(out, "30-native-ctrl-z")
        click(found, 177, 39)
        wait(lambda: source.read_bytes() == six_bytes,
             "Native Ctrl+Z failed to restore exactly six-tool source")
        report["native_text_undo"] = "PASS_REAL_X11_SAVED_SOURCE_BYTES"

        click(found, 30, 150)  # Geometry group.
        click(found, 599, 169)  # Native shared-C line.
        gesture(found, (845, 400), (948, 421))
        click(found, 177, 39)
        wait(lambda: len(owners(source.read_bytes())) == 7,
             "Seventh actual GUI gesture did not persist a native command")
        screenshot(out, "31-seven-before-visual-undo")
        click(found, 1085, 157)  # Visible inspector visual Undo.
        screenshot(out, "32-visual-undo-click")
        click(found, 177, 39)
        wait(lambda: source.read_bytes() == six_bytes,
             "Visual inverse-patch Undo failed to restore six-tool source")
        report["visual_undo"] = "PASS_REAL_X11_INVERSE_SOURCE_BYTES"

        # The second file is an explicit test INPUT, never forged GUI output.
        secondary = out / "second-crlf.tex"
        secondary_input = (
            "\\documentclass{standalone}\r\n"
            "\\usepackage{tikz}\r\n"
            "% I62 preserve original CRLF comment\r\n"
            "\\newcommand{\\OpaqueSecond}{Не менять}\r\n"
            "\\begin{document}\r\n"
            "\\begin{tikzpicture}\r\n"
            "\\node at (0,0) {\\OpaqueSecond};\r\n"
            "\\end{tikzpicture}\r\n"
            "\\end{document}\r\n"
        ).encode("utf-8")
        secondary.write_bytes(secondary_input)
        click(found, 321, 40)
        time.sleep(0.45)
        screenshot(out, "33-file-menu-before-open")
        click(found, 440, 93)  # Exact root-pixel point inside File TextEdit.
        screenshot(out, "33a-file-path-focused")
        key("ctrl+a")
        screenshot(out, "33b-file-path-selected")
        paste(b"second-crlf.tex", out / "clipboard-open-path.txt")
        screenshot(out, "34-second-path-entered")
        click(found, 351, 124)  # Actual GUI 'Открыть путь'.
        time.sleep(0.75)
        screenshot(out, "35-second-opened")
        append = b"% I62_GUI_SECOND_SAVED"
        click(found, 177, 380)
        key("ctrl+End")
        paste(append, out / "clipboard-second-edit.txt")
        click(found, 177, 39)
        wait(lambda: append in secondary.read_bytes(),
             "Real second-file GUI Open/Edit/Save did not persist")
        if secondary.read_bytes() != secondary_input + append:
            raise RuntimeError("Second-file GUI Save normalized CRLF or opaque bytes")
        if source.read_bytes() != six_bytes:
            raise RuntimeError("Second-file Save corrupted first document")
        screenshot(out, "36-second-crlf-saved")
        report["gui_two_file_crlf"] = "PASS_REAL_X11_TWO_FILE_GUI_OPEN_SAVE"
        report["file_menu_path_edit"] = "PASS_REAL_X11_EDITABLE_FILE_PATH"

        # External change is independent INPUT. Verify the native Ctrl+O
        # shortcut by observing the ACTUAL TextEdit via its X11 clipboard,
        # not merely an on-disk source comparison after a Save. A missed key
        # event must never be disguised as a successful keyboard shortcut.
        external = b"% I62_EXTERNAL_BEFORE_REOPEN"
        secondary.write_bytes(secondary_input + append + external)
        run("xdotool", "windowactivate", "--sync", found)
        key("ctrl+o")
        time.sleep(0.65)
        screenshot(out, "37-second-reopened")
        click(found, 177, 380)
        key("ctrl+a")
        key("ctrl+c")
        observed = run("xclip", "-selection", "clipboard", "-o")
        (out / "clipboard-after-ctrl-o.txt").write_text(observed, encoding="utf-8")
        if external.decode("utf-8") in observed:
            report["keyboard_reopen"] = "PASS_REAL_X11_CTRL_O_RELOAD"
        else:
            report["keyboard_reopen"] = "FAIL_REAL_X11_CTRL_O_SOURCE_NOT_RELOADED"
            # Continue the same substantial source/F1 vertical via the real
            # visible Open toolbar icon. This is an independently testable GUI
            # action, NOT a workaround that turns a keyboard FAIL into PASS.
            screenshot(out, "37a-ctrl-o-missed-source")
            click(found, 135, 39)
            time.sleep(0.75)
            screenshot(out, "37b-open-toolbar-recovery")
            click(found, 177, 380)
            key("ctrl+a")
            key("ctrl+c")
            recovered = run("xclip", "-selection", "clipboard", "-o")
            (out / "clipboard-after-toolbar-open.txt").write_text(
                recovered, encoding="utf-8"
            )
            if external.decode("utf-8") not in recovered:
                raise RuntimeError(
                    "Both Ctrl+O and real toolbar Open failed to reload "
                    "externally updated source in visible TextEdit"
                )
            report["toolbar_reopen"] = "PASS_REAL_X11_VISIBLE_OPEN_SOURCE_RELOAD"
        after_reopen = b"% I62_AFTER_GUI_REOPEN"
        click(found, 177, 380)
        key("ctrl+End")
        paste(after_reopen, out / "clipboard-reopen-edit.txt")
        click(found, 177, 39)
        wait(lambda: after_reopen in secondary.read_bytes(),
             "Reopened GUI document cannot be edited and saved")
        if secondary.read_bytes() != secondary_input + append + external + after_reopen:
            raise RuntimeError("GUI Open failed to reload external CRLF source")
        report["gui_open_reopen"] = "PASS_REAL_X11_BYTE_EXACT_RELOAD"

        # Real dirty Open -> Cancel: never discard the original unsaved edit.
        pending = b"% I62_DIRTY_CANCEL_SURVIVES"
        click(found, 177, 380)
        key("ctrl+End")
        paste(pending, out / "clipboard-dirty-source.txt")
        screenshot(out, "38-dirty-source")
        click(found, 321, 40)
        time.sleep(0.44)
        click(found, 440, 93)
        key("ctrl+a")
        paste(b"figure.tex", out / "clipboard-first-path.txt")
        click(found, 351, 124)
        time.sleep(0.55)
        screenshot(out, "39-pending-dirty-open")
        key("Escape")
        time.sleep(0.40)
        screenshot(out, "40-dirty-open-cancelled")
        click(found, 177, 39)
        wait(lambda: pending in secondary.read_bytes(),
             "Dirty Open Cancel discarded unsaved source")
        if secondary.read_bytes() != secondary_input + append + external + after_reopen + pending:
            raise RuntimeError("Dirty Open cancel corrupted second source")
        if source.read_bytes() != six_bytes:
            raise RuntimeError("Dirty Open changed original first document")
        report["dirty_open_cancel"] = "PASS_REAL_X11_CANCEL_AND_SAVE_BYTES"
        report["steps"].append({
            "case": "f1_native_visual_undo_two_file_crlf_reopen_dirty_cancel",
            "first_source_sha256": sha(source), "second_source_sha256": sha(secondary)
        })

        # N3: actual TextEdit caret inside a literal C circle radius token,
        # followed by native F1. This is a THIRD input file, not a forged GUI
        # source output. Earlier six-tool and CRLF source proofs are unchanged.
        n3_file = out / "n3-source-parameter-crlf.tex"
        n3_input = (
            "\\documentclass{standalone}\r\n"
            "\\usepackage{tikz}\r\n"
            "\\begin{document}\r\n"
            "\\begin{tikzpicture}\r\n"
            "\\draw (1cm,1cm) circle[radius=8mm];\r\n"
            "\\end{tikzpicture}\r\n"
            "\\myOpaque{не менять}\r\n"
            "\\end{document}\r\n"
        ).encode("utf-8")
        n3_file.write_bytes(n3_input)
        click(found, 321, 40)  # Existing real File menu.
        time.sleep(0.36)
        click(found, 440, 93)
        key("ctrl+a")
        paste(b"n3-source-parameter-crlf.tex", out / "clipboard-n3-file-path.txt")
        click(found, 351, 124)
        time.sleep(0.65)
        screenshot(out, "41-n3-real-file-opened")
        click(found, 1055, 109)  # Properties dock before F1 transition.
        click(found, 177, 380)  # Real permanently editable code pane.
        key("ctrl+Home")
        for _ in range(4):  # Fifth physical source line is the C circle.
            key("Down")
        key("End")
        for _ in range(4):  # Four chars back from 8mm]; -> inside 8mm.
            key("Left")
        screenshot(out, "42-n3-caret-in-circle-radius")
        dock_before = dock_signature(out, "42-n3-caret-in-circle-radius")
        held_f1()
        screenshot(out, "43-n3-f1-catalogue-radius")
        dock_after = dock_signature(out, "43-n3-f1-catalogue-radius")
        if dock_after == dock_before:
            raise RuntimeError("N3 actual F1 did not switch the visible Help dock")
        # Read-only F1 may not modify the on-disk or in-editor source.
        click(found, 177, 39)
        if n3_file.read_bytes() != n3_input:
            raise RuntimeError("N3 source caret help changed CRLF/opaque input")
        if source.read_bytes() != six_bytes:
            raise RuntimeError("N3 Help changed previously accepted six-tool document")
        report["source_parameter_f1"] = "REAL_X11_F1_AND_SOURCE_BYTES_PASS_LABEL_REVIEW_REQUIRED"
        report["steps"].append({
            "case": "real_source_textedit_circle_radius_f1_shared_c_help",
            "source_sha256": sha(n3_file),
            "help_screenshot": "43-n3-f1-catalogue-radius.png",
            "help_label_manual_review": "NOT_RUN",
        })

        if report["keyboard_reopen"].startswith("FAIL"):
            raise RuntimeError(
                "Ctrl+O Linux/X11 shortcut regression: toolbar recovery allowed "
                "remaining real N3/F1 tests, but exact-head acceptance is FAIL"
            )
        report["status"] = "PASS_AUTOMATED_REAL_X11_REQUIRES_MANUAL_ARTIFACT_REVIEW"
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
            file.name: sha(file) for file in sorted(out.iterdir())
            if file.is_file() and file.name != "report.json"
        }
        (out / "report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report["status"].startswith("PASS_AUTOMATED") else 1


if __name__ == "__main__":
    raise SystemExit(main())
